const MEDIAPIPE_CDN_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1";

function registerCanvasScreenshotModule() {
  const addModule = () => {
    if (window.XR8 && window.XR8.CanvasScreenshot) {
      XR8.addCameraPipelineModules([XR8.CanvasScreenshot.pipelineModule()]);
    } else {
      console.warn("XR8.CanvasScreenshot module not available — AR photo capture will be skipped.");
    }
  };
  if (window.XR8) {
    addModule();
  } else {
    window.addEventListener("xrloaded", addModule);
  }
}
registerCanvasScreenshotModule();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MEDIAPIPE_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MEDIAPIPE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

// Maps our UI pose ids to MediaPipe's built-in gesture category names.
const POSE_GESTURE_MAP = {
  thumbs_up: "Thumb_Up",
  victory: "Victory",
};
const POSE_LABEL_KO = {
  thumbs_up: "엄지척 포즈",
  victory: "V 포즈",
};

const GESTURE_CONFIDENCE_THRESHOLD = 0.65;
const POSE_HOLD_MS = 1200; // how long the gesture must be held to pass
const IMAGE_TIMEOUT_MS = 25000; // give up automatically after this long

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
const state = {
  selectedPose: "thumbs_up",
  facingMode: "environment",
  poseStream: null,
  gestureRecognizer: null,
  poseRafId: null,
  holdStartedAt: null,
  poseDone: false,
  poseFrameUrl: null,
  imageFrameUrl: null,
  resultPhotoBlob: null,
  currentSceneEl: null,
  xrConfigured: false,
  imageTimeoutHandle: null,
  imageTimerRafId: null,
  imageStartedAt: null,
  imageFound: false,
  currentTargetName: null,
};

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

let screens = {};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  screens[name].classList.add("active");
}

// ---------------------------------------------------------------------------
// STEP 1 — POSE AUTH (MediaPipe GestureRecognizer)
// ---------------------------------------------------------------------------
async function getGestureRecognizer() {
  if (state.gestureRecognizer) return state.gestureRecognizer;
  const { GestureRecognizer, FilesetResolver } = await import(MEDIAPIPE_CDN_URL);
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
  state.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
  return state.gestureRecognizer;
}

async function startPoseCamera() {
  stopPoseCamera();
  const video = $("#pose-video");
  const constraints = {
    audio: false,
    video: {
      facingMode: state.facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  state.poseStream = stream;
  video.srcObject = stream;
  await new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
}

function stopPoseCamera() {
  if (state.poseStream) {
    // 1. 카메라 하드웨어 트랙 강제 정지
    state.poseStream.getTracks().forEach((t) => t.stop());
    state.poseStream = null;
  }
  
  // 2. [핵심 추가] 비디오 태그에 연결된 스트림을 강제로 끊어내고 초기화
  const video = document.querySelector("#pose-video");
  if (video) {
    video.srcObject = null;
    video.load(); // 브라우저 메모리에서 카메라 리소스를 완전히 해제
  }

  if (state.poseRafId) {
    cancelAnimationFrame(state.poseRafId);
    state.poseRafId = null;
  }
}

async function enterPoseScreen() {
  const poseKo = POSE_LABEL_KO[state.selectedPose];
  $("#pose-banner-text").textContent = `${poseKo}를 인식시켜 주세요`;
  $("#pose-status-label").textContent = "포즈 인식 대기중";
  $("#guide-icon").dataset.icon = state.selectedPose;
  $("#guide-icon").classList.remove("matched");
  setRingProgress(0);
  state.holdStartedAt = null;
  state.poseDone = false;

  try {
    await startPoseCamera();
  } catch (err) {
    console.error(err);
    $("#pose-status-label").textContent = "카메라를 사용할 수 없어요";
    alert(
      "카메라 접근에 실패했어요. 브라우저의 카메라 권한을 확인한 뒤 다시 시도해주세요.\n\n" +
        err.message
    );
    return;
  }

  try {
    await getGestureRecognizer();
    poseLoop();
  } catch (err) {
    console.error(err);
    $("#pose-status-label").textContent = "포즈 인식 모델을 불러오지 못했어요";
    alert(
      "손 포즈 인식 모델(MediaPipe)을 불러오지 못했어요. 인터넷 연결 상태를 확인한 뒤 " +
        "다시 시도해주세요.\n\n" +
        err.message
    );
  }
}

function setRingProgress(ratio) {
  const circumference = 327; // 2 * PI * 52, matches the SVG circle in index.html
  const clamped = Math.max(0, Math.min(1, ratio));
  $("#progress-ring-fg").style.strokeDashoffset = String(circumference * (1 - clamped));
}

function poseLoop() {
  const video = $("#pose-video");

  const tick = () => {
    if (state.poseDone) return;
    if (video.readyState >= 2 && state.gestureRecognizer) {
      const now = performance.now();
      const result = state.gestureRecognizer.recognizeForVideo(video, now);
      handleGestureResult(result, now);
    }
    state.poseRafId = requestAnimationFrame(tick);
  };
  state.poseRafId = requestAnimationFrame(tick);
}

function handleGestureResult(result, now) {
  const targetGesture = POSE_GESTURE_MAP[state.selectedPose];
  let matched = false;

  if (result.gestures && result.gestures.length > 0) {
    const top = result.gestures[0][0]; // best category for the first detected hand
    if (top && top.categoryName === targetGesture && top.score >= GESTURE_CONFIDENCE_THRESHOLD) {
      matched = true;
    }
  }

  const guideIcon = $("#guide-icon");

  if (matched) {
    guideIcon.classList.add("matched");
    if (!state.holdStartedAt) state.holdStartedAt = now;
    const elapsed = now - state.holdStartedAt;
    setRingProgress(elapsed / POSE_HOLD_MS);
    $("#pose-status-label").textContent = "포즈 유지해주세요...";

    if (elapsed >= POSE_HOLD_MS) {
      onPoseSuccess();
    }
  } else {
    guideIcon.classList.remove("matched");
    state.holdStartedAt = null;
    setRingProgress(0);
    $("#pose-status-label").textContent = "포즈 인식 대기중";
  }
}

async function onPoseSuccess() {
  state.poseDone = true;
  $("#pose-status-label").textContent = "PERFECT!";

  state.poseFrameUrl = captureVideoSnapshot($("#pose-video"));

  const overlay = $("#step-transition");
  $("#transition-bg").src = state.poseFrameUrl;
  overlay.classList.add("visible");

  await wait(400);
  stopPoseCamera();

  await wait(500);

  showScreen("image");
  await enterImageScreen(); 

  overlay.classList.remove("visible");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// STEP 2 — IMAGE RECOGNITION (8th Wall / A-Frame / XRExtras)
// ---------------------------------------------------------------------------
function buildArSceneMarkup() {

const targetName = state.currentTargetName || "G-target";
  
  return `
    <a-scene
      xrextras-loading
      xrextras-runtime-error
      renderer="colorManagement: true; physicallyBasedRendering: true;"
      xrweb="disableWorldTracking: true">
      
      <a-camera position="0 1 1" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>
      
      <!-- 딱 하나의 타겟만 집중해서 추적 -->
      <xrextras-named-image-target name="${targetName}"></xrextras-named-image-target>
    </a-scene>
  `;
}

async function enterImageScreen() {
  const zoneId = state.currentTargetName ? state.currentTargetName.charAt(0) : "";

  $("#image-banner-text").innerHTML = `<span style="color:#ff8c24; font-weight:900;">[${zoneId} ZONE]</span> 배너를 비춰주세요`;  
  $("#image-status-label").textContent = "이미지 스캔 중...";
  $("#image-timer-bar").style.width = "100%";
  state.imageFound = false;
  state.imageStartedAt = performance.now();

  // =================================================================
  // [핵심 해결 1] AR 씬을 그리기 전에 타겟 데이터(JSON)를 먼저 다운로드합니다.
  // =================================================================
  let targetData = null;
  try {
    const res = await fetch("./target.json");
    targetData = await res.json();
  } catch (err) {
    console.error("Failed to load target.json", err);
    $("#image-status-label").textContent = "이미지 타겟 데이터를 불러오지 못했어요.";
  }

  // 데이터가 장전되면 XR8 엔진에 주입하는 함수
  const applyConfig = () => {
    if (targetData && window.XR8 && window.XR8.XrController) {
      window.XR8.XrController.configure({ imageTargetData: targetData });
      state.xrConfigured = true;
    }
  };

  // XR8 라이브러리가 로드되어 있으면 즉시 주입, 아니면 로드될 때 주입
  if (window.XR8) {
    applyConfig();
  } else {
    window.addEventListener("xrloaded", applyConfig, { once: true });
  }

  // =================================================================
  // [핵심 해결 2] 데이터 세팅이 완료된 후, 비로소 카메라(A-Frame)를 화면에 띄웁니다.
  // =================================================================
  const mount = $("#ar-mount");
  mount.innerHTML = buildArSceneMarkup();
  const sceneEl = mount.querySelector("a-scene");
  state.currentSceneEl = sceneEl;

  const VALID_TARGETS = [state.currentTargetName];
  
  // (이전에 적용했던 유령 캐시 방어 로직 유지)
  let isReadyToScan = false;
  setTimeout(() => { isReadyToScan = true; }, 1500); 

  const ALL_TARGETS = ["G-target", "I-target", "F-target", "T-target"];

  const onFound = (e) => {
    if (isReadyToScan && e.detail && ALL_TARGETS.includes(e.detail.name)) {
      onImageFound(e.detail.name); // 실제 인식된 배너 이름(예: I-target)을 넘김
    }
  };

  const onLost = (e) => {
    if (e.detail && VALID_TARGETS.includes(e.detail.name) && !state.imageFound) {
      $("#image-status-label").textContent = "이미지 스캔 중...";
    }
  };

  sceneEl.addEventListener("xrimagefound", onFound);
  sceneEl.addEventListener("xrimagelost", onLost);

  startImageTimeout();
  await waitForArReady(sceneEl);
}

function waitForArReady(sceneEl, timeoutMs = 2200) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    sceneEl.addEventListener("xrimagescanning", finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

function startImageTimeout() {
  clearImageTimers();

  const tick = () => {
    if (state.imageFound) return;
    const elapsed = performance.now() - state.imageStartedAt;
    const remainRatio = Math.max(0, 1 - elapsed / IMAGE_TIMEOUT_MS);
    $("#image-timer-bar").style.width = `${remainRatio * 100}%`;
    if (elapsed >= IMAGE_TIMEOUT_MS) {
      onImageTimeout();
      return;
    }
    state.imageTimerRafId = requestAnimationFrame(tick);
  };
  state.imageTimerRafId = requestAnimationFrame(tick);
}

function clearImageTimers() {
  if (state.imageTimerRafId) {
    cancelAnimationFrame(state.imageTimerRafId);
    state.imageTimerRafId = null;
  }
  if (state.imageTimeoutHandle) {
    clearTimeout(state.imageTimeoutHandle);
    state.imageTimeoutHandle = null;
  }
}

function onImageFound(targetName) {
  if (state.imageFound) return;
  state.imageFound = true;
  clearImageTimers();
  $("#image-status-label").textContent = "인식 성공!";
  $("#image-banner-text").textContent = "엑스배너를 찾았어요!";

  setTimeout(async () => {
    state.imageFrameUrl = await captureArSnapshot();
    teardownArScene();
    // finishGame으로 타겟 이름 전달
    finishGame(true, targetName); 
  }, 400);
}

async function onImageTimeout() {
  state.imageFrameUrl = await captureArSnapshot();
  teardownArScene();
  finishGame(false);
}

async function captureArSnapshot() {
  try {
    if (!window.XR8 || !XR8.CanvasScreenshot) return null;
    const base64Jpeg = await XR8.CanvasScreenshot.takeScreenshot();
    if (!base64Jpeg) return null;
    return "data:image/jpeg;base64," + base64Jpeg;
  } catch (err) {
    console.warn("Could not capture AR snapshot", err);
    return null;
  }
}

function teardownArScene() {
  clearImageTimers();
  try {
    if (window.XR8 && typeof window.XR8.stop === "function") window.XR8.stop();
  } catch (err) {
    console.warn("XR8.stop() failed", err);
  }
  state.currentSceneEl = null;

  const arMount = $("#ar-mount");
  if (arMount) {
    arMount.innerHTML = "";
  }
}

// ---------------------------------------------------------------------------
// RESULT SCREEN (수정됨: 성공 시 메인 앱으로 콜백, 실패 시 결과화면 표시)
// ---------------------------------------------------------------------------
async function finishGame(success, targetName) {
  if (success) {
    if (typeof window.onQuestSuccess === "function") {
      // 메인 앱의 콜백 함수에 어떤 타겟이 인식되었는지 넘겨줍니다.
      window.onQuestSuccess(targetName); 
    }
    return; 
  }

  // 2. 실패했을 경우: 기존처럼 실패 화면(screen-result) 렌더링
  showScreen("result");

  const icon = $("#result-icon");
  icon.classList.remove("success", "fail", "pop-in");
  void icon.offsetWidth; // restart animation
  
  // 이미 위에서 success=true 상황은 return으로 빠져나갔으므로 무조건 fail 처리
  icon.classList.add("fail", "pop-in");
  icon.textContent = "✕";

  $("#result-title").textContent = "인증 실패";
  $("#result-sub").textContent = "엑스배너 이미지를 다시 인식시켜 도전해보세요.";

  const photoImg = $("#result-photo");
  const downloadBtn = $("#btn-download");

  // 촬영된 데이터가 하나도 없으면 이미지/버튼 숨김
  if (!state.poseFrameUrl && !state.imageFrameUrl) {
    photoImg.style.visibility = "hidden";
    downloadBtn.style.display = "none";
    return;
  }

  // 사진 합성(composeResultPhoto) 대기 중 UI 처리
  downloadBtn.disabled = true;
  downloadBtn.textContent = "사진 준비 중...";

  // 실패 상태(false)로 사진 합성 진행
  const blob = await composeResultPhoto(false);
  state.resultPhotoBlob = blob;

  if (blob) {
    photoImg.src = URL.createObjectURL(blob);
    photoImg.style.visibility = "visible";
    downloadBtn.style.display = "inline-flex";
    downloadBtn.disabled = false;
    downloadBtn.textContent = "사진 저장하기";
  } else {
    photoImg.style.visibility = "hidden";
    downloadBtn.style.display = "none";
  }
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------
function captureVideoSnapshot(videoEl) {
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || 720;
  canvas.height = videoEl.videoHeight || 960;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function composeResultPhoto(success) {
  const canvas = $("#compose-canvas");
  const panelW = 540;
  const panelH = 720;
  const captionH = 70;
  canvas.width = panelW * 2;
  canvas.height = panelH + captionH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#100f16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawPanel = (src, x) =>
    new Promise((resolve) => {
      if (!src) return resolve();
      const img = new Image();
      img.onload = () => {
        // cover-fit into the panel so both frames fill it edge-to-edge
        // with no letterboxing, matching a real seamless photo strip.
        const scale = Math.max(panelW / img.width, panelH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, x + (panelW - drawW) / 2, (panelH - drawH) / 2, drawW, drawH);
        resolve();
      };
      img.onerror = resolve;
      img.src = src;
    });

  return Promise.all([
    drawPanel(state.poseFrameUrl, 0),
    drawPanel(state.imageFrameUrl, panelW),
  ]).then(() => {
    // thin seam so the join between the two frames still reads intentionally
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(panelW - 1, 0, 2, panelH);

    ctx.fillStyle = success ? "#22c55e" : "#ef4444";
    ctx.font = "700 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      success ? "이미지 찾기 · SUCCESS" : "이미지 찾기 · FAILED",
      canvas.width / 2,
      panelH + captionH / 2
    );

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  });
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
function resetGameState() {
  stopPoseCamera();
  teardownArScene();
  $("#step-transition").classList.remove("visible");
  state.holdStartedAt = null;
  state.poseDone = false;
  state.poseFrameUrl = null;
  state.imageFrameUrl = null;
  state.resultPhotoBlob = null;
  state.imageFound = false;
  setRingProgress(0);
}

// AR 화면의 HTML이 DOM에 그려진 직후에 버튼들을 찾고 이벤트를 연결하는 함수
function bindArEvents() {
  // 1. 화면 요소들 매핑
  screens = {
    intro: $("#screen-intro"),
    pose: $("#screen-pose"),
    image: $("#screen-image"),
    result: $("#screen-result"),
  };

  // 2. 포즈 탭 이벤트
  document.querySelectorAll("#pose-tabs .tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll("#pose-tabs .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.selectedPose = tab.dataset.pose;
    };
  });

  // 3. 시작 버튼
  const btnStart = $("#btn-start");
  if (btnStart) {
    btnStart.onclick = () => {
      resetGameState();
      showScreen("pose");
      enterPoseScreen();
    };
  }

  // 4. 카메라 전환 버튼
  const btnFlip = $("#btn-flip-camera");
  if (btnFlip) {
    btnFlip.onclick = async () => {
      state.facingMode = state.facingMode === "environment" ? "user" : "environment";
      try {
        await startPoseCamera();
      } catch (err) {
        console.error(err);
      }
    };
  }

  // 5. 그만하기 버튼
  const btnGiveUp = $("#btn-give-up");
  if (btnGiveUp) {
    btnGiveUp.onclick = async () => {
      clearImageTimers();
      state.imageFrameUrl = await captureArSnapshot();
      teardownArScene();
      finishGame(false);
    };
  }

  // 6. 다시 도전하기 버튼
  const btnRetry = $("#btn-retry");
  if (btnRetry) {
    btnRetry.onclick = () => {
      resetGameState();
      showScreen("intro");
    };
  }

  // 7. 사진 다운로드 버튼
  const btnDownload = $("#btn-download");
  if (btnDownload) {
    btnDownload.onclick = async () => {
      const blob = state.resultPhotoBlob;
      if (!blob) return;
      const fileName = "quest-result.png";
      const file = new File([blob], fileName, { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "손가락 포즈 인증 퀘스트" });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
          console.warn("navigator.share failed, falling back to download link", err);
        }
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
  }
}

window.startTigerQuest = function(expectedTarget, onSuccessCallback, zoneId) {
  state.currentTargetName = expectedTarget;
  window.onQuestSuccess = onSuccessCallback;

  const introTitle = document.querySelector("#screen-intro h1");
  if (introTitle && zoneId) {
      introTitle.innerHTML = `<span style="color:#e5007f;">[${zoneId} ZONE]</span><br/>엑스배너 이미지를 찾아라!`;
  }

  bindArEvents();
  resetGameState();
  showScreen("intro");
}

// 메인 앱에서 뒤로가기를 누르거나 화면을 벗어날 때 호출할 함수 (카메라 완벽 해제)
window.stopTigerQuest = function() {
  stopPoseCamera();  // 미디어파이프(전면 카메라) 해제
  teardownArScene(); // 8th Wall(AR 카메라) 해제
};
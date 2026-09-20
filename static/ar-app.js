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
const IMAGE_TARGET_NAME = "tiger-target";
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
    state.poseStream.getTracks().forEach((t) => t.stop());
    state.poseStream = null;
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

  // capture the winning pose frame — used later as one half of the single
  // merged result photo, so keep it plain/unlabelled (no per-shot banner).
  state.poseFrameUrl = captureVideoSnapshot($("#pose-video"));

  const overlay = $("#step-transition");
  $("#transition-bg").src = state.poseFrameUrl;
  overlay.classList.add("visible");

  // let the fade-in finish while the (still-live) pose video is hidden behind it,
  // THEN stop the camera and swap screens underneath — invisible to the user.
  await wait(400);
  stopPoseCamera();
  showScreen("image");
  await enterImageScreen(); // mounts the AR scene and resolves once its camera is live (or times out)

  overlay.classList.remove("visible");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// STEP 2 — IMAGE RECOGNITION (8th Wall / A-Frame / XRExtras)
// ---------------------------------------------------------------------------
function buildArSceneMarkup() {
  // NOTE: no `screenshot` component and no `preserveDrawingBuffer` here —
  // neither reliably captures 8th Wall's composited camera+AR frame (see the
  // big comment above registerCanvasScreenshotModule() for why). The actual
  // capture happens via XR8.CanvasScreenshot.takeScreenshot() in
  // captureArSnapshot() below, which is registered as a camera pipeline
  // module once at module load.
  return `
    <a-scene
      xrextras-loading
      xrextras-runtime-error
      renderer="colorManagement: true; physicallyBasedRendering: true;"
      xrweb="disableWorldTracking: true">

      <a-camera position="0 1 1" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>
      <a-light type="directional" intensity="1.2" position="0 1 0"></a-light>
      <a-light type="ambient" intensity="0.35"></a-light>

      <xrextras-named-image-target name="${IMAGE_TARGET_NAME}" id="tiger-target-entity">
        <a-plane
          class="found-frame"
          material="color:#22c55e; opacity:0.18; transparent:true; shader:flat;"
          width="1" height="1.3"
          position="0 0 0.01">
        </a-plane>
      </xrextras-named-image-target>
    </a-scene>
  `;
}

async function enterImageScreen() {
  $("#image-banner-text").textContent = "호랑이 이미지를 화면 안에 비춰주세요";
  $("#image-status-label").textContent = "이미지 스캔 중...";
  $("#image-timer-bar").style.width = "100%";
  state.imageFound = false;
  state.imageStartedAt = performance.now();

  const mount = $("#ar-mount");
  mount.innerHTML = buildArSceneMarkup();
  const sceneEl = mount.querySelector("a-scene");
  const targetEl = mount.querySelector("#tiger-target-entity");
  state.currentSceneEl = sceneEl;

  const onFound = (e) => {
    if (!e.detail || e.detail.name === IMAGE_TARGET_NAME) onImageFound();
  };
  const onLost = (e) => {
    if ((!e.detail || e.detail.name === IMAGE_TARGET_NAME) && !state.imageFound) {
      $("#image-status-label").textContent = "이미지 스캔 중...";
    }
  };
  sceneEl.addEventListener("xrimagefound", onFound);
  sceneEl.addEventListener("xrimagelost", onLost);
  if (targetEl) {
    targetEl.addEventListener("xrextrasfound", onFound);
    targetEl.addEventListener("xrextraslost", onLost);
  }

  const onXrLoaded = async () => {
    try {
      const res = await fetch("./tiger-target.json");
      const json = await res.json();
      window.XR8.XrController.configure({ imageTargetData: [json] });
      state.xrConfigured = true;
    } catch (err) {
      console.error("Failed to load tiger-target.json", err);
      $("#image-status-label").textContent = "이미지 타겟 데이터를 불러오지 못했어요.";
    }
  };
  if (window.XR8) {
    onXrLoaded();
  } else {
    window.addEventListener("xrloaded", onXrLoaded, { once: true });
  }

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

function onImageFound() {
  if (state.imageFound) return;
  state.imageFound = true;
  clearImageTimers();
  $("#image-status-label").textContent = "인식 성공!";
  $("#image-banner-text").textContent = "호랑이를 찾았어요!";

  setTimeout(async () => {
    state.imageFrameUrl = await captureArSnapshot();
    teardownArScene();
    finishGame(true);
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
async function finishGame(success) {
  // 1. 성공했을 경우: 결과 화면을 띄우지 않고, 바로 메인 앱의 퀴즈로 넘어가는 콜백 실행
  if (success) {
    if (typeof window.onQuestSuccess === "function") {
      window.onQuestSuccess();
    }
    return; // 함수 종료
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
  $("#result-sub").textContent = "호랑이 이미지를 다시 인식시켜 도전해보세요.";

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
      success ? "호랑이 찾기 · SUCCESS" : "호랑이 찾기 · FAILED",
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
      const fileName = "tiger-quest-result.png";
      const file = new File([blob], fileName, { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "타이거 포즈 인증 퀘스트" });
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

window.startTigerQuest = function(onSuccessCallback) {
  // 메인 앱에서 전달받은 성공 콜백 저장
  window.onQuestSuccess = onSuccessCallback;
  
  // ★ DOM이 화면에 그려진 상태이므로, 이때 이벤트 리스너들을 부착합니다!
  bindArEvents();

  // 초기화 후 인트로 화면 표시
  resetGameState();
  showScreen("intro");
};

// 메인 앱에서 뒤로가기를 누르거나 화면을 벗어날 때 호출할 함수 (카메라 완벽 해제)
window.stopTigerQuest = function() {
  stopPoseCamera();  // 미디어파이프(전면 카메라) 해제
  teardownArScene(); // 8th Wall(AR 카메라) 해제
};
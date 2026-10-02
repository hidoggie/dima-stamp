const IMAGE_TIMEOUT_MS = 25000;
const INTRO_CLIP = "01_Hatch_Once";   // GLB 클립 이름 (대소문자 달라도 자동 보정)
const LOOP_CLIP = "02_Loop";
const INTRO_FALLBACK_MS = 8000;       // 클립 길이를 못 읽었을 때만 쓰는 안전장치
const LOST_GRACE_MS = 800;            // 손떨림으로 잠깐 놓친 건 무시하는 유예 시간

const ALL_TARGETS = ["G-target", "I-target", "F-target", "T-target"];

const state = {
  currentSceneEl: null,
  xrConfigured: false,
  imageTimerRafId: null,
  imageStartedAt: null,
  imageFound: false,
  currentTargetName: null,
  animFallbackTimer: null,
  animFinishedHandler: null,
  lostTimer: null,
};

const $ = (sel) => document.querySelector(sel);

let screens = {};

function showScreen(name) {
  Object.values(screens).forEach((el) => {
    if (el) el.classList.remove("active");
  });
  if (screens[name]) screens[name].classList.add("active");
}

// ---------------------------------------------------------------------------
// SCENE
// ---------------------------------------------------------------------------
function buildArSceneMarkup() {
  const targetName = state.currentTargetName || "G-target";
  const zoneId = targetName.charAt(0); // G, I, F, T
  const modelUrl = `assets/egg-${zoneId}-hatch.glb`;

  // animation-mixer는 인식 후에 붙인다 (미리 붙이면 안 보이는 상태에서 재생이 끝나버림)
  return `
    <a-scene
      vr-mode-ui="enabled: false"
      xrextras-capture-config="requestMic: manual; enableEndCard: false; fileNamePrefix: GIFT-FESTA-"
      renderer="colorManagement: true; physicallyBasedRendering: true;"
      xrweb="disableWorldTracking: true">

      <!-- 8th Wall 기본 사진 촬영 버튼 + 미리보기 -->
      <xrextras-capture-button capture-mode="photo"></xrextras-capture-button>
      <xrextras-capture-preview
        action-button-share-text="공유하기"
        action-button-view-text="보기"
        finalize-text="저장 중...">
      </xrextras-capture-preview>

      <a-assets>
        <a-asset-item id="treasure-model" src="${modelUrl}"></a-asset-item>
      </a-assets>

      <a-camera position="0 1 1" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>

      <xrextras-named-image-target name="${targetName}">
        <a-entity
          id="treasure-entity"
          gltf-model="#treasure-model"
          scale="1 1 1"
          position="0 0 0"
          visible="false">
        </a-entity>
      </xrextras-named-image-target>
    </a-scene>
  `;
}

// ---------------------------------------------------------------------------
// UI 상태
// ---------------------------------------------------------------------------
function setScanningUi() {
  const zoneId = state.currentTargetName ? state.currentTargetName.charAt(0) : "";
  const banner = $("#image-banner-text");
  if (banner) {
    banner.innerHTML = `<span style="color:#ff8c24; font-weight:900;">[${zoneId} ZONE]</span> 배너를 비춰주세요`;
  }
  const label = $("#image-status-label");
  if (label) label.textContent = "이미지 스캔 중...";
  const timer = $("#timer-ui");
  if (timer) timer.style.display = "block";

  setArButton("hidden");
  document.body.classList.remove("ar-target-found"); // 8th Wall 촬영 버튼 숨김
}

// mode: "hidden" | "waiting" | "quiz"
function setArButton(mode) {
  const wrap = document.querySelector("#ar-quest-container .ar-actions");
  const btn = $("#btn-ar-action");
  if (!wrap || !btn) return;

  wrap.classList.toggle("is-hidden", mode === "hidden");
  btn.onclick = null;
  btn.className = "btn btn-gift";

  if (mode === "waiting") {
    btn.textContent = "스탬프가 나타나는 중...";
    btn.disabled = true;
  } else if (mode === "quiz") {
    btn.textContent = "퀴즈 풀러 가기";
    btn.disabled = false;
    btn.onclick = () => goToQuiz();
  } else {
    btn.disabled = true;
  }
}

function goToQuiz(targetName = state.currentTargetName) {
  const btn = $("#btn-ar-action");
  if (btn) btn.disabled = true; // 연타 방지
  teardownArScene();
  if (typeof window.onQuestSuccess === "function") window.onQuestSuccess(targetName);
}

// ---------------------------------------------------------------------------
// 애니메이션
// ---------------------------------------------------------------------------
function findClip(entity, wanted) {
  const clips = entity.getObject3D("mesh")?.animations || [];
  return (
    clips.find((c) => c.name === wanted) ||
    clips.find((c) => c.name.toLowerCase() === wanted.toLowerCase()) ||
    null
  );
}

function resolveClipName(entity, wanted) {
  const clip = findClip(entity, wanted);
  if (!clip && entity.getObject3D("mesh")) {
    const names = (entity.getObject3D("mesh").animations || []).map((c) => c.name);
    console.warn(`[AR] '${wanted}' 클립을 찾지 못했어요. 모델에 있는 클립:`, names);
  }
  return clip ? clip.name : wanted;
}

function playIntroThenLoop(entity) {
  let done = false;

  const startLoop = () => {
    if (done || !state.imageFound) return;
    done = true;
    clearTimeout(state.animFallbackTimer);
    entity.removeEventListener("animation-finished", onFinished);
    state.animFinishedHandler = null;

    entity.setAttribute("animation-mixer", {
      clip: resolveClipName(entity, LOOP_CLIP),
      loop: "repeat",
      clampWhenFinished: false,
    });
    setArButton("quiz");
  };

  // 인트로 단계에서 오는 finished 이벤트는 곧 인트로 종료
  const onFinished = () => startLoop();
  state.animFinishedHandler = onFinished;
  entity.addEventListener("animation-finished", onFinished);

  entity.setAttribute("visible", "true");
  entity.setAttribute("animation-mixer", {
    clip: resolveClipName(entity, INTRO_CLIP),
    loop: "once",
    clampWhenFinished: true,
  });

  // 이벤트가 안 오는 경우 대비: 클립 길이 + 0.5초 뒤 강제로 루프 전환
  const introClip = findClip(entity, INTRO_CLIP);
  const fallbackMs = introClip ? introClip.duration * 1000 + 500 : INTRO_FALLBACK_MS;
  state.animFallbackTimer = setTimeout(startLoop, fallbackMs);
}

function stopModel() {
  clearTimeout(state.animFallbackTimer);
  const entity = $("#treasure-entity");
  if (entity) {
    if (state.animFinishedHandler) {
      entity.removeEventListener("animation-finished", state.animFinishedHandler);
    }
    entity.removeAttribute("animation-mixer"); // 다음 인식 때 처음부터 다시 재생되도록
    entity.setAttribute("visible", "false");
  }
  state.animFinishedHandler = null;
}

// ---------------------------------------------------------------------------
// 이미지 인식
// ---------------------------------------------------------------------------
async function enterImageScreen() {
  state.imageFound = false;
  setScanningUi();

  let targetData = null;
  try {
    const res = await fetch("./target.json");
    targetData = await res.json();
  } catch (err) {
    console.error("Failed to load target.json", err);
    $("#image-status-label").textContent = "이미지 타겟 데이터를 불러오지 못했어요.";
  }

  const applyConfig = () => {
    if (targetData && window.XR8 && window.XR8.XrController) {
      window.XR8.XrController.configure({ imageTargetData: targetData });
      state.xrConfigured = true;
    }
  };

  if (window.XR8) {
    applyConfig();
  } else {
    window.addEventListener("xrloaded", applyConfig, { once: true });
  }

  const mount = $("#ar-mount");
  mount.innerHTML = buildArSceneMarkup();
  const sceneEl = mount.querySelector("a-scene");
  state.currentSceneEl = sceneEl;

  let isReadyToScan = false;
  setTimeout(() => { isReadyToScan = true; }, 1500);

  const onFound = (e) => {
    const name = e.detail && e.detail.name;
    if (!isReadyToScan || !ALL_TARGETS.includes(name)) return;
    if (name === state.currentTargetName) clearTimeout(state.lostTimer); // 유예 시간 안에 다시 찾음
    onImageFound(name);
  };

  const onLost = (e) => {
    const name = e.detail && e.detail.name;
    if (name !== state.currentTargetName || !state.imageFound) return;
    clearTimeout(state.lostTimer);
    state.lostTimer = setTimeout(resetToScanning, LOST_GRACE_MS);
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
  state.imageStartedAt = performance.now();
  $("#image-timer-bar").style.width = "100%";

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
}

function onImageFound(targetName) {
  if (state.imageFound) return;
  state.imageFound = true;
  clearImageTimers();

  // 다른 Zone 배너 → 애니메이션 없이 바로 app.js로 넘겨 '인증 실패' 모달 처리
  if (targetName !== state.currentTargetName) {
    goToQuiz(targetName);
    return;
  }

  $("#timer-ui").style.display = "none";
  $("#image-banner-text").textContent = "이미지 인식 완료!";
  document.body.classList.add("ar-target-found"); // 8th Wall 촬영 버튼 표시
  setArButton("waiting");

  const entity = $("#treasure-entity");
  if (!entity) {
    setArButton("quiz");
    return;
  }
  playIntroThenLoop(entity);
}

// 배너를 놓치면 인식 전 초기 상태로 되돌림
function resetToScanning() {
  if (!state.currentSceneEl) return;
  state.imageFound = false;
  stopModel();
  setScanningUi();
  startImageTimeout();
}

async function onImageTimeout() {
  teardownArScene();
  alert("이미지 스캔 시간이 초과되었습니다. 다시 시도해주세요.");
  window.history.back();
}

function teardownArScene() {
  clearImageTimers();
  clearTimeout(state.lostTimer);
  stopModel();
  document.body.classList.remove("ar-target-found");

  try {
    if (window.XR8 && typeof window.XR8.stop === "function") window.XR8.stop();
  } catch (err) {
    console.warn("XR8.stop() failed", err);
  }
  state.currentSceneEl = null;

  const arMount = $("#ar-mount");
  if (arMount) arMount.innerHTML = "";
}

function bindArEvents() {
  screens = {
    image: $("#screen-image"),
  };
}

window.startTigerQuest = function (expectedTarget, onSuccessCallback, zoneId) {
  state.currentTargetName = expectedTarget;
  window.onQuestSuccess = onSuccessCallback;

  bindArEvents();
  teardownArScene();

  showScreen("image");
  enterImageScreen();
};

window.stopTigerQuest = function () {
  teardownArScene();
};

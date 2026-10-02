
const IMAGE_TIMEOUT_MS = 25000;
const INTRO_CLIP = "01_Hatch_Once";   
const LOOP_CLIP = "02_loop";          
const INTRO_FALLBACK_MS = 6000; 

const state = {
  currentSceneEl: null,
  xrConfigured: false,
  imageTimeoutHandle: null,
  imageTimerRafId: null,
  imageStartedAt: null,
  imageFound: false,
  currentTargetName: null,
  animFallbackTimer: null,
};

const $ = (sel) => document.querySelector(sel);

let screens = {};

function showScreen(name) {
  Object.values(screens).forEach((el) => {
    if(el) el.classList.remove("active");
  });
  if(screens[name]) screens[name].classList.add("active");
}

// ---------------------------------------------------------------------------
// IMAGE RECOGNITION & 3D ANIMATION
// ---------------------------------------------------------------------------
function buildArSceneMarkup() {
  const targetName = state.currentTargetName || "G-target";
  const zoneId = targetName.charAt(0); // G, I, F, T 중 하나 추출
  
  // asset 폴더 안의 3D 모델 경로 설정
  const modelUrl = `assets/egg-${zoneId}-hatch.glb`;

  return `
    <a-scene
      vr-mode-ui="enabled: false"
      xrextras-capture-config="requestMic: false" 
      renderer="colorManagement: true; physicallyBasedRendering: true;"
      xrweb="disableWorldTracking: true">
      
      <a-assets>
        <a-asset-item id="treasure-model" src="${modelUrl}"></a-asset-item>
      </a-assets>

      <a-camera position="0 1 1" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>
      
      <xrextras-named-image-target name="${targetName}">
        <!-- 이미지가 인식되면 애니메이션 01_Intro_Once 1회 재생 -->
        <a-entity 
          id="treasure-entity"
          gltf-model="#treasure-model" 
          scale="1 1 1" 
          position="0 0 0" 
          visible="false"
        >
        </a-entity>
      </xrextras-named-image-target>
    </a-scene>
  `;
}

async function enterImageScreen() {
  const zoneId = state.currentTargetName ? state.currentTargetName.charAt(0) : "";

  $("#image-banner-text").innerHTML = `<span style="color:#ff8c24; font-weight:900;">[${zoneId} ZONE]</span> 배너를 비춰주세요`;  
  $("#image-status-label").textContent = "이미지 스캔 중...";
  $("#image-timer-bar").style.width = "100%";
  $("#timer-ui").style.display = "block";

  setArButton("giveup");
  
  state.imageFound = false;
  state.imageStartedAt = performance.now();

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

  const VALID_TARGETS = [state.currentTargetName];
  let isReadyToScan = false;
  setTimeout(() => { isReadyToScan = true; }, 1500); 

  const ALL_TARGETS = ["G-target", "I-target", "F-target", "T-target"];

  const onFound = (e) => {
    if (isReadyToScan && e.detail && ALL_TARGETS.includes(e.detail.name)) {
      onImageFound(e.detail.name); 
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
}

function goToQuiz(targetName = state.currentTargetName) {
  const btn = $("#btn-ar-action");
  if (btn) btn.disabled = true; // 연타로 navigate 두 번 되는 것 방지
  teardownArScene();
  if (typeof window.onQuestSuccess === "function") window.onQuestSuccess(targetName);
}

function setArButton(mode) {
  const btn = $("#btn-ar-action");
  if (!btn) return;
  if (mode === "giveup") {
    btn.textContent = "그만하기";
    btn.className = "btn btn-ghost";
    btn.disabled = false;
    btn.onclick = () => { teardownArScene(); window.history.back(); };
  } else if (mode === "waiting") {
    btn.textContent = "스탬프가 나타나는 중...";
    btn.className = "btn btn-gift";
    btn.disabled = true;
    btn.onclick = null;
  } else if (mode === "quiz") {
    btn.textContent = "퀴즈 풀러 가기";
    btn.className = "btn btn-gift";
    btn.disabled = false;
    btn.onclick = () => goToQuiz();
  }
}

function onImageFound(targetName) {
  if (state.imageFound) return;
  state.imageFound = true;
  clearImageTimers();
  $("#timer-ui").style.display = "none";

  // 다른 Zone 배너 → 애니메이션 없이 바로 app.js로 넘겨 '인증 실패' 모달 처리
  if (targetName !== state.currentTargetName) {
    goToQuiz(targetName);
    return;
  }

  $("#image-banner-text").textContent = "스탬프 발견!";
  setArButton("waiting");

  const entity = $("#treasure-entity");
  if (!entity) { setArButton("quiz"); return; }

  let done = false;
  const finishIntro = () => {
    if (done) return;
    done = true;
    clearTimeout(state.animFallbackTimer);
    entity.setAttribute("animation-mixer", `clip: ${LOOP_CLIP}; loop: repeat`);
    setArButton("quiz");
  };

  // 리스너를 먼저 등록하고 → 그 다음 재생
  entity.addEventListener("animation-finished", (e) => {
    const clipName = e.detail?.action?.getClip?.().name;
    if (!clipName || clipName === INTRO_CLIP) finishIntro();
  });
  state.animFallbackTimer = setTimeout(finishIntro, INTRO_FALLBACK_MS);

  entity.setAttribute("visible", "true");
  entity.setAttribute("animation-mixer", `clip: ${INTRO_CLIP}; loop: once; clampWhenFinished: true`);
}

async function onImageTimeout() {
  teardownArScene();
  alert("이미지 스캔 시간이 초과되었습니다. 다시 시도해주세요.");
  if (typeof window.stopTigerQuest === "function") window.stopTigerQuest();
  // 실패 시 뒤로가기 또는 메인 화면으로 리디렉션
  window.history.back();
}

function teardownArScene() {
  clearTimeout(state.animFallbackTimer);
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

function bindArEvents() {
  screens = {
    image: $("#screen-image"),
  };
}

window.startTigerQuest = function(expectedTarget, onSuccessCallback, zoneId) {
  state.currentTargetName = expectedTarget;
  window.onQuestSuccess = onSuccessCallback;

  bindArEvents();
  teardownArScene();
  
  // 포즈 과정을 건너뛰고 바로 이미지 화면 표시
  showScreen("image");
  enterImageScreen();
}

window.stopTigerQuest = function() {
  teardownArScene();
};
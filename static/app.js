(() => {
  "use strict";

  const STORAGE_KEY = "dima-gift-html-design-stamps-v1";
  const app = document.querySelector("#app");
  const header = document.querySelector("#app-header");
  const modalRoot = document.querySelector("#modal-root");
  const toast = document.querySelector("#toast");

  const ZONES = {
    G: {
      id: "G",
      dima_id: 1,
      targetName: "tiger-target",       
      targetFile: "tiger-target.json",
      name: "Go first",
      meaning: "개척과 도전",
      color: "#E5007F",
      stamp: "assets/stamps/g.png",
      question: "먼저 시작하고 새로운 가능성에 도전하는 DIMA의 정신, G는 무엇일까요?",
      options: ["Go first", "Grow future", "Great passion", "Global challenge"],
      answer: 0,
      correctTitle: "G = Go first",
      correctBody: "먼저 시작하고 새로운 가능성에 도전하는 DIMA의 정신입니다.",
      wrong: "아쉽습니다. 다시 한 번 도전해보세요!",
      stampTitle: "G Stamp 획득!",
      stampBody: "당신의 첫 번째 GIFT, Go first",
    },
    I: {
      id: "I",
      dima_id: 2,
      targetName: "tiger-target",       
      targetFile: "tiger-target.json",
      name: "Intensive Practice",
      meaning: "깊이 있는 숙련",
      color: "#890C84",
      stamp: "assets/stamps/i.png",
      question: "몰입과 반복을 통해 전문성을 깊게 만드는 DIMA의 정신, I는 무엇일까요?",
      options: ["Inspire mind", "Intensive Practice", "Imagine creation", "Infinite potential"],
      answer: 1,
      correctTitle: "I = Intensive Practice",
      correctBody: "끊임없는 연습과 몰입으로 실력을 깊이 있게 쌓아가는 DIMA의 정신입니다.",
      wrong: "조금만 더 생각해보세요. 다시 도전!",
      stampTitle: "I Stamp 획득!",
      stampBody: "당신의 두 번째 GIFT, Intensive Practice",
    },
    F: {
      id: "F",
      dima_id: 3,
      targetName: "tiger-target",       
      targetFile: "tiger-target.json",
      name: "Fearless of failure",
      meaning: "실패를 두려워하지 않음",
      color: "#381F87",
      stamp: "assets/stamps/f.png",
      question: "실패를 두려워하지 않고 다시 도전하는 DIMA의 정신, F는 무엇일까요?",
      options: ["Future making", "Free expression", "First attempt", "Fearless of failure"],
      answer: 3,
      correctTitle: "F = Fearless of failure",
      correctBody: "실패를 성장의 과정으로 받아들이고 다시 도전하는 DIMA의 정신입니다.",
      wrong: "실패를 두려워하지 말고, 다시 도전해보세요!",
      stampTitle: "F Stamp 획득!",
      stampBody: "당신의 세 번째 GIFT, Fearless of failure",
    },
    T: {
      id: "T",
      dima_id: 4,
      targetName: "tiger-target",       
      targetFile: "tiger-target.json",
      name: "Teamwork",
      meaning: "협력과 소통",
      color: "#F18E29",
      stamp: "assets/stamps/t.png",
      question: "서로의 재능을 연결해 더 큰 결과를 만들어내는 DIMA의 정신, T는 무엇일까요?",
      options: ["True artist", "Try again", "Teamwork", "Talent power"],
      answer: 2,
      correctTitle: "T = Teamwork",
      correctBody: "서로 다른 재능과 역량을 연결해 더 큰 성과를 만드는 DIMA의 정신입니다.",
      wrong: "함께 생각하면 답이 보입니다. 다시 도전해보세요!",
      stampTitle: "T Stamp 획득!",
      stampBody: "당신의 네 번째 GIFT, Teamwork",
    },
  };

  const ORDER = ["G", "I", "F", "T"];
  const SURVEY_OPTIONS = ["매우 그렇다", "그렇다", "보통이다", "그렇지 않다", "전혀 그렇지 않다"];
  const SATISFACTION_OPTIONS = ["매우 만족", "만족", "보통", "불만족", "매우 불만족"];
  const VALID_SCREENS = ["start", "ar", "quiz", "stampbook", "complete", "survey1", "survey2", "participant", "privacy", "done"];
  const BACK = {
    ar: "start",
    quiz: "start",
    stampbook: "start",
    complete: "stampbook",
    survey1: "complete",
    survey2: "survey1",
    participant: "survey2",
    privacy: "participant",
    done: "start",
  };

  const params = new URLSearchParams(location.search);
  const previewScreen = VALID_SCREENS.includes(params.get("screen")) ? params.get("screen") : "start";
  const previewZone = ZONES[String(params.get("zone") || "").toUpperCase()]
    ? String(params.get("zone")).toUpperCase()
    : "G";

  let state = {
    screen: previewScreen,
    zone: previewZone,
    selectedAnswer: undefined,
    stamps: [],
    survey: {},
    participant: {},
    consent: false,
  };
  let toastTimer = null;
  let previousFocus = null;

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function icon(name) {
    const icons = {
      back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a2.8 2.8 0 1 1 4.6 2.2c-1.4.9-2.1 1.5-2.1 3.1M12 18h.01"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4ZM2 6h20v4H2ZM12 6v15"/><path d="M12 6H7.8C5.5 6 5 2.5 7.5 2.5 10 2.5 12 6 12 6Zm0 0h4.2c2.3 0 2.8-3.5.3-3.5C14 2.5 12 6 12 6Z"/></svg>',
      document: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
      phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></svg>',
      target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
      clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
    };
    return icons[name] || "";
  }

  function giftLetters() {
    return '<span class="gift-g">G</span> · <span class="gift-i">I</span> · <span class="gift-f">F</span> · <span class="gift-t">T</span>';
  }

  function zoneStyle(zone) {
    return `--accent:${zone.color}`;
  }

  function renderHeader() {
    if (state.screen === "ar" || state.screen === "start") {
        header.innerHTML = ""; 
        header.style.display = "none"; // CSS에서 자리를 차지하지 않도록 숨김처리
        
        // 헤더가 없어지면서 콘텐츠가 기기 상단(노치)에 바짝 붙는 것을 방지하기 위해 상단 여백 추가
        app.style.paddingTop = "calc(20px + env(safe-area-inset-top))"; 
        return;
    }
    
    header.style.display = ""; // 숨겼던 헤더를 다시 활성화
    app.style.paddingTop = ""; // 메인 영역 여백도 원래대로 복구

    // 2. 메인 시작 화면일 때는 양쪽 버튼 자리를 모두 빈 공간으로 둡니다.
    if (state.screen === "start") {
        header.innerHTML = `
          <div class="header-row">
            <span class="header-placeholder" aria-hidden="true"></span>
            <div class="brand">DIMA CONNECT</div>
            <span class="header-placeholder" aria-hidden="true"></span>
          </div>`;
    } 
    // 3. 그 외 화면(퀴즈, 스탬프북 등)일 때는 뒤로가기 및 홈 버튼을 표시합니다.
    else {
        header.innerHTML = `
          <div class="header-row">
            <button class="header-action" type="button" data-action="back" aria-label="이전 화면">${icon("back")}</button>
            <div class="brand">DIMA CONNECT</div>
            <button class="header-action" type="button" data-action="home" aria-label="시작 화면으로 이동">${icon("close")}</button>
          </div>`;
    }
  }

  function progressHtml(count) {
    return `<div class="progress" aria-label="진행 단계 ${count} / 4">
      <strong>${count} / 4</strong>
      <div class="progress-bars" aria-hidden="true">
        ${ORDER.map((id, index) => `<span class="${index < count ? id.toLowerCase() : ""}"></span>`).join("")}
      </div>
    </div>`;
  }

  function zoneCard(id) {
    const zone = ZONES[id];
    const collected = state.stamps.includes(id);
    return `<button class="zone-card ${collected ? "collected" : ""}" type="button" data-action="zone" data-zone="${id}" style="${zoneStyle(zone)}">
      <img src="${zone.stamp}" alt="${id} 스탬프" />
      <strong>${id} ZONE</strong>
      <span>${collected ? "획득 완료" : "QUIZ"}</span>
    </button>`;
  }

  function renderStart() {
    const allComplete = state.stamps.length === 4;
    return `<section class="screen" aria-labelledby="start-title">
      <h1 class="sr-only" id="start-title">GIFT 스탬프투어 시작</h1>
      <img class="hero-logo" src="assets/gift-start-keyvisual.png" alt="GIFT 스탬프투어 START! G I F T를 모으며 축제를 완성하라" />
      <p class="hero-copy">
        캠퍼스 곳곳의 ${giftLetters()} Zone을 찾아 퀴즈에 참여하세요.
        <strong>4개의 스탬프를 모아 GIFT를 완성하세요!</strong>
      </p>
      <div class="map-card">
        <div class="map-window"><img src="assets/campus-zone-map.png" alt="DIMA 캠퍼스 G, I, F, T Zone 배치도" /></div>
      </div>
      <div class="zone-grid" aria-label="GIFT Zone 선택">${ORDER.map(zoneCard).join("")}</div>
      <div class="button-stack">
        <button class="btn btn-gift" type="button" data-action="start">
          ${allComplete ? "GIFT 완주 화면 보기" : "GIFT 스탬프투어 START!"} ${icon("arrow")}
        </button>
        <button class="btn" type="button" data-action="stampbook">내 스탬프북 보기</button>
      </div>
      <p class="note">Zone을 선택하면 해당 퀴즈 디자인 페이지로 바로 이동합니다.</p>
    </section>`;
  }

  function renderQuiz() {
    const zone = ZONES[state.zone];
    const step = ORDER.indexOf(zone.id) + 1;
    return `<section class="screen" aria-labelledby="quiz-title" style="${zoneStyle(zone)}">
      <span class="eyebrow zone">${zone.id} ZONE</span>
      <h1 class="title" id="quiz-title">퀴즈 미션</h1>
      <p class="lead">학습성과를 확인하고 정답을 선택하세요.</p>
      ${progressHtml(step)}
      <form id="quiz-form" novalidate>
        <div class="glass-card question-card">
          <h2><span class="q-number">Q1.</span>${escapeHtml(zone.question)}</h2>
        </div>
        <div class="option-list" role="radiogroup" aria-label="${zone.id} Zone 퀴즈 선택지">
          ${zone.options.map((option, index) => `<label class="option ${state.selectedAnswer === index ? "selected" : ""}">
            <input type="radio" name="answer" value="${index}" ${state.selectedAnswer === index ? "checked" : ""} />
            <span class="option-index">${index + 1}</span><span>${escapeHtml(option)}</span>
          </label>`).join("")}
        </div>
        <div class="button-stack">
          <button class="btn btn-zone" id="quiz-submit" type="submit" ${state.selectedAnswer === undefined ? "disabled" : ""}>정답 확인</button>
        </div>
      </form>
    </section>`;
  }

  function stampRow(id) {
    const zone = ZONES[id];
    const collected = state.stamps.includes(id);
    return `<article class="glass-card stamp-row ${collected ? "" : "locked"}" style="${zoneStyle(zone)}">
      <img src="${zone.stamp}" alt="${id} 스탬프 ${collected ? "획득 완료" : "미획득"}" />
      <div><h3>${id} · ${zone.name}</h3><p>${zone.meaning}</p></div>
      <span class="stamp-status">${collected ? "획득 완료" : "미획득"}</span>
    </article>`;
  }

  function renderStampbook() {
    const complete = state.stamps.length === 4;
    return `<section class="screen" aria-labelledby="stampbook-title">
      <span class="eyebrow">STAMP BOOK</span>
      <h1 class="title" id="stampbook-title">스탬프북</h1>
      <p class="lead">GIFT 네 가지 역량을 모두 완성하세요.</p>
      ${progressHtml(state.stamps.length)}
      <div class="stamp-list">${ORDER.map(stampRow).join("")}</div>
      <div class="gift-banner">
        <strong>GIFT COMPLETE</strong>
        <span>${complete ? "4개의 GIFT 스탬프를 모두 모았습니다." : `${4 - state.stamps.length}개의 스탬프가 더 필요합니다.`}</span>
      </div>
      <div class="button-stack">
        <button class="btn ${complete ? "btn-gift" : "btn-primary"}" type="button" data-action="${complete ? "complete" : "next-zone"}">
          ${complete ? "완주 확인하기" : "다음 퀴즈 풀기"} ${icon("arrow")}
        </button>
      </div>
    </section>`;
  }

  function miniCard(id) {
    const zone = ZONES[id];
    return `<article class="glass-card mini-card" style="${zoneStyle(zone)}">
      <img src="${zone.stamp}" alt="${id} 스탬프" />
      <div><strong>${id} · ${zone.name}</strong><span>${zone.meaning}</span></div>
    </article>`;
  }

  function renderComplete() {
    return `<section class="screen center" aria-labelledby="complete-title">
      <div class="complete-check inline-icon">${icon("check")}</div>
      <div class="complete-script" aria-label="G I F T COMPLETE">
        <span class="g">G</span>·<span class="i">I</span>·<span class="f">F</span>·<span class="t">T</span> COMPLETE!
      </div>
      ${progressHtml(4)}
      <h1 class="title" id="complete-title">축하합니다!</h1>
      <p class="lead">GIFT 스탬프투어를 모두 완료했습니다.</p>
      <div class="mini-grid">${ORDER.map(miniCard).join("")}</div>
      <div class="gift-banner"><strong>당신이 모은 네 가지가 바로 DIMA의 GIFT입니다.</strong></div>
      <p class="lead" style="margin-top:14px">한 해의 배움과 도전이 기적 같은 결실이 되는 순간,</p>
      <div class="miracle">Miracle DIMA</div>
      <div class="button-stack">
        <button class="btn btn-gift" type="button" data-action="survey">만족도 조사하고 혜택 받기 ${icon("arrow")}</button>
      </div>
      <p class="note">만족도 조사 완료 후 모바일 상품권 지급 및 수업협조문 신청이 가능합니다.</p>
    </section>`;
  }

  function surveyOptions(name, options, selected) {
    return `<div class="survey-options">${options.map((option, index) => {
      const value = index + 1;
      return `<label class="survey-option ${Number(selected) === value ? "selected" : ""}">
        <input type="radio" name="${name}" value="${value}" ${Number(selected) === value ? "checked" : ""} />
        <span class="radio-ui" aria-hidden="true"></span><span>${value}. ${option}</span>
      </label>`;
    }).join("")}</div>`;
  }

  function renderSurvey1() {
    return `<section class="screen" aria-labelledby="survey1-title">
      <span class="eyebrow">SURVEY 01</span>
      <h1 class="title" id="survey1-title">만족도 조사</h1>
      <p class="lead">GIFT Festa 2026</p>
      ${progressHtml(1)}
      <form class="stack" id="survey1-form" novalidate>
        <fieldset class="glass-card survey-card">
          <legend class="sr-only">문항 1</legend>
          <h2><strong>Q1.</strong> GIFT Festa를 통해 우리 대학의 다양한 학과와 교육프로그램에서 이루어진 학습성과를 이해하는 데 도움이 되었습니까?</h2>
          ${surveyOptions("q1", SURVEY_OPTIONS, state.survey.q1)}
        </fieldset>
        <fieldset class="glass-card survey-card">
          <legend class="sr-only">문항 2</legend>
          <h2><strong>Q2.</strong> 다른 학생들의 작품·프로젝트·성과를 보며 나의 전공학습이나 진로에 적용할 수 있는 아이디어를 얻었습니까?</h2>
          ${surveyOptions("q2", SURVEY_OPTIONS, state.survey.q2)}
        </fieldset>
        <p class="error" id="survey1-error" hidden></p>
        <button class="btn btn-primary" type="submit">다음 ${icon("arrow")}</button>
      </form>
    </section>`;
  }

  function renderSurvey2() {
    const q4 = state.survey.q4 || "";
    return `<section class="screen" aria-labelledby="survey2-title">
      <span class="eyebrow">SURVEY 02</span>
      <h1 class="title" id="survey2-title">만족도 조사</h1>
      <p class="lead">GIFT Festa 2026</p>
      ${progressHtml(2)}
      <form class="stack" id="survey2-form" novalidate>
        <fieldset class="glass-card survey-card">
          <legend class="sr-only">문항 3</legend>
          <h2><strong>Q3.</strong> GIFT Festa 참여가 앞으로 새로운 학습이나 프로젝트에 도전하려는 동기를 높이는 데 도움이 되었습니까?</h2>
          ${surveyOptions("q3", SURVEY_OPTIONS, state.survey.q3)}
        </fieldset>
        <div class="glass-card survey-card">
          <label for="q4"><h2><strong>Q4.</strong> GIFT Festa에서 가장 인상 깊었던 성과 또는 새롭게 알게 된 점을 한 가지 적어주세요.</h2></label>
          <textarea class="textarea" id="q4" name="q4" minlength="20" maxlength="100" placeholder="20~100자로 입력해 주세요." required>${escapeHtml(q4)}</textarea>
          <span class="char-count" id="q4-count">${q4.length} / 100자</span>
        </div>
        <fieldset class="glass-card survey-card">
          <legend class="eyebrow" style="margin-bottom:10px">선택 추가문항</legend>
          <h2>GIFT Festa 2026에 전반적으로 만족하셨습니까?</h2>
          ${surveyOptions("q5", SATISFACTION_OPTIONS, state.survey.q5)}
        </fieldset>
        <p class="error" id="survey2-error" hidden></p>
        <button class="btn btn-gift" type="submit">설문 제출</button>
      </form>
    </section>`;
  }

  function field(name, label, placeholder, type = "text", autocomplete = "off", inputmode = "text") {
    const value = state.participant[name] || "";
    return `<div class="glass-card field-card">
      <label class="field-label" for="${name}">${label} <span class="required" aria-label="필수">*</span></label>
      <input class="input" id="${name}" name="${name}" type="${type}" inputmode="${inputmode}" autocomplete="${autocomplete}"
        value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" required />
    </div>`;
  }

  function renderParticipant() {
    return `<section class="screen" aria-labelledby="participant-title">
      <span class="eyebrow">PARTICIPANT INFO</span>
      <h1 class="title" id="participant-title">참여자 정보 입력</h1>
      ${progressHtml(3)}
      <p class="lead">참여자 정보를 입력해 주세요.<br />모바일 상품권 지급, 중복 참여 확인 및 수업협조문 발급을 위해 사용됩니다.</p>
      <form class="stack" id="participant-form" style="margin-top:14px" novalidate>
        ${field("name", "성명", "이름을 입력해 주세요.", "text", "name")}
        ${field("studentId", "학번", "학번을 입력해 주세요.", "text", "off", "numeric")}
        ${field("department", "학과(전공)", "학과 또는 전공을 입력해 주세요.", "text", "organization")}
        ${field("phone", "휴대전화번호", "010-0000-0000", "tel", "tel", "tel")}
        <p class="note" style="text-align:left;margin-top:-2px">※ 모두 필수입력</p>
        <div class="info-grid">
          <article class="glass-card info-card"><span class="info-icon inline-icon">${icon("phone")}</span><h3>휴대전화번호 안내</h3><p>모바일 상품권을 받을 수 있는 정확한 휴대전화번호를 입력해 주세요.</p></article>
          <article class="glass-card info-card"><span class="info-icon inline-icon">${icon("document")}</span><h3>중복 지급 기준</h3><p>모바일 상품권은 1인 1회 지급됩니다.</p></article>
        </div>
        <p class="error" id="participant-error" hidden></p>
        <button class="btn btn-gift" type="submit">다음 ${icon("arrow")}</button>
      </form>
    </section>`;
  }

  function consentItem(iconName, title, text) {
    return `<section class="consent-item">
      <span class="inline-icon">${icon(iconName)}</span>
      <div><h3>${title}</h3><p>${text}</p></div>
    </section>`;
  }

  function renderPrivacy() {
    return `<section class="screen" aria-labelledby="privacy-title">
      <span class="eyebrow">PRIVACY</span>
      <h1 class="title" id="privacy-title">개인정보 수집·이용 동의</h1>
      ${progressHtml(4)}
      <form class="stack" id="privacy-form" novalidate>
        <div class="glass-card consent-panel">
          <h2><strong>[필수]</strong> 개인정보 수집·이용 동의</h2>
          <p>동아방송예술대학교는 GIFT Festa 2026 운영을 위해 다음과 같이 개인정보를 수집·이용합니다.</p>
          ${consentItem("target", "수집·이용 목적", "GIFT 스탬프투어 참여 확인, 모바일 상품권 지급, 중복 지급 방지 및 수업협조문 발급")}
          ${consentItem("document", "수집 항목", "성명, 학번, 학과(전공), 휴대전화번호")}
          ${consentItem("clock", "보유·이용기간", "상품권 지급 및 수업협조문 관련 행정처리 완료 후 파기")}
          <p>개인정보 수집·이용에 대한 동의를 거부할 권리가 있으나, 동의하지 않을 경우 모바일 상품권 지급 및 수업협조문 발급이 제한될 수 있습니다.</p>
        </div>
        <label class="consent-check ${state.consent ? "checked" : ""}">
          <input id="consent" name="consent" type="checkbox" ${state.consent ? "checked" : ""} />
          <span class="checkbox-ui" aria-hidden="true"></span>
          <span>개인정보 수집·이용에 동의합니다.</span>
        </label>
        <button class="btn ${state.consent ? "btn-gift" : ""}" id="finish-button" type="submit" ${state.consent ? "" : "disabled"}>참여 완료</button>
        <p class="note">※ 체크하지 않은 경우 완료 버튼 비활성화.</p>
      </form>
    </section>`;
  }

  function renderDone() {
    return `<section class="screen center" aria-labelledby="done-title" style="padding-top:30px">
      <div class="complete-check inline-icon">${icon("check")}</div>
      <span class="eyebrow">COMPLETE</span>
      <h1 class="title" id="done-title">참여가 완료되었습니다.</h1>
      <p class="lead">GIFT Festa 2026에 참여해 주셔서 감사합니다.</p>
      <div class="miracle" style="margin-top:26px">Miracle DIMA</div>
      <div class="button-stack"><button class="btn btn-primary" type="button" data-action="home">처음 화면으로</button></div>
    </section>`;
  }

  const RENDERERS = {
    start: renderStart,
    ar: renderAr,
    quiz: renderQuiz,
    stampbook: renderStampbook,
    complete: renderComplete,
    survey1: renderSurvey1,
    survey2: renderSurvey2,
    participant: renderParticipant,
    privacy: renderPrivacy,
    done: renderDone,
  };

  function render() {
    if (state.screen !== "ar" && window.stopTigerQuest) {
        window.stopTigerQuest();
    }

    closeModal(false);
    renderHeader();
    app.innerHTML = (RENDERERS[state.screen] || renderStart)();

    requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });

  // 2. 화면 렌더링이 끝나고, 현재 화면이 AR이라면 퀘스트를 시작합니다.
      if (state.screen === "ar" && window.startTigerQuest) {
          window.startTigerQuest(() => {
              // onSuccessCallback: AR 2단계 인증 성공 시 실행될 동작
              showToast("AR 인증 성공! 퀴즈를 풀어보세요.");
              
              // 카메라 끄기 및 퀴즈 화면으로 전환
              window.stopTigerQuest();
              navigate("quiz");
          });
      }
    });
  }

  function navigate(screen, replace = false) {
    if (!VALID_SCREENS.includes(screen)) screen = "start";
    state.screen = screen;
    state.selectedAnswer = undefined;
    const url = `#${screen}${screen === "quiz" ? `-${state.zone}` : ""}`;
    if (replace) history.replaceState({ screen, zone: state.zone }, "", url);
    else history.pushState({ screen, zone: state.zone }, "", url);
    render();
  }

  function nextIncompleteZone() {
    return ORDER.find((id) => !state.stamps.includes(id)) || "G";
  }

async function handleQuizSubmit() {
    const zone = ZONES[state.zone];
    if (state.selectedAnswer === zone.answer) {
      if (!state.stamps.includes(zone.id)) {
        try {
            // 정답을 맞추면 최종 스탬프(PHOTO_SUBMITTED 상태) 획득 API 호출
            const res = await fetch("/api/tour/photo_upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dima_id: zone.dima_id })
            });
            const data = await res.json();

            if (data.success) {
                state.stamps.push(zone.id); // UI 반영
                showCorrect(zone);
            } else {
                showToast("스탬프 발급 중 오류가 발생했습니다.");
            }
        } catch (err) {
            showToast("네트워크 오류입니다.");
        }
      } else {
         // 이미 획득한 경우
         showCorrect(zone);
      }
    } else {
      showWrong(zone);
    }
  }

  function showCorrect(zone) {
    showModal(`<div class="result-icon inline-icon">${icon("check")}</div>
      <h2 id="result-title">정답입니다!</h2>
      <h3 style="color:${zone.color}">${escapeHtml(zone.correctTitle)}</h3>
      <p><strong style="color:#fff">${escapeHtml(zone.meaning)}</strong><br />${escapeHtml(zone.correctBody)}</p>
      <div class="modal-divider"></div>
      <img class="modal-stamp" src="${zone.stamp}" alt="${zone.id} 스탬프 획득" />
      <h3 style="color:${zone.color}">${escapeHtml(zone.stampTitle)}</h3>
      <p>${escapeHtml(zone.stampBody)}</p>
      <div class="button-stack"><button class="btn btn-zone" type="button" data-action="after-stamp" style="${zoneStyle(zone)}">다음으로</button></div>`,
    "result-title", zone.color);
  }

  function showWrong(zone) {
    showModal(`<div class="result-icon inline-icon">${icon("close")}</div>
      <h2 id="result-title">다시 도전!</h2>
      <p>${escapeHtml(zone.wrong)}</p>
      <div class="button-stack"><button class="btn btn-zone" type="button" data-action="close-modal" style="${zoneStyle(zone)}">다시 도전하기</button></div>`,
    "result-title", "#FF4D69");
  }

  function showHelp() {
    showModal(`<h2 id="help-title">HTML 디자인 페이지 안내</h2>
      <p>이 버전은 시작, 퀴즈, 스탬프북, 완주, 설문, 참여자 정보, 개인정보 동의와 최종 팝업 디자인만 제공합니다.</p>
      <div class="modal-divider"></div>
      <p>Zone 카드에서 퀴즈를 선택하고 정답을 맞히면 스탬프북 화면을 순서대로 확인할 수 있습니다.</p>
      <div class="button-stack">
        <button class="btn btn-primary" type="button" data-action="close-modal">확인</button>
        <button class="btn" type="button" data-action="reset">스탬프 디자인 초기화</button>
      </div>`, "help-title", "#8E55FF");
  }

  function showFinal() {
    showModal(`<div class="result-icon inline-icon">${icon("check")}</div>
      <span class="eyebrow">COMPLETE</span>
      <h2 id="final-title" style="margin-top:10px">GIFT Festa 참여 완료!</h2>
      <p>GIFT 스탬프투어와 만족도 조사를 모두 완료했습니다.</p>
      <div class="benefit-list">
        <article class="benefit-card"><span class="inline-icon">${icon("gift")}</span><div><h3>모바일 상품권</h3><p>입력한 휴대전화번호로 지급될 예정입니다.</p></div></article>
        <article class="benefit-card"><span class="inline-icon">${icon("document")}</span><div><h3>수업협조문</h3><p>스탬프투어를 완료한 재학생은 각 학과사무실로 수업협조문이 발급됩니다.</p></div></article>
      </div>
      <div class="modal-divider"></div>
      <p style="color:#fff">참여해 주셔서 감사합니다.</p>
      <div class="final-brand"><em>Miracle DIMA,</em><strong>${giftLetters()} Festa 2026</strong></div>
      <div class="button-stack"><button class="btn btn-gift" type="button" data-action="confirm-final">확인</button></div>`,
    "final-title", "#B044FF");
  }

  function showModal(content, labelledBy, accent = "#9656FF", dismissible = true) {
    previousFocus = document.activeElement;
    modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}" style="--modal-accent:${accent}">
      ${dismissible ? `<button class="modal-close" type="button" data-action="close-modal" aria-label="팝업 닫기">${icon("close")}</button>` : ""}
      ${content}
    </div>`;
    document.body.style.overflow = "hidden";
    modalRoot.querySelector("button")?.focus();
  }

  function closeModal(restore = true) {
    if (!modalRoot.innerHTML) return;
    modalRoot.innerHTML = "";
    document.body.style.overflow = "";
    if (restore && previousFocus instanceof HTMLElement) previousFocus.focus();
    previousFocus = null;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function showError(id, message) {
    const element = document.querySelector(id);
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSurvey1(form) {
    const data = new FormData(form);
    if (!data.get("q1") || !data.get("q2")) {
      showError("#survey1-error", "Q1과 Q2에 모두 응답해 주세요.");
      return;
    }
    state.survey.q1 = Number(data.get("q1"));
    state.survey.q2 = Number(data.get("q2"));
    navigate("survey2");
  }

  function handleSurvey2(form) {
    const data = new FormData(form);
    const q4 = String(data.get("q4") || "").trim();
    if (!data.get("q3")) {
      showError("#survey2-error", "Q3에 응답해 주세요.");
      return;
    }
    if (q4.length < 20 || q4.length > 100) {
      showError("#survey2-error", "Q4는 20~100자로 작성해 주세요.");
      return;
    }
    state.survey.q3 = Number(data.get("q3"));
    state.survey.q4 = q4;
    state.survey.q5 = data.get("q5") ? Number(data.get("q5")) : null;
    navigate("participant");
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return value;
  }

  function handleParticipant(form) {
    const data = new FormData(form);
    const participant = {
      name: String(data.get("name") || "").trim(),
      studentId: String(data.get("studentId") || "").trim(),
      department: String(data.get("department") || "").trim(),
      phone: formatPhone(String(data.get("phone") || "").trim()),
    };
    if (participant.name.length < 2 || participant.department.length < 2 || !/^[0-9A-Za-z-]{5,15}$/.test(participant.studentId) || !/^01[016789]-\d{3,4}-\d{4}$/.test(participant.phone)) {
      showError("#participant-error", "모든 필수 정보를 정확히 입력해 주세요.");
      return;
    }
    state.participant = participant;
    navigate("privacy");
  }

  async function checkGPSAndEnterZone(id) {
    if (!ZONES[id]) return;
    
    // 이미 획득한 곳이면 그냥 퀴즈 화면 열기(복습용)
    if (state.stamps.includes(id)) {
        state.zone = id;
        state.selectedAnswer = undefined;
        navigate("quiz");
        return;
    }

    if (!navigator.geolocation) {
        showToast("GPS를 지원하지 않는 기기입니다.");
        return;
    }

    showToast("위치를 확인 중입니다...");
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const dima_id = ZONES[id].dima_id;

        try {
            const res = await fetch("/api/tour/arrive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dima_id, lat: latitude, lng: longitude })
            });
            const data = await res.json();

            if (data.success) {
                // GPS 통과 시 -> AR 화면으로 진입!
                state.zone = id;
                navigate("ar"); 
            } else {
                showToast(data.error || "위치 인증에 실패했습니다.");
            }
        } catch (err) {
            showToast("서버와 통신할 수 없습니다.");
        }
    }, (err) => {
        showToast("GPS 위치 권한을 허용해주세요.");
    });
  }

  app.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "help") showHelp();
    if (action === "home") navigate("start", true);
    if (action === "back") navigate(BACK[state.screen] || "start", true);
    if (action === "zone") checkGPSAndEnterZone(control.dataset.zone);
    if (action === "start") state.stamps.length === 4 ? navigate("complete") : checkGPSAndEnterZone(nextIncompleteZone());    if (action === "stampbook") navigate("stampbook");
    if (action === "next-zone") checkGPSAndEnterZone(nextIncompleteZone());
    if (action === "complete") navigate("complete");
    if (action === "survey") navigate("survey1");
  });

  header.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "help") showHelp();
    if (action === "home") navigate("start", true);
    if (action === "back") navigate(BACK[state.screen] || "start", true);
  });

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches('input[name="answer"]')) {
      state.selectedAnswer = Number(target.value);
      document.querySelectorAll(".option").forEach((option) => option.classList.remove("selected"));
      target.closest(".option")?.classList.add("selected");
      document.querySelector("#quiz-submit")?.removeAttribute("disabled");
    }
    if (target.matches(".survey-option input")) {
      target.closest(".survey-options")?.querySelectorAll(".survey-option").forEach((option) => option.classList.remove("selected"));
      target.closest(".survey-option")?.classList.add("selected");
    }
    if (target.matches("#consent")) {
      state.consent = target.checked;
      target.closest(".consent-check")?.classList.toggle("checked", target.checked);
      const button = document.querySelector("#finish-button");
      button.disabled = !target.checked;
      button.classList.toggle("btn-gift", target.checked);
    }
  });

  app.addEventListener("input", (event) => {
    if (event.target.matches("#q4")) {
      document.querySelector("#q4-count").textContent = `${event.target.value.length} / 100자`;
    }
    if (event.target.matches("#phone")) {
      const formatted = formatPhone(event.target.value);
      if (formatted.includes("-")) event.target.value = formatted;
    }
  });

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.id === "quiz-form") handleQuizSubmit();
    if (event.target.id === "survey1-form") handleSurvey1(event.target);
    if (event.target.id === "survey2-form") handleSurvey2(event.target);
    if (event.target.id === "participant-form") handleParticipant(event.target);
    if (event.target.id === "privacy-form") {
      if (!state.consent) {
          showToast("개인정보 수집·이용 동의가 필요합니다.");
      } else {
          // 서버로 데이터 전송
          submitFinalData();
      }
    }
  });

  async function submitFinalData() {
      try {
          const res = await fetch("/api/tour/submit_survey", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  survey: state.survey,
                  participant: state.participant
              })
          });
          const data = await res.json();
          if(data.success) {
              showFinal();
          } else {
              showToast("정보 저장에 실패했습니다. 다시 시도해주세요.");
          }
      } catch (err) {
          showToast("서버와 통신할 수 없습니다.");
      }
  }

  modalRoot.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "close-modal") closeModal();
    if (action === "after-stamp") {
      closeModal(false);
      navigate(state.stamps.length === 4 ? "stampbook" : "start");
    }
    if (action === "confirm-final") {
      closeModal(false);
      navigate("done", true);
    }
    if (action === "reset") {
      showToast("스탬프 디자인 상태를 초기화했습니다.");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
    if (event.key !== "Tab" || !modalRoot.innerHTML) return;
    const controls = [...modalRoot.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])")]
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  let arActive = false; // 카메라 활성화 상태 추적

  // [화면 UI] AR 전용 화면 그리기
  function renderAr() {
    // index-ar.html 의 body 안에 있던 UI 코드를 그대로 가져옵니다.
    return `
      <div id="ar-quest-container" style="width:100%; height:100vh; position:fixed; top:0; left:0; z-index:9999; background:#000;">
        
        <!-- 뒤로가기 강제 버튼 (안전장치) -->
        <button type="button" data-action="back" style="position:absolute; top:15px; left:15px; z-index:10000; background:transparent; border:none; padding:0; width:44px; height:44px; cursor:pointer;">
          <img src="assets/back-btn-white.png" alt="뒤로 가기" style="width:100%; height:100%; object-fit:contain;" />
        </button>

        <!-- ============================== SCREEN 1 : INTRO ============================== -->
 <section id="screen-intro" class="ar-screen active">
  <div class="card">
    <!--div class="badge">QUEST</div-->
    <h1>호랑이를 찾아라!</h1>
    <p class="sub">1단계 포즈 인증을 통과하면, 2단계에서 카메라로 호랑이 이미지를 인식시켜 퀘스트를 완료할 수 있어요.</p>

    <div class="tabs" id="pose-tabs">
      <button class="tab active" data-pose="thumbs_up">
        <span class="tab-icon" data-icon="thumbs_up"></span>
        엄지척 포즈
      </button>
      <button class="tab" data-pose="victory">
        <span class="tab-icon" data-icon="victory"></span>
        V 포즈
      </button>
    </div>

    <ol class="steps">
      <li><b>STEP 1</b> 선택한 손 포즈를 카메라에 맞춰 인증하기</li>
      <li><b>STEP 2</b> 카메라로 호랑이 이미지를 인식시키기</li>
    </ol>

    <button id="btn-start" class="btn btn-primary">시작하기</button>
    <p class="hint">카메라 권한 요청이 표시되면 허용해주세요.</p>
  </div>
</section>
        
        <!-- ============================== SCREEN 2 : POSE AUTH ============================== -->
 <section id="screen-pose" class="ar-screen">
  <video id="pose-video" playsinline autoplay muted></video>

  <div class="guide-icon-wrap">
    <span class="guide-icon" id="guide-icon" data-icon="thumbs_up"></span>
  </div>

  <div class="hud-top">
    <div class="hud-banner">
      <span class="badge-inline">POSE CHALLENGE</span>
      <span id="pose-banner-text">엄지척 포즈를 인식시켜 주세요</span>
    </div>
  </div>

  <button id="btn-flip-camera" class="icon-btn hud-flip" title="카메라 전환">⟲</button>

  <div class="hud-bottom">
    <div class="progress-ring-wrap">
      <svg class="progress-ring" viewBox="0 0 120 120">
        <circle class="progress-ring-bg" cx="60" cy="60" r="52"></circle>
        <circle id="progress-ring-fg" class="progress-ring-fg" cx="60" cy="60" r="52"></circle>
      </svg>
      <div class="progress-ring-label" id="pose-status-label">포즈 인식 대기중</div>
    </div>
  </div>
</section>
        
        <!-- TRANSITION OVERLAY -->
<div id="step-transition" aria-hidden="true">
  <img id="transition-bg" alt="">
  <div class="transition-scrim"></div>
  <div class="transition-content">
    <div class="spinner"></div>
    <div class="transition-label">2단계 준비 중...</div>
    <div class="transition-sub">호랑이 이미지 인식으로 이동할게요</div>
  </div>
</div>

        <!-- ============================== SCREEN 3 : IMAGE RECOGNITION ============================== -->
<section id="screen-image" class="ar-screen">
  <div id="ar-mount"></div>

  <div class="hud-top">
    <div class="hud-banner">
      <span class="badge-inline">IMAGE CHALLENGE</span>
      <span id="image-banner-text">호랑이 이미지를 화면 안에 비춰주세요</span>
    </div>
  </div>

  <div class="hud-bottom">
    <div class="timer-wrap">
      <div class="timer-bar-track"><div id="image-timer-bar" class="timer-bar-fill"></div></div>
      <div id="image-status-label">이미지 스캔 중...</div>
    </div>
    <button id="btn-give-up" class="btn btn-ghost">그만하기</button>
  </div>
</section>
        
        <!-- ============================== SCREEN 4 : RESULT ============================== -->
<section id="screen-result" class="ar-screen">
  <div class="card" id="result-card">
    <div id="result-icon" class="result-icon"></div>
    <h1 id="result-title">인증 성공!</h1>
    <p id="result-sub" class="sub">두 단계를 모두 완료했어요.</p>

    <div class="snapshot-wrap">
      <img id="result-photo" class="snapshot" alt="포즈 인증 + 이미지 인식 합성 사진">
    </div>

    <div class="result-actions">
      <button id="btn-download" class="btn btn-secondary">사진 저장하기</button>
      <button id="btn-retry" class="btn btn-primary">다시 도전하기</button>
    </div>
  </div>
</section>

        <canvas id="compose-canvas" style="display:none"></canvas>
      </div>
    `;
  }

  // [기능] AR 씬(카메라) 시작
  async function startAR() {
    if (arActive) return;
    const mount = document.getElementById("ar-mount");
    if (!mount) return;

    const zone = ZONES[state.zone];
    const targetName = zone.targetName || "tiger-target";
    const targetFile = zone.targetFile || "tiger-target.json";

    // 1. 해당 구역의 AR 타겟 JSON을 동적으로 불러옵니다.
    try {
        const res = await fetch(`./${targetFile}`);
        const json = await res.json();
        
        const applyConfig = () => {
            window.XR8.XrController.configure({ imageTargetData: [json] });
        };
        
        if (window.XR8 && window.XR8.XrController) applyConfig();
        else window.addEventListener("xrloaded", applyConfig, { once: true });
    } catch (err) {
        console.error("AR 타겟 데이터를 불러올 수 없습니다.", err);
    }

    // 2. A-Frame(AR 씬) HTML을 DOM에 주입하여 카메라 구동
    mount.innerHTML = `
      <a-scene
        xrextras-loading
        xrextras-runtime-error
        renderer="colorManagement: true; physicallyBasedRendering: true;"
        xrweb="disableWorldTracking: true">
        <a-camera position="0 1 1" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>
        
        <xrextras-named-image-target name="${targetName}" id="current-image-target">
          <!-- 인식되었을 때 반짝 표시할 초록색 하이라이트 -->
          <a-plane material="color:#22c55e; opacity:0.4; transparent:true;" width="1" height="1.3" position="0 0 0.01"></a-plane>
        </xrextras-named-image-target>
      </a-scene>
    `;

    const sceneEl = mount.querySelector("a-scene");
    const targetEl = mount.querySelector("#current-image-target");

    // 3. 이미지 인식 성공 이벤트 처리
    const onFound = (e) => {
        if (!e.detail || e.detail.name === targetName) {
            showToast("이미지 인식 성공! 퀴즈를 풀어보세요.");
            // 인식 성공 즉시 카메라 끄고 퀴즈 화면으로 넘어감
            stopAR();
            navigate("quiz");
        }
    };

    sceneEl.addEventListener("xrimagefound", onFound);
    if (targetEl) targetEl.addEventListener("xrextrasfound", onFound);

    arActive = true;
  }

  // [기능] AR 카메라 완벽 종료 (뒤로가기 방어용 핵심)
  function stopAR() {
    if (!arActive) return;
    try {
        if (window.XR8 && typeof window.XR8.stop === "function") {
            window.XR8.stop(); // 8th Wall 카메라 리소스 즉각 반환
        }
    } catch(e) {
        console.warn("XR8 종료 중 오류", e);
    }
    const mount = document.getElementById("ar-mount");
    if (mount) mount.innerHTML = ""; // DOM 청소
    arActive = false;
  }

  window.addEventListener("popstate", (event) => {
    const screen = event.state?.screen;
    state.screen = VALID_SCREENS.includes(screen) ? screen : "start";
    if (ZONES[event.state?.zone]) state.zone = event.state.zone;
    render();
  });

  history.replaceState({ screen: state.screen, zone: state.zone }, "", `#${state.screen}`);

    async function initApp() {
    try {
      // 1. 유저 세션 시작 (여권번호 발급/확인)
      await fetch("/api/tour/start", { method: "POST" });
      
      // 2. 획득한 스탬프 불러오기
      const res = await fetch(`/api/tour/my_stamps?t=${new Date().getTime()}`);
      const data = await res.json();
      
      if (data.success) {
        // 서버에서 PHOTO_SUBMITTED 상태인 것들만 맵핑
        const dbStamps = data.stamps
            .filter(s => s.status === 'PHOTO_SUBMITTED')
            .map(s => {
                if(s.dima_id === 1) return "G";
                if(s.dima_id === 2) return "I";
                if(s.dima_id === 3) return "F";
                if(s.dima_id === 4) return "T";
            });
        state.stamps = dbStamps;
      }
    } catch (err) {
      console.error("앱 초기화 오류", err);
    } finally {
      render(); 
    }
  }

  initApp();
})();

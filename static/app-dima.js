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
      targetName: "G-target",
      targetFile: "target.json",
      name: "Go first",
      meaning: "개척과 도전",
      color: "#E5007F",
      stamp: "assets/stamps/g.png",
      question:
        "먼저 시작하고 새로운 가능성에 도전하는 DIMA의 정신, G는 무엇일까요?",
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
      targetName: "I-target",
      targetFile: "target.json",
      name: "Intensive Practice",
      meaning: "깊이 있는 숙련",
      color: "#890C84",
      stamp: "assets/stamps/i.png",
      question:
        "몰입과 반복을 통해 전문성을 깊게 만드는 DIMA의 정신, I는 무엇일까요?",
      options: [
        "Inspire mind",
        "Intensive Practice",
        "Imagine creation",
        "Infinite potential",
      ],
      answer: 1,
      correctTitle: "I = Intensive Practice",
      correctBody:
        "끊임없는 연습과 몰입으로 실력을 깊이 있게 쌓아가는 DIMA의 정신입니다.",
      wrong: "조금만 더 생각해보세요. 다시 도전!",
      stampTitle: "I Stamp 획득!",
      stampBody: "당신의 두 번째 GIFT, Intensive Practice",
    },
    F: {
      id: "F",
      dima_id: 3,
      targetName: "F-target",
      targetFile: "target.json",
      name: "Fearless of failure",
      meaning: "실패를 두려워하지 않음",
      color: "#381F87",
      stamp: "assets/stamps/f.png",
      stampBook: "assets/stamps/f-light.png",
      question:
        "실패를 두려워하지 않고 다시 도전하는 DIMA의 정신, F는 무엇일까요?",
      options: [
        "Future making",
        "Free expression",
        "First attempt",
        "Fearless of failure",
      ],
      answer: 3,
      correctTitle: "F = Fearless of failure",
      correctBody:
        "실패를 성장의 과정으로 받아들이고 다시 도전하는 DIMA의 정신입니다.",
      wrong: "실패를 두려워하지 말고, 다시 도전해보세요!",
      stampTitle: "F Stamp 획득!",
      stampBody: "당신의 세 번째 GIFT, Fearless of failure",
    },
    T: {
      id: "T",
      dima_id: 4,
      targetName: "T-target",
      targetFile: "target.json",
      name: "Teamwork",
      meaning: "협력과 소통",
      color: "#F18E29",
      stamp: "assets/stamps/t.png",
      question:
        "서로의 재능을 연결해 더 큰 결과를 만들어내는 DIMA의 정신, T는 무엇일까요?",
      options: ["True artist", "Try again", "Teamwork", "Talent power"],
      answer: 2,
      correctTitle: "T = Teamwork",
      correctBody:
        "서로 다른 재능과 역량을 연결해 더 큰 성과를 만드는 DIMA의 정신입니다.",
      wrong: "함께 생각하면 답이 보입니다. 다시 도전해보세요!",
      stampTitle: "T Stamp 획득!",
      stampBody: "당신의 네 번째 GIFT, Teamwork",
    },
  };

  const ORDER = ["G", "I", "F", "T"];

  // ===== 축제 안내 (안내1: 프로그램 일정표 / 안내2: 장소 안내) =====
  const GUIDES = {
    schedule: { src: "assets/guide-schedule.jpg", title: "축제 프로그램 일정표" },
    venue: { src: "assets/guide-venue.jpg", title: "축제 장소 안내" },
  };

  // [시작시각, 프로그램, 장소, 종료시각(선택, 없으면 60분)]
  const PROGRAM = {
    "2026-10-07": [
      ["11:00", "학과 대항 OX 퀴즈전 & 개회식", "한울마당"],
      ["12:00", "난타 공연 | 연극과", "한울마당"],
      ["13:00", "갈라쇼 | 뮤지컬과", "한울마당"],
      ["14:00", "재즈 Hard bop 공연 | 기악과", "한울마당"],
      ["15:00", "싱어송라이터 Flows 공연 | 작곡과", "한울마당"],
      ["16:00", "보컬 MIXTAPE 공연 | 보컬과", "한울마당"],
      ["17:00", "HEADLINER 공연 | K-POP과", "한울마당"],
      ["18:00", "DJ Performance | RISER", "한울마당"],
    ],
    "2026-10-08": [
      ["11:00", "DIMA BEST 단편", "콘서트홀"],
      ["14:00", "DIMA BEST 다큐", "콘서트홀"],
      ["15:00", "DIMA BEST MV & 예능", "콘서트홀"],
      ["16:00", "DIMA BEST 광고", "콘서트홀"],
    ],
  };
  const FESTA_DAYS = Object.keys(PROGRAM).sort();

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function toMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function nowNextInfo(now = new Date()) {
    const key = dateKey(now);
    const list = PROGRAM[key];

    if (!list) {
      if (key < FESTA_DAYS[0]) {
        const [y, m, d] = FESTA_DAYS[0].split("-").map(Number);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days = Math.round((new Date(y, m - 1, d) - today) / 86400000);
        return { label: `D-${days}`, text: "10.7(수)~10.8(목) 프로그램 일정 보기" };
      }
      return { label: "일정", text: "GIFT FESTA 2026 프로그램 일정표 보기" };
    }

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const current = list.find(([start, , , end]) => {
      const s = toMinutes(start);
      const e = end ? toMinutes(end) : s + 60;
      return s <= nowMin && nowMin < e;
    });
    const next = list.find(([start]) => toMinutes(start) > nowMin);

    if (current) {
      const after = next && next !== current ? next : null;
      return {
        label: "NOW",
        text: `${current[0]} ${current[1]} · ${current[2]}`,
        sub: after ? `다음 ${after[0]} ${after[1]}` : "",
      };
    }
    if (next) return { label: "NEXT", text: `${next[0]} ${next[1]} · ${next[2]}` };
    return { label: "오늘", text: "오늘 무대 프로그램이 모두 끝났어요 · 전체 일정 보기" };
  }

  function nowNextInner() {
    const info = nowNextInfo();
    return `<span class="now-next-label${info.label === "NOW" ? " live" : ""}">${escapeHtml(info.label)}</span>
      <span class="now-next-body">
        <span class="now-next-text">${escapeHtml(info.text)}</span>
        ${info.sub ? `<span class="now-next-sub">${escapeHtml(info.sub)}</span>` : ""}
      </span>
      ${icon("arrow")}`;
  }

  function nowNextHtml() {
    return `<button class="now-next" type="button" data-action="guide" data-guide="schedule" aria-label="축제 프로그램 일정표 보기">
      ${nowNextInner()}
    </button>`;
  }

  // 시작 화면에 머무는 동안 1분마다 NOW / NEXT 갱신
  setInterval(() => {
    if (state.screen !== "start") return;
    const el = document.querySelector(".now-next");
    if (el) el.innerHTML = nowNextInner();
  }, 60 * 1000);

  function showGuide(key) {
    const guide = GUIDES[key];
    if (!guide) return;
    const other = key === "schedule" ? "venue" : "schedule";
    showModal(
      `<h2 id="guide-title" class="guide-title">${guide.title}</h2>
      <p class="guide-hint">이미지를 탭하면 크게 볼 수 있어요</p>
      <div class="guide-viewer"><img src="${guide.src}" alt="${guide.title}" /></div>
      <div class="button-stack guide-modal-actions">
        <button class="btn" type="button" data-action="guide" data-guide="${other}">${GUIDES[other].title} 보기</button>
        <button class="btn btn-primary" type="button" data-action="close-modal">닫기</button>
      </div>`,
      "guide-title",
      "#B044FF",
    );
  }
  const SURVEY_OPTIONS = [
    "매우 그렇다",
    "그렇다",
    "보통이다",
    "그렇지 않다",
    "전혀 그렇지 않다",
  ];
  const SATISFACTION_OPTIONS = [
    "매우 만족",
    "만족",
    "보통",
    "불만족",
    "매우 불만족",
  ];
  const VALID_SCREENS = [
    "start",
    "ar",
    "quiz",
    "stampbook",
    "complete",
    "survey1",
    "survey2",
    "participant",
    "privacy",
    "done",
  ];
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
  const previewScreen = VALID_SCREENS.includes(params.get("screen"))
    ? params.get("screen")
    : "start";
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
    isSurveyDone: false,
  };
  let toastTimer = null;
  let previousFocus = null;

  const DRAFT_KEY = "dima_survey_draft_v1";

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
      close:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      help: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a2.8 2.8 0 1 1 4.6 2.2c-1.4.9-2.1 1.5-2.1 3.1M12 18h.01"/></svg>',
      arrow:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
      check:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
      gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4ZM2 6h20v4H2ZM12 6v15"/><path d="M12 6H7.8C5.5 6 5 2.5 7.5 2.5 10 2.5 12 6 12 6Zm0 0h4.2c2.3 0 2.8-3.5.3-3.5C14 2.5 12 6 12 6Z"/></svg>',
      document:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
      phone:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></svg>',
      target:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
      clock:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
      calendar:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
      pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.4"/></svg>',
      book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
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
    const collected = state.stamps.includes(id); // 스탬프 획득 여부 확인

    // collected가 true일 경우 버튼에 'disabled' 속성을 추가하여 터치를 막습니다.
    return `<button class="zone-card ${collected ? "collected" : ""}" type="button" data-action="zone" data-zone="${id}" style="${zoneStyle(zone)}" ${collected ? "disabled" : ""}>
      <img src="${zone.stamp}" alt="${id} 스탬프 ${collected ? "획득 완료" : "미획득"}" />
      <strong>${id} ZONE</strong>
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
      ${nowNextHtml()}
      <div class="map-card">
        <div class="map-window">
          <img src="assets/campus_map_banners_color.jpg" alt="DIMA 캠퍼스 G, I, F, T Zone 배치도" />
          <button class="map-hint" type="button" data-action="guide" data-guide="venue">축제 장소 안내 ${icon("arrow")}</button>
        </div>
      </div>
      <p class="zone-choose">도전할 Zone을 직접 선택해주세요.</p>
      <div class="zone-grid" aria-label="GIFT Zone 선택">${ORDER.map(zoneCard).join("")}</div>
      <div class="button-stack">
        ${
          allComplete
            ? `<button class="btn btn-gift" type="button" data-action="complete">
            GIFT 완주 화면 보기 ${icon("arrow")}
          </button>`
            : ""
        }
        <button class="btn btn-stampbook" type="button" data-action="stampbook">${icon("book")} 내 스탬프북 보기</button>
      </div>
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
          ${zone.options
            .map(
              (
                option,
                index,
              ) => `<label class="option ${state.selectedAnswer === index ? "selected" : ""}">
            <input type="radio" name="answer" value="${index}" ${state.selectedAnswer === index ? "checked" : ""} />
            <span class="option-index">${index + 1}</span><span>${escapeHtml(option)}</span>
          </label>`,
            )
            .join("")}
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
    <img src="${zone.stampBook || zone.stamp}" alt="${id} 스탬프 ${collected ? "획득 완료" : "미획득"}" />
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
        <button class="btn ${complete ? "btn-gift" : "btn-primary"}" type="button" data-action="${complete ? "complete" : "home"}">
          ${complete ? "완주 확인하기" : "다른 Zone 선택하기"} ${icon("arrow")}
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
    const surveyBtnHtml = state.isSurveyDone
      ? `<button class="btn" type="button" disabled>설문 참여 완료</button>`
      : `<button class="btn btn-gift" type="button" data-action="survey">만족도 조사하고 혜택 받기 ${icon("arrow")}</button>`;

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
        ${surveyBtnHtml}
      </div>
      <p class="note">만족도 조사 완료 후 모바일 상품권 지급 및 수업협조문 신청이 가능합니다.</p>
    </section>`;
  }

  function surveyOptions(name, options, selected) {
    return `<div class="survey-options">${options
      .map((option, index) => {
        const value = index + 1;
        return `<label class="survey-option ${Number(selected) === value ? "selected" : ""}">
        <input type="radio" name="${name}" value="${value}" ${Number(selected) === value ? "checked" : ""} />
        <span class="radio-ui" aria-hidden="true"></span><span>${value}. ${option}</span>
      </label>`;
      })
      .join("")}</div>`;
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

  function field(
    name,
    label,
    placeholder,
    type = "text",
    autocomplete = "off",
    inputmode = "text",
  ) {
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
      </form>
    </section>`;
  }

  function renderDone() {
    return `<section class="screen center" aria-labelledby="done-title" style="padding-top: 10vh;">
      <div class="complete-check inline-icon" style="transform: scale(1.1); margin-bottom: 24px;">${icon("check")}</div>
      
      <!-- display를 inline-flex로 변경하고 수직/수평 중앙 정렬 속성 강제 부여 -->
      <span class="eyebrow" style="margin-bottom: 16px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; padding-top: 2px;">COMPLETE</span>
      
      <h1 class="title" id="done-title" style="margin-bottom: 20px;">참여가 완료되었습니다.</h1>
      <p class="lead" style="margin-bottom: 40px;">GIFT Festa 2026에 참여해 주셔서 감사합니다.</p>
      
      <div class="miracle" style="margin-top: 50px; margin-bottom: 50px; font-size: 32px;">Miracle DIMA</div>
      
      <div class="button-stack">
        <button class="btn btn-primary" type="button" data-action="home">처음 화면으로</button>
      </div>
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
    const restrictedScreens = ["survey1", "survey2", "participant", "privacy"];
    if (state.isSurveyDone && restrictedScreens.includes(state.screen)) {
      showToast("이미 참여가 완료되었습니다.");
      
      // 강제로 완료 화면(complete)으로 덮어씌워버림
      state.screen = "complete"; 
      history.replaceState({ screen: "complete", zone: state.zone }, "", "#complete");
    }

    if (state.screen !== "ar" && window.stopTigerQuest) {
      window.stopTigerQuest();
    }

    closeModal(false);
    renderHeader();
    app.innerHTML = (RENDERERS[state.screen] || renderStart)();

    requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0; // 안드로이드/PC 웹 표준 대응
      document.body.scrollTop = 0;            // iOS 사파리 대응
      app.scrollTop = 0;

      // 2. 화면 렌더링이 끝나고, 현재 화면이 AR이라면 퀘스트를 시작합니다.
      const expectedTargetName = ZONES[state.zone].targetName;

      if (state.screen === "ar" && window.startTigerQuest) {
        const expectedTargetName = ZONES[state.zone].targetName;

    // 세 번째 인자로 state.zone을 반드시 유지해야 합니다!
    window.startTigerQuest(expectedTargetName, (recognizedTarget) => {
        
        // 일치할 경우 (정상 로직)
        if (recognizedTarget === expectedTargetName) {
            if (state.stamps.includes(state.zone)) {
                window.stopTigerQuest();
                navigate("start"); 
                showModal(`<div class="result-icon inline-icon">${icon("check")}</div>
                  <h2 id="already-title">안내</h2>
                  <p style="margin-top:10px">이미 <strong>${state.zone} Zone</strong> 스탬프를 획득했습니다.<br />다른 곳의 스탬프를 찾아주세요!</p>
                  <div class="button-stack">
                    <button class="btn btn-primary" type="button" data-action="close-modal">확인</button>
                  </div>`, "already-title", "#FF8C24");
                return;
            }
            showToast("AR 인증 성공! 퀴즈를 풀어보세요.");              
            window.stopTigerQuest();
            navigate("quiz");
        } 
        // 불일치할 경우 (다른 존의 배너를 찍었을 때 튕겨내는 에러 처리 로직)
        else {
            const wrongZoneName = recognizedTarget.charAt(0); // I-target -> I
            window.stopTigerQuest();
            navigate("start"); // 시작 화면으로 복귀
            showModal(`<div class="result-icon inline-icon">${icon("close")}</div>
              <h2 id="wrong-title">인증 실패</h2>
              <p style="margin-top:10px">현재 도전 중인 <strong>${state.zone} ZONE</strong> 배너가 아닙니다.<br />인식된 배너는 <strong>${wrongZoneName} ZONE</strong>입니다.</p>
              <div class="button-stack">
                <button class="btn btn-primary" type="button" data-action="close-modal">확인</button>
              </div>`, "wrong-title", "#FF4D69");
        }        
    }, state.zone); 
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
    const submitBtn = document.querySelector("#quiz-submit");

    if (state.selectedAnswer === zone.answer) {
      if (!state.stamps.includes(zone.id)) {
        try {
          // API 통신 시작 전 버튼 비활성화 (중복 클릭 방지)
          if (submitBtn) submitBtn.disabled = true;

          // 정답을 맞추면 최종 스탬프(PHOTO_SUBMITTED 상태) 획득 API 호출
          const res = await fetch("/api/tour/photo_upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dima_id: zone.dima_id }),
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
        } finally {
          // 통신이 완료되면 응답 결과와 상관없이 버튼 다시 활성화
          if (submitBtn) submitBtn.disabled = false;
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
    showModal(
      `<div class="result-icon inline-icon">${icon("check")}</div>
      <h2 id="result-title">정답입니다!</h2>
      <h3 style="color:${zone.color}">${escapeHtml(zone.correctTitle)}</h3>
      <p><strong style="color:#fff">${escapeHtml(zone.meaning)}</strong><br />${escapeHtml(zone.correctBody)}</p>
      <div class="modal-divider"></div>
      <img class="modal-stamp" src="${zone.stamp}" alt="${zone.id} 스탬프 획득" />
      <h3 style="color:${zone.color}">${escapeHtml(zone.stampTitle)}</h3>
      <p>${escapeHtml(zone.stampBody)}</p>
      <div class="button-stack"><button class="btn btn-zone" type="button" data-action="after-stamp" style="${zoneStyle(zone)}">다음으로</button></div>`,
      "result-title",
      zone.color,
    );
  }

  function showWrong(zone) {
    showModal(
      `<div class="result-icon inline-icon">${icon("close")}</div>
      <h2 id="result-title">다시 도전!</h2>
      <p>${escapeHtml(zone.wrong)}</p>
      <div class="button-stack"><button class="btn btn-zone" type="button" data-action="close-modal" style="${zoneStyle(zone)}">다시 도전하기</button></div>`,
      "result-title",
      "#FF4D69",
    );
  }

  function showHelp() {
    showModal(
      `<h2 id="help-title">HTML 디자인 페이지 안내</h2>
      <p>이 버전은 시작, 퀴즈, 스탬프북, 완주, 설문, 참여자 정보, 개인정보 동의와 최종 팝업 디자인만 제공합니다.</p>
      <div class="modal-divider"></div>
      <p>Zone 카드에서 퀴즈를 선택하고 정답을 맞히면 스탬프북 화면을 순서대로 확인할 수 있습니다.</p>
      <div class="button-stack">
        <button class="btn btn-primary" type="button" data-action="close-modal">확인</button>
        <button class="btn" type="button" data-action="reset">스탬프 디자인 초기화</button>
      </div>`,
      "help-title",
      "#8E55FF",
    );
  }

  function showFinal() {
    const isOffline = !!localStorage.getItem("dima_offline_queue");
    const statusText = isOffline 
      ? "<p id='sync-status' style='color:#FF4D69; font-weight:bold; margin-top:5px;'>서버 동기화 대기중</p>" 
      : "<p id='sync-status' style='color:#22c55e; font-weight:bold; margin-top:5px;'>서버 전송 완료</p>";
    
    showModal(
      `<div class="result-icon inline-icon">${icon("check")}</div>
      <span class="eyebrow">COMPLETE</span>
      <!-- 1. 타이틀의 GIFT를 색상/점 있는 스타일로 변경 -->
      <h2 id="final-title" style="margin-top:10px">${giftLetters()} Festa 참여 완료!</h2>
      ${statusText}
      <p style="margin-top:10px">GIFT 스탬프투어와 만족도 조사를 모두 완료했습니다.</p>
      <div class="benefit-list">
        <article class="benefit-card"><span class="inline-icon">${icon("gift")}</span><div><h3>모바일 상품권</h3><p>입력한 휴대전화번호로 지급될 예정입니다.</p></div></article>
        <article class="benefit-card"><span class="inline-icon">${icon("document")}</span><div><h3>수업협조문</h3><p>스탬프투어를 완료한 재학생은 각 학과사무실로 수업협조문이 발급됩니다.</p></div></article>
      </div>
      <div class="modal-divider"></div>
      <p style="color:#fff">참여해 주셔서 감사합니다.</p>
      <div class="final-brand"><em>Miracle DIMA,</em><strong>${giftLetters()} Festa 2026</strong></div>
      
      <!-- 3. 확인 버튼 위 안내 문구 추가 -->
      <p class="note" style="margin-top:20px; text-align:center; word-break:keep-all;">※ 만일의 경우를 대비하여 확인 버튼 클릭 시 완료 보관증이 기기에 자동 다운로드됩니다.</p>
      
      <!-- 2. 단일 버튼으로 통합 -->
      <div class="button-stack">
        <button class="btn btn-gift" type="button" data-action="confirm-final">확인</button>
      </div>`,
      "final-title",
      "#B044FF",
    );
  }

  function showModal(
    content,
    labelledBy,
    accent = "#9656FF",
    dismissible = true,
  ) {
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
    if (digits.length === 11)
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10)
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
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

    // 1. 이름 검사
    if (participant.name.length < 2) {
      showError("#participant-error", "성명을 2글자 이상 입력해 주세요.");
      return;
    }
    
    // 2. 학번 검사 (5~15자리 숫자/영문)
    if (!/^[0-9A-Za-z-]{5,15}$/.test(participant.studentId)) {
      showError("#participant-error", "학번을 정확히 입력해 주세요. (5자리 이상)");
      return;
    }

    // 3. 학과 검사
    if (participant.department.length < 2) {
      showError("#participant-error", "학과(전공)를 2글자 이상 입력해 주세요.");
      return;
    }

    // 4. 휴대전화번호 검사 (010, 011 등 표준 형식)
    if (!/^01[016789]-\d{3,4}-\d{4}$/.test(participant.phone)) {
      showError("#participant-error", "올바른 휴대전화번호 형식이 아닙니다. (예: 010-0000-0000)");
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

      showToast("위치를 확인 중입니다... (테스트 모드)");

    // ==========================================
    // [테스트용 임시 코드] 행사장 좌표 강제 셋팅
    // ==========================================
    const latitude = 37.0589182;
    const longitude = 127.3581239;
    const dima_id = ZONES[id].dima_id;

    try {
      const res = await fetch("/api/tour/arrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dima_id, lat: latitude, lng: longitude }),
      });
      const data = await res.json();

      if (data.success) {
        // 위치 통과 시 -> AR 화면으로 진입!
        state.zone = id;
        navigate("ar");
      } else {
        showToast(data.error || "위치 인증에 실패했습니다.");
      }
    } catch (err) {
      showToast("서버와 통신할 수 없습니다.");
    }
// ==========================================


/* --- 실 서비스 배포 시 위 테스트 코드를 지우고 아래 주석 해제 ---

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const dima_id = ZONES[id].dima_id;

        try {
          const res = await fetch("/api/tour/arrive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dima_id, lat: latitude, lng: longitude }),
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
      },
      (err) => {
        showToast("GPS 위치 권한을 허용해주세요.");
      },
    );
---------------------------------------- */

  }

  app.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "help") showHelp();
    if (action === "home") navigate("start", true);
    if (action === "back") navigate(BACK[state.screen] || "start", true);
    if (action === "zone") checkGPSAndEnterZone(control.dataset.zone);
    if (action === "start")
      state.stamps.length === 4
        ? navigate("complete")
        : checkGPSAndEnterZone(nextIncompleteZone());
    if (action === "stampbook") navigate("stampbook");
    if (action === "next-zone") checkGPSAndEnterZone(nextIncompleteZone());
    if (action === "complete") navigate("complete");
    if (action === "survey") navigate("survey1");
    if (action === "guide") showGuide(control.dataset.guide);
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
      document
        .querySelectorAll(".option")
        .forEach((option) => option.classList.remove("selected"));
      target.closest(".option")?.classList.add("selected");
      document.querySelector("#quiz-submit")?.removeAttribute("disabled");
    }
    if (target.matches(".survey-option input")) {
      target
        .closest(".survey-options")
        ?.querySelectorAll(".survey-option")
        .forEach((option) => option.classList.remove("selected"));
      target.closest(".survey-option")?.classList.add("selected");
    }
    if (target.matches("#consent")) {
      state.consent = target.checked;
      target
        .closest(".consent-check")
        ?.classList.toggle("checked", target.checked);
      const button = document.querySelector("#finish-button");
      button.disabled = !target.checked;
      button.classList.toggle("btn-gift", target.checked);
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      survey: state.survey,
      participant: state.participant
    }));
  });

  app.addEventListener("input", (event) => {
    if (event.target.matches("#q4")) {
      document.querySelector("#q4-count").textContent =
        `${event.target.value.length} / 100자`;
    }
    if (event.target.matches("#phone")) {
      const formatted = formatPhone(event.target.value);
      if (formatted.includes("-")) event.target.value = formatted;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      survey: state.survey,
      participant: state.participant
    }));
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
  // 1. 아이폰 로컬 테스트 시 crypto.randomUUID() 차단 에러 방지용 안전장치
  if (!state.idempotencyKey) {
    state.idempotencyKey = typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : 'id-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);
  }

  const payload = {
    survey: state.survey,
    participant: state.participant,
    idempotencyKey: state.idempotencyKey
  };

  try {
    const res = await fetch("/api/tour/submit_survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    // 2. 정상 성공 또는 중복 제출 시
    if (data.success || data.already_submitted) {
      localStorage.removeItem("dima_offline_queue"); // 오프라인 큐 비우기
      localStorage.removeItem(DRAFT_KEY);            // 작성 중이던 임시 데이터 비우기
      state.isSurveyDone = true;
      
      if (data.already_submitted) {
        showToast("이미 제출된 설문 내역이 있어 기존 기록이 유지됩니다.");
      }

      // ★ 정상 처리 후 모달 팝업 띄우기 (이전 코드에서 누락되었던 핵심)
      showFinal();
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    // 3. [낙관적 UI 처리] 통신 실패 시 오프라인 큐에 저장 후 강제 완료 처리
    showToast("네트워크 불안정으로 오프라인 저장되었습니다.");
    localStorage.setItem("dima_offline_queue", JSON.stringify(payload));
    localStorage.removeItem(DRAFT_KEY); // 작성 중이던 임시 데이터 비우기
    state.isSurveyDone = true;
    
    // ★ 에러가 났을 때도 모달 팝업 띄우기
    showFinal();
  }
}

  modalRoot.addEventListener("click", (event) => {
    // 안내 이미지: 탭하면 확대 / 다시 탭하면 원래 크기
    const guideImg = event.target.closest(".guide-viewer img");
    if (guideImg) {
      const viewer = guideImg.parentElement;
      const rect = guideImg.getBoundingClientRect();
      const rx = (event.clientX - rect.left) / rect.width;
      const ry = (event.clientY - rect.top) / rect.height;
      const zoomed = guideImg.classList.toggle("zoomed");
      viewer.classList.toggle("zoomed", zoomed);
      // 탭한 지점이 화면 가운데 오도록 스크롤
      requestAnimationFrame(() => {
        viewer.scrollLeft = rx * guideImg.offsetWidth - viewer.clientWidth / 2;
        viewer.scrollTop = ry * guideImg.offsetHeight - viewer.clientHeight / 2;
      });
      return;
    }

    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "close-modal") closeModal();
    if (action === "guide") {
      closeModal(false);
      showGuide(control.dataset.guide);
    }
    if (action === "after-stamp") {
      closeModal(false);
      navigate(state.stamps.length === 4 ? "stampbook" : "start");
    }

    if (action === "confirm-final") {
      const canvas = document.createElement("canvas");
      canvas.width = 600; 
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      // 1~5. 배경 및 텍스트 렌더링 (이전 코드와 동일)
      ctx.fillStyle = "#100f16"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rx = 30, ry = 30, rw = 540, rh = 420, radius = 15;
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      
      ctx.fillStyle = "#1c1b29"; 
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#B044FF"; 
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff"; 
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("GIFT Festa 2026 확인증", canvas.width / 2, 95);

      ctx.beginPath();
      ctx.moveTo(70, 130);
      ctx.lineTo(530, 130);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#444444";
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#eeeeee";
      
      const startX = 80;
      let startY = 190;
      const lineH = 50;

      ctx.fillText(`▪ 이름: ${state.participant.name}`, startX, startY); startY += lineH;
      ctx.fillText(`▪ 학번: ${state.participant.studentId}`, startX, startY); startY += lineH;
      ctx.fillText(`▪ 인증코드: ${(state.idempotencyKey || "").split('-')[0]}`, startX, startY); startY += lineH;
      
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`▪ 저장일시: ${new Date().toLocaleString()}`, startX, startY + 30);

      // ★ 아이폰(iOS) 완벽 대응을 위한 비동기 다운로드 및 Web Share API 적용
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = "GIFT_완료확인증.png";
        const file = new File([blob], fileName, { type: "image/png" });

        // iOS 사파리 등 Web Share API 지원 기기 (네이티브 공유 창 호출)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "GIFT Festa 2026 확인증"
            });
          } catch (err) {
            // 사용자가 공유 창을 취소하고 닫은 경우 무시하고 다음으로 넘어감
            console.warn("Share API 취소 또는 에러", err);
          }
        } else {
          // 안드로이드 및 PC 웹 브라우저 폴백 (기존 <a> 태그 다운로드 방식)
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = fileName;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }

        // 다운로드/공유 창 액션이 끝나면 무조건 최종 참여 완료 화면으로 이동
        closeModal(false);
        navigate("done", true);
      }, "image/png");
    }

    if (action === "reset") {
      showToast("스탬프 디자인 상태를 초기화했습니다.");
    }

  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
    if (event.key !== "Tab" || !modalRoot.innerHTML) return;
    const controls = [
      ...modalRoot.querySelectorAll(
        "button, input, [href], [tabindex]:not([tabindex='-1'])",
      ),
    ].filter((element) => !element.disabled && element.offsetParent !== null);
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

  function renderAr() {
    return `
      <div id="ar-quest-container" style="position:fixed; inset:0; width:100%; z-index:9999; background:#000;">        
        <!-- 뒤로가기 버튼 -->
        <button type="button" data-action="back" style="position:absolute; top:15px; left:15px; z-index:10000; background:transparent; border:none; padding:0; width:44px; height:44px; cursor:pointer;">
          <img src="assets/back-btn-white.png" alt="뒤로 가기" style="width:100%; height:100%; object-fit:contain;" />
        </button>

        <!-- SCREEN 1 : IMAGE RECOGNITION -->
        <section id="screen-image" class="ar-screen active" style="width:100%; height:100%; position:relative; overflow:hidden;">
          <div id="ar-mount" style="width:100%; height:100%;"></div>

          <!-- 상단 배너 -->
          <div class="ar-hud ar-hud-top">
            <div class="hud-banner">
              <span class="badge-inline">AR 미션</span>
              <span id="image-banner-text">엑스배너 이미지를 화면 안에 비춰주세요</span>
            </div>
          </div>

          <!-- 하단: 진행바 + 버튼 -->
          <div class="ar-hud ar-hud-bottom">
            <div class="timer-wrap" id="timer-ui">
              <div class="timer-bar-track"><div id="image-timer-bar" class="timer-bar-fill"></div></div>
              <div id="image-status-label">이미지 스캔 중...</div>
            </div>
            <div class="ar-actions is-hidden">
              <button id="btn-ar-action" class="btn btn-gift" type="button" disabled>퀴즈 풀러 가기</button>
            </div>
          </div>
        </section>

      </div>
    `;
  }

  window.addEventListener("popstate", (event) => {
    const screen = event.state?.screen;
    state.screen = VALID_SCREENS.includes(screen) ? screen : "start";
    if (ZONES[event.state?.zone]) state.zone = event.state.zone;
    render();
  });

  history.replaceState(
    { screen: state.screen, zone: state.zone },
    "",
    `#${state.screen}`,
  );

  async function initApp() {
    flushOfflineQueue();

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      state.survey = parsed.survey || {};
      state.participant = parsed.participant || {};
    }    

    try {
      await fetch("/api/tour/start", { method: "POST" });

      // 2. 획득한 스탬프 불러오기
      const res = await fetch(`/api/tour/my_stamps?t=${new Date().getTime()}`);
      const data = await res.json();

      if (data.success) {
        const dbStamps = data.stamps
          .filter((s) => s.status === "PHOTO_SUBMITTED")
          .map((s) => {
            if (s.dima_id === 1) return "G";
            if (s.dima_id === 2) return "I";
            if (s.dima_id === 3) return "F";
            if (s.dima_id === 4) return "T";
          });
        state.stamps = dbStamps;
        
        if (data.isSurveyDone) {
          state.isSurveyDone = true; 
        }

      }
    } catch (err) {
      console.error("앱 초기화 오류", err);
    } finally {
      render();
    }
  }

// 큐에 있는 데이터를 서버로 밀어넣고 UI를 업데이트하는 전용 함수
async function flushOfflineQueue() {
  const queueData = localStorage.getItem("dima_offline_queue");
  if (!queueData) return; // 큐가 비어있으면 종료

  try {
    const res = await fetch("/api/tour/submit_survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: queueData,
    });
    const data = await res.json();
    
    if (data.success || data.already_submitted) {
      localStorage.removeItem("dima_offline_queue"); // 큐 비우기
      
      // 완료 화면에 떠 있는 상태 텍스트 강제 변경
      const syncStatusEl = document.querySelector("#sync-status");
      if (syncStatusEl) {
        syncStatusEl.innerHTML = "서버 전송 완료";
        syncStatusEl.style.color = "#22c55e";
      }
    }
  } catch(e) {
    console.warn("오프라인 큐 전송 실패. 통신망 복구 대기중...");
  }
}

// 1. 통신망 복구 이벤트 감지 시 트리거
window.addEventListener('online', flushOfflineQueue);

// 2. 폰 화면을 껐다 켜거나 다른 앱에서 돌아왔을 때 트리거 (가장 중요!)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    flushOfflineQueue();
  }
});

window.addEventListener('beforeunload', (event) => {
  // 완료하지 않았는데 로컬에 임시 데이터가 있다면 경고
  if (!state.isSurveyDone && localStorage.getItem(DRAFT_KEY)) {
    event.preventDefault();
    event.returnValue = '작성 중인 설문 내용이 있습니다. 정말 나가시겠습니까?';
  }
});

  initApp();
})();

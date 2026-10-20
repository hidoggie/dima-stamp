(() => {
  "use strict";

  // ═══════════════════════════════════════════════
  //  GIFT Festa 2026 — 학생용 UI 운영 종료 페이지
  //  - 모든 화면(스탬프투어·퀴즈·AR·설문·확인증)이 열리지 않습니다.
  //  - 서버 API를 호출하지 않으며, 저장된 데이터도 건드리지 않습니다.
  //  - 문의처를 표시하려면 아래 INQUIRY에 문구를 넣어 주세요. (빈 문자열이면 숨김)
  // ═══════════════════════════════════════════════
  const INQUIRY = ""; // 예: "학생처 02-0000-0000"

  // 주소 뒤의 #survey1, #quiz-G 등 화면 경로 제거 (어떤 경로로 들어와도 같은 화면)
  try {
    history.replaceState(null, "", location.pathname + location.search);
  } catch (e) {}

  const css = `
    :root {
      --cl-bg: #0b0a12;
      --cl-card: rgba(28, 27, 41, 0.72);
      --cl-line: rgba(255, 255, 255, 0.09);
      --cl-text: #f5f3ff;
      --cl-muted: #a9a4c2;
      --cl-accent: #B044FF;
      --cl-g: #E5007F;
      --cl-i: #E05BDA;
      --cl-f: #A58CF5;
      --cl-t: #F18E29;
    }
    html, body.festa-closed {
      margin: 0;
      min-height: 100%;
      background: var(--cl-bg);
      color: var(--cl-text);
      font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      word-break: keep-all;
      overflow-x: hidden;
    }
    .fc-wrap {
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(28px + env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom));
      box-sizing: border-box;
      overflow: hidden;
    }
    .fc-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(70px);
      opacity: 0.45;
      pointer-events: none;
      animation: fc-drift 14s ease-in-out infinite alternate;
    }
    .fc-blob.b1 { width: 320px; height: 320px; background: var(--cl-g); top: -110px; left: -120px; }
    .fc-blob.b2 { width: 280px; height: 280px; background: #381F87; bottom: -90px; right: -100px; animation-delay: -5s; }
    .fc-blob.b3 { width: 200px; height: 200px; background: var(--cl-t); bottom: 18%; left: -90px; opacity: 0.25; animation-delay: -9s; }
    @keyframes fc-drift {
      to { transform: translate(40px, 30px) scale(1.12); }
    }

    .fc-card {
      position: relative;
      width: 100%;
      max-width: 420px;
      padding: 36px 24px 28px;
      box-sizing: border-box;
      text-align: center;
      background: var(--cl-card);
      border: 1px solid var(--cl-line);
      border-radius: 28px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      animation: fc-rise 0.7s cubic-bezier(.2, .8, .2, 1) both;
    }
    @keyframes fc-rise {
      from { opacity: 0; transform: translateY(18px); }
    }

    .fc-chip {
      display: inline-block;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: var(--cl-accent);
      background: rgba(176, 68, 255, 0.12);
      border: 1px solid rgba(176, 68, 255, 0.35);
      border-radius: 999px;
    }

    .fc-letters {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 26px 0 22px;
    }
    .fc-letter {
      width: 58px;
      height: 58px;
      display: grid;
      place-items: center;
      font-size: 30px;
      font-weight: 900;
      color: #fff;
      border-radius: 18px;
      background: var(--c);
      box-shadow: 0 10px 28px color-mix(in srgb, var(--c) 45%, transparent);
      animation: fc-pop 0.55s cubic-bezier(.3, 1.6, .5, 1) both, fc-float 4s ease-in-out infinite;
      animation-delay: calc(var(--n) * 0.12s + 0.3s), calc(var(--n) * 0.4s + 1s);
    }
    .fc-letter.g { --c: var(--cl-g); --n: 0; }
    .fc-letter.i { --c: #890C84; --n: 1; }
    .fc-letter.f { --c: #381F87; --n: 2; }
    .fc-letter.t { --c: var(--cl-t); --n: 3; }
    @keyframes fc-pop {
      from { opacity: 0; transform: scale(0.4) rotate(-12deg); }
    }
    @keyframes fc-float {
      50% { transform: translateY(-5px); }
    }

    .fc-title {
      margin: 0;
      font-size: 26px;
      line-height: 1.35;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .fc-title span {
      background: linear-gradient(90deg, var(--cl-g), var(--cl-i), var(--cl-f), var(--cl-t));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .fc-lead {
      margin: 14px 0 0;
      font-size: 15px;
      line-height: 1.7;
      color: var(--cl-muted);
    }
    .fc-lead strong { color: var(--cl-text); }

    .fc-divider {
      height: 1px;
      margin: 26px 0 20px;
      background: linear-gradient(90deg, transparent, var(--cl-line), transparent);
    }

    .fc-notes {
      display: grid;
      gap: 10px;
      text-align: left;
    }
    .fc-note {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid var(--cl-line);
      border-radius: 16px;
    }
    .fc-note-icon {
      flex: none;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background: rgba(176, 68, 255, 0.14);
      color: var(--cl-accent);
    }
    .fc-note-icon svg {
      width: 18px; height: 18px;
      fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
    }
    .fc-note h2 {
      margin: 1px 0 3px;
      font-size: 14px;
      font-weight: 800;
    }
    .fc-note p {
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: var(--cl-muted);
    }

    .fc-thanks {
      margin: 24px 0 0;
      font-size: 14px;
      color: var(--cl-muted);
    }
    .fc-miracle {
      margin-top: 6px;
      font-size: 30px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: -0.01em;
      background: linear-gradient(90deg, #fff, #d9c2ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .fc-foot {
      margin: 18px 0 0;
      font-size: 12px;
      color: rgba(169, 164, 194, 0.7);
    }

    @media (max-width: 360px) {
      .fc-letter { width: 50px; height: 50px; font-size: 26px; border-radius: 15px; }
      .fc-title { font-size: 23px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fc-blob, .fc-card, .fc-letter { animation: none !important; }
    }
  `;

  const icons = {
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4ZM2 6h20v4H2ZM12 6v15"/><path d="M12 6H7.8C5.5 6 5 2.5 7.5 2.5 10 2.5 12 6 12 6Zm0 0h4.2c2.3 0 2.8-3.5.3-3.5C14 2.5 12 6 12 6Z"/></svg>',
    document: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  };

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  document.title = "GIFT Festa 2026 · 운영 종료";
  document.body.className = "festa-closed";
  document.body.style.overflow = "";
  document.body.innerHTML = `
    <main class="fc-wrap" aria-labelledby="fc-title">
      <div class="fc-blob b1" aria-hidden="true"></div>
      <div class="fc-blob b2" aria-hidden="true"></div>
      <div class="fc-blob b3" aria-hidden="true"></div>

      <section class="fc-card">
        <span class="fc-chip">THANK YOU</span>

        <div class="fc-letters" aria-label="G I F T">
          <span class="fc-letter g">G</span>
          <span class="fc-letter i">I</span>
          <span class="fc-letter f">F</span>
          <span class="fc-letter t">T</span>
        </div>

        <h1 class="fc-title" id="fc-title"><span>GIFT Festa 2026</span><br />모든 일정이 종료되었습니다</h1>
        <p class="fc-lead">스탬프투어와 만족도 조사가 모두 마감되었습니다.<br /><strong>함께해 주신 모든 분께 감사드립니다.</strong></p>

        <div class="fc-divider"></div>

        <div class="fc-notes">
          <article class="fc-note">
            <span class="fc-note-icon">${icons.gift}</span>
            <div>
              <h2>모바일 상품권 안내</h2>
              <p>당첨되신 분께는 설문에 입력하신 휴대전화번호로 발송됩니다.</p>
            </div>
          </article>
          <article class="fc-note">
            <span class="fc-note-icon">${icons.document}</span>
            <div>
              <h2>수업협조문 안내</h2>
              <p>스탬프투어를 완료한 학생은 소속 학과 사무실로 문의해 주세요.</p>
            </div>
          </article>
          ${INQUIRY ? `<article class="fc-note">
            <span class="fc-note-icon">${icons.phone}</span>
            <div>
              <h2>문의</h2>
              <p>${String(INQUIRY).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c])}</p>
            </div>
          </article>` : ""}
        </div>

        <p class="fc-thanks">한 해의 배움과 도전이 기적 같은 결실이 되는 순간,</p>
        <div class="fc-miracle">Miracle DIMA</div>
        <p class="fc-foot">© 2026 동아방송예술대학교 · GIFT Festa</p>
      </section>
    </main>`;

  // 뒤로가기 등으로 해시가 붙어도 화면은 그대로 유지
  window.addEventListener("popstate", () => {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  });
})();

import { QUESTIONS, ARCHETYPES, ARCHETYPE_GROUPS } from "./data.js";
import { initBgm, startBgm } from "./audio.js";

const $ = (sel) => document.querySelector(sel);

const state = {
  screen: "welcome",
  index: 0,
  answers: [],
};

function axisTag(axis) {
  const labels = {
    EI: "🔋 E vs I",
    SN: "🔎 S vs N",
    TF: "⚖️ T vs F",
    JP: "📅 J vs P",
  };
  return labels[axis] || axis;
}

function computeMbti(answers) {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  for (const letter of answers) {
    scores[letter]++;
  }
  return (
    (scores.E >= scores.I ? "E" : "I") +
    (scores.S >= scores.N ? "S" : "N") +
    (scores.T >= scores.F ? "T" : "F") +
    (scores.J >= scores.P ? "J" : "P")
  );
}

function dimensionBreakdown(answers) {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  for (const letter of answers) {
    scores[letter]++;
  }
  return [
    { label: "외향(E) / 내향(I)", left: scores.E, right: scores.I, leftKey: "E", rightKey: "I" },
    { label: "감각(S) / 직관(N)", left: scores.S, right: scores.N, leftKey: "S", rightKey: "N" },
    { label: "사고(T) / 감정(F)", left: scores.T, right: scores.F, leftKey: "T", rightKey: "F" },
    { label: "판단(J) / 인식(P)", left: scores.J, right: scores.P, leftKey: "J", rightKey: "P" },
  ];
}

function render() {
  const root = $("#app");
  root.innerHTML = "";

  if (state.screen === "welcome") {
    root.appendChild(renderWelcome());
  } else if (state.screen === "quiz") {
    root.appendChild(renderQuiz());
  } else if (state.screen === "result") {
    root.appendChild(renderResult());
  }
}

function renderWelcome() {
  const el = document.createElement("section");
  el.className = "screen welcome";
  el.innerHTML = `
    <div class="cover-hero">
      <img
        class="cover-image"
        src="cover.png"
        alt="당신의 공무원 유형은? 6가지 공무원상 MBTI 테스트"
        width="1080"
        height="1920"
        fetchpriority="high"
      />
      <button type="button" class="cover-start" id="btn-start" aria-label="테스트 시작하기">
        테스트 시작하기
      </button>
    </div>
    <p class="hint cover-hint">16문항 · 약 3~5분 · 우측 상단 🔊 배경음악</p>
  `;
  el.querySelector("#btn-start").addEventListener("click", () => {
    startBgm();
    state.screen = "quiz";
    state.index = 0;
    state.answers = [];
    render();
  });
  return el;
}

function renderQuiz() {
  const q = QUESTIONS[state.index];
  const total = QUESTIONS.length;
  const pct = Math.round((state.index / total) * 100);

  const el = document.createElement("section");
  el.className = "screen quiz";
  el.innerHTML = `
    <header class="quiz-header">
      <span class="axis-tag">${axisTag(q.axis)}</span>
      <span class="progress-text">Q${q.id} / ${total}</span>
    </header>
    <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" style="width: ${pct}%"></div>
    </div>
    <h2 class="question">${escapeHtml(q.text)}</h2>
    <div class="options" id="options"></div>
    ${
      state.index > 0
        ? '<button type="button" class="btn ghost" id="btn-back">이전 문항</button>'
        : ""
    }
  `;

  const optionsEl = el.querySelector("#options");
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.innerHTML = `<span class="option-label">${String.fromCharCode(65 + i)}</span><span class="option-text">${escapeHtml(opt.text)}</span>`;
    btn.addEventListener("click", () => selectAnswer(opt.letter));
    optionsEl.appendChild(btn);
  });

  const backBtn = el.querySelector("#btn-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      state.index--;
      state.answers.pop();
      render();
    });
  }

  return el;
}

function selectAnswer(letter) {
  state.answers.push(letter);
  if (state.index < QUESTIONS.length - 1) {
    state.index++;
    render();
  } else {
    state.screen = "result";
    render();
  }
}

function renderResult() {
  const mbti = computeMbti(state.answers);
  const archetype = ARCHETYPES[mbti];
  const breakdown = dimensionBreakdown(state.answers);
  const group = ARCHETYPE_GROUPS.find((g) => g.types.includes(mbti));

  const el = document.createElement("section");
  el.className = "screen result";

  const barsHtml = breakdown
    .map(
      (d) => `
    <div class="dim-row">
      <span class="dim-label">${d.label}</span>
      <div class="dim-bar">
        <span class="dim-left ${d.left >= d.right ? "win" : ""}">${d.leftKey} ${d.left}</span>
        <div class="dim-track">
          <div class="dim-fill left" style="width: ${(d.left / 4) * 100}%"></div>
          <div class="dim-fill right" style="width: ${(d.right / 4) * 100}%"></div>
        </div>
        <span class="dim-right ${d.right > d.left ? "win" : ""}">${d.rightKey} ${d.right}</span>
      </div>
    </div>`
    )
    .join("");

  el.innerHTML = `
    <p class="badge">테스트 완료</p>
    <p class="mbti-code">${mbti}</p>
    <h1 class="result-title">${archetype.emoji} ${archetype.title}</h1>
    <p class="result-reason">${escapeHtml(archetype.reason)}</p>

    <section class="card breakdown">
      <h3>지표별 점수 (문항 4개 기준)</h3>
      ${barsHtml}
    </section>

    <section class="card group-info">
      <h3>같은 공무원상 유형</h3>
      <p>당신과 같은 <strong>${group.title}</strong>에 속하는 MBTI:</p>
      <p class="type-chips">${group.types.map((t) => `<span class="chip ${t === mbti ? "active" : ""}">${t}</span>`).join("")}</p>
    </section>

    <section class="card all-types">
      <h3>6가지 공무원상 한눈에</h3>
      <ul class="type-list">
        ${ARCHETYPE_GROUPS.map(
          (g) => `
          <li class="${g.types.includes(mbti) ? "highlight" : ""}">
            <span>${g.emoji} ${g.title}</span>
            <span class="types">${g.types.join(", ")}</span>
          </li>`
        ).join("")}
      </ul>
    </section>

    <div class="actions">
      <button type="button" class="btn primary" id="btn-retry">다시 하기</button>
      <button type="button" class="btn secondary" id="btn-share">결과 공유</button>
    </div>
  `;

  el.querySelector("#btn-retry").addEventListener("click", () => {
    state.screen = "welcome";
    state.index = 0;
    state.answers = [];
    render();
  });

  el.querySelector("#btn-share").addEventListener("click", async () => {
    const text = `나의 공무원상: ${archetype.emoji} ${archetype.title} (${mbti})\n${archetype.reason}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "공무원상 테스트", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("결과가 클립보드에 복사되었습니다.");
      }
    } catch {
      /* user cancelled */
    }
  });

  return el;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

initBgm();
render();

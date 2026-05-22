/**
 * 폭염 타파! 안전한 퇴근길
 * Safe Home in Heatwave - Heat safety management simulation
 */

const GAME = {
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
  tickMs: 400,
  minutesPerTick: 2,

  stages: [
    {
      temp: 33,
      name: '폭염주의보',
      class: 'stage-1',
      startMin: 0,
      title: '체감온도 33°C 이상 · 폭염주의보',
      guideline: '옥외작업을 단축하거나 시간대를 바꾸세요.',
      action: '작업 시간 조정(단축·시간대 변경)을 결정하고, 물·휴식·냉방조끼를 수시로 실시하세요.',
      banner: '체감온도 33°C — 옥외작업 단축 또는 시간대 변경이 필요합니다.',
    },
    {
      temp: 35,
      name: '폭염경보',
      class: 'stage-2',
      startMin: 300,
      title: '체감온도 35°C 이상 · 폭염경보',
      guideline: '무더위 시간대, 불가피한 경우 빼고 옥외작업은 중지입니다!',
      action: '14:00~17:00 [옥외작업 중지] 버튼을 반드시 실행하세요.',
      banner: '체감온도 35°C — 무더위 시간대 옥외작업 중지!',
    },
    {
      temp: 38,
      name: '폭염중대경보',
      class: 'stage-3',
      startMin: 390,
      title: '체감온도 38°C 이상 · 폭염중대경보',
      guideline: '긴급조치 작업을 제외한 모든 옥외작업을 즉시 중지.',
      action: '즉시 [전면 중지] 후 모든 작업자를 시원한 그늘로 대피하세요!',
      banner: '체감온도 38°C — 긴급조치 외 전면 중지·대피!',
    },
  ],

  hotPeriodStart: 14 * 60,
  hotPeriodEnd: 17 * 60,
  restIntervalMinutes: 120,
  restDurationMinutes: 20,

  cooldowns: {
    water: 15,
    ac: 30,
    rest: 0,
    ppe: 45,
  },
};

const ASSETS = {
  character: 'assets/character-main.png',
  characterFail: 'assets/character-fail.png',
  characterSuccess: 'assets/character-success.png',
  iconWater: 'assets/icon-water.png',
  iconAc: 'assets/icon-ac.png',
  iconRest: 'assets/icon-rest.png',
  iconThermo: 'assets/icon-thermometer.png',
  iconCoolingVest: 'assets/icon-cooling-vest.png',
};

const WORKER_NAMES = ['김철수', '이영희', '박민수', '최지현', '정대호', '한소영', '윤태준', '강미래'];

let state = {};
let tickInterval = null;
let spamInterval = null;

function initState() {
  state = {
    running: false,
    paused: false,
    minutes: GAME.startMinutes,
    danger: 5,
    progress: 0,
    stage: 0,
    outdoorStopped: false,
    fullStopped: false,
    workShortened: false,
    resting: false,
    restEndMinute: 0,
    lastRestAt: GAME.startMinutes,
    restWarning: false,
    acActive: false,
    acEndMinute: 0,
    ppeActive: false,
    ppeEndMinute: 0,
    cooldowns: { water: 0, ac: 0, rest: 0, ppe: 0 },
    workers: WORKER_NAMES.map((name, i) => ({
      id: i,
      name,
      stamina: 100,
      thirst: 0,
      status: 'normal',
    })),
    collapseTriggered: false,
    outdoorOrderAck: false,
    workAdjustShown: false,
    workRescheduled: false,
    stagePopupShown: [false, false, false],
    lastStageIdx: -1,
    gameOver: false,
    gameWon: false,
  };
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getCurrentStage() {
  const elapsed = state.minutes - GAME.startMinutes;
  if (elapsed >= GAME.stages[2].startMin) return 2;
  if (elapsed >= GAME.stages[1].startMin) return 1;
  return 0;
}

function getTemperature() {
  return GAME.stages[getCurrentStage()].temp;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function $(id) {
  return document.getElementById(id);
}

function updateUI() {
  const stageIdx = getCurrentStage();
  const stage = GAME.stages[stageIdx];
  const temp = stage.temp;

  $('game-time').textContent = formatTime(state.minutes);
  $('temp-value').textContent = `${temp}°C`;
  const badge = $('heat-level');
  badge.textContent = stage.name;
  badge.classList.toggle('critical', stageIdx >= 2);
  $('danger-value').textContent = `${Math.round(state.danger)}%`;
  $('danger-gauge').style.width = `${Math.min(100, state.danger)}%`;

  const thermo = $('thermo-icon');
  thermo.classList.remove('stage-1', 'stage-2', 'stage-3');
  thermo.classList.add(`stage-${stageIdx + 1}`);

  const overlay = $('stage-overlay');
  overlay.className = stage.class;

  $('site-area').classList.toggle('resting', state.resting);

  const mascot = $('site-mascot');
  if (mascot) {
    mascot.src = state.resting ? ASSETS.iconRest : ASSETS.character;
    mascot.style.opacity = state.resting ? '0.5' : '';
  }

  if (stageIdx >= 2) {
    document.body.classList.add('siren-active');
  } else {
    document.body.classList.remove('siren-active');
  }

  $('progress-fill').style.width = `${state.progress}%`;
  $('progress-text').textContent = `${Math.round(state.progress)}%`;

  updateTempScale(stageIdx);
  updateGuidelinePanel(stageIdx);
  renderWorkers();
  updateActionButtons();
  updateStageMessages(stageIdx);
}

function updateTempScale(stageIdx) {
  document.querySelectorAll('.temp-mark').forEach((mark) => {
    const s = parseInt(mark.dataset.stage, 10);
    mark.classList.toggle('reached', s <= stageIdx);
    mark.classList.toggle('active', s === stageIdx);
  });
}

function updateGuidelinePanel(stageIdx) {
  const stage = GAME.stages[stageIdx];
  const panel = $('heat-guideline');
  if (!panel) return;

  panel.className = `heat-guideline ${stage.class}`;
  $('guideline-title').textContent = stage.title;
  $('guideline-text').textContent = stage.guideline;
  $('guideline-action').textContent = `▶ ${stage.action}`;
}

function renderWorkers() {
  const grid = $('workers-grid');
  grid.innerHTML = '';
  state.workers.forEach((w) => {
    const card = document.createElement('div');
    card.className = 'worker-card';
    if (w.status === 'collapsed') card.classList.add('collapsed');
    else if (w.stamina < 30) card.classList.add('critical');
    else if (w.stamina < 50 || w.thirst > 60) card.classList.add('danger');
    else if (w.thirst > 40) card.classList.add('thirsty');

    const statusText =
      w.status === 'collapsed'
        ? '쓰러짐!'
        : w.thirst > 60
          ? '갈증'
          : w.stamina < 40
            ? '위험'
            : '양호';

    const avatarSrc = w.status === 'collapsed' ? ASSETS.characterFail : ASSETS.character;

    card.innerHTML = `
      <img src="${avatarSrc}" alt="" class="worker-avatar">
      <span class="worker-name">${w.name}</span>
      <span class="worker-status">${statusText}</span>
      <div class="worker-bar"><div class="worker-bar-fill" style="width:${w.stamina}%"></div></div>
    `;
    grid.appendChild(card);
  });
}

function updateActionButtons() {
  const stageIdx = getCurrentStage();
  const elapsed = state.minutes - GAME.startMinutes;
  const inHotPeriod =
    state.minutes >= GAME.hotPeriodStart && state.minutes < GAME.hotPeriodEnd;

  ['water', 'ac', 'rest', 'ppe'].forEach((key) => {
    const btn = $(`btn-${key === 'ac' ? 'ac' : key}`);
    const cd = state.cooldowns[key];
    if (cd > 0) {
      btn.disabled = true;
      btn.classList.add('on-cooldown');
      btn.querySelector('.cd').dataset.cd = `${cd}분`;
    } else {
      btn.disabled = state.resting && key !== 'rest';
      btn.classList.remove('on-cooldown');
      btn.querySelector('.cd').dataset.cd = '';
    }
  });

  const restBtn = $('btn-rest');
  const needRest = elapsed - (state.lastRestAt - GAME.startMinutes) >= GAME.restIntervalMinutes;
  if (stageIdx === 0 && needRest && !state.resting) {
    restBtn.classList.add('highlight');
    if (!state.restWarning) {
      showAlert('⚠️ 2시간 경과! [강제 휴식]을 실시하지 않으면 위험도가 급상승합니다!');
      state.restWarning = true;
    }
  } else {
    restBtn.classList.remove('highlight');
  }

  const stopOutdoor = $('btn-stop-outdoor');
  if (stageIdx >= 1) {
    stopOutdoor.classList.remove('hidden');
    if (inHotPeriod && !state.outdoorStopped) {
      stopOutdoor.classList.add('highlight');
    } else {
      stopOutdoor.classList.remove('highlight');
    }
  } else {
    stopOutdoor.classList.add('hidden');
  }

  const fullStop = $('btn-full-stop');
  if (stageIdx >= 2) {
    fullStop.classList.remove('hidden');
    if (!state.fullStopped) fullStop.classList.add('highlight');
  } else {
    fullStop.classList.add('hidden');
  }
}

function updateStageMessages(stageIdx) {
  const msg = $('stage-msg');
  const banner = $('alert-banner');
  const stage = GAME.stages[stageIdx];

  if (state.resting) {
    msg.textContent = `휴식 중... (${formatTime(state.restEndMinute)}까지)`;
    return;
  }

  msg.textContent = stage.guideline;

  if (stageIdx === 0) {
    if (!state.workShortened && !state.workRescheduled) {
      banner.textContent = stage.banner;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } else if (stageIdx === 1) {
    const inHot =
      state.minutes >= GAME.hotPeriodStart && state.minutes < GAME.hotPeriodEnd;
    if (inHot && !state.outdoorStopped) {
      banner.textContent = stage.banner;
      banner.classList.remove('hidden');
    } else if (!state.outdoorStopped) {
      banner.textContent = `${stage.banner} (14:00~17:00 필수)`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } else {
    banner.textContent = stage.banner;
    banner.classList.remove('hidden');
    if (!state.fullStopped) {
      banner.textContent += ' [전면 중지]를 누르세요!';
    }
  }
}

function checkStageTransition() {
  const stageIdx = getCurrentStage();
  if (stageIdx === state.lastStageIdx) return;

  state.lastStageIdx = stageIdx;
  showStagePopup(stageIdx);
  showAlert(GAME.stages[stageIdx].banner);
}

function showStagePopup(stageIdx) {
  if (state.stagePopupShown[stageIdx]) return;
  state.stagePopupShown[stageIdx] = true;

  const ids = ['popup-stage-33', 'popup-stage-35', 'popup-stage-38'];
  const popup = $(ids[stageIdx]);
  if (popup) popup.classList.remove('hidden');
}

function showAlert(text) {
  const banner = $('alert-banner');
  banner.textContent = text;
  banner.classList.remove('hidden');
  setTimeout(() => {
    if (!state.running) return;
    updateStageMessages(getCurrentStage());
  }, 4000);
}

function setCooldown(key, minutes) {
  state.cooldowns[key] = minutes;
}

function tickCooldowns() {
  Object.keys(state.cooldowns).forEach((k) => {
    if (state.cooldowns[k] > 0) state.cooldowns[k] -= GAME.minutesPerTick;
  });
}

function applyWater() {
  if (state.cooldowns.water > 0) return;
  state.workers.forEach((w) => {
    w.thirst = Math.max(0, w.thirst - 35);
    w.stamina = Math.min(100, w.stamina + 8);
  });
  state.danger = Math.max(0, state.danger - 8);
  setCooldown('water', GAME.cooldowns.water);
  const btn = $('btn-water');
  btn.classList.add('water-effect');
  setTimeout(() => btn.classList.remove('water-effect'), 400);
  showAlert('작업자에게 물과 이온음료를 배급했습니다.');
}

function applyAC() {
  if (state.cooldowns.ac > 0) return;
  state.acActive = true;
  state.acEndMinute = state.minutes + 45;
  state.danger = Math.max(0, state.danger - 12);
  setCooldown('ac', GAME.cooldowns.ac);
  showAlert('이동식 에어컨과 산업용 선풍기를 가동했습니다.');
}

function applyRest() {
  if (state.resting) return;
  state.resting = true;
  state.restEndMinute = state.minutes + GAME.restDurationMinutes;
  state.lastRestAt = state.minutes;
  state.restWarning = false;
  state.danger = Math.max(0, state.danger - 25);
  state.workers.forEach((w) => {
    w.stamina = Math.min(100, w.stamina + 20);
    w.thirst = Math.max(0, w.thirst - 15);
  });
  $('btn-rest').classList.remove('highlight');
  showAlert('🛑 그늘막에서 20분 강제 휴식을 실시합니다.');
}

function applyPPE() {
  if (state.cooldowns.ppe > 0) return;
  state.ppeActive = true;
  state.ppeEndMinute = state.minutes + 90;
  state.danger = Math.max(0, state.danger - 6);
  state.workers.forEach((w) => {
    w.stamina = Math.min(100, w.stamina + 5);
  });
  setCooldown('ppe', GAME.cooldowns.ppe);
  showAlert('냉방조끼와 보냉 장구를 지급했습니다.');
}

function stopOutdoorWork() {
  state.outdoorStopped = true;
  state.danger = Math.max(0, state.danger - 15);
  $('btn-stop-outdoor').classList.remove('highlight');
  showAlert('⛔ 옥외작업을 중지했습니다. 실내·그늘 작업만 진행합니다.');
}

function fullStop() {
  state.fullStopped = true;
  state.outdoorStopped = true;
  state.danger = Math.max(0, state.danger - 30);
  state.workers.forEach((w) => {
    w.stamina = Math.min(100, w.stamina + 15);
  });
  $('btn-full-stop').classList.remove('highlight');
  showAlert('🚨 전면 중지! 모든 작업자를 시원한 그늘로 대피했습니다.');
}

function simulateWorkers() {
  const stageIdx = getCurrentStage();
  const inHotPeriod =
    state.minutes >= GAME.hotPeriodStart && state.minutes < GAME.hotPeriodEnd;

  let dangerRate = 0.4 + stageIdx * 0.35;
  if (state.acActive && state.minutes < state.acEndMinute) dangerRate *= 0.6;
  if (state.ppeActive && state.minutes < state.ppeEndMinute) dangerRate *= 0.75;
  if (state.resting) dangerRate = -2;
  if (state.fullStopped) dangerRate = -1.5;
  else if (state.outdoorStopped) dangerRate *= 0.5;

  if (!state.resting) {
    state.danger += dangerRate * (GAME.minutesPerTick / 10);
  } else {
    state.danger += dangerRate;
  }

  state.danger = Math.max(0, Math.min(100, state.danger));

  if (!state.resting && stageIdx < 2) {
    const progressRate = state.outdoorStopped ? 0.15 : 0.35;
    state.progress += progressRate * (GAME.minutesPerTick / 15);
  } else if (!state.resting && state.fullStopped) {
    state.progress += 0.05 * (GAME.minutesPerTick / 15);
  }

  state.workers.forEach((w) => {
    if (w.status === 'collapsed') return;

    let thirstRate = 1.2 + stageIdx * 0.5;
    let staminaRate = 0.8 + stageIdx * 0.6;

    if (state.resting) {
      w.stamina = Math.min(100, w.stamina + 2);
      return;
    }

    w.thirst += thirstRate;
    w.stamina -= staminaRate;

    if (state.danger > 50) w.stamina -= 0.5;
    if (w.thirst > 50) w.stamina -= 0.8;

    w.stamina = Math.max(0, Math.min(100, w.stamina));
    w.thirst = Math.max(0, Math.min(100, w.thirst));
  });

  if (state.resting && state.minutes >= state.restEndMinute) {
    state.resting = false;
    showAlert('✅ 휴식 종료. 작업을 재개합니다.');
  }

  if (state.acActive && state.minutes >= state.acEndMinute) state.acActive = false;
  if (state.ppeActive && state.minutes >= state.ppeEndMinute) state.ppeActive = false;
}

function checkFailures() {
  const stageIdx = getCurrentStage();
  const inHotPeriod =
    state.minutes >= GAME.hotPeriodStart && state.minutes < GAME.hotPeriodEnd;

  if (stageIdx === 0 && !state.workShortened && !state.workRescheduled && !state.resting) {
    const elapsed = state.minutes - GAME.startMinutes;
    if (elapsed > 90) state.danger += 1.5;
    if (elapsed > 150 && Math.random() < 0.05) {
      gameOver('33°C 이상에서 옥외작업 단축·시간대 변경 없이 작업을 강행했습니다.');
      return;
    }
  }

  if (stageIdx >= 1 && !state.outdoorStopped && !state.resting) {
    const rate = inHotPeriod ? 0.14 : 0.06;
    if (Math.random() < rate) {
      const victim = state.workers.find((w) => w.stamina < 40 && w.status !== 'collapsed')
        || state.workers[Math.floor(Math.random() * state.workers.length)];
      triggerCollapse(victim);
      return;
    }
  }

  if (stageIdx >= 2 && !state.fullStopped && !state.resting) {
    state.danger += 2;
    if (Math.random() < 0.15) {
      const victim = state.workers.reduce((a, b) => (a.stamina < b.stamina ? a : b));
      triggerCollapse(victim);
      return;
    }
  }

  if (state.danger >= 95) {
    const victim = state.workers.find((w) => w.status !== 'collapsed');
    if (victim) triggerCollapse(victim);
    return;
  }

  const elapsed = state.minutes - GAME.startMinutes;
  if (
    stageIdx === 0 &&
    elapsed >= GAME.restIntervalMinutes &&
    elapsed - (state.lastRestAt - GAME.startMinutes) > GAME.restIntervalMinutes + 30 &&
    !state.resting
  ) {
    state.danger += 5;
    if (state.danger > 80 && Math.random() < 0.06) {
      const victim = state.workers[Math.floor(Math.random() * state.workers.length)];
      triggerCollapse(victim);
    }
  }

  if (state.danger >= 100) {
    gameOver('온열질환 위험도가 한계에 도달했습니다.');
  }

  const allDown = state.workers.every((w) => w.stamina <= 0 || w.status === 'collapsed');
  if (allDown) gameOver('작업자 전원이 위험 상태입니다.');
}

function checkRandomCollapse() {
  if (state.collapseTriggered || state.danger < 55) return;
  if (Math.random() < 0.004 * (state.danger / 50)) {
    const candidates = state.workers.filter((w) => w.status !== 'collapsed' && w.stamina < 60);
    if (candidates.length) {
      const victim = candidates[Math.floor(Math.random() * candidates.length)];
      triggerCollapse(victim);
    }
  }
}

function triggerCollapse(worker) {
  if (state.collapseTriggered) return;
  state.collapseTriggered = true;
  worker.status = 'collapsed';
  worker.stamina = 10;
  state.running = false;
  clearInterval(tickInterval);
  startMinigame(worker);
}

function gameTick() {
  if (!state.running || state.paused) return;

  state.minutes += GAME.minutesPerTick;
  tickCooldowns();
  checkStageTransition();
  simulateWorkers();
  checkRandomCollapse();
  checkFailures();

  if (state.minutes >= GAME.endMinutes) {
    endGame(true);
    return;
  }

  updateUI();
}

function startGame() {
  initState();
  state.running = true;
  showScreen('game-screen');

  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(gameTick, GAME.tickMs);

  state.lastStageIdx = 0;
  state.stagePopupShown[0] = true;
  setTimeout(() => $('popup-stage-33').classList.remove('hidden'), 2500);

  updateUI();
}

function endGame(won) {
  state.running = false;
  clearInterval(tickInterval);
  state.gameWon = won;
  state.gameOver = !won;
  showScreen('end-screen');

  const content = $('end-content');
  const rules = $('rules-summary');
  const endImg = $('end-character-img');

  if (won) {
    endImg.src = ASSETS.characterSuccess;
    endImg.alt = '무사 퇴근 성공';
    endImg.classList.remove('hidden');
    content.className = 'good';
    content.innerHTML = `
      <h2>무사 퇴근 성공!</h2>
      <p>오후 6시, 현장 분위기가 시원하게 바뀌며 작업자들이 환호합니다.</p>
      <p><strong>"오늘도 안전하게 퇴근합시다!<br>당신은 최고의 안전 관리자입니다."</strong></p>
      <p>공정률 ${Math.round(state.progress)}% · 온열질환자 0명</p>
    `;
    rules.classList.add('hidden');
    document.body.classList.remove('siren-active');
  } else {
    endImg.src = ASSETS.characterFail;
    endImg.alt = '게임 오버';
    endImg.classList.remove('hidden');
    content.className = 'bad';
    content.innerHTML = `
      <h2>Game Over</h2>
      <p>작업자가 열사병으로 쓰러졌거나, 안전 수칙을 지키지 않아 사고가 발생했습니다.</p>
      <p><strong>"폭염 속 휴식은 권리가 아니라 의무입니다!<br>안전 수칙을 다시 확인하세요."</strong></p>
    `;
    rules.classList.remove('hidden');
  }
}

function gameOver(reason) {
  state.running = false;
  clearInterval(tickInterval);
  endGame(false);
  const content = $('end-content');
  content.innerHTML += `<p class="reason">${reason}</p>`;
}

/* ---- 미니게임 ---- */
let minigameState = {};

function startMinigame(worker) {
  showScreen('minigame-screen');
  minigameState = { worker, step: 1, spamCount: 0, spamNeeded: 5 };

  $('minigame-worker').textContent = `${worker.name} 작업자가 쓰러졌습니다!`;
  $('minigame-step-1').classList.remove('hidden');
  $('minigame-step-unconscious').classList.add('hidden');
  $('minigame-step-conscious').classList.add('hidden');
  $('minigame-result').classList.add('hidden');
  $('btn-shade').classList.remove('hidden');
  $('btn-water-patient').classList.add('hidden');
  $('symptom-question').classList.add('hidden');
}

function minigameSuccess() {
  const result = $('minigame-result');
  result.classList.remove('hidden', 'fail');
  result.classList.add('success');
  result.textContent = '✅ 골든타임 응급처치 성공! 작업자를 구했습니다.';
  workerRecover(minigameState.worker);
  state.collapseTriggered = false;
  state.danger = Math.max(20, state.danger - 30);

  setTimeout(() => {
    showScreen('game-screen');
    state.running = true;
    tickInterval = setInterval(gameTick, GAME.tickMs);
    updateUI();
  }, 2000);
}

function minigameFail(msg) {
  const result = $('minigame-result');
  result.classList.remove('hidden', 'success');
  result.classList.add('fail');
  result.textContent = `❌ ${msg}`;
  setTimeout(() => gameOver(msg), 2500);
}

function workerRecover(worker) {
  worker.status = 'normal';
  worker.stamina = 55;
  worker.thirst = 20;
}

function setupMinigame() {
  document.querySelectorAll('[data-conscious]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const conscious = btn.dataset.conscious === 'yes';
      $('minigame-step-1').classList.add('hidden');
      if (conscious) {
        $('minigame-step-conscious').classList.remove('hidden');
        minigameState.conscious = true;
      } else {
        $('minigame-step-unconscious').classList.remove('hidden');
        startSpamGame();
      }
    });
  });

  $('btn-119-spam').addEventListener('click', onSpamClick);

  $('btn-shade').addEventListener('click', () => {
    $('btn-shade').classList.add('hidden');
    $('btn-water-patient').classList.remove('hidden');
    $('conscious-instruction').textContent = '시원한 물을 섭취시키세요.';
  });

  $('btn-water-patient').addEventListener('click', () => {
    $('btn-water-patient').classList.add('hidden');
    $('symptom-question').classList.remove('hidden');
    $('conscious-instruction').textContent = '';
  });

  $('btn-call-119').addEventListener('click', () => minigameSuccess());

  $('btn-wait').addEventListener('click', () => {
    minigameFail('증상 악화! 즉시 119를 호출해야 합니다.');
  });
}

function startSpamGame() {
  minigameState.spamCount = 0;
  minigameState.spamTimeLeft = 1000;
  const timerEl = $('spam-timer');
  const progressEl = $('spam-fill');

  if (spamInterval) clearInterval(spamInterval);

  const start = Date.now();
  spamInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    minigameState.spamTimeLeft = 1000 - elapsed;
    timerEl.textContent = `${(minigameState.spamTimeLeft / 1000).toFixed(1)}초`;
    progressEl.style.width = `${(minigameState.spamCount / 5) * 100}%`;

    if (elapsed >= 1000) {
      clearInterval(spamInterval);
      if (minigameState.spamCount >= 5) minigameSuccess();
      else minigameFail('119 신고가 늦었습니다! 골든타임을 놓쳤습니다.');
    }
  }, 50);
}

function onSpamClick() {
  minigameState.spamCount++;
  $('spam-fill').style.width = `${(minigameState.spamCount / 5) * 100}%`;
  if (minigameState.spamCount >= 5 && minigameState.spamTimeLeft > 0) {
    clearInterval(spamInterval);
    minigameSuccess();
  }
}

/* Wrong actions in unconscious path - add trap buttons via wrong clicks on other elements */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-start').addEventListener('click', startGame);
  $('btn-retry').addEventListener('click', () => {
    ['popup-stage-33', 'popup-stage-35', 'popup-stage-38'].forEach((id) => {
      $(id).classList.add('hidden');
    });
    $('end-character-img').classList.add('hidden');
    document.body.classList.remove('siren-active');
    showScreen('start-screen');
  });

  $('btn-water').addEventListener('click', applyWater);
  $('btn-ac').addEventListener('click', applyAC);
  $('btn-rest').addEventListener('click', applyRest);
  $('btn-ppe').addEventListener('click', applyPPE);
  $('btn-stop-outdoor').addEventListener('click', stopOutdoorWork);
  $('btn-full-stop').addEventListener('click', fullStop);

  $('popup-ack-35').addEventListener('click', () => {
    $('popup-stage-35').classList.add('hidden');
  });

  $('popup-ack-38').addEventListener('click', () => {
    $('popup-stage-38').classList.add('hidden');
  });

  document.querySelectorAll('#popup-stage-33 [data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('popup-stage-33').classList.add('hidden');
      const choice = btn.dataset.choice;
      if (choice === 'shorten') {
        state.workShortened = true;
        state.danger = Math.max(0, state.danger - 12);
        state.outdoorStopped = true;
        showAlert('옥외 작업 시간을 단축했습니다. (33°C 행동요령 준수)');
      } else if (choice === 'reschedule') {
        state.workRescheduled = true;
        state.danger = Math.max(0, state.danger - 10);
        showAlert('작업 시간대를 변경했습니다. (33°C 행동요령 준수)');
      } else {
        state.danger += 18;
        showAlert('옥외 작업을 유지합니다. 위험도가 크게 상승합니다!');
      }
    });
  });

  setupMinigame();
});

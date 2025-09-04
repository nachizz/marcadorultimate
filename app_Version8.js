// --- UTILIDADES ---
function pad(n) { return n < 10 ? '0' + n : n; }
function formatTime(secs) { return pad(Math.floor(secs/60)) + ':' + pad(secs%60); }

// --- ESTADO GLOBAL PARTIDO ---
let config = {};
let partido = {
  started: false,
  timeLeft: 0,
  timerInterval: null,
  halfReached: false,
  team1Points: 0,
  team2Points: 0,
  team1TimeoutLeft: 1,
  team2TimeoutLeft: 1,
  timeoutActive: false,
  timeoutTeam: '',
  timeoutTimer: 0,
  pointHistory: [],
  renderRuleSeq: [],
  capActive: false,
  capScoreToWin: null,
  finished: false,
  bestStreak: null,
  lastTimeoutHalf: { team1: -1, team2: -1 }
};

// --- ELEMENTOS ---
const setupScreen = document.getElementById('setup-screen');
const scoreScreen = document.getElementById('score-screen');
const setupForm = document.getElementById('setup-form');

const scoreTeam1 = document.getElementById('score-team1');
const scoreTeam2 = document.getElementById('score-team2');
const team1PointsEl = document.getElementById('team1-points');
const team2PointsEl = document.getElementById('team2-points');
const team1PlusBtn = document.getElementById('team1-plus');
const team1MinusBtn = document.getElementById('team1-minus');
const team2PlusBtn = document.getElementById('team2-plus');
const team2MinusBtn = document.getElementById('team2-minus');
const team1TimeoutBtn = document.getElementById('team1-timeout');
const team2TimeoutBtn = document.getElementById('team2-timeout');
const gameTimerEl = document.getElementById('game-timer');
const scoreToWinEl = document.getElementById('score-to-win');
const halfDescEl = document.getElementById('half-desc');
const capDescEl = document.getElementById('cap-desc');
const genderRuleEl = document.getElementById('gender-rule');
const renderRuleEl = document.getElementById('render-rule');
const timeoutIndicator = document.getElementById('timeout-indicator');
const timeoutTeamEl = document.getElementById('timeout-team');
const timeoutTimerEl = document.getElementById('timeout-timer');
const startMatchBtn = document.getElementById('start-match-btn');
const matchOverEl = document.getElementById('match-over');
const finalResultEl = document.getElementById('final-result');
const bestStreakEl = document.getElementById('best-streak');
const resetBtn = document.getElementById('reset-btn');
const popup = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const shareBtn = document.getElementById('share-btn');

// Controladores de popups
let halfPopupShown = false;
let endPopupShown = false;

// --- CONFIGURACIÓN PARTIDO ---
setupForm.addEventListener('submit', function(e) {
  e.preventDefault();
  halfPopupShown = false;
  endPopupShown = false;
  config.team1 = document.getElementById('team1').value.trim();
  config.team2 = document.getElementById('team2').value.trim();
  config.gameTime = parseInt(document.getElementById('gameTime').value) * 60;
  config.winPoints = parseInt(document.getElementById('winPoints').value);
  config.halfTime = parseInt(document.getElementById('halfTime').value) || null;
  config.halfPoints = parseInt(document.getElementById('halfPoints').value) || null;
  config.genderRule = document.querySelector('input[name="genderRule"]:checked')?.value;
  config.capRule = document.querySelector('input[name="capRule"]:checked')?.value;

  partido = {
    started: false,
    timeLeft: config.gameTime,
    timerInterval: null,
    halfReached: false,
    team1Points: 0,
    team2Points: 0,
    team1TimeoutLeft: 1,
    team2TimeoutLeft: 1,
    timeoutActive: false,
    timeoutTeam: '',
    timeoutTimer: 0,
    pointHistory: [],
    renderRuleSeq: [],
    capActive: false,
    capScoreToWin: null,
    finished: false,
    bestStreak: null,
    lastTimeoutHalf: { team1: -1, team2: -1 }
  };

  setupScreen.style.display = 'none';
  scoreScreen.style.display = '';
  mostrarMarcador();
});

function mostrarMarcador() {
  scoreTeam1.textContent = config.team1;
  scoreTeam2.textContent = config.team2;
  team1PointsEl.textContent = partido.team1Points;
  team2PointsEl.textContent = partido.team2Points;
  gameTimerEl.textContent = formatTime(partido.timeLeft);
  scoreToWinEl.textContent = config.winPoints;
  halfDescEl.textContent = (config.halfTime ? `${config.halfTime} min` : '-') + ' / ' + (config.halfPoints ? `${config.halfPoints} puntos` : '-');
  capDescEl.textContent = (config.capRule==='si' ? 'Sí' : config.capRule==='no' ? 'No' : 'En caso de empate');
  genderRuleEl.textContent = config.genderRule || '-';
  renderRuleEl.textContent = calcRenderRule();
  matchOverEl.style.display = 'none';
  startMatchBtn.style.display = '';
  team1PlusBtn.disabled = true;
  team1MinusBtn.disabled = true;
  team2PlusBtn.disabled = true;
  team2MinusBtn.disabled = true;
  team1TimeoutBtn.disabled = true;
  team2TimeoutBtn.disabled = true;
  timeoutIndicator.style.display = 'none';
}

// --- MARCADOR: EMPEZAR PARTIDO ---
startMatchBtn.addEventListener('click', function() {
  partido.started = true;
  team1PlusBtn.disabled = false;
  team2PlusBtn.disabled = false;
  team1MinusBtn.disabled = false;
  team2MinusBtn.disabled = false;
  team1TimeoutBtn.disabled = false;
  team2TimeoutBtn.disabled = false;
  startMatchBtn.style.display = 'none';
  iniciarTimer();
  actualizarTimeoutBtns();
});

function iniciarTimer() {
  gameTimerEl.textContent = formatTime(partido.timeLeft);
  partido.timerInterval = setInterval(() => {
    if (partido.timeoutActive) {
      partido.timeoutTimer--;
      timeoutTimerEl.textContent = formatTime(partido.timeoutTimer);
      if (partido.timeoutTimer <= 0) {
        partido.timeoutActive = false;
        timeoutIndicator.style.display = 'none';
        actualizarTimeoutBtns();
      }
    } else if (!partido.finished) {
      partido.timeLeft--;
      gameTimerEl.textContent = formatTime(partido.timeLeft);

      // Half time (por tiempo o puntos)
      if (!partido.halfReached) {
        let halfCondition = false;
        if (config.halfTime && partido.timeLeft === config.gameTime-config.halfTime*60) halfCondition = true;
        if (config.halfPoints && (partido.team1Points >= config.halfPoints || partido.team2Points >= config.halfPoints)) halfCondition = true;

        if (halfCondition) {
          partido.halfReached = true;
          partido.team1TimeoutLeft = 1;
          partido.team2TimeoutLeft = 1;
          partido.lastTimeoutHalf = { team1: partido.team1Points, team2: partido.team2Points };
          actualizarTimeoutBtns();

          if (!halfPopupShown) {
            showHalfPopup();
            halfPopupShown = true;
          }
        }
      }

      // Cap
      verificarCap();

      // Fin partido por tiempo
      if (partido.timeLeft <= 0) {
        if (partido.capActive) {
          if (!partido.capScoreToWin) {
            let maxScore = Math.max(partido.team1Points, partido.team2Points);
            partido.capScoreToWin = maxScore + 1;
            capDescEl.textContent += ` (Cap activo: gana quien llegue a ${partido.capScoreToWin} puntos)`;
            scoreToWinEl.textContent = partido.capScoreToWin;
          }
        } else {
          if (!endPopupShown) {
            finalizarPartido();
            endPopupShown = true;
          }
        }
      }
      // Fin partido por puntos
      if (partido.capActive && partido.capScoreToWin) {
        if (partido.team1Points >= partido.capScoreToWin || partido.team2Points >= partido.capScoreToWin) {
          if (!endPopupShown) {
            finalizarPartido();
            endPopupShown = true;
          }
        }
      } else if (!partido.capActive) {
        if (partido.team1Points >= config.winPoints || partido.team2Points >= config.winPoints) {
          if (!endPopupShown) {
            finalizarPartido();
            endPopupShown = true;
          }
        }
      }
    }
  }, 1000);
}

// --- CAP LOGIC ---
function verificarCap() {
  if (config.capRule === 'si' && partido.timeLeft <= 0 && !partido.capActive) {
    partido.capActive = true;
  }
  if (config.capRule === 'empate' && partido.timeLeft <= 0 && !partido.capActive) {
    if (partido.team1Points === partido.team2Points) {
      partido.capActive = true;
    }
  }
}

// --- SUMAR/RESTAR PUNTOS ---
team1PlusBtn.addEventListener('click', () => sumarPunto('team1'));
team2PlusBtn.addEventListener('click', () => sumarPunto('team2'));
team1MinusBtn.addEventListener('click', () => restarPunto('team1'));
team2MinusBtn.addEventListener('click', () => restarPunto('team2'));

// Popup género siguiente punto
function showNextGenderPopup() {
  let seq = ['A','B','B','A'];
  let idx = partido.pointHistory.length % 4;
  let curr = seq[idx];
  let turn = curr==='A' ? config.genderRule : (config.genderRule==='chicos'? 'chicas':'chicos');
  let nextTeam = curr==='A' ? config.team1 : config.team2;
  popupContent.innerHTML = `
    <span>¡Siguiente punto!</span><br>
    <span style="font-size:1.4em">Toca <span class="gender-${turn}">${turn}</span> (<span class="${curr==='A'?'team-green':'team-red'}">${nextTeam}</span>)</span><br>
    <button class="popup-btn" onclick="closePopup()">OK</button>
  `;
  popup.style.display = 'flex';
}

window.closePopup = function() {
  popup.style.display = 'none';
}

// --- HALF POPUP ---
function showHalfPopup() {
  popupContent.innerHTML = `
    <span style="font-size:1.6em; color:#fff01c;">¡Medio tiempo!</span><br>
    <button class="popup-btn" onclick="closePopup()">OK</button>
  `;
  popup.style.display = 'flex';
}

// --- FINAL PARTIDO Y POPUP DE RESULTADO ---
function finalizarPartido() {
  partido.finished = true;
  clearInterval(partido.timerInterval);
  team1PlusBtn.disabled = true;
  team1MinusBtn.disabled = true;
  team2PlusBtn.disabled = true;
  team2MinusBtn.disabled = true;
  team1TimeoutBtn.disabled = true;
  team2TimeoutBtn.disabled = true;
  timeoutIndicator.style.display = 'none';
  popup.style.display = 'none';
  showEndPopup();
}

function showEndPopup() {
  let resultText = "";
  if (partido.team1Points > partido.team2Points) {
    resultText = `<b style="color:#0fff50">${config.team1}</b> gana`;
  } else if (partido.team2Points > partido.team1Points) {
    resultText = `<b style="color:#ff0757">${config.team2}</b> gana`;
  } else {
    resultText = `¡Empate!`;
  }
  popupContent.innerHTML = `
    <span style="font-size:1.4em; color:#0fff50;">Marcador final</span><br>
    <span class="team-green" style="font-size:1.8em;">${config.team1}: ${partido.team1Points}</span><br>
    <span class="team-red" style="font-size:1.8em;">${config.team2}: ${partido.team2Points}</span><br>
    <span style="font-size:1.2em; margin-top:8px; display:block;">${resultText}</span>
    <button class="popup-btn" onclick="closeEndPopup()">OK</button>
  `;
  popup.style.display = 'flex';
}

window.closeEndPopup = function() {
  popup.style.display = 'none';
  matchOverEl.style.display = '';
  mostrarResultadoFinal();
}

function sumarPunto(team) {
  if (partido.finished) return;
  if (team === 'team1') partido.team1Points++;
  else partido.team2Points++;
  partido.pointHistory.push(team);
  team1PointsEl.textContent = partido.team1Points;
  team2PointsEl.textContent = partido.team2Points;
  renderRuleEl.textContent = calcRenderRule();
  showNextGenderPopup();
  verificarCap();
  if (partido.capActive && partido.capScoreToWin) {
    if (partido.team1Points >= partido.capScoreToWin || partido.team2Points >= partido.capScoreToWin) {
      if (!endPopupShown) {
        finalizarPartido();
        endPopupShown = true;
      }
    }
  } else if (!partido.capActive) {
    if (partido.team1Points >= config.winPoints || partido.team2Points >= config.winPoints) {
      if (!endPopupShown) {
        finalizarPartido();
        endPopupShown = true;
      }
    }
  }
}
function restarPunto(team) {
  if (partido.finished) return;
  if (team === 'team1' && partido.team1Points > 0) partido.team1Points--;
  else if (team === 'team2' && partido.team2Points > 0) partido.team2Points--;
  partido.pointHistory.pop();
  team1PointsEl.textContent = partido.team1Points;
  team2PointsEl.textContent = partido.team2Points;
  renderRuleEl.textContent = calcRenderRule();
}

// --- TIME OUT ---
team1TimeoutBtn.addEventListener('click', () => startTimeout('team1'));
team2TimeoutBtn.addEventListener('click', () => startTimeout('team2'));

function startTimeout(team) {
  if (partido.timeoutActive || partido.finished) return;
  if ((team === 'team1' && partido.team1TimeoutLeft <= 0) ||
      (team === 'team2' && partido.team2TimeoutLeft <= 0)) return;
  partido.timeoutActive = true;
  partido.timeoutTeam = team;
  partido.timeoutTimer = 90;
  timeoutIndicator.style.display = '';
  timeoutTeamEl.textContent = `Time Out: ${team === 'team1' ? config.team1 : config.team2}`;
  timeoutTimerEl.textContent = formatTime(partido.timeoutTimer);
  if (team === 'team1') partido.team1TimeoutLeft--;
  else partido.team2TimeoutLeft--;
  actualizarTimeoutBtns();
}

function actualizarTimeoutBtns() {
  team1TimeoutBtn.disabled = partido.timeoutActive || partido.team1TimeoutLeft <= 0 || partido.finished;
  team2TimeoutBtn.disabled = partido.timeoutActive || partido.team2TimeoutLeft <= 0 || partido.finished;
}

// --- RENDER RULE ABBA ---
function calcRenderRule() {
  const seq = ['A','B','B','A'];
  let idx = partido.pointHistory.length % 4;
  let curr = seq[idx];
  let turn = curr==='A' ? config.genderRule : (config.genderRule==='chicos'? 'chicas':'chicos');
  let equipo = curr==='A' ? config.team1 : config.team2;
  return `${curr} (${equipo}) - Gender: ${turn}`;
}

function mostrarResultadoFinal() {
  finalResultEl.innerHTML = `
    <b>${config.team1}</b>: <span class="team-green">${partido.team1Points}</span><br>
    <b>${config.team2}</b>: <span class="team-red">${partido.team2Points}</span>
    <br><br>Duración: ${formatTime(config.gameTime - partido.timeLeft)}<br>
    ${partido.capActive?'Cap aplicado':''}
  `;
  const streak = calcularMejorRacha();
  let streakTxt = '';
  if (streak) {
    streakTxt = `
      <b>Mejor racha:</b><br>
      <span class="team-green">${config.team1}</span>: ${streak.team1.best} puntos seguidos (${streak.team1.range})<br>
      <span class="team-red">${config.team2}</span>: ${streak.team2.best} puntos seguidos (${streak.team2.range})
    `;
  }
  bestStreakEl.innerHTML = streakTxt;
}

function calcularMejorRacha() {
  let h = partido.pointHistory;
  let best1 = 0, curr1 = 0, best1Start = 0, best1End = 0, curr1Start = 0;
  let best2 = 0, curr2 = 0, best2Start = 0, best2End = 0, curr2Start = 0;
  for (let i=0; i<h.length; i++) {
    if (h[i]==='team1') {
      curr1 = curr1 ? curr1+1 : 1;
      if (curr1===1) curr1Start = i;
      curr2 = 0;
      if (curr1 > best1) { best1 = curr1; best1Start = curr1Start; best1End = i; }
    } else {
      curr2 = curr2 ? curr2+1 : 1;
      if (curr2===1) curr2Start = i;
      curr1 = 0;
      if (curr2 > best2) { best2 = curr2; best2Start = curr2Start; best2End = i; }
    }
  }
  function streakRange(start, end, team) {
    let p1=0, p2=0;
    for (let i=0;i<=start;i++) { if(h[i]==='team1')p1++;else p2++; }
    let ini = `${p1}-${p2}`;
    for (let i=start+1;i<=end;i++) { if(h[i]==='team1')p1++;else p2++; }
    let fin = `${p1}-${p2}`;
    return `de ${ini} a ${fin}`;
  }
  return {
    team1: {
      best: best1,
      range: best1>0 ? streakRange(best1Start, best1End, 'team1') : '-'
    },
    team2: {
      best: best2,
      range: best2>0 ? streakRange(best2Start, best2End, 'team2') : '-'
    }
  };
}

// --- NUEVO PARTIDO ---
resetBtn.addEventListener('click', function() {
  halfPopupShown = false;
  endPopupShown = false;
  setupScreen.style.display = '';
  scoreScreen.style.display = 'none';
  setupForm.reset();
});

// Compartir por WhatsApp
shareBtn.addEventListener('click', function() {
  let streak = calcularMejorRacha();
  let msg = `Ultimate Frisbee\nMarcador final:\n${config.team1}: ${partido.team1Points}\n${config.team2}: ${partido.team2Points}\nMejor racha: ${config.team1}: ${streak.team1.best} (${streak.team1.range}), ${config.team2}: ${streak.team2.best} (${streak.team2.range})`;
  let url = "https://wa.me/?text=" + encodeURIComponent(msg);
  window.open(url, '_blank');
});
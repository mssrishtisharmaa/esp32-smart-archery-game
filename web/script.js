
  /* ============================================================
    ARCHERY GAME — Level System
    - Level 1: single moving target, arrow + spacebar (existing)
    - Level 2: two moving targets, ESP32 IR sensors (small=10, big=5)
    - Unlock Level 2 only if Level 1 score >= 40
    - Leaderboard ranked by finalScore = level1Score + level2Score
    ============================================================ */
    
  // ---------- STATE ----------

    // ---------- CONFIG ----------
    const TOTAL_ROUNDS = 5;
    const UNLOCK_THRESHOLD = 40;
    const HIT_TOLERANCE = 35; // L1 px tolerance for arrow hit
    // const POINTS_L2 = { small: 10, big: 5 };
  const POINTS_L2 = { small: 5, big: 10 };

    // ---------- STATE ----------
    const state = {
      playerName: '',
      level: 1,           // 1 or 2
      round: 0,
      score: 0,           // current level score
      level1Score: 0,
      level2Score: 0,
      isGameOver: false,
      playing: false,
      canHit: false,      // debounce: one hit per round
    };

    // L1 arrow oscillation
    let arrowX = 50, arrowDir = 1;
    let animId = null;

    // L2 targets
    const t2 = {
      // Stationary in Level 2 (speed 0). Red = small target (worth 10 — matches Level 1 size).
      // Blue = big-points-name but visually small (worth 5).
      small: { x: 0, dir: 1, speed: 0, el: null, w: 70 },
      big:   { x: 0, dir: 1, speed: 0, el: null, w: 50 },
    };

    const socket = new WebSocket("ws://10.194.77.249:81");

socket.onopen = () => {
  console.log("Connected to ESP32");
};


socket.onmessage = (event) => {
  console.log("Received:", event.data);

  if (event.data === "hit") {
    if (state.level === 1) shootL1();
    if (state.level === 2) shootL2();
  }
};

socket.onerror = (err) => {
  console.error("WebSocket error:", err);
};

socket.onclose = () => {
  console.log("Disconnected from ESP32");
};
    // ---------- "FIREBASE" LEADERBOARD (mocked via localStorage) ----------
    // Schema per entry: { userId, name, level1Score, level2Score, finalScore }
    // const LB_KEY = 'archery_leaderboard_v3';
    // let leaderboard = loadLeaderboard();

    function loadLeaderboard() {
      try {
        const raw = localStorage.getItem(LB_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [
        { userId:'u1', name:'Alex',   level1Score:50, level2Score:40, finalScore:90 },
        { userId:'u2', name:'Sam',    level1Score:45, level2Score:30, finalScore:75 },
        { userId:'u3', name:'Jordan', level1Score:40, level2Score:25, finalScore:65 },
        { userId:'u4', name:'Riley',  level1Score:50, level2Score:0,  finalScore:50 },
        { userId:'u5', name:'Casey',  level1Score:40, level2Score:0,  finalScore:40 },
        { userId:'u6', name:'Morgan', level1Score:30, level2Score:0,  finalScore:30 },
        { userId:'u7', name:'Taylor', level1Score:20, level2Score:0,  finalScore:20 },
        { userId:'u8', name:'Drew',   level1Score:10, level2Score:0,  finalScore:10 },
      ];
    }
    function saveLeaderboard() {
      try { localStorage.setItem(LB_KEY, JSON.stringify(leaderboard)); } catch (e) {}
    }
    // Persist current player's run. If a record for this userId exists, update; else push.
    // function saveScore() {
    //   const userId = 'local_' + state.playerName.toLowerCase();
    //   const finalScore = state.level1Score + state.level2Score;
    //   const existing = leaderboard.find(p => p.userId === userId);
    //   if (existing) {
    //     // Keep best of each level
    //     existing.level1Score = Math.max(existing.level1Score, state.level1Score);
    //     existing.level2Score = Math.max(existing.level2Score, state.level2Score);
    //     existing.finalScore  = existing.level1Score + existing.level2Score;
    //     existing.name = state.playerName;
    //   } else {
    //     leaderboard.push({ userId, name: state.playerName, level1Score: state.level1Score, level2Score: state.level2Score, finalScore });
    //   }
    //   leaderboard.sort((a,b) => b.finalScore - a.finalScore);
    //   leaderboard = leaderboard.slice(0, 50);
    //   saveLeaderboard();
    // }
function saveScore() {
  const userId = state.playerName.toLowerCase().replace(/\s+/g, "_");

  const data = {
    name: state.playerName,
    level1Score: state.level1Score,
    level2Score: state.level2Score,
    finalScore: state.level1Score + state.level2Score,
    timestamp: Date.now()
  };

  firebase.database().ref("leaderboard/" + userId).set(data);
}
    // ---------- ELEMENTS ----------
    const $ = id => document.getElementById(id);
    const loginScreen = $('loginScreen');
    const mainScreen  = $('mainScreen');
    const nameInput   = $('nameInput');
    const enterBtn    = $('enterBtn');
    const playerLabel = $('playerLabel');
    const levelEl     = $('levelEl');
    const scoreEl     = $('score');
    const roundEl     = $('round');
    const startBtn    = $('startBtn');
    const gameArea    = $('gameArea');
    const targetL1    = $('targetL1');
    const arrow       = $('arrow');
    const message     = $('message');
    const hintText    = $('hintText');
    const sensorRow   = $('sensorRow');
    const lbList      = $('lbList');
    const gameOverEl  = $('gameOver');
    const goTitle     = $('goTitle');
    const goPlayer    = $('goPlayer');
    const goL1        = $('goL1');
    const goL2        = $('goL2');
    const goL2Row     = $('goL2Row');
    const goFinal     = $('goFinal');
    const lockMsg     = $('lockMsg');
    const playL2Btn   = $('playL2Btn');
    const restartBtn  = $('restartBtn');

    t2.small.el = $('targetSmall');
    t2.big.el   = $('targetBig');

    // ---------- LOGIN ----------
    function login() {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      state.playerName = name;
      playerLabel.textContent = name;
      loginScreen.style.display = 'none';
      mainScreen.style.display  = 'block';
      renderLeaderboard();
      setupLevel1UI();
    }
    enterBtn.addEventListener('click', login);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

    // ---------- LEADERBOARD ----------
    // function renderLeaderboard(highlightUserId = null) {
    //   leaderboard.sort((a,b) => b.finalScore - a.finalScore);
    //   lbList.innerHTML = '';
    //   leaderboard.slice(0, 10).forEach(p => {
    //     const li = document.createElement('li');
    //     if (p.userId === highlightUserId) li.classList.add('me');
    //     li.innerHTML = `<span class="pname">${escapeHtml(p.name)}</span>
    //                     <span class="pscore" title="L1:${p.level1Score} + L2:${p.level2Score}">${p.finalScore}</span>`;
    //     lbList.appendChild(li);
    //   });
    // }

    function renderLeaderboard() {
  firebase.database().ref("leaderboard")
    .orderByChild("finalScore")
    .limitToLast(10)
    .on("value", snapshot => {

      const data = [];
      snapshot.forEach(child => {
        data.push(child.val());
      });

      data.reverse(); // highest first

      lbList.innerHTML = "";

      data.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="pname">${p.name}</span>
          <span class="pscore">${p.finalScore}</span>
        `;
        lbList.appendChild(li);
      });
    });
}
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    //

    startBtn.addEventListener('click', () => startGame(state.level));
    playL2Btn.addEventListener('click', () => { if (!playL2Btn.disabled) startGame(2); });
    restartBtn.addEventListener('click', () => {
      if (state.level === 2) {
        // Full reset to Level 1
        state.level1Score = 0;
        state.level2Score = 0;
      }
      startGame(state.level === 2 ? 1 : 1);
    });

    // ---------- HARDWARE HOOK (ESP32) ----------
    // Backend / WebSocket / Firebase listener calls:
    //   window.onSensorTrigger(1) -> IR1 / Small / +10
    //   window.onSensorTrigger(2) -> IR2 / Big   / +5
    // Active only during Level 2.


    // ---------- LOGOUT ----------
    $('logoutBtn').addEventListener('click', () => {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      Object.assign(state, {
        playerName: '', level: 1, round: 0, score: 0,
        level1Score: 0, level2Score: 0,
        isGameOver: false, playing: false, canHit: false,
      });
      scoreEl.textContent = 0;
      roundEl.textContent = 0;
      levelEl.textContent = 1;
      message.textContent = '';
      gameOverEl.classList.remove('show');
      arrow.classList.remove('shooting');
      targetL1.classList.remove('hit');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Level 1';
      mainScreen.style.display = 'none';
      loginScreen.style.display = 'block';
      nameInput.value = '';
      nameInput.focus();
    });
 
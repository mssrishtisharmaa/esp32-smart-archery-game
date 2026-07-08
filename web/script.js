
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

    // ============================================================
    // LEVEL 1 — single target + arrow (UNCHANGED LOGIC)
    // ============================================================
    function setupLevel1UI() {
      state.level = 1;
      levelEl.textContent = '1';
      // Show L1 elements
      targetL1.style.display = 'block';
      arrow.style.display    = 'block';
      // Hide L2 elements
      t2.small.el.style.display = 'none';
      t2.big.el.style.display   = 'none';
      sensorRow.classList.remove('show');
      hintText.textContent = 'Level 1 — Aim and hit using IR sensor (real arrow trigger)';
      startBtn.textContent = 'Start Level 1';
      startBtn.disabled = false;
      positionTargetL1();
      startArrowLoop();
    }

    function positionTargetL1() {
      const maxX = gameArea.clientWidth - targetL1.offsetWidth;
      targetL1.style.left = (Math.random() * maxX) + 'px';
    }

    function startArrowLoop() {
      if (animId) cancelAnimationFrame(animId);
      let last = performance.now();
      const speed = 60; // % per second
      function tick(now) {
        const dt = (now - last) / 1000;
        last = now;
        // Arrow oscillates in both levels
        if (!arrow.classList.contains('shooting')) {
          arrowX += arrowDir * speed * dt;
          if (arrowX >= 98) { arrowX = 98; arrowDir = -1; }
          if (arrowX <= 2)  { arrowX = 2;  arrowDir = 1;  }
          arrow.style.left = arrowX + '%';
        }
        // Drive both L2 targets when in level 2
        if (state.level === 2) {
          const maxX = gameArea.clientWidth;
          for (const k in t2) {
            const t = t2[k];
            t.x += t.dir * t.speed * dt;
            if (t.x <= 0)              { t.x = 0;            t.dir = 1; }
            if (t.x >= maxX - t.w)     { t.x = maxX - t.w;   t.dir = -1; }
            t.el.style.left = t.x + 'px';
          }
        }
        animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    }

    function shootL1() {
      if (state.level !== 1 || !state.playing || !state.canHit) return;
      state.canHit = false;

      const endBottom = gameArea.clientHeight - 60;
      arrow.style.setProperty('--shoot-end', endBottom + 'px');
      arrow.style.left = arrowX + '%';
      arrow.classList.add('shooting');

      const arrowPx = (arrowX / 100) * gameArea.clientWidth;
      const targetLeft = parseFloat(targetL1.style.left);
      const targetCenter = targetLeft + targetL1.offsetWidth / 2;
      const dist = Math.abs(arrowPx - targetCenter);
      const hit = dist <= HIT_TOLERANCE;

      setTimeout(() => {
        if (hit) {
          state.score += 10;
          scoreEl.textContent = state.score;
          targetL1.classList.add('hit');
          message.textContent = '🎯 HIT! +10';
          message.style.color = '#2ecc71';
          playBeep(880);
        } else {
          flashMiss();
          message.textContent = '❌ MISS';
          message.style.color = '#e74c3c';
          playBeep(220);
        }
        setTimeout(() => {
          arrow.classList.remove('shooting');
          arrow.style.left = arrowX + '%';
          targetL1.classList.remove('hit');
          nextRound();
        }, 600);
      }, 350);
    }

    // ============================================================
    // LEVEL 2 — two moving targets (ESP32 IR sensors)
    // ============================================================
    function setupLevel2UI() {
      state.level = 2;
      levelEl.textContent = '2';
      // Hide L1 target, KEEP arrow visible (L2 also uses arrow)
      targetL1.style.display = 'none';
      arrow.style.display    = 'block';
      arrow.classList.remove('shooting');
      // Show L2
      t2.small.el.style.display = 'block';
      t2.big.el.style.display   = 'block';
      sensorRow.classList.add('show');
      hintText.textContent = 'Level 2 — Sensor-based shooting 🎯 Hit targets to score: Small (+10), Big (+5)';
      startBtn.textContent = 'Start Level 2';
      startBtn.disabled = false;
      // Make sure arrow oscillation loop is running (started in setupLevel1UI)
      if (!animId) startArrowLoop();
      // Place both targets at fixed positions (stationary)
      positionTargetsL2();
    }

    // function positionTargetsL2() {
    //   const w = gameArea.clientWidth;
    //   // Red (small/10pts) on the left third; Blue (5pts) on the right third
    //   t2.small.x = Math.max(0, w * 0.25 - t2.small.w / 2);
    //   t2.big.x   = Math.max(0, w * 0.72 - t2.big.w / 2);
    //   t2.small.el.style.left = t2.small.x + 'px';
    //   t2.big.el.style.left   = t2.big.x   + 'px';
    // }
  function positionTargetsL2() {
    const maxX = gameArea.clientWidth;

    // Random positions like Level 1
    t2.small.x = Math.random() * (maxX - t2.small.w);
    t2.big.x   = Math.random() * (maxX - t2.big.w);

    t2.small.el.style.left = t2.small.x + 'px';
    t2.big.el.style.left   = t2.big.x + 'px';
  }
    // Direct-hit handler (sensor / click / key 1-2). Skips arrow animation.
    // function registerHitL2(type) {
    //   if (state.level !== 2 || !state.playing || !state.canHit) return;
    //   if (type !== 'small' && type !== 'big') return;
    //   state.canHit = false;

    //   const points = POINTS_L2[type];
    //   state.score += points;
    //   scoreEl.textContent = state.score;

    //   const el = t2[type].el;
    //   el.classList.add('flash');
    //   document.body.classList.add('flash');
    //   playBeep(type === 'small' ? 880 : 520);
    //   setTimeout(() => {
    //     el.classList.remove('flash');
    //     document.body.classList.remove('flash');
    //   }, 300);

    //   message.textContent = `🎯 HIT ${type.toUpperCase()} +${points}`;
    //   message.style.color = type === 'small' ? '#e74c3c' : '#3498db';

    //   setTimeout(nextRound, 700);
    // }

    // Arrow-shoot handler for Level 2 — fires arrow, checks both targets
    function shootL2() {
      if (state.level !== 2 || !state.playing || !state.canHit) return;
      state.canHit = false;

      const endBottom = gameArea.clientHeight - 60;
      arrow.style.setProperty('--shoot-end', endBottom + 'px');
      arrow.style.left = arrowX + '%';
      arrow.classList.add('shooting');

      const arrowPx = (arrowX / 100) * gameArea.clientWidth;

      // Check both targets — small wins on tie (it's worth more)
      let hitType = null;
      let bestDist = Infinity;
      for (const k of ['small', 'big']) {
        const t = t2[k];
        const center = t.x + t.w / 2;
        const dist = Math.abs(arrowPx - center);
        // Hit if arrow lands within target radius
        if (dist <= t.w / 2 && dist < bestDist) {
          bestDist = dist;
          hitType = k;
        }
      }

      setTimeout(() => {
        if (hitType) {
          const points = POINTS_L2[hitType];
          state.score += points;
          scoreEl.textContent = state.score;
          const el = t2[hitType].el;
          el.classList.add('flash');
          document.body.classList.add('flash');
          playBeep(hitType === 'small' ? 880 : 520);
          setTimeout(() => {
            el.classList.remove('flash');
            document.body.classList.remove('flash');
          }, 300);
          message.textContent = `🎯 HIT ${hitType.toUpperCase()} +${points}`;
          message.style.color = hitType === 'small' ? '#e74c3c' : '#3498db';
        } else {
          flashMiss();
          message.textContent = '❌ MISS';
          message.style.color = '#e74c3c';
          playBeep(220);
        }
        setTimeout(() => {
          arrow.classList.remove('shooting');
          arrow.style.left = arrowX + '%';
          nextRound();
        }, 600);
      }, 350);
    }

    // ============================================================
    // SHARED GAME FLOW
    // ============================================================
    function startGame(level) {
      state.level = level;
      state.score = 0;
      state.round = 0;
      state.isGameOver = false;
      state.playing = true;
      scoreEl.textContent = 0;
      message.textContent = '';
      gameOverEl.classList.remove('show');

      if (level === 1) setupLevel1UI();
      else setupLevel2UI();

      startBtn.disabled = true;
      startBtn.textContent = level === 1 ? 'Playing L1...' : 'Playing L2...';
      nextRound();
    }

    function nextRound() {
      if (state.round >= TOTAL_ROUNDS) return endLevel();
      state.round++;
      roundEl.textContent = state.round;
      state.canHit = true;
      if (state.level === 1) {
        positionTargetL1();
        message.textContent = `Round ${state.round} — aim and SHOOT`;
      } 
      else {
    positionTargetsL2(); // 🔥 IMPORTANT
    message.textContent = `Round ${state.round} — aim at small (5) or big (10)`;
  }
      message.style.color = '#fff';
    }

    function endLevel() {
      state.playing = false;
      state.canHit = false;
      state.isGameOver = true;

      // Save score for the level just completed
      if (state.level === 1) state.level1Score = state.score;
      else state.level2Score = state.score;

      saveScore();
      renderLeaderboard('local_' + state.playerName.toLowerCase());

      // Populate Game Over overlay
      const finalScore = state.level1Score + state.level2Score;
      goPlayer.textContent = state.playerName;
      goL1.textContent = state.level1Score;
      goL2.textContent = state.level2Score;
      goFinal.textContent = finalScore;

      if (state.level === 1) {
        goTitle.textContent = '🏁 Level 1 Complete';
        goL2Row.style.display = 'none';
        const unlocked = state.level1Score >= UNLOCK_THRESHOLD;
        playL2Btn.style.display = 'inline-block';
        if (unlocked) {
          playL2Btn.disabled = false;
          playL2Btn.classList.remove('locked');
          playL2Btn.classList.add('unlock');
          playL2Btn.textContent = '🔓 Play Level 2';
          lockMsg.style.display = 'none';
        } else {
          playL2Btn.disabled = true;
          playL2Btn.classList.add('locked');
          playL2Btn.classList.remove('unlock');
          playL2Btn.textContent = `🔒 Level Locked (${UNLOCK_THRESHOLD}+ required)`;
          lockMsg.style.display = 'block';
        }
        restartBtn.textContent = 'Replay Level 1';
      } else {
        goTitle.textContent = '🏆 Game Over';
        goL2Row.style.display = 'block';
        playL2Btn.style.display = 'none';
        lockMsg.style.display = 'none';
        restartBtn.textContent = 'Restart from Level 1';
      }

      startBtn.disabled = false;
      startBtn.textContent = state.level === 1 ? 'Start Level 1' : 'Start Level 2';
      gameOverEl.classList.add('show');
    }

    function flashMiss() {
      document.body.classList.add('miss');
      setTimeout(() => document.body.classList.remove('miss'), 200);
    }

    // ---------- AUDIO FEEDBACK ----------
    let audioCtx = null;
    function playBeep(freq) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = freq;
        o.type = 'square';
        g.gain.value = 0.08;
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
        o.stop(audioCtx.currentTime + 0.2);
      } catch (e) {}
    }

    // ---------- INPUT ----------
    document.addEventListener('keydown', e => {
      if (state.level === 1 && e.code === 'Space') {
        e.preventDefault();
        shootL1();
      } else if (state.level === 2) {
        if (e.code === 'Space') { e.preventDefault(); shootL2(); }
      }
    });
  

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
 
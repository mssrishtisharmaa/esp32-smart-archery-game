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
  
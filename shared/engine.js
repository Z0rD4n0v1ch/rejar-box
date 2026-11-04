/*
 * Rejar Box — общий движок для всех игр.
 * Подключение в игре:  <script src="../../shared/engine.js"></script>
 *
 * Что внутри:
 *   Rejar.createGame({...})   — экран, игровой цикл 60 шагов/сек, масштаб под телефон
 *   Rejar.input               — клавиатура + сенсорные кнопки (крестовина, A, B, Меню)
 *   Rejar.loadSheet(...)      — спрайт-листы, фон #FF00FF становится прозрачным
 *   Rejar.pixelSprite(...)    — быстрые спрайты-заглушки прямо из строк
 *   Rejar.sound               — чиптюн-звуки (beep, noise) и музыка из файлов
 *   Rejar.save / Rejar.load   — сохранения в браузере
 */
(function () {
  'use strict';
  const R = {};

  /* ---------- Сохранения ---------- */
  R.save = function (key, value) {
    try { localStorage.setItem('rejar:' + key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  };
  R.load = function (key, fallback) {
    try {
      const v = localStorage.getItem('rejar:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  };

  /* ---------- Звук ---------- */
  let actx = null;
  let music = null;
  let musicWanted = false;
  let unlocked = false;

  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    return actx;
  }

  R.sound = {
    muted: R.load('muted', false),

    // Короткий звук. Пример: Rejar.sound.beep({ freq: 880, to: 220, dur: 0.08 })
    beep(p = {}) {
      const a = audio();
      if (!a || this.muted || !unlocked) return;
      const t = a.currentTime;
      const dur = p.dur || 0.1;
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = p.type || 'square';
      osc.frequency.setValueAtTime(p.freq || 440, t);
      if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, t + dur);
      g.gain.setValueAtTime(p.vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(a.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    // Шум: взрывы, выстрелы, помехи. Пример: Rejar.sound.noise({ dur: 0.4 })
    noise(p = {}) {
      const a = audio();
      if (!a || this.muted || !unlocked) return;
      const t = a.currentTime;
      const dur = p.dur || 0.3;
      const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(p.from || 3000, t);
      f.frequency.exponentialRampToValueAtTime(p.to || 200, t + dur);
      const g = a.createGain();
      g.gain.setValueAtTime(p.vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(a.destination);
      src.start(t);
    },

    // Фоновая музыка из файла (mp3/ogg). Играет по кругу.
    music(src, vol = 0.5) {
      this.stopMusic();
      music = new Audio(src);
      music.loop = true;
      music.volume = vol;
      musicWanted = true;
      if (unlocked && !this.muted) music.play().catch(() => {});
    },

    stopMusic() {
      musicWanted = false;
      if (music) { music.pause(); music = null; }
    },

    toggleMute() {
      this.muted = !this.muted;
      R.save('muted', this.muted);
      if (music) {
        if (this.muted) music.pause();
        else if (musicWanted) music.play().catch(() => {});
      }
      return this.muted;
    },

    // Браузер разрешает звук только после первого касания или нажатия.
    _unlock() {
      if (unlocked) return;
      unlocked = true;
      const a = audio();
      if (a && a.state === 'suspended') a.resume();
      if (music && musicWanted && !this.muted) music.play().catch(() => {});
    }
  };

  /* ---------- Ввод ---------- */
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', Numpad8: 'up', Digit2: 'up',
    ArrowDown: 'down', KeyS: 'down', Numpad2: 'down', Digit8: 'down',
    ArrowLeft: 'left', KeyA: 'left', Numpad4: 'left', Digit4: 'left',
    ArrowRight: 'right', KeyD: 'right', Numpad6: 'right', Digit6: 'right',
    Space: 'fire', Enter: 'fire', KeyJ: 'fire', Numpad5: 'fire', Digit5: 'fire',
    KeyK: 'alt', ShiftLeft: 'alt', Digit0: 'alt', Numpad0: 'alt',
    Escape: 'back', Backspace: 'back'
  };
  const kb = new Set();
  const tc = {};
  const pressedFlags = {};

  function isHeld(a) { return kb.has(a) || (tc[a] || 0) > 0; }

  R.input = {
    // Кнопка зажата сейчас: up, down, left, right, fire, alt, back
    held: isHeld,
    // Кнопку нажали только что (срабатывает один раз)
    pressed(a) { return !!pressedFlags[a]; },
    _endStep() { for (const k in pressedFlags) delete pressedFlags[k]; }
  };

  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    R.sound._unlock();
    if (e.repeat) return;
    if (!isHeld(a)) pressedFlags[a] = true;
    kb.add(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) kb.delete(a);
  });
  window.addEventListener('blur', () => kb.clear());

  function touchDown(a) {
    if (!isHeld(a)) pressedFlags[a] = true;
    tc[a] = (tc[a] || 0) + 1;
  }
  function touchUp(a) { tc[a] = Math.max(0, (tc[a] || 0) - 1); }

  function attachTouch(root) {
    const want = matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);
    if (!want) return null;

    const pad = document.createElement('div');
    pad.className = 'rejar-pad';
    pad.innerHTML =
      '<div class="rejar-dpad">' +
        '<div data-a="up left"></div><button class="rejar-key" data-a="up" aria-label="Вверх">▲</button><div data-a="up right"></div>' +
        '<button class="rejar-key" data-a="left" aria-label="Влево">◀</button><div></div><button class="rejar-key" data-a="right" aria-label="Вправо">▶</button>' +
        '<div data-a="down left"></div><button class="rejar-key" data-a="down" aria-label="Вниз">▼</button><div data-a="down right"></div>' +
      '</div>' +
      '<button class="rejar-key rejar-back" data-a="back">Меню</button>' +
      '<div class="rejar-ab">' +
        '<button class="rejar-key" data-a="alt">B</button>' +
        '<button class="rejar-key" data-a="fire">A</button>' +
      '</div>';
    root.appendChild(pad);

    const active = new Set();
    const ptr = new Map();

    function target(x, y) {
      const el = document.elementFromPoint(x, y);
      const t = el && el.closest('[data-a]');
      return t && pad.contains(t) ? t : null;
    }
    function set(id, el) {
      const prev = ptr.get(id);
      if (prev && prev.el === el) return;
      if (prev) {
        prev.el.classList.remove('on');
        prev.acts.forEach(touchUp);
        ptr.delete(id);
      }
      if (el) {
        const acts = el.dataset.a.split(' ');
        el.classList.add('on');
        acts.forEach(touchDown);
        ptr.set(id, { el, acts });
      }
    }
    function end(e) { set(e.pointerId, null); active.delete(e.pointerId); }

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      R.sound._unlock();
      active.add(e.pointerId);
      if (pad.setPointerCapture) pad.setPointerCapture(e.pointerId);
      set(e.pointerId, target(e.clientX, e.clientY));
    });
    pad.addEventListener('pointermove', (e) => {
      if (active.has(e.pointerId)) set(e.pointerId, target(e.clientX, e.clientY));
    });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());

    return { reserve: () => pad.offsetHeight };
  }

  /* ---------- Графика ---------- */
  R.loadImage = function (src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось загрузить ' + src));
      img.src = src;
    });
  };

  // Убирает фон #FF00FF (с допуском — генераторы дают «почти маджента»).
  function keyOut(x, w, h, tol) {
    try {
      const d = x.getImageData(0, 0, w, h);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i] > 255 - tol && p[i + 1] < tol && p[i + 2] > 255 - tol) p[i + 3] = 0;
      }
      x.putImageData(d, 0, 0);
    } catch (e) {
      console.warn('Rejar: прозрачный фон не применён. Открой игру через локальный сервер, а не двойным кликом (см. README).');
    }
  }

  function makeSheet(c, fw, fh) {
    const cols = Math.max(1, Math.floor(c.width / fw));
    const rows = Math.max(1, Math.floor(c.height / fh));
    return {
      canvas: c, fw, fh, cols, count: cols * rows,
      // sheet.draw(ctx, кадр, x, y, { flip: true, scale: 2 })
      draw(ctx, frame, x, y, o = {}) {
        const f = ((frame | 0) % this.count + this.count) % this.count;
        const sx = (f % cols) * fw;
        const sy = Math.floor(f / cols) * fh;
        const s = o.scale || 1;
        const w = fw * s, h = fh * s;
        x = Math.round(x); y = Math.round(y);
        if (o.flip) {
          ctx.save();
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(c, sx, sy, fw, fh, 0, 0, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(c, sx, sy, fw, fh, x, y, w, h);
        }
      }
    };
  }

  // Спрайт-лист из PNG. frameW/frameH — размер одного кадра.
  R.loadSheet = async function (src, frameW, frameH, opts = {}) {
    const img = await R.loadImage(src);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    if (opts.key !== false) keyOut(x, c.width, c.height, opts.tolerance == null ? 60 : opts.tolerance);
    return makeSheet(c, frameW || img.width, frameH || img.height);
  };

  // Спрайт из строк: '.' — пусто, остальные символы — цвета из палитры.
  // Можно передать один кадр (массив строк) или несколько кадров (массив массивов).
  R.pixelSprite = function (frames, palette) {
    if (typeof frames[0] === 'string') frames = [frames];
    const fh = frames[0].length;
    const fw = frames[0][0].length;
    const c = document.createElement('canvas');
    c.width = fw * frames.length;
    c.height = fh;
    const x = c.getContext('2d');
    frames.forEach((rows, fi) => {
      rows.forEach((row, y) => {
        for (let i = 0; i < row.length; i++) {
          const col = palette[row[i]];
          if (!col) continue;
          x.fillStyle = col;
          x.fillRect(fi * fw + i, y, 1, 1);
        }
      });
    });
    return makeSheet(c, fw, fh);
  };

  // Номер кадра анимации по времени.
  R.frameAt = (time, fps, count) => Math.floor(time * fps) % count;

  // Пересечение прямоугольников {x, y, w, h}.
  R.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  R.text = function (ctx, str, x, y, o = {}) {
    ctx.font = (o.size || 8) + 'px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = o.align || 'left';
    ctx.fillStyle = o.color || '#CDBE8E';
    ctx.fillText(str, Math.round(x), Math.round(y));
  };

  R.exit = function () { location.href = '../../index.html'; };

  /* ---------- Экран и цикл ---------- */
  function injectStyle() {
    if (document.getElementById('rejar-style')) return;
    const s = document.createElement('style');
    s.id = 'rejar-style';
    s.textContent = `
      html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
      #rejar { height: 100%; box-sizing: border-box; display: flex; flex-direction: column;
        align-items: center; justify-content: center; touch-action: none;
        user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
        padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
      .rejar-screen { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
      .rejar-pad { position: relative; width: 100%; max-width: 480px; box-sizing: border-box;
        display: flex; justify-content: space-between; align-items: center; padding: 14px 18px 10px; }
      .rejar-dpad { display: grid; grid-template-columns: repeat(3, 54px); grid-template-rows: repeat(3, 54px); }
      .rejar-key { background: #3B4248; color: #CDBE8E; border: 0; border-radius: 10px;
        font: 600 18px monospace; padding: 0; touch-action: none; }
      .rejar-key.on { background: #6E7B85; color: #172014; }
      .rejar-ab { display: flex; gap: 16px; align-items: center; }
      .rejar-ab .rejar-key { width: 66px; height: 66px; border-radius: 50%; font-size: 22px; }
      .rejar-ab .rejar-key[data-a="alt"] { transform: translateY(18px); }
      .rejar-back { position: absolute; top: 0; left: 50%; transform: translateX(-50%);
        padding: 6px 14px; font-size: 13px; border-radius: 6px; }
    `;
    document.head.appendChild(s);
  }

  /*
   * Rejar.createGame({
   *   width: 240, height: 320,        // внутреннее разрешение, как у телефона
   *   background: '#000',
   *   init(game)  { ... },            // загрузка ресурсов (можно async)
   *   update(game, dt) { ... },       // логика, 60 раз в секунду
   *   draw(game, ctx) { ... },        // отрисовка
   *   onBack(game) { ... }            // своя реакция на «Меню»/Esc (по умолчанию — выход в лаунчер)
   * })
   */
  R.createGame = function (opts) {
    const o = Object.assign({ width: 240, height: 320, background: '#000' }, opts);
    injectStyle();

    const root = document.getElementById('rejar') || document.body;
    const canvas = document.createElement('canvas');
    canvas.width = o.width;
    canvas.height = o.height;
    canvas.className = 'rejar-screen';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const touch = attachTouch(root);
    canvas.addEventListener('pointerdown', () => R.sound._unlock());

    function fit() {
      const reserve = touch ? touch.reserve() : 0;
      const aw = root.clientWidth;
      const ah = root.clientHeight - reserve;
      let s = Math.min(aw / o.width, ah / o.height);
      const si = Math.floor(s);
      if (si >= 1 && si / s >= 0.85) s = si; // целый масштаб, если он не слишком мельчит
      canvas.style.width = Math.round(o.width * s) + 'px';
      canvas.style.height = Math.round(o.height * s) + 'px';
    }
    window.addEventListener('resize', fit);
    fit();

    const game = { canvas, ctx, width: o.width, height: o.height, time: 0, paused: false, state: {} };

    const STEP = 1 / 60;
    let acc = 0;
    let last = performance.now();

    document.addEventListener('visibilitychange', () => {
      game.paused = document.hidden;
      last = performance.now();
      if (music && musicWanted && !R.sound.muted) {
        if (document.hidden) music.pause(); else music.play().catch(() => {});
      }
    });

    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;
      if (!game.paused) {
        acc += dt;
        while (acc >= STEP) {
          if (R.input.pressed('back')) {
            if (o.onBack) o.onBack(game); else R.exit();
          }
          if (o.update) o.update(game, STEP);
          R.input._endStep();
          game.time += STEP;
          acc -= STEP;
        }
      }
      ctx.fillStyle = o.background;
      ctx.fillRect(0, 0, o.width, o.height);
      if (o.draw) o.draw(game, ctx);
      requestAnimationFrame(frame);
    }

    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, o.width, o.height);
    R.text(ctx, 'Загрузка…', o.width / 2, o.height / 2 - 4, { align: 'center' });

    Promise.resolve(o.init ? o.init(game) : null)
      .then(() => { last = performance.now(); requestAnimationFrame(frame); })
      .catch((err) => {
        console.error(err);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, o.width, o.height);
        R.text(ctx, 'Ошибка загрузки:', 6, 6, { color: '#E06040' });
        R.text(ctx, String(err.message || err), 6, 18, { color: '#E06040' });
      });

    return game;
  };

  window.Rejar = R;
})();

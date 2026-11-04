/*
 * Шаблон игры для Rejar Box.
 * Скопируй папку games/template, переименуй и меняй как хочешь.
 * Пушка внизу стреляет по ящикам. Пропустил ящик — конец игры.
 */
const W = 240;
const H = 320;

// Палитра: цифры в строках спрайтов -> цвета
const PAL = {
  1: '#3A3F44', // ствол
  2: '#2B2F22', // контур
  3: '#6B7A3E', // олива
  4: '#4D5A2C', // тёмная олива
  5: '#A0723A'  // дерево
};

const TANK = [
  '....11....',
  '....11....',
  '...2112...',
  '.22333322.',
  '2333333332',
  '2343443432',
  '2444444442',
  '.22222222.'
];

const CRATE = [
  '22222222',
  '25555552',
  '25255252',
  '25522552',
  '25522552',
  '25255252',
  '25555552',
  '22222222'
];

let tank, crate;
const SCALE = 2;

function reset(g) {
  g.state = {
    x: W / 2 - 10,
    bullets: [],
    crates: [],
    spawn: 1,
    cool: 0,
    score: 0,
    over: false,
    best: Rejar.load('template:best', 0)
  };
}

Rejar.createGame({
  width: W,
  height: H,
  background: '#2A2F2A',

  init(g) {
    tank = Rejar.pixelSprite(TANK, PAL);
    crate = Rejar.pixelSprite(CRATE, PAL);
    // Свои картинки и музыка подключаются так:
    // hero = await Rejar.loadSheet('sprites/hero.png', 32, 32);
    // Rejar.sound.music('music/theme.mp3');
    reset(g);
  },

  update(g, dt) {
    const s = g.state;
    const In = Rejar.input;

    if (s.over) {
      if (In.pressed('fire')) reset(g);
      return;
    }

    const speed = 100;
    if (In.held('left')) s.x -= speed * dt;
    if (In.held('right')) s.x += speed * dt;
    s.x = Math.max(0, Math.min(W - 10 * SCALE, s.x));

    s.cool -= dt;
    if (In.held('fire') && s.cool <= 0) {
      s.bullets.push({ x: s.x + 9, y: H - 34, w: 2, h: 5 });
      s.cool = 0.25;
      Rejar.sound.beep({ freq: 900, to: 250, dur: 0.07 });
    }

    s.bullets.forEach((b) => { b.y -= 240 * dt; });
    s.bullets = s.bullets.filter((b) => b.y > -10);

    s.spawn -= dt;
    if (s.spawn <= 0) {
      s.crates.push({ x: Math.random() * (W - 16), y: -16, w: 16, h: 16, v: 28 + s.score * 0.8 });
      s.spawn = Math.max(0.45, 1.3 - s.score * 0.03);
    }
    s.crates.forEach((c) => { c.y += c.v * dt; });

    for (const c of s.crates) {
      for (const b of s.bullets) {
        if (!c.dead && !b.dead && Rejar.overlap(b, c)) {
          c.dead = b.dead = true;
          s.score++;
          Rejar.sound.noise({ dur: 0.18, vol: 0.18 });
        }
      }
      if (!c.dead && c.y > H - 30) {
        s.over = true;
        if (s.score > s.best) {
          s.best = s.score;
          Rejar.save('template:best', s.best);
        }
        Rejar.sound.noise({ dur: 0.7, from: 1500, to: 60, vol: 0.3 });
      }
    }
    s.crates = s.crates.filter((c) => !c.dead);
    s.bullets = s.bullets.filter((b) => !b.dead);
  },

  draw(g, ctx) {
    const s = g.state;

    // земля
    ctx.fillStyle = '#4D5A2C';
    ctx.fillRect(0, H - 14, W, 14);
    ctx.fillStyle = '#3A4422';
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, H - 14, 4, 2);

    s.crates.forEach((c) => crate.draw(ctx, 0, c.x, c.y, { scale: SCALE }));

    ctx.fillStyle = '#E8D27A';
    s.bullets.forEach((b) => ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h));

    tank.draw(ctx, 0, s.x, H - 30, { scale: SCALE });

    Rejar.text(ctx, 'Счёт ' + s.score, 6, 6);
    Rejar.text(ctx, 'Рекорд ' + s.best, W - 6, 6, { align: 'right' });

    if (s.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H / 2 - 24, W, 48);
      Rejar.text(ctx, 'Конец игры', W / 2, H / 2 - 16, { align: 'center', size: 12 });
      Rejar.text(ctx, 'Огонь — заново, Меню — выход', W / 2, H / 2 + 4, { align: 'center' });
    }
  }
});

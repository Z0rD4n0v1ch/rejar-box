// Список игр в меню Rejar Box. Карточки строятся из этого массива.
//   id     — имя папки в games/
//   title  — название
//   note   — описание (1–2 предложения)
//   tags   — короткие метки под описанием
//   cover  — картинка для карточки (или null — будет буква)
//   path   — адрес игры (по умолчанию games/<id>/)
//   hidden — true, чтобы не показывать в меню
//   color  — цвет картриджа на полке (необязательно)
//   progress(get) — необязательно: прогресс для меню, вернуть {done, total, best, label}
window.REJAR_GAMES = [
  {
    id: 'shershen',
    title: 'Стальной Шершень',
    note: 'Вертолёт против станции в городе, бронепоезда, корабля-базы, ракеты на острове и ночного секретного комплекса, а пешком — штурм штаба и порта. Семь миссий, три сложности, звания и рекорды.',
    tags: ['Шутер', '7 миссий', 'Телефон и ПК'],
    cover: 'games/shershen/cover.png',
    path: 'games/shershen/',
    color: '#4d6130', colorHi: '#73884a', colorDk: '#2c3a1e',
    progress: function (get) {
      let done = 0, best = 0;
      for (let m = 0; m < 7; m++) {
        let any = false;
        for (let d = 0; d < 3; d++) { const v = +get('hornet_hi_d' + d + '_m' + m, 0) || 0; if (v > 0) any = true; best = Math.max(best, v); }
        if (any) done++;
      }
      return { label: 'Пройдено миссий', done: done, total: 7, best: best };
    }
  },
  {
    id: 'template',
    title: 'Шаблон',
    note: 'Пушка против ящиков. Образец для новых игр.',
    tags: ['Образец'],
    cover: null,
    path: 'games/template/',
    hidden: true
  }
];

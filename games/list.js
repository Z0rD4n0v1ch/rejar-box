// Список игр в меню Rejar Box.
// Новая игра: скопируй папку games/template, затем добавь сюда строку.
//   id    — имя папки
//   title — название в меню
//   note  — одна строка описания
//   path  — адрес игры (по умолчанию games/<id>/)
//   icon  — путь к картинке 32×32 (или null — будет буква)
//   stats — необязательно: функция, возвращающая строку прогресса для меню
window.REJAR_GAMES = [
  {
    id: 'steel-hornet',
    title: 'Стальной Шершень',
    note: 'Вертолёт и пехота: станция, бронепоезд, штаб, корабль-база и порт. 5 миссий.',
    path: 'steel-hornet/',
    icon: 'steel-hornet/icon-list.png',
    stats: function () {
      const get = (k) => { try { return +JSON.parse(localStorage.getItem(k)) || 0; } catch (e) { return 0; } };
      let done = 0, best = 0;
      for (let m = 0; m < 5; m++) {
        let any = false;
        for (let d = 0; d < 3; d++) { const v = get('hornet_hi_d' + d + '_m' + m); if (v > 0) any = true; best = Math.max(best, v); }
        if (any) done++;
      }
      return done ? 'Пройдено ' + done + '/5 · лучший счёт ' + best : '';
    }
  },
  {
    id: 'template',
    title: 'Шаблон',
    note: 'Пушка против ящиков. Образец для новых игр.',
    path: 'games/template/',
    icon: null
  }
];

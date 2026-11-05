/* Rejar Box — адаптер для Telegram Mini App.
 * Подключается после telegram-web-app.js. Вне Telegram ничего не делает.
 *   <script src="https://telegram.org/js/telegram-web-app.js"></script>
 *   <script src="shared/tg.js" data-back="../../" data-full="1"></script>
 *   data-back — куда ведёт кнопка «Назад» (без него кнопка скрыта); data-full — игра во весь экран на телефоне.
 * Что делает в Telegram:
 *  - разворачивает окно, красит шапку в цвет Rejar Box, отключает закрытие свайпом вниз (мешает играть);
 *  - игры на телефоне открываются во весь экран, с отступами под кнопки Telegram и вырез экрана;
 *  - window.rejarShare(text) — поделиться результатом в чате (ссылка ведёт в бота, см. BOT);
 *  - кнопка «Назад» Telegram ведёт из игры в меню;
 *  - звук ставится на паузу, когда Telegram свёрнут;
 *  - рекорды и прогресс (ключи с префиксами из SYNC) копируются в облако Telegram (CloudStorage),
 *    поэтому на другом телефоне или в Telegram Desktop прогресс тот же.
 */
(function () {
  const BOT = 'rejarbox_app'; // юзернейм бота без @. Пусто — делимся ссылкой на сайт.
  const SITE = 'https://z0rd4n0v1ch.github.io/rejar-box/';
  const W = window.Telegram && window.Telegram.WebApp;
  const inTG = !!(W && W.initData);
  window.REJAR_TG = inTG ? W : null;
  if (!inTG) return;
  document.documentElement.classList.add('in-tg');
  const at = (v) => W.isVersionAtLeast && W.isVersionAtLeast(v);
  const BG = '#12150F';

  try { W.ready(); W.expand(); } catch (e) {}
  try { if (at('6.1')) { W.setHeaderColor(BG); W.setBackgroundColor(BG); } } catch (e) {}
  try { if (at('7.10')) W.setBottomBarColor(BG); } catch (e) {}
  try { if (at('7.7')) W.disableVerticalSwipes(); } catch (e) {}

  /* кнопка «Назад» */
  const me = document.currentScript;
  const back = me && me.dataset.back;
  try {
    if (at('6.1')) {
      if (back) { W.BackButton.show(); W.BackButton.onClick(() => { location.href = back; }); }
      else W.BackButton.hide();
    }
  } catch (e) {}

  /* во весь экран: только игры и только на телефоне */
  const full = me && me.dataset.full, mobile = /android|ios/.test(W.platform || '');
  const st = document.createElement('style');
  st.textContent = 'html.tg-full{padding:0!important}html.tg-full body{box-sizing:border-box;padding-top:var(--rj-top,0px);padding-bottom:var(--rj-bot,0px)}';
  document.head.appendChild(st);
  const pad = () => {
    const fs = !!W.isFullscreen, a = W.safeAreaInset || {}, c = W.contentSafeAreaInset || {}, d = document.documentElement;
    d.classList.toggle('tg-full', fs);
    d.style.setProperty('--rj-top', (fs ? (a.top || 0) + (c.top || 0) : 0) + 'px');
    d.style.setProperty('--rj-bot', (fs ? (a.bottom || 0) + (c.bottom || 0) : 0) + 'px');
    setTimeout(() => dispatchEvent(new Event('resize')), 30);
  };
  try {
    for (const ev of ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged']) W.onEvent(ev, pad);
    if (at('8.0')) { if (full && mobile && !W.isFullscreen) W.requestFullscreen(); else if (!full && W.isFullscreen) W.exitFullscreen(); }
  } catch (e) {}
  if (document.body) pad(); else addEventListener('DOMContentLoaded', pad);

  /* поделиться результатом */
  window.rejarShare = (text) => {
    const m = location.pathname.match(/\/games\/([A-Za-z0-9_-]+)\//), id = m ? m[1] : '';
    const url = BOT ? 'https://t.me/' + BOT + '?startapp' + (id ? '=' + id : '') : SITE + (id ? 'games/' + id + '/' : '');
    try { W.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text)); } catch (e) {}
  };

  /* ссылка t.me/бот?startapp=<id игры> сразу открывает эту игру (один раз за запуск) */
  try {
    const sp = W.initDataUnsafe && W.initDataUnsafe.start_param;
    if (!back && sp && /^[A-Za-z0-9_-]+$/.test(sp) && !sessionStorage.getItem('rejar:startDone')) {
      sessionStorage.setItem('rejar:startDone', '1');
      addEventListener('DOMContentLoaded', () => {
        const g = (window.REJAR_GAMES || []).find((x) => x.id === sp && !x.hidden);
        if (g) location.href = g.path;
      });
    }
  } catch (e) {}

  /* внешние ссылки — через Telegram, иначе они откроются внутри мини-приложения */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (!a || a.host === location.host) return;
    e.preventDefault(); try { W.openLink(a.href); } catch (err) { location.href = a.href; }
  }, true);

  /* звук: пауза, когда Telegram свёрнут или открыт другой экран */
  const ctxs = [];
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const Wrapped = function (...a) { const c = new AC(...a); ctxs.push(c); return c; };
    Wrapped.prototype = AC.prototype;
    window.AudioContext = Wrapped; if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  }
  const pause = (on) => { for (const c of ctxs) { try { on ? c.suspend() : c.resume(); } catch (e) {} } };
  try { W.onEvent('deactivated', () => pause(true)); W.onEvent('activated', () => pause(false)); } catch (e) {}
  document.addEventListener('visibilitychange', () => pause(document.hidden));

  /* облачные сохранения */
  const SYNC = ['hornet_'];
  const CS = at('6.9') && W.CloudStorage;
  if (!CS) return;
  const ok = (k) => SYNC.some((p) => k.startsWith(p)) && /^[A-Za-z0-9_-]{1,128}$/.test(k);
  const parse = (v) => { try { return JSON.parse(v); } catch (e) { return v; } };
  const merge = (local, cloud) => {
    if (local == null) return cloud;
    if (cloud == null) return local;
    const a = parse(local), b = parse(cloud);
    if (typeof a === 'number' && typeof b === 'number') return a >= b ? local : cloud;
    if (typeof a === 'boolean' && typeof b === 'boolean') return JSON.stringify(a || b);
    // списки (достижения) — объединяем; объекты (улучшения, статистика) — по каждому полю берём большее
    if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...new Set([...a, ...b])]);
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const o = Object.assign({}, b, a);
      for (const k in b) if (typeof a[k] === 'number' && typeof b[k] === 'number') o[k] = Math.max(a[k], b[k]);
      return JSON.stringify(o);
    }
    return local;
  };
  const LS = window.localStorage;
  const set0 = Storage.prototype.setItem;
  // каждое сохранение рекорда сразу уходит и в облако
  Storage.prototype.setItem = function (k, v) {
    set0.call(this, k, v);
    if (this === LS && ok(k) && String(v).length <= 4096) { try { CS.setItem(k, String(v)); } catch (e) {} }
  };
  // при запуске: забираем облачный прогресс, объединяем с местным, отдаём объединённый обратно
  try {
    CS.getKeys((err, keys) => {
      if (err) return;
      const ks = (keys || []).filter(ok);
      const fin = (cloud) => {
        let changed = false;
        const all = new Set(ks);
        for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (ok(k)) all.add(k); }
        for (const k of all) {
          const l = LS.getItem(k), c = cloud[k] == null || cloud[k] === '' ? null : cloud[k], m = merge(l, c);
          if (m != null && m !== l) { set0.call(LS, k, m); changed = true; }
          if (m != null && m !== c) { try { CS.setItem(k, m); } catch (e) {} }
        }
        // игра уже прочитала старый прогресс — перезапускаем страницу один раз
        if (changed && !sessionStorage.getItem('rejar:tgSynced')) { sessionStorage.setItem('rejar:tgSynced', '1'); location.reload(); }
      };
      if (!ks.length) { fin({}); return; }
      CS.getItems(ks, (e2, vals) => { fin(e2 ? {} : (vals || {})); });
    });
  } catch (e) {}
})();

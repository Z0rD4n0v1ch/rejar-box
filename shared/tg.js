/* Rejar Box — адаптер для Telegram Mini App.
 * Подключается после telegram-web-app.js. Вне Telegram ничего не делает.
 *   <script src="https://telegram.org/js/telegram-web-app.js"></script>
 *   <script src="shared/tg.js" data-back="../../"></script>   (data-back — куда ведёт кнопка «Назад»; без него кнопка скрыта)
 * Что делает в Telegram:
 *  - разворачивает окно, красит шапку в цвет Rejar Box, отключает закрытие свайпом вниз (мешает играть);
 *  - кнопка «Назад» Telegram ведёт из игры в меню;
 *  - звук ставится на паузу, когда Telegram свёрнут;
 *  - рекорды и прогресс (ключи с префиксами из SYNC) копируются в облако Telegram (CloudStorage),
 *    поэтому на другом телефоне или в Telegram Desktop прогресс тот же.
 */
(function () {
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

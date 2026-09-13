/* Háztartási mobil-kalkulátor — alkalmazás-réteg (PWA).
   1) service worker regisztrálása (hálózat-első, lásd sw.js)
   2) diszkrét "Telepítés" kártya, ha a böngésző engedi
   3) iOS/Safari alatt rövid útmutató, mert ott nincs telepítő gomb
   A kalkulátor működéséhez semmi köze — ha ez a fájl nem tölt be, az oldal
   ugyanúgy működik. */
(function () {
  "use strict";

  var DISMISS_KEY = "mk-pwa-dismiss";
  var DISMISS_DAYS = 30;

  /* ---------- service worker ---------- */
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  /* ---------- állapot ---------- */
  var standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (standalone) return;

  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  function dismissed() {
    try {
      var t = +localStorage.getItem(DISMISS_KEY);
      return !!t && Date.now() - t < DISMISS_DAYS * 864e5;
    } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  /* ---------- stílus ---------- */
  function injectStyle() {
    if (document.getElementById("pwa-style")) return;
    var s = document.createElement("style");
    s.id = "pwa-style";
    s.textContent =
      "#pwa-card{display:flex;align-items:center;gap:12px;margin-top:20px;padding:13px 14px;" +
      "border:var(--bw,2px) solid var(--ink,#0B0B0B);background:var(--card,#FFFFFF);" +
      "border-radius:var(--r,3px);box-shadow:3px 3px 0 var(--ink,#0B0B0B);}" +
      "#pwa-card .pi{flex:none;width:34px;height:34px;border-radius:2px;" +
      "background:var(--accent,#0B0B0B);color:var(--on-accent,#FFD62E);" +
      "display:flex;align-items:center;justify-content:center;}" +
      "#pwa-card .pi svg{width:18px;height:18px;display:block;}" +
      "#pwa-card .px{flex:1;min-width:0;font-size:12.5px;line-height:1.45;color:var(--muted,#57513D);}" +
      "#pwa-card .px b{display:block;font-size:14px;font-weight:400;color:var(--ink,#0B0B0B);" +
      "font-family:var(--display,inherit);text-transform:uppercase;letter-spacing:-.01em;" +
      "margin-bottom:2px;}" +
      "#pwa-card .pb{flex:none;border:var(--bw,2px) solid var(--ink,#0B0B0B);" +
      "background:var(--accent,#0B0B0B);color:var(--on-accent,#FFD62E);font-weight:700;" +
      "font-size:12.5px;text-transform:uppercase;letter-spacing:.05em;border-radius:var(--r,3px);" +
      "padding:9px 14px;font-family:inherit;cursor:pointer;}" +
      "#pwa-card .pb:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 var(--ink,#0B0B0B);}" +
      "#pwa-card .pb:active{transform:translate(1px,1px);box-shadow:none;}" +
      "#pwa-card .pc{flex:none;border:none;background:transparent;color:var(--ink,#0B0B0B);opacity:.5;" +
      "font-size:19px;line-height:1;padding:4px 2px;cursor:pointer;font-family:inherit;}" +
      "#pwa-card .pc:hover{opacity:1;}" +
      "@media (max-width:520px){#pwa-card{flex-wrap:wrap;row-gap:10px;}" +
      "#pwa-card .pc{margin-left:auto;}#pwa-card .px{flex:1 1 100%;order:2;}" +
      "#pwa-card .pb{order:3;flex:1 1 100%;padding:11px 14px;}}";
    document.head.appendChild(s);
  }

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>';

  function mount(node) {
    var anchor = document.querySelector(".wrap .lede") || document.querySelector(".wrap h1");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling);
    else document.body.insertBefore(node, document.body.firstChild);
  }

  function close() {
    var c = document.getElementById("pwa-card");
    if (c && c.parentNode) c.parentNode.removeChild(c);
    remember();
  }

  function card(textHTML, buttonLabel, onClick) {
    injectStyle();
    var d = document.createElement("div");
    d.id = "pwa-card";
    d.innerHTML =
      '<span class="pi">' + ICON + "</span>" +
      '<span class="px">' + textHTML + "</span>" +
      (buttonLabel ? '<button type="button" class="pb">' + buttonLabel + "</button>" : "") +
      '<button type="button" class="pc" aria-label="Elrejtés">&times;</button>';
    d.querySelector(".pc").addEventListener("click", close);
    if (buttonLabel) d.querySelector(".pb").addEventListener("click", onClick);
    mount(d);
    return d;
  }

  /* ---------- Chrome / Edge / Samsung: valódi telepítés ---------- */
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (dismissed() || document.getElementById("pwa-card")) return;
    card(
      "<b>Tedd fel a telefonodra</b>Alkalmazásként nyílik, böngészősáv nélkül — a főképernyőről egy koppintás.",
      "Telepítés",
      function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(function () {
          deferred = null;
          close();
        });
      }
    );
  });

  window.addEventListener("appinstalled", function () {
    deferred = null;
    var c = document.getElementById("pwa-card");
    if (c && c.parentNode) c.parentNode.removeChild(c);
  });

  /* ---------- iOS: nincs telepítő gomb, csak útmutató ---------- */
  if (isIOS && isSafari && !dismissed()) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        if (document.getElementById("pwa-card")) return;
        card(
          "<b>Tedd fel a főképernyődre</b>Koppints alul a megosztás ikonra, majd a " +
          "<b style=\"display:inline\">Főképernyőhöz adás</b> menüpontra — ezután alkalmazásként nyílik.",
          "", null
        );
      }, 1200);
    });
  }
})();

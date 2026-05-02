/**
 * Na und? — Settings Init
 * Muss als erstes Script im <head> stehen (vor CSS).
 * Liest localStorage und setzt data-theme, font-size und --content-width
 * sofort auf <html>, damit kein FOUC entsteht.
 */
(function () {
  var dark  = localStorage.getItem('naund-dark');
  var pDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = dark === '1' ? 'dark' : dark === '0' ? 'light' : (pDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  var fontSize = localStorage.getItem('naund-font-size');
  if (fontSize) {
    document.documentElement.style.fontSize = parseInt(fontSize, 10) + 'px';
  }
})();

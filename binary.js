// Binary field: columns of 0s and 1s that swell and shrink,
// as if the digits themselves are producing the picture.
(function () {
  var c = document.getElementById('binary'); if (!c) return;
  var ctx = c.getContext('2d'), W, H, cols = [], t = 0;
  function size() {
    W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; cols = [];
    var n = Math.floor(W / 26);
    for (var i = 0; i < n; i++) cols.push({ x: i * 26 + 13, ph: Math.random() * 6.28, sp: .008 + Math.random() * .02, ch: [] });
    cols.forEach(function (col) { var m = Math.ceil(H / 22); for (var j = 0; j < m; j++) col.ch.push(Math.random() < .5 ? '0' : '1'); });
  }
  size(); window.addEventListener('resize', size);
  (function draw() {
    t++; ctx.clearRect(0, 0, W, H); ctx.textAlign = 'center';
    cols.forEach(function (col) {
      col.ch.forEach(function (g, j) {
        var s = 11 + 8 * (0.5 + 0.5 * Math.sin(t * col.sp * 3 + col.ph + j * .55));
        ctx.font = '700 ' + s.toFixed(1) + 'px ui-monospace, Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(160,205,235,' + (0.25 + 0.45 * Math.abs(Math.sin(t * col.sp + j))) + ')';
        ctx.fillText(g, col.x, j * 22 + 18);
        if (Math.random() < .0015) col.ch[j] = g === '0' ? '1' : '0';
      });
    });
    requestAnimationFrame(draw);
  })();
})();

// Home-screen app: register the service worker (added 2026-11-12).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}

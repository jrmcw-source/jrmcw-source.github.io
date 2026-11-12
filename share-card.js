// share-card.js — one result card for the games at jaiou.com.
// attach(container, card) puts two buttons in the container:
//   Copy card   — the result as text, for pasting into a chat
//   Save image  — the result as a picture (1200x630 canvas), for posting
// card = { text, filename, image: { bg, accent, title, lines: [..] } }
(function () {
  function copyText(text, btn) {
    function done(ok) {
      var old = btn.textContent;
      btn.textContent = ok ? "Copied" : "Select the card text above";
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { legacy(); });
    } else { legacy(); }
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      done(ok);
    }
  }

  function saveImage(img, filename) {
    var c = document.createElement("canvas");
    c.width = 1200; c.height = 630;
    var x = c.getContext("2d");
    x.fillStyle = img.bg || "#17301f";
    x.fillRect(0, 0, 1200, 630);
    x.fillStyle = img.accent || "#e8c268";
    x.fillRect(0, 0, 1200, 16);
    x.fillRect(0, 614, 1200, 16);
    x.textAlign = "center";
    x.fillStyle = img.accent || "#e8c268";
    x.font = "600 30px Georgia, 'Times New Roman', serif";
    x.fillText("j A I o u", 600, 108);
    x.fillStyle = "#ffffff";
    x.font = "bold 72px Georgia, 'Times New Roman', serif";
    wrapTitle(x, img.title || "", 600, 240, 1000, 84);
    x.font = "34px Georgia, 'Times New Roman', serif";
    x.fillStyle = "rgba(255,255,255,0.88)";
    (img.lines || []).forEach(function (ln, i) {
      x.fillText(ln, 600, 430 + i * 52);
    });
    var a = document.createElement("a");
    a.download = filename || "jaiou-card.png";
    a.href = c.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function wrapTitle(x, text, cx, y, maxWidth, lineHeight) {
    if (x.measureText(text).width <= maxWidth) { x.fillText(text, cx, y); return y; }
    var words = text.split(" ");
    var line = "", yy = y - lineHeight / 2;
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (x.measureText(t).width > maxWidth && line) { x.fillText(line, cx, yy); yy += lineHeight; line = w; }
      else line = t;
    });
    if (line) x.fillText(line, cx, yy);
    return yy;
  }

  function attach(container, card) {
    if (!container || !card) return;
    var old = container.querySelector(".share-row");
    if (old) old.remove();
    var row = document.createElement("div");
    row.className = "share-row";
    var b1 = document.createElement("button");
    b1.type = "button";
    b1.className = "share-btn";
    b1.textContent = "Copy card";
    b1.addEventListener("click", function () { copyText(card.text, b1); });
    var b2 = document.createElement("button");
    b2.type = "button";
    b2.className = "share-btn";
    b2.textContent = "Save image";
    b2.addEventListener("click", function () { saveImage(card.image || {}, card.filename); });
    row.appendChild(b1);
    row.appendChild(b2);
    container.appendChild(row);
  }

  window.JaiouShare = { attach: attach };
})();

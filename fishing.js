// fishing.js — the river at jaiou.com.
// One button: Cast, then Strike when the bobber goes under. Landing Old
// Whiskers mints a fishing-badge claim code from the guestbook Worker.
(function () {
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var btn = document.getElementById("fish-btn");
  var status = document.getElementById("fish-status");
  var result = document.getElementById("fish-result");
  var prize = document.getElementById("fish-prize");
  var codeLine = document.getElementById("fish-code");
  var statsEl = document.getElementById("fish-stats");
  var logEl = document.getElementById("fish-log");
  var bobber = document.getElementById("bobber");
  var line = document.getElementById("line");
  var splash = document.getElementById("splash");
  if (!btn || !bobber) return;

  // name, weight range in lb (null = no weight), share of the bite, flavor line
  var RIVER = [
    { name: "Bluegill", min: 0.2, max: 1.1, share: 31, line: "Small, honest, and always hungry." },
    { name: "Largemouth bass", min: 1.0, max: 6.5, share: 24, line: "Put up a fight about it, too." },
    { name: "Guadalupe bass", min: 0.5, max: 3.2, share: 14, line: "The Texas state fish, right where he belongs." },
    { name: "Channel catfish", min: 2.0, max: 14.0, share: 11, line: "Whiskers — but not the whiskers." },
    { name: "Rio Grande cichlid", min: 0.3, max: 1.6, share: 6, line: "The only cichlid native to the country, right here in the Blanco." },
    { name: "Flathead catfish", min: 5.0, max: 38.0, share: 5, line: "A serious fish. Not the legend, but serious." },
    { name: "Gar", min: 2.0, max: 42.0, share: 3, line: "Long as a telephone pole. Well — a big gar." },
    { name: "The old boot", min: null, max: null, share: 4, line: "Not a fish. The river gives back what it gets." },
    { name: "Old Whiskers", min: 55.0, max: 72.0, share: 2, line: "Every story was true." },
  ];

  function store() {
    try { return JSON.parse(localStorage.getItem("jaiou_fishing") || "{}"); } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem("jaiou_fishing", JSON.stringify(s)); } catch (e) {}
  }

  var state = "idle"; // idle | waiting | bite
  var timers = [];
  var bobX = 480, bobY = 208;
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function placeBobber(dip) {
    bobber.setAttribute("transform", "translate(" + bobX + "," + (bobY + (dip || 0)) + ")");
    splash.setAttribute("transform", "translate(" + bobX + "," + bobY + ")");
    line.setAttribute("x2", bobX);
    line.setAttribute("y2", bobY - 14 + (dip || 0));
  }

  function paintStringer() {
    var s = store();
    if (!statsEl || !logEl) return;
    if (!s.casts) { statsEl.textContent = "No casts yet."; logEl.textContent = ""; return; }
    statsEl.textContent = s.casts + (s.casts === 1 ? " cast" : " casts") + " · " +
      (s.caught || 0) + " caught" +
      (s.best ? " · best: " + s.best.name + ", " + s.best.weight.toFixed(1) + " lb" : "");
    logEl.textContent = "";
    (s.log || []).forEach(function (c) {
      var li = document.createElement("li");
      li.textContent = c.weight ? c.name + " — " + c.weight.toFixed(1) + " lb" : c.name;
      logEl.appendChild(li);
    });
  }

  function reset(delay) {
    later(function () {
      state = "idle";
      btn.textContent = "Cast";
      bobber.setAttribute("opacity", "0");
      line.setAttribute("opacity", "0");
      splash.setAttribute("opacity", "0");
    }, delay || 0);
  }

  function cast() {
    clearTimers();
    result.hidden = true;
    state = "waiting";
    var s = store(); s.casts = (s.casts || 0) + 1; save(s); paintStringer();
    bobX = 380 + Math.random() * 340;
    bobY = 190 + Math.random() * 60;
    placeBobber(0);
    bobber.setAttribute("opacity", "1");
    line.setAttribute("opacity", "0.85");
    btn.textContent = "Strike!";
    status.textContent = "Out there. Watch the bobber…";
    // Nibbles first — little dips that mean something is thinking about it.
    var nibbles = 1 + Math.floor(Math.random() * 3);
    for (var i = 0; i < nibbles; i++) {
      (function (t) {
        later(function () {
          if (state !== "waiting") return;
          placeBobber(4);
          status.textContent = "A nibble…";
          later(function () { if (state === "waiting") { placeBobber(0); status.textContent = "Watch the bobber…"; } }, 260);
        }, t);
      })(1200 + i * 1500 + Math.random() * 900);
    }
    later(function () {
      if (state !== "waiting") return;
      state = "bite";
      placeBobber(13);
      splash.setAttribute("opacity", "1");
      status.textContent = "He's on — strike!";
      later(function () {
        if (state !== "bite") return;
        status.textContent = "It got away.";
        reset(1400);
      }, 2200);
    }, 4200 + Math.random() * 6500);
  }

  function pickCatch() {
    var total = RIVER.reduce(function (a, f) { return a + f.share; }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < RIVER.length; i++) {
      roll -= RIVER[i].share;
      if (roll <= 0) return RIVER[i];
    }
    return RIVER[0];
  }

  function showPrize() {
    prize.hidden = false;
    var s = store();
    if (s.code) {
      codeLine.innerHTML = "";
      codeLine.appendChild(document.createTextNode("Your badge claim code: "));
      var strong = document.createElement("strong");
      strong.textContent = s.code;
      codeLine.appendChild(strong);
      return;
    }
    fetch(API + "/badge/issue?kind=fishing")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.code) throw new Error("no code");
        var st = store(); st.code = d.code; save(st);
        showPrize();
      })
      .catch(function () {
        codeLine.textContent = "The badge is yours — the claim code didn't come through just now. Cast again later and it will be waiting.";
      });
  }

  function strike() {
    if (state === "idle") { cast(); return; }
    if (state === "waiting") {
      clearTimers();
      status.textContent = "Too soon — you snatched it right out from under him.";
      reset(1200);
      return;
    }
    // state === "bite"
    clearTimers();
    splash.setAttribute("opacity", "0");
    var f = pickCatch();
    var s = store();
    s.caught = (s.caught || 0) + 1;
    var weight = f.min === null ? null : f.min + Math.random() * (f.max - f.min);
    s.log = s.log || [];
    s.log.unshift({ name: f.name, weight: weight });
    s.log = s.log.slice(0, 8);
    if (weight && (!s.best || weight > s.best.weight)) s.best = { name: f.name, weight: weight };
    save(s);
    paintStringer();
    result.hidden = false;
    result.textContent = "";
    var head = document.createElement("p");
    head.className = "fish-catchname";
    head.textContent = weight ? f.name + " — " + weight.toFixed(1) + " lb" : f.name;
    result.appendChild(head);
    var sub = document.createElement("p");
    sub.className = "fish-catchline";
    sub.textContent = f.line;
    result.appendChild(sub);
    status.textContent = "Got him.";
    if (f.name === "Old Whiskers") showPrize();
    reset(400);
  }

  btn.addEventListener("click", strike);
  document.getElementById("fish-scene").addEventListener("click", function () {
    if (state !== "idle") strike();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.code === "Space" && state !== "idle") { ev.preventDefault(); strike(); }
  });

  paintStringer();
})();

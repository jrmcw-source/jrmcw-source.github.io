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
    { name: "Bluegill", min: 0.2, max: 1.1, share: 27, line: "Small, honest, and always hungry." },
    { name: "Largemouth bass", min: 1.0, max: 6.5, share: 23, line: "Put up a fight about it, too." },
    { name: "Guadalupe bass", min: 0.5, max: 3.2, share: 14, line: "The Texas state fish, right where he belongs." },
    { name: "Channel catfish", min: 2.0, max: 14.0, share: 10, line: "Whiskers — but not the whiskers." },
    { name: "Rio Grande cichlid", min: 0.3, max: 1.6, share: 6, line: "The only cichlid native to the country, right here in the Blanco." },
    { name: "Flathead catfish", min: 5.0, max: 38.0, share: 5, line: "A serious fish. Not the legend, but serious." },
    { name: "Gar", min: 2.0, max: 42.0, share: 3, line: "Long as a telephone pole. Well — a big gar." },
    { name: "The old boot", min: null, max: null, share: 3, line: "Not a fish. The river gives back what it gets." },
    { name: "Mud eel", min: null, max: null, share: 2, line: "Nasty thing. Nobody wants an eel on their line." },
    { name: "Water moccasin", min: null, max: null, share: 2, line: "He came for the bobber. Derek could tell you — some of them will chase you. Cut the line." },
    { name: "Turtle", min: null, max: null, share: 2, line: "Put him back gentle. He lives here too." },
    { name: "Dad's old rowboat", min: null, max: null, share: 1, line: "Still down there. Some things the river keeps." },
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

  // The checklist keeps every species ever met in this browser. Older
  // stringers predate it, so it seeds itself from the log and the best fish.
  function seedSpecies(s) {
    var map = {};
    (s.log || []).forEach(function (c) {
      var rec = map[c.name] || { n: 0, best: null };
      rec.n += 1;
      if (c.weight && (!rec.best || c.weight > rec.best)) rec.best = c.weight;
      map[c.name] = rec;
    });
    if (s.best) {
      var rec = map[s.best.name] || { n: 0, best: null };
      if (!rec.best || s.best.weight > rec.best) rec.best = s.best.weight;
      if (!rec.n) rec.n = 1;
      map[s.best.name] = rec;
    }
    return map;
  }

  var checkEl = document.getElementById("fish-checklist");
  var checkCountEl = document.getElementById("fish-checkcount");
  function paintChecklist(s) {
    if (!checkEl) return;
    if (!s.species) { s.species = seedSpecies(s); save(s); }
    var met = 0;
    checkEl.textContent = "";
    RIVER.forEach(function (f) {
      var rec = s.species[f.name];
      var row = document.createElement("div");
      row.className = "check-row" + (rec ? "" : " check-miss");
      var left = document.createElement("span");
      var mark = document.createElement("span");
      mark.className = "check-mark";
      mark.textContent = rec ? "✓ " : "· ";
      left.appendChild(mark);
      left.appendChild(document.createTextNode(f.name));
      var right = document.createElement("span");
      right.className = "lb-right";
      if (rec) {
        met += 1;
        right.textContent = (rec.n > 1 ? "×" + rec.n + " " : "") + (rec.best ? "best " + rec.best.toFixed(1) + " lb" : "met");
      } else {
        right.textContent = "not yet";
      }
      row.appendChild(left);
      row.appendChild(right);
      checkEl.appendChild(row);
    });
    if (checkCountEl) checkCountEl.textContent = met + " of " + RIVER.length + " caught so far";
  }

  function paintStringer() {
    var s = store();
    paintChecklist(s);
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
    if (!s.species) s.species = seedSpecies(s);
    var rec = s.species[f.name] || { n: 0, best: null };
    rec.n += 1;
    if (weight && (!rec.best || weight > rec.best)) rec.best = weight;
    s.species[f.name] = rec;
    save(s);
    paintStringer();
    if (weight) submitCatch(f.name, weight);
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
    if (window.JaiouShare) {
      var cardTitle = weight ? f.name + " — " + weight.toFixed(1) + " lb" : f.name;
      window.JaiouShare.attach(result, {
        text: "🎣 " + cardTitle + "\n" + f.line + "\nBlanco River fishing at jAIou — jaiou.com/fishing.html",
        filename: "jaiou-fishing.png",
        image: { bg: "#14342a", accent: "#e8c268", title: cardTitle, lines: [f.line, "Blanco River · jaiou.com"] },
      });
    }
    status.textContent = "Got him.";
    if (f.name === "Old Whiskers") showPrize();
    reset(400);
  }

  // The leaderboard: everybody fishes in their own browser, all at once if
  // they like — the board is shared, and it keeps the bragging.
  var nameInput = document.getElementById("angler-name");
  var boardBox = document.getElementById("fish-board");
  var bassLine = document.getElementById("fish-bass");

  if (nameInput) {
    nameInput.value = store().name || "";
    nameInput.addEventListener("change", function () {
      var s = store();
      s.name = nameInput.value.trim().slice(0, 40);
      save(s);
    });
  }

  function submitCatch(species, weight) {
    var s = store();
    if (!s.name) return;
    fetch(API + "/catch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: s.name, species: species, weight: Math.round(weight * 10) / 10 }),
    }).then(function () { loadBoard(); }).catch(function () { /* your stringer still keeps the fish */ });
  }

  function fmtDate(iso) {
    var d = new Date(String(iso).replace(" ", "T") + "Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
  }

  function renderBoard(data) {
    if (!boardBox) return;
    var top = data.top || [];
    boardBox.textContent = "";
    if (!top.length) {
      var p = document.createElement("p");
      p.className = "gb-empty";
      p.textContent = boardSeason === "now" ? "No fish this month yet. Yours could be the first." : "No fish on the board yet. Yours could be the first.";
      boardBox.appendChild(p);
    } else {
      top.forEach(function (c, i) {
        var row = document.createElement("div");
        row.className = "lb-row";
        var left = document.createElement("span");
        left.textContent = (i + 1) + ". " + c.species;
        var right = document.createElement("span");
        right.className = "lb-right";
        right.textContent = Number(c.weight).toFixed(1) + " lb — " + c.name + " · " + fmtDate(c.created_at);
        row.appendChild(left);
        row.appendChild(right);
        boardBox.appendChild(row);
      });
    }
    if (bassLine) {
      bassLine.textContent = data.bass
        ? Number(data.bass.weight).toFixed(1) + " lb " + data.bass.species.toLowerCase() + " — " + data.bass.name
        : "no bass yet";
    }
  }

  var boardSeason = "now"; // "now" | "all"
  function loadBoard() {
    if (!boardBox) return;
    var url = API + "/board";
    if (boardSeason === "now") url += "?season=" + new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }).slice(0, 7);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(renderBoard)
      .catch(function () { /* the fishing still works without the board */ });
  }

  var seasonNowBtn = document.getElementById("fish-season-now");
  var seasonAllBtn = document.getElementById("fish-season-all");
  function paintSeason() {
    if (!seasonNowBtn || !seasonAllBtn) return;
    seasonNowBtn.classList.toggle("board-season-on", boardSeason === "now");
    seasonAllBtn.classList.toggle("board-season-on", boardSeason === "all");
  }
  if (seasonNowBtn && seasonAllBtn) {
    seasonNowBtn.addEventListener("click", function () { if (boardSeason !== "now") { boardSeason = "now"; paintSeason(); loadBoard(); } });
    seasonAllBtn.addEventListener("click", function () { if (boardSeason !== "all") { boardSeason = "all"; paintSeason(); loadBoard(); } });
  }

  btn.addEventListener("click", strike);
  document.getElementById("fish-scene").addEventListener("click", function () {
    if (state !== "idle") strike();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.code === "Space" && state !== "idle") { ev.preventDefault(); strike(); }
  });

  paintStringer();
  loadBoard();
})();

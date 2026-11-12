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
      var rec = map[c.name] || { n: 0, best: null, tot: 0 };
      rec.n += 1;
      if (c.weight) {
        if (!rec.best || c.weight > rec.best) rec.best = c.weight;
        rec.tot = (rec.tot || 0) + c.weight;
      }
      map[c.name] = rec;
    });
    if (s.best) {
      var rec = map[s.best.name] || { n: 0, best: null, tot: 0 };
      if (!rec.best || s.best.weight > rec.best) rec.best = s.best.weight;
      if (!rec.n) rec.n = 1;
      if (!rec.tot) rec.tot = s.best.weight;
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
    paintGold(s);
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
    paintTotals(s);
  }

  // The stringer by species: how many of each, and their weight all
  // together — "Bluegill — 10.9 lbs (5 total)" (Jason, 2026-11-12).
  var totalsEl = document.getElementById("fish-totals");
  function paintTotals(s) {
    if (!totalsEl) return;
    totalsEl.textContent = "";
    if (!s.species) return;
    var seeded = null, dirty = false;
    RIVER.forEach(function (f) {
      var rec = s.species[f.name];
      if (!rec || !rec.n) return;
      if (rec.tot == null) {
        if (!seeded) seeded = seedSpecies(s);
        rec.tot = seeded[f.name] ? seeded[f.name].tot || 0 : 0;
        dirty = true;
      }
      var li = document.createElement("li");
      li.textContent = rec.tot
        ? f.name + " — " + rec.tot.toFixed(1) + " lbs (" + rec.n + " total)"
        : f.name + " (" + rec.n + " total)";
      totalsEl.appendChild(li);
    });
    if (dirty) save(s);
  }

  function reset(delay) {
    later(function () {
      state = "idle";
      btn.textContent = "Cast";
      btn.disabled = false;
      bobber.setAttribute("opacity", "0");
      line.setAttribute("opacity", "0");
      splash.setAttribute("opacity", "0");
    }, delay || 0);
  }

  // The caught fish, drawn: one silhouette, colored by species, sized
  // by the weight on the line. The gar and the eel run long and thin.
  var FISH_ART = {
    "Bluegill": ["#88a04f", 1, 1],
    "Largemouth bass": ["#5d8a4e", 1, 1],
    "Guadalupe bass": ["#6f9455", 1, 1],
    "Rio Grande cichlid": ["#7fb3b0", 1, 1],
    "Channel catfish": ["#7d8aa0", 1, 1],
    "Flathead catfish": ["#8a7a5a", 1, 1],
    "Old Whiskers": ["#6e5a3e", 1, 1],
    "Gar": ["#9aa06a", 1.35, 0.8],
    "Mud eel": ["#5a6e46", 1.3, 0.5]
  };
  function fishFigure(name, weight) {
    var spec = FISH_ART[name];
    if (!spec) return null;
    var w = weight ? Math.round(90 + Math.sqrt(weight) * 36) : 130;
    if (w > 340) w = 340;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 300 120");
    svg.setAttribute("width", String(w));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", name);
    svg.style.maxWidth = "92%";
    svg.style.height = "auto";
    svg.innerHTML =
      '<g transform="translate(150,60) scale(' + spec[1] + "," + spec[2] + ') translate(-150,-60)">' +
      '<path d="M18,60 C60,18 150,10 208,42 L262,14 C250,40 250,80 262,106 L208,78 C150,110 60,102 18,60 Z" fill="' + spec[0] + '"/>' +
      '<path d="M95,22 C112,8 142,6 158,17 C140,18 118,20 95,22 Z" fill="rgba(0,0,0,0.22)"/>' +
      '<path d="M122,28 C136,44 136,76 122,94 C130,76 130,45 122,28 Z" fill="rgba(0,0,0,0.16)"/>' +
      '<circle cx="52" cy="52" r="7" fill="#fdfcf8"/><circle cx="52" cy="52" r="3.6" fill="#1c1c1c"/>' +
      "</g>";
    var wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    wrap.appendChild(svg);
    return wrap;
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
    // The sink timer runs random, both ends of it (Jason, 2026-11-12):
    // three to nine seconds until the bobber goes under, and three to
    // nine seconds that it stays under before the fish is gone.
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
      }, 3000 + Math.random() * 6000);
    }, 3000 + Math.random() * 6000);
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

  // The fishing ladder: repeat Whiskers grows bars on the badge, and the
  // whole river caught earns the gold. The rungs are a mystery — the page
  // never says where the next one stands; the badge simply changes.
  var FISH_TIERS = {
    fishing: { art: "images/badge-fishing.svg", win: "<strong>You landed Old Whiskers.</strong> The fishing badge is yours." },
    fishing1: { art: "images/badge-fishing1.svg", win: "<strong>Old Whiskers, again.</strong> The badge grew a bar." },
    fishing2: { art: "images/badge-fishing2.svg", win: "<strong>A third Whiskers.</strong> Two bars on the badge now." },
    fishing3: { art: "images/badge-fishing3.svg", win: "<strong>Five Whiskers.</strong> Three bars. The river knows your name." },
  };
  function fishTier(w) {
    return w >= 5 ? "fishing3" : w >= 3 ? "fishing2" : w >= 2 ? "fishing1" : w >= 1 ? "fishing" : null;
  }
  function codesOf(s) {
    if (!s.codes) { s.codes = {}; if (s.code) s.codes.fishing = s.code; }
    return s.codes;
  }
  function setCodeLine(elm, code) {
    elm.innerHTML = "";
    elm.appendChild(document.createTextNode("Your badge claim code: "));
    var strong = document.createElement("strong");
    strong.textContent = code;
    elm.appendChild(strong);
  }
  var prizeImg = document.getElementById("fish-prizebadge");
  var prizeWin = document.getElementById("fish-prizewin");
  function showPrize(kind) {
    var t = FISH_TIERS[kind];
    if (!t) return;
    prize.hidden = false;
    if (prizeImg) prizeImg.src = t.art;
    if (prizeWin) prizeWin.innerHTML = t.win;
    var s = store();
    var codes = codesOf(s);
    save(s);
    if (codes[kind]) { setCodeLine(codeLine, codes[kind]); return; }
    codeLine.textContent = "Fetching your claim code…";
    fetch(API + "/badge/issue?kind=" + kind)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.code) throw new Error("no code");
        var st = store(); codesOf(st)[kind] = d.code; save(st);
        showPrize(kind);
      })
      .catch(function () {
        codeLine.textContent = "The badge is yours — the claim code didn't come through just now. Cast again later and it will be waiting.";
      });
  }

  var goldEl = document.getElementById("fish-gold");
  var goldCode = document.getElementById("fish-gold-code");
  var goldFetching = false;
  function paintGold(s) {
    if (!goldEl) return;
    var met = 0;
    RIVER.forEach(function (f) { if (s.species && s.species[f.name]) met += 1; });
    if (met < RIVER.length) { goldEl.hidden = true; return; }
    goldEl.hidden = false;
    var codes = codesOf(s);
    if (codes.fishingg) { setCodeLine(goldCode, codes.fishingg); return; }
    if (goldFetching) return;
    goldFetching = true;
    fetch(API + "/badge/issue?kind=fishingg")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.code) throw new Error("no code");
        var st = store(); codesOf(st).fishingg = d.code; save(st);
        setCodeLine(goldCode, d.code);
      })
      .catch(function () {
        goldFetching = false;
        goldCode.textContent = "The gold badge is yours — the claim code didn't come through just now. It will be waiting here.";
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
    if (state !== "bite") return; // fighting — the click waits its turn
    // The fight (Jason, 2026-11-12): what was caught stays under the
    // water a while, and the wait runs on the size of the fish — a
    // bluegill shows himself quick, a big flathead takes his time.
    clearTimers();
    var f = pickCatch();
    var weight = f.min === null ? null : f.min + Math.random() * (f.max - f.min);
    state = "fighting";
    btn.disabled = true;
    btn.textContent = "Reeling…";
    status.textContent = "On the line — hold on…";
    splash.setAttribute("opacity", "1");
    placeBobber(10);
    var delay = weight ? Math.min(500 + weight * 70, 5000) : 600;
    later(function () { revealCatch(f, weight); }, delay);
  }

  function revealCatch(f, weight) {
    splash.setAttribute("opacity", "0");
    btn.disabled = false;
    var s = store();
    s.caught = (s.caught || 0) + 1;
    s.log = s.log || [];
    s.log.unshift({ name: f.name, weight: weight });
    s.log = s.log.slice(0, 8);
    if (weight && (!s.best || weight > s.best.weight)) s.best = { name: f.name, weight: weight };
    if (!s.species) s.species = seedSpecies(s);
    var rec = s.species[f.name] || { n: 0, best: null, tot: 0 };
    rec.n += 1;
    if (weight) {
      if (!rec.best || weight > rec.best) rec.best = weight;
      rec.tot = (rec.tot || 0) + weight;
    }
    s.species[f.name] = rec;
    save(s);
    paintStringer();
    if (weight) submitCatch(f.name, weight);
    result.hidden = false;
    result.textContent = "";
    var fig = fishFigure(f.name, weight);
    if (fig) result.appendChild(fig);
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
    if (f.name === "Old Whiskers") showPrize(fishTier(s.species["Old Whiskers"].n));
    reset(400);
    // The catch shows above the river — bring it into view so nobody
    // has to scroll to see what they caught.
    if (result.scrollIntoView) result.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

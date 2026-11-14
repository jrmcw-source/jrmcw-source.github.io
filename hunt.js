// hunt.js — the Domain Hunt at jaiou.com.
// Five tries a day, counted on the server. A find is told to its finder
// on his own screen (the win panel and his own tries list, both in his
// browser only) and is never published — not on the board, not anywhere
// public. The owner's email copy of every find stands, as it always has.
(function () {
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var nameInput = document.getElementById("hunt-name");
  var candInput = document.getElementById("hunt-candidate");
  var btn = document.getElementById("hunt-btn");
  var status = document.getElementById("hunt-status");
  var meta = document.getElementById("hunt-meta");
  var prize = document.getElementById("hunt-prize");
  var codeEl = document.getElementById("hunt-code");
  var prizeImg = document.getElementById("hunt-prizebadge");
  var prizeWin = document.getElementById("hunt-prizewin");
  var triesWrap = document.getElementById("hunt-tries-wrap");
  var triesList = document.getElementById("hunt-tries");
  var gbLink = document.getElementById("hunt-gblink");
  if (!btn || !candInput) return;

  // The Hunt ladder: repeat finds change the badge. The server counts the
  // finds and names the rung; the page just wears what it is handed.
  var HUNT_TIERS = {
    hunt: { art: "images/badge-hunt.svg", win: "<strong>You found one.</strong>" },
    hunt1: { art: "images/badge-hunt1.svg", win: "<strong>You found another.</strong> The badge grew a bar." },
    hunt2: { art: "images/badge-hunt2.svg", win: "<strong>A third find.</strong> Two bars on the badge now." },
    hunt3: { art: "images/badge-hunt3.svg", win: "<strong>A fourth find.</strong> Three bars on the badge now." },
    huntg: { art: "images/badge-huntg.svg", win: "<strong>A fifth find.</strong> The badge turned gold." },
  };

  function store() {
    try { return JSON.parse(localStorage.getItem("jaiou_hunt") || "{}"); } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem("jaiou_hunt", JSON.stringify(s)); } catch (e) {}
  }
  function chicagoDay(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  }

  var s0 = store();
  nameInput.value = s0.name || "";
  nameInput.addEventListener("change", function () {
    var s = store();
    s.name = nameInput.value.trim().slice(0, 40);
    save(s);
  });
  candInput.addEventListener("input", function () {
    candInput.value = candInput.value.toLowerCase().replace(/[^a-z]/g, "");
  });
  candInput.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); tryOne(); }
  });

  function paintMeta(triesLeft) {
    var s = store();
    var parts = [];
    if (typeof triesLeft === "number") parts.push(triesLeft + (triesLeft === 1 ? " try" : " tries") + " left today");
    if (s.streak) parts.push("hunting streak: " + s.streak + (s.streak === 1 ? " day" : " days"));
    if (s.finds) parts.push("finds so far: " + s.finds);
    meta.textContent = parts.join(" · ");
  }

  // The tries list: every candidate the registry answered about today, in
  // the order tried, kept in this browser only — the hunter's own record.
  // A find shows its name here; this list never leaves his browser.
  function todaysTries() {
    var s = store();
    if (s.triesDay !== chicagoDay(0) || !Array.isArray(s.tries)) return [];
    return s.tries;
  }
  function paintTries() {
    if (!triesWrap || !triesList) return;
    var tries = todaysTries();
    triesList.textContent = "";
    tries.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t.f ? t.c + ".com — found it" : t.c + ".com";
      triesList.appendChild(li);
    });
    triesWrap.hidden = tries.length === 0;
  }
  function recordTry(candidate, found) {
    var s = store();
    var today = chicagoDay(0);
    if (s.triesDay !== today || !Array.isArray(s.tries)) { s.tries = []; s.triesDay = today; }
    s.tries.push({ c: candidate, f: found ? 1 : 0 });
    save(s);
    paintTries();
  }

  function markHunted() {
    var s = store();
    var today = chicagoDay(0);
    if (s.lastDay !== today) {
      s.streak = s.lastDay === chicagoDay(-1) ? (s.streak || 0) + 1 : 1;
      s.lastDay = today;
      save(s);
    }
  }

  var busy = false;
  function tryOne() {
    if (busy) return;
    var candidate = candInput.value.trim().toLowerCase();
    if (!/^[a-z]+$/.test(candidate)) {
      status.textContent = "Type a name to try.";
      return;
    }
    busy = true;
    btn.disabled = true;
    status.textContent = "Asking the registry…";
    fetch(API + "/hunt/try", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.value.trim().slice(0, 40), candidate: candidate }),
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        var d = res.data || {};
        candInput.value = "";
        if (res.status === 429) {
          status.textContent = "That's the five for today. The hunt opens again tomorrow.";
          paintMeta(0);
          return;
        }
        if (typeof d.tries_left === "number") markHunted();
        if (d.found) {
          recordTry(candidate, true);
          var s = store();
          s.finds = typeof d.finds === "number" ? d.finds : (s.finds || 0) + 1;
          save(s);
          status.textContent = "You found one.";
          var tier = HUNT_TIERS[d.badge_kind] || HUNT_TIERS.hunt;
          if (prizeImg) prizeImg.src = tier.art;
          if (prizeWin) {
            prizeWin.innerHTML = d.badge_kind === "huntg" && d.finds > 5
              ? "<strong>Another find.</strong> The gold badge stands."
              : tier.win;
            // The finder is told his own name — on his screen only. It is
            // never published and never shows on the board.
            prizeWin.innerHTML += " The name is <strong>" + candidate + ".com</strong> — yours to know. It isn't published, and it never shows on the board.";
          }
          prize.hidden = false;
          codeEl.textContent = d.code ? "Your claim code: " + d.code : "The badge is yours — the claim code didn't come through just now. The find is written down all the same.";
          // The guestbook link carries the code, so the Code field fills itself in.
          if (d.code && gbLink) gbLink.href = "guestbook.html?code=" + encodeURIComponent(d.code);
          if (window.JaiouShare) {
            window.JaiouShare.attach(prize, {
              text: "🔎 I found one on the Domain Hunt at jAIou. The name stays secret.\njaiou.com/hunt.html",
              filename: "jaiou-hunt.png",
              image: { bg: "#1f3050", accent: "#e8c268", title: "Found one.", lines: ["The Domain Hunt · the name stays secret", "jaiou.com"] },
            });
          }
        } else if (res.status === 200) {
          recordTry(candidate, false);
          status.textContent = "Taken.";
          prize.hidden = true;
        } else {
          recordTry(candidate, false);
          status.textContent = d.error || "The registry did not answer. That try does not count.";
        }
        paintMeta(typeof d.tries_left === "number" ? d.tries_left : undefined);
      })
      .catch(function () {
        status.textContent = "The registry did not answer. That try does not count.";
      })
      .finally(function () {
        busy = false;
        btn.disabled = false;
        candInput.focus();
      });
  }

  btn.addEventListener("click", tryOne);
  paintMeta();
  paintTries();
})();

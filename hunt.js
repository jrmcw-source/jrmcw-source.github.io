// hunt.js — the Domain Hunt at jaiou.com.
// Five tries a day, counted on the server. The page never displays a found
// name — it only ever hears "found" — and neither does anything else.
(function () {
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var nameInput = document.getElementById("hunt-name");
  var candInput = document.getElementById("hunt-candidate");
  var btn = document.getElementById("hunt-btn");
  var status = document.getElementById("hunt-status");
  var meta = document.getElementById("hunt-meta");
  var prize = document.getElementById("hunt-prize");
  var codeEl = document.getElementById("hunt-code");
  if (!btn || !candInput) return;

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
    candInput.value = candInput.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);
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
    if (!/^[a-z]{3,5}$/.test(candidate)) {
      status.textContent = "Three to five letters — that's the size of it.";
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
          var s = store();
          s.finds = (s.finds || 0) + 1;
          save(s);
          status.textContent = "You found one.";
          prize.hidden = false;
          codeEl.textContent = d.code ? "Your claim code: " + d.code : "The badge is yours — the claim code didn't come through just now. The find is written down all the same.";
          if (window.JaiouShare) {
            window.JaiouShare.attach(prize, {
              text: "🔎 I found one on the Domain Hunt at jAIou. The name stays secret.\njaiou.com/hunt.html",
              filename: "jaiou-hunt.png",
              image: { bg: "#1f3050", accent: "#e8c268", title: "Found one.", lines: ["The Domain Hunt · the name stays secret", "jaiou.com"] },
            });
          }
        } else if (res.status === 200) {
          status.textContent = "Taken.";
          prize.hidden = true;
        } else {
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
})();

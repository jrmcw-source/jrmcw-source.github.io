// badge-leaders.js — the central badge board on the Games page.
// Reads the guestbook's badge list (posters and the badges their posts
// carry) and ranks people by how many DIFFERENT badges they hold.
// Repeat stamps of the same badge count once — it's the collection
// that leads, not the pile.
(function () {
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var box = document.getElementById("game-badge-leaders");
  if (!box) return;

  var BADGE_ART = {
    mcwoogle: ["images/jaiou-badge.svg", "McWoogle badge"],
    fishing: ["images/badge-fishing.svg", "Fishing badge"],
    fishing1: ["images/badge-fishing1.svg", "Fishing badge, one bar"],
    fishing2: ["images/badge-fishing2.svg", "Fishing badge, two bars"],
    fishing3: ["images/badge-fishing3.svg", "Fishing badge, three bars"],
    fishingg: ["images/badge-fishingg.svg", "Fishing gold badge"],
    hunt: ["images/badge-hunt.svg", "Domain Hunt badge"],
    hunt1: ["images/badge-hunt1.svg", "Domain Hunt badge, one bar"],
    hunt2: ["images/badge-hunt2.svg", "Domain Hunt badge, two bars"],
    hunt3: ["images/badge-hunt3.svg", "Domain Hunt badge, three bars"],
    huntg: ["images/badge-huntg.svg", "Domain Hunt gold badge"],
    othello: ["images/badge-othello.svg", "Reversi badge"],
    porch: ["images/badge-porch.svg", "Porch Regular badge"],
    porch1: ["images/badge-porch1.svg", "Porch Regular badge, one bar"],
    porch2: ["images/badge-porch2.svg", "Porch Regular badge, two bars"],
    porch3: ["images/badge-porch3.svg", "Porch Regular badge, three bars"],
    porch4: ["images/badge-porch4.svg", "Porch Regular badge, four bars"],
    porchg: ["images/badge-porchg.svg", "Porch Regular gold badge"],
    music: ["images/badge-music.svg", "Music badge"],
    music1: ["images/badge-music1.svg", "Music badge, one bar"],
    music2: ["images/badge-music2.svg", "Music badge, two bars"],
    music3: ["images/badge-music3.svg", "Music badge, three bars"],
    musicg: ["images/badge-musicg.svg", "Music gold badge"],
  };
  var KIND_ORDER = Object.keys(BADGE_ART);

  // Every badge on this page is a door to the game that gives it out.
  var BADGE_LINK = {
    mcwoogle: "https://mcwoogle.com/",
    fishing: "fishing.html", fishing1: "fishing.html", fishing2: "fishing.html", fishing3: "fishing.html", fishingg: "fishing.html",
    hunt: "hunt.html", hunt1: "hunt.html", hunt2: "hunt.html", hunt3: "hunt.html", huntg: "hunt.html",
    othello: "reversi.html",
    porch: "videos.html", porch1: "videos.html", porch2: "videos.html", porch3: "videos.html", porch4: "videos.html", porchg: "videos.html",
    music: "music.html", music1: "music.html", music2: "music.html", music3: "music.html", musicg: "music.html",
  };

  function render(rows) {
    var people = {};
    rows.forEach(function (row) {
      var p = people[row.name] || (people[row.name] = { name: row.name, kinds: {}, stamps: 0, latest: "" });
      p.kinds[row.badge_kind] = true;
      p.stamps += row.count || 0;
      if (String(row.latest) > p.latest) p.latest = String(row.latest);
    });
    var leaders = Object.keys(people).map(function (k) { return people[k]; });
    leaders.sort(function (a, b) {
      var d = Object.keys(b.kinds).length - Object.keys(a.kinds).length;
      if (d) return d;
      if (b.stamps !== a.stamps) return b.stamps - a.stamps;
      if (a.latest !== b.latest) return a.latest < b.latest ? 1 : -1;
      return a.name < b.name ? -1 : 1;
    });
    leaders = leaders.slice(0, 5);

    box.textContent = "";
    if (!leaders.length) {
      var p0 = document.createElement("p");
      p0.className = "gb-empty";
      p0.textContent = "No badges claimed yet — the first leader is still out there.";
      box.appendChild(p0);
      return;
    }
    leaders.forEach(function (p, i) {
      var div = document.createElement("div");
      div.className = "bl-row";
      var rank = document.createElement("span");
      rank.className = "bl-rank";
      rank.textContent = String(i + 1);
      div.appendChild(rank);
      var who = document.createElement("span");
      who.className = "bl-who";
      var nm = document.createElement("strong");
      nm.textContent = p.name;
      who.appendChild(nm);
      var n = Object.keys(p.kinds).length;
      who.appendChild(document.createTextNode(" — " + n + (n === 1 ? " badge" : " badges")));
      div.appendChild(who);
      var icons = document.createElement("span");
      icons.className = "bl-icons";
      KIND_ORDER.forEach(function (kind) {
        if (!p.kinds[kind]) return;
        var img = document.createElement("img");
        img.src = BADGE_ART[kind][0];
        img.alt = "";
        img.title = BADGE_ART[kind][1];
        var a = document.createElement("a");
        a.href = BADGE_LINK[kind];
        a.title = BADGE_ART[kind][1];
        if (kind === "mcwoogle") { a.target = "_blank"; a.rel = "noopener"; }
        a.appendChild(img);
        icons.appendChild(a);
      });
      div.appendChild(icons);
      box.appendChild(div);
    });
  }

  fetch(API + "/badges")
    .then(function (r) { return r.json(); })
    .then(function (d) { render(d.badges || []); })
    .catch(function () {
      box.textContent = "";
      var p = document.createElement("p");
      p.className = "gb-empty";
      p.textContent = "The badge board did not answer just now.";
      box.appendChild(p);
    });
})();

// videos.js — the Top Three, the daily video contest at jaiou.com.
// Three videos a day. One ballot per visitor. The standings stay covered
// until your ballot is in; yesterday's winner and the week's seats are public.
(function () {
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var ydayCard = document.getElementById("tt-yday-card");
  var ydayBox = document.getElementById("tt-yday");
  var dayLine = document.getElementById("tt-day");
  var todayBox = document.getElementById("tt-today");
  var status = document.getElementById("tt-status");
  var standBox = document.getElementById("tt-standings");
  var weekCard = document.getElementById("tt-week-card");
  var weekBox = document.getElementById("tt-week");
  if (!todayBox) return;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function frame(id) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return el("p", "board-note", "That one's player didn't load.");
    var wrap = el("div", "tt-frame");
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + id;
    f.title = "Video";
    f.loading = "lazy";
    f.allow = "accelerometer; encrypted-media; picture-in-picture";
    f.allowFullscreen = true;
    wrap.appendChild(f);
    return wrap;
  }
  function dayName(dayStr, style) {
    return new Date(dayStr + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: style || "long", month: "long", day: "numeric" });
  }
  function ballots(n) { return n + (n === 1 ? " ballot" : " ballots"); }

  function winnerVideo(entry) {
    if (!entry || !entry.winner || !entry.winner.slot) return null;
    return entry.videos[entry.winner.slot - 1];
  }
  function resultLine(entry) {
    var w = entry.winner, st = entry.standings;
    if (st.total === 0) return "No ballots came in — the day went unclaimed.";
    if (w.none) return "The porch said not for me — none of the three took the day, on " + ballots(st.total) + ".";
    if (w.tie && w.tie.length) return "It ended in a tie, on " + ballots(st.total) + ".";
    return "Won it on " + ballots(st.total) + ".";
  }

  function renderYesterday(y) {
    if (!y) return;
    ydayCard.hidden = false;
    ydayBox.textContent = "";
    var win = winnerVideo(y);
    if (win) {
      ydayBox.appendChild(frame(win.id));
      ydayBox.appendChild(el("p", "tt-title", win.title));
      ydayBox.appendChild(el("p", "tt-channel", win.channel));
    }
    ydayBox.appendChild(el("p", "board-note", resultLine(y)));
  }

  function renderWeek(week) {
    if (!week || !week.length) return;
    weekCard.hidden = false;
    weekBox.textContent = "";
    week.forEach(function (entry) {
      var row = el("div", "tt-week-row");
      var win = winnerVideo(entry);
      if (win) {
        var img = document.createElement("img");
        img.src = "https://i.ytimg.com/vi/" + win.id + "/hqdefault.jpg";
        img.alt = "";
        img.loading = "lazy";
        row.appendChild(img);
      }
      var txt = el("div");
      txt.appendChild(el("p", "tt-week-day", dayName(entry.day, "short")));
      txt.appendChild(el("p", "tt-week-title", win ? win.title : entry.winner.none ? "Not for me — the porch passed" : entry.standings.total === 0 ? "No ballots" : "A tie"));
      row.appendChild(txt);
      weekBox.appendChild(row);
    });
  }

  var data = null;
  var voting = false;

  function renderStandings() {
    var st = data.standings;
    if (!st) { standBox.hidden = true; return; }
    standBox.hidden = false;
    standBox.textContent = "";
    standBox.appendChild(el("p", "tag", "The standings so far"));
    var rows = data.videos.map(function (v) { return { label: v.title, n: st.counts[v.slot], mine: data.my_pick === v.slot }; });
    rows.push({ label: "Not for me", n: st.counts[0], mine: data.my_pick === 0 });
    rows.forEach(function (r) {
      var row = el("div", "tt-stand-row");
      var bar = el("div", "tt-bar");
      var fill = document.createElement("i");
      fill.style.width = st.total ? Math.round((r.n / st.total) * 100) + "%" : "0%";
      bar.appendChild(fill);
      row.appendChild(el("span", "tt-stand-label", r.label + (r.mine ? " — your pick" : "")));
      row.appendChild(bar);
      row.appendChild(el("span", "tt-count", ballots(r.n)));
      standBox.appendChild(row);
    });
    standBox.appendChild(el("p", "board-note", "The day closes at midnight, Lafayette time."));
  }

  function renderToday() {
    todayBox.textContent = "";
    if (!data.videos) {
      status.textContent = "Today's three aren't up yet — the roundup runs in the morning.";
      return;
    }
    dayLine.textContent = dayName(data.day);
    data.videos.forEach(function (v) {
      var box = el("div", "tt-entry");
      box.appendChild(frame(v.id));
      box.appendChild(el("p", "tt-title", v.title));
      box.appendChild(el("p", "tt-channel", v.channel));
      if (!data.voted) {
        var b = el("button", "fish-btn tt-btn", "My favorite");
        b.type = "button";
        b.addEventListener("click", function () { vote(v.slot); });
        box.appendChild(b);
      }
      todayBox.appendChild(box);
    });
    if (!data.voted) {
      var nb = el("button", "rev-level tt-none", "Not for me — none of these");
      nb.type = "button";
      nb.addEventListener("click", function () { vote(0); });
      todayBox.appendChild(nb);
      status.textContent = "Watch them, then place yours.";
    } else {
      status.textContent = "Your ballot's in.";
    }
    renderStandings();
  }

  function vote(pick) {
    if (voting || data.voted) return;
    voting = true;
    status.textContent = "Placing it…";
    fetch(API + "/contest/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pick: pick }),
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.status === 200 || res.status === 409) {
          data.voted = true;
          data.my_pick = res.data.my_pick;
          data.standings = res.data.standings;
          renderToday();
        } else {
          status.textContent = (res.data && res.data.error) || "That ballot didn't land. Try again.";
        }
      })
      .catch(function () { status.textContent = "That ballot didn't land. Try again."; })
      .finally(function () { voting = false; });
  }

  fetch(API + "/contest")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d;
      renderYesterday(d.yesterday);
      renderToday();
      renderWeek(d.week);
    })
    .catch(function () { status.textContent = "The roundup didn't answer just now. Give it a minute."; });
})();

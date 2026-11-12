// Reversi at Jason's table — the page around reversi-engine.js.
// You play Black against the computer's White, at three strengths.
// Finished games go to the shared board (the guestbook Worker's other
// hat); the badge belongs to whoever leads it.
(function () {
  "use strict";
  var E = window.ReversiEngine;
  var API = "https://jaiou-guestbook.jrmcw.workers.dev";
  var LEVEL_NAMES = { learner: "Learner", amateur: "Amateur", player: "Player", sensei: "Sensei" };
  var LEVEL_POINTS = { learner: 0.5, amateur: 1, player: 2, sensei: 3 };

  var boardEl = document.getElementById("rev-board");
  var statusEl = document.getElementById("rev-status");
  var youEl = document.getElementById("rev-you");
  var cpuEl = document.getElementById("rev-cpu");
  var nameEl = document.getElementById("rev-name");
  var standingsEl = document.getElementById("rev-standings");
  var biggestEl = document.getElementById("rev-biggest");
  var prizeEl = document.getElementById("rev-prize");
  var resultEl = document.getElementById("rev-result");
  var resultLineEl = document.getElementById("rev-resultline");
  var resultNoteEl = document.getElementById("rev-resultnote");
  var codeEl = document.getElementById("rev-code");

  var store = {};
  try { store = JSON.parse(localStorage.getItem("jaiou_reversi") || "{}"); } catch (e) { store = {}; }
  function save() {
    try { localStorage.setItem("jaiou_reversi", JSON.stringify(store)); } catch (e) { /* private window */ }
  }

  var board = E.initialBoard();
  var level = LEVEL_POINTS[store.level] ? store.level : "amateur";
  var turn = "you";
  var busy = false;
  var over = false;
  var reported = false;
  var lastMove = -1;

  // Build the 64 squares once; discs and dots are redrawn per move.
  var squares = [];
  for (var i = 0; i < 64; i++) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rev-sq";
    btn.setAttribute("role", "gridcell");
    (function (idx) {
      btn.addEventListener("click", function () { humanMove(idx); });
    })(i);
    boardEl.appendChild(btn);
    squares.push(btn);
  }

  function render() {
    var counts = E.countDiscs(board);
    youEl.textContent = counts.black;
    cpuEl.textContent = counts.white;
    var myMoves = turn === "you" && !over ? E.legalMoves(board, E.BLACK) : new Map();
    for (var i = 0; i < 64; i++) {
      var sq = squares[i];
      sq.textContent = "";
      sq.className = "rev-sq";
      if (board[i] !== E.EMPTY) {
        var disc = document.createElement("span");
        disc.className = "rev-disc " + (board[i] === E.BLACK ? "rev-b" : "rev-w");
        sq.appendChild(disc);
      } else if (myMoves.has(i)) {
        var dot = document.createElement("span");
        dot.className = "rev-dotmove";
        sq.appendChild(dot);
        sq.classList.add("rev-legal");
      }
      if (i === lastMove) sq.classList.add("rev-last");
      sq.disabled = busy || over || turn !== "you" || !myMoves.has(i);
    }
  }

  function setStatus(text) { statusEl.textContent = text; }

  function humanMove(idx) {
    if (busy || over || turn !== "you") return;
    var moves = E.legalMoves(board, E.BLACK);
    if (!moves.has(idx)) return;
    E.applyInPlace(board, idx, E.BLACK, moves.get(idx));
    lastMove = idx;
    turn = "cpu";
    render();
    advance();
  }

  function cpuMove() {
    var idx = E.chooseMove(board, E.WHITE, level);
    if (idx === null) { advance(); return; }
    var moves = E.legalMoves(board, E.WHITE);
    E.applyInPlace(board, idx, E.WHITE, moves.get(idx));
    lastMove = idx;
    turn = "you";
    busy = false;
    render();
    advance();
  }

  // Move the game along: passes, the computer's turn, or the end.
  function advance() {
    if (over) return;
    var youMoves = E.legalMoves(board, E.BLACK);
    var cpuMoves = E.legalMoves(board, E.WHITE);
    if (youMoves.size === 0 && cpuMoves.size === 0) { finish(); return; }
    if (turn === "cpu") {
      if (cpuMoves.size === 0) {
        turn = "you";
        busy = false;
        setStatus("The computer has no move — it passes. Yours again.");
        render();
        return;
      }
      busy = true;
      setStatus("The computer is thinking…");
      render();
      setTimeout(cpuMove, 350);
      return;
    }
    // Your turn.
    if (youMoves.size === 0) {
      turn = "cpu";
      setStatus("No move for you — you pass.");
      render();
      advance();
      return;
    }
    setStatus("Your move.");
    render();
  }

  function finish() {
    over = true;
    busy = false;
    var s = E.officialScore(board);
    var mine = s.black, theirs = s.white;
    var outcome = mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
    var head;
    if (outcome === "win") head = "You win, " + mine + "–" + theirs + ".";
    else if (outcome === "draw") head = "A draw, 32–32.";
    else head = "The computer takes it, " + theirs + "–" + mine + ".";
    if (mine === 64) head += " A wipeout — the whole board.";
    resultLineEl.textContent = head;
    var name = (store.name || "").trim();
    if (!name) {
      resultNoteEl.textContent = "Put your name in Name for the board and finished games count.";
    } else if (outcome === "win") {
      resultNoteEl.textContent = LEVEL_POINTS[level] + (LEVEL_POINTS[level] === 1 ? " point" : " points") +
        " at " + LEVEL_NAMES[level] + " — going on the board under " + name + ".";
    } else if (outcome === "draw") {
      var half = LEVEL_POINTS[level] / 2;
      resultNoteEl.textContent = half + (half === 1 ? " point" : " points") + " for the draw — going on the board under " + name + ".";
    } else {
      resultNoteEl.textContent = "No points, but the game goes on the board under " + name + ".";
    }
    resultEl.hidden = false;
    if (window.JaiouShare) {
      var lvl = LEVEL_NAMES[level];
      var cardTitle, cardText;
      if (outcome === "win") { cardTitle = "I win at Reversi — " + mine + "–" + theirs; cardText = "♟ " + cardTitle + " against " + lvl + ".\nJason's table at jAIou — jaiou.com/reversi.html"; }
      else if (outcome === "draw") { cardTitle = "A draw at Reversi — 32–32"; cardText = "♟ " + cardTitle + " against " + lvl + ".\nJason's table at jAIou — jaiou.com/reversi.html"; }
      else { cardTitle = "Reversi — the computer took it " + theirs + "–" + mine; cardText = "♟ " + cardTitle + " at " + lvl + ". Rematch pending.\nJason's table at jAIou — jaiou.com/reversi.html"; }
      window.JaiouShare.attach(resultEl, {
        text: cardText,
        filename: "jaiou-reversi.png",
        image: { bg: "#17301f", accent: "#e8c268", title: cardTitle, lines: ["against " + lvl + " · Jason's table", "jaiou.com"] },
      });
    }
    setStatus("Game over.");
    render();
    if (name && !reported) {
      reported = true;
      reportResult(name, mine, theirs);
    }
  }

  function reportResult(name, mine, theirs) {
    fetch(API + "/reversi/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, level: level, discs_for: mine, discs_against: theirs })
    }).then(function () { loadBoard(); }).catch(function () { /* the game still counted here */ });
  }

  function fmtPoints(p) {
    return (Math.round(p * 10) / 10).toString().replace(/\.0$/, "");
  }
  function fmtDate(ts) {
    var d = new Date(String(ts).replace(" ", "T") + "Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function loadBoard() {
    fetch(API + "/reversi/board").then(function (r) { return r.json(); }).then(function (data) {
      standingsEl.textContent = "";
      if (!data.standings || data.standings.length === 0) {
        var li = document.createElement("li");
        li.className = "rev-empty";
        li.textContent = "No games on the board yet. Yours could be the first.";
        standingsEl.appendChild(li);
      } else {
        data.standings.forEach(function (row) {
          var li = document.createElement("li");
          li.textContent = row.name + " — " + fmtPoints(row.points) + (row.points === 1 ? " pt" : " pts") +
            " · " + row.wins + "W " + row.draws + "D " + row.losses + "L · " +
            (row.margin > 0 ? "+" + row.margin : row.margin);
          standingsEl.appendChild(li);
        });
      }
      if (data.biggest) {
        var b = data.biggest;
        biggestEl.textContent = "Most lopsided win: " + b.discs_for + "–" + b.discs_against +
          " — " + b.name + ", at " + LEVEL_NAMES[b.level] + " · " + fmtDate(b.created_at) +
          (b.discs_against === 0 ? " — a wipeout." : ".");
      } else {
        biggestEl.textContent = "";
      }
      var name = (store.name || "").trim();
      var isLeader = !!(name && data.leader && name.toLowerCase() === String(data.leader).toLowerCase());
      prizeEl.hidden = !isLeader;
      if (!isLeader) { codeEl.hidden = true; codeEl.textContent = ""; }
    }).catch(function () { /* board stays as it was */ });
  }

  document.getElementById("rev-badgebtn").addEventListener("click", function () {
    var name = (store.name || "").trim();
    fetch(API + "/badge/issue?kind=othello&name=" + encodeURIComponent(name))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        codeEl.hidden = false;
        if (data.code) {
          codeEl.textContent = "Your claim code: " + data.code;
        } else {
          codeEl.textContent = data.error || "No code just now — the lead may have changed. The board above is the word.";
        }
        loadBoard();
      })
      .catch(function () {
        codeEl.hidden = false;
        codeEl.textContent = "The board did not answer just now. Try once more in a bit.";
      });
  });

  function newGame() {
    board = E.initialBoard();
    turn = "you";
    busy = false;
    over = false;
    reported = false;
    lastMove = -1;
    resultEl.hidden = true;
    setStatus("Your move. You play Black.");
    render();
  }

  document.getElementById("rev-new").addEventListener("click", newGame);

  var levelBtns = document.querySelectorAll(".rev-level");
  function paintLevels() {
    levelBtns.forEach(function (b) {
      b.classList.toggle("rev-on", b.getAttribute("data-level") === level);
    });
  }
  levelBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var next = b.getAttribute("data-level");
      if (next === level) return;
      level = next;
      store.level = level;
      save();
      paintLevels();
      newGame();
      setStatus("New game at " + LEVEL_NAMES[level] + ". Your move. You play Black.");
    });
  });

  nameEl.value = store.name || "";
  nameEl.addEventListener("change", function () {
    store.name = nameEl.value.trim();
    save();
    loadBoard();
  });

  paintLevels();
  newGame();
  loadBoard();
})();

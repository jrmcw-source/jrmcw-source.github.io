// Reversi engine for jAIou — rules, evaluation, and alpha-beta search.
//
// Adapted from thaw-reversi-engine (MIT License, Copyright (c) 2017
// Tom Weatherhead, https://github.com/tom-weatherhead/thaw-reversi-engine):
// the board model and the outflank scan follow his engine; the evaluation
// and search were rewritten for this site. His copyright notice is kept
// with the site's copy of this file, as the MIT license asks.
//
// Rules are the modern game (the 1880s Reversi board, fixed opening):
// a move must outflank at least one line of the other colour; everything
// outflanked flips; no legal move means a pass; when neither side can
// move, most discs wins. Official scoring credits empty squares to the
// winner, scores a draw 32-32, and scores a wipeout 64-0.

(function (global) {
  "use strict";

  var EMPTY = 0, BLACK = 1, WHITE = 2;
  var DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];

  function other(player) { return player === BLACK ? WHITE : BLACK; }
  function onBoard(idx) { return idx >= 0 && idx < 64; }
  // A step in direction d stays on the board only if the column doesn't wrap.
  function stepOk(idx, d) {
    var col = idx % 8;
    if ((d === -1 || d === 7 || d === -9) && col === 0) return false;
    if ((d === 1 || d === -7 || d === 9) && col === 7) return false;
    return true;
  }

  function initialBoard() {
    var b = new Array(64).fill(EMPTY);
    b[27] = WHITE; b[28] = BLACK; b[35] = BLACK; b[36] = WHITE;
    return b;
  }

  // Discs that would flip if `player` plays at idx; null if the move is illegal.
  function flipsFor(board, idx, player) {
    if (board[idx] !== EMPTY) return null;
    var opp = other(player), all = null;
    for (var k = 0; k < 8; k++) {
      var d = DIRS[k], line = [], cur = idx, anchored = false;
      // Walk the line: opponent discs collect; the line pays only if it
      // ends on the player's own disc before an empty square or the edge.
      while (stepOk(cur, d)) {
        cur += d;
        if (!onBoard(cur)) break;
        if (board[cur] === opp) { line.push(cur); continue; }
        anchored = board[cur] === player && line.length > 0;
        break;
      }
      if (anchored) {
        all = all || [];
        for (var j = 0; j < line.length; j++) all.push(line[j]);
      }
    }
    return all && all.length ? all : null;
  }

  // Map of legal move index -> array of flipped indices.
  function legalMoves(board, player) {
    var moves = new Map();
    for (var i = 0; i < 64; i++) {
      if (board[i] !== EMPTY) continue;
      var f = flipsFor(board, i, player);
      if (f) moves.set(i, f);
    }
    return moves;
  }

  function applyInPlace(board, idx, player, flips) {
    board[idx] = player;
    for (var j = 0; j < flips.length; j++) board[flips[j]] = player;
  }
  function undoInPlace(board, idx, player, flips) {
    board[idx] = EMPTY;
    var opp = other(player);
    for (var j = 0; j < flips.length; j++) board[flips[j]] = opp;
  }

  function countDiscs(board) {
    var black = 0, white = 0;
    for (var i = 0; i < 64; i++) {
      if (board[i] === BLACK) black++;
      else if (board[i] === WHITE) white++;
    }
    return { black: black, white: white, empty: 64 - black - white };
  }

  // Tournament scoring: empty squares go to the winner, a draw is 32-32,
  // and a side with no discs at all loses 64-0.
  function officialScore(board) {
    var c = countDiscs(board);
    if (c.black === 0) return { black: 0, white: 64 };
    if (c.white === 0) return { black: 64, white: 0 };
    if (c.black > c.white) return { black: c.black + c.empty, white: c.white };
    if (c.white > c.black) return { black: c.black, white: c.white + c.empty };
    return { black: 32, white: 32 };
  }

  var CORNERS = [0, 7, 56, 63];
  var CORNER_NEIGHBORS = {
    0: [1, 8, 9], 7: [6, 14, 15], 56: [48, 49, 57], 63: [54, 55, 62]
  };
  // Rough square ordering for move sorting: corners first, danger squares last.
  var SQUARE_ORDER = (function () {
    var w = new Array(64).fill(0);
    var i;
    for (i = 0; i < 64; i++) {
      var r = (i / 8) | 0, c = i % 8;
      if ((r === 0 || r === 7) && (c === 0 || c === 7)) w[i] = 100;
      else if (r === 0 || r === 7 || c === 0 || c === 7) w[i] = 20;
      else if ((r === 1 || r === 6) && (c === 1 || c === 6)) w[i] = -30;
      else if ((r <= 1 || r >= 6) && (c <= 1 || c >= 6)) w[i] = -15;
      else w[i] = 0;
    }
    return w;
  })();

  function evaluate(board, player, myMoveCount, greed) {
    var opp = other(player);
    var my = 0, op = 0, i, counts = countDiscs(board);
    if (player === BLACK) { my = counts.black; op = counts.white; }
    else { my = counts.white; op = counts.black; }
    if (op === 0) return 100000;
    if (my === 0) return -100000;
    var score = 0;
    // Corners are forever. (An amateur knows a corner is good; he just
    // doesn't yet know how good, so his scale runs smaller.)
    var cornerWorth = greed ? 500 : 1200;
    for (i = 0; i < 4; i++) {
      var corner = CORNERS[i];
      if (board[corner] === player) score += cornerWorth;
      else if (board[corner] === opp) score -= cornerWorth;
      else {
        // Squares next to an open corner are offers. Don't make them.
        // (An amateur barely fears them — the greed flag softens this.)
        var ns = CORNER_NEIGHBORS[corner];
        for (var j = 0; j < 3; j++) {
          var n = ns[j], diag = (n === 9 || n === 14 || n === 49 || n === 54);
          var wgt = (diag ? 320 : 220) * (greed ? 0.25 : 1);
          if (board[n] === player) score -= wgt;
          else if (board[n] === opp) score += wgt;
        }
      }
    }
    // Mobility: having moves is having a future. The caller hands over the
    // side-to-move's count; only the opponent's needs computing here.
    var myMoves = typeof myMoveCount === "number" ? myMoveCount : legalMoves(board, player).size;
    var opMoves = legalMoves(board, opp).size;
    if (myMoves + opMoves > 0) score += (greed ? 6 : 14) * (myMoves - opMoves);
    if (opMoves === 0) score += greed ? 80 : 250;
    if (myMoves === 0) score -= greed ? 80 : 250;
    // Discs barely matter until the end is in sight — unless you're an
    // amateur, in which case discs are the whole point of the exercise.
    var empties = counts.empty;
    if (greed) score += 10 * (my - op);
    else if (empties > 16) score += 1 * (my - op);
    else score += 8 * (my - op);
    return score;
  }

  // Alpha-beta with a node budget: the search counts its own nodes and
  // gives up cleanly when the budget runs out, so a move always comes
  // back quickly — even on a slow phone, even late in the game.
  function search(board, player, depth, alpha, beta, empties, solveAt, state) {
    if (state.nodes++ > state.budget) { state.aborted = true; return 0; }
    var moves = legalMoves(board, player);
    if (moves.size === 0) {
      var oppMoves = legalMoves(board, other(player));
      if (oppMoves.size === 0) {
        var s = officialScore(board);
        var diff = player === BLACK ? s.black - s.white : s.white - s.black;
        return diff * 100;
      }
      return -search(board, other(player), depth - 1, -beta, -alpha, empties, solveAt, state);
    }
    if (depth <= 0 && empties > solveAt) return evaluate(board, player, moves.size, state.greed);
    var entries = Array.from(moves.entries());
    entries.sort(function (a, b) { return SQUARE_ORDER[b[0]] - SQUARE_ORDER[a[0]]; });
    var best = -Infinity;
    for (var i = 0; i < entries.length; i++) {
      var idx = entries[i][0], flips = entries[i][1];
      applyInPlace(board, idx, player, flips);
      var val = -search(board, other(player), depth - 1, -beta, -alpha, empties - 1, solveAt, state);
      undoInPlace(board, idx, player, flips);
      if (state.aborted) return 0;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  var LEVELS = {
    amateur: { budget: 800, maxDepth: 1, solveAt: 6, looseness: 0.3, greed: true },
    player: { budget: 40000, maxDepth: 8, solveAt: 11, looseness: 0, greed: false },
    sensei: { budget: 200000, maxDepth: 64, solveAt: 14, looseness: 0, greed: false }
  };

  // Pick the computer's move: deepen the search round by round and keep
  // the best move from the deepest round the budget allowed to finish.
  // rng is injectable so tests are steady.
  function chooseMove(board, player, levelName, rng) {
    var cfg = LEVELS[levelName] || LEVELS.player;
    rng = rng || Math.random;
    var moves = legalMoves(board, player);
    if (moves.size === 0) return null;
    if (moves.size === 1) return moves.keys().next().value;
    var empties = countDiscs(board).empty;
    var state = { nodes: 0, budget: cfg.budget, aborted: false, greed: cfg.greed };
    var bestScored = null;
    var startDepth = cfg.maxDepth < 2 ? 1 : 2;
    for (var depth = startDepth; depth <= cfg.maxDepth; depth += 2) {
      var scored = [];
      var entries = Array.from(moves.entries());
      var aborted = false;
      for (var i = 0; i < entries.length; i++) {
        var idx = entries[i][0], flips = entries[i][1];
        applyInPlace(board, idx, player, flips);
        var val = -search(board, other(player), depth - 1, -Infinity, Infinity, empties - 1, cfg.solveAt, state);
        undoInPlace(board, idx, player, flips);
        if (state.aborted) { aborted = true; break; }
        scored.push({ idx: idx, val: val });
      }
      if (aborted) break;
      scored.sort(function (a, b) { return b.val - a.val; });
      bestScored = scored;
      if (empties <= cfg.solveAt) break; // the round just played was exact
    }
    if (!bestScored) {
      // The budget ran out before even the shallow round finished —
      // fall back to the static square order.
      var fallback = Array.from(moves.keys());
      fallback.sort(function (a, b) { return SQUARE_ORDER[b] - SQUARE_ORDER[a]; });
      return fallback[0];
    }
    if (cfg.looseness > 0 && bestScored.length > 1 && rng() < cfg.looseness) {
      // An amateur sometimes plays a decent move instead of the best one.
      var pool = bestScored.slice(0, Math.min(3, bestScored.length));
      return pool[Math.floor(rng() * pool.length)].idx;
    }
    return bestScored[0].idx;
  }

  var api = {
    EMPTY: EMPTY, BLACK: BLACK, WHITE: WHITE,
    initialBoard: initialBoard,
    flipsFor: flipsFor,
    legalMoves: legalMoves,
    applyInPlace: applyInPlace,
    undoInPlace: undoInPlace,
    countDiscs: countDiscs,
    officialScore: officialScore,
    evaluate: evaluate,
    chooseMove: chooseMove,
    LEVELS: LEVELS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ReversiEngine = api;
})(typeof window !== "undefined" ? window : globalThis);

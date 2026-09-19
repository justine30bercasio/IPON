const MEMBERS = ["JAYMAR", "KIM", "ROSE/LLOYD", "BUENAFE", "JOAN", "MABETH", "KAINA", "ALYSSA", "APRIL", "BILLYSON"];
const TARGET = [1000, 52000, 16500, 30000, 4500, 17500, 9000, 9000, 11000, 0];

const rows = [
  ["2025-12-13", [4000, 500, 500, 500]],
  ["2025-12-27", [1000, 500, 500, 500, 1000, 1000, 500]],
  ["2025-12-29", [4000]],
  ["2026-01-14", [1000, 4000, 500, 1000, 500, 500, 500]],
  ["2026-01-21", [1500]],
  ["2026-01-23", [500]],
  ["2026-01-26", [4000]],
  ["2026-01-27", [5000]],
  ["2026-01-29", [1000, 500, 500, 500, 500, 1000, 500]],
  ["2026-02-14", [4000, 500, 2000, 500, 500, 500, 500, 500]],
  ["2026-02-21", [1000]],
  ["2026-02-28", [1000, 1000, 500, 1000, 500, 500, 1000, 500]],
  ["2026-03-02", [4000]],
  ["2026-03-06", [500]],
  ["2026-03-14", [4000, 2000, 500, 500, 500, 500, 500, 500]],
  ["2026-03-25", [1000]],
  ["2026-03-30", [4000, 1000, 1000, 500, 500, 500, 500, 1000, 500]],
  ["2026-04-06", [1000]],
  ["2026-04-14", [4000, 1000, 1000, 500, 1000, 500, 500, 2000, 500]],
  ["2026-04-21", [1000]],
  ["2026-04-29", [4000, 500, 500]],
  ["2026-04-30", [1000, 1000, 500, 500]],
  ["2026-05-06", [1000]],
  ["2026-05-14", [4000, 1000, 1000, 500, 1000, 500, 500, 1500, 500]],
  ["2026-05-21", [1000]],
  ["2026-05-29", [4000, 1000, 1000, 500, 500, 500, 500]],
  ["2026-06-06", [1000]],
  ["2026-06-18", [1000, 1000, 6000, 1000, 500, 1500, -11000]],
  ["2026-06-22", [4000, 1000]],
  ["2026-06-30", [1000, 1000, 500, 500]],
  ["2026-07-06", [1000]],
  ["2026-07-14", [1000, 1000, 1000, 500]],
  ["2026-07-15", [1000]],
  ["2026-07-22", [1000]],
  ["2026-07-28", [1000, 1000, 500, 500]],
  ["2026-08-06", [1000]],
  ["2026-08-13", [1000, 1000, 500, 500, 2000]],
  ["2026-08-14", [1000]],
  ["2026-08-20", [1000]],
  ["2026-08-29", [1000, 1000, 1000, 500]],
  ["2026-09-07", [1000]],
];

const NC = MEMBERS.length;
const MAXNEG = 11000;

function blockSumsFor(tokens, cuts, cols) {
  const sums = [];
  let t = 0;
  for (let k = 0; k < cols.length; k++) {
    let bk = 0;
    for (let q = t; q < t + cuts[k]; q++) bk += tokens[q];
    sums.push(bk);
    t += cuts[k];
  }
  return sums;
}

function genBlockingsDedup(tokens) {
  // returns array of {cols:[...], sums:[...]} unique by (cols,sums)
  const seen = new Set();
  const out = [];
  const n = tokens.length;
  const rec = (ts, startCol, cuts, cols, sums) => {
    if (ts === n) {
      const key = cols.join(",") + "|" + sums.join(",");
      if (!seen.has(key)) { seen.add(key); out.push({ cols: cols.slice(), sums: sums.slice() }); }
      return;
    }
    let acc = tokens[ts];
    for (let e = ts; e < n; e++) {
      if (e > ts) acc += tokens[e];
      for (let c = startCol; c < NC; c++) {
        cuts.push(e - ts + 1); cols.push(c); sums.push(acc);
        rec(e + 1, c + 1, cuts, cols, sums);
        cuts.pop(); cols.pop(); sums.pop();
      }
    }
  };
  rec(0, 0, [], [], []);
  return out;
}

function solve() {
  const blockCache = rows.map((r) => genBlockingsDedup(r[1]));
  for (let i = 0; i < blockCache.length; i++)
    console.log(i, rows[i][0], "tokens=", rows[i][1].length, "blockings=", blockCache[i].length);

  const order = rows.map((r, i) => i).sort((a, b) => rows[b][1].length - rows[a][1].length);
  const cur = new Array(NC).fill(0);
  const solutions = [];
  const CAP = 3;
  let nodes = 0;
  const start = Date.now();

  const posSuffix = new Array(order.length + 1).fill(0);
  for (let oi = order.length - 1; oi >= 0; oi--) {
    posSuffix[oi] = posSuffix[oi + 1] + rows[order[oi]][1].filter((a) => a > 0).reduce((s, a) => s + a, 0);
  }
  let negRemaining = 1;

  const prune = (oi) => {
    if (Date.now() - start > 280000) throw new Error("TIMEOUT");
    const P = posSuffix[oi];
    let need = 0;
    for (let c = 0; c < NC; c++) {
      const T = TARGET[c];
      const over = cur[c] - T;
      if (over > 0) {
        if (negRemaining === 0) return true;
        if (over > MAXNEG) return true;
      }
      if (cur[c] + P < T) return true;
      if (cur[c] < T) need += T - cur[c];
    }
    if (need > P) return true;
    return false;
  };

  const exceeds = (v, c) => {
    const over = v - TARGET[c];
    if (over > 0) {
      if (negRemaining === 0) return true;
      if (over > MAXNEG) return true;
    }
    return false;
  };

  const dfs = (oi) => {
    if (Date.now() - start > 280000) throw new Error("TIMEOUT");
    nodes++;
    if (solutions.length >= CAP) return;
    if (prune(oi)) return;
    if (oi === order.length) {
      if (cur.every((v, c) => v === TARGET[c])) {
        console.log("FOUND SOLUTION nodes=", nodes);
        solutions.push(cur.slice());
      }
      return;
    }
    const ri = order[oi];
    for (const b of blockCache[ri]) {
      let ok = true;
      for (let k = 0; k < b.cols.length; k++) {
        cur[b.cols[k]] += b.sums[k];
        if (ok && exceeds(cur[b.cols[k]], b.cols[k])) ok = false;
        if (b.sums[k] < 0) negRemaining--;
      }
      if (ok) dfs(oi + 1);
      for (let k = 0; k < b.cols.length; k++) {
        cur[b.cols[k]] -= b.sums[k];
        if (b.sums[k] < 0) negRemaining++;
      }
      if (solutions.length >= CAP) return;
    }
  };

  dfs(0);
  return { solutions, nodes };
}

try {
  const t0 = Date.now();
  const { solutions, nodes } = solve();
  console.log("elapsed", ((Date.now() - t0) / 1000).toFixed(1), "s nodes=", nodes, "solutions=", solutions.length);
} catch (e) {
  console.log("CAUGHT", e.message);
}
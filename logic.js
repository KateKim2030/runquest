// 런퀘스트 — pure game logic (no DOM). Loaded by index.html and by test.js under node.
(function (root) {
  "use strict";
  const KEY = "runquest-v1";
  const GOAL_MIN = 20; // daily active-minute goal (WHO 150 min/week ÷ 7)

  // segment = [type, seconds]; types: warm, walk, fast, run, cool
  const M = (m) => Math.round(m * 60);
  const seg = (t, m) => [t, M(m)];
  const W = (m) => seg("warm", m), C = (m) => seg("cool", m), K = (m) => seg("walk", m),
    F = (m) => seg("fast", m), R = (m) => seg("run", m);
  // n reps of `on`, separated by `rest`, no rest after the last one
  const reps = (n, on, rest) => { const o = []; for (let i = 0; i < n; i++) { o.push(on); if (i < n - 1) o.push(rest); } return o; };
  const wrap = (core) => [W(5), ...core, C(5)];

  const WORLDS = [
    { n: 1, name: "걷기 습관", emoji: "🌱", stages: [
      ["가볍게 걷기", wrap([K(5)])],
      ["조금 더 걷기", wrap([K(10)])],
      ["빠르게 섞어 걷기", wrap(reps(4, F(2), K(2)))],
      ["빠른 걸음 3번", wrap(reps(3, F(3), K(2)))],
    ]},
    { n: 2, name: "1분 달리기", emoji: "🔥", stages: [
      ["1분 뛰기 5번", wrap(reps(5, R(1), K(2)))],
      ["1분 뛰기 6번", wrap(reps(6, R(1), K(2)))],
      ["1분 30초 뛰기 5번", wrap(reps(5, R(1.5), K(2)))],
      ["2분 뛰기 5번", wrap(reps(5, R(2), K(2)))],
    ]},
    { n: 3, name: "3~6분 달리기", emoji: "⚡", stages: [
      ["3분 뛰기 4번", wrap(reps(4, R(3), K(2)))],
      ["4분 뛰기 3번", wrap(reps(3, R(4), K(2)))],
      ["5분 뛰기 3번", wrap(reps(3, R(5), K(3)))],
      ["6분 뛰기 3번", wrap(reps(3, R(6), K(3)))],
    ]},
    { n: 4, name: "8~12분 달리기", emoji: "🌊", stages: [
      ["8분 뛰기 2번", wrap(reps(2, R(8), K(3)))],
      ["10분 뛰기 2번", wrap(reps(2, R(10), K(3)))],
      ["15분 뛰고 5분 더", wrap([R(15), K(3), R(5)])],
      ["12분 뛰기 2번", wrap(reps(2, R(12), K(3)))],
    ]},
    { n: 5, name: "15~22분 달리기", emoji: "🏔️", stages: [
      ["15분 쉬지 않고", wrap([R(15)])],
      ["18분 쉬지 않고", wrap([R(18)])],
      ["20분 쉬지 않고", wrap([R(20)])],
      ["22분 쉬지 않고", wrap([R(22)])],
    ]},
    { n: 6, name: "30분 달리기", emoji: "👑", stages: [
      ["25분 쉬지 않고", wrap([R(25)])],
      ["27분 쉬지 않고", wrap([R(27)])],
      ["28분 쉬지 않고", wrap([R(28)])],
      ["30분 쉬지 않고", wrap([R(30)])],
    ]},
  ];

  const STAGES = [];
  WORLDS.forEach((w) => w.stages.forEach(([title, segs], i) => {
    const boss = i === 3;
    STAGES.push({ idx: STAGES.length, world: w.n, worldName: w.name, emoji: w.emoji, boss,
      id: boss ? w.n + "-보스" : w.n + "-" + (i + 1), short: boss ? "보스" : w.n + "-" + (i + 1), title, segs });
  }));
  const totalSec = (s) => s.segs.reduce((a, x) => a + x[1], 0);
  const runSec = (s) => s.segs.filter((x) => x[0] === "run").reduce((a, x) => a + x[1], 0);
  const runCount = (s) => s.segs.filter((x) => x[0] === "run").length;
  const xpFor = (s) => Math.round(totalSec(s) / 60) * 10 + (s.boss ? 200 : 0);

  // ---------- dates (local calendar days) ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parseDay = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
  const mondayOf = (k) => { const d = parseDay(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dayKey(d); };

  // ---------- state ----------
  function fresh() {
    return { v: 1, started: false, cleared: 0, lastClearDay: null, repeatIdx: null, xp: 0,
      log: [], voice: true, safetyOk: false };
  }
  function start(state, fromWorld) {
    const s = { ...fresh(), started: true, safetyOk: true, voice: state.voice };
    s.cleared = fromWorld === 2 ? 4 : 0; // world 1 marked as passed
    s.skippedWorld1 = fromWorld === 2;
    return s;
  }
  // How a map node looks today: done | today | tomorrow | lock
  function nodeState(state, idx, today) {
    if (idx < state.cleared) return "done";
    if (idx === state.cleared && idx < STAGES.length) return state.lastClearDay === today ? "tomorrow" : "today";
    return "lock";
  }
  // The stage the "오늘" card suggests
  function todayPlan(state, today) {
    if (state.cleared >= STAGES.length) return { kind: "allclear", stage: STAGES[STAGES.length - 1] };
    const next = STAGES[state.cleared];
    if (state.lastClearDay === today) return { kind: "rest", stage: next, last: STAGES[state.cleared - 1] };
    if (state.repeatIdx != null && state.repeatIdx < state.cleared)
      return { kind: "repeat", stage: STAGES[state.repeatIdx], next };
    return { kind: "new", stage: next };
  }
  const canPlay = (state, idx, today) => { const n = nodeState(state, idx, today); return n === "done" || n === "today"; };

  // Record a finished (or stopped) session. Returns a summary for the result screen.
  function finish(state, idx, sec, completed, today) {
    const st = STAGES[idx];
    const out = { xp: 0, newClear: false, levelUp: false, worldClear: false };
    const before = level(state.xp).lv;
    if (completed) {
      out.xp = xpFor(st);
      if (idx === state.cleared && state.lastClearDay !== today) {
        state.cleared += 1; state.lastClearDay = today; out.newClear = true;
        out.worldClear = st.boss;
      }
      if (state.repeatIdx === idx) state.repeatIdx = null;
    } else {
      out.xp = Math.floor(sec / 60) * 5; // half rate for a stopped run
    }
    state.xp += out.xp;
    state.log.push({ day: today, kind: "stage", stage: st.id, idx, sec: Math.round(sec), done: !!completed, xp: out.xp });
    out.levelUp = level(state.xp).lv > before;
    return out;
  }
  // Rating after a cleared run: "hard" suggests replaying the same stage next time
  function rate(state, idx, rating) {
    const last = state.log[state.log.length - 1];
    if (last && last.idx === idx) last.rating = rating;
    state.repeatIdx = rating === "hard" ? idx : (state.repeatIdx === idx ? null : state.repeatIdx);
  }
  function addManual(state, minutes, today) {
    state.log.push({ day: today, kind: "manual", sec: minutes * 60, done: true, xp: minutes });
    state.xp += minutes;
  }
  // ---------- 틈새 운동 (snack workouts) ----------
  // kind "reps": the app counts one rep every `tempo` seconds; "time": a countdown.
  // say: [first half of a rep, second half] — the first half shows art frame B, the second frame A.
  const SNACKS = [
    { id: "squat", name: "스쿼트", kind: "reps", n: 10, step: 5, tempo: 3, say: ["앉아요", "일어나요"], tip: "엉덩이를 뒤로 빼며 의자에 앉듯이. 무릎은 발끝 방향으로." },
    { id: "wallpush", name: "벽 푸시업", kind: "reps", n: 10, step: 5, tempo: 3, say: ["가까이", "밀어요"], tip: "벽에서 한 걸음 반 떨어져 손을 어깨 높이에. 몸은 일자로." },
    { id: "calf", name: "까치발 들기", short: "까치발", kind: "reps", n: 20, step: 5, tempo: 2, say: ["올려요", "내려요"], tip: "발뒤꿈치를 천천히 올렸다 내려요. 벽을 살짝 짚어도 좋아요." },
    { id: "lunge", name: "번갈아 런지", kind: "reps", n: 12, step: 2, tempo: 3.5, say: ["내딛어요", "돌아와요"], tip: "한 발 앞으로 내딛고 뒷무릎을 바닥 가까이. 다리를 바꿔 가며." },
    { id: "bridge", name: "글루트 브릿지", kind: "reps", n: 15, step: 5, tempo: 3, say: ["들어요", "내려요"], tip: "누워서 무릎을 세우고, 엉덩이를 들어 어깨부터 무릎까지 일자로." },
    { id: "birddog", name: "버드독", kind: "reps", n: 10, step: 2, tempo: 4, say: ["뻗어요", "돌아와요"], tip: "네발 자세에서 반대쪽 팔과 다리를 뻗고 잠깐 멈춰요. 좌우 번갈아." },
    { id: "knee", name: "제자리 무릎 들기", kind: "time", n: 30, step: 10, tempo: 1.2, tip: "조용히 걷듯 무릎을 번갈아 높이 들어요. 뛰지 않아요." },
    { id: "plank", name: "플랭크", kind: "time", n: 30, step: 10, tempo: 0, tip: "팔꿈치는 어깨 아래, 머리부터 발끝까지 일자로. 숨은 참지 않아요." },
    { id: "wallsit", name: "벽에 기대 앉기", kind: "time", n: 30, step: 10, tempo: 0, tip: "등을 벽에 붙이고 무릎이 90도가 되게 앉아요." },
  ];
  const SNACK = Object.fromEntries(SNACKS.map((x) => [x.id, x]));
  const SNACK_XP = 10;
  const snackN = (state, id) => (state.snackPrefs && state.snackPrefs[id]) || SNACK[id].n;
  function setSnackN(state, id, n) {
    const x = SNACK[id], lo = x.kind === "time" ? 10 : Math.min(5, x.step * 2), hi = x.kind === "time" ? 120 : 30;
    state.snackPrefs = { ...(state.snackPrefs || {}), [id]: Math.max(lo, Math.min(hi, n)) };
    return state.snackPrefs[id];
  }
  const snackLabel = (id, n) => SNACK[id].name + " " + (SNACK[id].kind === "time" ? n + "초" : n + "개");
  // done = how many reps (or seconds) were actually finished; a set counts once it is at least half done
  function addSnack(state, id, done, sec, today) {
    const x = SNACK[id], target = snackN(state, id), full = done >= target;
    const xp = done * 2 >= target ? SNACK_XP : 0;
    state.xp += xp;
    state.log.push({ day: today, kind: "snack", snack: id, n: done, full, sec: Math.round(sec), done: full, xp });
    return { xp, full };
  }
  const snacksOn = (state, day, id) => state.log.filter((e) => e.day === day && e.kind === "snack" && e.xp > 0 && (!id || e.snack === id)).length;
  // Native Korean counting words for the voice: 하나, 둘 ... 스물, 서른
  function koNum(n) {
    const u = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"], t = ["", "열", "스물", "서른"];
    if (n <= 0 || n >= 40) return String(n);
    return t[Math.floor(n / 10)] + u[n % 10];
  }

  function undoManual(state, today) {
    for (let i = state.log.length - 1; i >= 0; i--) {
      const e = state.log[i];
      if (e.day === today && e.kind === "manual") { state.xp -= e.xp; state.log.splice(i, 1); return true; }
    }
    return false;
  }

  // ---------- numbers ----------
  const minutesOn = (state, day) => Math.floor(state.log.filter((e) => e.day === day).reduce((a, e) => a + e.sec, 0) / 60);
  function level(xp) { // each level needs 100 more XP than the last: 300, 400, 500 ...
    let lv = 1, need = 300, rest = xp;
    while (rest >= need) { rest -= need; lv += 1; need += 100; }
    return { lv, into: rest, need };
  }
  // A day is active once its total movement reaches 5 minutes (snack sets add up)
  function activeDays(state, from, to) {
    const sum = {};
    state.log.forEach((e) => { if (e.day >= from && e.day <= to) sum[e.day] = (sum[e.day] || 0) + e.sec; });
    return new Set(Object.keys(sum).filter((d) => sum[d] >= 300));
  }
  function week(state, today) {
    const mon = mondayOf(today);
    const days = Array.from({ length: 7 }, (_, i) => { const k = addDays(mon, i); return { day: k, min: minutesOn(state, k), future: k > today }; });
    return { mon, days, active: activeDays(state, mon, addDays(mon, 6)).size };
  }
  // Weeks in a row with 3+ active days. The current week counts once it hits 3, and never breaks the streak while in progress.
  function streakWeeks(state, today) {
    let mon = mondayOf(today), n = 0;
    if (activeDays(state, mon, addDays(mon, 6)).size >= 3) n++;
    for (;;) {
      mon = addDays(mon, -7);
      if (activeDays(state, mon, addDays(mon, 6)).size >= 3) n++; else break;
    }
    return n;
  }

  // ---------- timer ----------
  // Where are we `elapsed` seconds into a stage?
  function segmentAt(segs, elapsed) {
    let t = 0;
    for (let i = 0; i < segs.length; i++) {
      const len = segs[i][1];
      if (elapsed < t + len) return { i, type: segs[i][0], len, left: t + len - elapsed, into: elapsed - t, done: false };
      t += len;
    }
    return { i: segs.length, done: true, left: 0 };
  }
  const NAMES = { warm: "준비 걷기", walk: "걷기", fast: "빠르게 걷기", run: "뛰기", cool: "마무리 걷기" };
  function fmtSay(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return (m ? m + "분" : "") + (m && s ? " " : "") + (s ? s + "초" : "");
  }
  function clock(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + pad(sec % 60); }
  // Which run is this (1-based) and how many in total
  function runNo(segs, i) {
    let n = 0, all = 0;
    segs.forEach((x, j) => { if (x[0] === "run") { all++; if (j <= i) n++; } });
    return { n, all };
  }
  function announce(segs, i) {
    const [type, len] = segs[i], L = fmtSay(len);
    if (type === "warm") return "준비 걷기 " + L + ". 편하게 걸으면서 몸을 풀어요.";
    if (type === "cool") return "마무리 걷기 " + L + ". 거의 다 왔어요. 천천히 숨을 골라요.";
    if (type === "fast") return "빠르게 걷기 " + L + ". 팔을 힘차게 흔들어요.";
    if (type === "walk") {
      const r = runNo(segs, i);
      return "걷기 " + L + "." + (r.all && r.n < r.all ? " 숨 고르세요. 다음 뛰기까지 " + L + "." : "");
    }
    const r = runNo(segs, i);
    return (r.all > 1 ? r.all + "번 중 " + r.n + "번째 " : "") + "뛰기 " + L + ". 시작!" + (r.n === r.all && r.all > 1 ? " 마지막이에요." : "");
  }

  function load(storage) {
    try { const raw = storage && storage.getItem(KEY); if (raw) return { ...fresh(), ...JSON.parse(raw) }; } catch (e) {}
    return fresh();
  }
  function save(storage, state) { try { storage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  const API = { KEY, GOAL_MIN, WORLDS, STAGES, NAMES, totalSec, runSec, runCount, xpFor, dayKey, addDays, mondayOf,
    SNACKS, SNACK, SNACK_XP, snackN, setSnackN, snackLabel, addSnack, snacksOn, koNum, activeDays,
    fresh, start, nodeState, todayPlan, canPlay, finish, rate, addManual, undoManual, minutesOn, level, week,
    streakWeeks, segmentAt, fmtSay, clock, runNo, announce, load, save };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RQ = API;
})(this);

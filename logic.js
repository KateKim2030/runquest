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
    { id: "chair", name: "의자에서 일어나기", short: "의자 일어나기", kind: "reps", n: 10, step: 5, tempo: 3, say: ["일어나요", "앉아요"], tip: "의자 끝에 앉아 손을 쓰지 않고 일어났다가 천천히 앉아요. 스쿼트가 어려울 때 좋아요." },
    { id: "squat", name: "스쿼트", kind: "reps", n: 10, step: 5, tempo: 2, say: ["앉아요", "일어나요"], tip: "엉덩이를 뒤로 빼며 의자에 앉듯이. 무릎은 발끝 방향으로." },
    { id: "wallpush", name: "벽 푸시업", kind: "reps", n: 10, step: 5, tempo: 2, say: ["가까이", "밀어요"], tip: "벽에서 한 걸음 반 떨어져 손을 어깨 높이에. 몸은 일자로." },
    { id: "row", name: "등 조이기", kind: "reps", n: 12, step: 2, tempo: 2.5, say: ["당겨요", "뻗어요"], tip: "팔을 앞으로 뻗었다가 팔꿈치를 뒤로 당겨 날개뼈를 모아요. 어깨는 내리고 가슴을 펴요." },
    { id: "calf", name: "까치발 들기", short: "까치발", kind: "reps", n: 20, step: 5, tempo: 1.5, say: ["올려요", "내려요"], tip: "발뒤꿈치를 천천히 올렸다 내려요. 벽을 살짝 짚어도 좋아요." },
    { id: "kickback", name: "뒤로 다리 들기", kind: "reps", n: 12, step: 2, tempo: 2.5, say: ["들어요", "내려요"], tip: "의자를 잡고 서서 한 다리를 뒤로 들어요. 허리는 꺾지 않고, 좌우를 번갈아." },
    { id: "bridge", name: "글루트 브릿지", kind: "reps", n: 15, step: 5, tempo: 2.5, say: ["들어요", "내려요"], tip: "누워서 무릎을 세우고, 엉덩이를 들어 어깨부터 무릎까지 일자로." },
    { id: "birddog", name: "버드독", kind: "reps", n: 10, step: 2, tempo: 3, say: ["뻗어요", "돌아와요"], tip: "네발 자세에서 반대쪽 팔과 다리를 뻗고 잠깐 멈춰요. 좌우 번갈아." },
    { id: "deadbug", name: "데드버그", kind: "reps", n: 10, step: 2, tempo: 3.5, say: ["뻗어요", "돌아와요"], tip: "누워서 팔과 무릎을 들고, 반대쪽 팔과 다리를 천천히 뻗어요. 허리는 바닥에 붙여요." },
    { id: "knee", name: "제자리 무릎 들기", kind: "time", n: 30, step: 10, tempo: 1.2, tip: "조용히 걷듯 무릎을 번갈아 높이 들어요. 뛰지 않아요." },
    { id: "kneeplank", name: "무릎 플랭크", kind: "time", n: 20, step: 10, tempo: 0, tip: "무릎을 바닥에 대고 팔꿈치로 버텨요. 머리부터 무릎까지 일자로, 숨은 참지 않아요." },
    { id: "wallsit", name: "벽에 기대 앉기", kind: "time", n: 30, step: 10, tempo: 0, tip: "등을 벽에 붙이고 무릎이 90도가 되게 앉아요." },
    { id: "lunge", level: "hard", name: "번갈아 런지", kind: "reps", n: 12, step: 2, tempo: 2.5, say: ["내딛어요", "돌아와요"], tip: "한 발 앞으로 내딛고 뒷무릎을 바닥 가까이. 다리를 바꿔 가며." },
    { id: "plank", level: "hard", name: "플랭크", kind: "time", n: 30, step: 10, tempo: 0, tip: "팔꿈치는 어깨 아래, 머리부터 발끝까지 일자로. 숨은 참지 않아요." },
  ];
  const SNACK = Object.fromEntries(SNACKS.map((x) => [x.id, x]));
  const SNACK_XP = 10;
  // Rep speed per exercise: the base tempo is "보통"; slow / fast scale it.
  const SPEEDS = { slow: { label: "느리게", f: 1.4 }, normal: { label: "보통", f: 1 }, fast: { label: "빠르게", f: 0.75 } };
  const snackSpeed = (state, id) => (state.snackSpeed && SPEEDS[state.snackSpeed[id]] ? state.snackSpeed[id] : "normal");
  function setSnackSpeed(state, id, sp) { if (SPEEDS[sp]) state.snackSpeed = { ...(state.snackSpeed || {}), [id]: sp }; return snackSpeed(state, id); }
  const tempoOf = (state, id, sp) => Math.round(SNACK[id].tempo * SPEEDS[sp || snackSpeed(state, id)].f * 10) / 10;
  const snackN = (state, id) => (state.snackPrefs && state.snackPrefs[id]) || SNACK[id].n;
  function setSnackN(state, id, n) {
    const x = SNACK[id], lo = x.kind === "time" ? 10 : Math.min(5, x.step * 2), hi = x.kind === "time" ? 120 : 30;
    state.snackPrefs = { ...(state.snackPrefs || {}), [id]: Math.max(lo, Math.min(hi, n)) };
    return state.snackPrefs[id];
  }
  const snackLabel = (id, n) => SNACK[id].name + " " + (SNACK[id].kind === "time" ? n + "초" : n + "개");
  // done = how many reps (or seconds) were actually finished; a set counts once it is at least half done
  // ---------- 오늘의 근력 퀘스트: one leg move + one upper/back move + one core move, rotating by date ----------
  const QUEST_XP = 50, BADGE_XP = 30;
  const Q_LEGS = ["chair", "squat", "calf", "kickback", "wallsit"], Q_UPPER = ["wallpush", "row", "birddog"], Q_CORE = ["kneeplank", "bridge", "knee", "deadbug"];
  const HARD_AFTER = 3; // badges needed before 런지 / 플랭크 show up in the daily quest
  const hardUnlocked = (state) => allBadges(state) >= HARD_AFTER;
  const dayNum = (k) => Math.round(parseDay(k).getTime() / 864e5);
  const fullSetOn = (state, day, id) => state.log.some((e) => e.day === day && e.kind === "snack" && e.snack === id && e.full);
  function strengthQuest(state, day) {
    const d = dayNum(day);
    const hard = hardUnlocked(state), legs = hard ? [...Q_LEGS, "lunge"] : Q_LEGS, core = hard ? [...Q_CORE, "plank"] : Q_CORE;
    return [legs[d % legs.length], Q_UPPER[d % Q_UPPER.length], core[d % core.length]].map((id) => ({ id, n: snackN(state, id), done: fullSetOn(state, day, id) }));
  }
  const questCleared = (state, day) => !!(state.qClears && state.qClears[day]);

  // ---------- 누적 배지: lifetime reps (or seconds) per exercise ----------
  const BADGE_STEPS = { reps: [50, 100, 300, 500, 1000], time: [60, 300, 600, 1800] };
  const snackTotal = (state, id) => state.log.reduce((a, e) => a + (e.kind === "snack" && e.snack === id ? e.n || 0 : 0), 0);
  function badgeLabel(id, step) {
    const x = SNACK[id];
    return x.name + " " + (x.kind === "time" ? (step >= 60 ? step / 60 + "분" : step + "초") : step.toLocaleString("ko-KR") + "개");
  }
  function badgesFor(state, id) {
    const steps = BADGE_STEPS[SNACK[id].kind], total = snackTotal(state, id);
    return { id, total, earned: steps.filter((v) => total >= v), next: steps.find((v) => total < v) || null };
  }
  const allBadges = (state) => SNACKS.reduce((a, x) => a + badgesFor(state, x.id).earned.length, 0);

  function addSnack(state, id, done, sec, today) {
    const target = snackN(state, id), full = done >= target;
    const xp = done * 2 >= target ? SNACK_XP : 0;
    const before = badgesFor(state, id).earned.length;
    state.xp += xp;
    state.log.push({ day: today, kind: "snack", snack: id, n: done, full, sec: Math.round(sec), done: full, xp });
    const out = { xp, full, questClear: false, badges: [] };
    // new badges
    badgesFor(state, id).earned.slice(before).forEach((step) => { out.badges.push(step); out.xp += BADGE_XP; state.xp += BADGE_XP; });
    // daily strength quest
    const q = strengthQuest(state, today);
    out.quest = q;
    if (q.every((it) => it.done) && !questCleared(state, today)) {
      state.qClears = { ...(state.qClears || {}), [today]: true };
      out.questClear = true; out.xp += QUEST_XP; state.xp += QUEST_XP;
    }
    return out;
  }
  // After a full set: "easy" adds reps next time, "hard" takes some away. Returns the new target, or null if unchanged.
  function rateSnack(state, id, rating) {
    const last = [...state.log].reverse().find((e) => e.kind === "snack" && e.snack === id);
    if (last) last.rating = rating;
    const x = SNACK[id], cur = snackN(state, id), d = x.kind === "time" ? 10 : 2;
    if (rating === "easy") return setSnackN(state, id, cur + d) !== cur ? snackN(state, id) : null;
    if (rating === "hard") return setSnackN(state, id, cur - d) !== cur ? snackN(state, id) : null;
    return null;
  }
  const snacksOn = (state, day, id) => state.log.filter((e) => e.day === day && e.kind === "snack" && e.xp > 0 && (!id || e.snack === id)).length;
  // Native Korean counting words for the voice: 하나, 둘 ... 스물, 서른
  function koNum(n) {
    const u = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"], t = ["", "열", "스물", "서른"];
    if (n <= 0 || n >= 40) return String(n);
    return t[Math.floor(n / 10)] + u[n % 10];
  }

  // ---------- 스트레칭: follow-along routines; each move is a 5-second "get ready" plus a hold ----------
  const STRETCH = {
    calf: { name: "종아리 늘리기", sec: 20, sides: true, tip: "벽을 짚고 한 발을 뒤로. 뒤꿈치를 바닥에 붙여요." },
    hamstring: { name: "허벅지 뒤 늘리기", sec: 20, sides: true, tip: "앉아서 한 다리를 펴고 발끝 쪽으로 천천히 숙여요. 등은 길게." },
    quad: { name: "허벅지 앞 늘리기", sec: 20, sides: true, tip: "서서 한 발을 뒤로 잡아 엉덩이 쪽으로. 벽을 짚어도 좋아요." },
    glute: { name: "엉덩이 늘리기", sec: 20, sides: true, tip: "의자에 앉아 한 발목을 반대쪽 무릎에 올리고 살짝 숙여요." },
    neck: { name: "목 옆 늘리기", sec: 20, sides: true, tip: "한 손으로 머리를 옆으로 살며시 당겨요. 어깨는 내리고." },
    chest: { name: "가슴 펴기", sec: 30, sides: false, tip: "등 뒤로 깍지를 끼고 가슴을 활짝. 어깨를 뒤로 모아요." },
    hipflexor: { name: "골반 앞쪽 늘리기", sec: 20, sides: true, tip: "한 무릎을 꿇고 골반을 앞으로 밀어요. 허리는 꺾지 않아요." },
    catcow: { name: "고양이-소 자세", sec: 30, sides: false, tip: "네발 자세에서 숨에 맞춰 등을 둥글게 말았다가 내려요." },
    child: { name: "아기 자세", sec: 40, sides: false, tip: "무릎 꿇고 엉덩이를 뒤꿈치 쪽으로, 팔은 앞으로 길게. 숨을 편하게." },
    kneehug: { name: "무릎 당기기", sec: 20, sides: true, tip: "누워서 한 무릎을 가슴으로 끌어안아요." },
    twist: { name: "누워서 허리 비틀기", sec: 25, sides: true, tip: "누워서 두 무릎을 한쪽으로 넘기고 시선은 반대로." },
  };
  const ROUTINES = [
    { id: "afterrun", name: "달리기 후 스트레칭", desc: "뛴 다리를 풀어 줘요", items: ["calf", "hamstring", "quad", "glute"] },
    { id: "desk", name: "오래 앉은 뒤 스트레칭", desc: "굳은 목 · 어깨 · 골반 펴기", items: ["neck", "chest", "hipflexor", "catcow"] },
    { id: "bed", name: "자기 전 스트레칭", desc: "바닥에서 편하게 마무리", items: ["catcow", "child", "kneehug", "twist"] },
  ];
  const ROUTINE = Object.fromEntries(ROUTINES.map((x) => [x.id, x]));
  const PREP = 5, STRETCH_XP = 20;
  // One step per side: { id, side: "" | "왼쪽" | "오른쪽", sec, at } where `at` is when its get-ready count starts.
  function routineSteps(rid) {
    const out = []; let t = 0;
    ROUTINE[rid].items.forEach((id) => (STRETCH[id].sides ? ["왼쪽", "오른쪽"] : [""]).forEach((side) => {
      out.push({ id, side, sec: STRETCH[id].sec, at: t }); t += PREP + STRETCH[id].sec;
    }));
    return out;
  }
  const routineTotal = (steps) => { const l = steps[steps.length - 1]; return l.at + PREP + l.sec; };
  function routinePos(steps, el) {
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i], hold = st.at + PREP, end = hold + st.sec;
      if (el < hold) return { i, phase: "prep", left: hold - el, done: false };
      if (el < end) return { i, phase: "hold", left: end - el, into: el - hold, done: false };
    }
    return { i: steps.length, done: true, left: 0 };
  }
  // A finished routine earns XP; a stopped one still adds its time to today's movement.
  function addStretch(state, rid, sec, complete, today) {
    const xp = complete ? STRETCH_XP : 0;
    state.xp += xp;
    state.log.push({ day: today, kind: "stretch", routine: rid, sec: Math.round(sec), done: !!complete, xp });
    return { xp };
  }
  const stretchesOn = (state, day, rid) => state.log.filter((e) => e.day === day && e.kind === "stretch" && e.done && (!rid || e.routine === rid)).length;

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
    const set = new Set(Object.keys(sum).filter((d) => sum[d] >= 300));
    // a cleared strength quest also makes the day count, even though three sets take under two minutes
    Object.keys(state.qClears || {}).forEach((d) => { if (d >= from && d <= to) set.add(d); });
    return set;
  }
  function week(state, today) {
    const mon = mondayOf(today);
    const act = activeDays(state, mon, addDays(mon, 6));
    const days = Array.from({ length: 7 }, (_, i) => { const k = addDays(mon, i); return { day: k, min: minutesOn(state, k), future: k > today, active: act.has(k) }; });
    return { mon, days, active: act.size };
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
  // True once every working segment is finished and only the cool-down walk is left (or the stage is over).
  function reachedCooldown(segs, elapsed) { const p = segmentAt(segs, elapsed); return p.done || p.i >= segs.length - 1; }

  // ---------- backup ----------
  const exportData = (state, now) => JSON.stringify({ app: "runquest", exported: now || "", state });
  function importData(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error("파일을 읽을 수 없어요."); }
    const st = o && o.app === "runquest" ? o.state : o;
    if (!st || st.v !== 1 || !Array.isArray(st.log) || typeof st.cleared !== "number" || typeof st.xp !== "number")
      throw new Error("런퀘스트 백업 파일이 아니에요.");
    return { ...fresh(), ...st };
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
    STRETCH, ROUTINES, ROUTINE, PREP, STRETCH_XP, routineSteps, routineTotal, routinePos, addStretch, stretchesOn, hardUnlocked, HARD_AFTER,
    SNACKS, SNACK, SNACK_XP, QUEST_XP, BADGE_XP, BADGE_STEPS, strengthQuest, questCleared, snackTotal, badgeLabel, badgesFor, allBadges, rateSnack, SPEEDS, snackSpeed, setSnackSpeed, tempoOf, snackN, setSnackN, snackLabel, addSnack, snacksOn, koNum, activeDays,
    reachedCooldown, exportData, importData,
    fresh, start, nodeState, todayPlan, canPlay, finish, rate, addManual, undoManual, minutesOn, level, week,
    streakWeeks, segmentAt, fmtSay, clock, runNo, announce, load, save };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RQ = API;
})(this);

// node tools/test.js — checks the game rules in logic.js
const RQ = require("../logic.js");
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log("FAIL:", msg); } };

ok(RQ.STAGES.length === 24, "24 stages");
ok(RQ.STAGES.every((s) => s.segs[0][0] === "warm" && s.segs[s.segs.length - 1][0] === "cool"), "every stage has warm-up and cool-down");
ok(RQ.STAGES[23].id === "6-보스" && RQ.runSec(RQ.STAGES[23]) === 1800, "final boss is 30 min run");
const s21 = RQ.STAGES[4];
ok(s21.id === "2-1" && RQ.runCount(s21) === 5 && RQ.totalSec(s21) === 23 * 60, "2-1 = 1분x5, 23분");
ok(RQ.STAGES.every((s) => RQ.totalSec(s) <= 41 * 60), "no stage longer than 41 min");

// start from world 2
let S = RQ.start(RQ.fresh(), 2);
const D1 = "2026-11-11", D2 = "2026-11-12", D3 = "2026-11-13";
ok(S.cleared === 4 && RQ.nodeState(S, 3, D1) === "done" && RQ.nodeState(S, 4, D1) === "today", "world 2 start");
ok(RQ.todayPlan(S, D1).stage.id === "2-1", "today = 2-1");

// stopped run: no clear, partial xp
let r = RQ.finish(S, 4, 7 * 60 + 30, false, D1);
ok(!r.newClear && S.cleared === 4 && r.xp === 35, "stopped run is not a clear, xp 7*5");
ok(RQ.minutesOn(S, D1) === 7, "stopped minutes count toward today");

// clear 2-1 → next stage opens tomorrow
r = RQ.finish(S, 4, RQ.totalSec(s21), true, D1);
ok(r.newClear && S.cleared === 5 && r.xp === 230, "clear 2-1 +230xp");
ok(RQ.nodeState(S, 5, D1) === "tomorrow" && RQ.todayPlan(S, D1).kind === "rest", "2-2 waits until tomorrow");
r = RQ.finish(S, 4, RQ.totalSec(s21), true, D1);
ok(!r.newClear && S.cleared === 5 && r.xp === 230, "replay same day gives xp only");
ok(RQ.nodeState(S, 5, D2) === "today", "2-2 opens next day");

// hard rating suggests repeat
RQ.rate(S, 4, "hard");
let p = RQ.todayPlan(S, D2);
ok(p.kind === "repeat" && p.stage.id === "2-1" && p.next.id === "2-2", "hard → repeat 2-1 suggested");
RQ.finish(S, 4, RQ.totalSec(s21), true, D2);
RQ.rate(S, 4, "ok");
ok(RQ.todayPlan(S, D2).kind === "new" && S.repeatIdx === null, "after an ok replay, back to new stage");
RQ.finish(S, 5, RQ.totalSec(RQ.STAGES[5]), true, D2);
ok(S.cleared === 6 && RQ.todayPlan(S, D3).stage.id === "2-3", "2-2 cleared, 2-3 next");

// manual minutes and undo
RQ.addManual(S, 10, D3);
ok(RQ.minutesOn(S, D3) === 10, "+10분");
ok(RQ.undoManual(S, D3) && RQ.minutesOn(S, D3) === 0, "undo +10분");

// weeks: 2026-11-09 is Monday
ok(RQ.mondayOf("2026-11-15") === "2026-11-09" && RQ.mondayOf("2026-11-09") === "2026-11-09", "monday");
const W = RQ.fresh();
["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-10"].forEach((d) => RQ.addManual(W, 20, d));
ok(RQ.streakWeeks(W, "2026-11-11") === 1, "last week 3 days → 1 week streak, this week in progress");
["2026-11-12", "2026-11-13"].forEach((d) => RQ.addManual(W, 20, d));
ok(RQ.streakWeeks(W, "2026-11-13") === 2 && RQ.week(W, "2026-11-13").active === 3, "this week hits 3 → 2 weeks");

// timer positions
const segs = s21.segs;
ok(RQ.segmentAt(segs, 0).type === "warm" && RQ.segmentAt(segs, 300).type === "run", "segment at 5:00 is run");
ok(RQ.segmentAt(segs, 359.5).type === "run" && RQ.segmentAt(segs, 360).type === "walk", "run ends at 6:00");
ok(RQ.segmentAt(segs, 23 * 60).done, "done at end");
ok(RQ.announce(segs, 1) === "5번 중 1번째 뛰기 1분. 시작!", "announce: " + RQ.announce(segs, 1));
ok(/마지막/.test(RQ.announce(segs, 9)), "last run announced");
ok(RQ.clock(65.2) === "1:06" && RQ.fmtSay(90) === "1분 30초", "formatting");

// level curve
ok(RQ.level(0).lv === 1 && RQ.level(300).lv === 2 && RQ.level(699).lv === 2 && RQ.level(700).lv === 3, "levels 300/400");

// all clear
const A = RQ.start(RQ.fresh(), 2);
let day = "2026-12-01";
for (let i = 4; i < 24; i++) { RQ.finish(A, i, RQ.totalSec(RQ.STAGES[i]), true, day); day = RQ.addDays(day, 2); }
ok(A.cleared === 24 && RQ.todayPlan(A, day).kind === "allclear", "all 24 cleared");

// snack workouts
const N = RQ.start(RQ.fresh(), 2);
ok(RQ.SNACKS.length === 9 && RQ.snackN(N, "squat") === 10, "9 snacks, squat 10");
ok(RQ.setSnackN(N, "squat", 15) === 15 && RQ.snackN(N, "squat") === 15 && RQ.setSnackN(N, "squat", 99) === 30, "squat count adjustable, max 30");
RQ.setSnackN(N, "squat", 10);
let sr = RQ.addSnack(N, "squat", 10, 31, "2026-11-11");
ok(sr.xp === 10 && sr.full && RQ.snacksOn(N, "2026-11-11") === 1, "full squat set +10xp");
sr = RQ.addSnack(N, "squat", 3, 9, "2026-11-11");
ok(sr.xp === 0 && RQ.snacksOn(N, "2026-11-11") === 1, "3 of 10 does not count as a set");
ok(RQ.addSnack(N, "plank", 20, 20, "2026-11-11").xp === 10, "plank 20 of 30 sec counts");
ok(RQ.koNum(1) === "하나" && RQ.koNum(10) === "열" && RQ.koNum(15) === "열다섯" && RQ.koNum(20) === "스물" && RQ.koNum(30) === "서른", "korean counting");
const AD = RQ.fresh();
for (let i = 0; i < 10; i++) RQ.addSnack(AD, "squat", 10, 31, "2026-11-11");
ok(RQ.activeDays(AD, "2026-11-11", "2026-11-11").size === 1, "10 snack sets (5 min+) make an active day");

// rep speed
const SP = RQ.fresh();
ok(RQ.tempoOf(SP, "squat") === 2 && RQ.snackSpeed(SP, "squat") === "normal", "squat 2s per rep by default");
RQ.setSnackSpeed(SP, "squat", "fast");
ok(RQ.tempoOf(SP, "squat") === 1.5 && RQ.tempoOf(SP, "squat", "slow") === 2.8, "fast 1.5s, slow 2.8s");
ok(RQ.setSnackSpeed(SP, "squat", "zzz") === "fast", "unknown speed ignored");

// strength quest, badges, level-up
const Q = RQ.fresh(), QD = "2026-11-12";
const quest = RQ.strengthQuest(Q, QD);
ok(quest.length === 3 && new Set(quest.map((q) => q.id)).size === 3, "quest has 3 different moves: " + quest.map((q) => q.id));
ok(RQ.strengthQuest(Q, "2026-11-13").map((q) => q.id).join() !== quest.map((q) => q.id).join(), "quest changes the next day");
let qr = RQ.addSnack(Q, quest[0].id, quest[0].n, 20, QD);
ok(!qr.questClear && RQ.strengthQuest(Q, QD)[0].done, "first quest move checked");
RQ.addSnack(Q, quest[1].id, quest[1].n, 20, QD);
qr = RQ.addSnack(Q, quest[2].id, quest[2].n, 30, QD);
ok(qr.questClear && qr.xp === RQ.SNACK_XP + RQ.QUEST_XP && RQ.questCleared(Q, QD), "3 of 3 -> quest clear +50");
ok(!RQ.addSnack(Q, quest[2].id, quest[2].n, 30, QD).questClear, "quest bonus only once a day");
const B = RQ.fresh();
for (let i = 0; i < 4; i++) RQ.addSnack(B, "squat", 10, 20, "2026-11-12");
let br = RQ.addSnack(B, "squat", 10, 20, "2026-11-12");
ok(br.badges.length === 1 && br.badges[0] === 50 && RQ.badgesFor(B, "squat").next === 100, "50 squats -> first badge");
ok(RQ.badgeLabel("plank", 300) === "플랭크 5분" && RQ.badgeLabel("squat", 1000) === "스쿼트 1,000개", "badge labels");
ok(RQ.rateSnack(B, "squat", "easy") === 12 && RQ.snackN(B, "squat") === 12, "easy -> 12 next time");
ok(RQ.rateSnack(B, "squat", "ok") === null && RQ.rateSnack(B, "squat", "hard") === 10, "ok keeps, hard -> 10");
ok(RQ.rateSnack(B, "plank", "easy") === 40, "plank easy -> 40s");

// review fixes: cool-down clear, quest days count, backup
const cs = RQ.STAGES[4].segs; // 2-1: warm 5, (run 1 + walk 2) x4 + run 1, cool 5 = 23 min
ok(!RQ.reachedCooldown(cs, 17 * 60 + 59) && RQ.reachedCooldown(cs, 18 * 60 + 1) && RQ.reachedCooldown(cs, 23 * 60), "cool-down starts at 18:00 in 2-1");
const QA = RQ.fresh(); QA.qClears = { "2026-11-10": true, "2026-11-11": true, "2026-11-12": true };
ok(RQ.week(QA, "2026-11-12").active === 3 && RQ.week(QA, "2026-11-12").days[1].active && RQ.streakWeeks(QA, "2026-11-12") === 1, "strength quest days count toward the week");
const EX = RQ.start(RQ.fresh(), 2); RQ.addSnack(EX, "squat", 10, 20, "2026-11-12"); EX.mode = "strength";
const back = RQ.importData(RQ.exportData(EX, "2026-11-12T00:00:00Z"));
ok(back.cleared === 4 && back.log.length === 1 && back.mode === "strength" && back.xp === EX.xp, "backup round trip");
let threw = 0; ["nope", "{}", '{"v":1}', '{"app":"runquest","state":{"v":2,"log":[],"cleared":0,"xp":0}}'].forEach((x) => { try { RQ.importData(x); } catch (e) { threw++; } });
ok(threw === 4, "bad backup files are rejected");

console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);

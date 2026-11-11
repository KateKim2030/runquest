"""Phone screenshots of app states via headless Edge (one 375px iframe per state).
Needs the app served at http://localhost:8766 (python -m http.server 8766 in the app folder).
Usage: python tools/shots.py <app dir> <out.png> [height]"""
import json, pathlib, subprocess, sys, time

app = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2]).resolve()
H = int(sys.argv[3]) if len(sys.argv) > 3 else 780
sd = app / "shots"; sd.mkdir(exist_ok=True)
T = time.strftime("%Y-%m-%d")

def st(**kw):
    s = {"v": 1, "started": True, "cleared": 4, "skippedWorld1": True, "lastClearDay": None, "repeatIdx": None,
         "xp": 0, "log": [], "voice": False, "safetyOk": True}
    s.update(kw); return s

log = [{"day": T, "kind": "stage", "stage": "2-1", "idx": 4, "sec": 1380, "done": True, "xp": 230, "rating": "ok"}]
STATES = {
    "1_intro": (None, ""),
    "2_today": (st(), ""),
    "3_map": (st(cleared=6, xp=520), 'go("map");scrollTo(0,0)'),
    "4_sheet": (st(cleared=6), 'go("map");openStage(6)'),
    "5_run": (st(), "startRun(4);R.startAt-=310e3;tick()"),
    "6_walk": (st(), "startRun(4);R.startAt-=372e3;tick()"),
    "7_dim": (st(), 'startRun(4);R.startAt-=372e3;tick();document.getElementById("r-dim").click()'),
    "8_clear": (st(xp=200), "startRun(4);R.startAt-=1381e3;tick()"),
    "9_rest": (st(cleared=5, lastClearDay=T, xp=260, log=log), ""),
    "2b_today_low": (st(), 'scrollTo(0,640)'),
    "11_snack": (st(xp=40, log=[{"day": T, "kind": "snack", "snack": "squat", "n": 10, "full": True, "sec": 30, "done": True, "xp": 10}]), 'go("snack")'),
    "12_sheet": (st(), 'go("snack");openSnackSheet("squat")'),
    "13_count": (st(), 'startSnack("squat");SK.startAt-=(3+4*3+0.6)*1000;skTick()'),
    "14_plank": (st(), 'startSnack("plank");SK.startAt-=(3+12.2)*1000;skTick()'),
    "15_done": (st(), 'startSnack("squat");SK.startAt-=(3+30.2)*1000;skTick()'),
    "16_quest": (st(mode="strength"), 'const q=RQ.strengthQuest(S,today());RQ.addSnack(S,q[0].id,q[0].n,20,today());render()'),
    "17_qclear": (st(xp=100, log=[{"day": "2026-11-01", "kind": "snack", "snack": "squat", "n": 45, "full": True, "sec": 90, "done": True, "xp": 10}]), 'const q=RQ.strengthQuest(S,today());RQ.addSnack(S,q[0].id,q[0].n,20,today());RQ.addSnack(S,q[1].id,q[1].n,20,today());startSnack(q[2].id);SK.startAt-=300e3;skTick()'),
    "18_badge": (st(xp=100, log=[{"day": "2026-11-01", "kind": "snack", "snack": "squat", "n": 40, "full": True, "sec": 90, "done": True, "xp": 10}]), 'startSnack("squat");SK.startAt-=300e3;skTick()'),
    "19_logbadges": (st(xp=400, log=[{"day": "2026-11-01", "kind": "snack", "snack": "squat", "n": 120, "full": True, "sec": 300, "done": True, "xp": 10}, {"day": "2026-11-02", "kind": "snack", "snack": "plank", "n": 90, "full": True, "sec": 90, "done": True, "xp": 10}]), 'go("log");scrollTo(0,330)'),
    "10_log": (st(cleared=7, xp=900, log=log + [{"day": T, "kind": "manual", "sec": 600, "done": True, "xp": 10}]), 'go("log")'),
}
for name, (state, act) in STATES.items():
    # The app's state comes from the page itself (not shared localStorage), so iframes can't race each other.
    init = "RQ.fresh()" if state is None else "Object.assign(RQ.fresh()," + json.dumps(state) + ")"
    js = ("fetch('../index.html').then(r=>r.text()).then(h=>{"
          "h=h.replace('<head>','<head><base href=\"../\">')"
          ".replace('let S = RQ.load(localStorage);','let S = ' + " + json.dumps(init) + " + ';')"
          ".replace('localStorage.getItem(RUNKEY)','null')"
          ".replace('</body>','<script>setTimeout(()=>{' + " + json.dumps(act) + " + '},300)<\\/script></body>');"
          "document.open();document.write(h);document.close();});")
    (sd / f"{name}.html").write_text("<script>" + js + "</script>", encoding="utf-8")

frames = "".join(f'<iframe src="{n}.html" width="375" height="{H}" style="border:0;margin:6px"></iframe>' for n in STATES)
(sd / "wrap.html").write_text(f'<!doctype html><body style="margin:0;background:#666;white-space:nowrap">{frames}</body>', encoding="utf-8")
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
out.unlink(missing_ok=True)
prof = out.parent / f"edge_profile_{time.time_ns()}"
subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={prof}", "--virtual-time-budget=5000",
                "--hide-scrollbars", f"--window-size={len(STATES) * 387 + 12},{H + 12}", f"--screenshot={out}",
                "http://localhost:8766/shots/wrap.html"], capture_output=True, timeout=120)
for _ in range(20):
    if out.exists(): break
    time.sleep(0.5)
print("ok" if out.exists() else "failed", out)

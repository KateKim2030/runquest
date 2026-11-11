"""Preview color palettes on real app screens (today, map, run, walk) via headless Edge.
Needs the app served at http://localhost:8766. Usage: python tools/palettes.py <app dir> <out dir>"""
import json, pathlib, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont

app = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]).resolve(); out.mkdir(parents=True, exist_ok=True)
sd = app / "shots"; sd.mkdir(exist_ok=True)
T = time.strftime("%Y-%m-%d")

def pal(bg, bg2, card, line, ink, soft, dim, run, walk, fast, warm, gold, edge, quest, on_walk="#fff", on_fast="#3a2c08", sky="none"):
    d = lambda c: c[1]  # placeholder, deep shades given explicitly below
    return {"bg": bg, "bg2": bg2, "card": card, "line": line, "ink": ink, "soft": soft, "dim": dim,
            "run": run[0], "run-d": run[1], "walk": walk[0], "walk-d": walk[1], "fast": fast[0], "fast-d": fast[1],
            "warm": warm[0], "warm-d": warm[1], "gold": gold[0], "gold-d": gold[1], "edge": edge, "quest": quest,
            "nav": bg2 + "f2", "paused": soft if ink < "#8" else line, "sel": card,
            "on-run": "#fff", "on-walk": on_walk, "on-fast": on_fast, "on-gold": "#3a2c08", "on-warm": "#fff", "sky": sky, "hi": gold[0] if ink > "#8" else "#9a6b12"}

PALETTES = {
    "1 차분한 밤": pal("#1b2130", "#222a3b", "#2c3548", "#3a4459", "#ece8e1", "#a9b0bf", "#77808f",
                    ("#e2805f", "#b05f43"), ("#6db592", "#4d8a6d"), ("#d9b45e", "#a8873f"), ("#8c95c4", "#6770a0"),
                    ("#e0c07a", "#ac9050"), "#151a26", "#2e2c3c", on_walk="#10281b"),
    "2 따뜻한 종이": pal("#f5f1ea", "#fffdf9", "#ece6dc", "#e3dbce", "#2e2a26", "#6e665c", "#a39a8e",
                     ("#e07a55", "#b9603f"), ("#5ea883", "#468565"), ("#e3b34f", "#b88d36"), ("#8e98c8", "#6b75a5"),
                     ("#e2b44c", "#b78f33"), "#d9d0c2", "#fbeee5"),
    "3 숲속 새벽": pal("#18211d", "#1f2a25", "#29362f", "#36463d", "#eef0e8", "#a8b5ab", "#74837a",
                    ("#d98a5f", "#a96643"), ("#8cc29f", "#66977a"), ("#d8bf72", "#a99350"), ("#8fa6b8", "#6a8193"),
                    ("#d8bf72", "#a99350"), "#121915", "#2b2f27", on_walk="#14281c"),
    "4 회색에 주황 하나": pal("#161616", "#1f1f1f", "#2a2a2a", "#383838", "#eeeeee", "#a8a8a8", "#6f6f6f",
                        ("#f08a5d", "#bd6942"), ("#9fb7a8", "#7a8f82"), ("#c8b27a", "#9c8a5c"), ("#7d7d86", "#5c5c64"),
                        ("#d9b26a", "#a8884c"), "#0e0e0e", "#272220", on_walk="#1a241e"),
    "5 맑은 하늘": pal("#eef3f7", "#ffffff", "#e3eaf0", "#d6e0e8", "#263340", "#5d6d7c", "#95a3b0",
                    ("#ef8a6b", "#c56b50"), ("#5fb3a1", "#46887a"), ("#f0bf5a", "#c39740"), ("#8aa3d6", "#6a82b3"),
                    ("#f0bf5a", "#c39740"), "#cdd8e2", "#fdf1ec"),
}

DOTS = "radial-gradient(rgba(23,19,15,.13) 1.3px, transparent 1.5px)"
STICKER_ARGS = ("#ece6dc", "#fffdf7", "#f3eee5")
PALETTES["6 영어앱 색"] = pal(*STICKER_ARGS, "#d6ccbb", "#17130f", "#5d5346", "#8f8576",
    ("#ff5c8a", "#c93c66"), ("#1e6a4c", "#124632"), ("#ffce3a", "#c99d1c"), ("#7d8fd6", "#5a6bb0"),
    ("#ffce3a", "#c99d1c"), "#cfc5b4", "#ffe9f0", sky=DOTS)
PALETTES["7 영어앱 스티커북 (테두리까지)"] = dict(PALETTES["6 영어앱 색"], line="#17130f", edge="#17130f")
EXTRA = {"6 영어앱 색": "body{background-size:18px 18px}",
  "7 영어앱 스티커북 (테두리까지)": """body{background-size:18px 18px}
.card,.tile,.world-ban,.sheet,.modal .box{border:3px solid var(--ink)!important;box-shadow:5px 5px 0 var(--ink)}
.btn{border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink)!important}
.btn:active{transform:translate(4px,4px);box-shadow:0 0 0 var(--ink)!important}
.node .dot{border-color:var(--ink)!important;box-shadow:4px 4px 0 var(--ink)!important}
.chip,.weekdots i{border:2px solid var(--ink)}
.lvbadge{border:2px solid var(--ink);box-shadow:2px 2px 0 var(--ink)!important}
.quest{transform:rotate(-.8deg)} .world-ban{transform:rotate(.5deg)}
.xpbar{border:2px solid var(--ink)} nav{border-top:3px solid var(--ink)} nav button.on{border:2px solid var(--ink)}
.rs-prog i{border:2px solid var(--ink)} .rs-next{border:2px solid currentColor;background:transparent}"""}
ONLY = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None

state = {"v": 1, "started": True, "cleared": 6, "skippedWorld1": True, "lastClearDay": None, "repeatIdx": None, "xp": 520,
         "log": [{"day": T, "kind": "manual", "sec": 720, "done": True, "xp": 12}], "voice": False, "safetyOk": True}
SCREENS = {"today": "", "map": 'go("map");scrollTo(0,0)', "run": "startRun(6);R.startAt-=310e3;tick()", "walk": "startRun(6);R.startAt-=420e3;tick()"}
init = "Object.assign(RQ.fresh()," + json.dumps(state) + ")"
edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
H = 760
rows = []
for pi, (pname, p) in enumerate(PALETTES.items()):
    if ONLY and str(pi + 1) not in ONLY: continue
    css = ":root{" + "".join(f"--{k}:{v};" for k, v in p.items()) + "}" + EXTRA.get(pname, "")
    names = []
    for scr, act in SCREENS.items():
        n = f"pal{pi}_{scr}"; names.append(n)
        js = ("fetch('../index.html').then(r=>r.text()).then(h=>{"
              "h=h.replace('<head>','<head><base href=\"../\">').replace('</head>'," + json.dumps("<style>" + css + "</style></head>") + ")"
              ".replace('let S = RQ.load(localStorage);','let S = ' + " + json.dumps(init) + " + ';')"
              ".replace('localStorage.getItem(RUNKEY)','null')"
              ".replace('</body>','<script>setTimeout(()=>{' + " + json.dumps(act) + " + '},300)<\\/script></body>');"
              "document.open();document.write(h);document.close();});")
        (sd / f"{n}.html").write_text("<script>" + js + "</script>", encoding="utf-8")
    frames = "".join(f'<iframe src="{n}.html" width="375" height="{H}" style="border:0;margin:6px"></iframe>' for n in names)
    (sd / f"pal{pi}.html").write_text(f'<!doctype html><body style="margin:0;background:#777;white-space:nowrap">{frames}</body>', encoding="utf-8")
    png = out / f"palette_{pi + 1}.png"; png.unlink(missing_ok=True)
    subprocess.run([edge, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={out / ('prof' + str(time.time_ns()))}",
                    "--virtual-time-budget=5000", "--hide-scrollbars", f"--window-size={4 * 387 + 12},{H + 12}", f"--screenshot={png}",
                    f"http://localhost:8766/shots/pal{pi}.html"], capture_output=True, timeout=120)
    for _ in range(20):
        if png.exists(): break
        time.sleep(0.5)
    # label strip on top
    im = Image.open(png)
    lab = Image.new("RGB", (im.width, im.height + 56), "#777")
    lab.paste(im, (0, 56))
    font = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 34)
    ImageDraw.Draw(lab).text((14, 8), pname, fill="#fff", font=font)
    lab.save(png); rows.append(lab); print(pname, "ok")

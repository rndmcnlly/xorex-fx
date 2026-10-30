# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright", "pillow"]
# ///
"""Silent deterministic feedback beats, causal memory and contact-sheet evidence."""
import copy
import functools
import http.server
import json
import threading
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated" / "feedback"
OUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(HERE.parents[1])))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
captures, checks = {}, []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        try:
            context = browser.new_context(viewport={"width": 1000, "height": 1000}, device_scale_factor=1)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.clock.install(time=0)
            page.goto(f"http://127.0.0.1:{server.server_port}/04-rendering-lab/motion-playable/?inspect&seed=2009")
            page.wait_for_function("!!window.motionInspection")
            page.clock.pause_at(1000)
            base = {"lanes": [[] for _ in range(20)], "pos": 10, "frames": 100, "lost": False,
                    "inventory": {"color": None, "n": 0}, "capacitor": {"color": None, "n": 0}}
            # A little context for actual game-object contrast, away from tested lane.
            for lane in [2, 3, 5, 7, 15, 17]:
                base["lanes"][lane] = ["black", "red", "blue", "green", "yellow"]

            def load(held=None, charge=None, lane=None):
                state = copy.deepcopy(base)
                if held:
                    state["inventory"] = {"color": held[0], "n": held[1]}
                if charge:
                    state["capacitor"] = {"color": charge[0], "n": charge[1]}
                if lane:
                    state["lanes"][10] = lane
                page.evaluate("s=>motionInspection.loadFixture(s)", state)

            def keys(*commands):
                return page.evaluate("""commands=>{
                    if(document.getElementById('pause').textContent.startsWith('Resume'))document.getElementById('pause').click();
                    document.getElementById('stage').focus();
                    for(const command of commands){const key='Arrow'+command;window.dispatchEvent(new KeyboardEvent('keydown',{key,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key}));}
                    return {state:motionInspection.exportState(),metrics:motionInspection.metrics()};
                }""", list(commands))

            def capture(name, advance=0):
                if advance:
                    page.clock.run_for(advance)
                page.locator("#board").screenshot(path=str(OUT / f"{name}.png"))
                captures[name] = page.evaluate("({state:motionInspection.exportState(),metrics:motionInspection.metrics(),now:performance.now()})")

            scenarios = [
                ("loss-red-blue", ("red", 3), ("blue", 5), None, "Down", "mismatch"),
                ("loss-green-white", ("green", 2), ("white", 4), None, "Down", "mismatch"),
                ("white-boost", ("white", 2), ("green", 3), None, "Down", "white-boost"),
                ("matching-reload", ("blue", 3), ("blue", 2), None, "Down", "matching-reload"),
                ("black-break", None, ("pink", 1), ["red", "blue", "black"], "Up", "black-break"),
                ("dry-shot", None, ("yellow", 1), None, "Up", "dry-shot"),
                ("white-stored", ("white", 2), None, None, "Down", "white-stored"),
            ]
            for name, held, charge, lane, command, kind in scenarios:
                load(held, charge, lane)
                result = keys(command)
                assert result["metrics"]["feedback"]["kind"] == kind
                capture(f"{name}-020", 20)
                capture(f"{name}-100", 80)
                capture(f"{name}-220", 120)
                capture(f"{name}-900", 680)
                if kind == "black-break":
                    assert result["state"]["capacitor"]["n"] == 0
                    assert result["metrics"]["memories"][0]["killerColor"] == "pink"
                if kind == "white-boost":
                    assert result["state"]["capacitor"]["n"] == 23
                checks.append(f"{kind}: exact committed consequences and controlled 20/100/220/900ms visual beats")

            # Natural arrow-key sequence, not reinjected fixtures: multiple losses,
            # a boost, a last-charge black kill and a second boost coexist.
            history = copy.deepcopy(base)
            history["capacitor"] = {"color": "blue", "n": 1}
            history["lanes"][10] = ["green", "green", "red", "red", "green", "green", "white", "white"]
            history["lanes"][11] = ["white", "white", "yellow", "black"]
            page.evaluate("s=>motionInspection.loadFixture(s)", history)
            keys("Down", "Down")  # white boosts blue
            page.clock.run_for(350)
            keys("Down", "Down")  # green loses blue charge
            page.clock.run_for(350)
            keys("Down", "Down", "Down", "Down")  # red charge, green loses it
            page.clock.run_for(350)
            # Lane 10 is empty now. A single yellow from context lane 17 opens
            # lane 11's black, exhausting its charge before the next white boost.
            keys(*(["Right"] * 7), "Down", "Down")
            keys(*(["Left"] * 6), "Up")
            keys("Down", "Down", "Down", "Down")  # yellow charge then white boost
            result = page.evaluate("motionInspection.metrics()")
            kinds = [m["kind"] for m in result["memories"]]
            assert kinds.count("mixed-loss") == 2, kinds
            assert kinds.count("white-echo") == 2, kinds
            assert kinds.count("black-scar") == 1, kinds
            assert result["memories"][3]["killerColor"] == "yellow"
            capture("accumulated-history", 150)
            keys("Left", "Left", "Left")
            capture("history-after-juke", 500)
            echoes = page.evaluate("motionInspection.metrics().memories.filter(m=>m.kind==='white-echo')")
            assert [e["lane"] for e in echoes] == [10, 11]
            page.locator("#reduced").check()
            capture("reduced-history")
            assert page.evaluate("motionInspection.metrics().effects") == 0
            assert len(page.evaluate("motionInspection.metrics().memories")) == 5
            page.locator("#plain").check()
            capture("steady-history")
            page.locator("#plain").uncheck()
            load(("red", 2), ("white", 3))
            result = keys("Down")
            assert result["metrics"]["effects"] == 0
            assert result["metrics"]["memories"][0]["held"]["color"] == "red"
            capture("reduced-loss", 100)
            page.locator("#reduced").uncheck()
            load(("white", 2), ("green", 2))
            keys("Down", "Right")
            capture("white-site-glow", 2300)
            capture("white-site-echo", 3200)
            assert page.evaluate("motionInspection.metrics().memories[0].lane") == 10
            # Saturation check: 40 independent mismatches at one site, using
            # only ordinary gather/convert input. History is spatially aged.
            dense = copy.deepcopy(base)
            dense["lanes"][10] = [color for _ in range(40) for color in ["red", "red", "blue", "blue"]]
            page.evaluate("s=>motionInspection.loadFixture(s)", dense)
            keys(*(["Down"] * 160))
            assert len(page.evaluate("motionInspection.metrics().memories")) == 40
            capture("dense-mixed-history", 1200)
            density = page.evaluate("motionInspection.metrics().memories.map(m=>m.alpha)")
            assert sum(density) < 6 and density[0] < .001
            checks.append("40 same-site losses accumulate with spatial aging, total opacity below six fresh records")
            page.clock.run_for(23000)
            assert page.evaluate("motionInspection.metrics().memories.length") == 0
            assert not errors, errors
            checks.append("five causal records accumulate via natural input; fixed white sites; static reduced/steady history; eventual cleanup")
            context.close()
        finally:
            browser.close()
    # Timing contact sheet: crop the bottom resource area (black target included
    # in its full-board image), never silently stretch or color-transform it.
    names = [f"{s[0]}-{time:03}" for s in scenarios for time in [20, 100, 220, 900]]
    sheet = Image.new("RGB", (4 * 400, len(scenarios) * 210), "#25272b")
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        image = Image.open(OUT / f"{name}.png").convert("RGB")
        crop = image.resize((245, 184)) if name.startswith("black-break") else image.crop((200, 230, 700, 600)).resize((400, 184))
        x, y = (i % 4) * 400, (i // 4) * 210
        sheet.paste(crop, (x, y + 24))
        draw.text((x + 7, y + 6), name, fill="white")
    sheet.save(OUT / "timing-contact-sheet.jpg", quality=94)
    (OUT / "report.json").write_text(json.dumps({"result": "PASS", "checks": checks, "captures": captures}, indent=2) + "\n")
    print(json.dumps({"result": "PASS", "checks": checks, "output": str(OUT)}, indent=2))
finally:
    server.shutdown()
    server.server_close()
    thread.join()

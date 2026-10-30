# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Muted isolated browser, owned ephemeral server, generated visual evidence."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated"
OUT.mkdir(exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(HERE.parents[1])))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
URL = f"http://127.0.0.1:{server.server_port}/04-rendering-lab/motion-playable/?inspect&seed=2009"
checks, images = [], {}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        context = browser.new_context(viewport={"width": 1000, "height": 1000}, device_scale_factor=1,
                                      record_video_dir=str(OUT / "video"), record_video_size={"width": 1000, "height": 1000})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_function("!!window.motionInspection")
        native = page.evaluate("motionInspection.capabilities()")
        assert native["displayP3"] or native["activeContext"] == "srgb"
        assert page.locator("audio").count() == 0
        page.locator("#stage").focus()
        page.keyboard.press("ArrowLeft")
        assert page.evaluate("motionInspection.exportState()") is None
        page.keyboard.down("ArrowDown")
        initial = page.evaluate("motionInspection.exportState()")
        assert sum(map(len, initial["lanes"])) == 20 and initial["inventory"]["n"] == 0
        page.keyboard.down("ArrowDown")
        assert page.evaluate("motionInspection.exportState().inventory.n") == 0
        page.keyboard.up("ArrowDown")
        page.wait_for_timeout(200)
        assert page.evaluate("motionInspection.exportState().frames") >= 3
        checks.append("ready/start, repeat suppression, live independent 30Hz timer, no audio objects")

        colors = ["red", "green", "blue", "yellow", "pink", "white", "black"]
        fixture = {"lanes": [[colors[(i+j) % 7] for j in range(2+i % 5)] for i in range(20)],
                   "pos": 10, "frames": 100, "lost": False,
                   "inventory": {"color": None, "n": 0}, "capacitor": {"color": "green", "n": 3}}
        fixture["lanes"][10] = ["black", "red", "red"]

        def load(state):
            page.evaluate("s=>motionInspection.loadFixture(s)", state)

        def state():
            return page.evaluate("motionInspection.exportState()")

        def sequence(keys):
            return page.evaluate("""keys=>{
                if(document.getElementById('pause').textContent.startsWith('Resume'))document.getElementById('pause').click();
                document.getElementById('stage').focus();
                for(const key of keys){window.dispatchEvent(new KeyboardEvent('keydown',{key,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key}));}
                return {state:motionInspection.exportState(),motion:motionInspection.metrics()};
            }""", keys)

        def capture(name, delay=0):
            if delay:
                page.wait_for_timeout(delay)
            page.locator("#board").screenshot(path=str(OUT / f"{name}.png"))
            images[name] = {"state": state(), "motion": page.evaluate("motionInspection.metrics()")}

        load(fixture)
        capture("spheres-steady")
        # Input and reads share one browser task: no timer or rAF can mask latency.
        result = page.evaluate("""()=>{
            document.getElementById('pause').click();document.getElementById('stage').focus();
            const key=(type,key,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{key,repeat,cancelable:true}));
            key('keydown','ArrowDown');key('keydown','ArrowDown',true);
            const gather=motionInspection.exportState();
            key('keydown','ArrowRight');const right=motionInspection.exportState(), first=motionInspection.metrics();
            key('keyup','ArrowRight');key('keydown','ArrowLeft');const left=motionInspection.exportState(), interrupted=motionInspection.metrics();
            key('keyup','ArrowLeft');key('keyup','ArrowDown');key('keydown','ArrowDown');key('keyup','ArrowDown');
            const mismatch=motionInspection.exportState();
            return {gather,right,left,first,interrupted,mismatch,status:document.getElementById('status').textContent};
        }""")
        assert result["gather"]["inventory"] == {"color": "red", "n": 2}
        assert result["right"]["pos"] == 11 and result["left"]["pos"] == 10
        assert abs(result["first"]["shipX"] - result["interrupted"]["shipX"]) < 4
        assert result["mismatch"]["inventory"]["n"] == result["mismatch"]["capacitor"]["n"] == 0
        assert "Lane 11" in result["status"] and "Charge: empty" in result["status"]
        same_task_input = result
        checks.append("same-task gather, independent simultaneous keys, repeated-key suppression, interrupt/rebase, immediate counters and mismatch")
        capture("mismatch-fizzle", 35)

        # Actual paths under explicit media-query emulation, not a hardware claim.
        cdp = context.new_cdp_session(page)
        cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "color-gamut", "value": "p3"}]})
        page.reload(); page.wait_for_function("!!window.motionInspection")
        emulated = page.evaluate("motionInspection.capabilities()")
        assert emulated["activeContext"] == "display-p3"
        load(fixture)
        page.locator("#gamut").select_option("srgb")
        assert state() == fixture
        page.locator("#gamut").select_option("display-p3")
        assert state() == fixture
        for selector in ["#plain", "#reduced", "#effects"]:
            original = page.locator(selector).is_checked()
            page.locator(selector).set_checked(not original)
            assert state() == fixture
            page.locator(selector).set_checked(original)
        checks.append("real P3 context under emulated media query; sRGB context replacement and all presentation toggles preserve state")

        load(fixture); sequence(["ArrowDown"]); capture("gather-smeared-spheres", 25)
        page.wait_for_timeout(230)
        sequence(["ArrowUp"]); capture("replace-smeared-spheres", 25)
        page.wait_for_timeout(230)
        # Distinct conversion branches and shoot/destroy, all through real input.
        charged = json.loads(json.dumps(fixture))
        charged["inventory"] = {"color": "green", "n": 3}
        load(charged); sequence(["ArrowDown"]); capture("conversion-compression", 25)
        white = json.loads(json.dumps(fixture)); white["inventory"] = {"color": "white", "n": 2}
        load(white); result = sequence(["ArrowDown"])
        assert result["state"]["capacitor"]["n"] == 23
        capture("white-amplification", 25)
        load(fixture); sequence(["ArrowUp"]); capture("shot-recoil-rubble", 65)
        page.wait_for_timeout(650)
        assert page.evaluate("motionInspection.metrics().actionEffects") == 0
        assert page.evaluate("motionInspection.metrics().rubble") == 10
        capture("rubble-at-rest")
        black = json.loads(json.dumps(fixture)); black["lanes"][10] = ["black"] * 8
        black["capacitor"] = {"color": "red", "n": 8}
        load(black)
        for _ in range(8):
            sequence(["ArrowUp"]); page.wait_for_timeout(90)
        page.wait_for_timeout(450)
        assert page.evaluate("motionInspection.metrics().rubble") == 80
        capture("black-rubble-pile")
        edge = json.loads(json.dumps(fixture)); edge["pos"] = 0
        load(edge); sequence(["ArrowLeft"]); capture("edge-fizzle", 15)
        load(fixture); sequence(["ArrowRight"]); capture("juke-target-truth", 5)
        # Rapid alternating jukes interleaved with gather/replace/fire, no lock.
        load(fixture)
        before_frames = fixture["frames"]
        result = sequence((["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"] * 70))
        assert result["state"]["pos"] == 10
        assert result["state"]["frames"] == before_frames
        assert result["motion"]["effects"] <= 220
        capture("rapid-jukes")
        page.wait_for_timeout(650)
        assert page.evaluate("motionInspection.metrics().actionEffects") == 0
        checks.append("gather/replace shaded transport, normal/white conversion, fire/recoil; 80 resting black chunks accumulate, short effects expire; 280 rapid real keys commit without gates or backlog")

        # Three presampled independent spawn trials previewed, then committed by step.
        load(fixture)
        seen_spawn = False
        for _ in range(100):
            result = page.evaluate("""()=>{const preview=motionInspection.preview();const before=motionInspection.exportState();document.getElementById('step').click();return {preview,before,after:motionInspection.exportState()};}""")
            assert result["after"]["frames"] == result["before"]["frames"] + 1
            if result["preview"][0]["spawn"]:
                lane = result["preview"][0]["lane"]
                assert result["after"]["lanes"][lane][1:] == result["before"]["lanes"][lane]
                seen_spawn = True
                capture("arrival-commit")
                break
        assert seen_spawn
        checks.append("scheduled RNG preview lane commits a true prepend on exact next tick, developer stepping")

        # Human-readable silent video segment, rather than only stress-test flashes.
        load(fixture)
        page.wait_for_timeout(300)
        for keys in [["ArrowDown"], ["ArrowRight"], ["ArrowLeft"], ["ArrowUp"], ["ArrowDown"], ["ArrowDown"], ["ArrowUp"]]:
            sequence(keys)
            page.wait_for_timeout(240)
        for _ in range(5):
            sequence(["ArrowRight"]); page.wait_for_timeout(30)
            sequence(["ArrowLeft"]); page.wait_for_timeout(65)
        page.wait_for_timeout(300)

        load(fixture)
        page.locator("#reduced").check()
        result = sequence(["ArrowRight", "ArrowDown", "ArrowLeft"])
        assert result["motion"]["effects"] == 0
        assert result["motion"]["shipX"] == result["motion"]["targetX"]
        capture("reduced-motion")
        page.locator("#plain").check(); capture("plain-reference")
        page.locator("#plain").uncheck(); page.locator("#reduced").uncheck()
        # Exercise actual visibility handler with a simulated hidden property.
        result = page.evaluate("""()=>{
            Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
            const m=motionInspection.metrics(),s=motionInspection.exportState();return {m,s};
        }""")
        page.wait_for_timeout(180)
        assert state() == result["s"] and result["m"]["effects"] == 0
        page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
        checks.append("reduced-motion snaps without decorative state; simulated hidden lifecycle clears effects and suspends ticks without catch-up")
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        page.screenshot(path=str(OUT / "mobile.png"))
        page.set_viewport_size({"width": 1000, "height": 1000})
        overflow = json.loads(json.dumps(fixture)); overflow["lanes"][0] = ["black"] * 15
        load(overflow); page.evaluate("document.getElementById('step').click()")
        assert state()["lost"] and page.locator("#overlay").is_visible()
        page.locator("#stage").focus(); page.keyboard.press("ArrowUp")
        assert not state()["lost"] and sum(map(len, state()["lanes"])) == 20
        assert not errors, errors
        checks.append("mobile fitting, frame-only overflow loss, key restart, no browser errors")
        video = page.video
        context.close()
        video.save_as(str(OUT / "motion-demo.webm"))
        browser.close()
        report = {"result": "PASS", "checks": checks, "nativeHeadless": native,
                  "emulatedP3MediaQuery": emulated, "sameTaskInput": same_task_input,
                  "visualCaveat": "PNG/video prove composition and timing only, not physical wide gamut or HDR. Lifecycle hidden property explicitly simulated."}
        (OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        (OUT / "state-images.json").write_text(json.dumps(images, indent=2) + "\n")
        print(json.dumps({"result": "PASS", "checks": checks,
                          "nativeCanvas": native["activeContext"], "emulatedCanvas": emulated["activeContext"],
                          "report": str(OUT / "report.json")}, indent=2))
finally:
    server.shutdown(); server.server_close(); thread.join()

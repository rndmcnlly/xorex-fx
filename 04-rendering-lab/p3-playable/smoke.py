# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Isolated browser tests. Own loopback server uses a free port and always closes."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(HERE.parents[1]))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f"http://127.0.0.1:{server.server_port}/04-rendering-lab/p3-playable/?inspect&seed=2009"
out = HERE / "generated"
out.mkdir(exist_ok=True)
checks = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        page = browser.new_page(viewport={"width": 1040, "height": 1120}, device_scale_factor=1)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_function("!!window.p3Inspection")
        native = page.evaluate("p3Inspection.capabilities()")
        if not native["displayP3"]:
            assert native["activeContext"] == "srgb"
        assert not page.locator("#sound").is_checked()
        page.locator("#stage").focus()
        page.keyboard.press("ArrowLeft")
        assert page.evaluate("p3Inspection.exportState()") is None
        page.keyboard.down("ArrowDown")
        initial = page.evaluate("p3Inspection.exportState()")
        assert sum(map(len, initial["lanes"])) == 20 and initial["inventory"]["n"] == 0
        page.keyboard.down("ArrowDown")
        assert page.evaluate("p3Inspection.exportState().inventory.n") == 0
        page.keyboard.up("ArrowDown")
        page.wait_for_timeout(180)
        assert page.evaluate("p3Inspection.exportState().frames") >= 3
        checks.append("ready/start semantics, held repeat suppression, live 30 Hz simulation, audio opt-in")
        fixture = {"lanes": [[] for _ in range(20)], "pos": 10, "frames": 100, "lost": False,
                   "inventory": {"color": None, "n": 0}, "capacitor": {"color": "green", "n": 3}}
        fixture["lanes"][10] = ["black", "red", "red"]
        def load(state):
            page.evaluate("s=>p3Inspection.loadFixture(s)", state)
        def state():
            return page.evaluate("p3Inspection.exportState()")
        load(fixture)
        page.locator("summary").click()
        page.locator("#gamut").select_option("srgb")
        assert state() == fixture
        page.locator("#gamut").select_option("display-p3")
        assert state() == fixture
        checks.append("color-path toggles retain the full paused state")
        # Resume without advancing timers: all key events and reads in one JS task.
        result = page.evaluate("""() => {
          document.getElementById('pause').click();
          const k=(type,key,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{key,repeat,cancelable:true}));
          k('keydown','ArrowDown');k('keydown','ArrowDown',true);
          const gather=p3Inspection.exportState();
          k('keydown','ArrowRight');const independent=p3Inspection.exportState();
          k('keyup','ArrowDown');k('keyup','ArrowRight');
          k('keydown','ArrowDown');k('keyup','ArrowDown');
          const convert=p3Inspection.exportState();
          k('keydown','ArrowUp');k('keyup','ArrowUp');
          const fire=p3Inspection.exportState();
          document.getElementById('pause').click();return {gather,independent,convert,fire};
        }""")
        assert result["gather"]["inventory"] == {"color": "red", "n": 2}
        assert result["independent"]["pos"] == 11
        assert result["convert"]["inventory"]["n"] == result["convert"]["capacitor"]["n"] == 0
        checks.append("real input gathers synchronously; independent held keys; mismatched conversion resets")
        # Native fallback capability evidence, then emulate ONLY media query to exercise P3 context.
        cdp = page.context.new_cdp_session(page)
        cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "color-gamut", "value": "p3"}]})
        page.reload()
        page.wait_for_function("!!window.p3Inspection")
        emulated = page.evaluate("p3Inspection.capabilities()")
        assert emulated["p3Context"] == "display-p3" and emulated["activeContext"] == "display-p3"
        fixture["lanes"] = [[c] for c in ["red","green","blue","yellow","pink","white","black"]] + [[] for _ in range(13)]
        fixture["inventory"] = {"color":"pink","n":3}
        load(fixture)
        # Core is at y=1, safely away from catchlights and antialiased edges.
        p3_pixel = page.evaluate("Array.from(document.getElementById('board').getContext('2d').getImageData(20,1,1,1,{colorSpace:'display-p3'}).data)")
        assert p3_pixel[0] >= 253 and p3_pixel[1] < 15 and p3_pixel[2] < 10, p3_pixel
        page.locator("#gamut").select_option("srgb")
        assert page.evaluate("p3Inspection.capabilities().activeContext") == "srgb"
        srgb_pixel = page.evaluate("Array.from(document.getElementById('board').getContext('2d').getImageData(20,1,1,1,{colorSpace:'display-p3'}).data)")
        assert srgb_pixel[1] > p3_pixel[1]+30, (srgb_pixel,p3_pixel)
        assert state() == fixture
        checks.append("emulated P3 media query: actual P3 context, P3 core pixel readback, sRGB replacement context, unchanged state")
        page.locator("#gamut").select_option("display-p3")
        fixture["lanes"] = [[list(["red","green","blue","yellow","pink","white","black"])[(i+j)%7] for j in range(2+i%4)] for i in range(20)]
        fixture["lanes"][10] = ["red", "red"]
        load(fixture)
        page.screenshot(path=str(out / "playable-p3.png"))
        page.locator("#plain").check()
        assert state() == fixture
        page.screenshot(path=str(out / "plain-reference.png"))
        page.locator("#plain").uncheck()
        page.set_viewport_size({"width":390,"height":844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.screenshot(path=str(out / "mobile.png"))
        fixture["lanes"][0] = ["black"]*15
        load(fixture)
        page.locator("summary").click()
        page.locator("#step").click()
        assert state()["lost"] and page.locator("#overlay").is_visible()
        page.locator("#stage").focus()
        page.keyboard.press("ArrowUp")
        assert not state()["lost"] and sum(map(len,state()["lanes"])) == 20
        assert not errors, errors
        checks.append("plain toggle; mobile fit; overflow loss on simulation frame; keyboard restart; no page errors")
        browser.close()
        report = {"result":"PASS", "checks":checks,"nativeHeadless":native,"emulatedP3MediaQuery":emulated,
                  "p3CoreReadback":p3_pixel,"srgbCoreReadbackInP3":srgb_pixel,
                  "captureCaveat":"PNG screenshots are layout evidence, not proof of physical wide-gamut display output or HDR."}
        (out / "report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps(report,indent=2))
finally:
    server.shutdown()
    server.server_close()
    thread.join()

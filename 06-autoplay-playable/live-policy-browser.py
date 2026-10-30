# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Real latest app, muted owned ephemeral server. Wall-time episodes, not paired timing guarantees."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated"
OUT.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(HERE.parent)))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {"errors": [], "serverPort": server.server_port, "episodes": []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        try:
            for profile in ["frozen", "live"]:
                context = browser.new_context(viewport={"width": 1000, "height": 1000})
                try:
                    page = context.new_page()
                    page.on("pageerror", lambda e: report["errors"].append(str(e)))
                    query = "&profile=frozen" if profile == "frozen" else ""
                    page.goto(f"http://127.0.0.1:{server.server_port}/06-autoplay-playable/?inspect&seed=2009{query}")
                    page.wait_for_function("!!window.autoplayInspection")
                    assert page.evaluate("autoplayInspection.controller().profile") == profile
                    page.locator("#stage").focus()
                    page.keyboard.press("Tab")
                    page.wait_for_timeout(1200)
                    page.locator("#board").screenshot(path=str(OUT / f"live-policy-browser-{profile}-early.png"))
                    page.wait_for_timeout(23800)
                    evidence = page.evaluate("""async () => {
                      const {act}=await import('../03-svg-demake/model.mjs');
                      const trace=autoplayInspection.exportTrace(),actions=trace.filter(e=>e.type==='action');
                      const summary={actions:actions.length,mismatches:0,lostCharge:0,blackKills:0,amplifications:0,emptyShots:0,modelErrors:0,guardErrors:0};
                      for(const e of actions){
                        if(e.feedback.kind==='mismatch'){summary.mismatches++;summary.lostCharge+=e.before.capacitor.n;}
                        if(e.feedback.kind==='black-break')summary.blackKills++;
                        if(e.feedback.kind==='white-boost')summary.amplifications++;
                        if(e.feedback.kind==='dry-shot')summary.emptyShots++;
                        const replay=structuredClone(e.before);act(replay,e.command);
                        if(JSON.stringify(replay)!==JSON.stringify(e.after))summary.modelErrors++;
                        if(e.expectedGuard!==e.actualGuard||!e.postconditionMatches||JSON.stringify(e.feedback)!==JSON.stringify(e.expectedFeedback))summary.guardErrors++;
                      }
                      return {summary,trace,state:autoplayInspection.exportState(),controller:autoplayInspection.controller()};
                    }""")
                    assert evidence["summary"]["actions"] > 120
                    assert evidence["summary"]["modelErrors"] == evidence["summary"]["guardErrors"] == 0
                    assert evidence["controller"]["policy"]["profile"] == profile
                    page.locator("#board").screenshot(path=str(OUT / f"live-policy-browser-{profile}-25s.png"))
                    evidence["profile"] = profile
                    report["episodes"].append(evidence)
                    # Immediate manual takeover; no subsequent auto primitives.
                    page.keyboard.press("ArrowRight")
                    control = page.evaluate("autoplayInspection.controller()")
                    assert not control["enabled"] and control["queued"] == 0 and not control["planning"]
                    page.wait_for_timeout(150)
                    assert page.evaluate("autoplayInspection.controller().executed") == control["executed"]
                    page.locator("#auto").check()
                    page.locator("#auto").uncheck()
                    assert not page.evaluate("autoplayInspection.controller().planning")
                    page.locator("#stage").focus()
                    page.keyboard.press("Tab")
                    page.keyboard.press("Tab")
                    assert not page.locator("#auto").is_checked()
                    report[profile + "Cancellation"] = True
                finally:
                    context.close()
            assert not report["errors"]
            report["browserVersion"] = browser.version
            report["passed"] = True
            print(json.dumps({"passed": True, "episodes": [{"profile": e["profile"], **e["summary"]} for e in report["episodes"]]}))
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / "live-policy-browser.json").write_text(json.dumps(report, indent=2))

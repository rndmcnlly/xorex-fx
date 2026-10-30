# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Isolated muted live proof, own ephemeral server, never touches port 8772."""
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
report = {"checks": [], "errors": [], "serverPort": server.server_port, "screenshots": []}
browser = context = None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        try:
            context = browser.new_context(viewport={"width": 1000, "height": 1120}, device_scale_factor=1,
                                          record_video_dir=str(OUT / "video"), record_video_size={"width": 1000, "height": 1120})
            page = context.new_page()
            page.on("pageerror", lambda e: report["errors"].append(str(e)))
            # Observe real Worker traffic without changing transport or results.
            page.add_init_script("""(() => {
              const Native = window.Worker;
              window.workerEvidence = {sent:[], received:[], terminated:0};
              window.Worker = class extends Native {
                constructor(...args) {super(...args);this.addEventListener('message', ({data}) => {
                  workerEvidence.received.push({at:performance.now(),type:data.type,jobID:data.jobID,
                    sourceFingerprint:data.sourceFingerprint,length:data.plan?.length});
                });}
                postMessage(message) {workerEvidence.sent.push({at:performance.now(),type:message.type,
                  jobID:message.jobID,sourceFingerprint:message.sourceFingerprint,budgetMs:message.budgetMs,frames:message.snapshot?.frames});super.postMessage(message);}
                terminate(){workerEvidence.terminated++;super.terminate();}
              };
            })();""")
            page.goto(f"http://127.0.0.1:{server.server_port}/06-autoplay-playable/?inspect&seed=2009")
            page.wait_for_function("!!window.autoplayInspection")
            report["nativeCapabilities"] = page.evaluate("autoplayInspection.capabilities()")
            assert report["nativeCapabilities"]["displayP3"] or report["nativeCapabilities"]["activeContext"] == "srgb"
            assert page.locator("audio,video").count() == 0
            # Ready auto-on starts but does not execute a phantom primitive in the toggle event.
            ready = page.evaluate("""() => {
              document.querySelector('#stage').focus();
              const event=new KeyboardEvent('keydown',{key:'Tab',cancelable:true});window.dispatchEvent(event);
              const after=autoplayInspection.controller(), state=autoplayInspection.exportState();
              window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',repeat:true,cancelable:true}));
              const repeated=autoplayInspection.controller().enabled;
              window.dispatchEvent(new KeyboardEvent('keyup',{key:'Tab'}));
              return {after,state,repeated,prevented:event.defaultPrevented};
            }""")
            assert ready["after"]["enabled"] and ready["repeated"] and ready["prevented"]
            assert ready["after"]["executed"] == 0 and ready["state"]["inventory"]["n"] == 0
            assert sum(map(len, ready["state"]["lanes"])) == 20
            page.wait_for_function("autoplayInspection.controller().executed >= 4", timeout=6000)
            page.wait_for_timeout(2200)
            report["liveAutoplay"] = page.evaluate("({controller:autoplayInspection.controller(),state:autoplayInspection.exportState(),transport:workerEvidence})")
            live = report["liveAutoplay"]
            assert live["controller"]["requests"] >= 3 and live["controller"]["accepted"] >= 1
            assert live["state"]["frames"] >= 50 and live["controller"]["executed"] >= 4
            assert all(r["budgetMs"] == 1000 for r in live["transport"]["sent"])
            sent = live["transport"]["sent"]
            assert all(b["at"] - a["at"] >= 990 for a, b in zip(sent, sent[1:]))
            identities = {r["jobID"]: r["sourceFingerprint"] for r in sent}
            assert all(identities[r["jobID"]] == r["sourceFingerprint"] for r in live["transport"]["received"])
            page.screenshot(path=str(OUT / "live-autoplay.png"), full_page=True)
            report["screenshots"].append("live-autoplay.png")
            report["checks"].append("ready Tab starts with no phantom action; repeat ignored; real HTN Worker executes with 1-second replanning while model frames advance")

            # Off is purely control state. Manual input commits synchronously and clears ownership.
            takeover = page.evaluate("""() => {
              document.querySelector('#stage').focus();
              const before=autoplayInspection.exportState(), count=autoplayInspection.controller().executed;
              window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));
              window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,cancelable:true}));
              const after=autoplayInspection.exportState();
              window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight'}));
              return {before,after,count,control:autoplayInspection.controller(),checked:document.querySelector('#auto').checked};
            }""")
            assert not takeover["control"]["enabled"] and not takeover["checked"]
            assert takeover["after"]["pos"] == min(19, takeover["before"]["pos"] + 1)
            assert takeover["control"]["queued"] == 0 and not takeover["control"]["planning"]
            count = takeover["count"]
            page.wait_for_timeout(250)
            assert page.evaluate("autoplayInspection.controller().executed") == count
            page.screenshot(path=str(OUT / "manual-takeover.png"), full_page=True)
            report["screenshots"].append("manual-takeover.png")
            off = page.evaluate("""() => {
              document.querySelector('#auto').click();const before=autoplayInspection.exportState();
              document.querySelector('#auto').click();return {before,after:autoplayInspection.exportState(),control:autoplayInspection.controller()};
            }""")
            assert off["before"] == off["after"] and not off["control"]["enabled"]
            # Tab remains browser navigation on every form control.
            page.locator("#gamut").focus()
            page.keyboard.press("Tab")
            assert page.evaluate("document.activeElement.id") == "effects"
            assert not page.locator("#auto").is_checked()
            page.locator("#stage").focus()
            page.keyboard.press("Shift+Tab")
            assert page.evaluate("document.activeElement.id") == "intensity"
            report["checks"].append("manual arrow immediately takes over and preserves independent repeat rules; checkbox off preserves exact game; native Tab navigation on forms")

            fixture = {"lanes": [[] for _ in range(20)], "pos": 10, "frames": 0, "lost": False,
                       "inventory": {"color": "white", "n": 2}, "capacitor": {"color": "green", "n": 3}}
            fixture["lanes"][10] = ["black"]
            fixture["lanes"][11] = ["red", "red"]
            memory = page.evaluate("""fixture => {
              autoplayInspection.loadFixture(fixture);document.querySelector('#stage').focus();
              for(const key of ['ArrowDown','ArrowUp','ArrowRight','ArrowDown','ArrowDown']){
                window.dispatchEvent(new KeyboardEvent('keydown',{key,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key}));
              }
              return {state:autoplayInspection.exportState(),metrics:autoplayInspection.metrics(),status:document.querySelector('#status').textContent};
            }""", fixture)
            assert memory["state"]["capacitor"]["n"] == memory["state"]["inventory"]["n"] == 0
            assert len(memory["metrics"]["memories"]) >= 3
            report["feedback"] = memory
            page.wait_for_timeout(220)
            page.locator("#board").screenshot(path=str(OUT / "shared-causal-memory.png"))
            report["screenshots"].append("shared-causal-memory.png")
            toggles = page.evaluate("""() => {
              const before=autoplayInspection.exportState();
              for(const id of ['reduced','plain','effects'])document.querySelector('#'+id).click();
              const gamut=document.querySelector('#gamut');gamut.value='srgb';gamut.dispatchEvent(new Event('change'));
              return {before,after:autoplayInspection.exportState(),memories:autoplayInspection.metrics().memories};
            }""")
            assert toggles["before"] == toggles["after"] and len(toggles["memories"]) >= 3
            page.locator("#board").screenshot(path=str(OUT / "steady-causal-memory.png"))
            report["screenshots"].append("steady-causal-memory.png")
            report["checks"].append("unchanged shared white triumph, charge-colored black scar and mixed-store loss memories coexist; reduced/steady/context switches preserve current state and causal history")

            # Actual P3 context behind the inherited gates, explicitly emulated query.
            cdp = context.new_cdp_session(page)
            cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "color-gamut", "value": "p3"}]})
            page.reload(); page.wait_for_function("!!window.autoplayInspection")
            report["emulatedP3Capabilities"] = page.evaluate("autoplayInspection.capabilities()")
            assert report["emulatedP3Capabilities"]["activeContext"] == "display-p3"
            page.locator("#stage").focus(); page.keyboard.press("ArrowDown")
            assert page.evaluate("autoplayInspection.exportState().inventory.n") == 0
            assert sum(map(len, page.evaluate("autoplayInspection.exportState().lanes"))) == 20
            report["checks"].append("manual ready Up/Down starts without action; real P3 Canvas context under explicitly emulated display query, SDR only")

            # Reset and visibility cancel transport and executor. Auto resumes only from fresh snapshots.
            safety = page.evaluate("""() => {
              document.querySelector('#auto').click();document.querySelector('#restart').click();
              const restarted=autoplayInspection.exportState();
              Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
              document.dispatchEvent(new Event('visibilitychange'));
              return {restarted,control:autoplayInspection.controller(),executed:autoplayInspection.controller().executed};
            }""")
            assert safety["control"]["queued"] == 0 and not safety["control"]["planning"]
            page.wait_for_timeout(200)
            assert page.evaluate("autoplayInspection.exportState()") == safety["restarted"]
            assert page.evaluate("autoplayInspection.controller().executed") == safety["executed"]
            page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));document.querySelector('#stage').focus()")
            page.wait_for_function("autoplayInspection.controller().requests > 0")
            # Force ordinary model overflow, not a new loss mechanic.
            loss = json.loads(json.dumps(fixture)); loss["inventory"] = {"color": None, "n": 0}
            loss["lanes"][0] = ["black"] * 15
            page.evaluate("s=>{autoplayInspection.loadFixture(s);document.querySelector('#auto').click()}", loss)
            page.wait_for_function("autoplayInspection.exportState().lost", timeout=2000)
            assert not page.locator("#auto").is_checked()
            assert page.evaluate("autoplayInspection.controller().queued") == 0
            assert page.locator("#overlay").is_visible()
            report["checks"].append("restart drops old work; simulated hidden suspends all frames/actions and clears work; overflow turns auto off, retains final state and offers replay")

            # Real busy Worker: main-thread heartbeat, matching identity, explicit cancellation/supersession.
            report["workerProtocol"] = page.evaluate("""async () => {
              const {createGame,seededRandom}=await import('../03-svg-demake/model.mjs');
              const {fingerprint}=await import('../05-autoplay-lab/sim.mjs');
              const huge=createGame(seededRandom(1),0);huge.pos=0;
              huge.lanes=Array.from({length:20},(_,lane)=>Array.from({length:250},(_,i)=>['black','red','white','green'][(i+lane)%4]));
              huge.capacitor={color:'red',n:5000};const initial=JSON.stringify(huge);
              const worker=new Worker('../05-autoplay-lab/htn-worker.mjs',{type:'module'}),events=[];
              let beats=0;const heartbeat=setInterval(()=>beats++,5),waiters=[];
              worker.onmessage=({data})=>{events.push(data);for(const f of [...waiters])f(data);};
              const wait=predicate=>new Promise((resolve,reject)=>{
                const found=events.find(predicate);if(found){resolve(found);return;}
                const timer=setTimeout(()=>reject(Error('worker timeout '+JSON.stringify(events.map(d=>[d.type,d.jobID])))),5000);
                const f=data=>{if(predicate(data)){clearTimeout(timer);waiters.splice(waiters.indexOf(f),1);resolve(data);}};waiters.push(f);
              });
              const start=jobID=>worker.postMessage({type:'search',jobID,snapshot:huge,budgetMs:1000,options:{maxNodes:100000,maxDepth:10000,maxActions:10000}});
              try {
                start('cancel');await wait(d=>d.jobID==='cancel'&&d.type==='progress');
                worker.postMessage({type:'cancel',jobID:'cancel'});const cancelled=await wait(d=>d.type==='cancelled');
                start('old');await wait(d=>d.jobID==='old'&&d.type==='progress');
                const small=createGame(seededRandom(9),0);
                worker.postMessage({type:'search',jobID:'new',snapshot:small,budgetMs:1000});
                const latest=await wait(d=>d.jobID==='new'&&d.type==='result');
                await new Promise(r=>setTimeout(r,100));
                if(events.some(d=>['old','cancel'].includes(d.jobID)&&d.type==='result'))throw Error('stale result');
                if(cancelled.sourceFingerprint!==fingerprint(huge)||latest.sourceFingerprint!==fingerprint(small))throw Error('identity');
                if(JSON.stringify(huge)!==initial)throw Error('input alias');
                if(beats<10)throw Error('unresponsive main thread');
                return {heartbeats:beats,events:events.map(d=>({type:d.type,jobID:d.jobID,sourceFingerprint:d.sourceFingerprint})),immutable:true};
              } finally {clearInterval(heartbeat);worker.terminate();}
            }""")
            report["checks"].append("busy real Worker stays responsive, matches its own snapshot fingerprint, acknowledges cancel, supersedes old search, never mutates input")
            assert not report["errors"], report["errors"]
            report["browserVersion"] = browser.version
            report["passed"] = True
            print(json.dumps({"passed": True, "checks": report["checks"], "live": live["controller"], "heartbeats": report["workerProtocol"]["heartbeats"]}, indent=2))
        finally:
            try:
                if context:
                    context.close()
            finally:
                browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / "report.json").write_text(json.dumps(report, indent=2))

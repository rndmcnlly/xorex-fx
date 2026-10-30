# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Causal audit: real Worker frozen replay and 20 seconds of live autoplay."""
import functools
import hashlib
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
report = {"errors": [], "serverPort": server.server_port, "hashes": {}}
for name in ["03-svg-demake/model.mjs", "05-autoplay-lab/sim.mjs", "05-autoplay-lab/htn.mjs", "05-autoplay-lab/htn-domain.mjs", "06-autoplay-playable/controller.mjs", "06-autoplay-playable/app.mjs"]:
    report["hashes"][name] = hashlib.sha256((HERE.parent / name).read_bytes()).hexdigest()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--mute-audio"])
        context = None
        try:
            context = browser.new_context(viewport={"width": 1000, "height": 1000})
            page = context.new_page()
            page.on("pageerror", lambda e: report["errors"].append(str(e)))
            page.goto(f"http://127.0.0.1:{server.server_port}/06-autoplay-playable/?inspect&seed=2009")
            page.wait_for_function("!!window.autoplayInspection")
            report["frozenWorker"] = page.evaluate("""async () => {
              const {createGame,seededRandom,act}=await import('../03-svg-demake/model.mjs');
              const {createController}=await import('./controller.mjs');
              const {classifyAction}=await import('../04-rendering-lab/motion-playable/feedback.mjs');
              const cases=[];
              for(const seed of [1,7,42,2009]) {
                const snapshot=createGame(seededRandom(seed)),state=structuredClone(snapshot),trace=[],sent=[];
                let time=0;
                 const c=createController({profile:'frozen',read:()=>state,perform:command=>act(state,command),
                  send:message=>sent.push(message),cancel(){},now:()=>time,observe:e=>trace.push(e)});
                c.enable(true);c.pulse(0);
                const worker=new Worker('../05-autoplay-lab/htn-worker.mjs',{type:'module'});
                let result;
                try {
                  result=await new Promise((resolve,reject)=>{
                    const timeout=setTimeout(()=>reject(Error('worker timeout')),5000);
                    worker.onmessage=({data})=>{
                      if(data.type==='result'){clearTimeout(timeout);resolve(data);}
                      if(data.type==='error'){clearTimeout(timeout);reject(Error(data.message));}
                    };
                    worker.postMessage(sent[0]);
                  });
                } finally {worker.terminate();}
                c.receive(result);
                const offline=structuredClone(snapshot),kinds={},mismatches=[];
                for(const [index,command] of result.plan.entries()) {
                  const before=structuredClone(offline),events=act(offline,command);
                  const feedback=classifyAction(before,offline,command,events);
                  kinds[feedback.kind]=(kinds[feedback.kind]??0)+1;
                  if(feedback.kind==='mismatch')mismatches.push({index,before,after:structuredClone(offline),feedback});
                  time=index*100+1;c.pulse(time);
                  if(JSON.stringify(state)!==JSON.stringify(offline))throw Error('frozen execution differs');
                }
                if(JSON.stringify(state)!==JSON.stringify(result.endSnapshot))throw Error('worker end differs');
                cases.push({seed,snapshot,result,kinds,mismatches,controller:c.status(),trace});
              }
              return cases;
            }""")
            report["controlledManual"] = page.evaluate("""() => {
              const cases=[];
              for(const [held,charge] of [['red','white'],['white','red'],['white','white'],['red','red']]) {
                const fixture={lanes:Array.from({length:20},()=>[]),pos:10,frames:0,lost:false,
                  inventory:{color:held,n:2},capacitor:{color:charge,n:3}};
                autoplayInspection.loadFixture(fixture);autoplayInspection.clearTrace();
                document.querySelector('#stage').focus();
                window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',cancelable:true}));
                window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowDown'}));
                cases.push({held,charge,trace:autoplayInspection.exportTrace()});
              }
              return cases;
            }""")
            assert [c["trace"][0]["feedback"]["kind"] for c in report["controlledManual"]] == ["mismatch", "white-boost", "white-stored", "matching-reload"]
            # The fixture tape's first genuine arrival is green into lane 10 at
            # frame 23. At 12 arrows/s the original plan is still traveling there.
            # It must discard the old gather before touching the changed lane.
            page.reload()
            page.wait_for_function("!!window.autoplayInspection")
            page.evaluate("""() => {
              const fixture={lanes:Array.from({length:20},()=>[]),pos:0,frames:0,lost:false,
                inventory:{color:null,n:0},capacitor:{color:null,n:0}};
              fixture.lanes[10]=['red'];autoplayInspection.loadFixture(fixture);
              document.querySelector('#stage').focus();document.querySelector('#auto').click();
              document.querySelector('#stage').focus();
            }""")
            page.wait_for_timeout(1600)
            report["relatedArrival"] = page.evaluate("({trace:autoplayInspection.exportTrace(),controller:autoplayInspection.controller(),state:autoplayInspection.exportState()})")
            invalidations = [e for e in report["relatedArrival"]["trace"] if e["type"] == "invalidated"]
            assert invalidations and all(e["expectedGuard"] != e["actualGuard"] for e in invalidations), report["relatedArrival"]
            page.reload()
            page.wait_for_function("!!window.autoplayInspection")
            page.locator("#stage").focus()
            page.keyboard.press("Tab")
            page.wait_for_timeout(20000)
            report["live"] = page.evaluate("""async () => {
              const {act}=await import('../03-svg-demake/model.mjs');
              const trace=autoplayInspection.exportTrace(),actions=trace.filter(e=>e.type==='action');
              const summary={actions:actions.length,plannedMismatches:0,unexpectedSemantics:0,
                unexpectedModelResults:0,failedPreconditions:0,failedPostconditions:0,invalidations:0};
              for(const e of actions) {
                if(e.feedback.kind==='mismatch')summary.plannedMismatches++;
                if(JSON.stringify(e.feedback)!==JSON.stringify(e.expectedFeedback))summary.unexpectedSemantics++;
                const replay=structuredClone(e.before);act(replay,e.command);
                if(JSON.stringify(replay)!==JSON.stringify(e.after))summary.unexpectedModelResults++;
                if(e.expectedGuard!==e.actualGuard)summary.failedPreconditions++;
                if(!e.postconditionMatches)summary.failedPostconditions++;
              }
              summary.invalidations=trace.filter(e=>e.type==='invalidated').length;
              return {summary,trace,state:autoplayInspection.exportState(),controller:autoplayInspection.controller()};
            }""")
            page.locator("#board").screenshot(path=str(OUT / "diagnosis-live.png"))
            summary = report["live"]["summary"]
            assert summary["actions"] > 50, summary
            assert all(summary[k] == 0 for k in ["unexpectedSemantics", "unexpectedModelResults", "failedPreconditions", "failedPostconditions"]), summary
            assert not report["errors"], report["errors"]
            report["browserVersion"] = browser.version
            report["passed"] = True
            print(json.dumps({"passed": True, "frozen": [{"seed": c["seed"], "arrows": len(c["result"]["plan"]), "plannedMismatches": len(c["mismatches"])} for c in report["frozenWorker"]], "live": summary}, indent=2))
        finally:
            try:
                if context:
                    context.close()
            finally:
                browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / "browser-diagnosis.json").write_text(json.dumps(report, indent=2))

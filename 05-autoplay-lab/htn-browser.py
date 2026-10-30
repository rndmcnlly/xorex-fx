#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Owned ephemeral server and muted browser, no use of the existing 8772 server."""
import asyncio
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated"

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

async def check(port):
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True, args=["--mute-audio"])
        try:
            page = await browser.new_page(viewport={"width": 1440, "height": 1200})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(f"http://127.0.0.1:{port}/05-autoplay-lab/")
            await page.wait_for_function("window.lab")
            await page.select_option("#policy", "htn")
            rows = []
            ids = await page.evaluate("Array.from(document.querySelector('#lesson').options).map(o=>o.value).filter(Boolean)")
            for id in ids:
                await page.select_option("#lesson", id)
                source = await page.evaluate("lab.state")
                await page.click("#run")
                await page.wait_for_function("lab.result?.type==='result' && lab.active===null")
                result = await page.evaluate("lab.result")
                assert result["status"] == "clear", id
                assert result["options"]["policy"] == "htn"
                assert await page.evaluate("lab.state") == source
                assert await page.locator("#tracePanel").is_visible()
                assert "ClearBoard" in await page.locator("#trace").text_content()
                if id == ids[-1]:
                    await page.screenshot(path=str(OUT / "htn-bastion-plan.png"), full_page=True)
                    async with page.expect_download() as info:
                        await page.click("#export")
                    download = await info.value
                    await download.save_as(str(OUT / "htn-ui-export.json"))
                    exported = json.loads((OUT / "htn-ui-export.json").read_text())
                    assert exported["snapshot"] == source
                    assert exported["result"]["trace"] == result["trace"]
                await page.evaluate("while(!document.querySelector('#step').disabled)lab.step()")
                assert await page.evaluate("lab.state") == result["endSnapshot"]
                assert result["endSnapshot"]["frames"] == source["frames"]
                await page.click("#rewind")
                assert await page.evaluate("lab.state") == source
                rows.append({"id": id, "arrows": len(result["plan"]), "nodes": result["nodes"], "reason": result["reason"]})
            # Start and immediately reset in the same JS turn: no stale overwrite.
            await page.evaluate("lab.run();document.querySelector('#scenario').value='01-activate';lab.load()")
            await page.wait_for_timeout(100)
            assert await page.evaluate("lab.active===null && lab.result===null")
            # Keep the real worker busy with a mixed 5000-gem snapshot. The UI and
            # main-thread heartbeat continue; cancel/supersede use the actual protocol.
            protocol = await page.evaluate("""async () => {
              const {createGame,seededRandom,act}=await import('../03-svg-demake/model.mjs');
              const {fingerprint}=await import('./sim.mjs');
              const huge=createGame(seededRandom(1),0);huge.pos=0;
              huge.lanes=Array.from({length:20},(_,lane)=>Array.from({length:250},(_,i)=>
                ['black','red','white','green'][(i+lane)%4]));huge.capacitor={color:'red',n:5000};
              const small=structuredClone(lab.state), before=JSON.stringify(huge);
              const worker=new Worker('./htn-worker.mjs',{type:'module'});
              const events=[],waiters=[];let beats=0;
              const timer=setInterval(()=>beats++,5);
              worker.onmessage=({data})=>{events.push(data);for(const f of [...waiters])f(data);};
              const wait=predicate=>new Promise((resolve,reject)=>{
                const existing=events.find(predicate);if(existing){resolve(existing);return;}
                const timeout=setTimeout(()=>reject(Error('worker test timeout: '+JSON.stringify(events.map(d=>
                  ({type:d.type,jobID:d.jobID,nodes:d.nodes,message:d.message}))))),10000);
                const f=d=>{if(predicate(d)){clearTimeout(timeout);waiters.splice(waiters.indexOf(f),1);resolve(d);}};waiters.push(f);
              });
              const start=id=>worker.postMessage({type:'search',jobID:id,snapshot:huge,budgetMs:5000,
                options:{maxNodes:100000,maxDepth:10000,maxActions:10000}});
              try {
                start('cancel-me');await wait(d=>d.jobID==='cancel-me'&&d.type==='progress');
                await new Promise(r=>setTimeout(r,150));
                worker.postMessage({type:'cancel',jobID:'cancel-me'});
                const cancelled=await wait(d=>d.jobID==='cancel-me'&&d.type==='cancelled');
                start('old');await wait(d=>d.jobID==='old'&&d.type==='progress');
                worker.postMessage({type:'search',jobID:'new',snapshot:small,budgetMs:500});
                const latest=await wait(d=>d.jobID==='new'&&d.type==='result');
                await new Promise(r=>setTimeout(r,100));
                if(events.some(d=>(d.jobID==='old'||d.jobID==='cancel-me')&&d.type==='result'))throw Error('stale result');
                if(latest.sourceFingerprint!==fingerprint(small)||cancelled.sourceFingerprint!==fingerprint(huge))throw Error('fingerprint');
                if(JSON.stringify(huge)!==before)throw Error('mutated input');
                if(beats<15)throw Error('unresponsive main thread');
                worker.postMessage({type:'search',jobID:'timed',snapshot:huge,budgetMs:1,
                  options:{maxNodes:100000,maxDepth:10000}});
                const timed=await wait(d=>d.jobID==='timed'&&d.type==='result');
                const replay=structuredClone(huge);for(const arrow of timed.plan)act(replay,arrow);
                if(timed.reason!=='time-budget'||timed.status==='clear'||
                  JSON.stringify(replay)!==JSON.stringify(timed.endSnapshot))throw Error('invalid time-budget prefix');
                return {heartbeats:beats,cancelAcknowledged:true,supersededWithoutStale:true,
                  immutableInput:true,fingerprints:true,timeBudgetPrefixReplayed:true,latest};
              }finally{clearInterval(timer);worker.terminate();}
            }""")
            # UCT remains selectable after HTN and retains its own options.
            await page.select_option("#policy", "legacy")
            await page.evaluate("lab.run({iterations:5,budgetMs:1000})")
            await page.wait_for_function("lab.result?.type==='result' && lab.active===null")
            assert await page.evaluate("lab.result.options.horizon") == 48
            assert not errors, errors
            report = {"browser": browser.version, "uiReplay": rows, "traceExport": True,
                      "resetInvalidates": True, "legacyStillSelectable": True,
                      "workerProtocol": protocol, "errors": errors}
            (OUT / "htn-browser.json").write_text(json.dumps(report, indent=2) + "\n")
            print(json.dumps({k:v for k,v in report.items() if k != "workerProtocol"}, indent=2))
            print("Worker protocol:", {k:v for k,v in protocol.items() if k != "latest"})
            await page.close()
        finally:
            await browser.close()

if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(HERE.parent)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        asyncio.run(check(server.server_port))
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

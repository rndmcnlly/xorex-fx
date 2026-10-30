#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Own ephemeral server and isolated, muted Chrome. Always closes both."""
import asyncio
import functools
import json
import sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PREFIX = (sys.argv[1] + "-") if len(sys.argv) > 1 else ""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


async def check(port):
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio"])
        try:
            page = await browser.new_page(viewport={"width": 1280, "height": 1000}, device_scale_factor=1)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            await page.goto(f"http://127.0.0.1:{port}/05-autoplay-lab/")
            await page.wait_for_function("window.lab")
            await page.select_option("#scenario", "natural")
            await page.click("#load")
            await page.fill("#budget", "1200")
            before = await page.evaluate("window.lab.state")
            await page.evaluate("window.heartbeats = 0; window.heartbeatTimer = setInterval(() => heartbeats++, 20)")
            await page.click("#run")
            await page.wait_for_function("lab.result?.type === 'result' && lab.active === null")
            heartbeat = await page.evaluate("clearInterval(heartbeatTimer); heartbeats")
            assert heartbeat > 20, f"UI heartbeat stalled: {heartbeat}"
            assert before == await page.evaluate("lab.state"), "Planning mutated UI snapshot"
            natural_result = await page.evaluate("lab.result")
            await page.screenshot(path=str(OUT / f"{PREFIX}lab-natural-plan.png"), full_page=True)
            await page.evaluate("while (document.querySelector('#step').disabled === false) lab.step()")
            replayed = await page.evaluate("lab.state")
            assert replayed["frames"] == before["frames"]
            assert replayed["lost"] is False
            await page.screenshot(path=str(OUT / f"{PREFIX}lab-natural-replayed.png"), full_page=True)

            # UI reset/new job invalidates old work, even with a long original budget.
            await page.fill("#budget", "10000")
            await page.click("#run")
            await page.select_option("#scenario", "one-shot")
            await page.click("#load")
            await page.fill("#budget", "150")
            await page.click("#run")
            await page.wait_for_function("lab.result?.type === 'result' && lab.active === null")
            assert await page.evaluate("lab.result.status") == "clear"
            assert await page.evaluate("JSON.stringify(lab.result.plan)") == '["up"]'
            await page.fill("#budget", "10000")
            await page.click("#run")
            await page.click("#cancel")
            assert await page.evaluate("lab.active") is None
            cancelled_state = await page.evaluate("lab.state")
            await page.wait_for_timeout(100)
            assert cancelled_state == await page.evaluate("lab.state")

            # Direct real browser Worker tests, not a Node facsimile.
            worker_report = await page.evaluate("""async () => {
              const {fixture} = await import('./fixtures.mjs');
              const {act} = await import('../03-svg-demake/model.mjs');
              const {pack, features, evaluator, fingerprint} = await import('./sim.mjs');
              const workers = new Set();
              const run = (snapshot, options, budgetMs, iterations, jobID) => new Promise((resolve,reject) => {
                const w = new Worker('./worker.mjs',{type:'module'}); workers.add(w);
                w.onerror = reject;
                w.onmessage = ({data}) => {
                  if(data.type === 'error') reject(Error(data.message));
                  if(data.type === 'result') {w.terminate();workers.delete(w);resolve(data);}
                };
                w.postMessage({type:'search',snapshot,options,budgetMs,iterations,jobID});
              });
              try {
                const fixed=[];
                for (let i=0;i<2;i++) fixed.push(await run(fixture('seeded'),{seed:17,horizon:48,maxNodes:600},20000,700,'fixed-'+i));
                for(const k of ['plan','score','iterations','nodes','transitions','cycleStops','duplicateExpansions'])
                  if(JSON.stringify(fixed[0][k]) !== JSON.stringify(fixed[1][k])) throw Error('Non-deterministic '+k);
                if(fixed[0].iterations!==700 || fixed[0].nodes>600) throw Error('Iteration/node budget');
                const rows=[];
                for (const name of ['seeded','natural']) for(const seed of [11,22,33]) {
                  const snapshot=fixture(name), before=JSON.stringify(snapshot);
                  const r=await run(snapshot,{seed,horizon:48,maxNodes:12000},500,10000000,name+'-'+seed);
                  if(JSON.stringify(snapshot)!==before || fingerprint(snapshot)!==r.sourceFingerprint) throw Error('Source changed');
                  const end=structuredClone(snapshot);for(const a of r.plan) act(end,a);
                  const f=features(pack(end));
                   const base=Math.max(1,features(pack(snapshot)).weighted);
                   const expected=r.options.policy==='resource' || r.options.policy==='seeded' || r.options.policy==='terminal' ?
                     (f.clear?1:.9*(1-f.weighted/base)+.08*Math.min(end.capacitor.n,f.black)/base) : evaluator(pack(snapshot))(pack(end));
                   if(Math.abs(expected-r.score)>1e-12) throw Error('Replay reward mismatch');
                   if(JSON.stringify(end)!==JSON.stringify(r.endSnapshot))throw Error('Replay snapshot mismatch');
                  if(end.frames!==snapshot.frames || r.primitiveCost!==r.plan.length) throw Error('Illegal replay');
                  rows.push({fixture:name,seed,...r});
                }
                const cancellation = await new Promise((resolve,reject) => {
                  const w=new Worker('./worker.mjs',{type:'module'});workers.add(w);
                  let sent=false, ack=false;
                  w.onerror=reject;
                  w.onmessage=({data})=>{
                    if(data.type==='result') reject(Error('Cancelled search completed'));
                    if(data.type==='progress' && !sent){sent=true;w.postMessage({type:'cancel',jobID:'cancel-me'});}
                    if(data.type==='cancelled'){ack=true;setTimeout(()=>{w.terminate();workers.delete(w);resolve(ack);},100);}
                  };
                   w.postMessage({type:'search',jobID:'cancel-me',snapshot:fixture('natural'),options:{seed:5,policy:'seeded'},budgetMs:10000});
                });
                const supersede=await new Promise((resolve,reject)=>{
                  const w=new Worker('./worker.mjs',{type:'module'});workers.add(w);
                  w.onerror=reject;
                  w.onmessage=({data})=>{
                    if(data.type==='result' && data.jobID!=='new')reject(Error('Stale result'));
                    if(data.type==='result' && data.jobID==='new'){w.terminate();workers.delete(w);resolve(data.status==='clear');}
                  };
                  w.postMessage({type:'search',jobID:'old',snapshot:fixture('natural'),budgetMs:10000});
                  w.postMessage({type:'search',jobID:'new',snapshot:fixture('one-shot'),budgetMs:1000,iterations:20});
                });
                return {fixedIterationReproducibility:true, cancellation, supersede, rows};
              } finally {for(const w of workers)w.terminate();}
            }""")
            assert worker_report["cancellation"] and worker_report["supersede"]
            assert not errors, errors
            report = {"browser": browser.version, "uiHeartbeatsDuring1200msSearch": heartbeat,
                      "uiReplayFrozen": True, "uiLatestSnapshotAndCancel": True,
                      "naturalUIResult": natural_result, "worker": worker_report, "errors": errors}
            (OUT / f"{PREFIX}browser-report.json").write_text(json.dumps(report, indent=2) + "\n")
            print(json.dumps({"browser": report["browser"], "heartbeat": heartbeat,
                              "workerRuns": len(worker_report["rows"]), "errors": errors,
                              "evidence": str(OUT)}, indent=2))
            await page.close()
        finally:
            await browser.close()


if __name__ == "__main__":
    handler = functools.partial(QuietHandler, directory=str(HERE.parent))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        asyncio.run(check(server.server_port))
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

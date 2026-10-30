# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Isolated muted browser, ephemeral owned server, fixed-work Worker batches."""
import asyncio
import functools
import hashlib
import json
import sys
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

async def main(port, label):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                                          headless=True, args=["--mute-audio"])
        try:
            page=await browser.new_page()
            await page.goto(f"http://127.0.0.1:{port}/05-autoplay-lab/")
            data=await page.evaluate("async()=> (await import('./perf.mjs')).browserSuite()")
            data.update(label=label,browser=browser.version,hashes={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest()
                         for name in ['sim.mjs','search.mjs','legacy-search.mjs','worker.mjs','perf.mjs']})
            (HERE/'generated'/f'perf-{label}-browser.json').write_text(json.dumps(data,indent=2)+'\n')
            print(json.dumps({'label':label,'browser':browser.version,'rows':len(data['rows'])}))
        finally:
            await browser.close()

if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(HERE.parent)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try: asyncio.run(main(server.server_port,sys.argv[1]))
    finally: server.shutdown();server.server_close();thread.join()

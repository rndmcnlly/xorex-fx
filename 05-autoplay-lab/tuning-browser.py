#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Sequential measured real Workers, isolated muted browser and ephemeral server."""
import asyncio
import functools
import json
import hashlib
from threading import Thread
from http.server import ThreadingHTTPServer
from browser_check import HERE, OUT, CHROME, QuietHandler
from playwright.async_api import async_playwright


async def main(port):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, headless=True, args=["--mute-audio"])
        try:
            page = await browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(f"http://127.0.0.1:{port}/05-autoplay-lab/")
            rows = await page.evaluate("""async () => {
              const {workerSuite}=await import('./tuning.mjs');return await workerSuite('heldout');
            }""")
            assert not errors, errors
            (OUT / "tuning-heldout-browser.json").write_text(json.dumps({"browser": browser.version,
                "hashes": {name: hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in
                           ["search.mjs", "legacy-search.mjs", "sim.mjs", "worker.mjs", "tuning.mjs"]},
                "startup": "30 iteration warmup per worker; round trip includes transport, not module cold start",
                "rows": rows, "errors": errors}, indent=2) + "\n")
            print(json.dumps({"browser": browser.version, "rows": len(rows), "errors": errors}))
            await page.close()
        finally:
            await browser.close()


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(HERE.parent)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        asyncio.run(main(server.server_port))
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

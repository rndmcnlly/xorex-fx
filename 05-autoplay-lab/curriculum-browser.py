#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Isolated muted UI smoke: owns ephemeral server, never touches 8772."""
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
            ids = await page.evaluate("Array.from(document.querySelector('#lesson').options).map(o=>o.value).filter(Boolean)")
            assert len(ids) == 8
            rows = []
            for id in ids:
                await page.select_option("#lesson", id)
                initial = await page.evaluate("lab.state")
                assert len(initial["lanes"]) == 20
                assert max(map(len, initial["lanes"])) <= 14
                assert await page.locator("#lessonCard").is_visible()
                if id == ids[-1]:
                    await page.screenshot(path=str(OUT / "curriculum-bastion-board.png"), full_page=True)
                await page.click("#witness")
                await page.click("#replay")  # pause automatic replay, then synchronous real-model steps
                await page.evaluate("while (!document.querySelector('#step').disabled) lab.step()")
                end = await page.evaluate("lab.state")
                result = await page.evaluate("lab.result")
                assert end == result["endSnapshot"]
                assert end["inventory"]["n"] == 0 and not any(end["lanes"])
                assert end["frames"] == initial["frames"] and not end["lost"]
                assert result["options"]["policy"] == "explicit-oracle"
                rows.append({"lesson": id, "arrows": len(result["plan"]), "charge": end["capacitor"]["n"]})
                if id == ids[-1]:
                    await page.screenshot(path=str(OUT / "curriculum-bastion-cleared.png"), full_page=True)
                await page.click("#rewind")
                assert initial == await page.evaluate("lab.state")
            # A real worker must remain independent of witnesses and reset cancels it.
            await page.select_option("#lesson", "06-park")
            await page.fill("#budget", "10000")
            await page.click("#run")
            await page.click("#witness")
            await page.click("#replay")
            assert await page.evaluate("lab.active") is None
            await page.wait_for_timeout(150)
            assert await page.evaluate("lab.result.type") == "oracle"
            await page.select_option("#lesson", "03-relocate")
            initial = await page.evaluate("lab.state")
            await page.fill("#budget", "500")
            await page.click("#run")
            await page.wait_for_function("lab.result?.type === 'result' && lab.active === null")
            assert initial == await page.evaluate("lab.state")
            assert await page.evaluate("lab.result.options.policy") == "resource"
            assert await page.evaluate("lab.result.incumbentOrigin") != "authored-oracle"
            await page.screenshot(path=str(OUT / "curriculum-relocate-search.png"), full_page=True)
            await page.evaluate("while (!document.querySelector('#step').disabled) lab.step()")
            end = await page.evaluate("lab.state")
            assert end == await page.evaluate("lab.result.endSnapshot")
            assert end["frames"] == initial["frames"]
            assert not errors, errors
            report = {"browser": browser.version, "witnesses": rows, "oracleSupersedesWorker": True,
                      "searchInputUnchanged": True, "searchReplayExact": True, "errors": errors}
            (OUT / "curriculum-browser.json").write_text(json.dumps(report, indent=2) + "\n")
            print(json.dumps(report, indent=2))
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

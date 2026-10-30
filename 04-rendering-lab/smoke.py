# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Run against the root static server: uv run --script 04-rendering-lab/smoke.py."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8765/04-rendering-lab/"
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1100, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    page.wait_for_selector('html[data-ready="three"]', timeout=30000)
    assert page.locator("#state").inner_text() == "Lane 3 / ruby / 0 inputs"
    page.locator("#view").focus()
    for _ in range(20):
        page.keyboard.press("ArrowRight")
    assert page.locator("#state").inner_text() == "Lane 5 / ruby / 20 inputs"
    page.locator("#motion").check()
    page.get_by_role("button", name="Pulse ↑", exact=True).click()
    page.get_by_role("button", name="Select previous lane").click()
    assert page.locator("#state").inner_text() == "Lane 4 / ruby / 22 inputs"
    page.locator("#mode").select_option("flat")
    page.locator("#glow").uncheck()
    page.locator("#background").uncheck()
    page.get_by_role("button", name="Color ↓", exact=True).click()
    assert "emerald / 23 inputs" in page.locator("#state").inner_text()
    page.locator("#reset").click()
    assert page.locator("#state").inner_text() == "Lane 3 / ruby / 0 inputs"
    page.locator("#mode").select_option("lit")
    page.locator("#background").check()
    page.locator("#glow").check()
    page.screenshot(path=str(Path(__file__).with_name("smoke-desktop.png")))
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(Path(__file__).with_name("smoke-mobile.png")))
    print("Browser evidence:", page.locator("#capabilities").inner_text())
    assert not errors, errors
    fallback = browser.new_page()
    fallback.route("https://cdn.jsdelivr.net/**", lambda route: route.abort())
    fallback.goto(URL)
    fallback.wait_for_selector('html[data-ready="reference-only"]')
    fallback.get_by_role("button", name="Select next lane").click()
    assert "Lane 4 / ruby / 1 inputs" == fallback.locator("#state").inner_text()
    assert "3D unavailable" in fallback.locator("#error").inner_text()
    browser.close()
    print(json.dumps({"result": "PASS", "checks": ["3D startup", "20 rapid keys", "input during pulse", "flat/glow/background toggles", "color/reset", "390px no overflow", "CDN failure reference fallback", "no page errors"]}))

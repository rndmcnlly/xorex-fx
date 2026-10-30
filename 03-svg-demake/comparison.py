#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright", "pillow"]
# ///
"""Isolated, muted Chromium captures. Serve project root on port 8765 first."""
import argparse
import asyncio
import io
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageDraw, __version__ as pillow_version
from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "generated" / "comparison"
COLORS = {"red": (255, 0, 0), "green": (0, 255, 0), "blue": (0, 0, 255),
          "yellow": (255, 255, 0), "pink": (255, 0, 255), "white": (255, 255, 255), "black": (0, 0, 0)}


def read_board(image):
    """Read saturated core centers, not Flash RNG or hidden runtime state."""
    lanes = []
    for lane in range(20):
        colors = []
        for row in range(15):
            pixel = image.getpixel((lane * 40 + 20, row * 40))[:3]
            color = min(COLORS, key=lambda c: sum((a - b) ** 2 for a, b in zip(pixel, COLORS[c])))
            if max(abs(a - b) for a, b in zip(pixel, COLORS[color])) > 30:
                break
            colors.append(color)
        lanes.append(colors)
    return lanes


def read_position(image):
    # Only the white chevron has bright white pixels on this scanline.
    bright = [x for x in range(800) if min(image.getpixel((x, 540))[:3]) > 220]
    assert bright, "Ship not settled or canvas obscured"
    return round(((min(bright) + max(bright)) / 2 - 20) / 40)


def read_energy_counts(image, position, inventory, capacitor):
    """Verify visible resource strokes, rather than trusting action timing.

    A spawn while we drive the original may extend a gatherable run. Colors
    remain those of its old tail, but observed ring/chevron counts take priority.
    These short inspection runs must fit inside the visible sampling window.
    """
    x = position * 40 + 20
    result = []
    for kind, energy in [('inventory', inventory), ('capacitor', capacitor)]:
        count = 0
        for i in range(7):
            radius = (i + 2) * 6
            point = (x + radius - 1, 500) if kind == 'inventory' else (x + 10, 550 + radius)
            pixel = image.getpixel(point)[:3]
            if max(abs(a - b) for a, b in zip(pixel, COLORS[energy['color']])) > 12:
                break
            count += 1
        assert 0 < count < 7, f'Cannot confidently read {kind}: {count} visible glyphs'
        result.append({'color': energy['color'], 'n': count})
    return result


def metrics(a, b, box):
    a, b = a.crop(box).convert("RGB"), b.crop(box).convert("RGB")
    diff = ImageChops.difference(a, b)
    pixels = list(diff.get_flattened_data())
    return {"mean_absolute_RGB_error_0_255": round(sum(sum(p) for p in pixels) / len(pixels) / 3, 4),
            "max_channel_error_0_255": max(max(p) for p in pixels),
            "pixels_max_channel_error_over_8_percent": round(100 * sum(max(p) > 8 for p in pixels) / len(pixels), 3)}


async def original_capture(page, name):
    await page.evaluate("window.reference.suspend()")
    # Suspension adds Ruffle's orange resume UI, not game art. Hide only emulator
    # chrome in this isolated inspection wrapper, never the game's display list.
    await page.locator("ruffle-player").evaluate("""p => {
      const style = document.createElement('style');
      style.textContent = '#play-button, #unmute-overlay { display: none !important; }';
      p.shadowRoot.append(style);
    }""")
    data = await page.screenshot(path=str(OUT / f"original-{name}.png"))
    return Image.open(io.BytesIO(data)).convert("RGB")


async def compare(demake, name, original, state):
    await demake.evaluate("state => window.xorexInspection.loadFixture(state)", state)
    data = await demake.locator("#stage").screenshot(path=str(OUT / f"demake-{name}.png"))
    rendered = Image.open(io.BytesIO(data)).convert("RGB")
    sheet = Image.new('RGB', (1600, 624), '#404040')
    sheet.paste(original, (0, 24))
    sheet.paste(rendered, (800, 24))
    labels = ImageDraw.Draw(sheet)
    labels.text((8, 5), 'Unmodified original SWF / Ruffle 0.7.1, silent', fill='white')
    labels.text((808, 5), 'SVG demake / captured-state visual fixture, silent', fill='white')
    sheet.save(OUT / f'side-by-side-{name}.png')
    (OUT / f"{name}-fixture.json").write_text(json.dumps(state, indent=2) + "\n")
    ImageEnhance.Brightness(ImageChops.difference(original, rendered)).enhance(4).save(OUT / f"diff-{name}-4x.png")
    x = state["pos"] * 40 + 20
    boxes = {"whole_stage": (0, 0, 800, 600), "orb_field": (0, 0, 800, 200),
             "ship_resources": (max(0, x - 60), 450, min(800, x + 60), 600),
             "beam": (max(0, x - 40), 250, min(800, x + 40), 440)}
    for lane, colors in enumerate(state["lanes"]):
        if "black" in colors[1:]:
            row = colors.index("black", 1)
            boxes["black_gem"] = (max(0, lane * 40 - 8), row * 40 - 28, min(800, lane * 40 + 48), row * 40 + 28)
            break
    result = {region: metrics(original, rendered, box) for region, box in boxes.items()}
    for region, box in boxes.items():
        if region != "whole_stage":
            original.crop(box).save(OUT / f"original-{name}-{region}.png")
            rendered.crop(box).save(OUT / f"demake-{name}-{region}.png")
    return result


async def smoke(demake):
    """UI regressions distinct from visual fixture comparison."""
    errors = []
    demake.on('pageerror', lambda error: errors.append(str(error)))
    await demake.bring_to_front()
    assert not await demake.locator('#sound').is_checked()
    assert not await demake.locator('#music').is_checked()
    # A deliberately overflowing paused fixture loses on the next real tick,
    # then the original termination art and mouse restart must both work.
    state = {'lanes': [['red'] * 15] + [[] for _ in range(19)], 'pos': 10,
             'inventory': {'color': None, 'n': 0}, 'capacitor': {'color': None, 'n': 0},
             'frames': 0, 'lost': False}
    await demake.evaluate('state => window.xorexInspection.loadFixture(state)', state)
    await demake.evaluate("document.getElementById('pause').click()")
    await demake.wait_for_function('window.xorexInspection.exportState().lost')
    assert await demake.locator('#original-art').get_attribute('src') == 'assets/termination/1.svg'
    assert await demake.locator('#overlay').is_visible()
    await demake.locator('#stage').screenshot(path=str(OUT / 'demake-termination.png'))
    await demake.locator('#overlay').click(position={'x': 400, 'y': 300})
    before = await demake.evaluate('window.xorexInspection.exportState()')
    await demake.keyboard.press('ArrowLeft' if before['pos'] else 'ArrowRight')
    after = await demake.evaluate('window.xorexInspection.exportState()')
    assert after['pos'] == before['pos'] + (-1 if before['pos'] else 1)
    assert not after['lost']
    # Input already committed while the two-second presentation is still active.
    assert await demake.evaluate("document.getElementById('ship').getAnimations().length > 0")
    mobile = await demake.context.browser.new_page(viewport={'width': 400, 'height': 800})
    await mobile.goto(demake.url)
    assert await mobile.evaluate("document.documentElement.scrollWidth <= 400")
    assert await mobile.locator('#overlay').evaluate("e => getComputedStyle(e).padding === '0px'")
    assert await mobile.locator('#original-art').evaluate("e => e.offsetWidth === 384 && e.offsetHeight === 288")
    await mobile.close()
    assert not errors, errors
    return 'passed: silence defaults, next-tick loss, termination art, mouse restart, immediate input during entrance, mobile stage layout, no page errors'


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8765")
    parser.add_argument("--replay", action="store_true", help="Re-render saved original captures/fixtures without starting Flash again")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True, args=["--mute-audio"],
        )
        if args.replay:
            demake = await browser.new_page(viewport={"width": 800, "height": 600}, device_scale_factor=1)
            await demake.goto(f"{args.url}/03-svg-demake/?inspect")
            await demake.add_style_tag(content="main { width:800px; max-width:none; margin:0; padding:0 } header {display:none}")
            await demake.wait_for_timeout(1100)
            await demake.locator("#stage").screenshot(path=str(OUT / "demake-splash.png"))
            report = {"method": "Re-render of saved unmodified live original captures, using RGB core-center readback fixtures.",
                      "browser": browser.version, "pillow": pillow_version}
            for fixture in sorted(OUT.glob("*-fixture.json")):
                name = fixture.name.removesuffix("-fixture.json")
                original = Image.open(OUT / f"original-{name}.png").convert("RGB")
                report[name] = await compare(demake, name, original, json.loads(fixture.read_text()))
            report["splash"] = metrics(Image.open(OUT / "original-splash.png"), Image.open(OUT / "demake-splash.png"), (0, 0, 800, 580))
            report['UI_smoke'] = await smoke(demake)
            (OUT / "metrics.json").write_text(json.dumps(report, indent=2) + "\n")
            print(json.dumps(report, indent=2))
            await browser.close()
            return
        page = await browser.new_page(viewport={"width": 800, "height": 600}, device_scale_factor=1)
        page.on("console", lambda msg: print("browser:", msg.text) if msg.type == "error" else None)
        await page.goto(f"{args.url}/03-svg-demake/reference.html")
        await page.wait_for_timeout(23000)
        await page.screenshot(path=str(OUT / "original-splash.png"))
        print("Ruffle volume:", await page.evaluate("window.reference.volume"))
        await page.mouse.click(400, 300)
        await page.wait_for_timeout(2300)
        original = await original_capture(page, "play")
        state = {"lanes": read_board(original), "pos": read_position(original),
                 "inventory": {"color": None, "n": 0}, "capacitor": {"color": None, "n": 0},
                 "frames": 0, "lost": False}
        demake = await browser.new_page(viewport={"width": 800, "height": 600}, device_scale_factor=1)
        await demake.goto(f"{args.url}/03-svg-demake/?inspect")
        await demake.add_style_tag(content="main { width:800px; max-width:none; margin:0; padding:0 } header {display:none}")
        await demake.wait_for_timeout(1100)
        await demake.locator("#stage").screenshot(path=str(OUT / "demake-splash.png"))
        report = {"method": "Unmodified live SWF. RGB core-center readback reconstructs paused visual fixtures, not runtime state or PRNG equivalence.",
                  "browser": browser.version, "pillow": pillow_version,
                  "audio": "Ruffle volume=0 before load, Chromium --mute-audio, demake effects/music unchecked.",
                  "play": await compare(demake, "play", original, state)}

        # Exercise original controls to obtain real inventory + capacitor art.
        # Do not patch bytecode, alter mechanics, or feed a synthetic board to it.
        candidates = [i for i, lane in enumerate(state["lanes"]) if lane and lane[-1] != "black"]
        if len(candidates) >= 2:
            await page.bring_to_front()
            await page.evaluate("window.reference.resume()")
            position = state["pos"]
            energies = []
            for index, lane_index in enumerate(candidates[:2]):
                while position != lane_index:
                    direction = 1 if lane_index > position else -1
                    await page.keyboard.press("ArrowRight" if direction == 1 else "ArrowLeft")
                    position += direction
                lane = state["lanes"][lane_index]
                color = lane[-1]
                n = 0
                for c in reversed(lane):
                    if c != color:
                        break
                    n += 1
                energies.append({"color": color, "n": n})
                await page.keyboard.press("ArrowDown")
                if index == 0:
                    await page.keyboard.press("ArrowDown")
            await page.wait_for_timeout(80)
            resources = await original_capture(page, "resources")
            inventory, capacitor = read_energy_counts(resources, position, energies[1], energies[0])
            state = {**state, "lanes": read_board(resources), "pos": position,
                     "inventory": inventory, "capacitor": capacitor}
            report["resources"] = await compare(demake, "resources", resources, state)
        report["splash"] = metrics(Image.open(OUT / "original-splash.png"), Image.open(OUT / "demake-splash.png"), (0, 0, 800, 580))
        report['UI_smoke'] = await smoke(demake)
        (OUT / "metrics.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2))
        await browser.close()
    print(OUT)


if __name__ == "__main__":
    asyncio.run(main())

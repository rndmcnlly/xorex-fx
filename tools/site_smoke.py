#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Exercise the assembled site under a subpath, or a deployed Pages URL."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', help='Deployed base URL, including project subpath')
    args = parser.parse_args()
    server = None
    if args.url:
        base = args.url.rstrip('/') + '/'
    else:
        class Quiet(SimpleHTTPRequestHandler):
            def log_message(self, *args): pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/site/'
    evidence = {'base': base, 'pages': [], 'errors': []}
    try:
        for path, magic in [('01-ruffle/Xorex.swf', b'CWS'), ('docs/rules/xorex-rules.pdf', b'%PDF')]:
            data = urllib.request.urlopen(base + path, timeout=30).read()
            assert data.startswith(magic), f'Invalid asset bytes: {path}'
            evidence[path] = len(data)
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--mute-audio'])
            try:
                page = browser.new_page(viewport={'width': 1100, 'height': 900})
                page.on('pageerror', lambda error: evidence['errors'].append(str(error)))
                for route in ['', 'gallery.html', '03-svg-demake/',
                              '04-rendering-lab/p3-playable/', '04-rendering-lab/motion-playable/',
                              '05-autoplay-lab/', '06-autoplay-playable/']:
                    response = page.goto(base + route, wait_until='networkidle', timeout=30000)
                    assert response.status == 200, route
                    evidence['pages'].append({'route': route or './', 'title': page.title()})
                    assert page.locator('body').inner_text().strip(), route
                    if route == 'gallery.html':
                        for image in page.locator('img').all():
                            image.scroll_into_view_if_needed()
                            image.evaluate('image => image.decode()')
                            assert image.evaluate('image => image.naturalWidth > 0'), 'Gallery image failed'
                        evidence['galleryImages'] = page.locator('img').count()
                # Validate actual Worker imports against a project-path prefix.
                worker = page.evaluate('''async base => {
                  const {createGame} = await import(base + '03-svg-demake/model.mjs');
                  const snapshot = createGame(() => .5, 0);
                  return await new Promise((resolve, reject) => {
                    const w = new Worker(base + '05-autoplay-lab/htn-worker.mjs', {type:'module'});
                    const timer = setTimeout(() => {w.terminate(); reject(Error('Worker timeout'));}, 10000);
                    w.onerror = e => {clearTimeout(timer); w.terminate(); reject(Error(e.message));};
                    w.onmessage = e => {if (e.data.type === 'error') {clearTimeout(timer); w.terminate(); reject(Error(JSON.stringify(e.data)));}
                      if (e.data.type === 'result' || e.data.type === 'final') {clearTimeout(timer); w.terminate(); resolve(e.data);}};
                    w.postMessage({type:'search',jobID:'pages-smoke',snapshot,options:{maxNodes:1000},budgetMs:500});
                  });
                }''', base)
                evidence['worker'] = worker
                page.locator('#auto').check()
                page.wait_for_timeout(3500)
                assert page.locator('#auto').is_checked()
                evidence['liveStatus'] = page.locator('#auto-status').inner_text()
                page.locator('#stage').focus(); page.keyboard.press('ArrowRight')
                assert not page.locator('#auto').is_checked(), 'Manual takeover failed'
                evidence['manualTakeover'] = True
                page.goto(base, wait_until='networkidle')
                out = ROOT / 'dist/review'; out.mkdir(exist_ok=True)
                page.screenshot(path=str(out / 'landing-desktop.png'), full_page=True)
                page.set_viewport_size({'width': 390, 'height': 844})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
                page.screenshot(path=str(out / 'landing-mobile.png'), full_page=True)
                assert not evidence['errors'], evidence['errors']
            finally:
                browser.close()
    finally:
        if server: server.shutdown(); server.server_close()
        out = ROOT / 'dist/review'; out.mkdir(parents=True, exist_ok=True)
        (out / 'site-smoke.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'Checked {len(evidence["pages"])} pages, resolved binary assets, Worker, live autoplay and manual takeover at {base}')


if __name__ == '__main__': main()

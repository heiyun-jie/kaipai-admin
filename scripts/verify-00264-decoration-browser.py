"""Actual Chromium computed-style gate; fixture assets only, no API or AI. Requires Python Playwright."""
import base64,json,subprocess,tempfile,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
url='http://127.0.0.1:15174/scripts/fixtures/decoration-renderer.html'
# Never reuse or terminate somebody else's listener on the fixed fixture port.
try:
 urllib.request.urlopen(url,timeout=1)
except OSError: pass
else: raise RuntimeError('Fixture port 15174 is in use; stop the task fixture first')
with tempfile.TemporaryFile(mode='w+',encoding='utf-8') as log:
 server=subprocess.Popen(['node','scripts/preview-00264-decoration.mjs'],cwd=root,stdout=log,stderr=log)
 try:
  for _ in range(100):
   if server.poll() is not None: raise RuntimeError('Local fixture server exited')
   try: urllib.request.urlopen(url,timeout=1);break
   except OSError: time.sleep(.1)
  else: raise RuntimeError('Local fixture not ready')
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True)
   try:
    page=browser.new_page(viewport={'width':800,'height':900})
    # A valid tiny PNG has a square intrinsic size. Product CSS must override it.
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1kAAAAASUVORK5CYII=')
    page.route('https://decoration.invalid/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
    page.goto(url,wait_until='networkidle')
    dimensions={
     '.actor-card-decoration__work-image':{'width':'128px','height':'96px'},
     '.actor-card-decoration__media-image':{'height':'260px'},
     '.actor-card-decoration__hero-image':{'height':'1334px','width':'750px'},
     '.actor-card-decoration__chip':{'paddingTop':'7px','paddingRight':'16px'},
     '.actor-card-decoration__profile-value':{'marginTop':'5px'},
     '.actor-card-decoration__video':{'height':'360px'},
     '.actor-card-decoration__pdf-entry':{'minHeight':'76px'},
    }
    for selector,expected in dimensions.items():
     element=page.locator(selector).first
     expect(element).to_be_attached()
     actual=element.evaluate('(el,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))',list(expected))
     assert actual==expected,f'{selector}: expected {expected}; actual {actual}'
     print('PASS',selector,json.dumps(actual),flush=True)
    assert page.locator('[data-module]').count()==10
    print('BROWSER_LAYOUT=PASS; ten modules; no production/API/AI requests')
   finally: browser.close()
 finally:
  server.terminate();server.wait(timeout=10)

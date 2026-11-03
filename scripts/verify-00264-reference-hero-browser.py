"""B12 Chromium reference-renderer visual contract; local fixtures only, never AI/API."""
import argparse,base64,json,subprocess,tempfile,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output-directory',type=Path,default=ROOT.parent/'tmp/00264-b12-reference-browser')
parser.add_argument('--hero-image',type=Path)
args=parser.parse_args();args.output_directory.mkdir(parents=True,exist_ok=True)
url='http://127.0.0.1:15174/scripts/fixtures/decoration-reference-hero.html'
try: urllib.request.urlopen(url,timeout=1)
except OSError: pass
else: raise RuntimeError('Fixture port 15174 is in use; never reuse or kill an unknown listener')
png=args.hero_image.read_bytes() if args.hero_image else base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1kAAAAASUVORK5CYII=')
report={'scope':'local shared renderer fixture','realAiSubmissions':0,'productionMutation':'NONE','checks':[]}
def check(name,passed):
 report['checks'].append({'name':name,'passed':bool(passed)})
 assert passed,name
 print('PASS '+name,flush=True)
with tempfile.TemporaryFile(mode='w+',encoding='utf-8') as log:
 server=subprocess.Popen(['node','scripts/preview-00264-decoration.mjs'],cwd=ROOT,stdout=log,stderr=log)
 try:
  for _ in range(100):
   if server.poll() is not None: raise RuntimeError('Local fixture exited')
   try: urllib.request.urlopen(url,timeout=1);break
   except OSError: time.sleep(.1)
  else: raise RuntimeError('Local fixture not ready')
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True)
   try:
    page=browser.new_page(viewport={'width':900,'height':1100},device_scale_factor=1)
    page.route('https://decoration.invalid/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
    page.goto(url,wait_until='networkidle')
    expect(page.get_by_text('ACTRESS PROFILE',exact=True)).to_be_visible()
    expect(page.get_by_text('演员 · 165cm · 82斤',exact=True)).to_be_visible()
    badge=page.get_by_text('全网粉丝 10w+ · 可配合剧宣',exact=True)
    expect(badge).to_be_visible()
    name=page.locator('.actor-card-decoration__name').first
    check('dedicated large name font is 104 design px',name.evaluate('(e)=>getComputedStyle(e).fontSize')=='104px')
    check('preset keeps full 1334 hero height',page.locator('.actor-card-decoration__hero').evaluate('(e)=>getComputedStyle(e).height')=='1334px')
    hero=page.locator('.actor-card-decoration__hero')
    img=page.locator('.actor-card-decoration__hero-image');img.evaluate('(x)=>x.decode()')
    hero.screenshot(path=str(args.output_directory/'reference-hero-full.png'))
    box=hero.bounding_box();assert box
    page.screenshot(path=str(args.output_directory/'reference-hero-info.png'),clip={'x':box['x'],'y':box['y']+856*.556,'width':417,'height':(1334-856)*.556})
    check('blue pill style is configured not baked into image',badge.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(50, 102, 255)')
    page.evaluate('window.referenceFixture.setBadge("")')
    expect(badge).to_have_count(0)
    expect(page.locator('[data-module="reference-promotion"]')).to_have_count(0)
    check('empty actor copy removes promotion module',True)
    page.evaluate('window.referenceFixture.setBadge("甲".repeat(40))')
    long=page.get_by_text('甲'*40,exact=True);expect(long).to_be_visible()
    bounds=long.evaluate('(e)=>{const r=e.getBoundingClientRect();const h=e.closest(".actor-card-decoration__hero").getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,heroLeft:h.left,heroRight:h.right,heroBottom:h.bottom,client:e.clientWidth,scroll:e.scrollWidth}}')
    check('40-char pill stays within hero horizontally and vertically',bounds['left']>=bounds['heroLeft']-.5 and bounds['right']<=bounds['heroRight']+.5 and bounds['bottom']<=bounds['heroBottom']+.5 and bounds['scroll']<=bounds['client']+1)
    page.evaluate('window.referenceFixture.setWeight("82斤")')
    expect(page.get_by_text('演员 · 165cm · 82斤',exact=True)).to_be_visible()
    page.evaluate('window.referenceFixture.setWeight("bad")')
    expect(page.get_by_text('演员 · 165cm',exact=True)).to_be_visible()
    check('unit-aware weight and invalid-value omission',True)
    page.evaluate('window.referenceFixture.setBadge("ABCDEFGHIJ".repeat(4))')
    latin=page.get_by_text('ABCDEFGHIJ'*4,exact=True);expect(latin).to_be_visible()
    check('unbroken words do not overflow',latin.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
    page.evaluate('window.referenceFixture.enablePreview();window.referenceFixture.config.modules.find(m=>m.type==="promotion").layout.height=35')
    warning=page.get_by_role('alert').filter(has_text='首图文案区域高度不足')
    expect(warning).to_be_visible()
    page.evaluate('window.referenceFixture.config.modules.find(m=>m.type==="promotion").layout.height=125;window.referenceFixture.setBadge("短文案")')
    expect(warning).to_have_count(0)
    page.evaluate('window.referenceFixture.config.modules.find(m=>m.type==="promotion").style.marginTop=100')
    expect(warning).to_be_visible()
    page.evaluate('window.referenceFixture.config.modules.find(m=>m.type==="promotion").style.marginTop=0')
    expect(warning).to_have_count(0)
    check('legal top margin cannot silently clip the pill outside its module',True)
    page.evaluate('window.referenceFixture.config.modules.find(m=>m.type==="promotion").layout.height=35;window.referenceFixture.setBadge("")')
    expect(warning).to_have_count(0)
    check('real Preview warns on insufficient height and clears for fitting or empty copy',True)
    page.goto('http://127.0.0.1:15174/scripts/fixtures/decoration-preview.html',wait_until='networkidle')
    dialog=page.get_by_role('dialog').filter(has=page.locator('.decoration-workbench'))
    apply=dialog.get_by_role('button',name='应用参考首图样式',exact=True)
    expect(apply).to_be_enabled(timeout=15000);apply.click()
    page.get_by_role('button',name='应用到当前草稿',exact=True).click()
    expect(dialog.get_by_text('未保存改动',exact=True)).to_be_visible()
    english=dialog.get_by_role('textbox',name='英文小标题',exact=True)
    expect(english).to_have_value('ACTOR PROFILE')
    english.fill('ACTRESS PROFILE')
    expect(dialog.locator('.actor-card-decoration__eyebrow')).to_have_text('ACTRESS PROFILE')
    check('real editor opt-in and English control update shared renderer',True)
    dialog.get_by_role('button',name='保存草稿',exact=True).click()
    expect(dialog.get_by_text('草稿已同步',exact=True)).to_be_visible()
    dialog.screenshot(path=str(args.output_directory/'reference-editor.png'))
    check('local isolated API saves the explicitly changed draft',True)
    report['passed']=True
   finally: browser.close()
 finally:
  server.terminate();server.wait(timeout=10)
  (args.output_directory/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

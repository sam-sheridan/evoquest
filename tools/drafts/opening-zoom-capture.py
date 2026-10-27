"""Draft helper: captures the home island and the release view used by tools/drafts/opening-zoom.html.
Usage: python3 tools/drafts/opening-zoom-capture.py OUT_DIR 1074   (then save the PNGs as JPEGs next to the page)
"""
import os
import sys,time,base64,json
from playwright.sync_api import sync_playwright
SP = sys.argv[1]  # folder (created if missing) for island.jpg, patch_empty.png and patch_cr.png
os.makedirs(SP, exist_ok=True)
seed = sys.argv[2] if len(sys.argv) > 2 else None  # world number, e.g. 1074
GAME = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'index.html')
EXE='/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=EXE)
    pg=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://' + GAME); time.sleep(1)
    pg.evaluate("()=>{document.querySelector('#intro').hidden=true}")
    if seed:
        pg.evaluate("s=>{const sel=document.querySelector('#fWorld');sel.innerHTML+=`<option value='${s}'>t</option>`;sel.value=s}",seed)
    pg.click('#go'); time.sleep(0.6)
    info=pg.evaluate("()=>{const c=window.EvoQuestDebug.camera;return {x:c.x,y:c.y,z:c.z,W,H,TS}}")
    print(info)
    url=pg.evaluate("()=>tcan.toDataURL('image/jpeg',0.86)")
    open(SP+'/island.jpg','wb').write(base64.b64decode(url.split(',')[1]))
    # sharp patch at z=1 centred on release spot
    pg.add_style_tag(content="body>*:not(canvas){visibility:hidden!important}")
    pg.evaluate("()=>{const c=window.EvoQuestDebug.camera;c.z=1}")
    time.sleep(0.8)
    pg.screenshot(path=SP+'/patch_cr.png')
    pg.evaluate("()=>{window._cr=window.EvoQuestDebug.state.creatures.splice(0)}")
    time.sleep(0.5)
    pg.screenshot(path=SP+'/patch_empty.png')
    info['pw']=1600; info['ph']=1000
    json.dump(info,open(SP+'/info.json','w'))
    print(errs)

"""Draft helper: captures other worlds, shrunk to 0.3 px per world px, for tools/drafts/opening-zoom.html.
Usage: python3 tools/drafts/opening-zoom-others.py OUT_DIR 2210 388 ...   (writes OUT_DIR/w<number>.jpg)
"""
import sys,time,base64,os
from playwright.sync_api import sync_playwright
OUT=sys.argv[1]; seeds=sys.argv[2:]
os.makedirs(OUT,exist_ok=True)
EXE='/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=EXE)
    for s in seeds:
        pg=b.new_page(viewport={'width':1200,'height':800})
        pg.goto('file://' + os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'index.html') + ''); time.sleep(0.8)
        pg.evaluate("()=>{document.querySelector('#intro').hidden=true}")
        pg.evaluate("s=>{const sel=document.querySelector('#fWorld');sel.innerHTML+=`<option value='${s}'>t</option>`;sel.value=s}",s)
        pg.click('#go'); time.sleep(0.5)
        url=pg.evaluate("()=>{const c=document.createElement('canvas');c.width=Math.round(W*0.3);c.height=Math.round(H*0.3);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(tcan,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.82)}")
        open(f'{OUT}/w{s}.jpg','wb').write(base64.b64decode(url.split(',')[1]))
        print(s, pg.evaluate("()=>[window.EvoQuestDebug.world.kind, window.EvoQuestDebug.world.landFrac]"))
        pg.close()

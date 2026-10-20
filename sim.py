# Headless scenario runner: one process per worker, each runs several full simulations and appends JSON lines.
import sys, json, os, time
from playwright.sync_api import sync_playwright
cfg = json.loads(sys.argv[1]); runs = int(sys.argv[2]); minutes = float(sys.argv[3]); out = sys.argv[4]; seed0 = int(sys.argv[5])
designs = [{}, {'hab': .6}, {'spd': 8, 'w': 2, 'h': 2.5}, {'spd': 3, 'w': 6, 'h': 6}, {'hab': .35, 'w': 2.5, 'h': 5}, {'spd': 6.5}]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 800, 'height': 600})
    pg.goto('file://' + os.path.abspath('dbg.html')); time.sleep(1)
    for r in range(runs):
        d = designs[(seed0 + r) % len(designs)]
        pg.evaluate("document.querySelector('#creator').hidden=false;document.querySelector('#end').hidden=true")
        pg.evaluate(f"window.__eq.D({{w:4,h:4.5,spd:5,hab:.2,...{json.dumps(d)}}})")
        pg.evaluate(f"()=>{{const s={seed0 * 1000 + r * 37 + 11};document.querySelector('#fWorld').innerHTML+=`<option value='${{s}}'>x</option>`;document.querySelector('#fWorld').value=String(s)}}")
        pg.click('#go'); pg.click('#bPause')
        pg.evaluate(f"()=>{{const q=window.__eq;Object.assign(q.GROW,{json.dumps(cfg.get('grow', {}))});Object.assign(q.SPC,{json.dumps(cfg.get('spc', {}))});Object.assign(q.CRW,{json.dumps(cfg.get('crw', {}))})}}")
        res = pg.evaluate(f"""()=>{{const q=window.__eq,S=q.S,steps={int(minutes*60/0.05)},seas=[[],[],[],[]];let mn=1e9,mx=0,over=0,cnt=0,maxLive=1;
          for(let i=0;i<steps;i++){{if(S.over)break;q.step(.05);if(i%40===0&&S.t>180){{const n=S.creatures.length;seas[S.season].push(n);mn=Math.min(mn,n);mx=Math.max(mx,n);cnt++;if(n>100)over++;maxLive=Math.max(maxLive,S.species.filter(s=>!s.died).length)}}}}
          const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
          return {{t:Math.round(S.t),over:S.over,species:S.species.length-1,seasons:seas.map(a=>avg(a)&&Math.round(avg(a))),min:mn===1e9?0:mn,max:mx,pctOver100:cnt?Math.round(over/cnt*100):0,maxLiveSpecies:maxLive,events:S.events}}}}""")
        res['design'] = d; res['cfg'] = cfg.get('name')
        with open(out, 'a') as f: f.write(json.dumps(res) + '\n')
    b.close()

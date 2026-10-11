# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import datetime
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
t=datetime.date.today(); ly=t.year-1
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,300); pg.click('[data-act=demo]'); W(pg,800)
    pg.click('[data-act=range][data-r=Year]'); W(pg)
    check('Year opens on the latest full year (last year)', pg.input_value('#year-pick')==str(ly))
    bars=pg.evaluate("[].map.call(document.querySelectorAll('svg.chart rect.cbar'),r=>r.dataset.m)")
    check(f'{ly}: all 12 months Jan to Dec have income and expense bars', bars==[f'{ly}-{m:02d}' for m in range(1,13)] and pg.evaluate("document.querySelectorAll('svg.chart rect.cbar2').length")==12)
    check(f'{ly}: an amount on every bar (24 labels)', pg.evaluate("document.querySelectorAll('svg.chart text.vl:not(.fut)').length")==24)
    box=pg.evaluate("Object.fromEntries([].map.call(document.querySelectorAll('.mbox'),b=>[b.querySelector('.muted').textContent,b.querySelector('b').textContent]))")
    yr=pg.evaluate(f"(()=>{{const r=[].filter.call(document.querySelectorAll('#monthly tr.yr'),r=>r.children[0].textContent.indexOf('{ly}')===0)[0];return [r.children[2].innerText.trim(),r.children[3].innerText.trim(),r.children[4].innerText.trim()]}})()")
    check('year summary = the year total row in the table', [box['Income'],box['Expenses'],box['Net profit']]==yr, (box['Income'],yr[0]))
    check('year summary names the highest, lowest and most profitable months', all(k in box for k in ['Highest income','Lowest income','Most profitable']))
    pg.click(f'svg.chart rect.cbar[data-m="{ly}-06"]'); W(pg,400)
    check('clicking a month bar opens that month', pg.input_value('#month-pick')==f'{ly}-06')
    opts=pg.evaluate("[].map.call(document.querySelectorAll('#month-pick option'),o=>o.value)")
    check('the month list has every month back to January last year', opts[-1]==f'{ly}-01' and len(opts)==t.month+12, (len(opts),opts[-1]))
    pg.click('[data-act=range][data-r=Year]'); W(pg); pg.select_option('#year-pick',str(ly)); W(pg); pg.select_option('#year-pick',str(t.year)); W(pg)
    check('picking a year from the list works', pg.input_value('#year-pick')==str(t.year))
    rows=pg.evaluate("[].map.call(document.querySelectorAll('#monthly tbody tr[data-m]'),r=>r.dataset.m)")
    check('table lists every month since the first sale, newest first', rows[0]==f'{t.year}-{t.month:02d}' and rows[-1]==f'{ly}-01' and len(rows)==t.month+12)
    pg.reload(); W(pg,500); pg.evaluate("(()=>{const k='sellora-d-demo@sellora.app',s=JSON.parse(localStorage.getItem(k));s.range='This Year';localStorage.setItem(k,JSON.stringify(s))})()"); pg.reload(); W(pg,500)
    check('an old saved "This Year" choice opens the Year view', pg.query_selector('#year-pick') is not None)
    pg.set_viewport_size({'width':390,'height':844}); W(pg,300)
    check('phone: Year view fits the screen', pg.evaluate('document.documentElement.scrollWidth')==390)
    check('no page errors', not errs, errs[:2]); b.close()
print(f'\n{sum(R)}/{len(R)} passed')

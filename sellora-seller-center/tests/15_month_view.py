# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import datetime
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
t=datetime.date.today(); cur=f'{t.year}-{t.month:02d}'
def ym_add(ym,k):
    y,m=map(int,ym.split('-')); m+=k; y+=(m-1)//12; m=(m-1)%12+1; return f'{y}-{m:02d}'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,300)
    # empty shop first
    pg.click('[data-act=freshShop]'); W(pg); pg.fill('#l-name','S'); pg.fill('#l-email','e@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('[data-act=range][data-r=Month]'); W(pg)
    check('empty shop: Month view says there are no orders, no monthly table', 'No orders in' in pg.inner_text('#salesov') and pg.query_selector('#monthly') is None)
    pg.click('[data-act=prof]'); pg.click('[data-act=logout]'); W(pg,300); pg.click('[data-act=demo]'); W(pg,600)
    pg.click('[data-act=range][data-r=Month]'); W(pg)
    check('Month opens on the current month, marked "so far"', pg.input_value('#month-pick')==cur and 'so far' in pg.inner_text('.msum-h'))
    check('next-month button is off on the current month', pg.evaluate("document.querySelector('[data-act=monthStep][data-d=\"1\"]').disabled"))
    pg.click('[data-act=monthStep][data-d="-1"]'); W(pg)
    check('‹ goes to the previous month', pg.input_value('#month-pick')==ym_add(cur,-1) and 'Changes compared with' in pg.inner_text('.msum-h'))
    check('chart has one point per day', pg.evaluate("document.querySelectorAll('svg.chart circle').length")==__import__('calendar').monthrange(*map(int,ym_add(cur,-1).split('-')))[1])
    pg.click('[data-act=monthStep][data-d="1"]'); W(pg); check('› comes back', pg.input_value('#month-pick')==cur)
    target=ym_add(cur,-6); pg.select_option('#month-pick',target); W(pg)
    check('picking a month from the list shows it', target in pg.input_value('#month-pick') and pg.evaluate("document.activeElement.id")=='month-pick')
    row=pg.query_selector(f'#monthly tr[data-m="{ym_add(cur,-3)}"]'); row.click(); W(pg,400)
    check('choosing a row in Sales by Month opens that month', pg.input_value('#month-pick')==ym_add(cur,-3) and pg.query_selector(f'#monthly tr.sel[data-m="{ym_add(cur,-3)}"]') is not None)
    pg.focus(f'#monthly tr[data-m="{ym_add(cur,-8)}"]'); pg.keyboard.press('Enter'); W(pg,300)
    check('keyboard: Enter on a month row opens it', pg.input_value('#month-pick')==ym_add(cur,-8))
    s1=pg.inner_text('.msum'); pg.reload(); W(pg,400)
    check('after reload the chart starts from its normal view again', pg.query_selector('#month-pick') is None and pg.query_selector('#monthly') is not None)
    pg.click('[data-act=range][data-r=Year]'); W(pg)
    check('Year view shows the year summary instead of a month picker', pg.query_selector('#year-pick') is not None and pg.query_selector('#month-pick') is None and pg.query_selector('.msum') is not None)
    pg.set_viewport_size({'width':390,'height':844}); W(pg,200); pg.click('[data-act=range][data-r=Month]'); W(pg)
    check('phone: nothing sticks out sideways', pg.evaluate('document.documentElement.scrollWidth')==390)
    check('no page errors', not errs, errs[:2]); b.close()
print(f'\n{sum(R)}/{len(R)} passed')

# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import datetime,re
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
t=datetime.date.today(); ly=t.year-1
D="JSON.parse(localStorage.getItem('sellora-d-demo@sellora.app'))"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,300); pg.click('[data-act=demo]'); pg.wait_for_selector('#monthly'); W(pg,300)
    d=pg.evaluate(D); now=pg.evaluate('Date.now()')
    fo=[o for o in d['orders'] if o['ts']>now]; fx=[x for x in d['expenses'] if x['ts']>now]
    check('no orders or expenses dated in the future', not fo and not fx, (len(fo),len(fx)))
    first=datetime.datetime.fromtimestamp(min(o['ts'] for o in d['orders'])/1000)
    check('sample starts in January last year', (first.year,first.month)==(ly,1), first.date())
    # the pages the review listed
    pg.click('.navb[data-p=orders]'); W(pg); top=pg.inner_text('#olist tbody tr >> nth=0')
    check('Orders: newest row is from today or earlier', 'Dec' not in top or t.month==12, top[:60])
    pg.click('.navb[data-p=payments]'); W(pg); first_tx=pg.evaluate("document.querySelector('main section.card table tbody tr td:nth-child(3)')?.textContent||''")
    check('Payments: newest transaction is not from the future', 'Dec' not in pg.evaluate("[].slice.call(document.querySelectorAll('main section.card'))[0].innerText").split('Expenses')[0][-400:] or t.month==12)
    pg.click('.navb[data-p=orders]'); W(pg); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.select_option('#items select',index=1); pg.click('#of button[type=submit]'); W(pg,300)
    nid=pg.evaluate(D+".lastOrderId"); pg.click('.navb[data-p=orders]'); W(pg)
    check('a new order shows on the first page of Orders', f'#ORD-{nid}' in pg.inner_text('#olist'), nid)
    pg.click('.navb[data-p=payments]'); W(pg); pg.select_option('#ex-month','all'); W(pg)
    xid=pg.evaluate(D+".expenses.slice().sort((a,b)=>b.ts-a.ts)[0].id"); pg.click(f'[data-act=editExp][data-id="{xid}"]'); W(pg); pg.fill('#ex-amt','777'); pg.click('#exf button[type=submit]'); W(pg,300)
    check('the newest sample expense can be edited and saved', pg.evaluate(D+f".expenses.find(x=>x.id==={xid}).amount")==777)
    # Year view
    pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('[data-act=range][data-r=Year]'); W(pg)
    check(f'Year opens on {ly}, the latest full year, with a note', pg.input_value('#year-pick')==str(ly) and 'latest full year' in pg.inner_text('#salesov'))
    check(f'{ly}: all 12 months have income and expense bars, none "not yet"', pg.evaluate("[document.querySelectorAll('svg.chart rect.cbar').length,document.querySelectorAll('svg.chart rect.cbar2').length,document.querySelectorAll('svg.chart text.fut').length]")==[12,12,0])
    pg.click('[data-act=yearStep][data-d="1"]'); W(pg)
    box=pg.evaluate("Object.fromEntries([].map.call(document.querySelectorAll('.mbox'),b=>[b.querySelector('.muted').textContent,[b.querySelector('b').textContent,b.innerText]]))")
    check(f'› goes to {t.year} so far, compared with last year (↑/↓ shown)', pg.input_value('#year-pick')==str(t.year) and ('↑' in box['Income'][1] or '↓' in box['Income'][1]) and 'so far' in pg.inner_text('.msum-h'), box['Income'][1].replace('\n',' '))
    full=t.month-1
    avg_txt=box['Average per month'][1]
    check('average per month uses finished months only', f'over {full} full month' in avg_txt if full else 'so far' in avg_txt, avg_txt.replace('\n',' '))
    # Analytics label
    pg.click('.navb[data-p=analytics]'); W(pg)
    check('Analytics says Gross profit', 'Gross profit' in pg.inner_text('main'))
    # products with no cost
    pg.click('.navb[data-p=products]'); W(pg); pg.click('main [data-act=addProd] >> nth=0'); W(pg)
    check('product form explains why cost matters', 'expenses and profit are not accurate' in pg.inner_text('#pf'))
    pg.fill('#f-name','Free Gift'); pg.fill('#f-price','50'); pg.fill('#f-stock','20'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1)
    gv=pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('Free Gift')===0)[0].value"); pg.select_option('#items select',gv); pg.click('#of button[type=submit]'); W(pg,300)
    pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('[data-act=range][data-r=Month]'); W(pg)
    check('month summary warns about products with no cost price', 'no cost price (Free Gift)' in pg.inner_text('.msum'))
    # axis labels inside the chart
    ok=pg.evaluate("(()=>{const s=document.querySelector('svg.chart'),vb=s.viewBox.baseVal;return [].every.call(s.querySelectorAll('text'),t=>{const b=t.getBBox();return b.x>=-1&&b.x+b.width<=vb.width+1})})()")
    check('every chart label fits inside the chart (no cut-off "10 Oct")', ok)
    # two tabs keep their own month
    pg.select_option('#month-pick',f'{ly}-06'); W(pg)
    pg2=ctx.new_page(); pg2.goto(URL+'#dashboard'); W(pg2,600); pg2.click('.navb[data-p=products]'); W(pg2); pg2.click('main [data-act=addProd] >> nth=0'); W(pg2); pg2.fill('#f-name','Tab2 Item'); pg2.fill('#f-price','5'); pg2.click('#pf button[type=submit]'); W(pg2,400); W(pg,400)
    check('another tab saving does not reset your chosen month', pg.input_value('#month-pick')==f'{ly}-06')
    check('no page errors', not errs, errs[:2]); b.close()
print(f'\n{sum(R)}/{len(R)} passed')

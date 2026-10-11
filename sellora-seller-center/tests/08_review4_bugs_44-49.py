# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import sys
from playwright.sync_api import sync_playwright
URL=_pl.Path(sys.argv[1]).resolve().as_uri(); out=[]
def rep(n,bug,info=''): out.append(bug); print(('BUG   ' if bug else 'ok    ')+n+(' | '+str(info) if info else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
D="JSON.parse(localStorage.getItem('sellora-d-a@mail.com'))"
def prodval(pg,name): return pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('"+name+"')===0)[0].value")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('[data-act=sample]'); W(pg,300)
    # 44 browser Back with a filled form
    pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('.navb[data-p=orders]'); W(pg); pg.click('main [data-act=addOrder]'); W(pg)
    pg.select_option('#o-cust',index=1); pg.fill('#o-note','gift wrap please'); pg.go_back(); W(pg,300)
    rep('44 browser Back throws the filled form away without asking', pg.query_selector('#of') is None, pg.evaluate('location.hash'))
    if pg.query_selector('[data-act=discardYes]'): pg.click('[data-act=discardYes]'); W(pg)
    pg.click('.navb[data-p=orders]'); W(pg)
    # setup: a product with low-stock line, coupon TEN 10%
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Bag'); pg.fill('#f-price','300'); pg.fill('#f-stock','8'); pg.fill('#f-low','7'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=marketing]'); W(pg); pg.fill('#c-code','TEN'); pg.fill('#c-val','10'); pg.fill('#c-exp','2030-01-01'); pg.click('#cf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.select_option('#items select',prodval(pg,'Bag')); pg.fill('[data-f=qty]','2'); pg.select_option('#o-coupon','TEN'); W(pg); pg.click('#of button[type=submit]'); W(pg,300)
    oid=pg.evaluate(D+".orders.slice(-1)[0].id"); bell=lambda: pg.evaluate("+((document.querySelector('[data-act=bell] .dot')||{}).textContent||0)")
    n0=bell()
    # 45 editing only the note adds Low Stock alerts
    for t in ['note 1','note 2']:
        pg.click('[data-act=editOrder]'); W(pg); pg.fill('#o-note',t); pg.click('#of button[type=submit]'); W(pg,300)
    rep('45 editing just the note adds Low Stock alerts', bell()>n0, f'bell {n0} -> {bell()}')
    # 46 coupon change leaks into an old order
    d0=pg.evaluate(D+f".orders.find(o=>o.id==={oid}).disc")
    pg.click('.navb[data-p=marketing]'); W(pg); idx=pg.evaluate(D+".coupons.findIndex(c=>c.code==='TEN')"); pg.click(f'[data-act=editCoupon][data-id="{idx}"]'); W(pg); pg.fill('#ce-val','50'); pg.click('#cef button[type=submit]'); W(pg)
    pg.goto(URL+f'#orders/{oid}'); W(pg,300); pg.click('[data-act=editOrder]'); W(pg); pg.fill('#o-note','note 3'); pg.click('#of button[type=submit]'); W(pg,300)
    d1=pg.evaluate(D+f".orders.find(o=>o.id==={oid}).disc")
    rep('46 editing the note re-applies the coupon\'s new terms', d1!=d0, f'discount {d0} -> {d1}')
    # 47 + 48 more items on a paid order
    pg.click('[data-act=editOrder]'); W(pg); pg.fill('[data-f=qty]','6'); W(pg)
    ship=pg.input_value('#o-ship'); hint=pg.inner_text('#o-shiphint') if pg.query_selector('#o-shiphint') else ''
    rep('48 shipping not reviewed after edit (6 bags = ฿1,800, free over ฿1,200)', ship!='0' and not hint, f'ship field {ship}, hint {hint!r}')
    pg.click('#of button[type=submit]'); W(pg,300)
    asked=pg.query_selector('#paycheck') is not None
    o=pg.evaluate(D+f".orders.find(o=>o.id==={oid})")
    rep('47 total went up on a paid order, still Paid without asking', not asked and o['pay']=='Paid', f"pay {o['pay']}, asked={asked}")
    if asked: pg.keyboard.press('Escape'); W(pg); pg.keyboard.press('Escape'); W(pg)
    if pg.query_selector('[data-act=discardYes]'): pg.click('[data-act=discardYes]'); W(pg)
    # 49 toast on top of modal buttons (phone)
    pg.set_viewport_size({'width':375,'height':812}); W(pg,200)
    pg.click('[data-act=editOrder]'); W(pg); pg.fill('#o-note','n4'); pg.click('#of button[type=submit]'); W(pg,150); pg.click('[data-act=editOrder]'); W(pg,150)
    hit=pg.evaluate("""(()=>{const b=document.querySelector('#of .mf .btn.pri');if(!b)return 'no button';const r=b.getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el.closest('.toast')?'toast':'button'})()""")
    rep('49 on a phone the toast covers the form buttons', hit=='toast', hit)
    b.close()
print('\nstill present:',sum(out),'/',len(out),'| errors:',errs[:2] or 'none')

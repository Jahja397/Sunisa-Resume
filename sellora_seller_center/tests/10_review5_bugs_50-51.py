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
def pv(pg,name): return pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('"+name+"')===0)[0].value")
def stat(pg,label): return pg.evaluate("[].filter.call(document.querySelectorAll('main .card.stat'),c=>c.querySelector('.lb').textContent.trim().indexOf('"+label+"')===0)[0].querySelector('.v').textContent")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    # clean store: one product, one customer
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Bag'); pg.fill('#f-price','270'); pg.fill('#f-stock','50'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=customers]'); pg.click('main [data-act=addCust]'); W(pg); pg.fill('#cu-name','Mint'); pg.click('#cuf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',label='Mint'); pg.select_option('#items select',pv(pg,'Bag')); pg.fill('[data-f=qty]','2'); W(pg); pg.click('#of button[type=submit]'); W(pg,300)
    oid=pg.evaluate(D+".orders[0].id")  # 270*2+40 = 580, paid
    pg.click('[data-act=editOrder]'); W(pg); pg.fill('[data-f=qty]','6'); W(pg); pg.fill('#o-ship','40'); pg.click('#of button[type=submit]'); W(pg); pg.click('[data-act=payDiff][data-v=unpaid]'); W(pg,300)
    tot=pg.evaluate(D+".orders[0]"); 
    pg.click('.navb[data-p=payments]'); W(pg)
    rec,pend=stat(pg,'Received'),stat(pg,'Pending')
    rep('50 after "Not yet", money already received disappears', not (rec=='฿580' and pend=='฿1,080'), f'Received {rec}, Pending {pend}')
    # 51 deleted coupon disappears from an order on edit
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=sample]'); W(pg); pg.click('[data-act=confirmSample]'); W(pg,300)
    o=pg.evaluate(D+".orders.filter(o=>o.coupon==='SAVE100'&&(o.status==='Pending'||o.status==='Processing'))[0]")
    pg.click('.navb[data-p=marketing]'); W(pg); idx=pg.evaluate(D+".coupons.findIndex(c=>c.code==='SAVE100')"); pg.click(f'[data-act=delCoupon][data-id="{idx}"]'); W(pg); pg.click('[data-act=confirmDelCoupon]'); W(pg)
    pg.goto(URL+f"#orders/{o['id']}"); W(pg,300); pg.click('[data-act=editOrder]'); W(pg); pg.fill('#o-note','just a note'); pg.click('#of button[type=submit]'); W(pg,300)
    if pg.query_selector('[data-act=payDiff]'): pg.click('[data-act=payDiff][data-v=paid]'); W(pg,300)
    o2=pg.evaluate(D+f".orders.find(x=>x.id==={o['id']})")
    rep('51 editing an order whose coupon was deleted drops the coupon name', o2['coupon']!='SAVE100' or o2['disc']!=o['disc'], f"coupon {o['coupon']!r}->{o2['coupon']!r}, disc {o['disc']}->{o2['disc']}")
    b.close()
print('\nstill present:',sum(out),'/',len(out),'| errors:',errs[:2] or 'none')

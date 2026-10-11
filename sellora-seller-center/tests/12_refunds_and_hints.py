# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
D="JSON.parse(localStorage.getItem('sellora-d-a@mail.com'))"
def pv(pg,name): return pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('"+name+"')===0)[0].value")
def stat(pg,label): return pg.evaluate("[].filter.call(document.querySelectorAll('main .card.stat'),c=>c.querySelector('.lb').textContent.trim().indexOf('"+label+"')===0)[0].querySelector('.v').textContent")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Bag'); pg.fill('#f-price','300'); pg.fill('#f-stock','50'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=customers]'); pg.click('main [data-act=addCust]'); W(pg); pg.fill('#cu-name','Mint'); pg.click('#cuf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',label='Mint'); pg.select_option('#items select',pv(pg,'Bag')); pg.fill('[data-f=qty]','2'); W(pg); pg.click('#of button[type=submit]'); W(pg,300)
    oid=pg.evaluate(D+".orders[0].id")   # 600+40 = 640 paid
    pg.click('[data-act=editOrder]'); W(pg); pg.fill('[data-f=qty]','1'); W(pg); pg.fill('#o-ship','40'); pg.click('#of button[type=submit]'); W(pg,300)   # 340
    t=pg.inner_text('#toast'); o=pg.evaluate(D+f".orders.find(o=>o.id==={oid})")
    check('paid ฿640 -> ฿340: ฿300 recorded as a refund', o.get('refAmt')==300 and o['pay']=='Paid' and 'recorded as a refund' in t, t)
    check('order page shows Refunded ฿300', 'Refunded' in pg.inner_text('main section.card') and '฿300' in pg.inner_text('main section.card'))
    pg.click('.navb[data-p=payments]'); W(pg)
    check('Payments: Received ฿340 + Refunded ฿300 = the ฿640 that came in', stat(pg,'Received')=='฿340' and stat(pg,'Refunded')=='฿300', (stat(pg,'Received'),stat(pg,'Refunded')))
    pg.goto(URL+f'#orders/{oid}'); W(pg,300); pg.click('[data-act=cancelOrder]'); W(pg); pg.click('[data-act=confirmCancel]'); W(pg,300)
    pg.click('.navb[data-p=payments]'); W(pg)
    check('then cancelled: Refunded ฿640 in total, Received ฿0', stat(pg,'Refunded')=='฿640' and stat(pg,'Received')=='฿0', (stat(pg,'Received'),stat(pg,'Refunded')))
    pg.reload(); W(pg,300); pg.click('.navb[data-p=payments]'); W(pg); check('still right after reload', stat(pg,'Refunded')=='฿640')
    # hint wording with a deleted coupon
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=sample]'); W(pg); pg.click('[data-act=confirmSample]'); W(pg,300)
    so=pg.evaluate(D+".orders.filter(o=>o.coupon==='WELCOME10'&&(o.status==='Pending'||o.status==='Processing'))[0]")
    pg.click('.navb[data-p=marketing]'); W(pg); idx=pg.evaluate(D+".coupons.findIndex(c=>c.code==='WELCOME10')"); pg.click(f'[data-act=delCoupon][data-id="{idx}"]'); W(pg); pg.click('[data-act=confirmDelCoupon]'); W(pg)
    pg.goto(URL+f"#orders/{so['id']}"); W(pg,300); pg.click('[data-act=editOrder]'); W(pg)
    h1=pg.inner_text('#o-dischint'); pg.fill('[data-f=qty] >> nth=0','5'); W(pg); h2=pg.inner_text('#o-dischint')
    check('hint before changing items: keeps the discount it got', 'keeps the discount it got' in h1, h1)
    check('hint after changing items: uses the terms from when the order was placed', 'terms it had when this order was placed' in h2, h2)
    check('no page errors', not errs, errs[:2])
    b.close()
print(f'\n{sum(R)}/{len(R)} passed')

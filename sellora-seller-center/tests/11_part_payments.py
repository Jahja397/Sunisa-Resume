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
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Bag'); pg.fill('#f-price','270'); pg.fill('#f-stock','50'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=customers]'); pg.click('main [data-act=addCust]'); W(pg); pg.fill('#cu-name','Mint'); pg.click('#cuf button[type=submit]'); W(pg)
    def new_paid(qty):
        pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',label='Mint'); pg.select_option('#items select',pv(pg,'Bag')); pg.fill('[data-f=qty]',str(qty)); W(pg); pg.click('#of button[type=submit]'); W(pg,300)
        return pg.evaluate(D+".orders.slice(-1)[0].id")
    def edit_qty(qty,ship=None,answer=None):
        pg.click('[data-act=editOrder]'); W(pg); pg.fill('[data-f=qty]',str(qty)); W(pg)
        if ship is not None: pg.fill('#o-ship',str(ship))
        pg.click('#of button[type=submit]'); W(pg)
        if answer: pg.click(f'[data-act=payDiff][data-v={answer}]'); W(pg,300)
    oid=new_paid(2)                                   # 270*2+40 = 580 paid
    edit_qty(6,40,'unpaid')                           # 1660, 580 paid
    o=pg.evaluate(D+f".orders.find(o=>o.id==={oid})")
    check('"Not yet": 580 kept as paid', o['pay']=='Pending' and o['paidAmt']==580, (o['pay'],o['paidAmt']))
    page=pg.inner_text('main')
    check('order page shows Paid so far / Still to pay', 'Paid so far' in page and '฿580' in page and 'Still to pay' in page and '฿1,080' in page)
    check('badge says Part paid, button says Mark the rest as paid (฿1,080)', 'Part paid' in pg.inner_text('main .head') and 'Mark the rest as paid (฿1,080)' in pg.inner_text('main .head'))
    pg.click('.navb[data-p=payments]'); W(pg)
    check('Payments: Received ฿580, Pending ฿1,080', stat(pg,'Received')=='฿580' and stat(pg,'Pending')=='฿1,080', (stat(pg,'Received'),stat(pg,'Pending')))
    check('Transactions list shows Part paid', 'Part paid' in pg.inner_text('main table'))
    pg.reload(); W(pg,300); pg.click('.navb[data-p=payments]'); W(pg)
    check('still correct after reload', stat(pg,'Received')=='฿580' and stat(pg,'Pending')=='฿1,080')
    pg.click('.navb[data-p=orders]'); pg.select_option('#opay','Pending'); W(pg); check('Payment filter Pending includes part-paid orders', f'#ORD-{oid}' in pg.inner_text('#olist')); pg.select_option('#opay','All'); W(pg)
    # raise again: no question, more to pay
    pg.goto(URL+f'#orders/{oid}'); W(pg,300); edit_qty(8,40)
    check('part-paid order total up again: no question, still to pay grows', pg.query_selector('#paycheck') is None and pg.evaluate(D+f".orders.find(o=>o.id==={oid}).paidAmt")==580 and '฿1,620' in pg.inner_text('main'), pg.evaluate(D+f".orders.find(o=>o.id==={oid}).pay"))
    # pay the rest
    pg.click('[data-act=markPaid]'); W(pg,300); o=pg.evaluate(D+f".orders.find(o=>o.id==={oid})")
    check('Mark the rest as paid -> Paid, toast shows the amount', o['pay']=='Paid' and o.get('paidAmt',0)==0 and '฿1,620' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    pg.click('.navb[data-p=payments]'); W(pg); check('Payments: everything received, nothing pending', stat(pg,'Received')=='฿2,200' and stat(pg,'Pending')=='฿0', (stat(pg,'Received'),stat(pg,'Pending')))
    # part paid then total drops below what was paid -> settles as Paid + refund note
    oid2=new_paid(2); edit_qty(6,40,'unpaid'); edit_qty(1,40)
    o=pg.evaluate(D+f".orders.find(o=>o.id==={oid2})")
    check('part paid, total drops below paid: becomes Paid and tells you to refund the extra', o['pay']=='Paid' and 'refund' in pg.inner_text('#toast') and '฿270' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    # part paid then cancelled -> refund only what came in
    oid3=new_paid(2); edit_qty(6,40,'unpaid'); pg.click('[data-act=cancelOrder]'); W(pg); pg.click('[data-act=confirmCancel]'); W(pg,300)
    o=pg.evaluate(D+f".orders.find(o=>o.id==={oid3})")
    check('part paid then cancelled: Refunded ฿580 (not the full ฿1,660)', o['pay']=='Refunded' and '฿580 is marked refunded' in pg.inner_text('main'), pg.inner_text('main .head p'))
    pg.click('.navb[data-p=payments]'); W(pg); check('Payments Refunded = ฿580 (cancelled part payment) + ฿270 (overpaid order) = ฿850', stat(pg,'Refunded')=='฿850', stat(pg,'Refunded'))
    # "Yes, it is paid" stays fully paid
    oid4=new_paid(2); edit_qty(3,40,'paid'); o=pg.evaluate(D+f".orders.find(o=>o.id==={oid4})")
    check('"Yes, it is paid": fully paid, no part payment left over', o['pay']=='Paid' and o.get('paidAmt',0)==0)
    # ---- deleted coupon stays on its orders ----
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=sample]'); W(pg); pg.click('[data-act=confirmSample]'); W(pg,300)
    so=pg.evaluate(D+".orders.filter(o=>o.coupon==='SAVE100'&&o.status==='Processing')[0]")
    pg.click('.navb[data-p=marketing]'); W(pg); idx=pg.evaluate(D+".coupons.findIndex(c=>c.code==='SAVE100')"); pg.click(f'[data-act=delCoupon][data-id="{idx}"]'); W(pg); pg.click('[data-act=confirmDelCoupon]'); W(pg)
    pg.goto(URL+f"#orders/{so['id']}"); W(pg,300); pg.click('[data-act=editOrder]'); W(pg)
    check('edit form lists "SAVE100 (deleted coupon)" and keeps it selected', pg.evaluate("document.getElementById('o-coupon').selectedOptions[0].textContent")=='SAVE100 (deleted coupon)')
    check('discount locked with an explanation', pg.evaluate("document.getElementById('o-disc').readOnly") and 'was deleted' in pg.inner_text('#o-dischint') and pg.input_value('#o-disc')==str(int(so['disc'])))
    pg.fill('[data-f=qty] >> nth=0','3'); W(pg)
    check('more items: deleted coupon still applies its saved terms (฿100 off)', pg.input_value('#o-disc')=='100')
    pg.click('#of button[type=submit]'); W(pg)
    if pg.query_selector('[data-act=payDiff]'): pg.click('[data-act=payDiff][data-v=paid]'); W(pg,300)
    o=pg.evaluate(D+f".orders.find(o=>o.id==={so['id']})")
    check('saved: coupon name and discount kept', o['coupon']=='SAVE100' and o['disc']==100, (o['coupon'],o['disc']))
    pg.click('[data-act=editOrder]'); W(pg); pg.select_option('#o-coupon',''); W(pg)
    check('you can still remove the deleted coupon on purpose', not pg.evaluate("document.getElementById('o-disc').readOnly"))
    pg.keyboard.press('Escape'); W(pg); pg.click('[data-act=discardYes]'); W(pg)
    check('no page errors', not errs, errs[:2])
    b.close()
print(f'\n{sum(R)}/{len(R)} passed')

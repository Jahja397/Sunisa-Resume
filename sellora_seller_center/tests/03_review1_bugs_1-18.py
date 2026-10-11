# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import sys,json
from playwright.sync_api import sync_playwright
URL=_pl.Path(sys.argv[1]).resolve().as_uri(); out=[]
def rep(n,bug,info=''): out.append(bug); print(('BUG   ' if bug else 'fixed ')+n+(' | '+str(info) if info else ''))
def W(pg,ms=150): pg.wait_for_timeout(ms)
def signup(pg,em='a@mail.com'):
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email',em); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
D="JSON.parse(localStorage.getItem('sellora-d-a@mail.com'))"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    signup(pg)
    # product Pen price 99.50 stock 10
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg)
    pg.fill('#f-name','Pen'); pg.fill('#f-price','99.50'); pg.fill('#f-stock','10'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=customers]'); pg.click('main [data-act=addCust]'); W(pg); pg.fill('#cu-name','Mint'); pg.click('#cuf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=settings]'); pg.check('[data-pay="Cash on delivery"]'); W(pg)
    def neworder(qty='1',method=None,pay=None,coupon=None,disc=None):
        pg.click('.navb[data-p=orders]'); W(pg); pg.click('main [data-act=addOrder]'); W(pg)
        pg.select_option('#o-cust',label='Mint'); pid=pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('Pen')===0)[0].value")
        pg.select_option('#items select',pid); pg.fill('[data-f=qty]',qty)
        if method: pg.select_option('#o-method',method)
        if pay: pg.select_option('#o-pay',pay)
        if coupon: pg.select_option('#o-coupon',coupon)
        if disc is not None:
            ro=pg.evaluate("document.getElementById('o-disc').readOnly")
            if not ro: pg.fill('#o-disc',disc)
        W(pg,80); pg.click('#of button[type=submit]'); W(pg,300)
    # 4 decimals
    neworder('2')
    amt=pg.evaluate("[].map.call(document.querySelectorAll('main table tbody td'),t=>t.textContent)")
    rep('4 price 99.50 x 2 shows a sum that does not add up', '฿100' in amt and '฿199' in amt, amt)
    # 1 cancel unpaid COD -> payments pending
    neworder('1','Cash on delivery')
    pg.click('[data-act=cancelOrder]'); W(pg); pg.click('[data-act=confirmCancel]'); W(pg,250)
    pg.click('.navb[data-p=payments]'); W(pg)
    pend=pg.evaluate("[].filter.call(document.querySelectorAll('main .card.stat'),c=>c.textContent.indexOf('Pending')>=0)[0].querySelector('.v').textContent")
    rep('1 cancelled unpaid order still counted as Pending in Payments', pend!='฿0', pend)
    # 3 delete completed -> restock
    neworder('1')  # paid -> processing
    st0=pg.evaluate(D+".products[0].stock")
    pg.click('[data-act=setStatus]'); W(pg); pg.click('[data-act=setStatus]'); W(pg)
    pg.click('[data-act=delOrder]'); W(pg); pg.click('[data-act=confirmDelOrder]'); W(pg,250)
    st1=pg.evaluate(D+".products[0].stock")
    rep('3 deleting a delivered order puts stock back', st1>st0, f'{st0} -> {st1}')
    # 5 processing auto-paid
    neworder('1',None,'Pending'); pg.click('[data-act=setStatus]'); W(pg,250)
    asked=pg.query_selector('[data-act=procGo]') is not None
    if asked: pg.click('[data-act=procGo][data-paid="0"]'); W(pg,250)
    head=pg.inner_text('main .head p')
    rep('5 Mark as Processing silently marks a PromptPay order Paid', not asked or 'Paid' in head, ('asked first; ' if asked else '')+head)
    # 6 coupon + manual discount
    pg.click('.navb[data-p=marketing]'); W(pg); pg.fill('#c-code','TEN'); pg.fill('#c-val','10'); pg.fill('#c-exp','2030-01-01'); pg.click('#cf button[type=submit]'); W(pg)
    neworder('1',coupon='TEN',disc='50')
    disc=pg.evaluate(D+".orders.slice(-1)[0].disc")
    rep('6 coupon TEN (10%) but discount typed over it', disc>15, disc)
    # 7 all payment methods off
    pg.click('.navb[data-p=settings]'); W(pg)
    for k in ['PromptPay QR','Credit / Debit card','Cash on delivery']:
        el=pg.query_selector(f'[data-pay="{k}"]')
        if el.is_checked(): el.click(); W(pg,60)
    on=pg.evaluate("[].filter.call(document.querySelectorAll('[data-pay]'),c=>c.checked).length")
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg)
    n=pg.evaluate("document.querySelectorAll('#o-method option').length")
    rep('7 all methods switched off but the order form still offers them', on==0 and n==3, f'{on} on in settings, {n} in form')
    pg.keyboard.press('Escape')
    # 8 settings half save
    pg.evaluate("(()=>{const a=JSON.parse(localStorage.getItem('sellora-accounts'));a['taken@mail.com']={name:'X',hash:'x'};localStorage.setItem('sellora-accounts',JSON.stringify(a))})()")
    pg.click('.navb[data-p=settings]'); W(pg); pg.fill('#s-store','NEW NAME'); pg.fill('#s-aemail','taken@mail.com'); pg.fill('#s-cur','secret12') if pg.query_selector('#s-cur') else None; pg.click('#sf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=dashboard]'); W(pg)
    rep('8 rejected Settings still changed the store name', 'NEW NAME' in pg.inner_text('main'))
    # 11 drafts lost
    pg.click('.navb[data-p=marketing]'); W(pg); pg.fill('#c-code','HALF'); pg.click('[data-act=toggleCoupon]'); W(pg)
    rep('11 half-typed coupon code lost after pausing another coupon', pg.input_value('#c-code')=='', pg.input_value('#c-code'))
    # 12 back button
    pg.click('.navb[data-p=orders]'); W(pg); pg.click('.navb[data-p=customers]'); W(pg); pg.go_back(); W(pg,300)
    rep('12 browser Back does not return to the previous page', 'Orders' not in (pg.inner_text('main h1') if pg.query_selector('main h1') else ''), pg.url[-20:])
    # 13 view inventory
    pg.goto(URL); W(pg,300); pg.click('.navb[data-p=settings]'); pg.click('[data-act=sample]'); W(pg); pg.click('[data-act=confirmSample]'); W(pg,300)
    pg.click('[data-act=stockFilter]'); W(pg)
    rep('13 View Inventory hides the out-of-stock product', 'Denim Bag' not in pg.inner_text('#plist'))
    # 9 dashboard orders card
    pg.click('.navb[data-p=dashboard]'); W(pg)
    v=pg.evaluate("[].filter.call(document.querySelectorAll('main .card.stat'),c=>c.querySelector('.lb').textContent.trim()==='Orders')[0].querySelector('.v').textContent")
    rep('9 Dashboard Orders card includes cancelled orders', v=='128', v)
    # 17 sample data
    ph=pg.evaluate("JSON.parse(localStorage.getItem('sellora-d-a@mail.com')).customers.map(c=>c.phone)")
    pp=pg.evaluate("JSON.parse(localStorage.getItem('sellora-d-a@mail.com')).orders.filter(o=>o.status==='Pending'&&o.pay==='Paid').length")
    rep('17 sample: bad phone numbers / Pending-but-paid orders / coupon counts', any(len(x.replace('-',''))!=10 for x in ph) or pp>0, f'{[x for x in ph if len(x.replace("-",""))!=10]} | pending+paid={pp}')
    # 18 date without year
    yr=pg.evaluate("(()=>{const k='sellora-d-a@mail.com',s=JSON.parse(localStorage.getItem(k));s.orders[0].ts=new Date(2025,9,5).getTime();localStorage.setItem(k,JSON.stringify(s));return 1})()")
    pg.reload(); W(pg,300); pg.click('.navb[data-p=orders]'); W(pg); pg.fill('#oq','10001'); W(pg)
    rep('18 dates have no year', '2025' not in pg.inner_text('#olist'), pg.inner_text('#olist').split('\n')[-3:])
    # 2 two tabs
    pg2=ctx.new_page(); pg2.goto(URL); W(pg2,300)
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Product A'); pg.fill('#f-price','1'); pg.click('#pf button[type=submit]'); W(pg,300)
    pg2.click('.navb[data-p=products]'); W(pg2); pg2.click('main [data-act=addProd]'); W(pg2); pg2.fill('#f-name','Product B'); pg2.fill('#f-price','1'); pg2.click('#pf button[type=submit]'); W(pg2,300)
    names=pg.evaluate(D+".products.map(p=>p.name)")
    rep('2 two tabs: one tab wipes the other tab\'s new product', not ('Product A' in names and 'Product B' in names), [n for n in names if n.startswith('Product')])
    pg2.close()
    # 16 XSS via restore
    pg.goto(URL); W(pg,300)
    bk={'app':'sellora','v':1,'data':{'products':[],'customers':[],'orders':[{'id':'<img src=x onerror="window.__xss=1">','items':[],'status':'Pending','pay':'Pending','ts':0}],'coupons':[{'code':'X','type':'Fixed','val':'<img src=x onerror="window.__xss=2">','min':0,'exp':'2030-01-01','used':0,'on':True}],'funnel':{'7D':{'views':'"><img src=x onerror="window.__xss=3">','carts':0,'checkouts':0}},'settings':{'pay':{'<img src=x onerror="window.__xss=4">':True}}}}
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=restore]'); W(pg); pg.fill('#rs-text',json.dumps(bk)); pg.click('#rsf button[type=submit]'); W(pg,300)
    for x in ['orders','payments','marketing','analytics','settings']: pg.click(f'.navb[data-p={x}]'); W(pg,150)
    rep('16 crafted backup runs script (XSS)', pg.evaluate("!!window.__xss"), pg.evaluate("window.__xss"))
    b.close()
print('\nconfirmed bugs:',sum(out),'/',len(out),'| page errors:',errs[:2] or 'none')

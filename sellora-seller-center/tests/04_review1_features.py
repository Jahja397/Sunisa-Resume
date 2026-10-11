# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import json
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
D="JSON.parse(localStorage.getItem('sellora-d-a@mail.com'))"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900},accept_downloads=True); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('[data-act=sample]'); W(pg,300)
    d=pg.evaluate(D)
    used={c['code']:c['used'] for c in d['coupons']}; real={c:sum(1 for o in d['orders'] if o['coupon']==c and o['status']!='Cancelled') for c in used}
    check('sample: coupon "used" counts match the orders', used==real and sum(used.values())>0, used)
    # back / forward through details
    pg.click('.navb[data-p=orders]'); W(pg); pg.click('#olist [data-act=openOrder] >> nth=0'); W(pg,250)
    oid=pg.inner_text('main h1'); pg.go_back(); W(pg,300)
    check('Back from an order returns to the order list', pg.inner_text('main h1')=='Orders', pg.url.split('#')[-1])
    pg.go_forward(); W(pg,300); check('Forward re-opens the same order', pg.inner_text('main h1')==oid, oid)
    pg.click('.navb[data-p=customers]'); W(pg); pg.click('#clist tr.click >> nth=0'); W(pg,250); pg.go_back(); W(pg,250); pg.go_back(); W(pg,250)
    check('Back twice: customer profile -> customers -> order', pg.inner_text('main h1')==oid)
    # needs restock filter
    pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('[data-act=stockFilter]'); W(pg)
    t=pg.inner_text('#plist'); check('View Inventory lists low AND out-of-stock items', 'Denim Bag' in t and 'Basic Cap' in t and 'Phone Strap' not in t)
    # timeline + "yes, paid"
    pend=pg.evaluate(D+".orders.filter(o=>o.status==='Pending'&&o.method!=='Cash on delivery')[0].id")
    pg.goto(URL+'#orders/'+str(pend)); W(pg,300)
    tl=pg.evaluate("[].map.call(document.querySelectorAll('.tl li'),l=>l.className+':'+l.textContent)")
    check('deep link #orders/ID opens that order', ('ORD-'+str(pend)) in pg.inner_text('main h1'))
    check('timeline: unpaid order shows Payment Confirmed as next step', tl[1].startswith('now'), tl[:2])
    pg.click('[data-act=setStatus]'); W(pg); pg.click('[data-act=procGo][data-paid="1"]'); W(pg,250)
    tl=pg.evaluate("[].map.call(document.querySelectorAll('.tl li'),l=>l.className).join(',')")
    check('"Yes, payment received" -> Paid + Processing, timeline filled', 'Paid' in pg.inner_text('main .head p') and 'Processing' in pg.inner_text('main .head p') and tl=='done,done,done,now,', tl)
    # delete a shipped order: stock same, sold down
    sh=pg.evaluate(D+".orders.filter(o=>o.status==='Shipped')[0]"); pid=sh['items'][0]['pid']
    before=pg.evaluate(D+f".products.find(p=>p.id==={pid})")
    pg.goto(URL+'#orders/'+str(sh['id'])); W(pg,300); pg.click('[data-act=delOrder]'); W(pg)
    msg=pg.inner_text('.modal .mb'); pg.click('[data-act=confirmDelOrder]'); W(pg,250)
    after=pg.evaluate(D+f".products.find(p=>p.id==={pid})")
    check('delete shipped order: message explains stock stays, stock unchanged, sold reduced', 'already left' in msg and after['stock']==before['stock'] and after['sold']==before['sold']-sh['items'][0]['qty'], f"stock {before['stock']}->{after['stock']}, sold {before['sold']}->{after['sold']}")
    # COD cancel -> payment Cancelled, filterable
    pg.click('.navb[data-p=settings]'); pg.check('[data-pay="Cash on delivery"]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.select_option('#items select',index=1)
    pg.select_option('#o-method','Cash on delivery'); pg.click('#of button[type=submit]'); W(pg,300); pg.click('[data-act=cancelOrder]'); W(pg); pg.click('[data-act=confirmCancel]'); W(pg,250)
    check('cancelled unpaid order: payment shows Cancelled, "no payment was collected"', 'Cancelled' in pg.inner_text('main .head p') and 'No payment was collected' in pg.inner_text('main'))
    pg.click('.navb[data-p=orders]'); pg.select_option('#opay','Cancelled'); W(pg)
    check('orders filter Payment = Cancelled works', '#ORD-' in pg.inner_text('#olist'))
    pg.select_option('#opay','All'); W(pg)
    # decimals + percentage coupon
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','Pen'); pg.fill('#f-price','99.5'); pg.fill('#f-stock','10'); pg.click('#pf button[type=submit]'); W(pg)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1)
    pp=pg.evaluate("[].slice.call(document.querySelectorAll('#items select option')).filter(o=>o.textContent.indexOf('Pen')===0)[0].value"); pg.select_option('#items select',pp); pg.fill('[data-f=qty]','2')
    pg.select_option('#o-coupon','WELCOME10'); W(pg)
    check('decimals: 99.50 x 2, 10% coupon, shipping 40 -> exact totals', pg.inner_text('#t-sub')=='฿199' and pg.inner_text('#t-disc')=='-฿19.90' and pg.inner_text('#t-total')=='฿219.10', [pg.inner_text(x) for x in ['#t-sub','#t-ship','#t-disc','#t-total']])
    check('coupon locks the discount box', pg.evaluate("document.getElementById('o-disc').readOnly") and 'Set by coupon' in pg.inner_text('#o-dischint'))
    pg.select_option('#o-coupon',''); W(pg); check('removing the coupon unlocks it and resets to 0', not pg.evaluate("document.getElementById('o-disc').readOnly") and pg.input_value('#o-disc')=='0')
    pg.keyboard.press('Escape'); W(pg)
    check('Esc on a filled order form asks before discarding', pg.query_selector('[data-act=discardYes]') is not None and pg.query_selector('#of') is not None)
    pg.click('[data-act=discardYes]'); W(pg)
    # drafts kept, but cleared after a successful create
    pg.click('.navb[data-p=marketing]'); W(pg); pg.fill('#c-code','KEEP1'); pg.fill('#c-val','5')
    pg.click('[data-act=theme]'); W(pg); kept=pg.input_value('#c-code'); pg.click('[data-act=theme]'); W(pg)
    pg.fill('#c-exp','2030-01-01'); pg.click('#cf button[type=submit]'); W(pg)
    check('draft survives dark-mode toggle; form clears after creating', kept=='KEEP1' and pg.input_value('#c-code')=='' and 'KEEP1' in pg.inner_text('main'), kept)
    # settings: wrong current password blocks everything
    pg.click('.navb[data-p=settings]'); W(pg); pg.fill('#s-store','SHOULD NOT SAVE'); pg.fill('#s-pass','newpass99'); pg.fill('#s-cur','wrong'); pg.click('#sf button[type=submit]'); W(pg,300)
    check('wrong current password: nothing saved', 'not right' in pg.inner_text('#toast') and pg.evaluate(D+".settings.store")!='SHOULD NOT SAVE')
    pg.fill('#s-cur','secret12'); pg.click('#sf button[type=submit]'); W(pg,300)
    pg.click('[data-act=prof]'); pg.click('[data-act=logout]'); W(pg,250); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','newpass99'); pg.click('#lf button[type=submit]'); W(pg,300)
    check('correct current password: new password works', pg.query_selector('main h1') is not None and pg.evaluate(D+".settings.store")=='SHOULD NOT SAVE')
    # two tabs: draft in B kept while A saves; logout in A logs B out
    pg2=ctx.new_page(); pg2.goto(URL+'#marketing'); W(pg2,300); pg2.fill('#c-code','TABB')
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','From Tab A'); pg.fill('#f-price','5'); pg.click('#pf button[type=submit]'); W(pg,300)
    check('tab B keeps what it is typing while tab A saves', pg2.input_value('#c-code')=='TABB')
    pg2.click('main h1'); W(pg2,200); pg2.goto(URL+'#products'); W(pg2,300)
    check('tab B sees tab A\'s new product', 'From Tab A' in pg2.inner_text('#plist'))
    pg.click('[data-act=prof]'); pg.click('[data-act=logout]'); W(pg,400)
    check('logging out in tab A logs tab B out too', pg2.query_selector('#lf') is not None)
    pg2.close()
    # restore: genuine backup round-trip keeps everything
    pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','newpass99'); pg.click('#lf button[type=submit]'); W(pg,300)
    before=pg.evaluate(D)
    pg.click('.navb[data-p=settings]'); W(pg)
    with pg.expect_download() as dl: pg.click('[data-act=backup]')
    dl.value.save_as('bk3.json'); pg.keyboard.press('Escape'); W(pg)
    pg.click('[data-act=wipe]'); W(pg); pg.click('[data-act=confirmWipe]'); W(pg,250)
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=restore]'); W(pg); pg.set_input_files('#rs-file','bk3.json'); W(pg,300); pg.click('#rsf button[type=submit]'); W(pg,400)
    after=pg.evaluate(D)
    same=all(json.dumps(before[k],sort_keys=True)==json.dumps(after[k],sort_keys=True) for k in ['products','customers','orders','coupons','campaigns','reviews'])
    check('restore of a genuine backup is lossless', same, {k:(len(before[k]),len(after[k])) for k in ['products','orders','customers']})
    # nasty backup: script injection in every field type
    X='<img src=x onerror="window.__xss=1">'
    bad={'app':'sellora','data':{'products':[{'id':X,'name':X,'cat':X,'sku':X,'price':X,'stock':X,'sold':X,'low':X,'img':'javascript:alert(1)'}],
      'customers':[{'id':X,'name':X,'email':X,'phone':X,'addr':X,'ts':X}],
      'orders':[{'id':X,'cust':X,'cname':X,'items':[{'pid':X,'name':X,'price':X,'qty':X}],'status':X,'pay':X,'method':X,'courier':X,'track':X,'coupon':X,'ship':X,'disc':X,'ts':X},{'id':10001,'items':[]},{'id':10001,'items':[]}],
      'coupons':[{'code':X,'type':X,'val':X,'min':X,'exp':X,'used':X}],'campaigns':[{'name':X,'type':X,'detail':X,'start':X,'end':X}],
      'reviews':[{'id':X,'name':X,'stars':X,'prod':X,'text':X,'reply':X,'ts':X}],'notifs':[{'t':X,'m':X,'ts':X,'u':1}],
      'funnel':{'7D':{'views':X,'carts':X,'checkouts':X}},'settings':{'store':X,'pay':{X:True},'notif':{X:True},'shipFee':X},'range':X,'aRange':X,'page':X,'pf':{'st':X,'q':X},'of':{'pay':X,'page':X},'nid':X}}
    pg.click('.navb[data-p=settings]'); pg.click('[data-act=restore]'); W(pg); pg.fill('#rs-text',json.dumps(bad)); pg.click('#rsf button[type=submit]'); W(pg,300)
    for x in ['dashboard','products','orders','customers','shipping','payments','marketing','reviews','analytics','settings']:
        pg.click(f'.navb[data-p={x}]'); W(pg,120)
    pg.click('[data-act=bell]'); W(pg); pg.click('[data-act=bell]'); W(pg)
    pg.click('.navb[data-p=orders]'); W(pg); pg.click('#olist [data-act=openOrder] >> nth=0'); W(pg,200)
    pg.click('.navb[data-p=customers]'); W(pg); pg.click('#clist tr.click >> nth=0'); W(pg,200)
    pg.click('.navb[data-p=products]'); W(pg); pg.click('[data-act=editProd] >> nth=0'); W(pg); pg.keyboard.press('Escape')
    pg.fill('#gs','ORD'); W(pg)
    ids=pg.evaluate(D+".orders.map(o=>o.id)")
    check('crafted backup: no script runs anywhere (all pages, details, menus, search)', not pg.evaluate("!!window.__xss"))
    check('crafted backup: broken/duplicate order IDs repaired to unique numbers', len(set(ids))==len(ids) and all(isinstance(i,int) for i in ids), ids)
    check('no page errors in this whole run', not errs, errs[:2])
    b.close()
print(f'\n{sum(R)}/{len(R)} passed')

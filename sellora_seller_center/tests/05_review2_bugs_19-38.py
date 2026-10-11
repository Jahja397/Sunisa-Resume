# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import sys
from playwright.sync_api import sync_playwright
URL=_pl.Path(sys.argv[1]).resolve().as_uri(); out=[]
def rep(n,bug,info=''): out.append(bug); print(('BUG   ' if bug else 'fixed ')+n+(' | '+str(info) if info else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
D="JSON.parse(localStorage.getItem('sellora-d-a@mail.com'))"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('[data-act=sample]'); W(pg,300)
    LAST=pg.evaluate(D+'.lastOrderId')
    # 19 order id reuse
    pg.goto(URL+f'#orders/{LAST}'); W(pg,300); pg.click('[data-act=delOrder]'); W(pg); pg.click('[data-act=confirmDelOrder]'); W(pg,250)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.select_option('#items select',index=1); pg.click('#of button[type=submit]'); W(pg,300)
    rep('19 a deleted order number is given to a new order', f'ORD-{LAST}' in pg.inner_text('main h1'), pg.inner_text('main h1'))
    # 22 filters stick + All Orders card
    pg.click('.navb[data-p=orders]'); W(pg); pg.fill('#oq','10127'); W(pg); pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('.navb[data-p=orders]'); W(pg)
    n1=pg.evaluate("document.querySelectorAll('#olist tbody tr').length")
    pg.reload(); W(pg,300); pg.click('.navb[data-p=orders]'); W(pg); n2=pg.evaluate("document.querySelectorAll('#olist tbody tr').length")
    rep('22a search filter sticks after leaving the page / reloading', n1<=1 or n2<=1, f'rows after nav={n1}, after reload={n2}')
    pg.fill('#oq',''); W(pg); pg.select_option('#opay','Refunded'); W(pg); pg.click('main button.card.stat[data-s=All]'); W(pg)
    rows=pg.evaluate("document.querySelectorAll('#olist tbody tr').length")
    rep('22b All Orders card leaves the Payment filter on', rows<10, f'{rows} rows shown')
    pg.select_option('#opay','All'); W(pg)
    # 21 Esc discards a filled New Order form
    pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.fill('#o-note','gift wrap please'); pg.keyboard.press('Escape'); W(pg)
    rep('21 Esc throws away a filled form without asking', pg.query_selector('#of') is None)
    if pg.query_selector('#of') is None: pg.click('main [data-act=addOrder]'); W(pg)
    if pg.query_selector('[data-act=discardNo]'): pg.click('[data-act=discardNo]'); W(pg)
    # 23 focus trap
    pg.focus('#o-cust'); outside=False
    for _ in range(40):
        pg.keyboard.press('Tab'); 
        if not pg.evaluate("!!document.activeElement.closest('#modal')"): outside=True; break
    rep('23 Tab moves focus behind the open form', outside)
    pg.keyboard.press('Escape'); W(pg)
    if pg.query_selector('[data-act=discardYes]'): pg.click('[data-act=discardYes]'); W(pg)
    # 25 free shipping over 0
    pg.click('.navb[data-p=settings]'); W(pg); pg.fill('#s-free','0'); pg.click('#sf button[type=submit]'); W(pg,300)
    pg.click('.navb[data-p=orders]'); pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#items select',index=2); W(pg)
    rep('25 "Free shipping over 0" makes every order ship free', pg.input_value('#o-ship')=='0', pg.input_value('#o-ship'))
    pg.keyboard.press('Escape'); W(pg)
    if pg.query_selector('[data-act=discardYes]'): pg.click('[data-act=discardYes]'); W(pg)
    # 27 shipping timeline
    pg.click('.navb[data-p=shipping]'); W(pg); pg.click('main button.card.stat[data-t="In Transit"]'); W(pg); pg.click('main tr.click >> nth=0'); W(pg)
    tl=pg.evaluate("[].map.call(document.querySelectorAll('.modal .tl li'),l=>l.className+':'+l.textContent)")
    rep('27 just handed to courier but timeline says In Transit is done', any(x=='done:In Transit' for x in tl), tl)
    pg.keyboard.press('Escape'); W(pg)
    # 29 sample order times out of order
    d=pg.evaluate(D); o=sorted([x for x in d['orders'] if x['id']<=LAST],key=lambda x:x['id'])
    swaps=sum(1 for a,b2 in zip(o,o[1:]) if b2['ts']<a['ts'])
    first={}
    for x in d['orders']:
        if x['cust']: first[x['cust']]=min(first.get(x['cust'],9e15),x['ts'])
    late=sum(1 for c in d['customers'] if c['id'] in first and c['ts']>first[c['id']])
    rep('29 sample: order times out of order / customers join after ordering', swaps>0 or late>0, f'{swaps} out-of-order pairs, {late} customers joined after first order')
    # 30 deleted product vanishes from best sellers but stays in sales
    pg.click('.navb[data-p=dashboard]'); W(pg); top=pg.evaluate("[].map.call([].filter.call(document.querySelectorAll('main section'),s=>s.querySelector('h2')&&s.querySelector('h2').textContent==='Best Selling Products')[0].querySelectorAll('tbody tr td:nth-child(2)'),t=>t.textContent.trim())")[0]
    pid=pg.evaluate(D+".products.find(p=>p.name==='"+top+"').id")
    pg.click('.navb[data-p=products]'); W(pg); pg.click(f'[data-act=delProd][data-id="{pid}"]'); W(pg); pg.click('[data-act=confirmDelProd]'); W(pg)
    pg.click('.navb[data-p=dashboard]'); W(pg)
    rep('30 deleted best-seller disappears from Best Selling', top not in pg.evaluate("[].filter.call(document.querySelectorAll('main section'),s=>s.querySelector('h2')&&s.querySelector('h2').textContent==='Best Selling Products')[0].innerText"), top)
    # 33 zero-order customer labelled New
    pg.click('.navb[data-p=customers]'); pg.click('main [data-act=addCust]'); W(pg); pg.fill('#cu-name','Zero'); pg.click('#cuf button[type=submit]'); W(pg)
    pg.fill('#cq','Zero'); W(pg); rep('33 customer with no orders labelled "New"', 'New' in pg.inner_text('#clist'), pg.inner_text('#clist').split('\n')[-1])
    # 32 mark all read shown when nothing unread
    pg.click('[data-act=bell]'); W(pg); pg.click('[data-act=readAll]'); W(pg)
    rep('32 "Mark all read" still shown after everything is read', pg.query_selector('[data-act=readAll]') is not None)
    pg.keyboard.press('Escape')
    # 20 long name overflow on mobile
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg); pg.fill('#f-name','A'*80); pg.fill('#f-price','10'); pg.fill('#f-stock','3'); pg.click('#pf button[type=submit]'); W(pg)
    pg.set_viewport_size({'width':375,'height':812}); pg.click('[data-act=openNav]'); W(pg,300); pg.click('.navb[data-p=dashboard]'); W(pg,300)
    sw=pg.evaluate("document.documentElement.scrollWidth")
    rep('20 an 80-character product name makes the phone page scroll sideways', sw>375, f'page width {sw}px')
    # 37 tablet badge
    pg.set_viewport_size({'width':1000,'height':800}); W(pg,200)
    vis=pg.evaluate("(()=>{const c=document.querySelector('.navb[data-p=orders] .cnt');return !!c&&getComputedStyle(c).display!=='none'})()")
    rep('37 tablet: orders badge hidden', not vis)
    b.close()
print('\nconfirmed:',sum(out),'/',len(out),'| errors:',errs[:2] or 'none')

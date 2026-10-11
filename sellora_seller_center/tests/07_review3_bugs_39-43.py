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
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); W(pg,250); pg.fill('#l-name','S'); pg.fill('#l-email','a@mail.com'); pg.fill('#l-pass','secret12'); pg.click('#lf button[type=submit]'); W(pg,300)
    pg.click('[data-act=sample]'); W(pg,300)
    # 39 settings shows typed values instead of saved ones
    pg.click('.navb[data-p=settings]'); W(pg); pg.fill('#s-store',''); pg.click('#sf button[type=submit]'); W(pg,300)
    t1=pg.inner_text('#toast'); pg.fill('#s-store','Lotus'); pg.fill('#s-fee','-5'); pg.click('#sf button[type=submit]'); W(pg,300); t2=pg.inner_text('#toast')
    rep('39a empty store name / negative fee are saved silently instead of refused', not('store name' in t1 and '0 or more' in t2) or pg.evaluate(D+".settings.store")!='My Store', [t1,t2])
    pg.fill('#s-fee','35.555'); pg.fill('#s-free','40.555'); pg.fill('#s-store','  Lotus Shop  '); pg.click('#sf button[type=submit]'); W(pg,300)
    shown=[pg.input_value(x) for x in ['#s-store','#s-fee','#s-free']]; sv=pg.evaluate(D+".settings"); saved=[sv['store'],sv['shipFee'],sv['freeOver']]
    rep('39b after Save the fields show what was really saved', shown!=[str(x) for x in saved], f'shown {shown} / saved {saved}')
    # 40 reply text jumps to another review
    pg.click('.navb[data-p=reviews]'); W(pg)
    sel=lambda: pg.query_selector('[id^=rtext]')
    pg.click('[data-act=reply] >> nth=0'); W(pg); sel().fill('ขอบคุณ Mint มากค่ะ'); pg.click('[data-act=reply] >> nth=0'); W(pg)
    who=pg.evaluate("(()=>{const f=document.querySelector('form[data-rid]');return f?f.closest('.li').querySelector('b').textContent:''})()")
    pg.click('[data-act=reply] >> nth=0'); W(pg); back=sel().input_value() if sel() else None
    rep('40b going back to Mint brings her unsent reply back', back!='ขอบคุณ Mint มากค่ะ', back)
    pg.click('[data-act=cancelReply]'); W(pg)
    rep('40 typed reply moves to the next review you click', sel() is not None and sel().input_value()=='ขอบคุณ Mint มากค่ะ' and who!='Mint', f'reply box now under {who!r} with {sel().input_value() if sel() else None!r}')
    # 41 long text cut after reload
    long_name='ก'*155; long_desc='ข'*2500
    pg.click('.navb[data-p=products]'); pg.click('main [data-act=addProd]'); W(pg)
    pg.fill('#f-name',long_name); pg.fill('#f-desc',long_desc); pg.fill('#f-price','1')
    typed=[len(pg.input_value('#f-name')),len(pg.input_value('#f-desc'))]; pg.click('#pf button[type=submit]'); W(pg,300)
    pg.reload(); W(pg,300); pg.click('.navb[data-p=settings]'); W(pg); pg.click('[data-nt=order]'); W(pg,200)
    kept=pg.evaluate(D+".products.slice(-1)[0]"); kept=[len(kept['name']),len(kept['desc'])]
    rep('41 text that could be typed is silently cut after reload', typed!=kept, f'typed {typed} -> after reload {kept}')
    # 42 payment prompt has no way out
    pid=pg.evaluate(D+".orders.filter(o=>o.status==='Pending'&&o.method!=='Cash on delivery')[0].id")
    pg.goto(URL+'#orders/'+str(pid)); W(pg,300); pg.click('[data-act=setStatus]'); W(pg)
    btns=pg.evaluate("[].map.call(document.querySelectorAll('#modal button'),b=>b.getAttribute('aria-label')||b.textContent.trim())")
    rep('42 "Has this order been paid?" has no Cancel / X', not any(x in ('Close','Cancel') for x in btns), btns)
    pg.keyboard.press('Escape'); W(pg)
    # 43 URL after deleting an order
    pg.goto(URL+'#orders/10128'); W(pg,300); pg.click('[data-act=delOrder]'); W(pg); pg.click('[data-act=confirmDelOrder]'); W(pg,250)
    h=pg.evaluate('location.hash')
    pg.click('main [data-act=addOrder]'); W(pg); pg.select_option('#o-cust',index=1); pg.select_option('#items select',index=1); pg.click('#of button[type=submit]'); W(pg,300)
    rep('43 URL still points at the deleted order', h=='#orders/10128', h)
    pg.goto(URL+'#orders/10128'); W(pg,300)
    rep('43b old link to the deleted order opens a different order', 'ORD-10128' not in pg.inner_text('main h1') and 'Order #' in pg.inner_text('main h1'), pg.inner_text('main h1'))
    b.close()
print('\nstill present:',sum(out),'/',len(out),'| errors:',errs[:2] or 'none')

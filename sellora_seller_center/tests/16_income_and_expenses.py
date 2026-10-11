# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import datetime,calendar
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
W=lambda pg,ms=150: pg.wait_for_timeout(ms)
t=datetime.date.today(); cur=f'{t.year}-{t.month:02d}'
def ym_add(ym,k):
    y,m=map(int,ym.split('-')); m+=k; y+=(m-1)//12; m=(m-1)%12+1; return f'{y}-{m:02d}'
def rng(ym):
    y,m=map(int,ym.split('-')); return datetime.datetime(y,m,1).timestamp()*1000, datetime.datetime(y+(m==12),m%12+1,1).timestamp()*1000
def money(d,ym):
    s,e=rng(ym); live=[o for o in d['orders'] if o['status']!='Cancelled' and s<=o['ts']<e]
    inc=sum(max(0,sum(i['price']*i['qty'] for i in o['items'])+o['ship']-o['disc']) for o in live)
    cogs=sum(i['cost']*i['qty'] for o in live for i in o['items']); oth=sum(x['amount'] for x in d['expenses'] if s<=x['ts']<e)
    return inc,cogs+oth,inc-cogs-oth,cogs,oth
B=lambda v: f'฿{v:,.0f}' if float(v).is_integer() else f'฿{v:,.2f}'
D="JSON.parse(localStorage.getItem('sellora-d-demo@sellora.app'))"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    # an old demo shop (made before this update) refreshes itself
    pg.goto(URL); W(pg,300); pg.click('[data-act=demo]'); W(pg,600)
    pg.click('[data-act=prof]'); pg.click('[data-act=logout]'); W(pg,300)
    pg.evaluate("(()=>{const k='sellora-d-demo@sellora.app',s=JSON.parse(localStorage.getItem(k));delete s.sampleVer;s.expenses=[];s.orders=s.orders.slice(-128);localStorage.setItem(k,JSON.stringify(s))})()")
    pg.click('[data-act=demo]'); pg.wait_for_selector('#monthly'); W(pg,300)
    d=pg.evaluate(D)
    check('old demo shop is replaced with the full-year data automatically', d.get('sampleVer')==6 and len(d['expenses'])>100 and len(d['orders'])>1000 and 'every month since January' in pg.inner_text('#toast'))
    check('the 12 Months button is gone', pg.query_selector('[data-act=range][data-r="12 Months"]') is None and pg.evaluate("[].map.call(document.querySelectorAll('#salesov .seg button'),b=>b.textContent).join(',')")=='Today,7 Days,30 Days,Month,Year')
    months=[ym_add(cur,-k) for k in range(t.month+11,0,-1)]
    every=all(money(d,m)[0]>0 and money(d,m)[1]>0 for m in months)
    inc=[money(d,m)[0] for m in months]; ex=[money(d,m)[1] for m in months]
    turns=lambda v: sum(1 for i in range(1,len(v)-1) if (v[i]-v[i-1])*(v[i+1]-v[i])<0)
    check('sample: income and expenses in every month since 1 January last year', every and months[0]==f'{t.year-1}-01', months[0])
    check('sample: income goes up and down month to month', turns(inc)>=len(inc)-3, f'{turns(inc)} turns in {len(inc)} months')
    check('sample: expenses go up and down too', turns(ex)>=len(ex)-5, f'{turns(ex)} turns')
    # This Year bars
    pg.click('[data-act=range][data-r=Year]'); W(pg)
    nb=pg.evaluate("[document.querySelectorAll('svg.chart rect.cbar').length,document.querySelectorAll('svg.chart rect.cbar2').length]")
    check('Year (latest full year): an income and an expenses bar for all 12 months', nb==[12,12], nb)
    check('Year (latest full year): no month says not yet', pg.evaluate("document.querySelectorAll('svg.chart text.fut').length")==0)
    tips=pg.evaluate("[].map.call(document.querySelectorAll('svg.chart rect.cbar'),r=>[r.dataset.m,r.getAttribute('aria-label')])")
    check('bar amounts = income and expenses from the raw data', all(B(money(d,m)[0]) in tip and B(round(money(d,m)[1],2)).split('.')[0] in tip for m,tip in tips), tips[0])
    check('legend shows Income and Expenses', 'Income' in pg.inner_text('.legend') and 'Expenses' in pg.inner_text('.legend'))
    # Month view
    pm=ym_add(cur,-1); pg.select_option('#year-pick',pm[:4]); W(pg); pg.click(f'svg.chart rect.cbar[data-m="{pm}"]'); W(pg,400)
    box=pg.evaluate("Object.fromEntries([].map.call(document.querySelectorAll('.mbox'),b=>[b.querySelector('.muted').textContent,b.querySelector('b').textContent]))")
    i,e,n,cg,oth=money(d,pm)
    check('month details: Income / Expenses / Net profit match the raw data', box['Income']==B(i) and box['Expenses']==B(round(e,2)) and box['Net profit']==B(round(n,2)), (box['Income'],box['Expenses'],box['Net profit']))
    chips=pg.evaluate("[].map.call(document.querySelectorAll('.msum .chip b'),b=>+b.textContent.replace(/[฿,]/g,''))")
    check('"Where the money went" adds up to the expenses', abs(sum(chips)-e)<1, (sum(chips),e))
    check('day-by-day chart has a dashed expenses line', pg.query_selector('svg.chart path.ln2') is not None and pg.evaluate("document.querySelectorAll('svg.chart circle').length")==calendar.monthrange(*map(int,pm.split('-')))[1])
    rows=pg.evaluate("[].map.call(document.querySelectorAll('#monthly tbody tr[data-m]'),r=>[r.dataset.m,r.children[2].innerText.trim(),r.children[3].innerText.trim(),r.children[4].innerText.trim()])")
    check('Income & Expenses by Month table matches the raw data', all(r[1]==B(money(d,r[0])[0]) and r[2]==B(round(money(d,r[0])[1],2)) and r[3]==B(round(money(d,r[0])[2],2)) for r in rows), rows[1])
    # record an expense
    pg.click('.navb[data-p=payments]'); W(pg)
    check('Payments has an Expenses list for this month', pg.query_selector('#exps') is not None and pg.input_value('#ex-month')==cur)
    pg.click('[data-act=addExp]'); W(pg); pg.fill('#ex-amt','0'); pg.click('#exf button[type=submit]'); W(pg)
    check('expense: amount 0 refused', 'above 0' in pg.inner_text('#e-examt'))
    tom=(t+datetime.timedelta(days=1)).isoformat(); pg.evaluate(f"document.getElementById('ex-date').value='{tom}'"); pg.fill('#ex-amt','500'); pg.click('#exf button[type=submit]'); W(pg)
    check('expense: future date refused', 'future' in pg.inner_text('#e-exdate'))
    lm=(t.replace(day=1)-datetime.timedelta(days=1)); day=lm.replace(day=min(10,calendar.monthrange(lm.year,lm.month)[1])).isoformat()
    pg.evaluate(f"document.getElementById('ex-date').value='{day}'"); pg.select_option('#ex-cat','Ads'); pg.fill('#ex-note','Instagram boost'); pg.click('#exf button[type=submit]'); W(pg,300)
    check('expense saved, list jumps to that month', pg.input_value('#ex-month')==pm and 'Instagram boost' in pg.inner_text('#exps'))
    pg.click('.navb[data-p=dashboard]'); W(pg); pg.click('[data-act=range][data-r=Month]'); W(pg); pg.select_option('#month-pick',pm); W(pg)
    e2=pg.evaluate("[].filter.call(document.querySelectorAll('.mbox'),b=>b.querySelector('.muted').textContent==='Expenses')[0].querySelector('b').textContent")
    check('new expense shows up in that month\'s Expenses (+฿500)', e2==B(round(e+500,2)), (B(round(e,2)),e2))
    pg.click('.navb[data-p=payments]'); W(pg); pg.select_option('#ex-month',pm); W(pg)
    xid=pg.evaluate(D+".expenses.find(x=>x.note==='Instagram boost').id"); pg.click(f'[data-act=editExp][data-id="{xid}"]'); W(pg)
    check('edit form is prefilled', pg.input_value('#ex-amt')=='500' and pg.input_value('#ex-cat')=='Ads' and pg.input_value('#ex-date')==day)
    pg.fill('#ex-amt','650'); pg.click('#exf button[type=submit]'); W(pg,300)
    check('expense edited', pg.evaluate(D+f".expenses.find(x=>x.id==={xid}).amount")==650)
    pg.click(f'[data-act=delExp][data-id="{xid}"]'); W(pg); pg.click('[data-act=confirmDelExp]'); W(pg,300)
    check('expense deleted after confirming', pg.evaluate(D+f".expenses.some(x=>x.id==={xid})") is False)
    pg.reload(); W(pg,400); pg.click('.navb[data-p=payments]'); W(pg)
    check('expenses are still there after reload', pg.evaluate(D+".expenses.length")>100 and pg.evaluate("document.querySelectorAll('#exps tbody tr').length")>0)
    pg.select_option('#ex-month','all'); W(pg); check('"All months" shows the latest 40 with a note', pg.evaluate("document.querySelectorAll('#exps tbody tr').length")==40 and 'Showing the latest 40' in pg.inner_text('#exps'))
    pg.set_viewport_size({'width':390,'height':844}); W(pg,200)
    check('phone: Payments page fits the screen', pg.evaluate('document.documentElement.scrollWidth')==390)
    pg.click('[data-act=openNav]'); W(pg,300); pg.click('.navb[data-p=dashboard]'); W(pg,300); pg.click('[data-act=range][data-r=Year]'); W(pg)
    check('phone: dashboard fits the screen, 5 range buttons in one row', pg.evaluate('document.documentElement.scrollWidth')==390 and pg.evaluate("(()=>{const b=document.querySelectorAll('#salesov .seg button');return Math.round(b[0].getBoundingClientRect().top)===Math.round(b[4].getBoundingClientRect().top)})()"))
    check('no page errors', not errs, errs[:2]); b.close()
print(f'\n{sum(R)}/{len(R)} passed')

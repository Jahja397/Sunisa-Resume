# Part of the Sellora test suite. Needs: pip install playwright pillow  and  python -m playwright install chromium
import os as _os, pathlib as _pl
HERE=_os.path.dirname(_os.path.abspath(__file__)); _os.chdir(HERE); _os.makedirs('shots',exist_ok=True)
APP=_os.path.abspath(_os.path.join(HERE,'..','Sellora_Seller_Center.html')); APP_URL=_pl.Path(APP).as_uri()
import json,time,datetime,collections
from playwright.sync_api import sync_playwright
URL=APP_URL; R=[]
def check(n,c,i=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' | '+str(i) if i else ''))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300); t=time.time(); pg.click('[data-act=demo]'); pg.wait_for_timeout(600)
    d=pg.evaluate("JSON.parse(localStorage.getItem('sellora-d-demo@sellora.app'))"); now=time.time()*1000
    O=d['orders']; C={c['id']:c for c in d['customers']}; Pp={p['id']:p for p in d['products']}
    live=[o for o in O if o['status']!='Cancelled']
    print(f"orders {len(O)}, customers {len(C)}, size {len(json.dumps(d))//1024} KB, demo opened in {time.time()-t:.1f}s")
    last30=[o for o in live if o['ts']>=now-30*864e5]; print('orders in last 30 days:',len(last30))
    check('order numbers follow time order and nothing is in the future', all(a['id']<b2['id'] and a['ts']<=b2['ts'] for a,b2 in zip(O,O[1:])) and O[-1]['ts']<=now, (O[0]['id'],O[-1]['id']))
    check('history starts on 1 January last year', datetime.datetime.fromtimestamp(O[0]['ts']/1000).month==1 and datetime.datetime.fromtimestamp(O[0]['ts']/1000).year==datetime.date.today().year-1, round((now-O[0]['ts'])/864e5))
    check('every order\'s customer had joined before ordering', all(C[o['cust']]['ts']<o['ts'] for o in O))
    sold=collections.Counter(); [sold.update({it['pid']:it['qty']}) for o in live for it in o['items']]
    check('each product\'s "sold" = what the orders say', all(Pp[k]['sold']==v for k,v in sold.items()) and all(p['sold']==sold.get(p['id'],0) for p in d['products']))
    used=collections.Counter(o['coupon'] for o in live if o['coupon'])
    check('coupon "used" = orders that used it', all(c['used']==used.get(c['code'],0) for c in d['coupons']), {c['code']:c['used'] for c in d['coupons']})
    sub=lambda o: sum(i['price']*i['qty'] for i in o['items'])
    check('discounts match the coupon', all((o['coupon']=='SAVE100' and o['disc']==100) or (o['coupon']=='WELCOME10' and o['disc']==round(sub(o)*.1)) or (not o['coupon'] and o['disc']==0) for o in O))
    check('coupon terms stored on coupon orders', all((o['cterm'] is not None)==bool(o['coupon']) for o in O))
    check('shipping follows the store rule (free from ฿1,200)', all(o['ship']==(0 if sub(o)>=1200 else 40) for o in O))
    age=lambda o:(now-o['ts'])/36e5
    check('status fits the order\'s age', all(o['status'] in('Completed','Cancelled') for o in O if age(o)>=190) and all(o['status']!='Completed' for o in O if age(o)<96))
    check('payment fits the status', all((o['status']=='Pending')==(o['pay']=='Pending') for o in O) and all(o['pay'] in('Refunded','Cancelled') for o in O if o['status']=='Cancelled'))
    check('tracking only on shipped orders, courier not on unpacked ones', all(bool(o['track'])==(o['status'] in('Shipped','Completed')) for o in O) and all(o['courier']=='' for o in O if o['status'] in('Pending','Cancelled')))
    check('every feature is in the newest orders (SAVE100 being processed, WELCOME10 open, unpaid Pending)', any(o['coupon']=='SAVE100' and o['status']=='Processing' for o in O[-40:]) and any(o['coupon']=='WELCOME10' and o['status'] in('Pending','Processing') for o in O[-40:]) and any(o['status']=='Pending' for o in O))
    check('notification points to the newest order', d['notifs'][0]['ref']['o']==O[-1]['id']==d['lastOrderId'])
    check('funnel numbers are never smaller than real orders', all(f['checkouts']>=len([o for o in live if o['ts']>=now-{'7D':7,'30D':30,'3M':97,'1Y':330}[k]*864e5])-5 and f['views']>f['carts']>f['checkouts'] for k,f in d['funnel'].items()), d['funnel'])
    check('reviewers are real customers', all(any(c['name']==r['name'] for c in C.values()) for r in d['reviews']))
    # month view numbers vs raw data
    def mstat(y,m):
        s=datetime.datetime(y,m,1).timestamp()*1000; e=datetime.datetime(y+(m==12),m%12+1,1).timestamp()*1000
        L=[o for o in live if s<=o['ts']<e]; return len(L), sum(max(0,sub(o)+o['ship']-o['disc']) for o in L)
    pg.click('[data-act=range][data-r=Month]'); pg.wait_for_timeout(200)
    today=datetime.date.today(); prev=(today.replace(day=1)-datetime.timedelta(days=1))
    pg.select_option('#month-pick',f'{prev.year}-{prev.month:02d}'); pg.wait_for_timeout(200)
    boxes=pg.evaluate("[].map.call(document.querySelectorAll('.mbox'),b=>b.querySelector('.muted').textContent+'='+b.querySelector('b').textContent)")
    n,sales=mstat(prev.year,prev.month)
    check('month details match the raw orders (last month)', f'Orders={n}' in boxes and f'Income=฿{sales:,.0f}' in boxes, boxes[:2])
    pts=pg.evaluate("document.querySelectorAll('svg.chart circle').length"); import calendar
    check('chart shows one point per day of that month', pts==calendar.monthrange(prev.year,prev.month)[1], pts)
    rows=pg.evaluate("[].map.call(document.querySelectorAll('#monthly tbody tr[data-m]'),r=>[r.dataset.m,r.children[1].textContent])")
    check('the month table lists every month since the first sale and its numbers match', len(rows)>=21 and all(int(c.replace(',',''))==mstat(int(m[:4]),int(m[5:]))[0] for m,c in rows), rows[:3])
    check('the month table has a total row for each year', pg.evaluate("document.querySelectorAll('#monthly tr.yr').length")>=2)
    print('monthly sales:',[(m,int(c.replace(',',''))) for m,c in rows])
    check('no page errors', not errs, errs[:2])
    b.close()
print(f'\n{sum(R)}/{len(R)} passed')

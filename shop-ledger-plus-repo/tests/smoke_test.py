#!/usr/bin/env python3
"""
End-to-end smoke test for Shop Ledger Plus (real Chromium through Playwright).

    pip install playwright && playwright install chromium
    python3 tests/smoke_test.py                       # tests ../index.html
    python3 tests/smoke_test.py dist/shop-ledger-single.html

Exit code 0 = every check passed.
"""
import json, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "index.html"
URL = target.resolve().as_uri()
results = []


def check(name, ok, extra=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  ({extra})" if extra else ""))


def ev(pg, js):
    return pg.evaluate(js)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    # keep the test offline-friendly: skip web fonts
    pg.route("**/*", lambda r: r.abort() if "googleapis" in r.request.url or "gstatic" in r.request.url else r.continue_())
    pg.goto(URL)
    pg.wait_for_timeout(500)

    # 1. first screen
    check("home shows the two start buttons", ev(pg, "/อยากเริ่มแบบไหน/.test(document.getElementById('demobar').textContent)"))

    # 2. sample data fills every page
    ev(pg, "loadDemo()")
    pg.wait_for_timeout(300)
    check("sample data loaded", ev(pg, "data.length>100 && X.prods.length===4"))
    tabs_ok = ev(pg, """(()=>{go(2);for(const k of ['stock','cost','be','top','debt','goal','chk','bk']){sub=k;R2()}
        const vis=[...document.querySelectorAll('#pg1,#pg2')].map(e=>e.textContent).join(' ');return !/NaN|undefined|Infinity/.test(vis)})()""")
    check("all 8 extra tabs render without NaN/undefined", tabs_ok)
    check("data check finds no leftovers in sample data", ev(pg, "sub='chk';R2();document.querySelectorAll('#p2 .alert').length===0"))

    # 3. selling keeps stock, ledger and history in sync, and deleting rolls it back
    ev(pg, "go(2);sub='stock';R2()")
    res = ev(pg, """(()=>{const p=X.prods[0],s0=p.stock,l0=data.length,h0=X.sales.length;
        document.getElementById('q'+p.id).value='2';sell(p.id);
        const after={stock:p.stock===s0-2,ledger:data.length===l0+1,hist:X.sales.length===h0+1};
        const led=data.find(r=>r.sid&&X.sales.find(x=>x.id===r.sid&&x.qty===2&&x.date===todayS));
        askDel('d',led.id);doDel();
        return {after,back:p.stock===s0&&data.length===l0&&X.sales.length===h0}})()""")
    check("selling updates stock + ledger + history", all(res["after"].values()), json.dumps(res["after"]))
    check("deleting the sale restores everything", res["back"])

    # 4. input validation
    ev(pg, "openM();setType('in')")
    pg.fill("#amt", "-50")
    pg.fill("#cat", "x")
    pg.click("#save")
    check("negative amount is rejected", ev(pg, "!data.some(r=>r.amt===50&&r.cat==='x')"))
    ev(pg, "closeM()")

    # 5. backup file round trip (real download -> clear -> real file upload)
    ev(pg, "go(2);sub='bk';R2()")
    with pg.expect_download() as dl:
        pg.get_by_text("ดาวน์โหลดไฟล์สำรอง").click()
    path = Path(tempfile.gettempdir()) / "shop_ledger_smoke_backup.json"
    dl.value.save_as(str(path))
    rows = len(json.loads(path.read_text(encoding="utf-8"))["data"])
    check("backup file downloads with the ledger inside", rows > 100, f"{rows} rows")
    ev(pg, "snapPrev();data=[];X={prods:[],sales:[],debts:[],goal:0,ign:[]};save();sx();render()")
    pg.set_input_files("#impfile", str(path))
    pg.wait_for_timeout(400)
    ev(pg, "impDo('replace')")
    check("importing the backup restores the data", ev(pg, f"data.length==={rows}"))

    # 6. start fresh + the fill-everything wizard
    ev(pg, "doReset(true)")
    pg.wait_for_timeout(300)
    check("reset empties everything and opens the wizard", ev(pg, "data.length===0 && /ขั้นที่ 1\\/5/.test(document.getElementById('dsheet').textContent)"))
    pg.fill("#wn", "ข้าวมันไก่"); pg.fill("#wc", "28"); pg.fill("#wp", "50"); pg.fill("#ws", "20"); pg.fill("#wm", "5")
    pg.click('#dsheet button:has-text("＋")'); pg.click('#dsheet button:has-text("ถัดไป")')
    pg.fill("#wa", "1,250"); pg.fill("#wcat", "ขายหน้าร้าน"); pg.click('#dsheet button:has-text("＋")'); pg.click('#dsheet button:has-text("ถัดไป")')
    pg.fill("#wa", "3500"); pg.fill("#wcat", "ค่าเช่าที่"); pg.click('#dsheet button:has-text("＋")'); pg.click('#dsheet button:has-text("ถัดไป")')
    pg.fill("#ww", "ป้าน้อย"); pg.fill("#wa", "450"); pg.click('#dsheet button:has-text("＋")'); pg.click('#dsheet button:has-text("ถัดไป")')
    pg.fill("#wg", "30000"); pg.click('#dsheet button:has-text("บันทึกเป้าหมาย")'); pg.click('#dsheet button:has-text("เสร็จสิ้น")')
    pg.wait_for_timeout(300)
    check("wizard stored product, income, expense, debt and goal",
          ev(pg, "X.prods.length===1 && data.length===2 && X.debts.length===1 && X.goal===30000 && data.find(r=>r.type==='in').amt===1250"))

    # 7. language switch
    ev(pg, "document.getElementById('lg').click()")
    check("English mode shows English text", ev(pg, "/Profit|Loss/.test(document.getElementById('plbl').textContent)"))

    # 8. regression checks from the second round of testing
    ev(pg, "doReset(false);closeDel();period='day'")
    ev(pg, "loadDemo()")
    pg.wait_for_timeout(300)
    before = ev(pg, "[sum(todayS.slice(0,4),'in'),sum(todayS.slice(0,4),'out'),data.length,X.sales.length]")
    tea = ev(pg, "X.prods.find(p=>/ชาเย็น|Thai iced tea/.test(p.name)).id")
    ev(pg, f"askDel('p',{tea});doDel()")
    after = ev(pg, "[sum(todayS.slice(0,4),'in'),sum(todayS.slice(0,4),'out'),data.length,X.sales.length]")
    check("deleting a product keeps past income, expenses and history", before == after, f"{before} -> {after}")

    first = ev(pg, "X.prods[0].id")
    ev(pg, f"editP({first})")
    pg.fill("#en", "ชื่อใหม่"); pg.fill("#ep", "99")
    ev(pg, f"doEditP({first})")
    check("editing a product renames it everywhere", ev(pg, f"X.sales.filter(x=>x.pid=={first}).every(x=>x.name==='ชื่อใหม่') && X.prods.find(p=>p.id=={first}).price===99"))
    check("data check is clean after delete + edit", ev(pg, "sub='chk';go(2);R2();document.querySelectorAll('#p2 .alert').length===0"))

    res = ev(pg, """(()=>{const l=data.find(r=>r.sid),x=X.sales.find(q=>q.id===l.sid);editLed(l.id);
        document.getElementById('xa').value='777';doEditLed(l.id);return l.amt===777&&x.rev===777})()""")
    check("editing a sale entry updates the sales history too", res)

    ev(pg, "openM();setType('in')")
    pg.fill("#amt", "10"); pg.fill("#cat", "ลองวันอนาคต"); pg.fill("#date", "2999-01-01"); pg.click("#save")
    check("future dates are rejected", ev(pg, "!data.some(r=>r.cat==='ลองวันอนาคต')"))
    ev(pg, "closeM()")

    credit = ev(pg, """(()=>{const p=X.prods.find(q=>q.price>0&&q.stock>=3),s0=p.stock,l0=data.length;go(2);sub='stock';R2();
        document.getElementById('q'+p.id).value='3';creditDlg(p.id);document.getElementById('cn').value='ลูกค้าทดสอบ';doCredit(p.id);
        const d=X.debts.find(q=>q.who==='ลูกค้าทดสอบ');return {stock:p.stock===s0-3,noIncome:data.length===l0,debt:d&&d.amt===p.price*3,id:d.id}})()""")
    check("credit sale deducts stock, creates a receivable, records no income yet", credit["stock"] and credit["noIncome"] and credit["debt"])
    part = ev(pg, f"""(()=>{{const d=X.debts.find(q=>q.id=={credit['id']});payD(d.id,10);return d.paidAmt===10&&!d.paid&&rem(d)===d.amt-10}})()""")
    check("partial payment reduces the remaining amount", part)
    r = ev(pg, """(()=>{X.debts=[{id:991,k:'r',who:'ลุงทดสอบ',amt:450,due:'',paid:false,paidAmt:0}];payD(991,300);const d=X.debts[0],inc=data.filter(r=>r.did===991).reduce((t,r)=>t+r.amt,0);
        editDebt(991);document.getElementById('ea').value='300';doEditDebt(991);const closed=d.paid&&rem(d)===0&&inc===300;
        editDebt(991);document.getElementById('ea').value='450';doEditDebt(991);return closed&&!d.paid&&rem(d)===150})()""")
    check("editing a debt total down to what was paid closes it; raising it reopens it", r)
    r = ev(pg, """(()=>{for(const k in _dbl)delete _dbl[k];X.prods.push({id:992,name:'ปากกา',cost:5,price:10,stock:20,min:2});go(2);sub='stock';R2();
        document.getElementById('q992').value='3';creditDlg(992);document.getElementById('cn').value='พี่หมูทดสอบ';doCredit(992);
        for(const k in _dbl)delete _dbl[k];editP(992);document.getElementById('en').value='ปากกาเจล';doEditP(992);
        return X.debts.find(d=>d.who==='พี่หมูทดสอบ').item==='ปากกาเจล ×3'})()""")
    check("renaming a product also renames it on its credit-sale receivable", r)
    ev(pg, "for(const k in _dbl)delete _dbl[k]")
    ev(pg, "openM()")
    pg.keyboard.press("Escape")
    check("Esc closes the add-entry form", ev(pg, "!document.getElementById('modal').classList.contains('show')"))
    ev(pg, "document.getElementById('th').click()")
    theme = ev(pg, "document.documentElement.dataset.theme")
    pg.reload(); pg.wait_for_timeout(400)
    check("the chosen theme survives a reload", ev(pg, "document.documentElement.dataset.theme") == theme)

    # 9. the backup tab must not be rebuilt under the user's hands (typed text / chosen file)
    ctx2 = browser.new_context(viewport={"width": 390, "height": 844})
    pg2 = ctx2.new_page()
    pg2.route("**/*", lambda r: r.abort() if "googleapis" in r.request.url or "gstatic" in r.request.url else r.continue_())
    pg2.add_init_script("""const bad=()=>{throw {code:'unavailable'}};window.claude={use:async n=>n==='db'?{collection:p=>({doc:id=>({get:async()=>bad(),set:async()=>bad(),delete:async()=>bad()})})}:n==='user'?{id:async()=>'u1',can:async()=>true}:null};""")
    pg2.clock.install()
    pg2.goto(URL); pg2.clock.run_for(1500)
    pg2.evaluate("loadDemo();go(2);sub='bk';R2()"); pg2.clock.run_for(500)
    pg2.fill("#imptext", '{"app":"shop-ledger-plus","v":1,"data":[],"X":{}}')
    pg2.set_input_files("#impfile", {"name": "b.json", "mimeType": "application/json", "buffer": b"{}"})
    for _ in range(4):
        pg2.clock.run_for(7000); pg2.wait_for_timeout(100)
    check("typed backup text and chosen file survive failing cloud-sync retries",
          len(pg2.input_value("#imptext")) > 10 and pg2.evaluate("document.getElementById('impfile').files.length") == 1)
    ctx2.close()

    check("no JavaScript errors during the whole run", not errors, "; ".join(errors)[:200])
    browser.close()

failed = results.count(False)
print(f"\n{len(results) - failed}/{len(results)} checks passed")
sys.exit(1 if failed else 0)

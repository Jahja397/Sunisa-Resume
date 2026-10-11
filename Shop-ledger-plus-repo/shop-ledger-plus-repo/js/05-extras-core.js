// ===== PLUS FEATURES =====
const T=(a,b)=>lang==='th'?a:b;
let X={prods:[],debts:[],sales:[],goal:0},sub='stock',page=1;
try{X=Object.assign(X,JSON.parse(localStorage.getItem('plus')||'{}'))}catch(e){}
{const ok=v=>v&&typeof v==='object';
data=(Array.isArray(data)?data:[]).filter(r=>ok(r)&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(+r.amt)&&(r.type==='in'||r.type==='out')).map(r=>({...r,amt:+r.amt,cat:String(r.cat==null?'':r.cat),note:r.note==null?'':String(r.note),id:Number.isFinite(+r.id)?+r.id:Date.now()+Math.random()}));
if(!ok(X)||Array.isArray(X))X={};
X.prods=(Array.isArray(X.prods)?X.prods:[]).filter(p=>ok(p)&&Number.isFinite(+p.id)).map(p=>({...p,name:String(p.name==null?'':p.name),cost:+p.cost||0,price:+p.price||0,stock:+p.stock||0,min:+p.min||0}));
X.sales=(Array.isArray(X.sales)?X.sales:[]).filter(x=>ok(x)&&typeof x.date==='string'&&Number.isFinite(+x.qty)&&Number.isFinite(+x.rev)).map(x=>({...x,name:String(x.name==null?'':x.name),qty:+x.qty,rev:+x.rev,cost:+x.cost||0}));
X.debts=(Array.isArray(X.debts)?X.debts:[]).filter(d=>ok(d)&&Number.isFinite(+d.amt)).map(d=>({...d,who:String(d.who==null?'':d.who),amt:+d.amt,k:d.k==='p'?'p':'r',due:typeof d.due==='string'?d.due:'',paid:!!d.paid}));
X.goal=+X.goal||0;X.ign=Array.isArray(X.ign)?X.ign:[]}
const sx=()=>{try{localStorage.setItem('plus',JSON.stringify(X))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MAXN=1e8;
function pn2(v){v=String(v==null?'':v).replace(/[๐-๙]/g,c=>c.charCodeAt(0)-3664).replace(/[,\s]/g,'');if(!/^(\d+\.?\d*|\.\d+)$/.test(v))return NaN;const n=+v;return n>MAXN?NaN:n}
const badIn=root=>{const b=(root||document).querySelector('.bad');if(b){b.focus();toast(T('กรอกเฉพาะตัวเลข ไม่ติดลบ ไม่เกิน 100 ล้าน','Numbers only: no negatives, max 100 million'));return true}return false};
const nv=id=>pn2($(id).value)||0;
const toast=m=>{const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),2400)};
const SUBS=[['stock','📦','สต็อก','Stock'],['cost','🧮','ต้นทุน/ราคา','Cost'],['be','⚖️','จุดคุ้มทุน','Break-even'],['top','🏆','ขายดี/ไม่ดี','Top sellers'],['debt','🤝','ลูกหนี้/เจ้าหนี้','Credit'],['goal','🎯','เป้าหมาย','Goal'],['chk','🩺','ตรวจข้อมูล','Data check'],['bk','💾','สำรอง/ซิงค์','Backup / Sync']];
let CI=[{n:'',c:''},{n:'',c:''},{n:'',c:''}],CC={q:'',o:'',g:'',n:''},BE={f:'',p:'',v:'',d:''};
function go(p){page=p;document.body.classList.toggle('on2',p===2);$('pg1').style.display=p===1?'':'none';$('pg2').style.display=p===2?'':'none';$('add').style.display=p===1?'':'none';document.querySelectorAll('#bnav button').forEach(b=>b.classList.toggle('on',+b.dataset.p===p));if(p===2)R2();scrollTo(0,0)}
function applyNav(){$('bnav').innerHTML=`<button data-p="1" onclick="go(1)">🏠 ${T('หน้าหลัก','Home')}</button><button data-p="2" onclick="go(2)">🧰 ${T('ฟีเจอร์เสริม','Extras')}</button>`;document.querySelectorAll('#bnav button').forEach(b=>b.classList.toggle('on',+b.dataset.p===page))}

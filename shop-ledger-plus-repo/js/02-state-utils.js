let data=[],type='in',period='day',ctype='bar';
try{data=JSON.parse(localStorage.getItem('ledger')||'[]')}catch(e){}
const $=id=>document.getElementById(id);
const save=()=>{try{localStorage.setItem('ledger',JSON.stringify(data))}catch(e){}};
const iso=d=>{const x=pd(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const fmt=n=>'฿'+Math.abs(n).toLocaleString(loc(),{maximumFractionDigits:2});
let _tdC=0,_tdV='';
Object.defineProperty(window,'todayS',{configurable:true,get(){const n=Date.now();if(n-_tdC>1000){_tdC=n;_tdV=iso(pd())}return _tdV}});

const sum=(k,t)=>data.filter(r=>r.date.startsWith(k)&&r.type===t).reduce((a,r)=>a+r.amt,0);
let sel=todayS.slice(0,7);

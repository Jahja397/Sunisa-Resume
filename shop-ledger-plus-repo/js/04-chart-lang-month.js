let CS=[];
function showTip(i){const s=CS[i];if(!s)return;document.querySelectorAll('#chart .col').forEach((c,k)=>c.classList.toggle('sel',k===i));
const lab=s.key.length>7?pd(s.key).toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'short'}):MFULL[+s.key.slice(5)-1]+' '+yr(+s.key.slice(0,4));
const g=s.i-s.o;$('tip').innerHTML=`<b style="color:var(--ink)">${lab}</b> · <span class="pos">${tr('in_s')} ${fmt(s.i)}</span> - <span class="neg">${tr('out_s')} ${fmt(s.o)}</span> - <span style="color:#c9a227">${tr('pf')} ${g<0?'-':''}${fmt(g)}</span>`}
const pick=(x,y)=>{const el=document.elementFromPoint(x,y),c=el&&el.closest&&el.closest('#chart .col');if(c)showTip(+c.dataset.i)};
$('chart').addEventListener('click',e=>pick(e.clientX,e.clientY));
$('chart').addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pick(e.clientX,e.clientY)});
$('chart').addEventListener('touchmove',e=>{const t=e.touches[0];pick(t.clientX,t.clientY)},{passive:true});
$('ctog').onclick=e=>{const c=e.target.dataset.c;if(c){ctype=c;render()}};
const cy=pd().getFullYear();
function buildSel(){
  const sy=+sel.slice(0,4),lo=Math.min(cy-4,sy),hi=Math.max(cy,sy);
  $('msel').innerHTML=MFULL.map((m,k)=>`<option value="${k}">${m}</option>`).join('');
  $('ysel').innerHTML=[...Array(hi-lo+1)].map((_,k)=>lo+k).map(y=>`<option value="${y}">${yr(y)}</option>`).join('');
}
function applyLang(){
  document.documentElement.lang=lang;MFULL=MFS[lang];MON=MONS[lang];DAY=DAYS[lang];
  document.querySelectorAll('[data-i]').forEach(el=>el.textContent=tr(el.dataset.i));
  document.querySelectorAll('[data-ph]').forEach(el=>el.placeholder=tr(el.dataset.ph));
  $('lg').innerHTML=`<span class="${lang==='th'?'ac':''}">ไทย</span><span class="${lang==='en'?'ac':''}">EN</span>`;
  buildSel();$('catlist').innerHTML=CATS[lang][type].map(c=>`<option value="${c}">`).join('');
  document.querySelectorAll('#ctog button').forEach(b=>b.classList.toggle('on',b.dataset.c===ctype));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===period));
  render();
}
$('lg').onclick=()=>{lang=lang==='th'?'en':'th';try{localStorage.setItem('lang',lang)}catch(e){}applyLang()};
const setSel=(y,m)=>{const d=pd(y,m,1),yy=d.getFullYear();sel=yy+'-'+String(d.getMonth()+1).padStart(2,'0');buildSel();render()};
const cur=()=>[+sel.slice(0,4),+sel.slice(5,7)-1];
$('mprev').onclick=()=>{const[y,m]=cur();setSel(y,m-1)};
$('mnext').onclick=()=>{const[y,m]=cur();setSel(y,m+1)};
$('msel').onchange=$('ysel').onchange=()=>setSel(+$('ysel').value,+$('msel').value);
$('mnow').onclick=()=>{sel=todayS.slice(0,7);render()};

function render(){
  const ym=todayS.slice(0,7);
  const SY=+sel.slice(0,4),SM=+sel.slice(5,7)-1,isNow=sel===ym;
  const pre=period==='day'?todayS:period==='month'?ym:todayS.slice(0,4);
  const items=data.filter(r=>r.date.startsWith(pre));
  const i=items.filter(r=>r.type==='in').reduce((a,r)=>a+r.amt,0);
  const o=items.filter(r=>r.type==='out').reduce((a,r)=>a+r.amt,0);
  const p=i-o;
  $('inc').textContent=fmt(i);$('exp').textContent=fmt(o);
  $('profit').textContent=(p<0?'-':'')+fmt(p);
  $('profit').className='big '+(p>=0?'pos':'neg');
  $('plbl').textContent=tr((p>=0?'profit_':'loss_')+period);
  const yd=pd(todayS);yd.setDate(yd.getDate()-1);
  const pp=period==='day'?iso(yd):period==='month'?iso(pd(+todayS.slice(0,4),+todayS.slice(5,7)-2,1)).slice(0,7):String(+todayS.slice(0,4)-1);
  const dl=(c,v,good)=>{if(!v)return `<small><span style="color:var(--mute)">${tr('nodata_'+period)}</span></small>`;const d=v?Math.round((c-v)/v*100):(c>0?100:0),up=d>=0;return `<small class="${(up===good)?'up':'dn2'}"><span style="font-weight:700">${up?'↑':'↓'} ${Math.abs(d)}%</span><br><span style="color:var(--mute)">${tr('vs_'+period)}</span></small>`};
  $('dinc').innerHTML=dl(i,sum(pp,'in'),true);$('dexp').innerHTML=dl(o,sum(pp,'out'),false);
  const exPct=i>0?Math.min(100,Math.round(o/i*100)):0,pfPct=i>0?Math.round(Math.max(0,p)/i*100):0,mg=i>0?Math.round(p/i*100):0,cut=Math.min(100,exPct+pfPct);
  $('dn').innerHTML=`<h3>${tr('overview')}</h3><div class="dnw"><div class="ring" style="background:${i>0?`conic-gradient(#f4a0a0 0 ${exPct}%,#f6d56f ${exPct}% ${cut}%,var(--line) ${cut}% 100%)`:'var(--line)'}"><div class="rin"><b>${i>0?mg+'%':'–'}</b><small>${tr('margin')}</small></div></div><div class="dl"><div><span><i style="background:#7fd1b3"></i>${tr('income')}</span><b>${fmt(i)}</b></div><div><span><i style="background:#f4a0a0"></i>${tr('expense')}</span><b>${i>0?exPct+'%':'–'}</b></div><div><span><i style="background:#f6d56f"></i>${tr('profitw')}</span><b>${i>0?(p<0?'-':'')+Math.abs(mg)+'%':'–'}</b></div></div><div class="s" style="margin-top:6px">${tr('ofincome')}</div></div>`;
  const t=pd(todayS),Y=t.getFullYear(),M=t.getMonth();
  $('mnote').style.display=(period==='month'&&!isNow)?'block':'none';$('mnote').textContent='ℹ️ '+T('เลือกเดือนนี้ใช้ดูย้อนหลังเฉพาะกราฟ ตัวเลขกำไรและรายการยังเป็นเดือนปัจจุบัน','This picker only changes the chart. Profit figures and the list still show the current month');$('msel').value=SM;$('ysel').value=SY;$('mnow').style.display=isNow?'none':'inline-block';$('mnav').style.display=period==='month'?'flex':'none';
  let bk=[];
  if(period==='day'){
    const mon=pd(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));
    bk=DAY.map((n,k)=>{const d=pd(mon);d.setDate(mon.getDate()+k);const key=iso(d);return{key,l:n,now:key===todayS}});
    $('ctitle').textContent=tr('tw');
  }else if(period==='month'){
    const n=pd(SY,SM+1,0).getDate();
    bk=[...Array(n)].map((_,k)=>{const key=sel+'-'+String(k+1).padStart(2,'0');return{key,l:k+1,now:key===todayS}});
    $('ctitle').textContent=tr('tm')(MFULL[SM],yr(SY),n);
  }else{
    bk=MON.map((n,k)=>{const key=Y+'-'+String(k+1).padStart(2,'0');return{key,l:n,now:k===M}});
    $('ctitle').textContent=tr('ty')(yr(Y));
  }
  const sums=bk.map(x=>{const i=sum(x.key,'in'),o=sum(x.key,'out');return{...x,i,o,p:i-o,pp:Math.max(0,i-o)}});
  let mx=Math.max(0,...sums.flatMap(s=>[s.i,s.o]));if(!mx)mx=1000;
  const e=Math.pow(10,Math.floor(Math.log10(mx/4))),f=mx/4/e,step=(f<=1?1:f<=2?2:f<=5?5:10)*e,top=step*4;
  const nf=n=>n.toLocaleString(loc(),{maximumFractionDigits:2});
  $('yax').innerHTML=[0,1,2,3,4].map(k=>`<span style="bottom:${k*25}%">${nf(step*k)}</span>`).join('');
  $('inner').style.minWidth=period==='month'?bk.length*28+'px':'0';
  const line=period!=='day'&&ctype==='line',N=sums.length,X=k=>(k+.5)/N*100,pts=t=>sums.map((s,k)=>X(k)+','+(100-s[t]/top*100)).join(' ');
  const bars=s=>`<i class="bi" style="height:${s.i/top*100}%;${s.i>0?'min-height:3px':''}"></i><i class="bo" style="height:${s.o/top*100}%;${s.o>0?'min-height:3px':''}"></i><i class="bp" style="height:${s.pp/top*100}%;${s.pp>0?'min-height:3px':''}"></i>`;
  const lines=line?`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><polygon points="${X(0)},100 ${pts('i')} ${X(N-1)},100" fill="var(--up)" opacity=".1"/><polyline points="${pts('i')}" fill="none" stroke="var(--up)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts('pp')}" fill="none" stroke="#f0c040" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts('o')}" fill="none" stroke="var(--down)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`+sums.map((s,k)=>`<b class="dot di" style="left:${X(k)}%;bottom:${s.i/top*100}%"></b><b class="dot do" style="left:${X(k)}%;bottom:${s.o/top*100}%"></b>`).join(''):'';
  $('chart').innerHTML=[1,2,3,4].map(k=>`<div class="g" style="bottom:${k*25}%"></div>`).join('')+sums.map((s,ix)=>`<div class="col${s.now?' now':''}" data-i="${ix}">${line?'':bars(s)}</div>`).join('')+lines;
  $('ctog').style.display=period==='day'?'none':'flex';document.querySelectorAll('#ctog button').forEach(b=>b.classList.toggle('on',b.dataset.c===ctype));
  CS=sums;{const ci=sums.findIndex(s=>s.now);showTip(ci>=0?ci:0)}
  $('xlab').innerHTML=sums.map(s=>`<span class="${s.now?'now':''}">${s.l}</span>`).join('');
  if(period==='month'){const ix=sums.findIndex(s=>s.now);$('scroll').scrollLeft=Math.max(0,ix*28-80)}else $('scroll').scrollLeft=0;
  // list
  const all=data.filter(r=>r.date.startsWith(pre)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),rec=all.slice(0,LIM);
  $('ltitle').textContent=tr('list_'+period);
  $('list').innerHTML=rec.length?rec.map(r=>`<div class="row"><div><div class="t">${esc(catName(r.cat))}</div><div class="s">${pd(r.date).toLocaleDateString(loc(),{day:'numeric',month:'short',year:'numeric'})}${fmtNote(r.note)?' · '+esc(fmtNote(r.note)):''}</div></div><div style="display:flex;align-items:center;gap:6px"><span class="amt ${r.type==='in'?'pos':'neg'}">${r.type==='in'?'+':'-'}${fmt(r.amt)}</span><button class="del" onclick="editLed(${r.id})" title="edit">✏️</button><button class="del" onclick="del(${r.id})">🗑</button></div></div>`).join(''):'<div class="empty">'+tr('empty')+'</div>';
  if(all.length>LIM)$('list').insertAdjacentHTML('beforeend',`<div class="empty">${T('แสดง '+LIM+' จาก '+all.length+' รายการ','Showing '+LIM+' of '+all.length+' entries')}<br><button class="btn" style="margin-top:8px" onclick="LIM+=200;render()">${T('แสดงเพิ่ม','Show more')}</button></div>`);
}
function del(id){askDel('d',id)}
function setType(t){
  type=t;
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  $('catlist').innerHTML=CATS[lang][t].map(c=>`<option value="${c}">`).join('');
  $('cat').value='';
}
function openM(){$('date').max=todayS;$('amt').classList.remove('bad');$('date').value=todayS;$('amt').value='';$('note').value='';setType('in');$('modal').classList.add('show');setTimeout(()=>$('amt').focus(),50)}
const closeM=()=>$('modal').classList.remove('show');
$('add').onclick=openM;$('cancel').onclick=closeM;
$('modal').onclick=e=>{if(e.target.id==='modal')closeM()};
document.querySelector('.seg').onclick=e=>{if(e.target.dataset.t)setType(e.target.dataset.t)};
$('tabs').onclick=e=>{if(e.target.dataset.p){period=e.target.dataset.p;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b===e.target));render()}};
$('save').onclick=()=>{
  const a=pn2($('amt').value);
  if(!a||a<=0){$('amt').focus();return}
  data.push({id:Date.now(),type,amt:a,cat:$('cat').value.trim()||(type==='in'?tr('oin'):tr('oout')),note:$('note').value.trim(),date:$('date').value||todayS});
  save();closeM();render();
};
$('th').onclick=()=>{
  const r=document.documentElement,dark=getComputedStyle(r).getPropertyValue('--bg').trim()==='#0b1624';
  r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('theme',r.dataset.theme)}catch(e){}
};

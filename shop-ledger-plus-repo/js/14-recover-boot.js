// ===== recover data that was saved under a removed login account =====
function orphanProfiles(){try{const ks=Object.keys(localStorage),ids=[...new Set(ks.map(k=>(k.match(/^u([0-9a-f]{8})_(ledger|plus)$/)||[])[1]).filter(Boolean))];let acc=[];try{acc=JSON.parse(localStorage.getItem('sl_accounts')||'[]')}catch(e){}
 return ids.map(id=>{let n=0;try{n=(JSON.parse(localStorage.getItem('u'+id+'_ledger')||'[]')||[]).length}catch(e){}const nm=(acc.find(a=>a&&a.id===id)||{}).name||id;return{id,n,nm}}).filter(p=>p.n>0)}catch(e){return[]}}
function askRecover(){const ps=orphanProfiles();if(!ps.length)return;$('dsheet').innerHTML=`<h3>🗂 ${T('พบข้อมูลที่เก็บไว้ตอนใช้บัญชีล็อกอิน','Found data saved under a login account')}</h3><div class="s" style="margin:6px 0 10px">${T('ระบบล็อกอินถูกเอาออกแล้ว แต่ข้อมูลเก่ายังอยู่ในเครื่องนี้ ต้องการกู้คืนเข้าหน้านี้ไหม','The login feature was removed, but the old data is still on this device. Restore it here?')}</div><div style="display:flex;flex-direction:column;gap:8px">${ps.map(p=>`<button class="btn" onclick="recoverFrom('${p.id}')">♻️ ${esc(p.nm)} · ${p.n} ${T('รายการบัญชี','ledger entries')}</button>`).join('')}<button class="cancel" onclick="try{localStorage.setItem('sl_orphan_skip','1')}catch(e){}closeDel()">${T('ไม่ต้อง ไม่ต้องถามอีก','No, do not ask again')}</button></div>`;$('dmodal').classList.add('show')}
function recoverFrom(id){try{const c=cleanState({data:JSON.parse(localStorage.getItem('u'+id+'_ledger')||'[]'),X:JSON.parse(localStorage.getItem('u'+id+'_plus')||'{}')});adopt(c);closeDel();toast(T('กู้คืนข้อมูลแล้ว (ย้อนกลับได้ในแท็บ 💾)','Data restored (undo in the 💾 tab)'))}catch(e){toast(T('กู้คืนไม่สำเร็จ ข้อมูลเดิมยังอยู่','Could not restore. The old data is untouched'))}}
setTimeout(()=>{try{if(!hasData()&&localStorage.getItem('sl_orphan_skip')!=='1')askRecover()}catch(e){}},900);

const _al=applyLang;applyLang=function(){_al();applyNav();chip();if(page===2)R2()};
{const mg=migrate();applyLang();if(mg)toast(T('เชื่อมข้อมูลเก่าเข้าด้วยกันแล้ว '+mg+' รายการ','Linked '+mg+' older records'))}

// ---- the app may stay open across midnight: refresh the "today" views when the date changes
let _lastDay=todayS;
const dayTick=()=>{if(todayS===_lastDay)return;const old=_lastDay;_lastDay=todayS;if(sel===old.slice(0,7))sel=todayS.slice(0,7);render();if(page===2)R2();toast(T('ขึ้นวันใหม่แล้ว อัปเดตหน้าจอให้แล้ว','A new day started. The view was refreshed'))};
setInterval(dayTick,20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)dayTick()});window.addEventListener('focus',dayTick);

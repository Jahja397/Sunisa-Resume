function switchTab(tab){
  ['home','channels','dms','friends'].forEach(function(t){
    var el = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
    if(el) el.style.display = t===tab?'':'none';
    var btn = document.getElementById('tab-'+t);
    if(!btn) return;
    if(t===tab){
      btn.style.background='linear-gradient(to right,#93c5fd,#f9a8d4)';
      btn.style.color='white';
    } else {
      btn.style.background='rgba(255,255,255,.4)';
      btn.style.color='rgba(139,120,200,.8)';
    }
  });
  if(tab==='dms'){ renderDmUsers(); listenConversations(); }
  if(tab==='friends'){ listenFriendRequests(); listenFriends(); if(window.lucide) lucide.createIcons(); }
  if(window.lucide) lucide.createIcons();
}
function renderDmUsers(){
  var list = document.getElementById('dmUserList');
  if(!list) return;
  list.innerHTML='';
  var onList = document.getElementById('onList');
  if(!onList) return;
  var nodes = Array.from(onList.querySelectorAll('[data-uid]'));
  var me = window._currentUid;
  nodes = nodes.filter(function(n){ return n.getAttribute('data-uid') !== me; });
  if(!nodes.length){ list.innerHTML='<p style="font-size:.78rem;color:rgba(139,120,200,.4);font-style:italic;">No one else online</p>'; return; }
  nodes.forEach(function(item){
    var uid    = item.getAttribute('data-uid');
    var name   = item.getAttribute('data-name');
    var bg     = item.getAttribute('data-bg');
    var letter = item.getAttribute('data-letter');
    var email  = item.getAttribute('data-email');
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;cursor:pointer;background:rgba(255,255,255,.4);transition:background .2s;';
    div.onmouseover = function(){ this.style.background='rgba(255,255,255,.75)'; };
    div.onmouseout  = function(){ this.style.background='rgba(255,255,255,.4)'; };
    div.onclick = function(){ openDM(name, bg, letter, uid, email); };
    div.innerHTML =
      '<div style="width:30px;height:30px;border-radius:50%;background:'+bg+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;flex-shrink:0;">'+letter+'</div>'+
      '<p style="font-size:13px;font-weight:600;color:#4338ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+name+'</p>'+
      '<div style="width:6px;height:6px;border-radius:50%;background:#6ee7b7;flex-shrink:0;margin-left:auto;box-shadow:0 0 5px #6ee7b7;"></div>';
    list.appendChild(div);
  });
}
 
function closeModal(){ document.getElementById('modal').classList.remove('on'); }
function openModal(){ document.getElementById('modal').classList.add('on'); goLogin(); if(window.lucide) lucide.createIcons(); }
function goLogin(){ document.getElementById('pLogin').style.display=''; document.getElementById('pSignup').style.display='none'; if(window.lucide) lucide.createIcons(); }
function goSignup(){ document.getElementById('pLogin').style.display='none'; document.getElementById('pSignup').style.display=''; if(window.lucide) lucide.createIcons(); }
function toggleColorPicker(){
  var p=document.getElementById('colorPicker'); p.style.display=p.style.display==='none'?'':'none';
  // first time someone opens this, surface the "good to know" popup so they
  // understand the color they pick becomes visible to others, and that an
  // unset color is randomized per-profile on the chat pages
  if(p.style.display!=='none' && !localStorage.getItem('seenColorInfo')) openColorInfo();
}
function openColorInfo(){ document.getElementById('colorInfoModal').classList.add('on'); localStorage.setItem('seenColorInfo','1'); }
function closeColorInfo(){ document.getElementById('colorInfoModal').classList.remove('on'); }
function setAvatarColor(color){
  localStorage.setItem('avatarColor',color);
  ['bigAvatar','navAvatar'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.background=color; });
  document.getElementById('colorPicker').style.display='none';
  // persist to Firestore so this color is the one everyone else sees too
  // (previously this only ever touched localStorage, so nobody else — and no
  // other screen in the app — ever found out the color had changed)
  var u = auth.currentUser;
  if(u){
    db.collection('profiles').doc(u.uid).set({
      uid: u.uid, email: u.email, color: color, ts: FS.serverTimestamp()
    }, { merge: true }).catch(function(err){ console.error('Could not save avatar color:', err); });
  }
}
function previewGradient(){
  var c1=document.getElementById('color1').value;
  var c2=document.getElementById('color2').value;
  var grad='linear-gradient(135deg,'+c1+','+c2+')';
  document.getElementById('gradPreview').style.background=grad;
}
function applyGradient(){
  var c1=document.getElementById('color1').value;
  var c2=document.getElementById('color2').value;
  setAvatarColor('linear-gradient(135deg,'+c1+','+c2+')');
}
document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('modal').addEventListener('click',function(e){ if(e.target===this) closeModal(); });
  document.getElementById('colorInfoModal').addEventListener('click',function(e){ if(e.target===this) closeColorInfo(); });
});
/* ═══════════════════════════════════════
   FIREBASE
═══════════════════════════════════════ */
const cfg = {
  apiKey:            "AIzaSyD-YiBlJMK0fWh0Ltpr-FEAkfNMdgkZ3WA",
  authDomain:        "planning-with-ai-5460f.firebaseapp.com",
  projectId:         "planning-with-ai-5460f",
  storageBucket:     "planning-with-ai-5460f.firebasestorage.app",
  messagingSenderId: "908134622458",
  appId:             "1:908134622458:web:314976d68f7d641b39d543"
};
firebase.initializeApp(cfg);
const auth = firebase.auth();
const db   = firebase.firestore();
const FS   = firebase.firestore.FieldValue;
 
/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const COLORS = ['#93c5fd','#f9a8d4','#d8b4fe','#6ee7b7','#fcd34d','#f87171'];
// profileColors: email -> custom color/gradient the person picked on the Profile page,
// synced live from Firestore so it shows up everywhere (chat, DMs, friends list), not just
// on their own profile card.
let profileColors = {};
function aColor(e){
  if(e && profileColors[e]) return profileColors[e];
  let h=0; for(const c of (e||'')) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h];
}
function aLetter(e){ return e?e[0].toUpperCase():'?'; }

// cached snapshots so we can re-render lists instantly when a profile color changes,
// without waiting for their own collection (online/friends/messages/etc) to change too
let lastOnlineSnap=null, lastFriendsSnap=null, lastMsgsSnap=null, lastConvSnap=null;
let unsubProfiles=null;

function listenProfiles(){
  if(unsubProfiles) unsubProfiles();
  unsubProfiles = db.collection('profiles').onSnapshot(function(snap){
    const colors = {};
    snap.forEach(function(d){
      const p = d.data();
      if(p.email && p.color) colors[p.email] = p.color;
    });
    profileColors = colors;
    // keep my own avatar (profile page + nav bar) in sync too, and cache locally
    // so the next login paints the right color instantly, before this snapshot arrives
    var me = auth.currentUser;
    if(me && profileColors[me.email]){
      localStorage.setItem('avatarColor', profileColors[me.email]);
      ['bigAvatar','navAvatar'].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.style.background = profileColors[me.email];
      });
    }
    // re-paint everything that shows an avatar color, using whatever data we last received
    if(lastOnlineSnap)  renderOnlineList(lastOnlineSnap);
    if(lastFriendsSnap) renderFriendsList(lastFriendsSnap);
    if(lastMsgsSnap)     renderMsgsList(lastMsgsSnap);
    if(lastConvSnap)     renderConvList(lastConvSnap);
    if(currentDmRecipient){
      const av = document.getElementById('dmRecipientAvatar');
      if(av){ currentDmRecipient.bg = aColor(currentDmRecipient.email||''); av.style.background = currentDmRecipient.bg; }
    }
  });
}
 
/* ═══════════════════════════════════════
   AUTH STATE
═══════════════════════════════════════ */
let unsubMsg=null, unsubOn=null;
 
auth.onAuthStateChanged(async function(user){
  if(user){
    window._currentUid = user.uid;
    await db.collection('online').doc(user.uid).set({
      email:  user.email,
      name:   user.displayName || user.email.split('@')[0],
      uid:    user.uid,
      online: true,
      ts:     FS.serverTimestamp()
    });
    showDash(user);
    listenOnline();
    listenMsgs();
    listenChannels();
    listenFriends();
    listenFriendRequests();
    listenConversations();
    listenProfiles();
    watchIncomingDMs();
  } else {
    if(unsubProfiles){ unsubProfiles(); unsubProfiles=null; }
    profileColors = {};
    if(unsubRequests){ unsubRequests(); unsubRequests=null; }
    requestsFirstLoad = true;
    updateFriendReqBadge(0);
    if(unsubMsg){ unsubMsg(); unsubMsg=null; }
    if(unsubOn) { unsubOn();  unsubOn=null;  }
    if(unsubIncomingOuter){ unsubIncomingOuter(); unsubIncomingOuter=null; }
    unsubIncomingInner.forEach(function(fn){ fn(); });
    unsubIncomingInner = [];
    watchedDmIds = {};
    document.getElementById('landing').style.display = '';
    document.getElementById('dash').style.display    = 'none';
  }
});
 
/* ═══════════════════════════════════════
   SHOW DASHBOARD
═══════════════════════════════════════ */
function showDash(user){
  document.getElementById('landing').style.display = 'none';
  document.getElementById('dash').style.display    = '';
  const name = user.displayName || user.email.split('@')[0];
  const let_ = name[0].toUpperCase();
  // prefer the color synced from Firestore (profileColors, filled in by listenProfiles);
  // fall back to this device's last-known local color, then the default, so there's no
  // flash of the wrong color while the first Firestore snapshot is still loading
  const savedColor = profileColors[user.email] || localStorage.getItem('avatarColor') || 'linear-gradient(135deg,#93c5fd,#f9a8d4)';
  ['bigAvatar','navAvatar'].forEach(function(id){
    const el = document.getElementById(id);
    el.textContent = let_;
    el.style.background = savedColor;
  });
  document.getElementById('profName').textContent  = name;
  document.getElementById('profEmail').textContent = user.email;
  setTimeout(function(){ lucide.createIcons(); initEmojiPickers(); }, 100);
}
 
/* ═══════════════════════════════════════
   LISTENERS
═══════════════════════════════════════ */
function listenOnline(){
  unsubOn = db.collection('online').onSnapshot(function(snap){
    lastOnlineSnap = snap;
    renderOnlineList(snap);
  });
}

function renderOnlineList(snap){
    const list = document.getElementById('onList');
    list.innerHTML = ''; let cnt = 0;
    snap.forEach(function(d){
      const u = d.data(); if(!u.online) return; cnt++;
      const me = auth.currentUser && u.uid === auth.currentUser.uid;
      // prefer saved name, fallback to current user's displayName if it's me
      const displayName = u.name || (me && auth.currentUser.displayName) || u.email.split('@')[0];
      const letter = displayName[0].toUpperCase();
      const div = document.createElement('div');
      div.setAttribute('data-uid', u.uid);
      div.setAttribute('data-name', displayName);
      div.setAttribute('data-bg', aColor(u.email));
      div.setAttribute('data-letter', letter);
      div.setAttribute('data-email', u.email);
      if(!me){
        div.style.cursor = 'pointer';
        div.onclick = function(){
          switchTab('dms');
          openDM(
            div.getAttribute('data-name'),
            div.getAttribute('data-bg'),
            div.getAttribute('data-letter'),
            div.getAttribute('data-uid'),
            div.getAttribute('data-email')
          );
        };
      }
      div.style.cssText = div.style.cssText + ';display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:'+(me?'rgba(147,197,253,.15)':'transparent');
      div.innerHTML =
        '<div style="width:32px;height:32px;border-radius:50%;background:'+aColor(u.email)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:white;flex-shrink:0;">'+letter+'</div>'+
        '<div style="min-width:0;flex:1;"><p style="font-size:13px;font-weight:600;color:#4338ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+displayName+'</p></div>'+
        '<div style="width:7px;height:7px;border-radius:50%;background:#6ee7b7;flex-shrink:0;box-shadow:0 0 5px #6ee7b7;"></div>';
      list.appendChild(div);
    });
    document.getElementById('onCnt').textContent = cnt;
}
 
function listenMsgs(){
  unsubMsg = db.collection('messages').orderBy('ts','asc').onSnapshot(function(snap){
    lastMsgsSnap = snap;
    renderMsgsList(snap);
  });
}

function renderMsgsList(snap){
    const box = document.getElementById('msgBox');
    const atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = '';
    snap.forEach(function(d){
      const m = d.data();
      const me = auth.currentUser && m.uid === auth.currentUser.uid;
      box.appendChild(renderMsg(m, me, '#93c5fd', '#f9a8d4', 'messages', d.id));
    });
    if(atBot) box.scrollTop = box.scrollHeight;
}
 
/* ═══════════════════════════════════════
   ACTIONS
═══════════════════════════════════════ */
// live hint under the signup Name field — checks 'usernames' as the person tabs away
async function checkNameAvailable(){
  const nameEl = document.getElementById('sName');
  const hint = document.getElementById('sNameHint');
  if(!nameEl || !hint) return;
  const name = nameEl.value.trim();
  if(!name){ hint.textContent=''; return; }
  hint.style.color = 'rgba(139,120,200,.6)';
  hint.textContent = 'Checking...';
  const doc = await db.collection('usernames').doc(nameKeyOf(name)).get();
  if(doc.exists){
    hint.style.color = '#f87171';
    hint.textContent = 'That name is already taken.';
  } else {
    hint.style.color = '#059669';
    hint.textContent = 'Name is available ✓';
  }
}

// ── UNIQUE NAMES ──
// 'usernames' collection: doc id = name.toLowerCase(), data = { uid, name, email }
// This is what makes a name "reserved" — whoever's uid is on the doc owns that name.
function nameKeyOf(n){ return (n||'').trim().toLowerCase(); }

// Called on login: makes sure the current user "owns" the name they typed.
// - if the name is free, or already theirs -> claim/refresh it (and release their old name)
// - if it's already someone else's -> keep their previous name and let them know
async function claimUsername(user, wantedName, email){
  wantedName = wantedName.trim();
  var oldName = (user.displayName || '').trim();
  var newKey  = nameKeyOf(wantedName);
  if(!newKey) return;
  var doc = await db.collection('usernames').doc(newKey).get();
  if(doc.exists && doc.data().uid !== user.uid){
    if(nameKeyOf(oldName) !== newKey){
      alert('The name "'+wantedName+'" is already taken, so we kept your previous name'+(oldName?(': '+oldName):'.')+'.');
    }
    return;
  }
  if(oldName && nameKeyOf(oldName) !== newKey){
    await db.collection('usernames').doc(nameKeyOf(oldName)).delete().catch(function(){});
  }
  await db.collection('usernames').doc(newKey).set({ uid:user.uid, name:wantedName, email:email });
  if(oldName !== wantedName){
    await user.updateProfile({ displayName: wantedName });
  }
}

async function doLogin(){
  const name  = document.getElementById('lName').value.trim();
  const email = document.getElementById('lEmail').value.trim();
  const pass  = document.getElementById('lPass').value;
  const err   = document.getElementById('lErr');
  err.textContent = '';
  if(!name||!email||!pass){ err.textContent='Please fill in all fields.'; return; }
  try{
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    await claimUsername(cred.user, name, email);
    // claimUsername may just have changed displayName via updateProfile() — but that
    // happens AFTER onAuthStateChanged already fired and painted the dashboard with the
    // old name, and updateProfile() doesn't trigger onAuthStateChanged again. So the
    // profile name (and the 'online' doc other people see) would stay stuck on the old
    // name until the next full login. Force both back in sync here.
    await db.collection('online').doc(cred.user.uid).update({
      name: cred.user.displayName || cred.user.email.split('@')[0]
    }).catch(function(){});
    showDash(cred.user);
    closeModal();
  }
  catch(e){ err.textContent = e.message; }
}

async function doForgotPassword(){
  const email = document.getElementById('lEmail').value.trim();
  const err   = document.getElementById('lErr');
  err.textContent = '';
  err.style.color = '#f472b6';
  if(!email){
    err.textContent = 'Enter your email above first, then tap "Forgot Password?".';
    return;
  }
  try{
    await auth.sendPasswordResetEmail(email);
    err.style.color = '#22c55e';
    err.textContent = 'Reset link sent! Check your email inbox (and spam folder).';
  }
  catch(e){ err.textContent = e.message; }
}

async function doSignup(){
  const name  = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const pass  = document.getElementById('sPass').value;
  const err   = document.getElementById('sErr');
  err.textContent = '';
  if(!name||!email||!pass){ err.textContent='Please fill in all fields.'; return; }
  if(pass.length<6){ err.textContent='Password must be at least 6 characters.'; return; }
  try{
    const nameKey = nameKeyOf(name);
    const taken = await db.collection('usernames').doc(nameKey).get();
    if(taken.exists){
      err.textContent = 'That name is already taken — please choose another.';
      return;
    }
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('usernames').doc(nameKey).set({ uid: cred.user.uid, name: name, email: email });
    // same race as doLogin: onAuthStateChanged already ran showDash() with the pre-update
    // (empty) displayName by the time updateProfile() resolves here — refresh it explicitly
    await db.collection('online').doc(cred.user.uid).update({ name: name }).catch(function(){});
    showDash(cred.user);
    closeModal();
  }
  catch(e){ err.textContent = e.message; }
}
 
async function doLogout(){
  const u = auth.currentUser;
  if(u) await db.collection('online').doc(u.uid).update({online:false}).catch(()=>{});
  await auth.signOut();
}
 
async function sendMsg(){
  const u = auth.currentUser; if(!u) return;
  const inp = document.getElementById('msgInp');
  const txt = inp.value.trim();
  const img = pendingImages.global;
  if(!txt && !img) return;
  inp.value = ''; removeImg('global');
  await db.collection('messages').add({ text:txt||'', image:img||null, email:u.email, name:u.displayName||u.email.split('@')[0], uid:u.uid, ts:FS.serverTimestamp() });
}
 
var currentDmId = null;
var currentDmRecipient = null;
var unsubDm = null;
 
function getDmId(uid1, uid2){ return [uid1, uid2].sort().join('_'); }
 
function openDM(name, bg, letter, uid, email){
  var u = auth.currentUser; if(!u) return;
  currentDmId = getDmId(u.uid, uid);
  // keep bg live off the email when we have one, so future color changes still apply
  if(email) bg = aColor(email);
  currentDmRecipient = { uid, name, bg, letter, email };
  document.getElementById('dmRecipientName').textContent = name;
  var av = document.getElementById('dmRecipientAvatar');
  av.textContent = letter; av.style.background = bg;
  document.getElementById('dmEmpty').style.display = 'none';
  document.getElementById('dmChatArea').style.display = 'flex';
  // save conversation for me (withEmail lets the color stay live instead of frozen at withBg)
  db.collection('users').doc(u.uid).collection('conversations').doc(currentDmId).set({
    withUid: uid, withName: name, withBg: bg, withEmail: email||null, withLetter: letter, dmId: currentDmId, ts: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  // save conversation for the other person too
  var myName   = u.displayName||u.email.split('@')[0];
  var myBg     = aColor(u.email);
  var myLetter = myName[0].toUpperCase();
  db.collection('users').doc(uid).collection('conversations').doc(currentDmId).set({
    withUid: u.uid, withName: myName, withBg: myBg, withEmail: u.email, withLetter: myLetter, dmId: currentDmId, ts: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  if(unsubDm) unsubDm();
  var q = db.collection('dms').doc(currentDmId).collection('messages').orderBy('ts','asc');
  unsubDm = q.onSnapshot(function(snap){
    var box = document.getElementById('dmMsgBox');
    if(!box) return;
    var atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = '';
    snap.forEach(function(d){
      var m = d.data();
      var me = auth.currentUser && m.uid === auth.currentUser.uid;
      box.appendChild(renderMsg(m, me, '#6ee7b7', '#93c5fd', 'dms/'+currentDmId+'/messages', d.id));
    });
    if(atBot) box.scrollTop = box.scrollHeight;
    // auto-save conversation for current user if they received a message
    var u = auth.currentUser;
    if(u && snap.size > 0 && currentDmRecipient){
      db.collection('users').doc(u.uid).collection('conversations').doc(currentDmId).set({
        withUid: currentDmRecipient.uid, withName: currentDmRecipient.name,
        withBg: currentDmRecipient.bg, withEmail: currentDmRecipient.email||null, withLetter: currentDmRecipient.letter,
        dmId: currentDmId, lastMsg: snap.docs[snap.size-1].data().text||'📷 Image',
        ts: FS.serverTimestamp()
      }, { merge: true });
    }
  });
  // highlight active conv
  document.querySelectorAll('[data-conv-id]').forEach(function(el){
    el.style.background = el.getAttribute('data-conv-id')===currentDmId ? 'rgba(147,197,253,.2)' : 'transparent';
  });
}
 
async function sendDM(){
  if(!currentDmId) return;
  var u = auth.currentUser; if(!u) return;
  var inp = document.getElementById('dmMsgInp');
  var txt = inp.value.trim();
  var img = pendingImages.dm;
  if(!txt && !img) return;
  inp.value = ''; removeImg('dm');
  await db.collection('dms').doc(currentDmId).collection('messages').add({
    text:txt||'', image:img||null, email:u.email, name:u.displayName||u.email.split('@')[0], uid:u.uid, ts:FS.serverTimestamp()
  });
  if(currentDmRecipient){
    var myName = u.displayName||u.email.split('@')[0];
    var myBg   = aColor(u.email);
    var myLetter = myName[0].toUpperCase();
    // save for me
    db.collection('users').doc(u.uid).collection('conversations').doc(currentDmId).set({
      withUid:currentDmRecipient.uid, withName:currentDmRecipient.name,
      withBg:currentDmRecipient.bg, withEmail:currentDmRecipient.email||null, withLetter:currentDmRecipient.letter,
      dmId:currentDmId, lastMsg:txt||'📷 Image', ts:FS.serverTimestamp()
    }, { merge:true });
    // save for recipient too
    db.collection('users').doc(currentDmRecipient.uid).collection('conversations').doc(currentDmId).set({
      withUid:u.uid, withName:myName, withBg:myBg, withEmail:u.email, withLetter:myLetter,
      dmId:currentDmId, lastMsg:txt||'📷 Image', ts:FS.serverTimestamp()
    }, { merge:true });
  }
}
 
// listen to my past conversations
var unsubConv = null;
function listenConversations(){
  var u = auth.currentUser; if(!u) return;
  if(unsubConv) unsubConv();
  unsubConv = db.collection('users').doc(u.uid).collection('conversations')
    .orderBy('ts','desc').onSnapshot(function(snap){
      lastConvSnap = snap;
      renderConvList(snap);
    });
}

function renderConvList(snap){
      var list = document.getElementById('dmConvList');
      if(!list) return;
      list.innerHTML = '';
      if(snap.empty){
        list.innerHTML = '<p style="font-size:.75rem;color:rgba(139,120,200,.35);font-style:italic;">No conversations yet</p>';
        return;
      }
      snap.forEach(function(d){
        var c = d.data();
        // prefer the live color derived from their email; only fall back to the
        // frozen withBg for older conversation docs saved before withEmail existed
        var bg = c.withEmail ? aColor(c.withEmail) : (c.withBg||'#93c5fd');
        var isActive = currentDmId === c.dmId;
        var div = document.createElement('div');
        div.setAttribute('data-conv-id', c.dmId);
        div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;cursor:pointer;transition:background .2s;background:'+(isActive?'rgba(147,197,253,.2)':'transparent');
        div.onmouseover = function(){ if(currentDmId!==c.dmId) this.style.background='rgba(255,255,255,.5)'; };
        div.onmouseout  = function(){ if(currentDmId!==c.dmId) this.style.background='transparent'; };
        div.onclick = function(){ openDM(c.withName, bg, c.withLetter, c.withUid, c.withEmail); };
        div.innerHTML =
          '<div style="width:30px;height:30px;border-radius:50%;background:'+bg+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;flex-shrink:0;">'+(c.withLetter||'?')+'</div>'+
          '<div style="min-width:0;flex:1;">'+
            '<p style="font-size:13px;font-weight:600;color:#4338ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+c.withName+'</p>'+
            (c.lastMsg?'<p style="font-size:10px;color:rgba(139,120,200,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+c.lastMsg+'</p>':'')+
          '</div>'+
          '<button class="conv-del-btn" title="Delete conversation" style="flex-shrink:0;width:22px;height:22px;border:none;border-radius:50%;background:rgba(248,113,113,.12);color:#f87171;font-size:.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s,background .15s;">✕</button>';
        var delBtn = div.querySelector('.conv-del-btn');
        div.onmouseover = function(){ if(currentDmId!==c.dmId) this.style.background='rgba(255,255,255,.5)'; var b=this.querySelector('.conv-del-btn'); if(b) b.style.opacity='1'; };
        div.onmouseout  = function(){ if(currentDmId!==c.dmId) this.style.background='transparent'; var b=this.querySelector('.conv-del-btn'); if(b) b.style.opacity='0'; };
        delBtn.onmouseover = function(e){ e.stopPropagation(); this.style.background='rgba(248,113,113,.3)'; };
        delBtn.onmouseout  = function(e){ e.stopPropagation(); this.style.background='rgba(248,113,113,.12)'; };
        delBtn.onclick = function(e){ e.stopPropagation(); deleteConversation(c.dmId, c.withUid); };
        list.appendChild(div);
      });
}
 
// ── DELETE CONVERSATION ──
// Deletes the DM thread entirely: all messages plus the conversation-list
// entry on BOTH sides, so it disappears for you and for the other person too.
async function deleteConversation(dmId, otherUid, event){
  if(event) event.stopPropagation();
  var u = auth.currentUser; if(!u || !dmId) return;
  if(!confirm('Delete this conversation? This removes all messages for both of you and can\'t be undone.')) return;

  try{
    // 1. delete every message in the thread (batched, 450 at a time to stay under Firestore's 500 limit)
    var msgsRef = db.collection('dms').doc(dmId).collection('messages');
    var snap = await msgsRef.get();
    var docs = snap.docs;
    for(var i=0;i<docs.length;i+=450){
      var batch = db.batch();
      docs.slice(i,i+450).forEach(function(d){ batch.delete(d.ref); });
      await batch.commit();
    }

    // 2. remove the conversation-list entry for both people
    var cleanupBatch = db.batch();
    cleanupBatch.delete(db.collection('users').doc(u.uid).collection('conversations').doc(dmId));
    if(otherUid){
      cleanupBatch.delete(db.collection('users').doc(otherUid).collection('conversations').doc(dmId));
    }
    await cleanupBatch.commit();

    // 3. if this thread is currently open, close it
    if(currentDmId === dmId){
      currentDmId = null;
      currentDmRecipient = null;
      if(unsubDm){ unsubDm(); unsubDm = null; }
      document.getElementById('dmChatArea').style.display = 'none';
      document.getElementById('dmEmpty').style.display = '';
    }
  } catch(err){
    console.error(err);
    alert('Could not delete conversation: ' + err.message + '\n(Check your Firestore rules allow deleting the other user\'s conversation doc.)');
  }
}

// convenience wrapper for the "delete" button inside an open DM
function deleteCurrentConversation(){
  if(!currentDmId || !currentDmRecipient) return;
  deleteConversation(currentDmId, currentDmRecipient.uid);
}

// ── EMOJI & IMAGE ──
var EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐙','❤️','🧡','💛','💚','💙','💜','🖤','💥','✨','🌟','⭐','🎉','🎊','🎈','👍','👎','👏','🙌','🤝','💪','🙏','✌️'];
var pendingImages = { global:null, channel:null, dm:null };
 
function initEmojiPickers(){
  ['global','channel','dm'].forEach(function(type){
    var key = type.charAt(0).toUpperCase()+type.slice(1);
    var picker = document.getElementById('emojiPicker'+key);
    if(!picker) return;
    picker.innerHTML = '';
    EMOJIS.forEach(function(em){
      var btn = document.createElement('button');
      btn.className = 'emoji-btn-pick';
      btn.textContent = em;
      btn.onclick = function(e){ e.stopPropagation(); insertEmoji(em, type); };
      picker.appendChild(btn);
    });
  });
}
 
function toggleEmoji(type){
  var key = type.charAt(0).toUpperCase()+type.slice(1);
  var picker = document.getElementById('emojiPicker'+key);
  if(!picker) return;
  ['Global','Channel','Dm'].forEach(function(k){
    var p = document.getElementById('emojiPicker'+k);
    if(p && k!==key) p.classList.remove('show');
  });
  picker.classList.toggle('show');
}
 
function insertEmoji(em, type){
  var inputId = type==='global'?'msgInp':type==='channel'?'channelMsgInp':'dmMsgInp';
  var inp = document.getElementById(inputId); if(!inp) return;
  var pos = inp.selectionStart||inp.value.length;
  inp.value = inp.value.slice(0,pos)+em+inp.value.slice(pos);
  inp.focus();
  toggleEmoji(type);
}
 
function handleImg(event, type){
  var file = event.target.files[0]; if(!file) return;
  if(file.size > 600000){ alert('Image too large! Please use under 600KB.'); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    pendingImages[type] = e.target.result;
    var key = type.charAt(0).toUpperCase()+type.slice(1);
    var wrap = document.getElementById('imgPreview'+key);
    var img  = document.getElementById('imgPreview'+key+'Img');
    if(wrap && img){ img.src=e.target.result; wrap.style.display='block'; }
  };
  reader.readAsDataURL(file);
  event.target.value='';
}
 
function removeImg(type){
  pendingImages[type]=null;
  var key = type.charAt(0).toUpperCase()+type.slice(1);
  var wrap = document.getElementById('imgPreview'+key);
  if(wrap) wrap.style.display='none';
}
 
document.addEventListener('click', function(e){
  if(!e.target.closest('.emoji-picker') && e.target.textContent.trim()!=='😊'){
    document.querySelectorAll('.emoji-picker').forEach(function(p){ p.classList.remove('show'); });
  }
});
 
// delPath/delId identify the Firestore doc for THIS message (e.g. 'messages' + doc id,
// or 'dms/abc123/messages' + doc id). Delete button only renders when isMe is true
// and both are provided, since you can only delete your own messages.
function renderMsg(m, isMe, gradFrom, gradTo, delPath, delId){
  var gf = gradFrom||'#93c5fd', gt2 = gradTo||'#f9a8d4';
  var wrap = document.createElement('div');
  wrap.className = 'msg-row';
  wrap.style.cssText = 'display:flex;justify-content:'+(isMe?'flex-end':'flex-start')+';margin-bottom:10px;';
  var inner = '';
  if(m.image) inner += '<img src="'+m.image+'" style="max-width:180px;max-height:140px;border-radius:.8rem;display:block;margin-bottom:'+(m.text?'4px':'0')+';object-fit:cover;">';
  if(m.text)  inner += '<span>'+m.text+'</span>';
  var canDelete = !!(isMe && delPath && delId);
  // color stays keyed off email (so the same account always shows the same
  // colored circle even if they change their name) — but the LETTER now follows
  // the name shown right next to it, so what's inside the circle actually
  // matches what's printed above the bubble instead of a stale email initial.
  var avHtml = '<div title="'+(m.email||'')+'" style="width:26px;height:26px;border-radius:50%;background:'+aColor(m.email)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:white;flex-shrink:0;">'+aLetter(m.name||m.email)+'</div>';
  // my own message bubble uses MY chosen profile color when I've set one; otherwise
  // falls back to this chat's default two-tone gradient (gf/gt2), same as before
  var myBubbleBg = (isMe && profileColors[m.email]) ? profileColors[m.email] : ('linear-gradient(135deg,'+gf+','+gt2+')');
  var bubbleHtml =
    '<div style="min-width:0;">'+
      '<p style="font-size:10px;color:rgba(139,120,200,.6);margin-bottom:2px;'+(isMe?'text-align:right;padding-right:3px;':'padding-left:3px;')+'">'+(m.name||m.email.split('@')[0])+'</p>'+
      '<div style="padding:.5rem .95rem;border-radius:'+(isMe?'1.1rem 1.1rem .25rem 1.1rem':'1.1rem 1.1rem 1.1rem .25rem')+
      ';background:'+(isMe?myBubbleBg:'rgba(255,255,255,.82)')+
      ';color:'+(isMe?'white':'#4338ca')+';font-size:.88rem;box-shadow:0 2px 8px rgba(180,160,220,.15);">'+inner+'</div>'+
    '</div>';
  var delHtml = canDelete ? '<button class="msg-del-btn" title="Delete message" style="flex-shrink:0;width:20px;height:20px;border:none;border-radius:50%;background:rgba(248,113,113,.15);color:#f87171;font-size:.65rem;cursor:pointer;margin-bottom:3px;">✕</button>' : '';
  // order the pieces explicitly instead of relying on row-reverse, so avatar always sits
  // at the outer edge (next to the wall) and the delete button always sits innermost
  var partsHtml = isMe ? (delHtml + bubbleHtml + avHtml) : (avHtml + bubbleHtml);
  wrap.innerHTML = '<div style="max-width:78%;display:flex;align-items:flex-end;gap:6px;">'+partsHtml+'</div>';
  if(canDelete){
    wrap.querySelector('.msg-del-btn').onclick = function(e){ e.stopPropagation(); deleteMessage(delPath, delId); };
  }
  return wrap;
}

// deletes a single message doc, e.g. deleteMessage('messages', id) or deleteMessage('dms/abc123/messages', id)
async function deleteMessage(collectionPath, docId){
  if(!confirm('Delete this message?')) return;
  try{
    await db.doc(collectionPath+'/'+docId).delete();
  } catch(err){
    console.error(err);
    alert('Could not delete message: ' + err.message + '\n(Check your Firestore rules allow deleting your own messages.)');
  }
}
 
// watch all my conversations for new incoming messages — saves conv for me automatically
var watchedDmIds = {};
var unsubIncomingOuter = null;
var unsubIncomingInner = [];
function watchIncomingDMs(){
  var u = auth.currentUser; if(!u) return;
  watchedDmIds = {};
  unsubIncomingInner = [];
  unsubIncomingOuter = db.collection('users').doc(u.uid).collection('conversations').onSnapshot(function(snap){
    snap.docChanges().forEach(function(change){
      if(change.type === 'added' || change.type === 'modified'){
        var c = change.doc.data();
        // only attach ONE message listener per DM — otherwise our own write below
        // re-triggers this outer listener, which would attach another nested
        // listener, which writes again... an infinite (and quota-exhausting) loop
        if(!c.dmId || watchedDmIds[c.dmId]) return;
        watchedDmIds[c.dmId] = true;
        // watch this DM for new messages from the other person
        var unsub = db.collection('dms').doc(c.dmId).collection('messages')
          .orderBy('ts','desc').limit(1)
          .onSnapshot(function(msgSnap){
            if(msgSnap.empty) return;
            var last = msgSnap.docs[0].data();
            if(last.uid === u.uid) return; // skip my own
            // update conversation lastMsg
            db.collection('users').doc(u.uid).collection('conversations').doc(c.dmId).set({
              lastMsg: last.text||'📷 Image', ts: FS.serverTimestamp()
            }, { merge: true });
          });
        unsubIncomingInner.push(unsub);
      }
    });
  });
}
var friendSearchTimeout = null;
 
async function searchUsers(){
  clearTimeout(friendSearchTimeout);
  friendSearchTimeout = setTimeout(async function(){
    var q = document.getElementById('friendSearch').value.trim().toLowerCase();
    var results = document.getElementById('searchResults');
    results.innerHTML = '';
    if(!q) return;
    var u = auth.currentUser; if(!u) return;
 
    // search all users in 'online' collection by name or email
    var snap = await db.collection('online').get();
    var found = [];
    snap.forEach(function(d){
      var data = d.data();
      if(data.uid === u.uid) return; // skip self
      var name  = (data.name||'').toLowerCase();
      var email = (data.email||'').toLowerCase();
      if(name.includes(q) || email.includes(q)) found.push(data);
    });
 
    if(!found.length){
      results.innerHTML = '<p style="font-size:.82rem;color:rgba(139,120,200,.4);font-style:italic;">No users found</p>';
      return;
    }
 
    found.forEach(function(user){
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:.7rem;padding:.65rem 1rem;border-radius:1rem;background:rgba(255,255,255,.6);border:1px solid rgba(199,210,254,.3);';
      div.innerHTML =
        '<div style="width:36px;height:36px;border-radius:50%;background:'+aColor(user.email)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;flex-shrink:0;">'+(user.name||user.email)[0].toUpperCase()+'</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<p style="font-size:.9rem;font-weight:600;color:#4338ca;">'+( user.name||user.email.split('@')[0])+'</p>'+
          '<p style="font-size:.7rem;color:rgba(139,120,200,.55);">'+user.email+'</p>'+
        '</div>'+
        '<button id="addbtn-'+user.uid+'" onclick="sendFriendRequest(\''+user.uid+'\',\''+(user.name||user.email.split('@')[0])+'\')" style="padding:.35rem .9rem;border:none;border-radius:999px;background:linear-gradient(to right,#93c5fd,#f9a8d4);color:white;font-family:var(--h);font-style:italic;font-weight:700;font-size:.78rem;cursor:pointer;">+ Add</button>';
      results.appendChild(div);
    });
  }, 400);
}
 
async function sendFriendRequest(toUid, toName){
  var u = auth.currentUser; if(!u) return;
  var btn = document.getElementById('addbtn-'+toUid);
  var existing = await db.collection('friendRequests')
    .where('from','==',u.uid).where('to','==',toUid).get();
  if(!existing.empty){
    if(btn){ btn.textContent='Already Sent'; btn.style.background='rgba(199,210,254,.5)'; btn.style.color='rgba(139,120,200,.7)'; btn.disabled=true; }
  } else {
    await db.collection('friendRequests').add({
      from: u.uid, fromName: u.displayName||u.email.split('@')[0],
      fromEmail: u.email,
      to: toUid, toName: toName,
      status: 'pending', ts: FS.serverTimestamp()
    });
    if(btn){
      btn.textContent = '✓ Sent';
      btn.style.background = 'rgba(110,231,183,.3)';
      btn.style.color = '#059669';
      btn.disabled = true;
      btn.style.cursor = 'default';
    }
  }
  // open DM right away
  var userSnap = await db.collection('online').doc(toUid).get();
  var userData = userSnap.exists ? userSnap.data() : {};
  switchTab('dms');
  openDM(toName, aColor(userData.email||''), (toName||'?')[0].toUpperCase(), toUid, userData.email||'');
}
 
var unsubRequests = null;
var unsubFriends  = null;
var requestsFirstLoad = true; // used to skip toasts for requests that already existed when we connected

function listenFriendRequests(){
  var u = auth.currentUser; if(!u) return;
  if(unsubRequests) return; // stay subscribed across tab switches instead of resetting the "seen" state each time
  requestsFirstLoad = true;
  unsubRequests = db.collection('friendRequests')
    .where('to','==',u.uid).where('status','==','pending')
    .onSnapshot(function(snap){
      // notify only for requests that arrive AFTER we started listening — the very first
      // snapshot just reflects whatever was already pending, so it shouldn't toast
      if(!requestsFirstLoad){
        snap.docChanges().forEach(function(change){
          if(change.type === 'added'){
            var r = change.doc.data();
            showToast((r.fromName||'Someone') + ' ส่งคำขอเป็นเพื่อนคุณ 🤝');
          }
        });
      }
      requestsFirstLoad = false;
      updateFriendReqBadge(snap.size);

      var box = document.getElementById('friendRequests');
      if(!box) return;
      box.innerHTML = '';
      if(snap.empty){
        box.innerHTML = '<p style="font-size:.82rem;color:rgba(139,120,200,.4);font-style:italic;">No pending requests</p>';
        return;
      }
      snap.forEach(function(d){
        var r = d.data();
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:.7rem;padding:.65rem 1rem;border-radius:1rem;background:rgba(255,255,255,.6);border:1px solid rgba(199,210,254,.3);';
        div.innerHTML =
          '<div style="width:36px;height:36px;border-radius:50%;background:'+aColor(r.fromEmail)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;flex-shrink:0;">'+(r.fromName||'?')[0].toUpperCase()+'</div>'+
          '<div style="flex:1;min-width:0;">'+
            '<p style="font-size:.9rem;font-weight:600;color:#4338ca;">'+r.fromName+'</p>'+
            '<p style="font-size:.7rem;color:rgba(139,120,200,.55);">wants to be your friend</p>'+
          '</div>'+
          '<button onclick="acceptFriend(\''+d.id+'\',\''+r.from+'\',\''+r.fromName+'\',\''+r.fromEmail+'\')" style="padding:.35rem .8rem;border:none;border-radius:999px;background:linear-gradient(to right,#6ee7b7,#93c5fd);color:white;font-family:var(--h);font-style:italic;font-weight:700;font-size:.78rem;cursor:pointer;margin-right:.3rem;">Accept</button>'+
          '<button onclick="declineFriend(\''+d.id+'\')" style="padding:.35rem .8rem;border:none;border-radius:999px;background:rgba(248,113,113,.15);color:#f87171;font-family:var(--h);font-style:italic;font-weight:700;font-size:.78rem;cursor:pointer;">Decline</button>';
        box.appendChild(div);
      });
    });
}
 
async function acceptFriend(reqId, fromUid, fromName, fromEmail){
  var u = auth.currentUser; if(!u) return;
  var batch = db.batch();
  batch.update(db.collection('friendRequests').doc(reqId), { status:'accepted' });
  batch.set(db.collection('users').doc(u.uid).collection('friends').doc(fromUid), {
    uid:fromUid, name:fromName, email:fromEmail, ts:FS.serverTimestamp()
  });
  batch.set(db.collection('users').doc(fromUid).collection('friends').doc(u.uid), {
    uid:u.uid, name:u.displayName||u.email.split('@')[0], email:u.email, ts:FS.serverTimestamp()
  });
  await batch.commit();
  // auto open DM with new friend
  switchTab('dms');
  openDM(fromName, aColor(fromEmail), (fromName||'?')[0].toUpperCase(), fromUid, fromEmail);
}
 
async function declineFriend(reqId){
  await db.collection('friendRequests').doc(reqId).update({ status:'declined' });
}

// small badge (red dot with count) on the Friends nav button, so a pending
// request is visible even if you're not currently on the Friends tab
function updateFriendReqBadge(count){
  var btn = document.getElementById('tab-friends');
  if(!btn) return;
  btn.style.position = 'relative';
  var badge = document.getElementById('friendReqBadge');
  if(count > 0){
    if(!badge){
      badge = document.createElement('span');
      badge.id = 'friendReqBadge';
      badge.style.cssText = 'position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#f87171;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 2px white;';
      btn.appendChild(badge);
    }
    badge.textContent = count;
  } else if(badge){
    badge.remove();
  }
}

// lightweight toast, top-right, auto-dismisses — used for the "new friend request" alert
function showToast(message){
  var toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;top:18px;right:18px;z-index:9999;padding:.75rem 1.1rem;border-radius:1rem;'+
    'background:linear-gradient(135deg,#93c5fd,#f9a8d4);color:white;font-family:var(--h);font-weight:700;font-size:.85rem;'+
    'box-shadow:0 6px 20px rgba(120,100,200,.35);opacity:0;transform:translateY(-8px);transition:opacity .25s,transform .25s;max-width:280px;';
  document.body.appendChild(toast);
  requestAnimationFrame(function(){ toast.style.opacity='1'; toast.style.transform='translateY(0)'; });
  setTimeout(function(){
    toast.style.opacity='0'; toast.style.transform='translateY(-8px)';
    setTimeout(function(){ toast.remove(); }, 300);
  }, 4000);
}
 
async function removeFriend(friendUid){
  var u = auth.currentUser; if(!u) return;
  if(!confirm('Remove this friend?')) return;
  await db.collection('users').doc(u.uid).collection('friends').doc(friendUid).delete();
  await db.collection('users').doc(friendUid).collection('friends').doc(u.uid).delete();
}
 
function listenFriends(){
  var u = auth.currentUser; if(!u) return;
  if(unsubFriends) unsubFriends();
  unsubFriends = db.collection('users').doc(u.uid).collection('friends')
    .orderBy('ts','asc')
    .onSnapshot(function(snap){
      lastFriendsSnap = snap;
      renderFriendsList(snap);
    });
}

function renderFriendsList(snap){
      // update main Friends tab
      var box = document.getElementById('friendsList');
      if(box){
        box.innerHTML = '';
        if(snap.empty){
          box.innerHTML = '<p style="font-size:.82rem;color:rgba(139,120,200,.4);font-style:italic;">No friends yet — search and add some!</p>';
        } else {
          snap.forEach(function(d){
            var f = d.data();
            var div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:.7rem;padding:.65rem 1rem;border-radius:1rem;background:rgba(255,255,255,.6);border:1px solid rgba(199,210,254,.3);';
            div.innerHTML =
              '<div style="width:36px;height:36px;border-radius:50%;background:'+aColor(f.email)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white;flex-shrink:0;">'+(f.name||'?')[0].toUpperCase()+'</div>'+
              '<div style="flex:1;min-width:0;">'+
                '<p style="font-size:.9rem;font-weight:600;color:#4338ca;">'+f.name+'</p>'+
                '<p style="font-size:.7rem;color:rgba(139,120,200,.55);">'+f.email+'</p>'+
              '</div>'+
              '<button onclick="switchTab(\'dms\');openDM(\''+f.name+'\',\''+aColor(f.email)+'\',\''+(f.name||'?')[0].toUpperCase()+'\',\''+f.uid+'\',\''+f.email+'\')" style="padding:.35rem .8rem;border:none;border-radius:999px;background:linear-gradient(to right,#93c5fd,#f9a8d4);color:white;font-family:var(--h);font-style:italic;font-weight:700;font-size:.78rem;cursor:pointer;margin-right:.3rem;">💬 DM</button>'+
              '<button onclick="removeFriend(\''+f.uid+'\')" style="padding:.35rem .8rem;border:none;border-radius:999px;background:rgba(248,113,113,.15);color:#f87171;font-family:var(--h);font-style:italic;font-weight:700;font-size:.78rem;cursor:pointer;">Remove</button>';
            box.appendChild(div);
          });
        }
      }
 
      // update sidebar friends list
      var sidebar = document.getElementById('sidebarFriends');
      if(sidebar){
        sidebar.innerHTML = '';
        if(snap.empty){
          sidebar.innerHTML = '<p style="font-size:.75rem;color:rgba(139,120,200,.35);font-style:italic;">No friends yet</p>';
        } else {
          snap.forEach(function(d){
            var f = d.data();
            var div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;cursor:pointer;transition:background .2s;';
            div.onmouseover = function(){ this.style.background='rgba(255,255,255,.5)'; };
            div.onmouseout  = function(){ this.style.background='transparent'; };
            div.onclick = function(){ switchTab('dms'); openDM(f.name, aColor(f.email), (f.name||'?')[0].toUpperCase(), f.uid, f.email); };
            div.innerHTML =
              '<div style="width:28px;height:28px;border-radius:50%;background:'+aColor(f.email)+';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;flex-shrink:0;">'+(f.name||'?')[0].toUpperCase()+'</div>'+
              '<p style="font-size:12px;font-weight:600;color:#4338ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+f.name+'</p>';
            sidebar.appendChild(div);
          });
        }
      }
}
 
// ── Channels ──
var currentChannel = null;
var unsubChannel = null;
 
async function createChannel(){
  const name = prompt('Channel name:');
  if(!name||!name.trim()) return;
  const u = auth.currentUser; if(!u) return;
  await db.collection('channels').add({ name:name.trim(), createdBy:u.uid, createdByName:u.displayName||u.email.split('@')[0], ts:FS.serverTimestamp() });
}
 
function listenChannels(){
  db.collection('channels').orderBy('ts','asc').onSnapshot(function(snap){
    const list = document.getElementById('channelList');
    list.innerHTML = '';
    snap.forEach(function(d){
      const ch = d.data();
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:.7rem;padding:.65rem 1rem;border-radius:1rem;background:rgba(255,255,255,.5);cursor:pointer;transition:background .2s;border:1px solid rgba(199,210,254,.3);';
      div.onmouseover = function(){ this.style.background='rgba(255,255,255,.8)'; };
      div.onmouseout  = function(){ this.style.background='rgba(255,255,255,.5)'; };
      div.onclick = function(){ openChannel(d.id, ch.name); };
      div.innerHTML =
        '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#a5b4fc,#c084fc);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:.9rem;flex-shrink:0;">#</div>'+
        '<div style="flex:1;min-width:0;"><p style="font-size:.95rem;font-weight:600;color:#4338ca;">'+ ch.name +'</p>'+
        '<p style="font-size:.7rem;color:rgba(139,120,200,.55);">by '+ ch.createdByName +'</p></div>'+
        '<button onclick="deleteChannel(\''+d.id+'\',event)" style="padding:.3rem .7rem;border:none;border-radius:999px;background:rgba(248,113,113,.15);color:#f87171;font-size:.75rem;font-family:var(--h);font-style:italic;font-weight:700;cursor:pointer;flex-shrink:0;transition:background .2s;" onmouseover="this.style.background=\'rgba(248,113,113,.3)\'" onmouseout="this.style.background=\'rgba(248,113,113,.15)\'">Delete</button>';
      list.appendChild(div);
    });
    if(!list.children.length){
      list.innerHTML = '<p style="font-size:.85rem;color:rgba(139,120,200,.45);font-style:italic;text-align:center;padding:2rem;">No channels yet — create one!</p>';
    }
  });
}
 
async function deleteChannel(id, event){
  event.stopPropagation();
  if(!confirm('Delete this channel?')) return;
  await db.collection('channels').doc(id).delete();
  // close channel chat if currently open
  if(currentChannel === id){
    currentChannel = null;
    document.getElementById('channelChatArea').style.display = 'none';
  }
}
 
function openChannel(id, name){
  currentChannel = id;
  document.getElementById('channelChatName').textContent = name;
  const area = document.getElementById('channelChatArea');
  area.style.display = 'flex';
  if(unsubChannel) unsubChannel();
  const q = db.collection('channels').doc(id).collection('messages').orderBy('ts','asc');
  unsubChannel = q.onSnapshot(function(snap){
    const box = document.getElementById('channelMsgBox');
    const atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = '';
    snap.forEach(function(d){
      const m = d.data();
      const me = auth.currentUser && m.uid === auth.currentUser.uid;
      box.appendChild(renderMsg(m, me, '#a5b4fc', '#c084fc', 'channels/'+id+'/messages', d.id));
    });
    if(atBot) box.scrollTop = box.scrollHeight;
  });
}
 
async function sendChannelMsg(){
  if(!currentChannel) return;
  const u = auth.currentUser; if(!u) return;
  const inp = document.getElementById('channelMsgInp');
  const txt = inp.value.trim();
  const img = pendingImages.channel;
  if(!txt && !img) return;
  inp.value = ''; removeImg('channel');
  await db.collection('channels').doc(currentChannel).collection('messages').add({
    text:txt||'', image:img||null, email:u.email, name:u.displayName||u.email.split('@')[0], uid:u.uid, ts:FS.serverTimestamp()
  });
}
 
/* ═══════════════════════════════════════
   NAVBAR SCROLL
═══════════════════════════════════════ */
window.addEventListener('scroll', function(){
  const nav = document.getElementById('nav'); if(!nav) return;
  if(window.scrollY > 20){
    nav.classList.add('nav-glass');
    nav.style.paddingTop = '.7rem'; nav.style.paddingBottom = '.7rem';
  } else {
    nav.classList.remove('nav-glass');
    nav.style.paddingTop = '2rem'; nav.style.paddingBottom = '2rem';
  }
});
 
/* ═══════════════════════════════════════
   CLOUD RENDERER
═══════════════════════════════════════ */
const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');
function resize(){ cv.width=innerWidth; cv.height=innerHeight; }
resize(); window.addEventListener('resize', function(){ resize(); buildClouds(); });
 
function rng(seed){
  let s=seed>>>0;
  return function(){ s^=s<<13; s^=s>>17; s^=s<<5; return (s>>>0)/4294967296; };
}
 
function puff(cx,cy,rx,ry){
  ctx.save(); ctx.translate(cx,cy); ctx.scale(rx/100,ry/100);
  let g=ctx.createRadialGradient(0,0,38,0,0,106);
  g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.6,'rgba(255,255,255,.17)'); g.addColorStop(1,'rgba(255,255,255,.3)');
  ctx.beginPath(); ctx.arc(0,0,106,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  g=ctx.createRadialGradient(0,20,2,0,12,86);
  g.addColorStop(0,'rgba(178,183,218,.36)'); g.addColorStop(.5,'rgba(200,200,228,.16)'); g.addColorStop(1,'rgba(220,220,238,0)');
  ctx.beginPath(); ctx.arc(0,15,88,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  g=ctx.createRadialGradient(-9,-11,0,0,0,94);
  g.addColorStop(0,'rgba(255,255,255,.96)'); g.addColorStop(.35,'rgba(255,255,255,.82)'); g.addColorStop(.65,'rgba(255,255,255,.54)'); g.addColorStop(.85,'rgba(255,255,255,.26)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(0,-2,94,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  g=ctx.createRadialGradient(-18,-24,0,-12,-16,46);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.5,'rgba(255,255,255,.58)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(-12,-16,46,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.restore();
}
 
function mkCloud(seed,W,H){
  const r=rng(seed), sc=.6+r()*1.2, y=H*(.03+r()*.75), sp=8+r()*16, dir=r()<.5?1:-1;
  const bx=(80+r()*130)*sc, by=(48+r()*65)*sc, ps=[];
  const bc=3+Math.floor(r()*4);
  for(let i=0;i<bc;i++){const t=bc===1?.5:i/(bc-1);const ef=Math.max(.3,1-Math.pow(Math.abs(t-.5)*1.9,2.2));ps.push({ox:(t-.5)*bx*2.3+(r()-.5)*bx*.3,oy:by*.15,rx:bx*(.4+r()*.45)*ef,ry:by*(.45+r()*.35)*ef,z:0});}
  const mc=2+Math.floor(r()*3);
  for(let i=0;i<mc;i++){const t=mc===1?.5:i/(mc-1);const ef=Math.max(.3,1-Math.pow(Math.abs(t-.5)*1.7,2));ps.push({ox:(t-.5)*bx*1.5+(r()-.5)*bx*.2,oy:-by*(.28+r()*.28),rx:bx*(.38+r()*.38)*ef,ry:by*(.5+r()*.42)*ef,z:1});}
  const tc=1+Math.floor(r()*2);
  for(let i=0;i<tc;i++){const t=tc===1?.5:i/(tc-1);ps.push({ox:(t-.5)*bx*.8+(r()-.5)*bx*.15,oy:-by*(.7+r()*.4),rx:bx*(.22+r()*.28),ry:by*(.32+r()*.3),z:2});}
  ps.sort(function(a,b){return a.z-b.z||a.oy-b.oy;});
  const sx=dir===1?-(bx*3+r()*500):W+bx*2+r()*500;
  return {x:sx,y,sp,dir,ps,bx,op:.75+r()*.22,fo:r()*Math.PI*2,fa:(5+r()*11)*sc};
}
 
let clouds=[];
function buildClouds(){ clouds=[]; for(let i=0;i<8;i++) clouds.push(mkCloud(i*1913+53,cv.width,cv.height)); }
buildClouds();
 
const INTRO=6000; let last=null;
function draw(ts){
  if(!last) last=ts;
  const dt=Math.min((ts-last)/1e3,.05); last=ts;
  const t=Math.min(ts/INTRO,1), sm=1+(1-t)*4;
  ctx.clearRect(0,0,cv.width,cv.height);
  for(const c of clouds){
    c.x+=c.dir*c.sp*dt*sm;
    const span=c.bx*3.5+250;
    if(c.dir===1&&c.x>cv.width+span) c.x=-span;
    if(c.dir===-1&&c.x<-span) c.x=cv.width+span;
    const fy=Math.sin(ts*.00032+c.fo)*c.fa;
    ctx.globalAlpha=c.op;
    for(const p of c.ps) puff(c.x+p.ox,c.y+p.oy+fy,p.rx,p.ry);
    ctx.globalAlpha=1;
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
 
// init icons
lucide.createIcons();
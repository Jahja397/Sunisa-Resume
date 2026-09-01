// ═══════════════════════════════════════════════════════
//  MYHOLO — script.js  (clean rewrite)
// ═══════════════════════════════════════════════════════

// ── FIREBASE ─────────────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyAA0tcRLMJfPSJq6-N8g1SPPz0HHoOiDAU",
  authDomain: "myholo-app.firebaseapp.com",
  databaseURL: "https://myholo-app-default-rtdb.firebaseio.com",
  projectId: "myholo-app",
  storageBucket: "myholo-app.firebasestorage.app",
  messagingSenderId: "545689129226",
  appId: "1:545689129226:web:a3124b9e999ad8a9fa6af3"
});
const auth = firebase.auth();
const db   = firebase.database();

// ── STATE ─────────────────────────────────────────────────
let me        = null;
let curPage   = 'landing';
let authTab   = 'signup';
let curRoom   = null;
let msgOff    = null;
let notifOffs = [];
let dmStore   = {};
let botHistory = [];

// ── CONSTANTS ─────────────────────────────────────────────
const ROOMS = [
  {id:'global',  name:'#GlobalChat',    tag:'MAIN HUB',   icon:'🌍', grad:'var(--blue-grad)'},
  {id:'y2k',     name:'#Y2K_Nostalgia', tag:'OLD VIBES',  icon:'💿', grad:'var(--purple-grad)'},
  {id:'gaming',  name:'#GamingHub',     tag:'PIXEL PLAY', icon:'🎮', grad:'var(--blue-grad)'},
  {id:'music',   name:'#MusicLounge',   tag:'BEATS',      icon:'🎧', grad:'var(--pink-grad)'},
  {id:'art',     name:'#ArtGallery',    tag:'ART SPACE',  icon:'🎨', grad:'var(--orange-grad)'},
  {id:'friends', name:'#MeetFriends',   tag:'SOCIAL',     icon:'🤝', grad:'var(--green-grad)'},
  {id:'dating',  name:'#DatingRoom',    tag:'LOVE SPACE', icon:'❤️', grad:'var(--pink-grad)'},
  {id:'lgbtq',   name:'#LGBTQ+',        tag:'PRIDE',      icon:'🏳️‍🌈', grad:'var(--purple-grad)'},
  {id:'help',    name:'#HelpCenter',    tag:'SUPPORT',    icon:'🆘', grad:'var(--blue-grad)'},
  {id:'bot',     name:'#HoloBot',       tag:'AI CHAT',    icon:'🤖', grad:'linear-gradient(135deg,#6366f1,#a855f7)', isBot:true},
];

const EMOJIS = [
  '😀','😂','🥹','😍','🥰','😘','😎','🤩','😭','😤','😡','🥺','😴','🤔','😏','🤭','🫡','🥳','😈','👻',
  '👋','🤝','👏','🙌','💪','✌️','🤞','👍','❤️','🫶','💅','🙏','🫂','👀','💁','🤷',
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🦋','🐝','🦄','🐙','🦈','🐳',
  '🌸','🌺','🌻','🌈','⭐','🌙','☀️','❄️','🔥','💧','🌊','🍃','🌿','🌵','🍄','🪐',
  '🍕','🍔','🍜','🍣','🍰','🎂','🧁','🍩','🍪','🍫','🧋','☕','🍵','🥤','🍓','🍒',
  '🎮','🎵','🎨','📸','🎀','🎁','🎉','🎊','💿','📱','💻','🎧','🕹️','🎯','🏆','👑',
  '✨','✦','✿','♡','★','☠','♫','⚡','💖','🫧','💫','🌟','💎','🔮','🪄','⚗️'
];

// ── HELPERS ───────────────────────────────────────────────
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function toast(msg, dur=3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg; t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display='none', dur);
}

function avt(u, size=50) {
  const letter = (u.username||'?')[0].toUpperCase();
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${u.grad||'var(--pink-grad)'};font-size:${Math.round(size*.44)}px;">${letter}</div>`;
}

function dmKey(a, b) { return [a,b].sort().join('__'); }

function fbErr(e) {
  const m = {
    'auth/email-already-in-use':'Email already used!',
    'auth/invalid-email':'Invalid email!',
    'auth/weak-password':'Password min 6 chars!',
    'auth/user-not-found':'User not found!',
    'auth/wrong-password':'Wrong password!',
    'auth/invalid-credential':'Wrong email or password!'
  };
  return m[e.code] || e.message || 'Something went wrong!';
}

function getChatKey() {
  if (!me || !curRoom) return null;
  if (curPage === 'dm') {
    if (!curRoom.uid) return null;
    return dmKey(me.uid, curRoom.uid);
  }
  if (!curRoom.id) return null;
  return 'room__' + curRoom.id;
}

// ── NAVIGATION ────────────────────────────────────────────
function goPage(page, room) {
  if (msgOff) { msgOff(); msgOff = null; }
  curPage = page;
  if (room !== undefined) curRoom = room;
  render();
  window.scrollTo(0, 0);
}

function openRoom(i) {
  curRoom = ROOMS[i];
  goPage('room');
}

function openDM(key) {
  const u = dmStore[key];
  if (!u) { toast('Cannot open chat'); return; }
  curRoom = u;
  goPage('dm');
}

function openPrivateBot() {
  // private bot room = unique per user
  curRoom = {
    id: 'bot_' + me.uid,
    name: '#HoloBot',
    isBot: true,
    isPrivateBot: true
  };
  goPage('room');
}

function setAuthTab(t) {
  authTab = t;
  goPage('auth');
}

// ── AUTH ──────────────────────────────────────────────────
async function handleAuth() {
  const btn = document.getElementById('auth-btn');
  if (btn) { btn.disabled=true; btn.textContent='Loading...'; }
  try {
    if (authTab === 'signup') {
      const un = document.getElementById('f-un')?.value?.trim();
      const em = document.getElementById('f-em')?.value?.trim();
      const pw = document.getElementById('f-pw')?.value;
      if (!un||!em||!pw) { toast('Fill all fields!'); return; }
      if (un.length < 3)  { toast('Username too short!'); return; }
      const snap = await db.ref('usernames/'+un.toLowerCase()).get();
      if (snap.exists()) { toast('Username taken! ♡'); return; }
      const cred = await auth.createUserWithEmailAndPassword(em, pw);
      const uid  = cred.user.uid;
      const code = (un[0]+un.slice(-1)).toUpperCase()+Math.floor(1000+Math.random()*9000);
      const profile = {
        uid, username:un, email:em, code,
        c1:'#ff9cdb', c2:'#82ccff',
        grad:'linear-gradient(135deg,#ff9cdb,#82ccff)',
        caption:'Welcome to my digital space ✨',
        bio:'Holographic heart.',
        friends:{}, createdAt:Date.now()
      };
      await db.ref('users/'+uid).set(profile);
      await db.ref('usernames/'+un.toLowerCase()).set(uid);
      me = profile;
      goPage('home');
    } else {
      const lid = document.getElementById('f-lid')?.value?.trim();
      const pw  = document.getElementById('f-pw')?.value;
      if (!lid||!pw) { toast('Fill all fields!'); return; }
      let email = lid;
      if (!lid.includes('@')) {
        const s = await db.ref('usernames/'+lid.toLowerCase()).get();
        if (!s.exists()) { toast('User not found!'); return; }
        const us = await db.ref('users/'+s.val()).get();
        if (!us.exists()) { toast('User not found!'); return; }
        email = us.val().email;
      }
      const cred = await auth.signInWithEmailAndPassword(email, pw);
      const s = await db.ref('users/'+cred.user.uid).get();
      me = s.val();
      goPage('home');
    }
  } catch(e) {
    toast(fbErr(e));
  } finally {
    if (btn) { btn.disabled=false; btn.textContent = authTab==='signup'?'Create Page ✦':'Login ♡'; }
  }
}

async function doLogout() {
  notifOffs.forEach(f=>f()); notifOffs=[];
  if (msgOff) { msgOff(); msgOff=null; }
  await auth.signOut();
  me=null; curRoom=null; botHistory=[];
  goPage('landing');
}

// ── PROFILE ───────────────────────────────────────────────
async function saveProfile() {
  me.c1      = document.getElementById('ec1').value;
  me.c2      = document.getElementById('ec2').value;
  me.grad    = `linear-gradient(135deg,${me.c1},${me.c2})`;
  me.caption = document.getElementById('ecap').value;
  me.bio     = document.getElementById('ebio').value;
  await db.ref('users/'+me.uid).update({c1:me.c1,c2:me.c2,grad:me.grad,caption:me.caption,bio:me.bio});
  toast('Saved! ✨');
  goPage('profile');
}

// ── FRIENDS ───────────────────────────────────────────────
async function addFriend(targetUid) {
  if (!me||!targetUid||targetUid===me.uid) return;
  me.friends = me.friends||{};
  if (me.friends[targetUid]) {
    const s = await db.ref('users/'+targetUid).get();
    if (s.exists()) { curRoom=s.val(); goPage('dm'); }
    return;
  }
  try {
    await db.ref(`users/${me.uid}/friends`).update({[targetUid]:true});
    me.friends[targetUid] = true;
    db.ref(`users/${targetUid}/friends`).update({[me.uid]:true}).catch(()=>{});
    toast('Friend added! ♡');
    const s = await db.ref('users/'+targetUid).get();
    if (s.exists()) { curRoom=s.val(); goPage('dm'); }
  } catch(e) { toast('Error: '+fbErr(e)); }
}

// ── MESSAGING ─────────────────────────────────────────────
async function sendMsg() {
  const inp = document.getElementById('cinp');
  if (!inp || !me || !curRoom) return;
  const txt = inp.value.trim();
  if (!txt) return;
  const key = getChatKey();
  if (!key) return;
  inp.value = '';
  try {
    await db.ref('messages/'+key).push({
      uid:me.uid, name:me.username, code:me.code||'',
      grad:me.grad||'', text:txt, ts:Date.now()
    });
    // trigger bot reply if in bot room
    if (curRoom.isBot || curRoom.id === 'bot') {
      setTimeout(() => askBot(txt), 600);
    }
  } catch(e) {
    toast('Send failed: '+fbErr(e));
    inp.value = txt;
  }
}

function toggleEmojiPicker() {
  const p = document.getElementById('epick');
  if (p) p.classList.toggle('hidden');
}

function pickEmoji(e) {
  const inp = document.getElementById('cinp');
  if (inp) { inp.value += e; inp.focus(); }
}

function triggerImageUpload() {
  document.getElementById('img-input')?.click();
}

async function handleImageUpload(input) {
  const file = input.files?.[0];
  if (!file||!me||!curRoom) return;
  if (file.size > 1.5*1024*1024) { toast('Image too large! max 1.5MB'); return; }
  const key = getChatKey(); if (!key) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      await db.ref('messages/'+key).push({
        uid:me.uid, name:me.username, code:me.code||'',
        grad:me.grad||'', text:'', img:e.target.result, ts:Date.now()
      });
    } catch(err) { toast('Image failed: '+fbErr(err)); }
  };
  reader.readAsDataURL(file);
  input.value = '';
}

async function deleteMsg(msgKey) {
  if (!confirm('ลบข้อความนี้?')) return;
  const key = getChatKey();
  if (!key) return;
  try {
    await db.ref('messages/'+key+'/'+msgKey).remove();
  } catch(e) { toast('ลบไม่ได้: '+fbErr(e)); }
}

// ── MESSAGE LISTENER ──────────────────────────────────────
function renderMsgs(msgs) {
  const el = document.getElementById('msgs');
  if (!el) return;
  msgs.sort((a,b) => (a.ts||0)-(b.ts||0));
  if (!msgs.length) {
    el.innerHTML = '<p style="text-align:center;opacity:.3;font-size:12px;margin-top:40px;">No messages yet. Say hi! 👋</p>';
    return;
  }
  el.innerHTML = msgs.map(m => {
    const isSelf   = m.uid === me.uid;
    const isBot    = m.uid === 'holobot' || !!m.isBot;
    const isFriend = !!(me.friends||{})[m.uid];
    const t = new Date(m.ts||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const addBtn = !isSelf && !isFriend && !isBot
      ? `<button onclick="addFriend('${esc(m.uid)}')" style="background:var(--pink-grad);color:#fff;border:none;border-radius:20px;padding:2px 8px;font-size:9px;cursor:pointer;font-family:'Pixelify Sans';">+Add</button>`
      : isFriend && !isSelf && !isBot ? `<span style="font-size:9px;opacity:.35;">✓</span>` : '';
    const delBtn = isSelf && m._key
      ? `<button onclick="deleteMsg('${esc(m._key)}')" class="del-btn" style="background:none;border:none;cursor:pointer;opacity:0;font-size:11px;color:#f43f5e;padding:0 2px;transition:opacity .2s;">🗑</button>`
      : '';
    const botStyle = isBot ? 'background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.08));border:1px solid rgba(99,102,241,.2);' : '';
    const botBadge = isBot ? `<span style="background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border-radius:20px;padding:1px 7px;font-size:8px;margin-left:4px;">AI ✦</span>` : '';
    const img = m.img ? `<img src="${m.img}" style="max-width:100%;max-height:200px;border-radius:10px;margin-top:6px;display:block;" onerror="this.style.display='none'">` : '';
    const txt = m.text ? `<div style="word-break:break-word;margin-top:3px;">${esc(m.text)}</div>` : '';
    return `<div class="bubble ${isSelf?'bub-r':'bub-l'}" style="${botStyle}"
      onmouseover="const b=this.querySelector('.del-btn');if(b)b.style.opacity='1';"
      onmouseout="const b=this.querySelector('.del-btn');if(b)b.style.opacity='0';">
      <div class="bub-meta">
        <span style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
          <span class="bub-name" style="${isBot?'color:#6366f1;':''}" onclick="addFriend('${esc(m.uid)}')">${isBot?'🤖 ':''} @${esc(m.name||'?')}</span>
          <span style="opacity:.35;font-size:9px;">#${esc(m.code||'')}</span>
          ${botBadge}${addBtn}
        </span>
        <span style="display:flex;align-items:center;gap:4px;">${delBtn}${t}</span>
      </div>${txt}${img}
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function startMsgListener() {
  if (msgOff) { msgOff(); msgOff=null; }
  const key = getChatKey();
  if (!key) return;
  const el = document.getElementById('msgs');
  if (!el) return;
  const ref = db.ref('messages/'+key);
  function handler(snap) {
    const msgs = [];
    snap.forEach(c => { const v=c.val(); if(v) msgs.push({...v, _key:c.key}); });
    renderMsgs(msgs);
  }
  ref.on('value', handler);
  msgOff = () => ref.off('value', handler);
}

// ── BOT ───────────────────────────────────────────────────
async function askBot(userText) {
  botHistory.push({role:'user', content:userText});
  if (botHistory.length > 20) botHistory = botHistory.slice(-20);
  const el = document.getElementById('bot-typing');
  if (el) el.style.display = 'flex';
  await new Promise(r => setTimeout(r, 800 + Math.random()*700));
  const reply = getBotReply(userText);
  botHistory.push({role:'assistant', content:reply});
  const key = getChatKey();
  if (key) {
    await db.ref('messages/'+key).push({
      uid:'holobot', name:'HoloBot', code:'AI✦',
      grad:'linear-gradient(135deg,#6366f1,#a855f7)',
      text:reply, ts:Date.now(), isBot:true
    });
  }
  const el2 = document.getElementById('bot-typing');
  if (el2) el2.style.display = 'none';
}

function getBotReply(text) {
  const t = text.toLowerCase().trim();
  if (/^(hi|hello|hey|สวัสดี|หวัดดี|ดีจ้า|ดีค่ะ|ดีครับ|yo|sup)/.test(t))
    return ['สวัสดีค่ะ! ยินดีต้อนรับสู่ HoloBot ✦ มีอะไรให้ช่วยไหมคะ?','หวัดดีค่า! ✿ วันนี้เป็นยังไงบ้างคะ?','Hello! ♡ I\'m HoloBot, your Y2K AI companion!'][Math.floor(Math.random()*3)];
  if (/(เป็นยังไง|สบายดี|how are you|what's up)/.test(t))
    return ['สบายดีค่า ขอบคุณที่ถามนะคะ ✦ แล้วคุณล่ะคะ?','I\'m doing great! ★ Living my best Y2K life~ How about you?'][Math.floor(Math.random()*2)];
  if (/(ชื่ออะไร|your name|who are you|คุณคือ)/.test(t))
    return 'ฉันชื่อ HoloBot ค่า ✦ เป็น AI น้อยๆ ที่อาศัยอยู่ใน MYHOLO! พร้อมคุยทุกเรื่องเลยนะคะ ♡';
  if (/(เพลง|music|song|ฟัง|listen)/.test(t))
    return ['ชอบเพลงแนวไหนคะ? ♫ ฉันชอบ Y2K pop มากเลย ✦','Music is life! ♡ What genre do you vibe with?'][Math.floor(Math.random()*2)];
  if (/(เกม|game|เล่น|play|gaming)/.test(t))
    return ['เกมอะไรที่กำลังเล่นอยู่คะ? 🎮 ฉันเป็นแฟน retro games ค่า ✦','Gaming is so fun! 🕹️ What are you playing lately?'][Math.floor(Math.random()*2)];
  if (/(อาหาร|food|กิน|eat|หิว|hungry|ข้าว)/.test(t))
    return ['หิวข้าวหรอคะ? 🍜 วันนี้กินอะไรอร่อยๆ บ้างคะ? ✦','Food talk! 🍕 What\'s your fave food? ✦'][Math.floor(Math.random()*2)];
  if (/(รัก|love|แฟน|boyfriend|girlfriend|crush|ชอบ)/.test(t))
    return ['อ้าวว เรื่องความรักเหรอคะ ♡ เล่าให้ฟังได้นะคะ ✦','Love is in the air~ ♡ Tell me more! ✿'][Math.floor(Math.random()*2)];
  if (/(เศร้า|sad|เครียด|stress|ไม่สบาย|เหนื่อย|tired)/.test(t))
    return 'โอ้โห รู้สึกแบบนั้นได้เลยนะคะ ♡ อย่าลืมพักผ่อนด้วยนะคะ คุณทำได้ดีมากเลย ✦';
  if (/(ดีใจ|happy|สนุก|fun|เย้|yay|เฮ)/.test(t))
    return ['เย้! ดีใจด้วยค่า ✦ อะไรทำให้ดีใจคะ?','Yay that\'s amazing! ★ Tell me what happened! ♡'][Math.floor(Math.random()*2)];
  if (/(ตลก|joke|เล่าเรื่อง|funny)/.test(t))
    return 'ทำไมโปรแกรมเมอร์ถึงชอบดื่มกาแฟ? ☕ เพราะ Java! 😂 ✦ (โทษทีค่า มุกแย่มาก 555)';
  if (/(ขอบคุณ|thank|thanks|thx)/.test(t))
    return ['ยินดีเลยค่า ♡ มีอะไรให้ช่วยอีกบอกได้นะคะ ✦','Aww you\'re so sweet! ✿ Anytime ♡'][Math.floor(Math.random()*2)];
  if (/(bye|ลาก่อน|บาย|แล้วเจอกัน)/.test(t))
    return 'บาย บายค่า ♡ แวะมาคุยใหม่ได้เสมอนะคะ ✦ HoloBot รออยู่ค่า~';
  if (/(myholo|แอป|เว็บ)/.test(t))
    return 'MYHOLO เป็นแอปแชท Y2K สุดคิ้วท์เลยค่า ✦ มีห้องแชทหลายห้อง DM เพื่อน และแน่นอน... มีฉัน HoloBot ♡';
  const defaults = [
    'น่าสนใจมากเลยค่า! ✦ บอกเพิ่มเติมได้นะคะ ♡',
    'อืมม... นั่นเป็นมุมมองที่ดีนะคะ ✿',
    'โอ้โห จริงๆ เหรอคะ! ★ ฉันไม่เคยคิดแบบนั้นเลย',
    'Interesting! ✦ Tell me more about that ♡',
    'That\'s so cool! ★ I love hearing your thoughts ✿',
    'ฮ่าๆ ✦ คุณทำให้ฉันยิ้มได้เลยนะคะ ♡',
    'I hear you~ ♡ What else is on your mind? ✦',
  ];
  return defaults[Math.floor(Math.random()*defaults.length)];
}

// ── SEARCH ────────────────────────────────────────────────
async function doSearch() {
  const q = document.getElementById('sq')?.value?.trim().toLowerCase()||'';
  const res = document.getElementById('res'); if (!res) return;
  if (!q) { res.innerHTML=''; return; }
  res.innerHTML = '<p style="text-align:center;opacity:.4;padding:22px;font-size:12px;">Searching... ✦</p>';
  const snap = await db.ref('users').get();
  if (!snap.exists()) { res.innerHTML='<p style="text-align:center;opacity:.4;padding:22px;">No one found 🌌</p>'; return; }
  const clean = q.startsWith('#') ? q.slice(1) : q;
  const found = [];
  snap.forEach(c => { const u=c.val(); if(u.username?.toLowerCase().includes(q)||u.code?.toLowerCase().includes(clean)) found.push(u); });
  if (!found.length) { res.innerHTML='<p style="text-align:center;opacity:.4;padding:22px;">No holographic souls found 🌌</p>'; return; }
  const fl = me.friends||{};
  res.innerHTML = found.map(u => {
    const isMe=u.uid===me.uid, isFriend=!!fl[u.uid];
    return `<div class="person-row">${avt(u,52)}
      <div style="flex:1;"><div style="font-family:'Pixelify Sans';font-size:18px;">@${esc(u.username)}</div><div style="font-size:10px;opacity:.4;">#${esc(u.code)}</div></div>
      ${isMe?`<span style="color:var(--pink);font-size:12px;">You ✦</span>`:`<button class="btn ${isFriend?'btn-primary':'btn-secondary'}" style="padding:7px 14px;font-size:13px;" onclick="addFriend('${esc(u.uid)}')">${isFriend?'Chat ♡':'+Add Friend'}</button>`}
    </div>`;
  }).join('');
}

// ── DM NOTIFICATIONS ──────────────────────────────────────
function startNotifListeners() {
  notifOffs.forEach(f=>f()); notifOffs=[];
  if (!me) return;
  Object.keys(me.friends||{}).forEach(uid => {
    const key = dmKey(me.uid, uid);
    let last = Date.now();
    const ref = db.ref('messages/'+key).limitToLast(1);
    const handler = ref.on('value', snap => {
      snap.forEach(c => {
        const m = c.val();
        if (m && m.uid!==me.uid && m.ts>last) {
          last = m.ts;
          if (!(curPage==='dm' && curRoom?.uid===uid)) showDMNotif(m.name, m.text||'📷 Image', uid);
        }
      });
    });
    notifOffs.push(() => ref.off('value', handler));
  });
}

function showDMNotif(name, text, uid) {
  const badge = document.getElementById('inbox-badge');
  if (badge) badge.style.display = 'inline-block';
  toast(`<b style="color:var(--pink);">💬 @${esc(name)}</b><br><span style="font-size:11px;">${esc(text.slice(0,50))}</span>
    <button onclick="openDMByUid('${esc(uid)}')" style="margin-left:6px;background:var(--pink-grad);color:#fff;border:none;border-radius:10px;padding:3px 10px;font-size:11px;cursor:pointer;">Open</button>`, 5000);
  if (Notification.permission==='granted') new Notification('💬 @'+name, {body:text.slice(0,60)});
}

async function openDMByUid(uid) {
  const s = await db.ref('users/'+uid).get();
  if (s.exists()) { curRoom=s.val(); goPage('dm'); }
}

// ── RENDER ────────────────────────────────────────────────
function render() {
  const appEl = document.getElementById('app');
  const nav   = document.getElementById('navbar');
  if (!appEl || !nav) return;
  appEl.innerHTML = '';
  const isAuth = ['landing','auth'].includes(curPage);
  nav.classList.toggle('hidden', isAuth);
  if (!me && !isAuth) { curPage='landing'; nav.classList.add('hidden'); }

  // ── LANDING ──
  if (curPage==='landing') {
    appEl.innerHTML=`<div class="hero" style="animation:fadeUp .7s ease">
      <div class="badge"><span class="dot"></span> est. 2026 · global y2k hub · Firebase</div>
      <h1 class="hero-title">make a page.<br>find your<br>people.</h1>
      <div class="hero-btns">
        <button class="btn btn-primary" onclick="setAuthTab('signup')">✦ Sign Up</button>
        <button class="btn btn-secondary" onclick="setAuthTab('login')">♡ Log In</button>
      </div></div>`;

  // ── AUTH ──
  } else if (curPage==='auth') {
    appEl.innerHTML=`<div class="auth-wrap" style="animation:fadeUp .5s ease">
      <div class="logo-icon">✦</div>
      <h1 style="font-family:'Pixelify Sans';font-size:36px;color:var(--purple);margin-bottom:20px;">MYHOLO</h1>
      <div class="glass-card">
        <div class="tabs">
          <button class="tab ${authTab==='signup'?'active':''}" onclick="setAuthTab('signup')">✨ Sign Up</button>
          <button class="tab ${authTab==='login'?'active':''}" onclick="setAuthTab('login')">♡ Log In</button>
        </div>
        ${authTab==='signup'
          ?`<div class="inp-group"><label>Username</label><input id="f-un" class="fld" placeholder="cool_pixel" autocomplete="off"></div>
            <div class="inp-group"><label>Email</label><input id="f-em" class="fld" type="email" placeholder="you@gmail.com"></div>`
          :`<div class="inp-group"><label>Username or Email</label><input id="f-lid" class="fld" placeholder="username or email"></div>`}
        <div class="inp-group"><label>Password</label><input id="f-pw" class="fld" type="password" placeholder="••••••" onkeydown="if(event.key==='Enter')handleAuth()"></div>
        <button id="auth-btn" class="btn btn-primary btn-full" onclick="handleAuth()">${authTab==='signup'?'Create Page ✦':'Login ♡'}</button>
      </div></div>`;

  // ── HOME ──
  } else if (curPage==='home' && me) {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <div class="card" style="display:flex;align-items:center;gap:20px;background:linear-gradient(135deg,rgba(255,156,219,.07),rgba(130,204,255,.07));margin-bottom:16px;">
        ${avt(me,76)}
        <div style="flex:1;">
          <h2 style="font-family:'Pixelify Sans';font-size:23px;">hey <span style="color:var(--blue);">@${esc(me.username)}</span> ✿</h2>
          <p style="opacity:.45;font-size:11px;">Your ID: <b>#${esc(me.code)}</b></p>
        </div>
        <button class="btn btn-primary" style="padding:8px 16px;font-size:13px;" onclick="goPage('profile')">my page →</button>
      </div>
      <div style="background:rgba(74,222,128,.07);border:1px dashed rgba(74,222,128,.4);border-radius:22px;padding:14px 18px;margin-bottom:10px;display:flex;gap:12px;align-items:center;">
        <span style="font-size:20px;">🌐</span>
        <div><p style="font-weight:700;font-size:13px;color:#16a34a;">Live & Real-time ✦</p>
        <p style="font-size:11px;opacity:.6;">Messages sync instantly across all devices via Firebase.</p></div>
      </div>
      <div style="background:rgba(251,191,36,.07);border:1px dashed rgba(251,191,36,.45);border-radius:22px;padding:14px 18px;margin-bottom:26px;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:20px;">⚠️</span>
        <div><p style="font-weight:700;font-size:13px;color:#b45309;">Chat History Notice</p>
        <p style="font-size:11px;line-height:1.65;opacity:.7;">Only the <b>last 80 messages</b> are shown per room — applies to both Global Rooms and Private DMs.</p></div>
      </div>
      <div class="feat-grid">
        <div class="feat-card" onclick="goPage('chat_lobby')"><div class="icon-box" style="background:var(--pink-grad)">💬</div><div class="feat-title">World Chat</div><div class="feat-desc">talk to everyone, live</div></div>
        <div class="feat-card" onclick="goPage('inbox')"><div class="icon-box" style="background:var(--purple-grad)">✉</div><div class="feat-title">Inbox</div><div class="feat-desc">private DMs with friends</div></div>
        <div class="feat-card" onclick="goPage('find')"><div class="icon-box" style="background:var(--blue-grad)">🔍</div><div class="feat-title">Find People</div><div class="feat-desc">search by name or #id</div></div>
        <div class="feat-card" onclick="openPrivateBot()" style="border:1.5px solid rgba(99,102,241,.2);">
          <div class="icon-box" style="background:linear-gradient(135deg,#6366f1,#a855f7)">🤖</div>
          <span style="font-size:10px;opacity:.5;letter-spacing:.8px;text-transform:uppercase;">AI CHAT · PRIVATE</span>
          <div class="feat-title" style="color:#6366f1;">#HoloBot</div>
          <div class="feat-desc">your private AI chat ✦</div>
        </div>
      </div></div>`;

  // ── CHAT LOBBY ──
  } else if (curPage==='chat_lobby') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;">
        <h1 style="font-family:'Pixelify Sans';color:var(--pink);font-size:26px;">Global Rooms</h1>
        <div style="background:#4ade80;color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;"><span class="dot"></span>Live</div>
      </div>
      <div class="feat-grid">${ROOMS.map((r,i)=>`
        <div class="feat-card" onclick="openRoom(${i})">
          <div class="icon-box" style="background:${r.grad}">${r.icon}</div>
          <span style="font-size:10px;opacity:.5;letter-spacing:.8px;text-transform:uppercase;">${r.tag}</span>
          <div class="feat-title">${r.name}</div>
          <div class="feat-desc">Click to join ✦</div>
        </div>`).join('')}
      </div></div>`;

  // ── ROOM / DM ──
  } else if ((curPage==='room'||curPage==='dm') && curRoom) {
    const title = curPage==='dm' ? `@${esc(curRoom.username)}` : esc(curRoom.name);
    const back  = curPage==='dm' ? 'inbox' : 'chat_lobby';
    const isBot = curRoom.isBot || curRoom.id==='bot';
    appEl.innerHTML=`<div class="chat-wrap" style="animation:fadeUp .4s ease;">
      <div class="chat-head">
        <button onclick="goPage('${back}')" style="background:none;border:none;color:#fff;cursor:pointer;font-size:13px;">← Back</button>
        <b style="font-family:'VT323';font-size:22px;">${isBot?'🤖 ':''}${title}</b>
        <span style="font-size:11px;"><span class="dot"></span>Live</span>
      </div>
      <div class="chat-msgs" id="msgs">
        <p style="text-align:center;opacity:.3;font-size:12px;margin-top:40px;">Loading... ✦</p>
      </div>
      ${isBot?`<div id="bot-typing" style="display:none;padding:8px 20px;align-items:center;gap:8px;background:#fff;border-top:1px solid #f0f0f0;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;font-size:14px;">🤖</div>
        <div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);padding:8px 14px;border-radius:16px;font-size:12px;color:#6366f1;">
          HoloBot กำลังพิมพ์ <span style="animation:pulse .8s infinite;">•</span><span style="animation:pulse .8s infinite;animation-delay:.2s;">•</span><span style="animation:pulse .8s infinite;animation-delay:.4s;">•</span>
        </div></div>`:''}
      <div class="chat-foot">
        <button onclick="toggleEmojiPicker()" style="background:none;border:none;cursor:pointer;font-size:20px;">😀</button>
        <button onclick="triggerImageUpload()" style="background:none;border:none;cursor:pointer;font-size:20px;">🖼️</button>
        <input type="file" id="img-input" accept="image/*" style="display:none" onchange="handleImageUpload(this)">
        <input id="cinp" class="chat-inp" placeholder="Say something..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}">
        <button class="send-btn" onclick="sendMsg()">Send</button>
      </div>
      <div id="epick" class="hidden" style="position:absolute;bottom:72px;left:6px;right:6px;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-radius:20px;padding:12px;display:grid;grid-template-columns:repeat(8,1fr);gap:6px;z-index:50;box-shadow:0 10px 40px rgba(0,0,0,.1);max-height:190px;overflow-y:auto;">
        ${EMOJIS.map(e=>`<button onclick="pickEmoji('${e}')" style="background:none;border:none;cursor:pointer;font-size:20px;padding:3px;">${e}</button>`).join('')}
      </div></div>`;
    setTimeout(startMsgListener, 500);

  // ── FIND ──
  } else if (curPage==='find') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <h1 style="font-family:'Pixelify Sans';color:var(--pink);font-size:26px;margin-bottom:22px;">✦ Find People</h1>
      <div class="search-pill">
        <input id="sq" placeholder="Search by name or #ID" oninput="doSearch()" onkeydown="if(event.key==='Enter')doSearch()">
        <button onclick="doSearch()">Search ✦</button>
      </div>
      <div id="res"></div></div>`;

  // ── INBOX ──
  } else if (curPage==='inbox') {
    const badge = document.getElementById('inbox-badge');
    if (badge) badge.style.display='none';
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <h1 style="font-family:'Pixelify Sans';color:var(--pink);font-size:26px;margin-bottom:22px;">✦ My Inbox</h1>
      <div class="card" id="inbox-list"><p style="text-align:center;opacity:.4;font-size:12px;padding:22px;">Loading... ✦</p></div>
    </div>`;
    loadInbox();

  // ── PROFILE ──
  } else if (curPage==='profile' && me) {
    appEl.innerHTML=`<div class="prof-grid" style="animation:fadeUp .5s ease">
      <div><div class="card" style="text-align:center;">
        <div style="width:100%;aspect-ratio:1;border-radius:22px;background:${me.grad};display:flex;align-items:center;justify-content:center;font-family:'VT323';font-size:80px;color:#fff;">${esc(me.username[0].toUpperCase())}</div>
        <h2 style="font-family:'Pixelify Sans';font-size:22px;margin:14px 0 4px;">${esc(me.username)}</h2>
        <p style="font-size:11px;opacity:.4;margin-bottom:10px;">#${esc(me.code)}</p>
        <p style="font-style:italic;font-size:12px;border:1px dashed var(--pink);padding:9px;border-radius:12px;opacity:.8;">"${esc(me.caption)}"</p>
        <button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="goPage('edit')">Edit Profile</button>
      </div></div>
      <div>
        <div class="card"><h3 style="font-family:'Pixelify Sans';color:var(--pink);margin-bottom:10px;">✦ Bio</h3><p style="line-height:1.7;font-size:13px;">${esc(me.bio)}</p></div>
        <div class="card" id="friends-card"><h3 style="font-family:'Pixelify Sans';color:var(--pink);margin-bottom:14px;">✦ Friends</h3><p style="opacity:.4;font-size:12px;">Loading...</p></div>
      </div></div>`;
    loadFriends();

  // ── EDIT ──
  } else if (curPage==='edit' && me) {
    appEl.innerHTML=`<div class="card" style="max-width:600px;margin:0 auto;animation:fadeUp .5s ease">
      <h2 style="font-family:'Pixelify Sans';color:var(--pink);font-size:24px;margin-bottom:20px;">🎨 Design Your Space</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div><label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;margin-bottom:5px;">Color 1</label><input type="color" id="ec1" class="fld" style="padding:4px;height:46px;" value="${me.c1}"></div>
        <div><label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;margin-bottom:5px;">Color 2</label><input type="color" id="ec2" class="fld" style="padding:4px;height:46px;" value="${me.c2}"></div>
      </div>
      <div class="inp-group"><label>Caption</label><input id="ecap" class="fld" value="${esc(me.caption)}"></div>
      <div class="inp-group"><label>Bio</label><textarea id="ebio" class="fld" style="height:90px;">${esc(me.bio)}</textarea></div>
      <button class="btn btn-primary btn-full" onclick="saveProfile()">Save Changes ✦</button>
    </div>`;
  }
}

// ── LOADERS ───────────────────────────────────────────────
async function loadInbox() {
  const el = document.getElementById('inbox-list'); if (!el) return;
  const uids = Object.keys(me.friends||{});
  if (!uids.length) { el.innerHTML='<p style="text-align:center;opacity:.4;font-size:12px;padding:22px;">No friends yet. Find people to chat! ♡</p>'; return; }
  dmStore = {};
  const friends = [];
  for (const uid of uids) { const s=await db.ref('users/'+uid).get(); if(s.exists()) friends.push(s.val()); }
  if (!friends.length) { el.innerHTML='<p style="opacity:.4;font-size:12px;text-align:center;padding:22px;">No friends found.</p>'; return; }
  el.innerHTML = friends.map(f => {
    const k='f_'+f.uid; dmStore[k]=f;
    return `<div class="inbox-item" onclick="openDM('${k}')">${avt(f,44)}
      <div><div style="font-family:'Pixelify Sans';font-size:17px;">@${esc(f.username)}</div>
      <div style="font-size:11px;opacity:.4;">Tap to chat ♡</div></div></div>`;
  }).join('');
}

async function loadFriends() {
  const el = document.getElementById('friends-card'); if (!el) return;
  const uids = Object.keys(me.friends||{});
  el.innerHTML = `<h3 style="font-family:'Pixelify Sans';color:var(--pink);margin-bottom:14px;">✦ Friends (${uids.length})</h3>`;
  if (!uids.length) { el.innerHTML+='<p style="opacity:.4;font-size:12px;text-align:center;">No friends yet ♡</p>'; return; }
  dmStore = dmStore||{};
  const friends = [];
  for (const uid of uids) { const s=await db.ref('users/'+uid).get(); if(s.exists()) friends.push(s.val()); }
  el.innerHTML += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:12px;">
    ${friends.map(f=>{const k='f_'+f.uid;dmStore[k]=f;return`
      <div style="text-align:center;cursor:pointer;" onclick="openDM('${k}')">${avt(f,46)}
        <div style="font-size:10px;margin-top:4px;opacity:.65;">@${esc(f.username)}</div>
      </div>`;}).join('')}
  </div>`;
}

// ── AUTH STATE ────────────────────────────────────────────
const _loadTimeout = setTimeout(() => {
  const el = document.getElementById('loading');
  if (el && !el.classList.contains('hidden')) {
    el.classList.add('hidden');
    me=null; curPage='landing';
    render();
  }
}, 10000);

auth.onAuthStateChanged(async user => {
  clearTimeout(_loadTimeout);
  try {
    if (user) {
      const s = await db.ref('users/'+user.uid).get();
      if (s.exists()) {
        me = s.val(); curPage = 'home';
        setTimeout(startNotifListeners, 1000);
        if ('Notification' in window && Notification.permission==='default') Notification.requestPermission();
      } else { me=null; curPage='landing'; }
    } else { me=null; curPage='landing'; }
  } catch(e) { me=null; curPage='landing'; }
  document.getElementById('loading').classList.add('hidden');
  render();
});

// ── SPARKLE BG ────────────────────────────────────────────
const canvas = document.getElementById('bg');
const ctx    = canvas.getContext('2d');
let dots = [];
function initBg() {
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  dots=Array.from({length:28},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,s:Math.random()*2+.4,v:Math.random()*.14+.03}));
}
function drawBg() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  dots.forEach(d=>{d.y-=d.v;if(d.y<0)d.y=canvas.height;ctx.fillStyle='rgba(255,156,219,0.14)';ctx.beginPath();ctx.arc(d.x,d.y,d.s,0,Math.PI*2);ctx.fill();});
  requestAnimationFrame(drawBg);
}
window.onresize=initBg; initBg(); drawBg();

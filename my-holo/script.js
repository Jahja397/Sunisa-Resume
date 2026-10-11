// ═══════════════════════════════════════════════════════
//  MYHOLO — script.js  (bug-fix update ✦)
//  ⚠️ ใช้คู่กับไฟล์ database.rules.json — ต้อง Publish Rules ใหม่ใน Firebase ก่อนนะ
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
const TS   = firebase.database.ServerValue.TIMESTAMP;   // เวลาจาก server — ไม่ใช้นาฬิกาเครื่องคนส่งแล้ว (ข้อ 4)

// ── STATE ─────────────────────────────────────────────────
let me          = null;        // โปรไฟล์ของเรา
let curPage     = 'landing';
let authTab     = 'signup';
let curRoom     = null;        // ห้องแชท (room) หรือโปรไฟล์ของอีกคน (dm / user)
let msgOff      = null;        // หยุดฟังข้อความของห้องที่เปิดอยู่
let lastMsgs    = null;        // ข้อความชุดล่าสุดของห้องที่เปิดอยู่ (ไว้วาดใหม่ตอนสถานะเพื่อน/บล็อกเปลี่ยน)
let msgAtBottom = true;        // ตอนนี้เลื่อนอยู่ล่างสุดของแชทไหม
let pageOffs    = [];          // ตัวฟังที่ใช้เฉพาะหน้าปัจจุบัน (ออกจากหน้าแล้วหยุด)
let notifOffs   = {};          // uid เพื่อน -> หยุดฟัง DM
let lastMsg     = {};          // uid เพื่อน -> ข้อความล่าสุดใน DM
let reads       = {};          // uid เพื่อน -> เวลาของข้อความที่อ่านล่าสุด (เก็บใน Firebase เลยซิงก์ทุกเครื่อง)
let readsLoaded = false;
let unread      = {};          // uid เพื่อน -> true ถ้ามีข้อความที่ยังไม่อ่าน
let incoming    = {};          // คำขอเป็นเพื่อนที่คนอื่นส่งมาหาเรา
let sentReqs    = {};          // คำขอที่เราส่งไปแล้ว รอเขากดรับ
let blocked     = {};          // คนที่เราบล็อก
let justAccepted = {};         // กัน toast ซ้ำตอนเรากดรับเอง
let profileCache = {};         // uid -> โปรไฟล์ (ไม่ต้องโหลดซ้ำทุกครั้ง)
let onlineMap   = {};          // uid -> {online, lastSeen}
let presenceOff = null, connOff = null, myConnRef = null;
let meOff = null, reqOff = null, privOffs = [];
let authBusy    = false;       // true ระหว่างสมัคร/ล็อกอิน
let searchSeq = 0, searchTimer = null, lastQuery = '', lastResults = [];
let routeSeq = 0, routedHash = null, pendingHash = null;
let restoreUser = null;       // ล็อกอินได้แต่ไม่มีหน้าโปรไฟล์ (เช่นเผลอลบ users/) → ให้กู้หน้าคืน
let verifyUser = null, verifyChecking = false, verifyTimer = null;   // บัญชีที่ยังไม่ได้ยืนยันอีเมล

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

const MAX_TEXT = 1000, MAX_CAPTION = 100, MAX_BIO = 500;   // ต้องตรงกับใน database.rules.json
const HEX = /^#[0-9a-fA-F]{6}$/;
const C1 = '#ff9cdb', C2 = '#82ccff';                       // สีโปรไฟล์ตั้งต้น
const THAI_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;     // สระบน/ล่าง วรรณยุกต์ (ต้องเกาะตัวอักษรอื่น)

// ── HELPERS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ปกติแสดงเป็นข้อความธรรมดา · ใส่ html=true เฉพาะตอนที่เราประกอบ HTML เองและ esc() ข้อมูลแล้ว
function toast(msg, dur=3000, html=false) {
  const t = $('toast');
  if (!t) return;
  if (html) t.innerHTML = msg; else t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display='none', dur);
}

// สีโปรไฟล์: ไม่เอาข้อความจากฐานข้อมูลไปใส่ใน style ตรงๆ แล้ว ต้องเป็น #rrggbb เท่านั้น (ข้อ 2)
function safeColor(c, fallback) { return (typeof c === 'string' && HEX.test(c)) ? c : fallback; }
function gradOf(u) { return `linear-gradient(135deg,${safeColor(u && u.c1, C1)},${safeColor(u && u.c2, C2)})`; }

// ตัวอักษรในวงกลมโปรไฟล์ — ข้ามสระบน/ล่าง/วรรณยุกต์ ไม่ให้ลอยอยู่ตัวเดียว
function initialOf(name) {
  const ch = Array.from(String(name || '')).find(c => !THAI_MARK.test(c));
  return ch ? ch.toUpperCase() : '?';
}

function avt(u, size=50, dot=false) {
  const av = `<div class="avatar" style="width:${size}px;height:${size}px;background:${gradOf(u)};font-size:${Math.round(size*.44)}px;">${esc(initialOf(u.username))}</div>`;
  if (!dot || !u.uid) return av;
  const d = Math.max(10, Math.round(size*.26));
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;">${av}<span class="pdot" data-uid="${esc(u.uid)}" style="position:absolute;right:0;bottom:0;width:${d}px;height:${d}px;border-radius:50%;border:2px solid #fff;background:#cbd5e1;transition:background .3s;"></span></div>`;
}

function dmKey(a, b) { return [a,b].sort().join('__'); }
// ใช้ใส่ใน onclick="..." เท่านั้น: esc() อย่างเดียวไม่พอ เพราะ &#39; จะถูกแปลงกลับเป็น ' ก่อนรัน JS
function safeId(s) { return String(s||'').replace(/[^\w-]/g,''); }
function isDenied(e) { return !!e && (e.code === 'PERMISSION_DENIED' || /permission.denied/i.test(e.message || '')); }

function fbErr(e) {
  const m = {
    'auth/email-already-in-use':'Email already used!',
    'auth/invalid-email':'Invalid email!',
    'auth/weak-password':'Password min 6 chars!',
    'auth/missing-password':'Fill in your password!',
    'auth/user-not-found':'User not found!',
    'auth/wrong-password':'Wrong password!',
    'auth/invalid-credential':'Wrong email or password! (ลืมรหัส? กด Forgot password)',
    'auth/user-disabled':'This account is disabled',
    'auth/too-many-requests':'Too many tries, wait a bit ♡',
    'auth/network-request-failed':'No internet connection!',
    'PERMISSION_DENIED':'Permission denied — check Firebase Rules'
  };
  return (e && m[e.code]) || (e && e.message) || 'Something went wrong!';
}

function isFriend(uid) { return !!(me && me.friends && me.friends[uid]); }
function friendUids() { return Object.keys((me && me.friends) || {}).filter(u => u !== 'holobot'); }

// ข้อมูลจากฐานข้อมูลอาจไม่ครบหรือผิดชนิด → จัดให้เรียบร้อยก่อนใช้
function cleanProfile(v, uid) {
  v = (v && typeof v === 'object') ? v : {};
  return {
    ...v, uid,
    username: typeof v.username === 'string' ? v.username : '?',
    code:     typeof v.code === 'string' ? v.code : '',
    caption:  typeof v.caption === 'string' ? v.caption : '',
    bio:      typeof v.bio === 'string' ? v.bio : '',
    friends:  (v.friends && typeof v.friends === 'object') ? v.friends : {}
  };
}

async function getProfile(uid, fresh=false) {
  if (!uid) return null;
  if (!fresh && profileCache[uid]) return profileCache[uid];
  try {
    const s = await db.ref('users/'+uid).get();
    if (!s.exists()) { delete profileCache[uid]; return null; }
    return (profileCache[uid] = cleanProfile(s.val(), uid));
  } catch(e) { return profileCache[uid] || null; }
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

// ── TIME ──────────────────────────────────────────────────
function fmtTime(ts) { return new Date(ts || Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function dayLabel(ts) {
  const d = new Date(ts || Date.now()), now = new Date(), y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  const o = {day:'numeric', month:'short'};
  if (d.getFullYear() !== now.getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString([], o);
}
function shortWhen(ts) { return new Date(ts || 0).toDateString() === new Date().toDateString() ? fmtTime(ts) : dayLabel(ts); }

// ── NAVIGATION ────────────────────────────────────────────
// แต่ละหน้ามีลิงก์ของตัวเอง (#/room/global, #/dm/<uid> ...) → รีเฟรชแล้วอยู่หน้าเดิม
// และปุ่ม Back ของเบราว์เซอร์ถอยกลับในเว็บได้ (ข้อ 10)
function hashFor(page, arg) {
  switch (page) {
    case 'landing':    return '#/';
    case 'auth':       return '#/' + (arg || authTab);
    case 'chat_lobby': return '#/rooms';
    case 'room':       return '#/room/' + arg;
    case 'dm':         return '#/dm/' + arg;
    case 'user':       return '#/u/' + arg;
    case 'find':       return '#/find';
    case 'inbox':      return '#/inbox';
    case 'profile':    return '#/me';
    case 'edit':       return '#/edit';
    default:           return '#/home';
  }
}
function goPage(page, arg) { navigate(hashFor(page, arg)); }

function navigate(hash, replace=false) {
  if (!replace && hash === location.hash) { route(); return; }
  try {
    const depth = (history.state && history.state.depth) || 0;
    if (replace) history.replaceState({depth}, '', hash);
    else history.pushState({depth: depth + 1}, '', hash);
  } catch(e) {                       // บางที่ใช้ pushState ไม่ได้ (เช่นเปิดไฟล์ตรงๆ) → ใช้ hash แบบธรรมดา
    if (replace) location.replace(hash); else location.hash = hash;
    return;                          // hashchange จะเรียก route() ให้เอง
  }
  route();
}

// ปุ่ม ← Back ในเว็บ: ถ้ามาจากหน้าในเว็บเราก็ถอยกลับ ไม่งั้นไปหน้า fallback
function goBack(fallback) {
  if (history.state && history.state.depth > 0) history.back();
  else navigate(fallback, true);
}

function openRoom(i) { const r = ROOMS[i]; if (r) navigate('#/room/' + r.id); }
function openDM(uid) { navigate('#/dm/' + safeId(uid)); }
function openDMByUid(uid) { openDM(uid); }
function openProfile(uid) { navigate(me && uid === me.uid ? '#/me' : '#/u/' + safeId(uid)); }
function setAuthTab(t) { navigate(t === 'login' ? '#/login' : '#/signup'); }

window.addEventListener('popstate', () => route());
window.addEventListener('hashchange', () => { if (location.hash !== routedHash) route(); });

function leavePage() {
  stopMsgListener();
  clearInterval(verifyTimer); verifyTimer = null;
  pageOffs.forEach(f => f()); pageOffs = [];
}

function profileSig(u) { return JSON.stringify([u.username, u.code, u.c1, u.c2, u.caption, u.bio, Object.keys(u.friends || {}).length]); }

async function route() {
  const seq = ++routeSeq;
  routedHash = location.hash;
  leavePage();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const p = parts[0] || '';
  let a = '';
  try { a = decodeURIComponent(parts[1] || ''); } catch(e) {}

  if (!me && verifyUser) { curPage = 'verify'; render(); return; }
  if (!me && restoreUser) { curPage = 'restore'; render(); return; }
  if (!me) {                                     // ยังไม่ล็อกอิน
    if (p === 'login' || p === 'signup') { authTab = p; curPage = 'auth'; }
    else { if (p) pendingHash = location.hash; curPage = 'landing'; }   // จำลิงก์ไว้ ล็อกอินเสร็จพาไปต่อ
    render(); return;
  }

  switch (p) {
    case 'home':  curPage = 'home'; break;
    case 'rooms': curPage = 'chat_lobby'; break;
    case 'room': {
      const r = ROOMS.find(x => x.id === a);
      if (!r) { navigate('#/rooms', true); return; }
      curPage = 'room'; curRoom = r; break;
    }
    case 'dm': case 'u': {
      if (!/^[\w-]{1,128}$/.test(a)) { navigate('#/home', true); return; }
      if (a === me.uid) { navigate('#/me', true); return; }
      if (p === 'dm' && !isFriend(a)) { navigate('#/u/' + a, true); return; }   // ยังไม่ใช่เพื่อน → ดูโปรไฟล์ก่อน
      curPage = p === 'dm' ? 'dm' : 'user';
      const cached = profileCache[a];
      curRoom = cached ? {...cached} : {uid:a, username:'…', code:'', caption:'', bio:'', friends:{}, loading:true};
      render(); window.scrollTo(0, 0);
      const prof = await getProfile(a, true);
      if (seq !== routeSeq) return;                // ระหว่างรอ ผู้ใช้ไปหน้าอื่นแล้ว
      if (!prof) { toast('User not found 🌌'); navigate('#/home', true); return; }
      const changed = !cached || profileSig(cached) !== profileSig(prof);
      curRoom = {...prof, mutualKnown: true};
      if (curPage === 'dm') updateDMHeader();
      else if (changed) render();
      return;
    }
    case 'find':  curPage = 'find'; break;
    case 'inbox': curPage = 'inbox'; break;
    case 'me':    curPage = 'profile'; break;
    case 'edit':  curPage = 'edit'; break;
    default: navigate('#/home', true); return;    // '', #/login, #/signup หรือลิงก์แปลกๆ → Home
  }
  render();
  window.scrollTo(0, 0);
}

// ── AUTH ──────────────────────────────────────────────────
function validUsername(un) {
  return /^[A-Za-z0-9_\u0E01-\u0E3A\u0E3F-\u0E5B]{3,20}$/.test(un) && !THAI_MARK.test(un[0]);
}

// ID แบบสุ่ม: A–Z สองตัว + เลข 4 หลัก (ตัด I กับ O ออก กันสับสนกับเลข 1/0) — ข้อ 9
function genCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = () => L[Math.floor(Math.random() * L.length)];
  return pick() + pick() + Math.floor(1000 + Math.random() * 9000);
}

async function handleAuth() {
  if (authBusy) return;
  const btn = $('auth-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
  authBusy = true;
  try {
    if (authTab === 'signup') await doSignup();
    else await doLogin();
  } catch(e) {
    toast(e && e.userMsg ? e.userMsg : fbErr(e));
  } finally {
    authBusy = false;
    const b = $('auth-btn');
    if (b) { b.disabled = false; b.textContent = authTab === 'signup' ? 'Create Page ✦' : 'Login ♡'; }
  }
}

// สมัคร: สร้างบัญชี → ส่งลิงก์ยืนยันไปที่อีเมล → ต้องกดลิงก์ก่อน ถึงจะสร้างหน้าโปรไฟล์ให้
// (กันการสมัครด้วยอีเมลมั่วๆ อย่าง a@t.com — Rules ก็เช็ค email_verified ด้วย)
async function doSignup() {
  const un = ($('f-un')?.value || '').trim();
  const em = ($('f-em')?.value || '').trim();
  const pw = $('f-pw')?.value || '';
  if (!un || !em || !pw) { toast('Fill all fields!'); return; }
  if (!validUsername(un)) { toast('Username 3-20 ตัว ใช้ a-z 0-9 _ หรือภาษาไทยได้ (ห้ามขึ้นต้นด้วยสระบน/ล่างหรือวรรณยุกต์) ♡'); return; }
  const cred = await auth.createUserWithEmailAndPassword(em, pw);
  const u = cred.user;
  // เช็คชื่อซ้ำตั้งแต่ตอนนี้ จะได้ไม่ต้องไปยืนยันอีเมลก่อนแล้วค่อยรู้ว่าชื่อโดนใช้แล้ว
  let taken = false;
  try { taken = (await db.ref('usernames/' + un.toLowerCase()).get()).exists(); } catch(e) {}
  if (taken) { await u.delete().catch(() => auth.signOut().catch(() => {})); toast('Username taken! ♡'); return; }
  savePendingName(u.uid, un);                    // จำชื่อไว้ ยืนยันอีเมลเสร็จค่อยจองจริง
  let sentAt = null;
  try { await u.sendEmailVerification(); sentAt = Date.now(); }
  catch(e) { console.warn('send verification failed:', e.message); }
  verifyUser = {uid: u.uid, email: u.email || em, sentAt, justSignedUp: true};
  navigate('#/', true);
}

async function doLogin() {
  const em = ($('f-em')?.value || '').trim();
  const pw = $('f-pw')?.value || '';
  if (!em || !pw) { toast('Fill all fields!'); return; }
  if (!em.includes('@')) { toast('ล็อกอินด้วยอีเมลนะ ♡ (ใช้ username ล็อกอินไม่ได้แล้ว เพื่อไม่ให้อีเมลหลุด)', 4500); return; }
  const cred = await auth.signInWithEmailAndPassword(em, pw);
  if (await afterSignedIn(cred.user)) routeAfterAuth();
  else navigate('#/', true);
}

// หลังล็อกอิน (หรือเปิดเว็บแล้วยังล็อกอินค้างอยู่): ยืนยันอีเมลหรือยัง → มีหน้าโปรไฟล์ไหม → เข้าแอป
// คืนค่า true = เข้าแอปแล้ว · false = ต้องไปหน้ายืนยันอีเมล หรือหน้าตั้งชื่อ
async function afterSignedIn(user) {
  me = null;
  if (!user.emailVerified) {
    restoreUser = null;
    if (!verifyUser || verifyUser.uid !== user.uid) verifyUser = {uid: user.uid, email: user.email || '', sentAt: null, justSignedUp: false};
    return false;
  }
  verifyUser = null;
  try { const t = await user.getIdTokenResult(); if (!t.claims.email_verified) await user.getIdToken(true); } catch(e) {}
  const s = await db.ref('users/' + user.uid).get();
  if (s.exists()) { me = cleanProfile(s.val(), user.uid); enterApp(); return true; }
  const pending = getPendingName(user.uid);     // ชื่อที่เลือกไว้ตอนสมัคร
  if (pending) {
    try { me = await createProfile(user.uid, pending); enterApp(); toast('Welcome to MYHOLO! ✨'); return true; }
    catch(e) { me = null; toast((e && e.userMsg ? e.userMsg : fbErr(e)) + ' เลือกชื่อใหม่ได้เลย', 4500); }
  }
  restoreUser = {uid: user.uid, email: user.email || '', suggest: pending};
  return false;
}

// จองชื่อ + ID แล้วสร้างหน้าโปรไฟล์ (ใช้ทั้งตอนยืนยันอีเมลเสร็จ และตอนกู้หน้าคืน)
// พังกลางทาง = คืนชื่อ/ID ที่จองไว้ทั้งหมด
async function createProfile(uid, un, oldNames=[], caption='Welcome to my digital space ✨') {
  const lower = un.toLowerCase();
  let nameNew = false, code = null;
  const taken = () => Object.assign(new Error('taken'), {userMsg: 'Username taken! ♡'});
  try {
    const s = await db.ref('usernames/' + lower).get();
    if (s.exists() && s.val() !== uid) throw taken();
    if (!s.exists()) {
      try { await db.ref('usernames/' + lower).set(uid); nameNew = true; }
      catch(e) { const again = await db.ref('usernames/' + lower).get().catch(() => null); if (again && again.exists() && again.val() !== uid) throw taken(); throw e; }
    }
    for (let i = 0; i < 6 && !code; i++) {           // ID แบบสุ่ม (ถ้าชนกับคนอื่นก็สุ่มใหม่)
      const c = genCode();
      try { await db.ref('codes/' + c).set(uid); code = c; }
      catch(e) { if (!isDenied(e)) throw e; }
    }
    if (!code) throw Object.assign(new Error('no code'), {userMsg: 'สร้าง ID ไม่สำเร็จ ลองใหม่อีกทีนะ (เช็ค Firebase Rules ด้วย)'});
    // ไม่เก็บอีเมลไว้ในโปรไฟล์ (ข้อ 3) และไม่เก็บ grad (ข้อ 2)
    const profile = { uid, username: un, code, c1: C1, c2: C2, caption, bio: 'Holographic heart.', createdAt: TS };
    await db.ref('users/' + uid).set(profile);
    for (const old of oldNames) if (old !== lower) await db.ref('usernames/' + old).remove().catch(() => {});   // เปลี่ยนชื่อ → คืนชื่อเก่า
    clearPendingName(uid);
    return cleanProfile({...profile, createdAt: Date.now()}, uid);
  } catch(e) {
    if (code) await db.ref('codes/' + code).remove().catch(() => {});
    if (nameNew) await db.ref('usernames/' + lower).remove().catch(() => {});
    throw e;
  }
}

const pendingKey = uid => 'myholo_pending_name_' + uid;
function savePendingName(uid, un) { try { localStorage.setItem(pendingKey(uid), un); } catch(e) {} }
function getPendingName(uid) { try { return localStorage.getItem(pendingKey(uid)) || ''; } catch(e) { return ''; } }
function clearPendingName(uid) { try { localStorage.removeItem(pendingKey(uid)); } catch(e) {} }

// ── EMAIL VERIFICATION PAGE ───────────────────────────────
async function sendVerify() {
  const u = auth.currentUser;
  if (!u || !verifyUser) return;
  const wait = verifyUser.sentAt ? 60 - Math.floor((Date.now() - verifyUser.sentAt) / 1000) : 0;
  if (wait > 0) { toast(`รออีก ${wait} วินาทีค่อยส่งใหม่นะ`); return; }
  const btn = $('verify-send'); if (btn) btn.disabled = true;
  try {
    await u.sendEmailVerification();
    verifyUser.sentAt = Date.now();
    toast('ส่งลิงก์ยืนยันไปที่อีเมลแล้ว 💌 เช็คจดหมายขยะด้วยนะ', 5000);
    render();
  } catch(e) { toast(fbErr(e)); const b = $('verify-send'); if (b) b.disabled = false; }
}

// เช็คว่ากดลิงก์ในอีเมลแล้วหรือยัง (กดปุ่มเอง / เช็คให้อัตโนมัติทุก 4 วิ / ตอนสลับกลับมาที่แท็บนี้)
async function checkVerified(manual) {
  const u = auth.currentUser;
  if (!u || !verifyUser || verifyChecking) return;
  verifyChecking = true;
  try {
    await u.reload();
    const fresh = auth.currentUser;
    if (!fresh || !fresh.emailVerified) { if (manual) toast('ยังไม่ได้ยืนยันเลย กดลิงก์ในอีเมลก่อนนะ (เช็คจดหมายขยะด้วย)', 4000); return; }
    await fresh.getIdToken(true);                 // ขอ token ใหม่ที่บอกว่ายืนยันแล้ว → Database ถึงจะยอมให้ใช้
    verifyUser = null;
    toast('Email verified! ✨');
    if (await afterSignedIn(fresh)) routeAfterAuth(); else navigate('#/', true);
  } catch(e) { if (manual) toast(fbErr(e)); }
  finally { verifyChecking = false; }
}

// พิมพ์อีเมลผิดตอนสมัคร → ลบบัญชีที่ยังไม่ยืนยันทิ้ง แล้วสมัครใหม่
async function startOver() {
  if (!confirm('ยกเลิกบัญชีนี้ แล้วกลับไปสมัครใหม่ด้วยอีเมลที่ถูกต้อง?')) return;
  const u = auth.currentUser;
  verifyUser = null;
  if (u) { clearPendingName(u.uid); try { await u.delete(); } catch(e) { await auth.signOut().catch(() => {}); } }
  navigate('#/signup', true);
}

window.addEventListener('focus', () => { if (verifyUser && curPage === 'verify') checkVerified(false); });

// ลืมรหัส: Firebase ส่งลิงก์ตั้งรหัสใหม่ไปที่อีเมลให้เลย (ใช้ได้ทันที ไม่ต้องตั้งค่าอะไรเพิ่ม)
async function forgotPassword() {
  const em = ($('f-em')?.value || '').trim();
  if (!em.includes('@')) { toast('พิมพ์อีเมลในช่อง Email ก่อน แล้วค่อยกด Forgot password? นะ'); $('f-em')?.focus(); return; }
  const b = $('forgot-btn'); if (b) b.disabled = true;
  try {
    await auth.sendPasswordResetEmail(em);
    toast('ถ้ามีบัญชีของอีเมลนี้ จะมีลิงก์ตั้งรหัสใหม่ส่งไปให้นะ 💌 (เช็คในจดหมายขยะด้วย)', 6000);
  } catch(e) {
    toast(e && e.code === 'auth/user-not-found' ? 'ไม่เจอบัญชีของอีเมลนี้ เช็คตัวสะกด หรือสมัครใหม่ได้เลย' : fbErr(e), 5000);
  } finally { const b2 = $('forgot-btn'); if (b2) b2.disabled = false; }
}

// ── RESTORE PAGE (บัญชียังอยู่ แต่หน้าโปรไฟล์หาย) ─────────────
// ชื่อเดิมยังจองอยู่ใน usernames/ → หาให้อัตโนมัติ, ID ได้อันใหม่, เพื่อนต้องแอดใหม่, ข้อความเก่ายังอยู่
async function loadRestorePrefill() {
  const uid = restoreUser && restoreUser.uid; if (!uid) return;
  let mine = [];
  try { const s = await db.ref('usernames').get(); s.forEach(c => { if (c.val() === uid) mine.push(c.key); }); } catch(e) {}
  if (!restoreUser || restoreUser.uid !== uid) return;
  restoreUser.oldNames = mine;
  const inp = $('f-un'), hint = $('restore-hint');
  if (!inp) return;
  if (mine.length) {                               // เคยมีหน้ามาก่อน → โหมดกู้คืน
    if (!inp.value) inp.value = mine[0];
    $('restore-title').textContent = 'Restore your page';
    $('restore-text').innerHTML = `Signed in as <b>${esc(restoreUser.email)}</b>, but this account's page is missing. Pick a username to bring it back. Old messages stay; friends need to be added again.`;
    $('restore-btn').textContent = 'Restore my page ✦';
    if (hint) hint.textContent = `Your old username was @${mine[0]}. Keep it, or change the capital letters or the whole name.`;
  } else if (hint) hint.textContent = 'Pick any free username.';
}

async function restoreProfile() {
  if (!restoreUser || authBusy) return;
  const un = ($('f-un')?.value || '').trim();
  if (!validUsername(un)) { toast('Username 3-20 ตัว ใช้ a-z 0-9 _ หรือภาษาไทยได้ (ห้ามขึ้นต้นด้วยสระบน/ล่างหรือวรรณยุกต์) ♡'); return; }
  const old = restoreUser.oldNames || [];
  authBusy = true;
  const btn = $('restore-btn'), label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    me = await createProfile(restoreUser.uid, un, old, old.length ? 'Welcome back to my digital space ✨' : 'Welcome to my digital space ✨');
    restoreUser = null;
    enterApp();
    toast(old.length ? 'Your page is back! ✨ แอดเพื่อนใหม่อีกรอบนะ' : 'Welcome to MYHOLO! ✨', 4500);
    routeAfterAuth();
  } catch(e) {
    me = null;
    toast(e && e.userMsg ? e.userMsg : fbErr(e));
  } finally {
    authBusy = false;
    const b = $('restore-btn'); if (b) { b.disabled = false; b.textContent = label || 'Save my page ✦'; }
  }
}

// ออกจากระบบจากหน้ายืนยันอีเมล / หน้าตั้งชื่อ
async function logoutPending() {
  restoreUser = null; verifyUser = null;
  try { await auth.signOut(); } catch(e) {}
  navigate('#/', true);
}
const cancelRestore = logoutPending;

function routeAfterAuth() {
  const h = pendingHash; pendingHash = null;
  navigate(h && !/^#\/?(login|signup)?$/.test(h) ? h : '#/home', true);
}

async function doLogout() {
  await stopAll();
  try { await auth.signOut(); } catch(e) {}
  navigate('#/', true);
}

// ── PROFILE ───────────────────────────────────────────────
async function saveProfile() {
  if (!me) return;
  const c1 = safeColor($('ec1')?.value, C1);
  const c2 = safeColor($('ec2')?.value, C2);
  const caption = ($('ecap')?.value || '').slice(0, MAX_CAPTION);
  const bio     = ($('ebio')?.value || '').slice(0, MAX_BIO);
  const btn = $('save-btn'); if (btn) btn.disabled = true;
  try {
    await db.ref('users/' + me.uid).update({c1, c2, caption, bio, grad: null});   // grad: null = ลบของเก่าทิ้ง
    Object.assign(me, {c1, c2, caption, bio}); delete me.grad;
    profileCache[me.uid] = me;
    toast('Saved! ✨');
    goBack('#/me');
  } catch(e) { toast('Save failed: ' + fbErr(e)); }
  finally { const b = $('save-btn'); if (b) b.disabled = false; }
}

// ── FRIENDS ───────────────────────────────────────────────
// คลิกชื่อแล้วไม่เป็นเพื่อนทันทีแล้ว: ส่งคำขอ → อีกฝ่ายกด Accept → ถึงจะเป็นเพื่อนกัน (ข้อ 1)
function relationState(uid) {
  if (blocked[uid]) return 'blocked';
  if (isFriend(uid)) return 'friend';
  if (incoming[uid]) return 'incoming';
  if (sentReqs[uid]) return 'sent';
  return 'none';
}

async function sendFriendRequest(uid, again=false) {
  if (!me || !uid || uid === me.uid || uid === 'holobot') return;
  if (blocked[uid]) { toast('ปลดบล็อกก่อนนะ'); return; }
  if (!again && isFriend(uid)) { openDM(uid); return; }
  if (incoming[uid]) { await acceptRequest(uid); return; }     // เขาขอเรามาก่อนแล้ว → รับเลย
  try {
    await db.ref(`friendRequests/${uid}/${me.uid}`).set({ts: TS});
    sentReqs[uid] = true;
    toast('Friend request sent! 💌');
  } catch(e) { toast(isDenied(e) ? 'ส่งคำขอไม่ได้ ♡' : 'Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function cancelRequest(uid) {
  try { await db.ref(`friendRequests/${uid}/${me.uid}`).remove(); delete sentReqs[uid]; toast('Request cancelled'); }
  catch(e) { toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function acceptRequest(uid) {
  if (!me || !uid) return;
  justAccepted[uid] = true;
  try {
    // ขั้น 1: เพิ่มเพื่อนทั้งสองฝั่ง (Rules ยอม เพราะมีคำขอจากเขาอยู่จริง)
    await db.ref().update({[`users/${me.uid}/friends/${uid}`]: true, [`users/${uid}/friends/${me.uid}`]: true});
    // ขั้น 2: ลบคำขอที่ใช้แล้ว
    await db.ref().update({[`friendRequests/${me.uid}/${uid}`]: null, [`friendRequests/${uid}/${me.uid}`]: null}).catch(() => {});
    delete incoming[uid]; delete sentReqs[uid];
    toast('You are now friends! ♡');
  } catch(e) { delete justAccepted[uid]; toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function declineRequest(uid) {
  try { await db.ref(`friendRequests/${me.uid}/${uid}`).remove(); delete incoming[uid]; }
  catch(e) { toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function unfriend(uid) {
  const p = profileCache[uid];
  if (!confirm(`เลิกเป็นเพื่อนกับ @${p ? p.username : 'คนนี้'}?`)) return;
  try {
    await db.ref().update({[`users/${me.uid}/friends/${uid}`]: null, [`users/${uid}/friends/${me.uid}`]: null});
    toast('Unfriended');
  } catch(e) { toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function blockUser(uid) {
  const p = profileCache[uid];
  if (!confirm(`บล็อก @${p ? p.username : 'คนนี้'}?\nเขาจะส่งคำขอเป็นเพื่อนหรือทักเราไม่ได้ และเราจะไม่เห็นข้อความของเขาในห้องแชท`)) return;
  try {
    await db.ref().update({
      [`private/${me.uid}/blocked/${uid}`]: true,
      [`users/${me.uid}/friends/${uid}`]: null,
      [`users/${uid}/friends/${me.uid}`]: null,
      [`friendRequests/${me.uid}/${uid}`]: null,
      [`friendRequests/${uid}/${me.uid}`]: null,
    });
    blocked[uid] = true; delete incoming[uid]; delete sentReqs[uid];
    toast('Blocked 🚫');
  } catch(e) { toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

async function unblockUser(uid) {
  try { await db.ref(`private/${me.uid}/blocked/${uid}`).remove(); delete blocked[uid]; toast('Unblocked'); }
  catch(e) { toast('Error: ' + fbErr(e)); }
  refreshRelationUI();
}

function relationActionsHtml(uid) {
  const id = safeId(uid);
  const block = `<button class="btn btn-ghost btn-sm" onclick="blockUser('${id}')">Block</button>`;
  switch (relationState(uid)) {
    case 'blocked':  return `<p class="muted" style="width:100%;">You blocked this user.</p><button class="btn btn-secondary btn-sm" onclick="unblockUser('${id}')">Unblock</button>`;
    case 'friend':   return `<button class="btn btn-primary btn-sm" onclick="openDM('${id}')">Chat ♡</button><button class="btn btn-secondary btn-sm" onclick="unfriend('${id}')">Unfriend</button>${block}`;
    case 'incoming': return `<p class="muted" style="width:100%;">Wants to be your friend 💌</p><button class="btn btn-primary btn-sm" onclick="acceptRequest('${id}')">Accept ♡</button><button class="btn btn-secondary btn-sm" onclick="declineRequest('${id}')">Decline</button>${block}`;
    case 'sent':     return `<p class="muted" style="width:100%;">Request sent ✓ waiting for them to accept</p><button class="btn btn-secondary btn-sm" onclick="cancelRequest('${id}')">Cancel request</button>${block}`;
    default:         return `<button class="btn btn-primary btn-sm" onclick="sendFriendRequest('${id}')">+ Add Friend</button>${block}`;
  }
}

// เช็คว่าเราเคยส่งคำขอไปหาคนนี้แล้วหรือยัง (อ่านได้เฉพาะคำขอของเราเอง)
function checkOutgoing(uid) {
  if (!me || isFriend(uid) || incoming[uid] || blocked[uid]) return;
  db.ref(`friendRequests/${uid}/${me.uid}`).get().then(s => {
    const had = !!sentReqs[uid];
    if (s.exists()) sentReqs[uid] = true; else delete sentReqs[uid];
    if (had !== !!sentReqs[uid]) refreshRelationUI();
  }).catch(() => {});
}

// สถานะเพื่อนเปลี่ยน → อัปเดตเฉพาะส่วนของหน้าที่เปิดอยู่
function refreshRelationUI() {
  if (!me) return;
  updateUnreadUI();
  if (curPage === 'user' && curRoom) { const box = $('rel-actions'); if (box) box.innerHTML = relationActionsHtml(curRoom.uid); }
  else if (curPage === 'find') renderSearchResults();
  else if (curPage === 'inbox') loadInbox();
  else if (curPage === 'profile') loadFriends();
  else if (curPage === 'dm') updateChatFoot();
  else if (curPage === 'room') rerenderMsgs();
}

// ── MESSAGING ─────────────────────────────────────────────
async function sendMsg() {
  const inp = $('cinp');
  if (!inp || !me || !curRoom) return;
  const txt = inp.value.trim();
  if (!txt) return;
  if (txt.length > MAX_TEXT) { toast(`ข้อความยาวได้ไม่เกิน ${MAX_TEXT} ตัวอักษรนะ`); return; }   // ข้อ 8
  const key = getChatKey();
  if (!key) return;
  inp.value = '';
  closeEmojiPicker();                                    // ส่งแล้วปิดแผงอีโมจิ (ข้อ 7)
  try {
    await db.ref('messages/'+key).push({
      uid:me.uid, name:me.username, code:me.code||'', text:txt, ts:TS
    });
  } catch(e) {
    toast('Send failed: ' + sendErr(e));
    if (!inp.value) inp.value = txt;
  }
}

function sendErr(e) {
  if (isDenied(e) && curPage === 'dm') return 'อีกฝ่ายยังไม่ได้รับเป็นเพื่อน (หรือ Firebase Rules ยังไม่ได้อัปเดต)';
  return fbErr(e);
}

function toggleEmojiPicker() {
  const p = $('epick');
  if (!p) return;
  const open = p.classList.contains('hidden');
  p.classList.toggle('hidden', !open);
  $('emoji-toggle')?.setAttribute('aria-expanded', String(open));
}

function closeEmojiPicker() {
  $('epick')?.classList.add('hidden');
  $('emoji-toggle')?.setAttribute('aria-expanded', 'false');
}

// ใส่อีโมจิตรงตำแหน่งเคอร์เซอร์ · บนมือถือไม่ focus ช่องพิมพ์ คีย์บอร์ดจะได้ไม่เด้งขึ้นมาบังทุกครั้ง
function pickEmoji(e) {
  const inp = $('cinp');
  if (!inp || !e) return;
  const s = inp.selectionStart ?? inp.value.length;
  const end = inp.selectionEnd ?? s;
  const v = inp.value.slice(0, s) + e + inp.value.slice(end);
  if (v.length > MAX_TEXT) return;
  inp.value = v;
  const pos = s + e.length;
  if (!window.matchMedia('(pointer: coarse)').matches) inp.focus();
  try { inp.setSelectionRange(pos, pos); } catch(err) {}
}

// แตะที่อื่น หรือกด Esc → ปิดแผงอีโมจิ (ข้อ 7)
document.addEventListener('click', e => {
  const p = $('epick');
  if (!p || p.classList.contains('hidden')) return;
  if (p.contains(e.target) || e.target.closest?.('#emoji-toggle')) return;
  closeEmojiPicker();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEmojiPicker(); });

function triggerImageUpload() {
  closeEmojiPicker();
  $('img-input')?.click();
}

async function handleImageUpload(input) {
  const file = input.files?.[0];
  if (!file || !me || !curRoom) return;
  input.value = '';
  if (file.type && !file.type.startsWith('image/')) { toast('เลือกได้เฉพาะไฟล์รูปนะ'); return; }
  if (file.size > 10*1024*1024) { toast('Image too large! max 10MB'); return; }
  const key = getChatKey(); if (!key) return;
  try {
    toast('Uploading... ✦', 8000);
    const pic = await compressImage(file);
    await db.ref('messages/'+key).push({
      uid:me.uid, name:me.username, code:me.code||'', img:pic.data, w:pic.w, h:pic.h, ts:TS
    });
    toast('Sent! ✨', 1200);
  } catch(err) { toast('Image failed: ' + sendErr(err)); }
}

// ย่อรูปก่อนส่ง (เก็บเป็น base64 ใน Realtime DB เลยต้องเล็ก)
function compressImage(file, maxDim=900, quality=0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, maxDim / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width*s)); c.height = Math.max(1, Math.round(im.height*s));
      const g = c.getContext('2d');
      g.fillStyle = '#fff';                             // JPEG ไม่มีพื้นใส → ถมพื้นขาวก่อน ไม่งั้นส่วนใสกลายเป็นดำ (ข้อ 6)
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({data: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height});
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read image')); };
    im.src = url;
  });
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
function startMsgListener() {
  stopMsgListener();
  const key = getChatKey();
  const el = $('msgs');
  if (!key || !el) return;
  msgAtBottom = true;
  el.onscroll = () => { msgAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };
  const ref = db.ref('messages/'+key).limitToLast(80);   // ตรงกับที่บอกในหน้า Home ว่าโชว์ 80 ข้อความล่าสุด
  let first = true;
  const handler = snap => {
    const msgs = [];
    snap.forEach(c => { const v = c.val(); if (v && typeof v === 'object') msgs.push({...v, _key:c.key}); });
    lastMsgs = msgs;
    renderMsgs(msgs, first);
    first = false;
    if (curPage === 'dm' && curRoom?.uid && !document.hidden) markRead(curRoom.uid);
  };
  ref.on('value', handler, err => {
    const box = $('msgs');
    if (box) box.innerHTML = `<p class="chat-empty">Cannot load messages: ${esc(fbErr(err))}</p>`;
  });
  msgOff = () => { ref.off('value', handler); el.onscroll = null; };
}

function stopMsgListener() {
  if (msgOff) { msgOff(); msgOff = null; }
  lastMsgs = null;
}

function rerenderMsgs() { if (lastMsgs) renderMsgs(lastMsgs, false); }

// เรียงตามลำดับที่ Firebase ส่งมา (ตาม key ของข้อความ) ไม่ sort ด้วยเวลาจากเครื่องคนส่ง
function renderMsgs(msgs, firstLoad) {
  const el = $('msgs');
  if (!el || !me) return;
  const stick = firstLoad || msgAtBottom;               // เลื่อนลงอัตโนมัติเฉพาะตอนอยู่ล่างสุด
  const list = msgs.filter(m => m.uid === me.uid || !blocked[m.uid]);   // ซ่อนข้อความจากคนที่เราบล็อก
  if (!list.length) {
    el.innerHTML = '<p class="chat-empty">No messages yet. Say hi! 👋</p>';
    return;
  }
  const items = [];
  let lastDay = '';
  list.forEach(m => {
    const day = new Date(m.ts || Date.now()).toDateString();
    if (day !== lastDay) {                              // ขึ้นวันใหม่ → ใส่ป้ายวันที่คั่น (ข้อ 16)
      lastDay = day;
      const label = dayLabel(m.ts);
      items.push({k:'d_'+m._key, sig:label, html:`<div class="day-sep">${esc(label)}</div>`});
    }
    items.push({k:'m_'+m._key, sig:msgSig(m), html:bubbleHtml(m)});
  });
  reconcile(el, items, !firstLoad);
  if (stick) el.scrollTop = el.scrollHeight;
}

function msgSig(m) {
  return [m.name, m.code, m.text || '', typeof m.img === 'string' ? m.img.length : 0, fmtTime(m.ts), isFriend(m.uid) ? 1 : 0].join('|');
}

function bubbleHtml(m) {
  const isSelf = m.uid === me.uid;
  const friend = !isSelf && isFriend(m.uid);
  const name = isSelf
    ? `<span class="bub-name self">@${esc(m.name || '?')}</span>`
    : `<button class="bub-name" onclick="openProfile('${safeId(m.uid)}')" title="View profile">@${esc(m.name || '?')}</button>`;   // คลิกชื่อ = ดูโปรไฟล์ (ข้อ 1)
  const del = isSelf && m._key
    ? `<button class="del-btn" onclick="deleteMsg('${safeId(m._key)}')" title="Delete" aria-label="Delete message">🗑</button>`
    : '';
  const txt = m.text ? `<div class="bub-text">${esc(m.text)}</div>` : '';
  return `<div class="bubble ${isSelf ? 'bub-r' : 'bub-l'}">
    <div class="bub-meta">
      <span class="bub-who">${name}<span class="bub-code">#${esc(m.code || '')}</span>${friend ? '<span class="bub-friend" title="Friend">♡</span>' : ''}</span>
      <span class="bub-time">${del}${fmtTime(m.ts)}</span>
    </div>${txt}${imgHtml(m)}
  </div>`;
}

function imgHtml(m) {
  if (typeof m.img !== 'string' || !m.img.startsWith('data:image/')) return '';
  const w = +m.w, h = +m.h;
  let size = '';
  if (w > 0 && h > 0) {                                 // รู้ขนาดรูปล่วงหน้า → จองที่ไว้ แชทไม่กระตุกตอนรูปโหลดเสร็จ
    const s = Math.min(1, 240 / w, 200 / h);
    size = `width:${Math.round(w*s)}px;aspect-ratio:${w}/${h};`;
  }
  return `<img class="msg-img" src="${esc(m.img)}" alt="Image" style="${size}" onload="msgImgLoaded()" onerror="this.style.display='none'">`;
}

function msgImgLoaded() {
  if (!msgAtBottom) return;
  const el = $('msgs');
  if (el) el.scrollTop = el.scrollHeight;
}

// อัปเดตเฉพาะข้อความที่เปลี่ยน แทนการเขียนทับทั้งกล่อง
// → ข้อความเก่าไม่กระพริบ/ไม่เล่นแอนิเมชันซ้ำทุกครั้งที่มีข้อความใหม่ และรูปไม่ต้องโหลดใหม่
function reconcile(el, items, animateNew) {
  const want = new Set(items.map(i => i.k));
  const old = new Map();
  Array.from(el.children).forEach(n => {
    const k = n.dataset && n.dataset.k;
    if (k && want.has(k)) old.set(k, n); else n.remove();
  });
  let prev = null;
  items.forEach(it => {
    let n = old.get(it.k);
    if (n && n.dataset.sig !== it.sig) { const fresh = makeNode(it, false); n.replaceWith(fresh); n = fresh; }
    else if (!n) n = makeNode(it, animateNew);
    const spot = prev ? prev.nextElementSibling : el.firstElementChild;
    if (n !== spot) el.insertBefore(n, spot);
    prev = n;
  });
}

function makeNode(it, animate) {
  const box = document.createElement('div');
  box.innerHTML = it.html;
  const n = box.firstElementChild;
  n.dataset.k = it.k;
  n.dataset.sig = it.sig;
  if (animate) n.classList.add('pop');
  return n;
}

// ── SEARCH ────────────────────────────────────────────────
// ค้นจาก "สมุดรายชื่อ" usernames/ และ codes/ แทนการโหลด users ทั้งก้อน (ข้อ 3 และ 11)
function doSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 300);
}

async function runSearch() {
  const seq = ++searchSeq;
  const raw = ($('sq')?.value || '').trim();
  const res = $('res'); if (!res) return;
  lastQuery = raw;
  if (!raw) { res.innerHTML = ''; lastResults = []; return; }
  res.innerHTML = '<p class="search-msg">Searching... ✦</p>';
  const q = raw.toLowerCase().replace(/^@/, '');
  const codeQ = raw.replace(/^#/, '').toUpperCase();
  const uids = new Set();
  const jobs = [];
  if (!raw.startsWith('#') && /^[a-z0-9_\u0E01-\u0E5B]+$/.test(q)) {
    jobs.push(db.ref('usernames').orderByKey().startAt(q).endAt(q + '\uf8ff').limitToFirst(20).get()
      .then(s => s.forEach(c => { if (typeof c.val() === 'string') uids.add(c.val()); })));
  }
  if (/^[A-Z0-9_\u0E01-\u0E5B]{3,12}$/.test(codeQ)) {
    jobs.push(db.ref('codes/' + codeQ).get()
      .then(s => { if (s.exists() && typeof s.val() === 'string') uids.add(s.val()); })
      .catch(() => {}));
  }
  try { await Promise.all(jobs); }
  catch(e) {
    if (seq === searchSeq) res.innerHTML = `<p class="search-msg">Search failed: ${esc(fbErr(e))}</p>`;
    return;
  }
  if (seq !== searchSeq) return;
  const found = (await Promise.all([...uids].map(u => getProfile(u)))).filter(Boolean);
  await Promise.all(found.filter(u => u.uid !== me.uid && !isFriend(u.uid) && !incoming[u.uid] && !blocked[u.uid])
    .map(u => db.ref(`friendRequests/${u.uid}/${me.uid}`).get()
      .then(s => { if (s.exists()) sentReqs[u.uid] = true; else delete sentReqs[u.uid]; })
      .catch(() => {})));
  if (seq !== searchSeq) return;
  found.sort((a, b) => a.username.localeCompare(b.username));
  lastResults = found;
  renderSearchResults();
}

function searchBtnHtml(uid) {
  const id = safeId(uid);
  switch (relationState(uid)) {
    case 'friend':   return `<button class="btn btn-primary btn-sm" onclick="openDM('${id}')">Chat ♡</button>`;
    case 'incoming': return `<button class="btn btn-primary btn-sm" onclick="acceptRequest('${id}')">Accept ♡</button>`;
    case 'sent':     return `<span class="muted-pill">Requested ✓</span>`;
    case 'blocked':  return `<span class="muted-pill">Blocked</span>`;
    default:         return `<button class="btn btn-secondary btn-sm" onclick="sendFriendRequest('${id}')">+ Add Friend</button>`;
  }
}

function renderSearchResults() {
  const res = $('res');
  if (!res || !me) return;
  if (!lastQuery) { res.innerHTML = ''; return; }
  if (!lastResults.length) {
    res.innerHTML = '<p class="search-msg">No holographic souls found 🌌<br><span style="font-size:11px;">ลองพิมพ์ต้นชื่อ หรือ #ID แบบเต็ม</span></p>';
    return;
  }
  res.innerHTML = lastResults.map(u => {
    const isMe = u.uid === me.uid, id = safeId(u.uid);
    return `<div class="person-row">
      <div class="person-click" onclick="openProfile('${id}')">${avt(u,52,true)}
        <div style="min-width:0;"><div style="font-family:var(--f-pixel);font-size:18px;overflow:hidden;text-overflow:ellipsis;">@${esc(u.username)}</div><div style="font-size:10px;opacity:.4;">#${esc(u.code)}</div><div class="pstatus" data-uid="${esc(u.uid)}" style="font-size:10px;opacity:.7;margin-top:2px;"></div></div>
      </div>
      ${isMe ? `<span style="color:var(--pink);font-size:12px;">You ✦</span>` : searchBtnHtml(u.uid)}
    </div>`;
  }).join('');
  refreshPresence();
}

// ── UNREAD (จุดแจ้งเตือนคนทักมา) ───────────────────────────
// เวลาที่อ่านล่าสุดเก็บที่ private/<เรา>/reads → อ่านในมือถือแล้ว เปิดในคอมก็ขึ้นว่าอ่านแล้ว (ข้อ 12)
function viewingDM(uid) { return curPage === 'dm' && !!curRoom && curRoom.uid === uid && !document.hidden; }

function computeUnread() {
  unread = {};
  if (!me || !readsLoaded) return;
  friendUids().forEach(uid => {
    const m = lastMsg[uid];
    if (m && m.uid !== me.uid && (m.ts || 0) > (reads[uid] || 0) && !viewingDM(uid)) unread[uid] = true;
  });
}

function markRead(uid) {
  if (!me || !uid) return;
  const m = lastMsg[uid];
  if (m && m.uid !== me.uid && typeof m.ts === 'number' && m.ts > (reads[uid] || 0)) {
    reads[uid] = m.ts;
    db.ref(`private/${me.uid}/reads/${uid}`).set(m.ts).catch(() => {});
  }
  delete unread[uid];
  updateUnreadUI();
}

function updateUnreadUI() {
  const n = me ? Object.keys(unread).length + Object.keys(incoming).length : 0;   // แชทที่ยังไม่อ่าน + คำขอเป็นเพื่อน
  const badge = $('inbox-badge');
  if (badge) { badge.style.display = n ? 'inline-block' : 'none'; badge.textContent = n > 9 ? '9+' : String(n); }
  document.querySelectorAll('.udot').forEach(el => { el.style.display = unread[el.dataset.uid] ? 'inline-block' : 'none'; });
  document.querySelectorAll('.uname').forEach(el => { el.style.fontWeight = unread[el.dataset.uid] ? '700' : ''; });
  document.title = (n ? `(${n}) ` : '') + 'MYHOLO ✦ Y2K Space';
}

// ฟังข้อความล่าสุดของ DM แต่ละคน (เพิ่ม/ลดตามรายชื่อเพื่อน)
function startNotifListeners() {
  if (!me) return;
  const want = new Set(friendUids());
  Object.keys(notifOffs).forEach(uid => {
    if (!want.has(uid)) { notifOffs[uid](); delete notifOffs[uid]; delete lastMsg[uid]; }
  });
  want.forEach(uid => { if (!notifOffs[uid]) listenDM(uid); });
  computeUnread(); updateUnreadUI();
}

function stopNotifListeners() {
  Object.values(notifOffs).forEach(f => f());
  notifOffs = {};
}

function listenDM(uid) {
  const ref = db.ref('messages/' + dmKey(me.uid, uid)).limitToLast(1);
  let first = true;                         // ครั้งแรก = ข้อความเก่า ไม่เด้ง toast
  const handler = snap => {
    let m = null;
    snap.forEach(c => { const v = c.val(); if (v && typeof v === 'object') m = {...v, _key:c.key}; });
    const prev = lastMsg[uid];
    if (m) lastMsg[uid] = m; else delete lastMsg[uid];
    // ข้อความใหม่จริง = key ใหม่กว่าเดิม (ไม่ดูเวลาจากเครื่องคนส่งแล้ว เลยไม่หายแม้นาฬิกาเพื่อนช้า — ข้อ 4)
    const isNew = !first && !!m && m.uid !== me.uid && (!prev || m._key > prev._key);
    first = false;
    if (viewingDM(uid)) markRead(uid);
    else if (isNew) showDMNotif(m, uid);
    computeUnread(); updateUnreadUI();
    if (curPage === 'inbox') renderInbox();
  };
  ref.on('value', handler, err => console.warn('DM listener failed:', err && err.message));
  notifOffs[uid] = () => ref.off('value', handler);
}

function showDMNotif(m, uid) {
  const text = m.text ? String(m.text) : '📷 Image';
  toast(`<b style="color:var(--pink);">💬 @${esc(m.name)}</b><br><span style="font-size:11px;">${esc(text.slice(0,50))}</span>
    <button class="toast-btn" onclick="openDM('${safeId(uid)}')">Open</button>`, 5000, true);
  // แจ้งเตือนของระบบ: เฉพาะตอนไม่ได้เปิดแท็บนี้อยู่ (ถ้าเปิดอยู่มี toast แล้ว)
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification('💬 @' + m.name, {body: text.slice(0,60), tag: 'dm-' + uid});
      n.onclick = () => { window.focus(); openDM(uid); n.close(); };
    } catch(e) {}
  }
}

// ขอสิทธิ์แจ้งเตือนเมื่อผู้ใช้กดปุ่มเองเท่านั้น เบราว์เซอร์จะได้ไม่บล็อก (ข้อ 13)
function notifRowHtml() {
  if (!('Notification' in window) || Notification.permission === 'granted') return '';
  if (Notification.permission === 'denied') return `<p class="notif-row muted">🔕 Notifications are blocked in your browser settings.</p>`;
  return `<div class="notif-row"><span>Get a ping when friends message you</span><button class="btn btn-secondary btn-sm" onclick="enableNotifs()">🔔 Turn on notifications</button></div>`;
}

function enableNotifs() {
  if (!('Notification' in window)) return;
  let done = false;
  const after = p => {
    if (done) return; done = true;
    toast(p === 'granted' ? 'Notifications on! 🔔' : 'Notifications not allowed');
    const row = $('notif-row'); if (row) row.innerHTML = notifRowHtml();
  };
  try { const r = Notification.requestPermission(after); if (r && r.then) r.then(after); } catch(e) {}
}

document.addEventListener('visibilitychange', () => {
  if (!me) return;
  if (!document.hidden && curPage === 'dm' && curRoom?.uid) markRead(curRoom.uid);
  computeUnread(); updateUnreadUI();
});

// ── LIVE SYNC (ข้อมูลของเรา) ──────────────────────────────
// โปรไฟล์ + รายชื่อเพื่อนของเรา แบบ live (อีกฝ่ายกดรับ/เลิกเป็นเพื่อน ก็อัปเดตทันที)
function startMeSync() {
  if (meOff) { meOff(); meOff = null; }
  if (!me) return;
  const ref = db.ref('users/' + me.uid);
  let first = true;
  const h = ref.on('value', snap => {
    if (!me) return;
    if (!snap.exists()) { profileGone(); return; }   // หน้าโปรไฟล์ถูกลบระหว่างใช้งาน
    const next = cleanProfile(snap.val(), me.uid);
    const before = me.friends || {};
    const prevF = Object.keys(before).sort().join(), nextF = Object.keys(next.friends).sort().join();
    const added = first ? [] : Object.keys(next.friends).filter(u => !before[u]);
    const profileChanged = ['username','code','c1','c2','caption','bio'].some(k => me[k] !== next[k]);
    me = next; profileCache[me.uid] = me; first = false;
    added.forEach(async u => {
      delete sentReqs[u];
      if (justAccepted[u]) { delete justAccepted[u]; return; }
      const p = await getProfile(u);
      if (p) toast(`🎉 @${p.username} accepted your friend request!`, 4000);
    });
    if (prevF !== nextF) { startNotifListeners(); refreshRelationUI(); }
    if (profileChanged && (curPage === 'home' || curPage === 'profile')) render();
  }, err => console.warn('profile sync failed:', err && err.message));
  meOff = () => ref.off('value', h);
}

async function profileGone() {
  const uid = me && me.uid, email = (auth.currentUser && auth.currentUser.email) || '';
  if (!uid) return;
  await stopAll();
  restoreUser = {uid, email};
  toast('ไม่เจอหน้าโปรไฟล์ของบัญชีนี้แล้ว กู้คืนได้เลยนะ', 4500);
  navigate('#/', true);
}

// คนที่เราบล็อก + เวลาที่อ่านล่าสุด (เก็บใน private/ ที่มีแต่เราอ่านได้)
function startPrivateSync() {
  privOffs.forEach(f => f()); privOffs = [];
  if (!me) return;
  const bref = db.ref(`private/${me.uid}/blocked`);
  const bh = bref.on('value', s => { blocked = s.val() || {}; refreshRelationUI(); }, () => {});
  const rref = db.ref(`private/${me.uid}/reads`);
  const rh = rref.on('value', s => {
    const v = s.val() || {};
    Object.keys(v).forEach(k => { if (typeof v[k] === 'number') reads[k] = Math.max(reads[k] || 0, v[k]); });
    readsLoaded = true;
    computeUnread(); updateUnreadUI();
  }, () => { readsLoaded = true; });
  privOffs = [() => bref.off('value', bh), () => rref.off('value', rh)];
}

// คำขอเป็นเพื่อนที่ส่งมาหาเรา
function startRequestsSync() {
  if (reqOff) { reqOff(); reqOff = null; }
  if (!me) return;
  const ref = db.ref('friendRequests/' + me.uid);
  let first = true;
  const h = ref.on('value', snap => {
    const next = {};
    snap.forEach(c => { next[c.key] = c.val(); });
    const added = first ? [] : Object.keys(next).filter(u => !incoming[u]);
    incoming = next; first = false;
    added.forEach(async u => {
      const p = await getProfile(u);
      if (p) toast(`<b style="color:var(--pink);">💌 @${esc(p.username)}</b> wants to be your friend
        <button class="toast-btn" onclick="openProfile('${safeId(u)}')">View</button>`, 6000, true);
    });
    refreshRelationUI();
  }, err => console.warn('friend requests sync failed:', err && err.message));
  reqOff = () => ref.off('value', h);
}

// ย้ายข้อมูลเก่า: ลบอีเมล/grad ออกจากโปรไฟล์สาธารณะ และใส่ ID ลงสมุด codes/ ให้ค้นหาเจอ
async function migrateProfile() {
  if (!me) return;
  const uid = me.uid, fix = {};
  if ('email' in me) fix.email = null;
  if ('grad' in me) fix.grad = null;
  if (Object.keys(fix).length) {
    try { await db.ref('users/' + uid).update(fix); }
    catch(e) { console.warn('migrate profile failed:', e.message); }
  }
  if (me && me.uid === uid && /^[^.#$\[\]\/]{1,12}$/.test(me.code)) {
    try {
      const s = await db.ref('codes/' + me.code).get();
      if (!s.exists()) await db.ref('codes/' + me.code).set(uid);
    } catch(e) {}
  }
  try { localStorage.removeItem('myholo_reads_' + uid); } catch(e) {}   // ของเก่าที่เก็บแยกเครื่อง ไม่ใช้แล้ว
}

// ── RENDER ────────────────────────────────────────────────
function render() {
  const appEl = $('app');
  const nav   = $('navbar');
  if (!appEl || !nav) return;
  closeEmojiPicker();
  const isAuth = ['landing','auth','restore','verify'].includes(curPage);
  if (!me && !isAuth) curPage = 'landing';
  nav.classList.toggle('hidden', !me || isAuth);
  appEl.innerHTML = '';

  // ── VERIFY EMAIL ── (ยังไม่ได้กดลิงก์ยืนยันในอีเมล → ใช้เว็บไม่ได้)
  if (curPage==='verify' && verifyUser) {
    const sent = !!verifyUser.sentAt;
    appEl.innerHTML=`<div class="auth-wrap" style="animation:fadeUp .5s ease">
      <div class="logo-icon">✉️</div>
      <h1 style="font-family:var(--f-pixel);font-size:30px;color:var(--purple);margin-bottom:8px;">${sent ? 'Check your email' : 'Verify your email'}</h1>
      <p style="font-size:12px;opacity:.65;line-height:1.7;margin-bottom:18px;">${sent
        ? `We sent a link to <b>${esc(verifyUser.email)}</b>. Click it to confirm this email is really yours, then come back here.`
        : `MYHOLO needs a real email for every account. We'll send a link to <b>${esc(verifyUser.email)}</b>. Click it, then come back here.`}</p>
      <div class="glass-card">
        ${sent
          ? `<button id="verify-check" class="btn btn-primary btn-full" onclick="checkVerified(true)">I've verified ✓</button>
             <button id="verify-send" class="btn btn-secondary btn-full" onclick="sendVerify()">Send the link again</button>`
          : `<button id="verify-send" class="btn btn-primary btn-full" onclick="sendVerify()">Send verification link 💌</button>`}
        <p class="muted" style="margin-top:12px;line-height:1.6;">Can't find it? Check Spam or Promotions.</p>
        <div style="margin-top:10px;display:flex;justify-content:center;gap:18px;flex-wrap:wrap;">
          ${verifyUser.justSignedUp ? `<button class="link-btn" onclick="startOver()">Wrong email? Start over</button>` : ''}
          <button class="link-btn" onclick="logoutPending()">Log out</button>
        </div>
      </div></div>`;
    clearInterval(verifyTimer);
    verifyTimer = sent ? setInterval(() => { if (!document.hidden) checkVerified(false); }, 4000) : null;
    if (!sent) setTimeout(() => checkVerified(false), 0);   // เผื่อยืนยันไปแล้วจากเครื่องอื่น

  // ── SET UP / RESTORE PAGE ── (ยืนยันอีเมลแล้วแต่ยังไม่มีหน้า หรือหน้าเดิมหาย)
  } else if (curPage==='restore' && restoreUser) {
    appEl.innerHTML=`<div class="auth-wrap" style="animation:fadeUp .5s ease">
      <div class="logo-icon">✦</div>
      <h1 id="restore-title" style="font-family:var(--f-pixel);font-size:30px;color:var(--purple);margin-bottom:8px;">Set up your page</h1>
      <p id="restore-text" style="font-size:12px;opacity:.65;line-height:1.7;margin-bottom:18px;">Signed in as <b>${esc(restoreUser.email)}</b>. Pick a username to finish setting up your page.</p>
      <div class="glass-card">
        <div class="inp-group"><label for="f-un">Username</label><input id="f-un" class="fld" placeholder="cool_pixel" maxlength="20" autocomplete="username" value="${esc(restoreUser.suggest || '')}" onkeydown="if(event.key==='Enter')restoreProfile()"></div>
        <p id="restore-hint" class="muted" style="text-align:left;margin:-4px 2px 8px;line-height:1.6;">Checking your username...</p>
        <button id="restore-btn" class="btn btn-primary btn-full" onclick="restoreProfile()">Save my page ✦</button>
        <button class="link-btn" style="margin-top:14px;" onclick="logoutPending()">Log out</button>
      </div></div>`;
    loadRestorePrefill();

  // ── LANDING ──
  } else if (curPage==='landing') {
    appEl.innerHTML=`<div class="hero" style="animation:fadeUp .7s ease">
      <div class="badge"><span class="dot"></span> est. 2026 · global y2k hub · Firebase</div>
      <h1 class="hero-title">make a page.<br>find your<br>people.</h1>
      <div class="hero-btns">
        <button class="btn btn-primary" onclick="setAuthTab('signup')">✦ Sign Up</button>
        <button class="btn btn-secondary" onclick="setAuthTab('login')">♡ Log In</button>
      </div></div>`;

  // ── AUTH ──
  } else if (curPage==='auth') {
    const su = authTab === 'signup';
    const enter = `onkeydown="if(event.key==='Enter')handleAuth()"`;
    appEl.innerHTML=`<div class="auth-wrap" style="animation:fadeUp .5s ease">
      <div class="logo-icon">✦</div>
      <h1 style="font-family:var(--f-pixel);font-size:36px;color:var(--purple);margin-bottom:20px;">MYHOLO</h1>
      <div class="glass-card">
        <div class="tabs">
          <button class="tab ${su?'active':''}" onclick="setAuthTab('signup')">✨ Sign Up</button>
          <button class="tab ${su?'':'active'}" onclick="setAuthTab('login')">♡ Log In</button>
        </div>
        ${su ? `<div class="inp-group"><label for="f-un">Username</label><input id="f-un" class="fld" placeholder="cool_pixel" maxlength="20" autocomplete="username" ${enter}></div>` : ''}
        <div class="inp-group"><label for="f-em">Email</label><input id="f-em" class="fld" type="email" placeholder="you@gmail.com" autocomplete="email" ${enter}></div>
        <div class="inp-group"><label for="f-pw">Password</label><input id="f-pw" class="fld" type="password" placeholder="••••••" autocomplete="${su?'new-password':'current-password'}" ${enter}></div>
        ${su ? '' : `<div style="text-align:right;margin:-4px 2px 4px;"><button id="forgot-btn" class="link-btn" onclick="forgotPassword()">Forgot password?</button></div>`}
        <button id="auth-btn" class="btn btn-primary btn-full" onclick="handleAuth()">${su?'Create Page ✦':'Login ♡'}</button>
      </div></div>`;

  // ── HOME ──
  } else if (curPage==='home') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <div class="card" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:linear-gradient(135deg,rgba(255,156,219,.07),rgba(130,204,255,.07));margin-bottom:16px;">
        ${avt(me,76)}
        <div style="flex:1;min-width:150px;">
          <h2 style="font-family:var(--f-pixel);font-size:23px;overflow-wrap:anywhere;">hey <span style="color:var(--blue);">@${esc(me.username)}</span> ✿</h2>
          <p style="opacity:.45;font-size:11px;">Your ID: <b>#${esc(me.code)}</b></p>
          <p class="pstatus" data-uid="${esc(me.uid)}" style="font-size:11px;margin-top:2px;"></p>
        </div>
        <button class="btn btn-primary" style="padding:8px 16px;font-size:13px;" onclick="goPage('profile')">my page →</button>
      </div>
      <div id="notif-row">${notifRowHtml()}</div>
      <div style="background:rgba(74,222,128,.07);border:1px dashed rgba(74,222,128,.4);border-radius:22px;padding:14px 18px;margin-bottom:10px;display:flex;gap:12px;align-items:center;">
        <span style="font-size:20px;">🌐</span>
        <div><p style="font-weight:700;font-size:13px;color:#16a34a;">Live & Real-time ✦<span id="online-count" style="font-weight:400;opacity:.8;"></span></p>
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
      </div></div>`;

  // ── CHAT LOBBY ──
  } else if (curPage==='chat_lobby') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;">
        <h1 style="font-family:var(--f-pixel);color:var(--pink);font-size:26px;">Global Rooms</h1>
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
    const isDM = curPage === 'dm';
    const title = isDM
      ? `<button id="chat-title" class="chat-title chat-title-btn" onclick="openProfile('${safeId(curRoom.uid)}')" title="View profile">@${esc(curRoom.username)}</button>`
      : `<b id="chat-title" class="chat-title">${esc(curRoom.name)}</b>`;
    appEl.innerHTML=`<div class="chat-wrap" style="animation:fadeUp .4s ease;">
      <div class="chat-head">
        <button class="chat-back" onclick="goBack('${isDM ? '#/inbox' : '#/rooms'}')">← Back</button>
        ${title}
        ${isDM
          ? `<span class="pstatus" data-uid="${esc(curRoom.uid)}" style="font-size:11px;white-space:nowrap;"></span>`
          : `<span style="font-size:11px;white-space:nowrap;"><span class="dot"></span>Live</span>`}
      </div>
      <div class="chat-msgs" id="msgs">
        <p class="chat-empty">Loading... ✦</p>
      </div>
      <div class="chat-foot" id="chat-foot" data-state="${chatFootState()}">${chatFootHtml()}</div>
      <div id="epick" class="emoji-picker hidden">
        ${EMOJIS.map(e=>`<button type="button" onclick="pickEmoji(this.textContent)">${e}</button>`).join('')}
      </div></div>`;
    startMsgListener();
    if (isDM) { watchMutual(curRoom.uid); markRead(curRoom.uid); }   // เปิดแชท = อ่านแล้ว จุดหาย

  // ── OTHER USER'S PROFILE ── (คลิกชื่อในแชทแล้วมาหน้านี้ก่อน มีปุ่ม +Add Friend แยก)
  } else if (curPage==='user' && curRoom) {
    const u = curRoom;
    const nFriends = Object.keys(u.friends || {}).filter(x => x !== 'holobot').length;
    appEl.innerHTML = u.loading
      ? `<div class="card" style="text-align:center;opacity:.5;font-size:12px;">Loading profile... ✦</div>`
      : `<div style="animation:fadeUp .5s ease">
      <button class="back-link" onclick="goBack('#/find')">← Back</button>
      <div class="prof-grid" style="margin-top:8px;">
        <div><div class="card" style="text-align:center;">
          <div class="prof-pic" style="background:${gradOf(u)};">${esc(initialOf(u.username))}</div>
          <h2 style="font-family:var(--f-pixel);font-size:22px;margin:14px 0 4px;overflow-wrap:anywhere;">${esc(u.username)}</h2>
          <p style="font-size:11px;opacity:.4;">#${esc(u.code)}</p>
          <p style="font-size:11px;opacity:.55;margin-top:2px;">♡ ${nFriends} friend${nFriends === 1 ? '' : 's'}</p>
          <p class="pstatus" data-uid="${esc(u.uid)}" style="font-size:11px;margin:4px 0 10px;"></p>
          <p class="prof-caption">"${esc(u.caption)}"</p>
          <div id="rel-actions" class="prof-actions">${relationActionsHtml(u.uid)}</div>
        </div></div>
        <div>
          <div class="card"><h3 style="font-family:var(--f-pixel);color:var(--pink);margin-bottom:10px;">✦ Bio</h3><p style="line-height:1.7;font-size:13px;white-space:pre-wrap;">${esc(u.bio)}</p></div>
        </div>
      </div></div>`;
    if (!u.loading) checkOutgoing(u.uid);

  // ── FIND ──
  } else if (curPage==='find') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <h1 style="font-family:var(--f-pixel);color:var(--pink);font-size:26px;margin-bottom:22px;">✦ Find People</h1>
      <div class="search-pill">
        <input id="sq" placeholder="Search username or #ID" aria-label="Search username or ID" autocomplete="off" oninput="doSearch()" onkeydown="if(event.key==='Enter')doSearch()">
        <button onclick="doSearch()">Search ✦</button>
      </div>
      <div id="res"></div></div>`;
    $('sq').value = lastQuery;          // กด Back กลับมา ผลค้นหาเดิมยังอยู่
    renderSearchResults();

  // ── INBOX ──
  } else if (curPage==='inbox') {
    appEl.innerHTML=`<div style="animation:fadeUp .5s ease">
      <h1 style="font-family:var(--f-pixel);color:var(--pink);font-size:26px;margin-bottom:22px;">✦ My Inbox</h1>
      <div id="inbox-req"></div>
      <div class="card" id="inbox-list"><p style="text-align:center;opacity:.4;font-size:12px;padding:22px;">Loading... ✦</p></div>
    </div>`;
    loadInbox();

  // ── PROFILE ──
  } else if (curPage==='profile') {
    appEl.innerHTML=`<div class="prof-grid" style="animation:fadeUp .5s ease">
      <div><div class="card" style="text-align:center;">
        <div class="prof-pic" style="background:${gradOf(me)};">${esc(initialOf(me.username))}</div>
        <h2 style="font-family:var(--f-pixel);font-size:22px;margin:14px 0 4px;overflow-wrap:anywhere;">${esc(me.username)}</h2>
        <p style="font-size:11px;opacity:.4;margin-bottom:10px;">#${esc(me.code)}</p>
        <p class="prof-caption">"${esc(me.caption)}"</p>
        <button class="btn btn-primary" style="width:100%;margin-top:14px;justify-content:center;" onclick="goPage('edit')">Edit Profile</button>
      </div></div>
      <div>
        <div class="card"><h3 style="font-family:var(--f-pixel);color:var(--pink);margin-bottom:10px;">✦ Bio</h3><p style="line-height:1.7;font-size:13px;white-space:pre-wrap;">${esc(me.bio)}</p></div>
        <div class="card" id="friends-card"><h3 style="font-family:var(--f-pixel);color:var(--pink);margin-bottom:14px;">✦ Friends</h3><p style="opacity:.4;font-size:12px;">Loading...</p></div>
        <div class="card" id="blocked-card" style="display:none;"></div>
      </div></div>`;
    loadFriends();

  // ── EDIT ──
  } else if (curPage==='edit') {
    const lab = `style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;margin-bottom:5px;"`;
    appEl.innerHTML=`<div class="card" style="max-width:600px;margin:0 auto;animation:fadeUp .5s ease">
      <h2 style="font-family:var(--f-pixel);color:var(--pink);font-size:24px;margin-bottom:20px;">🎨 Design Your Space</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div><label for="ec1" ${lab}>Color 1</label><input type="color" id="ec1" class="fld" style="padding:4px;height:46px;" value="${safeColor(me.c1, C1)}"></div>
        <div><label for="ec2" ${lab}>Color 2</label><input type="color" id="ec2" class="fld" style="padding:4px;height:46px;" value="${safeColor(me.c2, C2)}"></div>
      </div>
      <div class="inp-group"><label for="ecap">Caption</label><input id="ecap" class="fld" maxlength="${MAX_CAPTION}" value="${esc(me.caption)}"></div>
      <div class="inp-group"><label for="ebio">Bio</label><textarea id="ebio" class="fld" maxlength="${MAX_BIO}" style="height:90px;">${esc(me.bio)}</textarea></div>
      <button id="save-btn" class="btn btn-primary btn-full" onclick="saveProfile()">Save Changes ✦</button>
    </div>`;
  }
  refreshPresence();
}

// ── CHAT FOOTER (ช่องพิมพ์ / ข้อความแจ้งเตือนถ้ายังส่งไม่ได้) ─────────
function chatFootState() {
  if (curPage !== 'dm' || !curRoom || !me) return 'ok';
  if (!isFriend(curRoom.uid)) return 'gone';
  if (curRoom.mutualKnown && !(curRoom.friends || {})[me.uid]) return sentReqs[curRoom.uid] ? 'waiting-sent' : 'waiting';
  return 'ok';
}

function chatFootHtml() {
  const st = chatFootState();
  const id = curRoom ? safeId(curRoom.uid) : '', name = curRoom ? esc(curRoom.username) : '';
  if (st === 'gone') return `<p class="chat-note">You and @${name} aren't friends right now.</p><button class="btn btn-secondary btn-sm" onclick="openProfile('${id}')">View profile</button>`;
  if (st === 'waiting') return `<p class="chat-note">⏳ @${name} hasn't added you back yet, so messages can't be sent.</p><button class="btn btn-primary btn-sm" onclick="sendFriendRequest('${id}', true)">Send request</button>`;
  if (st === 'waiting-sent') return `<p class="chat-note">⏳ Request sent. You can chat once @${name} accepts.</p>`;
  return `<button id="emoji-toggle" class="icon-btn" onclick="toggleEmojiPicker()" title="Emoji" aria-label="Emoji" aria-expanded="false">😀</button>
    <button class="icon-btn" onclick="triggerImageUpload()" title="Send image" aria-label="Send image">🖼️</button>
    <input type="file" id="img-input" accept="image/*" hidden onchange="handleImageUpload(this)">
    <input id="cinp" class="chat-inp" placeholder="Say something..." maxlength="${MAX_TEXT}" autocomplete="off" aria-label="Message" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();sendMsg();}">
    <button class="send-btn" onclick="sendMsg()">Send</button>`;
}

function updateChatFoot() {
  const f = $('chat-foot');
  if (!f) return;
  const st = chatFootState();
  if (f.dataset.state === st) return;                // สถานะเดิม ไม่ต้องวาดใหม่ (ข้อความที่พิมพ์ค้างไว้ไม่หาย)
  f.dataset.state = st;
  f.innerHTML = chatFootHtml();
  closeEmojiPicker();
}

function updateDMHeader() {
  const t = $('chat-title');
  if (t && curRoom) t.textContent = '@' + curRoom.username;
  updateChatFoot();
}

// ฟังว่าอีกฝ่ายมีเราในรายชื่อเพื่อนไหม (ถ้าไม่มี = ส่ง DM ไม่ได้ จะขึ้นบอกแทนช่องพิมพ์)
function watchMutual(uid) {
  const ref = db.ref(`users/${uid}/friends/${me.uid}`);
  const h = ref.on('value', s => {
    if (!curRoom || curRoom.uid !== uid) return;
    curRoom.friends = {...(curRoom.friends || {})};
    if (s.exists()) curRoom.friends[me.uid] = true; else delete curRoom.friends[me.uid];
    curRoom.mutualKnown = true;
    updateChatFoot();
  }, () => {});
  pageOffs.push(() => ref.off('value', h));
}

// ── LOADERS ───────────────────────────────────────────────
async function loadInbox() {
  if (!$('inbox-list')) return;
  const need = [...Object.keys(incoming), ...friendUids()].filter(u => !profileCache[u]);
  if (need.length) await Promise.all(need.map(u => getProfile(u)));
  if (curPage === 'inbox') renderInbox();
}

// หน้า Inbox: โชว์ข้อความล่าสุด + เรียงตามแชทที่คุยล่าสุด (ข้อ 14)
function renderInbox() {
  const reqEl = $('inbox-req'), el = $('inbox-list');
  if (!reqEl || !el || !me) return;
  const reqs = Object.keys(incoming).map(u => profileCache[u]).filter(Boolean);
  reqEl.innerHTML = !reqs.length ? '' : `<div class="card"><h3 style="font-family:var(--f-pixel);color:var(--pink);margin-bottom:8px;">💌 Friend requests (${reqs.length})</h3>
    ${reqs.map(u => { const id = safeId(u.uid); return `<div class="req-row">
      <div class="person-click" onclick="openProfile('${id}')">${avt(u,44,true)}
        <div style="min-width:0;"><div style="font-family:var(--f-pixel);font-size:17px;overflow:hidden;text-overflow:ellipsis;">@${esc(u.username)}</div><div class="muted">#${esc(u.code)}</div></div>
      </div>
      <div class="req-btns"><button class="btn btn-primary btn-sm" onclick="acceptRequest('${id}')">Accept ♡</button><button class="btn btn-secondary btn-sm" onclick="declineRequest('${id}')">Decline</button></div>
    </div>`; }).join('')}</div>`;

  const fr = friendUids();
  if (!fr.length) { el.innerHTML = '<p style="text-align:center;opacity:.4;font-size:12px;padding:22px;">No friends yet. Find people to chat! ♡</p>'; return; }
  const friends = fr.map(u => profileCache[u]).filter(Boolean);
  if (!friends.length) { el.innerHTML = '<p style="opacity:.4;font-size:12px;text-align:center;padding:22px;">No friends found.</p>'; return; }
  const tsOf = uid => (lastMsg[uid] && lastMsg[uid].ts) || 0;
  friends.sort((a, b) => (tsOf(b.uid) - tsOf(a.uid)) || a.username.localeCompare(b.username));
  el.innerHTML = friends.map(f => {
    const m = lastMsg[f.uid], id = safeId(f.uid);
    const preview = m ? (m.uid === me.uid ? 'You: ' : '') + (m.text ? m.text : '📷 Image') : 'No messages yet. Say hi! 👋';
    return `<div class="inbox-item" onclick="openDM('${id}')">${avt(f,44,true)}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
          <div class="uname" data-uid="${esc(f.uid)}" style="font-family:var(--f-pixel);font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">@${esc(f.username)}</div>
          ${m ? `<span class="inbox-time">${esc(shortWhen(m.ts))}</span>` : ''}
        </div>
        <div class="inbox-preview">${esc(preview)}</div>
        <div class="pstatus" data-uid="${esc(f.uid)}" style="font-size:10px;opacity:.6;"></div>
      </div>
      <span class="udot" data-uid="${esc(f.uid)}" title="New message" style="display:none;width:11px;height:11px;border-radius:50%;background:var(--pink);box-shadow:0 0 0 3px rgba(255,156,219,.28);flex-shrink:0;"></span></div>`;
  }).join('');
  refreshPresence();
}

async function loadFriends() {
  const el = $('friends-card'); if (!el || !me) return;
  const fr = friendUids();
  const head = `<h3 style="font-family:var(--f-pixel);color:var(--pink);margin-bottom:14px;">✦ Friends (${fr.length})</h3>`;
  const bl = Object.keys(blocked);
  const need = [...fr, ...bl].filter(u => !profileCache[u]);
  if (need.length) await Promise.all(need.map(u => getProfile(u)));
  const el2 = $('friends-card'); if (!el2 || curPage !== 'profile') return;   // ผู้ใช้ย้ายหน้าไปแล้ว
  const friends = fr.map(u => profileCache[u]).filter(Boolean);
  el2.innerHTML = head + (!friends.length
    ? '<p style="opacity:.4;font-size:12px;text-align:center;">No friends yet ♡</p>'
    : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:12px;">
      ${friends.map(f => `
        <div style="text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;" onclick="openDM('${safeId(f.uid)}')">${avt(f,46,true)}
          <div style="font-size:10px;margin-top:4px;opacity:.65;max-width:100%;overflow:hidden;text-overflow:ellipsis;">@${esc(f.username)}</div>
        </div>`).join('')}
    </div>`);
  const bc = $('blocked-card');
  if (bc) {
    bc.style.display = bl.length ? '' : 'none';
    bc.innerHTML = !bl.length ? '' : `<h3 style="font-family:var(--f-pixel);color:var(--slate);margin-bottom:8px;">🚫 Blocked (${bl.length})</h3>
      ${bl.map(u => { const p = profileCache[u] || {uid:u, username:'unknown'}; return `<div class="req-row">
        <div style="flex:1;min-width:0;font-size:13px;">@${esc(p.username)}</div>
        <button class="btn btn-secondary btn-sm" onclick="unblockUser('${safeId(u)}')">Unblock</button>
      </div>`; }).join('')}`;
  }
  refreshPresence();
}

// ── PRESENCE (online / offline) ───────────────────────────
// เก็บที่ presence/<uid>/conns/<id> = true  (1 แท็บ = 1 connection, ปิดแท็บ/เน็ตหลุด server ลบให้เอง)
// ออนไลน์ = มี connection อย่างน้อย 1 อัน  → เปิดหลายแท็บ/หลายเครื่องก็ไม่เพี้ยน
function startPresence() {
  stopPresenceListeners();
  if (!me) return;
  const connected = db.ref('.info/connected');
  const ch = connected.on('value', async snap => {
    if (snap.val() !== true || !me) return;
    const conn = db.ref(`presence/${me.uid}/conns`).push();
    myConnRef = conn;
    try {
      await conn.onDisconnect().remove();
      await db.ref(`presence/${me.uid}/lastSeen`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
      await conn.set(true);
    } catch(e) { console.warn('presence write failed (เช็ค Rules ของ presence):', e.message); }
  });
  connOff = () => connected.off('value', ch);

  const pref = db.ref('presence');
  const ph = pref.on('value', snap => {
    const next = {};
    snap.forEach(c => {
      const v = c.val() || {};
      next[c.key] = { online: !!(v.conns && Object.keys(v.conns).length), lastSeen: v.lastSeen || 0 };
    });
    onlineMap = next;
    refreshPresence();
  }, err => console.warn('presence read failed (เช็ค Rules ของ presence):', err.message));
  presenceOff = () => pref.off('value', ph);
}

function stopPresenceListeners() {
  if (connOff)     { connOff(); connOff = null; }
  if (presenceOff) { presenceOff(); presenceOff = null; }
}

async function stopPresence() {
  stopPresenceListeners();
  const uid = me && me.uid, conn = myConnRef;
  myConnRef = null;
  if (!conn || !uid) return;
  try {
    await conn.onDisconnect().cancel();
    await db.ref(`presence/${uid}/lastSeen`).onDisconnect().cancel();
    await conn.remove();
    await db.ref(`presence/${uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
  } catch(e) {}
}

// ล็อกเอาต์จากอีกแท็บ: แท็บนี้ไม่มีสิทธิ์ลบสถานะ online ของตัวเองแล้ว
// → ตัดการเชื่อมต่อแป๊บนึง ให้ server ทำ onDisconnect ที่ตั้งไว้ตอนล็อกอิน (ลบ online + บันทึก last seen) แทน
function dropPresence() {
  stopPresenceListeners();
  if (!myConnRef) return;
  myConnRef = null;
  db.goOffline();
  db.goOnline();
}

function statusHtml(uid) {
  const p = onlineMap[uid];
  if (p && p.online) return '<span class="dot"></span>online';
  const grey = '<span class="dot" style="background:#cbd5e1"></span>';
  if (!p || !p.lastSeen) return grey+'offline';
  const d = new Date(p.lastSeen), now = new Date();
  const when = d.toDateString()===now.toDateString()
    ? d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
    : d.toLocaleDateString([], {day:'numeric', month:'short'});
  return grey+'last seen '+esc(when);
}

function refreshPresence() {
  updateUnreadUI();
  document.querySelectorAll('.pdot').forEach(el => {
    el.style.background = (onlineMap[el.dataset.uid] && onlineMap[el.dataset.uid].online) ? '#4ade80' : '#cbd5e1';
  });
  document.querySelectorAll('.pstatus').forEach(el => { el.innerHTML = statusHtml(el.dataset.uid); });
  const c = $('online-count');
  if (c) {
    const n = Object.values(onlineMap).filter(v => v.online).length;
    c.textContent = n ? ` · ${n} online now` : '';
  }
}

// ── ENTER / LEAVE ─────────────────────────────────────────
// เรียกทุกครั้งที่ล็อกอิน/สมัครสำเร็จ หรือโหลดหน้าแล้วยังล็อกอินค้างอยู่
function enterApp() {
  profileCache[me.uid] = me;
  reads = {}; readsLoaded = false; unread = {}; incoming = {}; sentReqs = {}; blocked = {}; lastMsg = {}; justAccepted = {};
  lastQuery = ''; lastResults = [];
  migrateProfile();
  startPresence();        // ← ขึ้น "online" ทันทีที่เข้าบัญชี
  startMeSync();
  startPrivateSync();
  startRequestsSync();
  startNotifListeners();
}

// authGone = ออกจากระบบไปแล้วจากแท็บอื่น (เขียนข้อมูลไม่ได้แล้ว)
async function stopAll(authGone=false) {
  leavePage();
  stopNotifListeners();
  if (meOff)  { meOff(); meOff = null; }
  if (reqOff) { reqOff(); reqOff = null; }
  privOffs.forEach(f => f()); privOffs = [];
  if (authGone) dropPresence();
  else await Promise.race([stopPresence(), new Promise(r => setTimeout(r, 1500))]);   // เน็ตหลุดก็ไม่ค้าง
  me = null; curRoom = null; profileCache = {}; onlineMap = {};
  unread = {}; reads = {}; readsLoaded = false; incoming = {}; sentReqs = {}; blocked = {}; lastMsg = {};
  lastQuery = ''; lastResults = [];
  updateUnreadUI();
}

// ── AUTH STATE ────────────────────────────────────────────
const _loadTimeout = setTimeout(() => {
  const el = $('loading');
  if (el && !el.classList.contains('hidden')) {
    el.classList.add('hidden');
    me = null;
    route();
  }
}, 10000);

auth.onAuthStateChanged(async user => {
  clearTimeout(_loadTimeout);
  $('loading').classList.add('hidden');
  if (authBusy) return;          // กำลังสมัคร/ล็อกอินอยู่ ให้ handleAuth จัดการเอง (กันหน้ากระพริบกลับ landing)
  if (me && (!user || user.uid !== me.uid)) await stopAll(true);   // ออก/เปลี่ยนบัญชีจากแท็บอื่นในเบราว์เซอร์เดียวกัน
  if (!user || (restoreUser && restoreUser.uid !== user.uid)) restoreUser = null;
  if (!user || (verifyUser && verifyUser.uid !== user.uid)) verifyUser = null;
  if (user) {
    // จัดการบัญชีนี้ไปแล้ว (เช่นแจ้งเตือนจาก Firebase มาช้ากว่าปุ่มล็อกอิน) → ไม่ต้องวาดหน้าใหม่ ไม่งั้นที่พิมพ์ค้างไว้จะหาย
    if ((me && me.uid === user.uid) || (verifyUser && verifyUser.uid === user.uid) || (restoreUser && restoreUser.uid === user.uid)) return;
    try { await afterSignedIn(user); }
    catch(e) { console.warn(e); me = null; toast('Cannot load profile: ' + fbErr(e)); }
  }
  route();                       // เปิดหน้าตามลิงก์ในแถบที่อยู่ (รีเฟรชแล้วอยู่หน้าเดิม)
});

// ── SPARKLE BG ────────────────────────────────────────────
const bgCanvas = $('bg');
const bgCtx    = bgCanvas.getContext('2d');
const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let dots = [];
function sizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
function initBg() {
  sizeBg();
  // เก็บตำแหน่งเป็นสัดส่วนของจอ → ย่อ/ขยายหน้าต่าง (หรือแถบที่อยู่บนมือถือหด) จุดไม่กระโดด
  dots = Array.from({length:28}, () => ({x:Math.random(), y:Math.random(), s:Math.random()*2+.4, v:Math.random()*.14+.03}));
}
function drawBg() {
  const W = bgCanvas.width, H = bgCanvas.height;
  bgCtx.clearRect(0, 0, W, H);
  bgCtx.fillStyle = 'rgba(255,156,219,0.14)';
  dots.forEach(d => { bgCtx.beginPath(); bgCtx.arc(d.x*W, d.y*H, d.s, 0, Math.PI*2); bgCtx.fill(); });
}
function tickBg() {
  const H = bgCanvas.height || 1;
  dots.forEach(d => { d.y -= d.v / H; if (d.y < 0) d.y = 1; });
  drawBg();
  requestAnimationFrame(tickBg);
}
window.addEventListener('resize', () => { sizeBg(); if (calmMotion) drawBg(); });
initBg();
if (calmMotion) drawBg(); else tickBg();

// SKY FIELD — live approvals. While the approvals / "My timesheet" screen is open and the tab is visible,
// a light check runs every 20 seconds: pending counts and the latest submission, review and settlement
// times. It never reloads the page.
//  • Administrators: when something new arrives, a bar says what arrived with a "Show" button; the list
//    changes only when you press it, so a row can never move under the pointer while you are about to
//    approve. If your list has nothing waiting for a decision, it simply updates by itself.
//  • Engineers ("My timesheet"): decisions appear by themselves (read-only screen), unless typing.
(function(){
const EVERY=Number(window.SF_LIVE_INTERVAL_MS)||20000;
let lastSig=null,base=null,running=false,waiting=false;
const T=(ar,en)=>language==='en'?en:ar;
const section=()=>document.getElementById('monthlySection');
const onScreen=()=>document.visibilityState==='visible'&&section()&&!section().hidden&&section().offsetParent!==null;
const isAdmin=()=>typeof me!=='undefined'&&me&&me.role==='admin';
async function count(table){const {count:n,error}=await db.from(table).select('id',{count:'exact',head:true}).eq('review','pending');if(error)throw error;return n||0}
async function newest(table,col){const {data,error}=await db.from(table).select(col).not(col,'is',null).order(col,{ascending:false}).limit(1);if(error)throw error;return data?.[0]?.[col]||''}
async function signature(){
 const parts=await Promise.all([count('sf_daily_records'),count('sf_daily_expenses'),
  newest('sf_daily_records','created_at'),newest('sf_daily_expenses','created_at'),
  newest('sf_daily_records','reviewed_at'),newest('sf_daily_expenses','reviewed_at'),newest('sf_daily_expenses','settled_at')]);
 return{key:parts.join('|'),days:parts[0],expenses:parts[1]};
}
function userIsBusy(){
 const a=document.activeElement,s=section();
 if(a&&s&&s.contains(a)&&a.tagName==='TEXTAREA')return true;
 // Free-text fields only: a month or date picker keeps focus after use but nothing is being typed.
 if(a&&s&&s.contains(a)&&(a.isContentEditable||(a.tagName==='INPUT'&&['text','search','number','email','tel','url',''].includes(a.type))))return true;
 try{if(rejectingPeriod||rejectingExpense)return true}catch(_){}
 return false;
}
// Anything in the list still waiting for this administrator's decision?
function listHasPending(){try{return records.some(r=>r.review==='pending')}catch(_){return true}}
function bar(){
 let b=document.getElementById('liveUpdateBar');
 if(!b){b=document.createElement('div');b.id='liveUpdateBar';b.className='live-update-bar';b.hidden=true;b.setAttribute('role','status');
  b.innerHTML='<span></span><button type="button"></button>';b.querySelector('button').onclick=()=>applyUpdate();
  const anchor=section()?.querySelector('h2');(anchor?anchor.after(b):section()?.prepend(b));}
 return b;
}
function arrivedText(sig){
 const exp=base?sig.expenses-base.expenses:0,days=base?sig.days-base.days:0,bits=[];
 if(exp>0)bits.push(T(`${exp} ${exp===1?'مصروف جديد':'مصروفات جديدة'}`,`${exp} new expense${exp>1?'s':''}`));
 if(days>0)bits.push(T(`أيام حضور جديدة (${days} يوم)`,`new attendance (${days} day${days>1?'s':''})`));
 return bits.length?T('وصل ','Arrived: ')+bits.join(T(' و',' and '))+'.':T('تغيّرت بعض الطلبات (تصحيح أو سحب أو اعتماد من مدير آخر).','Some requests changed (corrected, withdrawn or decided by another administrator).');
}
function showBar(kind,sig){
 const b=bar();b.hidden=false;b.classList.toggle('done',kind==='done');
 b.querySelector('span').textContent=kind==='done'?T('تم تحديث القائمة.','List updated.'):arrivedText(sig);
 const btn=b.querySelector('button');btn.hidden=kind==='done';btn.textContent=T('عرض','Show');
 clearTimeout(b._t);if(kind==='done')b._t=setTimeout(()=>{b.hidden=true},4000);
}
async function applyUpdate(){
 if(running)return;running=true;
 try{
  const y=window.scrollY,sig=lastSig;
  await refresh({quiet:true});
  window.scrollTo(0,y);waiting=false;base=sig;showBar('done');
  try{if(window.parent!==window&&window.parent.sfApprovalsChanged)window.parent.sfApprovalsChanged()}catch(_){}
 }catch(error){console.warn('Live update failed',error)}finally{running=false}
}
async function tick(){
 if(running||!onScreen()||typeof db==='undefined'||!db||typeof me==='undefined'||!me)return;
 let sig;try{sig=await signature()}catch(error){return} // offline or blocked: try again next time
 if(lastSig===null){lastSig=sig;base=sig;return}
 if(sig.key===lastSig.key&&!waiting)return;
 lastSig=sig;
 if(userIsBusy()||(isAdmin()&&listHasPending())){waiting=true;showBar('waiting',sig);return}
 await applyUpdate();
}
setInterval(tick,EVERY);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(tick,300)});
window.addEventListener('online',()=>setTimeout(tick,500));
window.sfLiveCheckNow=tick;
// A reload started by the user (Refresh button, approving, rejecting) already shows the latest data:
// take the current state as the new baseline so it is not announced as "new".
window.sfLiveAbsorb=async()=>{try{const sig=await signature();lastSig=sig;base=sig;waiting=false;const b=document.getElementById('liveUpdateBar');if(b&&!b.classList.contains('done'))b.hidden=true}catch(_){}};
})();

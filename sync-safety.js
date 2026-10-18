// SKY FIELD — sync safety: an edit that has not reached the server is never replaced by the server copy.
//
// Two kinds of data are synced:
//  • shared keys (equipment, engineers, payroll sheets, settings…): each change is uploaded with
//    sf_workspace_save_key. A failed upload used to be forgotten, and the next download replaced it.
//  • records (quotations, projects, invoices): uploaded one by one; a failed upload was kept in memory
//    only, so a download or a new sign-in replaced it.
// Both are now written to a list kept in this browser ('skyfield:unsaved', outside the synced 'sf…'
// keys) until the server confirms them. While anything is on that list, a download keeps the local
// version of those items, and a full refresh waits until they are saved. Uploads are retried when
// the connection returns and every 30 seconds. Errors the server will always refuse (permissions,
// invalid data) are not retried: the change cannot be saved, so it is dropped with a message.

const SF_UNSAVED_STORE='skyfield:unsaved';
const SF_RECORD_KINDS={quotes:{cache:'sfSavedQuotations',list:()=>savedQuotes,set:v=>{savedQuotes=v}},
 projects:{cache:'sfProjects',list:()=>projects,set:v=>{projects=v}},
 invoices:{cache:'sfProformaInvoices',list:()=>proformaInvoices,set:v=>{proformaInvoices=v}}};
let sfRetryTimer=null;

function sfUnsavedRead(){
 try{const v=JSON.parse(localStorage.getItem(SF_UNSAVED_STORE)||'null');if(v&&typeof v==='object')return{uid:v.uid||'',keys:Array.isArray(v.keys)?v.keys:[],quotes:v.quotes||[],projects:v.projects||[],invoices:v.invoices||[]}}catch(_){}
 return{uid:'',keys:[],quotes:[],projects:[],invoices:[]};
}
function sfUnsavedWrite(state){
 const uid=(typeof sfCurrentUser!=='undefined'&&sfCurrentUser?.id)||state.uid||'';
 // written with the original setItem path is fine: the key does not start with 'sf', so it is never synced
 localStorage.setItem(SF_UNSAVED_STORE,JSON.stringify({...state,uid}));
}
function sfUnsavedUpdate(fn){const s=sfUnsavedRead();fn(s);s.keys=[...new Set(s.keys)];['quotes','projects','invoices'].forEach(k=>s[k]=[...new Set(s[k].map(String))]);sfUnsavedWrite(s)}
// A different account on this browser: its unsaved list does not apply.
function sfUnsavedAdopt(userId){const s=sfUnsavedRead();if(s.uid&&s.uid!==userId){localStorage.removeItem(SF_UNSAVED_STORE)}}
function sfPendingMark(key){sfUnsavedUpdate(s=>s.keys.push(key))}
function sfPendingClear(key){sfUnsavedUpdate(s=>{s.keys=s.keys.filter(k=>k!==key)})}
function sfPendingKeys(){return sfUnsavedRead().keys}
function sfDirtyMark(kind,id,on){if(!SF_RECORD_KINDS[kind]||id==null)return;sfUnsavedUpdate(s=>{s[kind]=s[kind].filter(x=>x!==String(id));if(on)s[kind].push(String(id))})}
function sfDirtyIds(kind){return new Set(sfUnsavedRead()[kind]||[])}
function sfUnsavedCount(){const s=sfUnsavedRead();return s.keys.length+s.quotes.length+s.projects.length+s.invoices.length}

// Network trouble is retried; a refusal from the database (permission, invalid data, raised error) is not.
function sfIsPermanentSyncError(error){
 const code=String(error?.code||'');
 return /^(42|22|23|P0)/.test(code);
}
function sfShowUnsavedStatus(failed){
 const n=sfUnsavedCount();
 if(n>0)setCloudStatus('error',`${n} change${n>1?'s':''} not saved yet — retrying`);
 else if(failed===false)setCloudStatus('','Saved securely');
}
function sfScheduleSyncRetry(){
 if(sfRetryTimer)return;
 sfRetryTimer=setTimeout(async()=>{sfRetryTimer=null;if(!sfUnsavedCount())return;await sfRetryUnsaved();if(sfUnsavedCount())sfScheduleSyncRetry()},30000);
}
async function sfRetryUnsaved(){
 if(typeof sfDb==='undefined'||!sfDb||!sfCurrentUser)return;
 await sfFlushPendingCloudKeys();
 try{await sfSyncDirtyQuotes();await sfSyncDirtyProjects();await sfSyncDirtyInvoices();}catch(error){console.warn('Retry of unsaved records failed',error)}
 sfShowUnsavedStatus(sfUnsavedCount()>0);
}

// Shared keys: one upload at a time per key, always sending the latest local value.
const sfPushChains=new Map();
function sfPushQueued(key){
 const next=(sfPushChains.get(key)||Promise.resolve()).catch(()=>{}).then(()=>sfPushNow(key));
 const clean=()=>{if(sfPushChains.get(key)===next)sfPushChains.delete(key)};sfPushChains.set(key,next);next.then(clean,clean);
 return next;
}
async function sfPushNow(key){
 if(typeof sfDb==='undefined'||!sfDb||!sfCurrentUser){setCloudStatus('error','Sign in required');return false}
 try{if(SF_SHARED_LISTS[key]&&!(await sfMergeSharedBeforePush(key)))return true;}catch(error){setCloudStatus('error','Could not check latest cloud data; changes remain pending.');sfScheduleSyncRetry();return false;}
 const raw=localStorage.getItem(key);
 if(raw===null){sfPendingClear(key);return true}
 let value;try{value=JSON.parse(raw)}catch{value=raw}
 setCloudStatus('saving','Saving…');
 try{
  const {error}=await sfDb.rpc('sf_workspace_save_key',{p_key:key,p_value:value});
  if(error)throw error;
  if(SF_SHARED_LISTS[key])sfBaseWrite(key,value);
  if(localStorage.getItem(key)===raw)sfPendingClear(key); // a newer edit stays on the list for its own upload
  sfShowUnsavedStatus(false);return true;
 }catch(error){
  console.error('Secure cloud push failed for',key,error);
  if(sfIsPermanentSyncError(error)){sfPendingClear(key);setCloudStatus('error','Not saved: '+(error?.message||'refused by the server'));return false}
  sfShowUnsavedStatus(true);sfScheduleSyncRetry();return false;
 }
}
async function sfFlushPendingCloudKeys(){
 for(const key of sfPendingKeys()){
  if(typeof sfShouldSyncKey==='function'&&!sfShouldSyncKey(key)){sfPendingClear(key);continue}
  await sfPushQueued(key);
 }
 return sfPendingKeys().length;
}

// Downloads: keep the local value of unsaved shared keys and the local version of unsaved records.
function sfUnsavedCaptureLocal(){
 const s=sfUnsavedRead(),keys={},records={};
 s.keys.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)keys[k]=v});
 Object.entries(SF_RECORD_KINDS).forEach(([kind,cfg])=>{
  const ids=new Set(s[kind]);if(!ids.size)return;
  let list=[];try{list=JSON.parse(localStorage.getItem(cfg.cache)||'[]')}catch(_){}
  try{const mem=cfg.list();if(Array.isArray(mem)&&mem.length)list=mem}catch(_){}
  records[kind]=(Array.isArray(list)?list:[]).filter(r=>r&&ids.has(String(r.id))).map(r=>JSON.parse(JSON.stringify(r)));
 });
 return{keys,records};
}
function sfUnsavedRestoreLocal(captured){
 if(!captured)return;
 const wasPaused=sfSyncPaused;sfSyncPaused=true;
 try{
  Object.entries(captured.keys||{}).forEach(([k,v])=>localStorage.setItem(k,v));
  Object.entries(captured.records||{}).forEach(([kind,recs])=>{
   if(!recs.length)return;const cfg=SF_RECORD_KINDS[kind];
   let list=[];try{list=JSON.parse(localStorage.getItem(cfg.cache)||'[]')}catch(_){}
   if(!Array.isArray(list))list=[];
   recs.forEach(r=>{const i=list.findIndex(x=>x&&String(x.id)===String(r.id));if(i>=0)list[i]=r;else list.unshift(r)});
   localStorage.setItem(cfg.cache,JSON.stringify(list));
  });
 }finally{sfSyncPaused=wasPaused}
}
// After a record list is replaced by the server list: put the unsaved local versions back. Their sync
// snapshot stays the server's, so the next upload sends them (and a real conflict is still detected).
function sfKeepUnsavedRecords(kind,localBefore){
 const ids=sfDirtyIds(kind);if(!ids.size||!Array.isArray(localBefore))return 0;
 const cfg=SF_RECORD_KINDS[kind],list=cfg.list();let kept=0;
 localBefore.filter(r=>r&&ids.has(String(r.id))).forEach(r=>{const i=list.findIndex(x=>String(x.id)===String(r.id));if(i>=0)list[i]=r;else list.unshift(r);kept++});
 if(kept){const wasPaused=sfSyncPaused;sfSyncPaused=true;try{localStorage.setItem(cfg.cache,JSON.stringify(list))}finally{sfSyncPaused=wasPaused}}
 return kept;
}
window.addEventListener('beforeunload',event=>{if(!window.sfSkipUnloadWarning&&sfUnsavedCount()>0){event.preventDefault();event.returnValue='';}});

// Serialize writes of the same record and send the latest local version at dispatch.
const sfRecordPushChains=new Map();
function sfQueueRecordSave(kind,record,send){
 if(!record?.id)return Promise.resolve({ok:false});
 const key=kind+':'+record.id;
 const next=(sfRecordPushChains.get(key)||Promise.resolve()).catch(()=>{}).then(()=>{
  const latest=SF_RECORD_KINDS[kind].list().find(r=>String(r.id)===String(record.id));
  if(!latest)return {ok:false,status:'removed-locally'};
  return send(JSON.parse(JSON.stringify(latest)));
 });
 sfRecordPushChains.set(key,next);
 next.then(()=>{if(sfRecordPushChains.get(key)===next)sfRecordPushChains.delete(key)},()=>{if(sfRecordPushChains.get(key)===next)sfRecordPushChains.delete(key)});
 return next;
}
function sfAcceptRecordReply(kind,updated,sentKey,signature){
 const list=SF_RECORD_KINDS[kind].list(),i=list.findIndex(r=>String(r.id)===String(updated.id));
 if(i<0)return false; // do not recreate something deleted while the request was in flight
 const changed=signature(list[i])!==sentKey;
 if(changed)list[i]={...list[i],_syncRevision:updated._syncRevision,_syncUpdatedAt:updated._syncUpdatedAt,_syncDeletedAt:updated._syncDeletedAt};
 else list[i]=updated;
 return changed;
}

// ── Shared lists saved as one value (payroll sheets, engineers, signature, stamp) ─────────────────────
// The server stores each of these as a single value and keeps whatever arrives last. An open tab that
// was loaded earlier could therefore upload an old copy and undo work saved on another device (for
// example a payroll approval). Now, before uploading, the device reads the server copy; if it changed
// since this device last saw it, the two are merged record by record: a record changed on one side
// only keeps that change; a record changed on both sides keeps the server version and a message says
// which. The lists are also refreshed when the tab is shown again.
const SF_SHARED_LISTS={
 sfPayrollSheets:{kind:'records',apply:v=>{sfPayrollSheets=Array.isArray(v)?v:[]},label:'payroll sheet',name:r=>[r.month,r.status].filter(Boolean).join(' · ')||r.id},
 // Engineers shown in the app are rebuilt from the attendance accounts plus these saved details.
 sfEngineers:{kind:'records',apply:v=>{sfEngineers=Array.isArray(v)?v:[];if(typeof sfApplyAttendanceRoster==='function')sfApplyAttendanceRoster()},label:'engineer',name:r=>r.name||r.id},
 sfDeletedDefaultEngineerIds:{kind:'set',apply:v=>{sfDeletedDefaultEngineerIds=new Set(Array.isArray(v)?v:[])}},
 sfProformaSignature:{kind:'value',apply:v=>{try{proformaSignature=v}catch(_){}},label:'invoice signature'},
 sfProformaStamp:{kind:'value',apply:v=>{try{proformaStamp=v}catch(_){}},label:'invoice stamp'},
};
const SF_BASE_PREFIX='skyfield:base:'; // last server copy this device saw (local only, never synced)
function sfCanon(v){ // stable text for comparison: the database may reorder fields inside records
 if(Array.isArray(v))return '['+v.map(sfCanon).join(',')+']';
 if(v&&typeof v==='object')return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+sfCanon(v[k])).join(',')+'}';
 return JSON.stringify(v===undefined?null:v);
}
const sfParseRaw=raw=>{if(raw===null||raw===undefined)return null;try{return JSON.parse(raw)}catch(_){return raw}};
function sfBaseRead(key){const v=localStorage.getItem(SF_BASE_PREFIX+key);return v===null?null:sfParseRaw(v)}
function sfBaseWrite(key,value){localStorage.setItem(SF_BASE_PREFIX+key,JSON.stringify(value===undefined?null:value))}
function sfSharedBaseFromRows(rows){(rows||[]).forEach(r=>{if(r&&SF_SHARED_LISTS[r.key])sfBaseWrite(r.key,typeof r.value==='string'?sfParseRaw(r.value):r.value)})}
async function sfFetchSharedValues(keys){
 const owner=typeof sfDataUserId==='function'?sfDataUserId():null;if(!owner||!keys.length)return {};
 const {data,error}=await sfDb.from('sf_user_store').select('key,value').eq('user_id',owner).in('key',keys);
 if(error)throw error;const out={};(data||[]).forEach(r=>{out[r.key]=typeof r.value==='string'?sfParseRaw(r.value):r.value});return out;
}
function sfMergeRecords(base,local,remote){
 const map=a=>new Map((Array.isArray(a)?a:[]).filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
 const B=map(base),L=map(local),R=map(remote),same=(x,y)=>sfCanon(x)===sfCanon(y);
 const order=[...[...R.keys()].filter(id=>!L.has(id)&&!B.has(id)),...L.keys(),...[...R.keys()].filter(id=>!L.has(id)&&B.has(id))];
 const ids=[...new Set([...order,...B.keys()])],list=[],conflicts=[];
 for(const id of ids){
  const b=B.get(id),l=L.get(id),r=R.get(id),localChanged=!same(b,l),remoteChanged=!same(b,r);
  if(!localChanged){if(r)list.push(r);continue}           // only the server changed (or nothing)
  if(!remoteChanged){if(l)list.push(l);continue}          // only this device changed (an edit or a deletion)
  if(same(l,r)){if(l)list.push(l);continue}               // both made the same change
  if(r)list.push(r);conflicts.push(l||r);                 // both changed differently: the server copy stays
 }
 return{list,conflicts};
}
function sfApplySharedLocal(key,value){
 const cfg=SF_SHARED_LISTS[key],wasPaused=sfSyncPaused;sfSyncPaused=true;
 try{localStorage.setItem(key,typeof value==='string'&&cfg.kind==='value'?value:JSON.stringify(value))}finally{sfSyncPaused=wasPaused}
 cfg.apply(value);
}
function sfRerenderShared(){
 [['payrollRenderSaved'],['renderEngineers'],['updateSidebarCounts'],['renderCostPlan']].forEach(([fn])=>{try{if(typeof window[fn]==='function')window[fn]()}catch(e){console.warn('Refresh of',fn,'failed',e)}});
}
// Called before uploading a shared list. Returns false when nothing needs uploading.
async function sfMergeSharedBeforePush(key){
 const cfg=SF_SHARED_LISTS[key];let remoteAll;
 try{remoteAll=await sfFetchSharedValues([key])}catch(error){console.warn('Could not read the server copy of',key,error);throw error}
 if(!(key in remoteAll))return true;                      // nothing on the server yet
 const remote=remoteAll[key],base=sfBaseRead(key),local=sfParseRaw(localStorage.getItem(key));
 if(base===null||sfCanon(remote)===sfCanon(base))return true; // the server has not changed since this device saw it
 let merged=remote,conflicts=[];
 if(cfg.kind==='records')({list:merged,conflicts}=sfMergeRecords(base,local,remote));
 else if(cfg.kind==='set')merged=[...new Set([...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])])];
 else if(sfCanon(local)!==sfCanon(base)&&sfCanon(local)!==sfCanon(remote))conflicts=[local];
 sfApplySharedLocal(key,merged);sfBaseWrite(key,remote);sfRerenderShared();
 if(conflicts.length){
  const names=cfg.kind==='records'?conflicts.map(c=>cfg.name(c)).slice(0,5).join('، '):cfg.label;
  const msg=`Changed on another device at the same time; the saved version was kept: ${names}. Please review and edit again if needed.`;
  setCloudStatus('error',msg);try{alert(msg)}catch(_){}
 }
 if(sfCanon(merged)===sfCanon(remote)){sfPendingClear(key);sfShowUnsavedStatus(false);return false}
 return true;
}
let sfSharedRefreshTimer=null;
async function sfRefreshSharedLists(){
 if(typeof sfDb==='undefined'||!sfDb||!sfCurrentUser)return;
 const keys=Object.keys(SF_SHARED_LISTS).filter(k=>typeof sfShouldSyncKey!=='function'||sfShouldSyncKey(k));
 let remote;try{remote=await sfFetchSharedValues(keys)}catch(_){return}
 const pending=new Set(sfPendingKeys());let changed=false;
 for(const key of keys){
  if(!(key in remote))continue;
  if(pending.has(key)){sfPushQueued(key);continue}      // unsaved here: merge and upload instead
  const local=sfParseRaw(localStorage.getItem(key)),server=remote[key];
  if(sfCanon(local)!==sfCanon(server)){sfApplySharedLocal(key,server);changed=true}
  sfBaseWrite(key,server);
 }
 if(changed)sfRerenderShared();
}
function sfScheduleSharedRefresh(){clearTimeout(sfSharedRefreshTimer);sfSharedRefreshTimer=setTimeout(sfRefreshSharedLists,600)}
// Listeners only where a page exists (the file is also loaded by Node tests without a document).
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sfScheduleSharedRefresh()});
 window.addEventListener('focus',sfScheduleSharedRefresh);
 setInterval(()=>{if(document.visibilityState==='visible')sfRefreshSharedLists()},120000);
}

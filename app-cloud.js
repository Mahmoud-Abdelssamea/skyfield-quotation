// SKY FIELD — Sign-in, roles, cloud sync of shared keys and records, documents and storage.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function sfRestoreAppTitle(){
  if(!sfPreviewTitleActive)return;
  document.title=SF_APP_WINDOW_TITLE;
  sfPreviewTitleActive=false;
}

function sfNormalizeEmail(value){return String(value||'').trim().toLowerCase()}
function sfTeamMember(email){return SF_TEAM_MEMBERS[sfNormalizeEmail(email)]||null}
function sfDataUserId(){return sfWorkspaceUserId||''}
function sfHasAccess(area){const member=sfTeamMember(sfCurrentUser?.email);return !!member&&!(member.blocked||[]).includes(area)}
function sfIsAdmin(){return sfTeamMember(sfCurrentUser?.email)?.role==='Administrator'}
function sfIsLimitedMember(){return !sfHasAccess('engineers')||!sfHasAccess('payroll')}
function sfCanSyncKeyForRole(key){
  if(!sfIsLimitedMember())return true;
  return !['sfEngineers','sfPayrollSheets','sfDeletedDefaultEngineerIds'].includes(String(key||''));
}

function sfSanitizeSnapshotForLimitedClient(snapshot){
  const clean=JSON.parse(JSON.stringify(snapshot&&typeof snapshot==='object'?snapshot:{}));
  delete clean.costPlan;
  delete clean.internalCostSummary;
  if(clean.totals&&typeof clean.totals==='object'){
    ['internalCost','internalCostBreakdown','expectedProfit','expectedMargin'].forEach(key=>delete clean.totals[key]);
  }
  return clean;
}

// Defense in depth for a shared browser: remove administrator-only data before
// a limited account inspects, migrates, or reloads any local cache.
function sfPurgeRestrictedLocalCache(){
  if(!sfIsLimitedMember())return;
  const wasPaused=sfSyncPaused;
  sfSyncPaused=true;
  try{
    ['sfEngineers','sfPayrollSheets','sfDeletedDefaultEngineerIds'].forEach(key=>localStorage.removeItem(key));

    const scrub=(key,transform)=>{
      const raw=localStorage.getItem(key);if(raw===null)return;
      try{localStorage.setItem(key,JSON.stringify(transform(JSON.parse(raw))))}
      catch(error){console.warn('Restricted cache cleanup skipped for '+key,error);localStorage.removeItem(key)}
    };
    scrub('sfProjects',records=>(Array.isArray(records)?records:[]).map(project=>{
      const clean={...(project||{})};
      delete clean.assignedEngineers;delete clean.costPlan;delete clean.estimatedInternalCost;
      delete clean.expectedProfit;delete clean.restrictedActualCost;
      clean.actualExpenses=(Array.isArray(clean.actualExpenses)?clean.actualExpenses:[]).filter(expense=>{
        const source=String(expense?.source||'').toLowerCase();
        const category=String(expense?.category||'').toLowerCase();
        return source!=='payroll'&&category!=='payroll';
      });
      return clean;
    }));
    scrub('sfSavedQuotations',records=>(Array.isArray(records)?records:[]).map(record=>({...record,snapshot:sfSanitizeSnapshotForLimitedClient(record?.snapshot)})));
    scrub('sfProformaInvoices',records=>(Array.isArray(records)?records:[]).map(record=>({...record,quoteSnapshot:sfSanitizeSnapshotForLimitedClient(record?.quoteSnapshot)})));
  }finally{sfSyncPaused=wasPaused;}
}

function sfApplyRoleAccess(){
  const limited=sfIsLimitedMember();
  ['engineers','payroll'].forEach(area=>{
    document.querySelectorAll(`.side-nav-btn[data-module="${area}"]`).forEach(el=>el.style.display=sfHasAccess(area)?'':'none');
  });
  document.body.dataset.accessRole=limited?'commercial':'administrator';
  if(limited&&['engineers','payroll'].includes(document.body.dataset.module||'')){
    showTab('dashboard',document.querySelector('.side-nav-btn[data-module="dashboard"]'));
  }
}

async function sfResolveWorkspaceUserId(user){
  if(!sfTeamMember(user?.email))throw new Error('This email is not approved for the Sky Field company workspace.');
  const {data,error}=await sfDb.rpc('sf_workspace_data_user_id');
  if(error)throw new Error('Shared workspace setup is required. Run the supplied SkyField_Team_Access_Setup.sql file in Supabase, then sign in again.');
  if(!data)throw new Error('The Sky Field workspace owner account was not found. Sign in with the main administrator account first.');
  sfWorkspaceUserId=String(data);
  return sfWorkspaceUserId;
}

function sfIsManagedDataKey(key){return typeof key === 'string' && key.startsWith('sf') && !SF_LOCAL_ONLY_KEYS.has(key)}
function sfShouldSyncKey(key){return sfIsManagedDataKey(key)&&sfCanSyncKeyForRole(key)&&!SF_PER_RECORD_SYNCED_KEYS.has(key)}

function sfCollectLocalUserData(){
  const result = {};
  for(let i=0;i<localStorage.length;i++){
    const key = localStorage.key(i);
    if(sfShouldSyncKey(key)) result[key] = localStorage.getItem(key);
  }
  return result;
}

// Compared before and after sign-in to decide whether the page must reload.
function sfLocalSnapshot(){
  const data = sfCollectLocalUserData();
  return JSON.stringify(Object.keys(data).filter(k=>!SF_REFRESHED_IN_PLACE_KEYS.has(k)).sort().map(k=>[k,data[k]]));
}

function sfClearLocalUserData(preservePerRecord=false){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(sfIsManagedDataKey(key)&&!(preservePerRecord&&SF_PER_RECORD_SYNCED_KEYS.has(key)))keys.push(key);
  }
  const wasPaused=sfSyncPaused;
  sfSyncPaused=true;
  try{ keys.forEach(k=>localStorage.removeItem(k)); }
  finally{ sfSyncPaused=wasPaused; }
}

function sfSetAuthMessage(message,type='info'){
  const el=document.getElementById('sf-auth-message');
  if(!el)return;
  el.textContent=message||'';
  el.className='sf-auth-message '+type+(message?' show':'');
}

function sfShowAuthPanel(mode){
  const title=document.getElementById('sf-auth-title');
  const subtitle=document.getElementById('sf-auth-subtitle');
  
  document.querySelectorAll('[data-auth-panel]').forEach(p=>p.classList.toggle('active',p.dataset.authPanel===mode));
  
  const labels={
    login:['Secure Account Access','Sign in to open your company workspace.'],
    
    forgot:['Reset Password','Enter your email and we will send a secure reset link.'],
    reset:['Choose New Password','Create a new password for your account.']
  };
  if(title)title.textContent=(labels[mode]||labels.login)[0];
  if(subtitle)subtitle.textContent=(labels[mode]||labels.login)[1];
  if(mode!=='reset')sfSetAuthMessage('', 'info');
}

function sfAuthRedirectUrl(){
  if(location.protocol==='http:'||location.protocol==='https:') return location.origin+location.pathname;
  return undefined;
}

function sfLockApp(clearSensitiveCache=false){
  sfAuthReady=false;
  sfCurrentUser=null;
  sfWorkspaceUserId='';
  document.body.classList.add('sf-auth-locked');
  const overlay=document.getElementById('sf-auth-overlay');
  if(overlay)overlay.hidden=false;
  const account=document.getElementById('side-account');
  if(account)account.classList.remove('show');
  if(clearSensitiveCache){
    sfClearLocalUserData();
    localStorage.removeItem('sfActiveUserId');
  }
}

function sfUnlockApp(user){
  sfCurrentUser=user;
  sfAuthReady=true;
  document.body.classList.remove('sf-auth-locked');
  const overlay=document.getElementById('sf-auth-overlay');
  if(overlay)overlay.hidden=true;
  const email=user?.email||'';
  const member=sfTeamMember(email);
  const fullName=member?.name||user?.user_metadata?.full_name||email.split('@')[0]||'User';
  const account=document.getElementById('side-account');
  if(account)account.classList.add('show');
  const nameEl=document.getElementById('side-account-name'); if(nameEl)nameEl.textContent=fullName;
  const emailEl=document.getElementById('side-account-email'); if(emailEl)emailEl.textContent=email;
  const avatar=document.getElementById('side-account-avatar'); if(avatar)avatar.textContent=(fullName.trim()[0]||'U').toUpperCase();
  sfApplyRoleAccess();
  try{sfLoadUserInterfaceLanguage(user);}catch(e){console.warn('Unable to restore interface language preference.',e);}
  setCloudStatus('','Secure cloud connected');
  if(!sessionStorage.getItem('sfNormalizedMigrationV1')){sessionStorage.setItem('sfNormalizedMigrationV1','1');setTimeout(sfMirrorAllCollections,800);}
}

async function sfLogin(event){
  event.preventDefault();
  if(!sfDb){sfSetAuthMessage('Supabase is not configured.','error');return;}
  const form=event.currentTarget;
  const loginId=document.getElementById('sf-login-email').value.trim();
  const email=loginId.includes('@')?loginId:loginId.toLowerCase()+'@engineers.skyfield.invalid';
  const password=document.getElementById('sf-login-password').value;
  
  sfSetFormBusy(form,true,'Signing in…'); sfSetAuthMessage('Checking your account…','info');
  try{
    const {error}=await sfDb.auth.signInWithPassword({email,password});
    if(error)throw error;
    sfSetAuthMessage('Login successful. Loading your secure data…','success');
  }catch(error){
    console.error('Login failed',error);
    sfSetAuthMessage(error?.message||'Unable to log in. Check your email and password.','error');
  }finally{sfSetFormBusy(form,false);}
}

// Self-registration was removed: accounts are created by the administrator only.

async function sfSendPasswordReset(event){
  event.preventDefault();
  if(!sfDb){sfSetAuthMessage('Supabase is not configured.','error');return;}
  const form=event.currentTarget;
  const email=document.getElementById('sf-forgot-email').value.trim();
  sfSetFormBusy(form,true,'Sending…'); sfSetAuthMessage('Preparing a secure reset email…','info');
  try{
    const options={}; const redirect=sfAuthRedirectUrl(); if(redirect)options.redirectTo=redirect;
    const {error}=await sfDb.auth.resetPasswordForEmail(email,options);
    if(error)throw error;
    sfSetAuthMessage('Password reset email sent. Open the link in the email to choose a new password.','success');
  }catch(error){
    console.error('Password reset failed',error);
    sfSetAuthMessage(error?.message||'Unable to send the password reset email.','error');
  }finally{sfSetFormBusy(form,false);}
}

async function sfUpdateRecoveredPassword(event){
  event.preventDefault();
  const form=event.currentTarget;
  const password=document.getElementById('sf-reset-password').value;
  const confirmPassword=document.getElementById('sf-reset-confirm').value;
  if(password.length<8){sfSetAuthMessage('Password must contain at least 8 characters.','error');return;}
  if(password!==confirmPassword){sfSetAuthMessage('The password confirmation does not match.','error');return;}
  sfSetFormBusy(form,true,'Updating…');
  try{
    const {data,error}=await sfDb.auth.updateUser({password});
    if(error)throw error;
    sfSetAuthMessage('Password updated successfully. Opening your workspace…','success');
    await sfActivateUser(data.user||sfCurrentUser);
  }catch(error){
    console.error('Password update failed',error);
    sfSetAuthMessage(error?.message||'Unable to update the password.','error');
  }finally{sfSetFormBusy(form,false);}
}

async function sfLogout(){
  if(!sfDb)return;
  try{await sfRetryUnsaved()}catch(e){} const sfLeft=sfUnsavedCount(); if(!confirm(sfLeft?`${sfLeft} change${sfLeft>1?'s have':' has'} not reached the server yet (no connection). Logging out now will lose ${sfLeft>1?'them':'it'}.\n\nLog out anyway?`:'Log out from the secure Sky Field system?'))return; if(sfLeft)localStorage.removeItem(SF_UNSAVED_STORE);
  setCloudStatus('saving','Signing out…');
  try{
    if(sfDataUserId())sessionStorage.removeItem('sfHydrationSnapshot:'+sfDataUserId());
    const {error}=await sfDb.auth.signOut();
    if(error)throw error;
    sfLockApp(true);
    sfShowAuthPanel('login');
    sfSetAuthMessage('You have been logged out securely.','success');
  }catch(error){
    console.error('Logout failed',error);
    alert(error?.message||'Unable to log out.');
  }
}

async function sfCloudPush(key){ if(sfSyncPaused||!sfShouldSyncKey(key))return; return sfPushQueued(key); /* sync-safety.js: queued, retried, kept until saved */ }

async function sfCloudPushAllLocal(){
  if(!sfDb||!sfCurrentUser)return;
  const local=sfCollectLocalUserData();
  const rows=Object.entries(local).map(([key,raw])=>{
    let value; try{value=JSON.parse(raw);}catch{value=raw;}
    return {key,value};
  });
  if(!rows.length)return;
  for(const row of rows){
    const {error}=await sfDb.rpc('sf_workspace_save_key',{p_key:row.key,p_value:row.value});
    if(error)throw error;
  }
}

// Settings rows only (about 65 KB): quotations, projects and invoices are refreshed right after the app opens
// (sfRefreshCommercialRecords), so sign-in no longer downloads them twice (supabase/2026-10-31-workspace-settings.sql).
// The older function, which also sends the three lists, is used only while the database lacks the new one.
async function sfFetchUserCloudRows(userId){
  let {data,error}=await sfDb.rpc('sf_workspace_settings_for_current_user');
  if(error&&(error.code==='PGRST202'||/sf_workspace_settings_for_current_user/.test(String(error.message||''))))({data,error}=await sfDb.rpc('sf_workspace_rows_for_current_user'));
  if(error)throw error;
  return data||[];
}

function sfWriteCloudRowsToLocal(rows,replace=true){ const sfKeep=sfUnsavedCaptureLocal(); const wasPaused=sfSyncPaused; sfSyncPaused=true; try{
    // Record-synced commercial caches are hydrated immediately afterwards.
    // Preserve them during the legacy blob pull so local-only records can be
    // imported additively instead of disappearing before migration.
    if(replace)sfClearLocalUserData(true);
    // An old cloud row for a device-only key (e.g. sfNavOpenGroups) must not overwrite this browser's value.
    (rows||[]).filter(row=>sfIsManagedDataKey(row?.key)).forEach(row=>{ const str=typeof row.value==='string'?row.value:JSON.stringify(row.value); localStorage.setItem(row.key,str); }); sfSharedBaseFromRows(rows); sfUnsavedRestoreLocal(sfKeep); }finally{sfSyncPaused=wasPaused;} }

function sfReloadApplicationStateFromLocal(){
  // Rebuild in-memory collections after a cloud pull. Previously only
  // localStorage changed, leaving the visible UI stale until a refresh.
  try{if(typeof savedQuotes!=='undefined')savedQuotes=JSON.parse(localStorage.getItem('sfSavedQuotations')||'[]')}catch(e){console.warn('Quotation state reload failed',e)}
  try{if(typeof proformaInvoices!=='undefined')proformaInvoices=JSON.parse(localStorage.getItem('sfProformaInvoices')||'[]')}catch(e){console.warn('Invoice state reload failed',e)}
  try{if(typeof sfEngineers!=='undefined')sfEngineers=JSON.parse(localStorage.getItem('sfEngineers')||'[]')}catch(e){console.warn('Engineer state reload failed',e)}
  try{if(typeof sfDeletedDefaultEngineerIds!=='undefined')sfDeletedDefaultEngineerIds=new Set(JSON.parse(localStorage.getItem('sfDeletedDefaultEngineerIds')||'[]'))}catch(e){console.warn('Deleted engineer state reload failed',e)}
  try{if(typeof sfPayrollSheets!=='undefined')sfPayrollSheets=JSON.parse(localStorage.getItem('sfPayrollSheets')||'[]')}catch(e){console.warn('Payroll state reload failed',e)}
  try{if(typeof projects!=='undefined')projects=JSON.parse(localStorage.getItem('sfProjects')||'[]').map(sfNormalizeProjectRecord)}
  catch(e){console.warn('Project state reload failed',e)}
  try{updateSidebarCounts()}catch(e){}
  try{renderDashboard()}catch(e){}
  try{renderProjects()}catch(e){}
  try{renderSavedQuotations()}catch(e){}
  try{renderProformas()}catch(e){}
  try{renderEngineers()}catch(e){}
  try{payrollRender()}catch(e){}
  try{if(typeof buildCatList==='function'){buildCatList();buildTasks()}}catch(e){console.warn('Scope of Work list reload failed',e)}
  try{if(typeof buildEq==='function')buildEq()}catch(e){console.warn('Equipment list reload failed',e)}
}

async function sfMirrorCollection(table,records){
  if(!sfDb||!sfCurrentUser||!sfNormalizedTablesAvailable||!Array.isArray(records))return;
  // Normalized tables contain complete reporting payloads. Limited accounts
  // use the sanitized shared-workspace RPC only and never receive direct table
  // access, preventing private fields inside quotations/invoices from leaking.
  if(sfIsLimitedMember())return;
  const rows=records.filter(r=>r&&r.id).map(r=>({user_id:sfDataUserId(),id:String(r.id),payload:r,updated_at:r.updatedAt||new Date().toISOString()}));
  try{
    // Upsert the current records first. Then prune rows that no longer exist in
    // the local collection, so the normalized table remains a true mirror after
    // deletes as well as edits.
    if(rows.length){
      const {error}=await sfDb.from(table).upsert(rows,{onConflict:'user_id,id'});
      if(error)throw error;
    }
    const {data:existing,error:selectError}=await sfDb.from(table).select('id').eq('user_id',sfDataUserId());
    if(selectError)throw selectError;
    const keep=new Set(rows.map(r=>r.id));
    const stale=(existing||[]).map(r=>String(r.id)).filter(id=>!keep.has(id));
    if(stale.length){
      const {error:deleteError}=await sfDb.from(table).delete().eq('user_id',sfDataUserId()).in('id',stale);
      if(deleteError)throw deleteError;
    }
  }catch(error){
    if(String(error?.code||'')==='42P01'||/does not exist|schema cache/i.test(String(error?.message||'')))sfNormalizedTablesAvailable=false;
    console.warn('Normalized mirror unavailable for '+table,error);
  }
}
// ── Per-record quotation sync ───────────────────────────────────────────────
// Every team member writes into the same shared workspace, so quotations can
// no longer be synced as one whole-array blob per browser (see
// SF_PER_RECORD_SYNCED_KEYS above). Instead each quotation is pushed and
// pulled individually through the revision-aware sf_quote_* RPC functions,
// so two people saving at the same time can never wipe out each other's
// records — a mismatched revision comes back as a 'conflict' instead of
// silently overwriting.
function sfQuoteRecordFromRow(row){
  const payload=(row&&row.quote_payload&&typeof row.quote_payload==='object')?row.quote_payload:{};
  return {...payload,id:row.quote_id,_syncRevision:row.quote_revision,_syncUpdatedAt:row.quote_updated_at,_syncDeletedAt:row.quote_deleted_at};
}
function sfQuoteSyncPayloadKey(rec){
  const {_syncRevision,_syncUpdatedAt,_syncDeletedAt,_syncState,...rest}=rec||{};
  try{return JSON.stringify(rest);}catch(e){return String(rec&&rec.id||'');}
}
// Replaces the in-memory/local list with the authoritative shared copy from
// the server. Called after login, on manual pull, and after a conflict.
async function sfHydrateQuotationsFromRemote(){
  if(!sfDb||!sfCurrentUser)return false;
  try{
    const sfBefore=Array.isArray(savedQuotes)?savedQuotes.slice():[],since=Date.now(); const {data,error}=await sfDb.rpc('sf_quote_list',{p_include_deleted:false}); if(error)throw error; const server=(data||[]).map(sfQuoteRecordFromRow);
    const snapshots=new Map(server.map(r=>[r.id,sfQuoteSyncPayloadKey(r)]));savedQuotes=sfMergeTouched('quotes',server,savedQuotes,since,snapshots,sfQuoteSyncSnapshots);sfQuoteSyncSnapshots=snapshots;
    const wasPaused=sfSyncPaused;sfSyncPaused=true;
    try{localStorage.setItem('sfSavedQuotations',JSON.stringify(savedQuotes));} finally{sfSyncPaused=wasPaused;} sfKeepUnsavedRecords('quotes',sfBefore); return true; }catch(error){ console.warn('Quotation cloud list unavailable, keeping local cache.',error);
    return false;
  }
}
// One-time migration helper: imports quotations that only exist in this
// browser's legacy local copy into the shared table. Existing shared rows
// are never overwritten (server-side "on conflict do nothing").
async function sfImportLegacyQuotations(records){
  if(!sfDb||!sfCurrentUser||!Array.isArray(records)||!records.length)return 0;
  try{
    const {data,error}=await sfDb.rpc('sf_quote_import_legacy',{p_records:records});
    if(error)throw error;
    return data||0;
  }catch(error){
    console.warn('Legacy quotation import failed.',error);
    return 0;
  }
}
// Pushes exactly one quotation, using its last-known revision so a
// concurrent edit by another team member is detected instead of overwritten.
function sfSyncQuoteRecord(rec){return sfQueueRecordSave('quotes',rec,sfSyncQuoteRecordNow)}
async function sfSyncQuoteRecordNow(rec){
  if(!sfDb||!sfCurrentUser||!rec||!rec.id)return {ok:false};
  const sentKey=sfQuoteSyncPayloadKey(rec);
  sfDirtyMark('quotes',rec.id,true);
  try{
    const {data,error}=await sfDb.rpc('sf_quote_upsert',{
      p_id:String(rec.id),
      p_payload:rec,
      p_expected_revision:(rec._syncRevision===undefined||rec._syncRevision===null)?null:rec._syncRevision
    });
    if(error)throw error;
    const row=(data&&data[0])||null;
    if(!row)return {ok:false};
    if(row.operation_status==='conflict'||row.operation_status==='deleted'){
      return {ok:false,status:row.operation_status,remote:sfQuoteRecordFromRow(row)};
    }
    const updated=sfQuoteRecordFromRow(row);
    const idx=savedQuotes.findIndex(q=>q.id===updated.id);
    const pending=sfAcceptRecordReply('quotes',updated,sentKey,sfQuoteSyncPayloadKey);
    sfQuoteSyncSnapshots.set(updated.id,sfQuoteSyncPayloadKey(updated));
    const wasPaused=sfSyncPaused;sfSyncPaused=true;
    try{localStorage.setItem('sfSavedQuotations',JSON.stringify(savedQuotes));}
    finally{sfSyncPaused=wasPaused;}
    if(pending)sfScheduleSyncRetry();
    return {ok:true,remote:updated,pending};
  }catch(error){
    console.error('Quotation cloud sync failed for '+rec.id,error);
    return {ok:false,error};
  }
}
async function sfSyncQuoteDelete(rec){
  if(!sfDb||!sfCurrentUser||!rec||!rec.id)return {ok:false};
  sfTouch('quotes',rec.id);
  try{
    const {data,error}=await sfDb.rpc('sf_quote_soft_delete',{
      p_id:String(rec.id),
      p_expected_revision:(rec._syncRevision===undefined||rec._syncRevision===null)?null:rec._syncRevision
    });
    if(error)throw error;
    const row=(data&&data[0])||null;
    if(!row)return {ok:false};
    if(row.operation_status==='conflict'){
      return {ok:false,status:'conflict',remote:sfQuoteRecordFromRow(row)};
    }
    sfQuoteSyncSnapshots.delete(String(rec.id));
    return {ok:true};
  }catch(error){
    console.error('Quotation cloud delete failed for '+rec.id,error);
    return {ok:false,error};
  }
}
// Pushes every quotation whose content changed since it was last confirmed
// synced. This is the safety net that fires from saveSavedQuotes() no matter
// which screen triggered the save, so no call site can forget to sync.
async function sfSyncDirtyQuotes(){
  if(!sfDb||!sfCurrentUser||typeof savedQuotes==='undefined')return {conflicts:[]};
  const conflicts=[];
  for(const rec of savedQuotes.slice()){
    if(!rec||!rec.id)continue;
    const key=sfQuoteSyncPayloadKey(rec);
    if(sfQuoteSyncSnapshots.get(rec.id)===key)continue;
    const result=await sfSyncQuoteRecord(rec); sfDirtyMark('quotes',rec.id,!!result.pending||(!result.ok&&!result.status&&!(result.error&&sfIsPermanentSyncError(result.error))));
    if(!result.ok&&(result.status==='conflict'||result.status==='deleted')){
      conflicts.push({id:rec.id,status:result.status,remote:result.remote});
    }
  }
  if(conflicts.length){
    await sfHydrateQuotationsFromRemote();
    renderSavedQuotations();
    const names=conflicts.map(c=>{const r=savedQuotes.find(q=>q.id===c.id);return r?r.number:c.id;}).join(', ');
    setCloudStatus('error','Updated by another user, reloaded: '+names);
  }
  return {conflicts};
}

// ── Per-record Projects and Proforma Invoices sync ─────────────────────────
// Both collections use the same record result shape from their dedicated
// Supabase RPCs. Project payloads are normalized after hydration so older
// records keep all expected arrays and payment fields.
function sfSharedRecordFromRow(row){
  const payload=(row&&row.record_payload&&typeof row.record_payload==='object')?row.record_payload:{};
  return {...payload,id:row.record_id,_syncRevision:row.record_revision,_syncUpdatedAt:row.record_updated_at,_syncDeletedAt:row.record_deleted_at};
}
function sfRecordSyncPayloadKey(rec){
  const {_syncRevision,_syncUpdatedAt,_syncDeletedAt,_syncState,...rest}=rec||{};
  try{return JSON.stringify(rest)}catch(error){return String(rec?.id||'')}
}
function sfCachePerRecordCollection(key,records){
  const wasPaused=sfSyncPaused;sfSyncPaused=true;
  try{localStorage.setItem(key,JSON.stringify(records||[]))}
  finally{sfSyncPaused=wasPaused}
}
async function sfHydrateProjectsFromRemote(){
  if(!sfDb||!sfCurrentUser)return false;
  try{
    const sfBefore=Array.isArray(projects)?projects.slice():[],since=Date.now(); const {data,error}=await sfDb.rpc('sf_project_list',{p_include_deleted:false});if(error)throw error; const server=(data||[]).map(sfSharedRecordFromRow).map(sfNormalizeProjectRecord); const snapshots=new Map(server.map(record=>[record.id,sfRecordSyncPayloadKey(record)])); projects=sfMergeTouched('projects',server,projects,since,snapshots,sfProjectSyncSnapshots); sfProjectSyncSnapshots=snapshots; sfCachePerRecordCollection('sfProjects',projects); sfKeepUnsavedRecords('projects',sfBefore); return true;
  }catch(error){console.warn('Project record sync is unavailable; keeping the local cache.',error);return false}
}
async function sfHydrateInvoicesFromRemote(){
  if(!sfDb||!sfCurrentUser)return false;
  try{
    const sfBefore=Array.isArray(proformaInvoices)?proformaInvoices.slice():[],since=Date.now(); const {data,error}=await sfDb.rpc('sf_invoice_list',{p_include_deleted:false});if(error)throw error; const server=(data||[]).map(sfSharedRecordFromRow); const snapshots=new Map(server.map(record=>[record.id,sfRecordSyncPayloadKey(record)])); proformaInvoices=sfMergeTouched('invoices',server,proformaInvoices,since,snapshots,sfInvoiceSyncSnapshots); sfInvoiceSyncSnapshots=snapshots; sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices); sfKeepUnsavedRecords('invoices',sfBefore); return true;
  }catch(error){console.warn('Proforma Invoice record sync is unavailable; keeping the local cache.',error);return false}
}
async function sfImportLegacyProjects(records){
  if(!sfDb||!sfCurrentUser||!Array.isArray(records)||!records.length)return 0;
  try{const {data,error}=await sfDb.rpc('sf_project_import_legacy',{p_records:records});if(error)throw error;return data||0}
  catch(error){console.warn('Legacy project import failed.',error);return 0}
}
async function sfImportLegacyInvoices(records){
  if(!sfDb||!sfCurrentUser||!Array.isArray(records)||!records.length)return 0;
  try{const {data,error}=await sfDb.rpc('sf_invoice_import_legacy',{p_records:records});if(error)throw error;return data||0}
  catch(error){console.warn('Legacy Proforma Invoice import failed.',error);return 0}
}
function sfSyncProjectRecord(record){return sfQueueRecordSave('projects',record,sfSyncProjectRecordNow)}
async function sfSyncProjectRecordNow(record){
  if(!sfDb||!sfCurrentUser||!record?.id)return {ok:false};
  const sentKey=sfRecordSyncPayloadKey(record);
  sfDirtyMark('projects',record.id,true);
  try{
    const {data,error}=await sfDb.rpc('sf_project_upsert',{
      p_id:String(record.id),p_payload:record,
      p_expected_revision:(record._syncRevision===undefined||record._syncRevision===null)?null:record._syncRevision
    });if(error)throw error;
    const row=(data&&data[0])||null;if(!row)return {ok:false};
    if(row.operation_status==='conflict'||row.operation_status==='deleted')return {ok:false,status:row.operation_status,remote:sfNormalizeProjectRecord(sfSharedRecordFromRow(row))};
    const updated=sfNormalizeProjectRecord(sfSharedRecordFromRow(row)),index=projects.findIndex(item=>item.id===updated.id);
    const pending=sfAcceptRecordReply('projects',updated,sentKey,sfRecordSyncPayloadKey);
    sfProjectSyncSnapshots.set(updated.id,sfRecordSyncPayloadKey(updated));sfCachePerRecordCollection('sfProjects',projects);
    if(pending)sfScheduleSyncRetry();
    return {ok:true,remote:updated,pending};
  }catch(error){console.error('Project cloud sync failed for '+record.id,error);return {ok:false,error}}
}
function sfSyncInvoiceRecord(record){return sfQueueRecordSave('invoices',record,sfSyncInvoiceRecordNow)}
async function sfSyncInvoiceRecordNow(record){
  if(!sfDb||!sfCurrentUser||!record?.id)return {ok:false};
  const sentKey=sfRecordSyncPayloadKey(record);
  sfDirtyMark('invoices',record.id,true);
  try{
    const {data,error}=await sfDb.rpc('sf_invoice_upsert',{
      p_id:String(record.id),p_payload:record,
      p_expected_revision:(record._syncRevision===undefined||record._syncRevision===null)?null:record._syncRevision
    });if(error)throw error;
    const row=(data&&data[0])||null;if(!row)return {ok:false};
    if(row.operation_status==='conflict'||row.operation_status==='deleted')return {ok:false,status:row.operation_status,remote:sfSharedRecordFromRow(row)};
    const updated=sfSharedRecordFromRow(row),index=proformaInvoices.findIndex(item=>item.id===updated.id);
    const pending=sfAcceptRecordReply('invoices',updated,sentKey,sfRecordSyncPayloadKey);
    sfInvoiceSyncSnapshots.set(updated.id,sfRecordSyncPayloadKey(updated));sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices);
    if(pending)sfScheduleSyncRetry();
    return {ok:true,remote:updated,pending};
  }catch(error){console.error('Proforma Invoice cloud sync failed for '+record.id,error);return {ok:false,error}}
}
async function sfSyncProjectDelete(record){
  if(!sfDb||!sfCurrentUser||!record?.id)return {ok:false};
  sfTouch('projects',record.id);
  try{
    const {data,error}=await sfDb.rpc('sf_project_soft_delete',{
      p_id:String(record.id),p_expected_revision:(record._syncRevision===undefined||record._syncRevision===null)?null:record._syncRevision
    });if(error)throw error;
    const row=(data&&data[0])||null;if(!row)return {ok:false};
    if(row.operation_status==='conflict')return {ok:false,status:'conflict',remote:sfNormalizeProjectRecord(sfSharedRecordFromRow(row))};
    sfProjectSyncSnapshots.delete(String(record.id));return {ok:true,status:row.operation_status};
  }catch(error){console.error('Project cloud delete failed for '+record.id,error);return {ok:false,error}}
}
async function sfSyncInvoiceDelete(record){
  if(!sfDb||!sfCurrentUser||!record?.id)return {ok:false};
  sfTouch('invoices',record.id);
  try{
    const {data,error}=await sfDb.rpc('sf_invoice_soft_delete',{
      p_id:String(record.id),p_expected_revision:(record._syncRevision===undefined||record._syncRevision===null)?null:record._syncRevision
    });if(error)throw error;
    const row=(data&&data[0])||null;if(!row)return {ok:false};
    if(row.operation_status==='conflict')return {ok:false,status:'conflict',remote:sfSharedRecordFromRow(row)};
    sfInvoiceSyncSnapshots.delete(String(record.id));return {ok:true,status:row.operation_status};
  }catch(error){console.error('Proforma Invoice cloud delete failed for '+record.id,error);return {ok:false,error}}
}
function sfApplyProjectConflict(conflict){
  const index=projects.findIndex(item=>item.id===conflict.id);
  if(conflict.status==='deleted'){if(index>=0)projects.splice(index,1);sfProjectSyncSnapshots.delete(conflict.id);return}
  if(!conflict.remote)return;
  if(index>=0)projects[index]=conflict.remote;else projects.unshift(conflict.remote);
  sfProjectSyncSnapshots.set(conflict.id,sfRecordSyncPayloadKey(conflict.remote));
}
function sfApplyInvoiceConflict(conflict){
  const index=proformaInvoices.findIndex(item=>item.id===conflict.id);
  if(conflict.status==='deleted'){if(index>=0)proformaInvoices.splice(index,1);sfInvoiceSyncSnapshots.delete(conflict.id);return}
  if(!conflict.remote)return;
  if(index>=0)proformaInvoices[index]=conflict.remote;else proformaInvoices.unshift(conflict.remote);
  sfInvoiceSyncSnapshots.set(conflict.id,sfRecordSyncPayloadKey(conflict.remote));
}
async function sfSyncDirtyProjects(){
  if(!sfDb||!sfCurrentUser||typeof projects==='undefined')return {conflicts:[],errors:[]};
  const conflicts=[],errors=[];
  for(const record of projects.slice()){
    if(!record?.id||sfProjectSyncSnapshots.get(record.id)===sfRecordSyncPayloadKey(record))continue;
    const result=await sfSyncProjectRecord(record); sfDirtyMark('projects',record.id,!!result.pending||(!result.ok&&!result.status&&!(result.error&&sfIsPermanentSyncError(result.error))));
    if(!result.ok&&(result.status==='conflict'||result.status==='deleted'))conflicts.push({id:record.id,status:result.status,remote:result.remote});
    else if(!result.ok&&result.error)errors.push({id:record.id,error:result.error});
  }
  conflicts.forEach(sfApplyProjectConflict);sfCachePerRecordCollection('sfProjects',projects);
  if(conflicts.length){
    renderProjects();if(typeof renderProjectDetails==='function')renderProjectDetails();renderProformas();
    const names=conflicts.map(item=>item.remote?.name||item.id).join(', ');
    setCloudStatus('error','Project updated by another user: '+names);
    alert('Another team member updated the same Project. The latest shared version has been loaded; please review it before editing again.');
  }else if(errors.length)setCloudStatus('error','Project sync failed — local changes retained');
  return {conflicts,errors};
}
async function sfSyncDirtyInvoices(){
  if(!sfDb||!sfCurrentUser||typeof proformaInvoices==='undefined')return {conflicts:[],errors:[]};
  const conflicts=[],errors=[];
  for(const record of proformaInvoices.slice()){
    if(!record?.id||sfInvoiceSyncSnapshots.get(record.id)===sfRecordSyncPayloadKey(record))continue;
    const result=await sfSyncInvoiceRecord(record); sfDirtyMark('invoices',record.id,!!result.pending||(!result.ok&&!result.status&&!(result.error&&sfIsPermanentSyncError(result.error))));
    if(!result.ok&&(result.status==='conflict'||result.status==='deleted'))conflicts.push({id:record.id,status:result.status,remote:result.remote});
    else if(!result.ok&&result.error)errors.push({id:record.id,error:result.error});
  }
  conflicts.forEach(sfApplyInvoiceConflict);sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices);
  if(conflicts.length){
    renderProformas();updateProformaBadge();
    const numbers=conflicts.map(item=>item.remote?.number||item.id).join(', ');
    setCloudStatus('error','Invoice updated by another user: '+numbers);
    alert('Another team member updated the same Proforma Invoice. The latest shared version has been loaded; please review it before editing again.');
  }else if(errors.length)setCloudStatus('error','Invoice sync failed — local changes retained');
  return {conflicts,errors};
}
function sfMirrorProjects(){
  // Projects (including their embedded payments, expenses and documents) are
  // authoritative per record. Never prune a shared table from one browser's
  // local list: that was the source of the concurrent-save data loss.
  return sfSyncDirtyProjects();
}
function sfMirrorAllCollections(){
  try{sfMirrorProjects()}catch(e){}
  // Quotations are intentionally NOT mirrored here — sfMirrorCollection's
  // "delete anything not in this browser's local list" pruning is exactly
  // what was silently deleting quotations created by other team members.
  // Quotations are synced per-record instead; see sfSyncQuoteRecord.
  try{if(typeof proformaInvoices!=='undefined')sfSyncDirtyInvoices()}catch(e){}
  try{if(typeof sfEngineers!=='undefined')sfMirrorCollection(SF_NORMALIZED_TABLES.engineers,sfEngineers)}catch(e){}
  try{if(typeof sfPayrollSheets!=='undefined')sfMirrorCollection(SF_NORMALIZED_TABLES.payroll,sfPayrollSheets)}catch(e){}
}

async function sfCloudPullAll(){
  if(!sfDb||!sfCurrentUser){setCloudStatus('error','Sign in required');return [];}
  setCloudStatus('saving','Syncing securely…');
  try{
    // Flush edits made while temporarily offline before refreshing the local
    // view. Revision mismatches become explicit conflicts, never overwrites.
    await sfFlushPendingCloudKeys(); await sfSyncDirtyQuotes();await sfSyncDirtyProjects();await sfSyncDirtyInvoices(); if(sfUnsavedCount()>0){ sfShowUnsavedStatus(true); sfScheduleSyncRetry(); return []; } const rows=await sfFetchUserCloudRows(sfDataUserId());
    sfWriteCloudRowsToLocal(rows,true);
    sfReloadApplicationStateFromLocal();
    try{await sfHydrateQuotationsFromRemote(); renderSavedQuotations(); updateQuoteBadge();}
    catch(hydrateError){console.warn('Quotation cloud hydrate failed during pull.',hydrateError);}
    try{await sfHydrateProjectsFromRemote();renderProjects();}
    catch(hydrateError){console.warn('Project cloud hydrate failed during pull.',hydrateError);}
    try{await sfHydrateInvoicesFromRemote();renderProformas();updateProformaBadge();}
    catch(hydrateError){console.warn('Proforma Invoice cloud hydrate failed during pull.',hydrateError);}
    setCloudStatus('','Secure cloud connected');
    return rows;
  }catch(error){
    console.error('Secure cloud pull failed',error);
    setCloudStatus('error','Cloud unavailable');
    return [];
  }
}

async function sfActivateUser(user){
  if(!user)return;
  if(sfActivationPromise&&sfActivationUserId===user.id)return sfActivationPromise;
  sfActivationUserId=user.id;
  sfActivationPromise=(async()=>{ sfCurrentUser=user; sfUnsavedAdopt(user.id);
    sfPurgeRestrictedLocalCache();
    document.body.classList.add('sf-auth-locked');
    const overlay=document.getElementById('sf-auth-overlay'); if(overlay)overlay.hidden=false;
    sfSetAuthMessage('Loading and protecting your cloud data…','info');
    setCloudStatus('saving','Secure sync…');

    let dataUserId;
    try{dataUserId=await sfResolveWorkspaceUserId(user)}
    catch(error){
      sfAccessDeniedMessage=error?.message||'Unable to open the shared company workspace.';
      try{await sfDb.auth.signOut({scope:'local'})}catch(e){}
      throw error;
    }

    const previousUserId=localStorage.getItem('sfActiveUserId')||'';
    const localBefore=sfLocalSnapshot();
    const mayMigrateLegacy=!previousUserId||previousUserId===dataUserId;
    const legacyLocal=mayMigrateLegacy?sfCollectLocalUserData():{};
    const readLegacyRecordCache=key=>{
      if(!mayMigrateLegacy)return [];
      try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}
      catch(error){return []}
    };
    // Capture these before any account/cache cleanup. They are excluded from
    // the old blob transport and are imported additively after authentication.
    const legacyRecordCaches={
      quotations:readLegacyRecordCache('sfSavedQuotations'),
      projects:readLegacyRecordCache('sfProjects'),
      invoices:readLegacyRecordCache('sfProformaInvoices')
    };

    if(previousUserId&&previousUserId!==dataUserId)sfClearLocalUserData();

    try{await sfFlushPendingCloudKeys();}catch(e){console.warn('Unsaved changes could not be uploaded yet',e)} let rows; try{rows=await sfFetchUserCloudRows(dataUserId);}
    catch(error){
      console.error('Unable to load secure user data',error);
      sfSetAuthMessage('Login succeeded, but the secure data table is not ready. Run the supplied Supabase SQL setup file.','error');
      setCloudStatus('error','Database setup required');
      return;
    }

    if(rows.length){
      sfWriteCloudRowsToLocal(rows,true);
    }else if(Object.keys(legacyLocal).length){
      // First secure login: migrate the old data already stored in this browser
      // into the authenticated user's private cloud rows.
      if(previousUserId&&previousUserId!==dataUserId){
        sfClearLocalUserData();
      }else{
        await sfCloudPushAllLocal();
      }
    }else{
      sfClearLocalUserData();
    }

    sfPurgeRestrictedLocalCache();

    localStorage.setItem('sfActiveUserId',dataUserId);
    const localAfter=sfLocalSnapshot();

    // The application modules read their data from localStorage before the
    // asynchronous Supabase hydration finishes. Reload only once for each
    // distinct hydrated cloud snapshot so those modules can rebuild from the
    // downloaded data. The snapshot guard prevents an endless refresh loop
    // when startup code creates or normalizes local cache values on every load.
    const hydrationKey='sfHydrationSnapshot:'+dataUserId;
    const lastHydratedSnapshot=sessionStorage.getItem(hydrationKey)||'';
    if(localBefore!==localAfter && lastHydratedSnapshot!==localAfter){
      sessionStorage.setItem(hydrationKey,localAfter);
      window.sfSkipUnloadWarning=true;location.reload();
      return;
    }
    sessionStorage.setItem(hydrationKey,localAfter);
    sfReloadApplicationStateFromLocal();
    const copy=list=>Array.isArray(list)?JSON.parse(JSON.stringify(list)):[];
    const legacy={
      quotes:legacyRecordCaches.quotations.length?legacyRecordCaches.quotations:copy(savedQuotes),
      projects:legacyRecordCaches.projects.length?legacyRecordCaches.projects:copy(projects),
      invoices:legacyRecordCaches.invoices.length?legacyRecordCaches.invoices:copy(proformaInvoices)
    };
    // Open the app now from the saved copy; the shared lists are refreshed in the background.
    sfUnlockApp(user);
    try{performance.mark('sf-unlocked')}catch(_){}
    void sfRefreshCommercialRecords(user,dataUserId,legacy);
  })().catch(error=>{
    console.error('Secure activation failed',error);
    sfSetAuthMessage(error?.message||'Unable to open the secure workspace.','error');
    setCloudStatus('error','Secure login failed');
  }).finally(()=>{
    sfActivationPromise=null;
    sfActivationUserId='';
  });
  return sfActivationPromise;
}

// Shared quotations, projects and invoices after sign-in: the three lists download together, then only the
// records that exist in this browser's older copy but were never on the server are imported (this used to
// send every cached record on every sign-in). A record that has a server revision and is missing from the
// list was deleted there, so it is not imported again. Edits made meanwhile are kept (sfMergeTouched).
const SF_LEGACY_TRIED_PREFIX='legacyImportTried:'; // not an "sf" key, so never synced
function sfLegacyTried(dataUserId,kind){try{return new Set(JSON.parse(localStorage.getItem(SF_LEGACY_TRIED_PREFIX+dataUserId+':'+kind)||'[]'))}catch(_){return new Set()}}
function sfLegacyRemember(dataUserId,kind,records){const tried=sfLegacyTried(dataUserId,kind);records.forEach(r=>tried.add(String(r.id)));try{localStorage.setItem(SF_LEGACY_TRIED_PREFIX+dataUserId+':'+kind,JSON.stringify([...tried].slice(-2000)))}catch(_){}}
function sfLegacyMissing(dataUserId,kind,records,serverList){
  if(!Array.isArray(records)||!records.length)return [];
  const have=new Set((serverList||[]).map(r=>String(r?.id))),tried=sfLegacyTried(dataUserId,kind),dirty=sfDirtyIds(kind);
  return records.filter(r=>r&&r.id!=null&&(r._syncRevision===undefined||r._syncRevision===null)&&!have.has(String(r.id))&&!tried.has(String(r.id))&&!dirty.has(String(r.id)));
}
async function sfRefreshCommercialRecords(user,dataUserId,legacy){
  const current=()=>sfCurrentUser?.id===user.id;
  const renderLists=()=>{try{renderSavedQuotations();updateQuoteBadge();renderProjects();renderProformas();updateProformaBadge();updateSidebarCounts();renderDashboard()}catch(e){console.warn('List render after refresh failed',e)}};
  const kinds=[
    ['quotes',sfHydrateQuotationsFromRemote,sfImportLegacyQuotations,()=>savedQuotes],
    ['projects',sfHydrateProjectsFromRemote,sfImportLegacyProjects,()=>projects],
    ['invoices',sfHydrateInvoicesFromRemote,sfImportLegacyInvoices,()=>proformaInvoices]];
  setCloudStatus('saving','Updating lists…');
  try{
    const loaded=await Promise.all(kinds.map(([,hydrate])=>hydrate()));
    if(!current())return;
    renderLists();
    for(let i=0;i<kinds.length;i++){
      const [kind,hydrate,importer,list]=kinds[i];
      if(!loaded[i])continue; // the list could not be read: never import blindly
      const missing=sfLegacyMissing(dataUserId,kind,legacy?.[kind],list());
      if(!missing.length)continue;
      const added=await importer(missing);if(!current())return;
      sfLegacyRemember(dataUserId,kind,missing);
      if(added>0){await hydrate();if(!current())return;renderLists()}
    }
    if(sfUnsavedCount()>0){sfShowUnsavedStatus(true);sfScheduleSyncRetry();setTimeout(()=>sfRetryUnsaved(),1500)}
    else if(loaded.every(Boolean))setCloudStatus('','Secure cloud connected');
    else setCloudStatus('error','Some lists could not be updated; showing the saved copy.');
  }catch(error){console.warn('Commercial record refresh failed, using the local cache.',error);if(current())setCloudStatus('error','Lists could not be updated; showing the saved copy.')}
  finally{try{performance.mark('sf-lists-ready')}catch(_){}}
}

async function sfHandleAuthState(event,session){
  if(event==='PASSWORD_RECOVERY'){
    sfLockApp(false);
    sfCurrentUser=session?.user||null;
    sfShowAuthPanel('reset');
    sfSetAuthMessage('Your reset link is valid. Choose a new password.','info');
    return;
  }
  if(session?.user){
    if(!sfTeamMember(session.user.email)){
      sfAccessDeniedMessage='This email is not approved for the Sky Field company workspace.';
      try{await sfDb.auth.signOut({scope:'local'})}catch(e){}
      sfLockApp(true);
      sfShowAuthPanel('login');
      sfSetAuthMessage(sfAccessDeniedMessage,'error');
      return;
    }
    const sameUser=sfCurrentUser?.id===session.user.id;
    const passiveRefresh=event==='TOKEN_REFRESHED'||event==='USER_UPDATED';

    // Supabase refreshes access tokens when the browser tab becomes active
    // again. A token refresh is not a logout and must never re-run the full
    // cloud hydration/reload flow or show the login overlay.
    if((sfAuthReady&&sameUser)||(passiveRefresh&&sameUser)){
      sfCurrentUser=session.user;
      sfUnlockApp(session.user);
      return;
    }

    await sfActivateUser(session.user);
  }else{
    // Only an explicit SIGNED_OUT event should clear an authenticated user's
    // local cache. This avoids treating a temporary session check failure as
    // a real logout when the page returns from a background browser tab.
    const clearCache=event==='SIGNED_OUT'&&!!localStorage.getItem('sfActiveUserId');
    sfLockApp(clearCache);
    sfShowAuthPanel('login');
    const denied=sfAccessDeniedMessage;
    sfAccessDeniedMessage='';
    sfSetAuthMessage(denied||(event==='SIGNED_OUT'?'You have been logged out securely.':'Enter your account details to continue.'),denied?'error':'info');
    setCloudStatus('error','Sign in required');
  }
}

async function sfInitAuth(){
  if(!sfDb){
    sfLockApp(false);
    sfShowAuthPanel('login');
    sfSetAuthMessage('Supabase is not configured. Add the Project URL and publishable key.','error');
    return;
  }
  sfDb.auth.onAuthStateChange((event,session)=>{
    setTimeout(()=>sfHandleAuthState(event,session),0);
  });
  try{
    const {data,error}=await sfDb.auth.getSession();
    if(error)throw error;
    await sfHandleAuthState('INITIAL_SESSION',data.session);
  }catch(error){
    console.error('Session check failed',error);
    sfLockApp(false);
    sfShowAuthPanel('login');
    sfSetAuthMessage(error?.message||'Unable to verify the secure session.','error');
  }
}

function sfUiStorageKey(user=sfCurrentUser){
  const email=sfNormalizeEmail(user?.email||'guest')||'guest';
  return `skyfieldUiLanguage:${email}`;
}
function toggleBackupTools(){
  const el=document.getElementById('backup-tools');
  if(el) el.classList.toggle('open');
}
function setCloudStatus(state,label){
  const el=document.getElementById('cloud-status'); if(!el)return;
  el.className='cloud-chip '+(state||'');
  const txt=el.querySelector('.cloud-label'); if(txt)txt.textContent=label||'Cloud';
}
function restoreDefaultScopeActivity(id){
  const item=scopeActivityItemById(id),base=baseScopeActivityById(id);
  if(!item||item.custom||!item.modified||!base||!confirm('Restore the original values for this activity?'))return;
  localStorage.setItem(SF_SCOPE_ACTIVITY_KEY_PREFIX+item.id,JSON.stringify({id:item.id,deleted:true,updatedAt:new Date().toISOString(),updatedBy:sfCurrentUser?.email||''}));
  const oldKey=k(item.cat,item.code),newKey=k(base.cat,base.code);
  if(selActs[oldKey]){
    const qty=actQty[oldKey]||1;delete selActs[oldKey];delete actQty[oldKey];
    selActs[newKey]={cat:base.cat,task:base.task,code:base.code,dur:base.dur,unit:base.unit};actQty[newKey]=qty;
  }
  activeCat=base.cat;if(editingScopeActivityId===item.id)closeScopeActivityForm();refreshScopeActivityUi();
}
function sfLegacySafeUrl(value){const v=String(value||'').trim();return(/^https?:/i.test(v)||/^data:(application|image|text)\//i.test(v)||/^blob:/i.test(v))?v:'#'}
async function sfUploadDocument(file,section,recordId){
  if(!file)return null;
  if(file.size>25*1024*1024)throw new Error('File exceeds the 25 MB upload limit.');
  if(sfDb&&sfCurrentUser){
    const path=`${sfDataUserId()}/${sfSafeSegment(section)}/${sfSafeSegment(recordId||'draft')}/${Date.now()}_${sfSafeSegment(file.name)}`;
    const {data,error}=await sfDb.storage.from(SF_STORAGE_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(error)throw error;
    return{id:'doc_'+Date.now()+'_'+Math.floor(Math.random()*10000),name:file.name,size:file.size||0,mimeType:file.type||'',storagePath:data.path,type:'storage',uploadedAt:new Date().toISOString()};
  }
  const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('File read failed'));r.readAsDataURL(file)});
  return{id:'doc_'+Date.now(),name:file.name,size:file.size||0,mimeType:file.type||'',url,type:'legacy-local',uploadedAt:new Date().toISOString()};
}
async function sfMigrateLegacyDocumentRecord(doc,section,recordId){
  if(!doc||doc.storagePath||!String(doc.url||'').startsWith('data:'))return doc;
  const response=await fetch(doc.url),blob=await response.blob();
  const file=new File([blob],doc.name||('document_'+Date.now()),{type:doc.mimeType||blob.type||'application/octet-stream'});
  const uploaded=await sfUploadDocument(file,section,recordId);
  return{...doc,...uploaded,url:'',type:'storage'};
}
async function migrateLegacyDocumentsToStorage(){
  if(!sfDb||!sfCurrentUser){alert('Sign in to Supabase before migrating documents.');return}
  let candidates=0;
  savedQuotes.forEach(q=>(q.snapshot?.attachments||[]).forEach(d=>{if(!d.storagePath&&String(d.url||'').startsWith('data:'))candidates++}));
  projects.forEach(p=>(p.docs||[]).forEach(d=>{if(!d.storagePath&&String(d.url||'').startsWith('data:'))candidates++}));
  if(!candidates){alert('No legacy Base64 documents were found. New uploads are already stored in Supabase Storage.');return}
  if(!confirm(`Move ${candidates} legacy document reference(s) to private Supabase Storage? Keep a JSON backup until the migration is verified.`))return;
  setCloudStatus('saving','Migrating legacy documents…');
  let migrated=0,failed=0;const quoteDocumentMap=new Map();
  for(const q of savedQuotes){
    const attachments=q.snapshot?.attachments||[];
    for(let i=0;i<attachments.length;i++){
      const before=attachments[i];
      const wasLegacy=!before?.storagePath&&String(before?.url||'').startsWith('data:');
      try{
        attachments[i]=await sfMigrateLegacyDocumentRecord(before,'quotation',q.id||q.number||'legacy');
        const a=attachments[i];
        if(a.storagePath){
          // Project copies created from quotation attachments do not always retain
          // the original file size, so use quotation id + file name as the stable link.
          quoteDocumentMap.set(`${q.id}|${a.name}`,a);
          if(wasLegacy)migrated++;
        }
      }catch(error){failed++;console.error('Quotation attachment migration failed',q.number,before?.name,error)}
    }
  }
  for(const p of projects){
    for(let i=0;i<(p.docs||[]).length;i++){
      const d=p.docs[i];
      const wasLegacy=!d?.storagePath&&String(d?.url||'').startsWith('data:');
      try{
        const linked=d.fromQuoteId?quoteDocumentMap.get(`${d.fromQuoteId}|${d.name}`):null;
        if(linked&&linked.storagePath){
          p.docs[i]={...d,...linked,fromQuoteId:d.fromQuoteId,fromQuoteNumber:d.fromQuoteNumber};
          if(wasLegacy)migrated++;
          continue;
        }
        p.docs[i]=await sfMigrateLegacyDocumentRecord(d,'project',p.id||'legacy');
        if(wasLegacy&&p.docs[i].storagePath)migrated++;
      }catch(error){failed++;console.error('Project document migration failed',p.name,d?.name,error)}
    }
  }
  saveSavedQuotes();saveProjects();
  if(activeQuoteId){const active=savedQuotes.find(q=>q.id===activeQuoteId);if(active)quoteAttachments=deepClone(active.snapshot?.attachments||[])}
  renderQuoteAttachments();renderProjects();setCloudStatus(failed?'error':'','Legacy document migration complete');
  alert(`Migration completed. Updated references: ${migrated}.${failed?` Failed: ${failed}. Check the browser console and retry those files.`:''}`);
}
function hydrateConditionTranslations(list,type){
  const canonical=conditionTemplate(type);
  let position=0;
  const hydrated=(Array.isArray(list)?list:[]).map(c=>{
    if(c.cat==='Custom')return {...c,textAr:c.textAr||''};
    const exact=canonical.find(x=>x.text===c.text);
    const sameCat=canonical.filter(x=>x.cat===c.cat);
    const ref=exact||(sameCat.length===1?sameCat[0]:canonical[position])||{};
    position++;
    return {...c,textAr:c.textAr||ref.textAr||''};
  });
  return normalizeConditionMetadata(hydrated,type);
}


// ══════════════════════════════════════════════════════════════════════════════
// BACKUP / RESTORE (export all app data to a JSON file for OneDrive sync)
// ══════════════════════════════════════════════════════════════════════════════
function exportBackup(){
  const data={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key && sfShouldSyncKey(key)) data[key]=localStorage.getItem(key);
  }
  const payload={
    app:'SkyField Quotation Builder',
    exportedAt:new Date().toISOString(),
    data
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.href=url;
  a.download=`SkyField_Backup_${stamp}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(input){
  const file=input.files&&input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const payload=JSON.parse(e.target.result);
      const data=payload.data||payload; // allow raw dumps too
      if(!data || typeof data!=='object') throw new Error('Invalid backup file.');
      if(!confirm('سيتم استبدال بيانات المشاريع وعروض الأسعار المحفوظة الحالية بالبيانات الموجودة في هذا الملف. هل تريد المتابعة؟')) { input.value=''; return; }
      Object.entries(data).forEach(([k,v])=>{
        if(sfShouldSyncKey(k)) localStorage.setItem(k, v);
      });
      // Reload after the message is closed (it is shown in the page, not as a blocking browser alert).
      const reload=()=>{window.sfSkipUnloadWarning=true;location.reload()};
      const shown=window.sfNotice?.('تم استيراد النسخة الاحتياطية بنجاح. سيتم إعادة تحميل الصفحة الآن.');
      if(shown)shown.then(reload);else reload();
    }catch(err){
      alert('تعذّر قراءة ملف النسخة الاحتياطية. تأكد أنه ملف JSON صحيح تم تصديره من هذا التطبيق.');
    }finally{
      input.value='';
    }
  };
  reader.readAsText(file);
}
// Creates (first time) or updates (subsequent times) the Project linked to a saved quotation/invoice:
// copies over client/contract/commission data, attached files, and keeps a running ledger of every
// quotation & invoice tied to that project. Triggered explicitly by the "Add as Project" button —
// not automatically on every save — so the user decides when a quotation becomes a tracked project.
function syncProjectFromQuotation(rec){
  const snap = rec.snapshot||{};
  const meta = snap.meta||{};
  const totals = snap.totals||{};
  let proj = rec.projectId ? projects.find(p=>p.id===rec.projectId) : null;
  if(!proj){
    proj = {
      id:'proj_'+Date.now()+'_'+Math.floor(Math.random()*1000),
      name: meta['proj-name'] || rec.project || rec.client || 'Untitled Project',
      client: rec.client || meta.client || '',
      status:'active',
      contract:0, start:'', notes:'',
      pos:[], payments:[], docs:[], quotes:[], proformas:[],
      commissionPct:0, commissionAmount:0, commissionNotes:'', commissions:[],
      estimatedInternalCost:0, expectedProfit:0, assignedEngineers:[], costPlan:null, actualExpenses:[],
      updatedAt:new Date().toISOString()
    };
    projects.unshift(proj);
    rec.projectId = proj.id;
  }
  proj.name = meta['proj-name'] || proj.name;
  proj.client = rec.client || meta.client || proj.client;
  if(typeof totals.tot === 'number') proj.contract = totals.tot;
  if(!proj.start) proj.start = meta.qdate || rec.date || '';
  if(typeof totals.sub==='number'&&totals.sub>0&&typeof totals.vatA==='number') proj.vatPct = Math.round(totals.vatA/totals.sub*10000)/100;
  const commPct = parseFloat(meta.commission)||0;
  proj.commissionPct = commPct;
  // Commission is on the contract amount before VAT (after discount), also for quotations saved earlier.
  const commBase = (typeof totals.sub==='number') ? totals.sub : sfNum(proj.contract)/(1+sfProjectVatPct(proj)/100);
  proj.commissionAmount = Math.round(commBase*commPct)/100;
  proj.commissionBasis = 'net';

  // Replace this quotation's attached files within the project's document list (keeps in sync on re-link)
  proj.docs = proj.docs.filter(d=>d.fromQuoteId!==rec.id);
  (snap.attachments||[]).forEach(att=>{
    proj.docs.push({...deepClone(att),name:att.name,type:att.type||'file',fromQuoteId:rec.id,fromQuoteNumber:rec.number});
  });

  // Upsert this quotation/invoice into the project's linked-documents ledger
  const qEntry = {id:rec.id, type:rec.type, number:rec.number, date:rec.date, total:rec.total};
  const qi = proj.quotes.findIndex(q=>q.id===rec.id);
  if(qi>=0) proj.quotes[qi]=qEntry; else proj.quotes.push(qEntry);

  proj.updatedAt = new Date().toISOString();
  saveProjects();
  if(document.getElementById('proj-grid')) renderProjects();
  return proj;
}
function progressLegacyKey(item){ return (item.sn||'')+'|'+(item.description||''); }
// Same content whatever the key order (records read back from the database come with their keys reordered).
function sfSameData(a,b){const norm=v=>Array.isArray(v)?v.map(norm):v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=norm(v[k]),o),{}):v;return JSON.stringify(norm(a))===JSON.stringify(norm(b))}
function syncProformaToProject(pi){
  if(!pi.projectId)return null;const p=projects.find(x=>x.id===pi.projectId);if(!p)return null;
  p.proformas=Array.isArray(p.proformas)?p.proformas:[];
  p.payments=Array.isArray(p.payments)?p.payments:[];
  const calc=resolvedProformaCalculation(pi);
  const entry={id:pi.id,number:pi.number,date:pi.issueDate,total:calc.grandTotal,beforeVat:calc.totalAfterDiscount,vat:calc.vatAmount,basis:proformaBasisLabel(pi),sourceQuoteId:pi.sourceQuoteId};
  const idx=p.proformas.findIndex(x=>x.id===pi.id);
  const payIdx=p.payments.findIndex(x=>x.sourceProformaId===pi.id);
  const oldPay=payIdx>=0?p.payments[payIdx]:null;
  const previous=sfNormalizePaymentRecord(oldPay||{});
  const payEntry=sfNormalizePaymentRecord({
    ...previous,id:previous.id||('pay_'+pi.id),label:'Invoice '+pi.number,amount:calc.grandTotal,date:pi.issueDate,
    sourceProformaId:pi.id,receipts:previous.receipts||[]
  });
  // Already up to date (the repair at every page open lands here): no new project revision and no upload.
  if(idx>=0&&payIdx>=0&&sfSameData(p.proformas[idx],entry)&&sfSameData(previous,payEntry))return p;
  if(idx>=0)p.proformas[idx]=entry;else p.proformas.push(entry);
  if(payIdx>=0)p.payments[payIdx]=payEntry;else p.payments.push(payEntry);
  p.updatedAt=new Date().toISOString();saveProjects();if(document.getElementById('proj-grid'))renderProjects();return p;
}
async function sfUploadPoFile(file){
  if(!sfPoFileAllowed(file))throw new Error('Attach a PDF or an image file. / أرفق ملف PDF أو صورة.');
  setCloudStatus('saving','Uploading PO file…');
  const stored=await sfUploadDocument(file,'project',document.getElementById('pm-id')?.value||'draft');
  setCloudStatus('','PO file uploaded securely');return stored;
}

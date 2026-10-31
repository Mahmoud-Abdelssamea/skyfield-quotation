'use strict';
// One navigation and authentication shell; attendance modules share this verified session.
let sfUnifiedProfile=null,sfAttendanceOnly=false,sfUnifiedRoute='',sfUnifiedFrameReady=false,sfUnifiedReviewTimer=0;
let sfUnifiedDesired=location.hash.slice(1)||localStorage.getItem('sfLastModule')||'dashboard';
const sfUnifiedRoutes={accounting:['Accounts','Approved engineers’ invoices and payment preparation.','accountingSection'],engineers:['Engineers','إدارة المهندسين','engineersSection'],attendance:['Attendance','Record attendance by period.','dailySection'],expenses:['Field Expenses','Engineers’ expense receipts and requests.','expenseSection'],timesheets:['Timesheets & Approvals','Attendance and expense approvals, history, and Excel export.','monthlySection'],attendancesettings:['Attendance Settings','Projects available to engineers for attendance.','admin']};
const sfUnifiedNativeTabs=['dashboard','activities','equipment','costplanning','conditions','projects','projectdetails','quotes','proformas','analytics','engineers','payroll','costsettings'];
const sfUnifiedBaseShow=showTab,sfUnifiedBaseUnlock=sfUnlockApp,sfUnifiedBaseLock=sfLockApp,sfUnifiedBaseAuth=sfHandleAuthState,sfUnifiedBaseAccess=sfApplyRoleAccess,sfUnifiedBaseLanguage=sfSetInterfaceLanguage,sfUnifiedBasePull=sfCloudPullAll;
// Commercial access and equipment role of the signed-in account (sf_my_access, managed on the Users & Permissions page).
// Commercial access fills SF_TEAM_MEMBERS, read by the commercial pages through sfTeamMember(); an account with only an
// equipment role opens the equipment / Iqama pages alone.
let sfUnifiedAccess=null;
// While a section opens: a grey outline of the page (title, summary cards, rows) and the name of what is loading.
function sfUnifiedLoadingHtml(){
 const title=String(document.getElementById('app-page-title')?.textContent||'').trim(),ar=sfUiLanguage==='ar';
 const label=title?(ar?'جاري تحميل '+title+'…':'Loading '+title+'…'):(ar?'جاري تحميل القسم…':'Loading…');
 return '<div class="sf-loading" aria-busy="true"><span class="sf-loading-label">'+escHtml(label)+'</span><span class="sf-skel sf-skel-title"></span>'
  +'<span class="sf-skel-row"><span class="sf-skel"></span><span class="sf-skel"></span><span class="sf-skel"></span></span>'
  +'<span class="sf-skel sf-skel-line"></span><span class="sf-skel sf-skel-line"></span><span class="sf-skel sf-skel-line"></span><span class="sf-skel sf-skel-line short"></span></div>';
}
function sfUnifiedSetAccess(user,access){
 sfUnifiedAccess=access||null;const level=access?.commercial,name=access?.commercial_name||'';
 SF_TEAM_MEMBERS=level?{[sfNormalizeEmail(user?.email)]:level==='full'?{name,role:'Administrator'}:{name,role:'Commercial Administrator',blocked:['engineers','payroll']}}:{};
}
async function sfUnifiedReadAccess(){const {data,error}=await sfDb.rpc('sf_my_access');if(error)throw error;return data||{}}
// Where an account lands when the page it asked for is not open to it.
function sfUnifiedHome(){
 if(sfUnifiedProfile?.role==='accountant')return 'accounting';
 if(!sfAttendanceOnly)return 'dashboard';
 if(sfUnifiedProfile)return 'attendance';
 return ['admin','storekeeper','viewer'].includes(sfUnifiedAccess?.equipment)?'devices':'documents';
}
function sfUnifiedCanManage(){return sfUnifiedProfile?.role==='admin'&&(sfAttendanceOnly||sfHasAccess('engineers'))}
function sfUnifiedAllowed(route){
 if(sfUnifiedProfile?.role==='accountant')return route==='accounting';
 if(route==='accounting')return sfUnifiedProfile?.role==='admin'||(sfUnifiedProfile?.role==='engineer'&&sfUnifiedProfile?.can_accounting===true); // an employee who is also an accountant
 if(route==='engineers')return sfUnifiedCanManage();
 if(route==='attendancesettings')return sfUnifiedProfile?.role==='admin';
 if(['attendance','expenses','timesheets'].includes(route))return !!sfUnifiedProfile;
 return !sfAttendanceOnly&&sfUnifiedNativeTabs.includes(route)&&(route!=='payroll'||sfHasAccess('payroll'));
}
function sfUnifiedApplyAccess(){
 document.body.classList.toggle('sf-attendance-only',sfAttendanceOnly);
 for(const button of document.querySelectorAll('.side-nav-btn[data-module]'))button.style.display=sfUnifiedAllowed(button.dataset.module)?'':'none';
 const sync=document.querySelector('[data-unified-sync]');if(sync)sync.style.display=!sfAttendanceOnly&&sfUnifiedProfile?.role==='admin'&&sfHasAccess('payroll')?'':'none';
  if(sfUnifiedProfile?.role==='engineer'){const btn=document.querySelector('button.side-nav-btn[data-module="timesheets"]');if(btn)btn.innerHTML=(btn.querySelector('.side-nav-icon')?.outerHTML||'')+(sfUiLanguage==='ar'?'المصروفات والتايم شيت':'Expenses & Timesheets');if(sfUnifiedRoute==='timesheets'){document.getElementById('app-page-title').textContent=sfUiLanguage==='ar'?'المصروفات والتايم شيت':'Expenses & Timesheets';document.getElementById('app-page-subtitle').textContent=sfUiLanguage==='ar'?'تابع حضورك ومصروفاتك وحمّل التايم شيت المعتمد':'Track attendance and expenses, and download your approved timesheet';}}
  sfUnifiedRefreshNavGroups();
}
// Hide a sidebar group heading when every item under it is hidden for this account.
function sfUnifiedRefreshNavGroups(){for(const label of document.querySelectorAll('.side-nav .side-nav-label')){let el=label.nextElementSibling,any=false;while(el&&!el.classList.contains('side-nav-label')){if(el.classList.contains('side-nav-btn')&&el.style.display!=='none'&&!el.hidden)any=true;el=el.nextElementSibling}label.style.display=any?'':'none'}}
sfApplyRoleAccess=function(){if(!sfAttendanceOnly)sfUnifiedBaseAccess();sfUnifiedApplyAccess()};
showTab=function(name,button){
 // Unsaved payment details: the page changes only after "Discard" (the draft is then gone, so the check passes).
 if(sfUnifiedRoute==='accounting'&&name!=='accounting'){const f=document.getElementById('sf-unified-frame')?.contentWindow;if(f?.sfAccountingHasDraft?.()){
  sfConfirm({title:sfLang('Discard the unsaved payment details?','لديك بيانات سداد لم تحفظ. هل تريد تركها؟'),ok:sfLang('Discard','تركها'),danger:true})
   .then(ok=>{if(!ok)return;f.sfAccountingDiscardDraft?.();showTab(name,button)});
  return}}
 if(!sfAuthReady){sfUnifiedDesired=location.hash.slice(1)||sfUnifiedDesired;return;}
 if(!sfUnifiedAllowed(name)){
  name=sfUnifiedHome();
  // Equipment-only accounts: open whichever of their two pages is available (both are checked after sign-in).
  if(name==='devices'||name==='documents'){const open=[name,'documents','devices'].find(r=>sfUnifiedAllowed(r));if(open)showTab(open);return}
 }
 sfUnifiedRoute=name;sfUnifiedDesired=name;
 if(sfUnifiedRoutes[name]){
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  const panel=document.getElementById('sf-unified-panel');panel.hidden=false;
  document.body.dataset.module=name;
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===name));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  const meta=sfUnifiedRoutes[name];document.getElementById('app-page-title').textContent=meta[0];document.getElementById('app-page-subtitle').textContent=meta[1];
  const primary=document.getElementById('command-primary-action');primary.hidden=true;
  sfUnifiedOpenModule();closeSidebar();window.scrollTo({top:0,behavior:'smooth'});
 }else{
  document.getElementById('sf-unified-panel').hidden=true;document.getElementById('command-primary-action').hidden=false;
  sfUnifiedBaseShow(name,button);
 }
 history.replaceState(null,'','#'+name);localStorage.setItem('sfLastModule',name);sfUnifiedApplyAccess();
};
function sfUnifiedOpenModule(){
 const frame=document.getElementById('sf-unified-frame');
 if(!frame.getAttribute('src')){
  sfUnifiedFrameReady=false;document.getElementById('sf-unified-notice').innerHTML=sfUnifiedLoadingHtml();frame.hidden=true;
  frame.onload=()=>{if(sfAuthReady)frame.hidden=false;};frame.src='attendance-module.html?v=20261030-design';
 }else if(sfUnifiedFrameReady){
  frame.contentWindow.sfSetEmbeddedView(sfUnifiedRoutes[sfUnifiedRoute][2],sfUiLanguage,sfCurrentUser.id);frame.hidden=false;
 }
}
function sfUnifiedModuleReady(frameWindow,userId){
 const frame=document.getElementById('sf-unified-frame');
 if(frameWindow!==frame.contentWindow||!sfAuthReady||sfCurrentUser?.id!==userId)return;
 sfUnifiedFrameReady=true;document.getElementById('sf-unified-notice').innerHTML='';
 if(sfUnifiedRoutes[sfUnifiedRoute])sfUnifiedOpenModule();
}
function sfUnifiedNavigateFromModule(frameWindow,panel){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow||!sfAuthReady)return;
 const route=Object.keys(sfUnifiedRoutes).find(k=>sfUnifiedRoutes[k][2]===panel);if(route)showTab(route);
}
function sfUnifiedResize(frameWindow,height){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow)return;
 if(Number.isFinite(height))document.getElementById('sf-unified-frame').style.height=Math.max(300,Math.min(12000,Math.ceil(height)+4))+'px';
}
function sfUnifiedClearFrame(){clearTimeout(sfUnifiedReviewTimer);const frame=document.getElementById('sf-unified-frame');frame.removeAttribute('src');frame.hidden=true;sfUnifiedFrameReady=false;document.getElementById('sf-unified-panel').hidden=true;}
sfLockApp=function(clear){sfUnifiedClearFrame();sfUnifiedSetAccess(null,null);sfUnifiedProfile=null;sfUnifiedProfileAt=0;sfUnifiedProfileUser='';sfAttendanceOnly=false;sfUnifiedBaseLock(clear)};
let sfUnifiedProfileAt=0,sfUnifiedProfileUser='';
// The same user is already signed in and Supabase repeats a sign-in event (it sends SIGNED_IN twice each time
// the tab becomes visible, and TOKEN_REFRESHED when the session renews): keep the page as it is — no redraw,
// no scroll to the top, no language reset. The account is still re-checked in the background every 5 minutes.
async function sfUnifiedRecheckProfile(user){
 sfUnifiedProfileAt=Date.now();
 const [{data:member,error},access]=await Promise.all([sfDb.from('sf_daily_members').select('*').eq('user_id',user.id).maybeSingle(),sfUnifiedReadAccess().catch(()=>null)]);
 if(error||!access||sfCurrentUser?.id!==user.id)return; // offline or signed out meanwhile: nothing to decide now
 const wasCommercial=!sfAttendanceOnly;sfUnifiedSetAccess(user,access);
 const commercial=!!sfTeamMember(user.email),active=member&&member.is_active!==false?member:null;
 if(!commercial&&!active&&!access.equipment){sfLockApp(true);sfSetAuthMessage('الحساب غير متاح أو تم إيقافه. تواصل مع الإدارة.','error');return;}
 if(commercial!==wasCommercial){location.reload();return} // commercial access given or removed: rebuild the page for it
 const roleChanged=(sfUnifiedProfile?.role||'')!==(active?.role||'');
 sfUnifiedProfile=active;sfUnifiedProfileUser=user.id;
 if(roleChanged){sfUnifiedApplyAccess();if(!sfUnifiedAllowed(sfUnifiedRoute||sfUnifiedDesired))showTab(sfUnifiedHome());}
}
sfHandleAuthState=async function(event,session){
 if(event==='PASSWORD_RECOVERY')return sfUnifiedBaseAuth(event,session);
 if(!session?.user)return sfUnifiedBaseAuth(event,session);
 if(sfAuthReady&&sfCurrentUser?.id===session.user.id){
  sfCurrentUser=session.user;
  if(Date.now()-sfUnifiedProfileAt>=300000)try{await sfUnifiedRecheckProfile(session.user)}catch(error){console.warn('Account check skipped',error)}
  return;
 }
 try{
  // Token refreshes and repeated auth events reuse the profile read in the last 5 minutes (data access is still checked by the database).
  const reuse=sfAuthReady&&sfCurrentUser?.id===session.user.id&&sfUnifiedProfileUser===session.user.id&&Date.now()-sfUnifiedProfileAt<300000;
  let member=sfUnifiedProfile,error=null;
  if(!reuse){
   let access;
   [{data:member,error},access]=await Promise.all([sfDb.from('sf_daily_members').select('*').eq('user_id',session.user.id).maybeSingle(),sfUnifiedReadAccess()]);
   sfUnifiedSetAccess(session.user,access);
   if(!error){sfUnifiedProfileAt=Date.now();sfUnifiedProfileUser=session.user.id}
  }
  const commercial=!!sfTeamMember(session.user.email);
  if(error&&!commercial)throw error;
  sfUnifiedProfile=!error&&member?.is_active!==false?member:null;
  if(!commercial&&!sfUnifiedProfile&&!sfUnifiedAccess?.equipment){sfLockApp(true);sfSetAuthMessage('الحساب غير متاح أو تم إيقافه. تواصل مع الإدارة.','error');return;}
  sfAttendanceOnly=!commercial;
  if(sfAttendanceOnly){
   if(sfCurrentUser?.id!==session.user.id||!sfAuthReady){
    sfSyncPaused=true;sfWorkspaceUserId='';sfClearLocalUserData();sfCurrentUser=session.user;
    sfAttendanceSupplemental.clear();sfEngineers=[];sfPayrollSheets=[];sfCurrentPayroll=null;sfCurrentCostPlan={manpower:[],equipment:[],other:[]};projects=[];savedQuotes=[];proformaInvoices=[];
    sfReloadApplicationStateFromLocal();
   }
   sfUnlockApp(session.user);
  }else{sfSyncPaused=false;await sfUnifiedBaseAuth(event,session);}
 }catch(error){sfLockApp(false);sfSetAuthMessage(error?.message||'Unable to verify account','error')}
};
sfUnlockApp=function(user){
 if(sfAttendanceOnly){
  sfCurrentUser=user;sfAuthReady=true;document.body.classList.remove('sf-auth-locked');document.getElementById('sf-auth-overlay').hidden=true;
  const profile=sfUnifiedProfile;document.getElementById('side-account').classList.add('show');const shown=profile?.name||sfUnifiedAccess?.equipment_name||'';document.getElementById('side-account-name').textContent=shown;document.getElementById('side-account-email').textContent=profile?.engineer_id||user?.email||'';document.getElementById('side-account-avatar').textContent=shown[0]||'SF';
  sfLoadUserInterfaceLanguage(user);setCloudStatus('','Secure cloud connected');
 }else{sfUnifiedBaseUnlock(user);void sfRefreshAttendanceRoster();}
 sfUnifiedApplyAccess();showTab(sfUnifiedAllowed(sfUnifiedDesired)?sfUnifiedDesired:sfUnifiedHome());
};
sfSetInterfaceLanguage=function(lang,persist=true){sfUnifiedBaseLanguage(lang,persist);if(sfUnifiedFrameReady)document.getElementById('sf-unified-frame')?.contentWindow?.sfAccountingLanguageChanged?.();if(sfUnifiedFrameReady&&sfUnifiedRoutes[sfUnifiedRoute])sfUnifiedOpenModule()};
sfCloudPullAll=async function(){if(sfAttendanceOnly)return [];return sfUnifiedBasePull()};
window.addEventListener('hashchange',()=>{if(sfAuthReady)showTab(location.hash.slice(1))});
// Keep employment and salary fields in the same edit form as the attendance identity.
const sfExtraFields={nationality:'nationality',iqama:'iqama',profession:'profession',specialization:'specialization',loa:'loa',employment:'employment',status:'status',monthly:'monthly','housing-transport':'housingTransport','car-allowance':'carAllowance',notes:'notes'};
async function sfUnifiedGetDetails(frameWindow,userId){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow||!sfUnifiedCanManage())throw Error('Access denied');
 if(sfAttendanceOnly)return null;
 await sfRefreshAttendanceRoster();
 const entry=sfEngineers.find(e=>e.id==='attendance_'+userId);if(!sfAttendanceRosterReady||!entry)throw Error('تعذر تحميل بيانات الوظيفة والراتب. اضغط تحديث وحاول مرة أخرى.');
 return Object.fromEntries(Object.entries(sfExtraFields).map(([field,key])=>[field,entry[key]??'']));
}
async function sfUnifiedSaveDetails(frameWindow,userId,values,identity){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow||!sfUnifiedCanManage()||sfAttendanceOnly)throw Error('Access denied');
 await sfRefreshAttendanceRoster(true);const id='attendance_'+userId,old=sfEngineers.find(e=>e.id===id);
 if(!old||!sfAttendanceRosterReady)throw Error('Engineer unavailable');
 const entry={...old,name:identity.name,overtime:Number(identity.overtime_rate),updatedAt:new Date().toISOString()};
 for(const [field,key] of Object.entries(sfExtraFields)){
  if(['monthly','housingTransport','carAllowance'].includes(key)){const n=Number(values[field]);if(!Number.isFinite(n)||n<0)throw Error('Invalid salary or cost');entry[key]=n;}
  else entry[key]=String(values[field]??'').trim();
 }
 entry.daily=sfRound2(sfAttendancePackage(entry)/30);
 const retained=new Map(sfAttendanceSupplemental);retained.set(id,entry);const rows=[...retained.values()];
 const {error}=await sfDb.rpc('sf_workspace_save_key',{p_key:'sfEngineers',p_value:rows});if(error)throw error;
 sfAttendanceSupplemental=retained;sfEngineers=sfEngineers.map(e=>e.id===id?entry:e);const paused=sfSyncPaused;sfSyncPaused=true;try{localStorage.setItem('sfEngineers',JSON.stringify(rows))}finally{sfSyncPaused=paused}
 sfApplyAttendanceRoster();renderEngineers();renderCostPlan();if(typeof payrollRender==='function')payrollRender();void sfMirrorCollection(SF_NORMALIZED_TABLES.engineers,sfEngineers);
}
// An approval or rejection changes project cost; refresh it shortly after the last click (burst-safe).
function sfUnifiedReviewChanged(frameWindow){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow||sfAttendanceOnly||!sfAuthReady)return;
 clearTimeout(sfUnifiedReviewTimer);sfUnifiedReviewTimer=setTimeout(()=>{void sfAutoSyncProjectExpenses()},1200);
}
// Salary packages for the period approval screen, keyed by attendance user id. Payroll administrators only.
async function sfUnifiedSalaryPackages(frameWindow){
 if(frameWindow!==document.getElementById('sf-unified-frame').contentWindow||sfAttendanceOnly||sfUnifiedProfile?.role!=='admin'||!sfHasAccess('payroll'))return null;
 if(typeof sfAttendancePackage!=='function')return null;
 if(!sfAttendanceRosterReady)await sfRefreshAttendanceRoster();
 if(!sfAttendanceRosterReady)return null;
 const packages={};
 // Same priority as the project-cost sync: current roster first, archived engineers from the supplemental store.
 for(const e of [...sfAttendanceSupplemental.values(),...sfEngineers])if(String(e.id).startsWith('attendance_'))packages[String(e.id).slice(11)]=sfAttendancePackage(e);
 return {standardDays:SF_ATTENDANCE_STANDARD_DAYS,costingFrom:SF_ATTENDANCE_COSTING_FROM,packages};
}
function sfUnifiedRosterChanged(frameWindow){if(frameWindow===document.getElementById('sf-unified-frame').contentWindow&&!sfAttendanceOnly)void sfRefreshAttendanceRoster(true)}

// Language switcher: floating on the sign-in screen, inside the sidebar once signed in
// (it used to cover the header on computers and the content on phones).
(function(){const place=()=>{const sw=document.querySelector('.sf-language-switcher'),slot=document.getElementById('side-language-slot');if(!sw||!slot)return;const locked=document.body.classList.contains('sf-auth-locked');if(locked&&sw.parentElement!==document.body)document.body.prepend(sw);else if(!locked&&sw.parentElement!==slot)slot.appendChild(sw);sw.classList.toggle('in-sidebar',!locked)};place();new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']})})();

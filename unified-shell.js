'use strict';
// One navigation and authentication shell; attendance modules share this verified session.
let sfUnifiedProfile=null,sfAttendanceOnly=false,sfUnifiedRoute='',sfUnifiedFrameReady=false,sfUnifiedReviewTimer=0;
let sfUnifiedDesired=location.hash.slice(1)||localStorage.getItem('sfLastModule')||'dashboard';
const sfUnifiedRoutes={engineers:['Engineers','إدارة المهندسين','engineersSection'],attendance:['Attendance','Record attendance by period.','dailySection'],expenses:['Field Expenses','Engineers’ expense receipts and requests.','expenseSection'],timesheets:['Timesheets & Approvals','Attendance and expense approvals, history, and Excel export.','monthlySection'],attendancesettings:['Attendance Settings','Projects available to engineers for attendance.','admin']};
const sfUnifiedNativeTabs=['dashboard','activities','equipment','costplanning','conditions','projects','projectdetails','quotes','proformas','analytics','engineers','payroll','costsettings'];
const sfUnifiedBaseShow=showTab,sfUnifiedBaseUnlock=sfUnlockApp,sfUnifiedBaseLock=sfLockApp,sfUnifiedBaseAuth=sfHandleAuthState,sfUnifiedBaseAccess=sfApplyRoleAccess,sfUnifiedBaseLanguage=sfSetInterfaceLanguage,sfUnifiedBasePull=sfCloudPullAll;
function sfUnifiedCanManage(){return sfUnifiedProfile?.role==='admin'&&(sfAttendanceOnly||sfHasAccess('engineers'))}
function sfUnifiedAllowed(route){
 if(route==='engineers')return sfUnifiedCanManage();
 if(route==='attendancesettings')return sfUnifiedProfile?.role==='admin';
 if(['attendance','expenses','timesheets'].includes(route))return !!sfUnifiedProfile;
 return !sfAttendanceOnly&&sfUnifiedNativeTabs.includes(route)&&(route!=='payroll'||sfHasAccess('payroll'));
}
function sfUnifiedApplyAccess(){
 document.body.classList.toggle('sf-attendance-only',sfAttendanceOnly);
 for(const button of document.querySelectorAll('.side-nav-btn[data-module]'))button.style.display=sfUnifiedAllowed(button.dataset.module)?'':'none';
 const sync=document.querySelector('[data-unified-sync]');if(sync)sync.style.display=!sfAttendanceOnly&&sfUnifiedProfile?.role==='admin'&&sfHasAccess('payroll')?'':'none';
  if(sfUnifiedProfile?.role==='engineer'){const btn=document.querySelector('button.side-nav-btn[data-module="timesheets"]');if(btn)btn.innerHTML='<span class="side-nav-icon">▦</span>'+(sfUiLanguage==='ar'?'التايم شيت الخاص بي':'My Timesheet');if(sfUnifiedRoute==='timesheets'){document.getElementById('app-page-title').textContent=sfUiLanguage==='ar'?'التايم شيت الخاص بي':'My Timesheet';document.getElementById('app-page-subtitle').textContent=sfUiLanguage==='ar'?'اختر الشهر وحمّل الحضور المعتمد لكل المشاريع':'Choose a month and download approved attendance across all projects';}}
  sfUnifiedRefreshNavGroups();
}
// Hide a sidebar group heading when every item under it is hidden for this account.
function sfUnifiedRefreshNavGroups(){for(const label of document.querySelectorAll('.side-nav .side-nav-label')){let el=label.nextElementSibling,any=false;while(el&&!el.classList.contains('side-nav-label')){if(el.classList.contains('side-nav-btn')&&el.style.display!=='none'&&!el.hidden)any=true;el=el.nextElementSibling}label.style.display=any?'':'none'}}
sfApplyRoleAccess=function(){if(!sfAttendanceOnly)sfUnifiedBaseAccess();sfUnifiedApplyAccess()};
showTab=function(name,button){
 if(!sfAuthReady){sfUnifiedDesired=location.hash.slice(1)||sfUnifiedDesired;return;}
 if(!sfUnifiedAllowed(name))name=sfAttendanceOnly?'attendance':'dashboard';
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
  sfUnifiedFrameReady=false;document.getElementById('sf-unified-notice').textContent='جاري تحميل القسم… / Loading…';frame.hidden=true;
  frame.onload=()=>{if(sfAuthReady)frame.hidden=false;};frame.src='attendance-module.html?v=20261017-review5';
 }else if(sfUnifiedFrameReady){
  frame.contentWindow.sfSetEmbeddedView(sfUnifiedRoutes[sfUnifiedRoute][2],sfUiLanguage,sfCurrentUser.id);frame.hidden=false;
 }
}
function sfUnifiedModuleReady(frameWindow,userId){
 const frame=document.getElementById('sf-unified-frame');
 if(frameWindow!==frame.contentWindow||!sfAuthReady||sfCurrentUser?.id!==userId)return;
 sfUnifiedFrameReady=true;document.getElementById('sf-unified-notice').textContent='';
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
sfLockApp=function(clear){sfUnifiedClearFrame();sfUnifiedProfile=null;sfAttendanceOnly=false;sfUnifiedBaseLock(clear)};
sfHandleAuthState=async function(event,session){
 if(event==='PASSWORD_RECOVERY')return sfUnifiedBaseAuth(event,session);
 if(!session?.user)return sfUnifiedBaseAuth(event,session);
 try{
  const {data:member,error}=await sfDb.from('sf_daily_members').select('*').eq('user_id',session.user.id).maybeSingle();
  const commercial=!!sfTeamMember(session.user.email);
  if(error&&!commercial)throw error;
  sfUnifiedProfile=!error&&member?.is_active!==false?member:null;
  if(!commercial&&!sfUnifiedProfile){sfLockApp(true);sfSetAuthMessage('الحساب غير متاح أو تم إيقافه. تواصل مع الإدارة.','error');return;}
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
  const profile=sfUnifiedProfile;document.getElementById('side-account').classList.add('show');document.getElementById('side-account-name').textContent=profile?.name||'';document.getElementById('side-account-email').textContent=profile?.engineer_id||'';document.getElementById('side-account-avatar').textContent=profile?.name?.[0]||'SF';
  sfLoadUserInterfaceLanguage(user);setCloudStatus('','Secure cloud connected');
 }else{sfUnifiedBaseUnlock(user);void sfRefreshAttendanceRoster();}
 sfUnifiedApplyAccess();showTab(sfUnifiedAllowed(sfUnifiedDesired)?sfUnifiedDesired:sfAttendanceOnly?'attendance':'dashboard');
};
sfSetInterfaceLanguage=function(lang,persist=true){sfUnifiedBaseLanguage(lang,persist);if(sfUnifiedFrameReady&&sfUnifiedRoutes[sfUnifiedRoute])sfUnifiedOpenModule()};
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
 await sfRefreshAttendanceRoster();const id='attendance_'+userId,old=sfEngineers.find(e=>e.id===id);
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
function sfUnifiedRosterChanged(frameWindow){if(frameWindow===document.getElementById('sf-unified-frame').contentWindow&&!sfAttendanceOnly)void sfRefreshAttendanceRoster()}

// Language switcher: floating on the sign-in screen, inside the sidebar once signed in
// (it used to cover the header on computers and the content on phones).
(function(){const place=()=>{const sw=document.querySelector('.sf-language-switcher'),slot=document.getElementById('side-language-slot');if(!sw||!slot)return;const locked=document.body.classList.contains('sf-auth-locked');if(locked&&sw.parentElement!==document.body)document.body.prepend(sw);else if(!locked&&sw.parentElement!==slot)slot.appendChild(sw);sw.classList.toggle('in-sidebar',!locked)};place();new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']})})();

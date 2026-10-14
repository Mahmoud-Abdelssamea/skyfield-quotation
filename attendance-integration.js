// ── Approved attendance and invoices → project actual cost ─────────────────────
// Three kinds of approved data are charged to a project's actual expenses:
//  1) invoices/expenses engineers upload (source 'daily_expense'), exactly as before;
//  2) salary of approved on-site days: monthly package ÷ standard days × project days (same formula as Payroll);
//  3) site allowance and overtime taken as-is from the approved attendance records.
// Lines for (2) and (3) use source 'payroll' (so limited commercial accounts keep being denied access to them)
// and a sourceId starting with 'attendance:' so they can be rebuilt idempotently on every sync.
// Payroll sheets for months from SF_ATTENDANCE_COSTING_FROM no longer post a lump sum (see override below),
// otherwise the same cost would be counted twice. Set the constant to '' to switch this feature off.
const SF_ATTENDANCE_COSTING_FROM='2026-10';
const SF_ATTENDANCE_STANDARD_DAYS=30;
const sfRound2=n=>Math.round((Number(n)||0)*100)/100;
const sfIsAttendanceCostLine=e=>e?.source==='payroll'&&String(e.sourceId||'').startsWith('attendance:');
const sfIsSyncedExpenseLine=e=>e?.source==='daily_expense'||sfIsAttendanceCostLine(e);
const sfExpenseLineKey=e=>[e.id,e.source,e.sourceId,e.category,e.description,sfRound2(e.amount),e.date].join('|');
const sfById=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
// Monthly package charged per site day: (base + housing/transport + car) ÷ standard days. Shared with the approval screen.
function sfAttendancePackage(eng){return sfNum(eng?.monthly)+sfNum(eng?.housingTransport)+sfNum(eng?.carAllowance??eng?.siteCar)}
function sfAttendanceCostingCovers(sheet){return !!SF_ATTENDANCE_COSTING_FROM&&!!sheet?.month&&String(sheet.month)>=SF_ATTENDANCE_COSTING_FROM}

async function sfBuildAttendanceCostLines(){
 if(!SF_ATTENDANCE_COSTING_FROM)return {byProject:new Map(),missingSalary:[],unmatchedProjects:[]};
 if(!sfAttendanceRosterReady)await sfRefreshAttendanceRoster();
 if(!sfAttendanceRosterReady)throw Error('تعذر تحميل مهندسي الحضور لاحتساب الرواتب. حدّث الصفحة ثم أعد المحاولة.');
 const {data,error}=await sfDb.rpc('sf_get_attendance_cost_rows',{p_from:SF_ATTENDANCE_COSTING_FROM+'-01'});
 if(error){
  if(error.code==='PGRST202'||/sf_get_attendance_cost_rows/.test(error.message||''))throw Error('شغّل ملف 08-attendance-project-costs-v9.sql في Supabase لتفعيل ترحيل الحضور المعتمد إلى المشاريع.');
  throw error;
 }
 const rows=data||[];
 // Salary can never exceed the standard days per engineer/month, even in 31-day months or with several projects.
 const totalDays=new Map();
 for(const r of rows){const k=r.u_id+'|'+r.ym;totalDays.set(k,(totalDays.get(k)||0)+Number(r.day_count))}
 const byProject=new Map(),missing=new Set(),projectIds=new Set(projects.map(p=>String(p.id))),unmatched=new Set();
 for(const r of rows){
  const pid=String(r.proj_id);
  if(!projectIds.has(pid)){unmatched.add(pid);continue}
  const eid='attendance_'+r.u_id;
  const eng=sfEngineers.find(e=>e.id===eid)||sfAttendanceSupplemental.get(eid)||{};
  const name=eng.name||String(r.u_id).slice(0,8);
  const pkg=sfAttendancePackage(eng);
  if(pkg<=0)missing.add(name);
  const days=Number(r.day_count),cap=Math.min(1,SF_ATTENDANCE_STANDARD_DAYS/totalDays.get(r.u_id+'|'+r.ym));
  const list=byProject.get(pid)||[];
  const add=(kind,label,amount)=>{
   amount=sfRound2(amount);if(!(amount>0))return;
   list.push({id:'att_'+r.ym+'_'+kind+'_'+r.u_id,source:'payroll',sourceId:'attendance:'+r.u_id+':'+r.ym+':'+pid+':'+kind,category:'Payroll',description:label,amount,date:r.ym+'-01'});
  };
  add('salary','Salary · '+name+' · '+r.ym+' · '+days+(days===1?' day':' days'),pkg*(days*cap)/SF_ATTENDANCE_STANDARD_DAYS);
  add('allowance','Site allowance · '+name+' · '+r.ym+' · '+days+(days===1?' day':' days'),Number(r.allowance_sum));
  add('overtime','Overtime · '+name+' · '+r.ym+' · '+Number(r.ot_hours)+' h',Number(r.ot_amount));
  byProject.set(pid,list);
 }
 return {byProject,missingSalary:[...missing],unmatchedProjects:[...unmatched]};
}

async function sfSyncDailyModule(silent=false){
 if(!sfHasAccess('payroll')){alert('هذه العملية للإدارة فقط');return;}
 try{
  const {data:member,error:memberError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
  if(memberError)throw memberError;if(member?.role!=='admin')throw Error('يجب تفعيل صلاحية إدارة الحضور لهذا الحساب');
  if(projects.length){const {error}=await sfDb.from('sf_daily_projects').upsert(projects.map(p=>({id:String(p.id),name:p.name||String(p.id)})));if(error)throw error;}
  let expenses=[];
  for(let offset=0;;offset+=500){const {data,error}=await sfDb.from('sf_daily_expenses').select('*').eq('review','approved').order('id').range(offset,offset+499);if(error)throw error;expenses.push(...data);if(data.length<500)break;}
  // Attendance cost is best-effort: when it cannot be computed, existing attendance lines are left untouched.
  let costs=null,costWarning='';
  try{costs=await sfBuildAttendanceCostLines()}catch(e){costWarning=e.message}
  let changed=0;
  for(const p of projects){
   const existing=Array.isArray(p.actualExpenses)?p.actualExpenses:[];
   const keepAttendance=costs===null;
   const kept=existing.filter(e=>!sfIsSyncedExpenseLine(e)||(keepAttendance&&sfIsAttendanceCostLine(e)));
   const fromExpenses=expenses.filter(e=>String(e.project_id)===String(p.id)).map(e=>({id:'daily_'+e.id,source:'daily_expense',sourceId:e.id,category:e.category,description:e.description,amount:Number(e.amount),date:e.day}));
   const fromAttendance=costs?(costs.byProject.get(String(p.id))||[]):[];
   const next=[...kept,...[...fromExpenses,...fromAttendance].sort(sfById)];
   const before=existing.filter(sfIsSyncedExpenseLine).sort(sfById).map(sfExpenseLineKey).join('\n');
   const after=next.filter(sfIsSyncedExpenseLine).sort(sfById).map(sfExpenseLineKey).join('\n');
   if(before===after)continue;
   p.actualExpenses=next;p.updatedAt=new Date().toISOString();changed++;
  }
  if(changed){
   const saved=await saveProjects();
   if(saved?.errors?.length||saved?.conflicts?.length)throw Error('تعذر حفظ المصروفات في المشروع. حدّث المشروع ثم أعد المزامنة.');
  }
  if(typeof renderProjectDetails==='function'&&sfActiveProjectDetailsId)renderProjectDetails();
  if(costWarning&&silent&&typeof setCloudStatus==='function')setCloudStatus('error','Attendance cost sync: '+costWarning);
  if(!silent){
   const notes=[];
   if(costWarning)notes.push('تنبيه: لم تُحدَّث تكلفة الحضور — '+costWarning);
   else if(SF_ATTENDANCE_COSTING_FROM){
    if(costs.missingSalary.length)notes.push('مهندسون بلا راتب مسجل (احتُسب راتبهم صفرًا): '+costs.missingSalary.join('، '));
    if(costs.unmatchedProjects.length)notes.push('مشاريع في الحضور غير موجودة في المشاريع الحالية: '+costs.unmatchedProjects.join('، '));
   }
   alert('تم تحديث قائمة المشاريع وترحيل المصروفات المعتمدة'+(SF_ATTENDANCE_COSTING_FROM?'، وتكلفة الحضور المعتمد (الراتب والبدلات والأوفر تايم) بدءًا من شهر '+SF_ATTENDANCE_COSTING_FROM:'')+' دون تكرار. المصروفات العامة بلا مشروع لا تدخل تكلفة أي مشروع.'+(notes.length?'\n\n'+notes.join('\n'):''));
  }
  return true;
 }catch(e){if(!silent)alert('لم تكتمل المزامنة: '+e.message);else if(typeof setCloudStatus==='function')setCloudStatus('error','Expense sync failed: '+e.message);return false;}
}

// Payroll sheets of months covered by attendance costing keep their own record but no longer post a lump sum.
const sfPayrollPostBase=payrollPostProjectExpense;
payrollPostProjectExpense=function(sheet){
 if(!sfAttendanceCostingCovers(sheet))return sfPayrollPostBase(sheet);
 let touched=false;
 projects.forEach(p=>{if(Array.isArray(p.actualExpenses)&&p.actualExpenses.some(e=>e.sourceId===sheet.id)){p.actualExpenses=p.actualExpenses.filter(e=>e.sourceId!==sheet.id);p.updatedAt=new Date().toISOString();touched=true}});
 if(touched)saveProjects();
};

// Attendance owns identities. The main workspace keeps supplemental cost data.
let sfAttendanceRoster = [], sfAttendanceRosterReady = false;
let sfAttendanceSupplemental = new Map(sfEngineers.filter(e=>String(e.id).startsWith('attendance_')).map(e=>[e.id,e]));
let sfAttendanceRosterUser = '', sfAttendanceFetch = null, sfAttendanceFetchUser = '';
function sfProjectAttendanceEngineers(saved, roster) {
 const details=new Map(saved.map(e=>[e.id,e]));
 return roster.map(e=>({nationality:'',iqama:'',profession:'',specialization:'Other',loa:'Non-LOA',employment:'Company Employee',status:'available',daily:0,monthly:0,overtime:0,housingTransport:0,siteAllowance:0,carAllowance:0,notes:'',...details.get(e.id),id:e.id,name:e.name,employeeNo:e.employee_no}));
}
function sfApplyAttendanceRoster(){
 for(const e of sfEngineers)if(String(e.id).startsWith('attendance_'))sfAttendanceSupplemental.set(e.id,e);
 sfEngineers=sfProjectAttendanceEngineers([...sfAttendanceSupplemental.values()],sfAttendanceRosterReady?sfAttendanceRoster:[]);
}
function sfAttendanceRosterStatus(text){
 const el=document.getElementById('sf-attendance-roster-status');if(el)el.textContent=text;
}
async function sfRefreshAttendanceRoster(){
 if(!sfCurrentUser||!sfAuthReady||!sfDb||!sfHasAccess('engineers'))return;
 const user=sfCurrentUser.id;
 if(sfAttendanceFetch&&sfAttendanceFetchUser===user)return sfAttendanceFetch;
 sfAttendanceFetchUser=user;
 const task=(async()=>{
  sfAttendanceRosterStatus('جاري تحميل مهندسي الحضور… / Loading attendance engineers…');
  try{
   const {data,error}=await sfDb.rpc('sf_get_attendance_engineers');if(error)throw error;
   if(sfCurrentUser?.id!==user||!sfAuthReady)return;
   sfAttendanceRoster=data||[];sfAttendanceRosterReady=true;sfAttendanceRosterUser=user;
   sfApplyAttendanceRoster();renderEngineers();renderCostPlan();
   if(typeof payrollRender==='function')payrollRender();
   sfAttendanceRosterStatus('المصدر: إدارة الحضور · '+sfEngineers.length+' مهندس / Source: attendance administration');
  }catch(error){
   if(sfCurrentUser?.id!==user)return;
   sfAttendanceRosterReady=false;sfAttendanceRoster=[];sfApplyAttendanceRoster();renderEngineers();
   sfAttendanceRosterStatus('تعذر تحميل المهندسين. نفّذ attendance-engineers-v5.sql واستخدم حساب إدارة الحضور ثم اضغط تحديث. '+error.message);
  }
 })();
 sfAttendanceFetch=task;
 try{await task}finally{if(sfAttendanceFetch===task){sfAttendanceFetch=null;sfAttendanceFetchUser=''}}
}
const sfAttendanceRenderBase=renderEngineers;
renderEngineers=function(){sfApplyAttendanceRoster();sfAttendanceRenderBase()};
const sfAttendanceReloadBase=sfReloadApplicationStateFromLocal;
sfReloadApplicationStateFromLocal=function(){sfAttendanceReloadBase();void sfRefreshAttendanceRoster()};
const sfAttendanceLockBase=sfLockApp;
sfLockApp=function(clear){sfAttendanceRoster=[];sfAttendanceRosterReady=false;sfAttendanceRosterUser='';sfAttendanceSupplemental.clear();sfAttendanceLockBase(clear);sfEngineers=[];renderEngineers()};
importSkyFieldEngineers=function(){showTab('engineers');return{added:0,updated:0}};
// Standalone identity writes are retired; the unified directory owns account changes.
saveEngineerRecord=function(){showTab('engineers')};
deleteEngineerRecord=function(){showTab('engineers')};
window.addEventListener('focus',()=>{void sfRefreshAttendanceRoster()});
// Do not prune legacy reporting rows while the new roster is loading.
const sfAttendanceMirrorBase=sfMirrorCollection;
sfMirrorCollection=async function(table,records){
 if(table!==SF_NORMALIZED_TABLES.engineers)return sfAttendanceMirrorBase(table,records);
 if(!sfAttendanceRosterReady||!sfDb||!sfCurrentUser||!sfNormalizedTablesAvailable||sfIsLimitedMember())return;
 const rows=sfEngineers.map(e=>({user_id:sfDataUserId(),id:e.id,payload:e,updated_at:e.updatedAt||new Date().toISOString()}));
 if(!rows.length)return;
 const {error}=await sfDb.from(table).upsert(rows,{onConflict:'user_id,id'});
 if(error)console.warn('Attendance engineer reporting mirror unavailable',error.message);
};

// Refresh approved project expenses when administrators open the project or its expense tab.
let sfExpenseAutoSync=null,sfExpenseSyncAgain=false;
function sfAutoSyncProjectExpenses(){
 if(typeof sfUnifiedProfile==='undefined'||sfUnifiedProfile?.role!=='admin'||!sfHasAccess('payroll'))return;
 if(sfExpenseAutoSync){sfExpenseSyncAgain=true;return sfExpenseAutoSync}
 sfExpenseAutoSync=(async()=>{try{do{sfExpenseSyncAgain=false;await sfSyncDailyModule(true)}while(sfExpenseSyncAgain)}finally{sfExpenseAutoSync=null}})();
 return sfExpenseAutoSync;
}
const sfExpenseOpenProjectBase=openProjectDetails;
openProjectDetails=function(id){sfExpenseOpenProjectBase(id);void sfAutoSyncProjectExpenses()};
const sfExpensePanelBase=setProjectDetailsPanel;
setProjectDetailsPanel=function(panel){sfExpensePanelBase(panel);if(panel==='expenses')void sfAutoSyncProjectExpenses()};

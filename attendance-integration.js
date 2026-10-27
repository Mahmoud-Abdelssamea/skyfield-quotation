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
// Salary basis of a month once its payroll is approved: the package recorded in the approved sheet, so a later
// raise never changes the cost of months already closed. Null = no approved sheet for that engineer and month.
function sfApprovedPayrollRow(engineerId,ym){
 const matches=[];
 for(const sheet of sfPayrollSheets||[])if(sheet?.status==='approved'&&String(sheet.month)===String(ym))for(const row of sheet.rows||[])if(row.engineerId===engineerId)matches.push({row,sheet});
 if(matches.length>1)throw Error('توجد كشوف معتمدة مكررة للمهندس في '+ym+'؛ أوقف الترحيل لحين مراجعتها.');
 return matches[0]||null;
}
function sfApprovedPayrollPackage(engineerId,ym){const x=sfApprovedPayrollRow(engineerId,ym);return x?sfNum(x.row.baseSalary)+sfNum(x.row.housingTransport)+sfNum(x.row.carAllowance??x.row.siteCar):null}
async function sfSalaryUnpaidDays(from){
 const counts=new Map();
 for(let o=0;;o+=500){
  const {data,error}=await sfDb.from('sf_daily_records').select('id,user_id,day,status,leave_type').eq('review','approved').gte('day',from).in('status',['absent','leave']).order('id').range(o,o+499);
  if(error)throw error;
  for(const r of data||[])if(r.status==='absent'||(r.status==='leave'&&!['annual','sick','emergency'].includes(r.leave_type))){const k=r.user_id+'|'+String(r.day).slice(0,7);counts.set(k,(counts.get(k)||0)+1);}
  if((data||[]).length<500)return counts;
 }
}
function sfProjectSalaryBasis(engineerId,ym,eng,unpaid,totalSiteDays){
 const frozen=sfApprovedPayrollRow(engineerId,ym);
 const pkg=frozen?sfApprovedPayrollPackage(engineerId,ym):sfAttendancePackage(eng);
 let paidDays=frozen?Math.min(30,sfNum(frozen.row.attendanceDays)):Math.max(0,30-(unpaid||0));
 // An approved row with no paid days although the engineer worked on site that month is a data error
 // (for example a row added by hand and approved without refreshing from attendance). Do not post a
 // silent zero: use the approved attendance instead and report it for review.
 const zeroSheet=!!frozen&&paidDays<=0&&totalSiteDays>0;
 if(zeroSheet)paidDays=Math.max(0,30-(unpaid||0));
 // The unpaid-day reduction caps the combined project salary at the earned monthly salary.
 const cap=totalSiteDays>0?Math.min(1,paidDays/totalSiteDays):0;
 return {pkg,paidDays,cap,frozen:!!frozen,zeroSheet};
}
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
 // Months before the costing start are never charged, even if the server returns them.
 const rows=(data||[]).filter(r=>String(r.ym)>=SF_ATTENDANCE_COSTING_FROM);
 const unpaid=await sfSalaryUnpaidDays(SF_ATTENDANCE_COSTING_FROM+'-01');
 // Salary can never exceed the standard days per engineer/month, even in 31-day months or with several projects.
 const totalDays=new Map();
 for(const r of rows){const k=r.u_id+'|'+r.ym;totalDays.set(k,(totalDays.get(k)||0)+Number(r.day_count))}
 const byProject=new Map(),missing=new Set(),zeroDays=new Set(),projectIds=new Set(projects.map(p=>String(p.id))),unmatched=new Set();
 for(const r of rows){
  const pid=String(r.proj_id);
  if(!projectIds.has(pid)){unmatched.add(pid);continue}
  const eid='attendance_'+r.u_id;
  const eng=sfEngineers.find(e=>e.id===eid)||sfAttendanceSupplemental.get(eid)||{};
  const name=eng.name||String(r.u_id).slice(0,8);
  const {frozen,pkg,cap,zeroSheet}=sfProjectSalaryBasis(eid,r.ym,eng,unpaid.get(r.u_id+'|'+r.ym),totalDays.get(r.u_id+'|'+r.ym));if(pkg<=0)missing.add(name);if(zeroSheet)zeroDays.add(name+' · '+r.ym);
  const days=Number(r.day_count);
  const list=byProject.get(pid)||[];
  const add=(kind,label,amount)=>{
   amount=sfRound2(amount);if(!(amount>0))return;
   list.push({id:'att_'+r.ym+'_'+kind+'_'+r.u_id,source:'payroll',sourceId:'attendance:'+r.u_id+':'+r.ym+':'+pid+':'+kind,category:'Payroll',description:label,amount,date:r.ym+'-01'});
  };
  add('salary','Salary · '+name+' · '+r.ym+' · '+days+(days===1?' day':' days')+(frozen?' · approved payroll':''),pkg*(days*cap)/SF_ATTENDANCE_STANDARD_DAYS);
  add('allowance','Site allowance · '+name+' · '+r.ym+' · '+days+(days===1?' day':' days'),Number(r.allowance_sum));
  add('overtime','Overtime · '+name+' · '+r.ym+' · '+Number(r.ot_hours)+' h',Number(r.ot_amount));
  byProject.set(pid,list);
 }
 return {byProject,missingSalary:[...missing],unmatchedProjects:[...unmatched],zeroPaidDays:[...zeroDays]};
}

// While a sync runs, opening a project must not start a second full sync (it used to run twice per click).
let sfSyncDailyDepth=0;
async function sfSyncDailyModule(silent=false){
 if(sfSyncDailyDepth>0){if(!silent)alert('المزامنة جارية بالفعل، انتظر اكتمالها. / Sync is already running.');return false;}
 sfSyncDailyDepth++;
 const syncButtons=[...document.querySelectorAll('[data-unified-sync]')],syncDisabled=syncButtons.map(b=>b.disabled);
 syncButtons.forEach(b=>b.disabled=true);
 try{
 if(!sfHasAccess('payroll')){alert('هذه العملية للإدارة فقط');return;}
 try{
  const {data:member,error:memberError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
  if(memberError)throw memberError;if(member?.role!=='admin')throw Error('يجب تفعيل صلاحية إدارة الحضور لهذا الحساب');
  if(projects.length){const {error}=await sfDb.from('sf_daily_projects').upsert(projects.map(p=>({id:String(p.id),name:p.name||String(p.id)})));if(error)throw error;}
  // The attendance screen, if open, reloads its project list in place (no page refresh needed).
  let projectListWarning='';
  try{const f=document.getElementById('sf-unified-frame');if(f?.contentWindow?.sfReloadAttendanceProjects)await f.contentWindow.sfReloadAttendanceProjects()}
  catch(e){projectListWarning='تمت مزامنة أسماء المشاريع، لكن تعذر تحديث القائمة المعروضة. أعد الضغط على Sync. '+(e?.message||'');}
  if(projectListWarning&&silent&&typeof setCloudStatus==='function')setCloudStatus('error',projectListWarning);

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
   if(projectListWarning)notes.push(projectListWarning);
   if(costWarning)notes.push('تنبيه: لم تُحدَّث تكلفة الحضور — '+costWarning);
   else if(SF_ATTENDANCE_COSTING_FROM){
    if(costs.missingSalary.length)notes.push('مهندسون بلا راتب مسجل (احتُسب راتبهم صفرًا): '+costs.missingSalary.join('، '));
    if(costs.zeroPaidDays?.length)notes.push('كشف رواتب معتمد بأيام استحقاق صفر رغم وجود أيام موقع؛ احتُسبت التكلفة من الحضور المعتمد، راجع الكشف: '+costs.zeroPaidDays.join('، '));
    if(costs.unmatchedProjects.length)notes.push('مشاريع في الحضور غير موجودة في المشاريع الحالية: '+costs.unmatchedProjects.join('، '));
   }
   alert((projectListWarning?'تم ترحيل المصروفات المعتمدة مع تنبيه بشأن تحديث قائمة المشاريع':'تم تحديث قائمة المشاريع وترحيل المصروفات المعتمدة')+(SF_ATTENDANCE_COSTING_FROM?'، وتكلفة الحضور المعتمد (الراتب والبدلات والأوفر تايم) بدءًا من شهر '+SF_ATTENDANCE_COSTING_FROM:'')+' دون تكرار. المصروفات العامة بلا مشروع لا تدخل تكلفة أي مشروع.'+(notes.length?'\n\n'+notes.join('\n'):''));
  }
  return true;
 }catch(e){if(!silent)alert('لم تكتمل المزامنة: '+e.message);else if(typeof setCloudStatus==='function')setCloudStatus('error','Expense sync failed: '+e.message);return false;}
}finally{sfSyncDailyDepth--;syncButtons.forEach((b,i)=>b.disabled=syncDisabled[i])} }

// Payroll sheets of months covered by attendance costing keep their own record but no longer post a lump sum.
const sfPayrollPostBase=payrollPostProjectExpense;
payrollPostProjectExpense=function(sheet){
 if(!sfAttendanceCostingCovers(sheet))return sfPayrollPostBase(sheet);
 let touched=false;
 projects.forEach(p=>{if(Array.isArray(p.actualExpenses)&&p.actualExpenses.some(e=>e.sourceId===sheet.id)){p.actualExpenses=p.actualExpenses.filter(e=>e.sourceId!==sheet.id);p.updatedAt=new Date().toISOString();touched=true}});
 if(touched)return saveProjects();
};

// Attendance owns identities. The main workspace keeps supplemental cost data.
let sfAttendanceRoster = [], sfAttendanceRosterReady = false;
let sfAttendanceSupplemental = new Map(sfEngineers.filter(e=>String(e.id).startsWith('attendance_')).map(e=>[e.id,e]));
let sfAttendanceRosterUser = '', sfAttendanceFetch = null, sfAttendanceFetchUser = '', sfAttendanceRosterAt = 0;
// The roster is reused for a minute; callers that know it changed (or are about to save) pass force=true.
const SF_ROSTER_FRESH_MS = 60000;
function sfProjectAttendanceEngineers(saved, roster) {
 const details=new Map(saved.map(e=>[e.id,e]));
 return roster.map(e=>({nationality:'',iqama:'',profession:'',specialization:'Other',loa:'Non-LOA',employment:'Company Employee',status:'available',daily:0,monthly:0,overtime:0,housingTransport:0,siteAllowance:0,carAllowance:0,notes:'',...details.get(e.id),id:e.id,name:e.name,employeeNo:e.employee_no})).map(e=>({...e,daily:sfRound2(sfAttendancePackage(e)/30)}));
}
function sfApplyAttendanceRoster(){
 for(const e of sfEngineers)if(String(e.id).startsWith('attendance_'))sfAttendanceSupplemental.set(e.id,e);
 sfEngineers=sfProjectAttendanceEngineers([...sfAttendanceSupplemental.values()],sfAttendanceRosterReady?sfAttendanceRoster:[]);
}
function sfAttendanceRosterStatus(text){
 const el=document.getElementById('sf-attendance-roster-status');if(el)el.textContent=text;
}
async function sfRefreshAttendanceRoster(force=false){
 if(!sfCurrentUser||!sfAuthReady||!sfDb||!sfHasAccess('engineers'))return;
 const user=sfCurrentUser.id;
 if(!force&&sfAttendanceRosterReady&&sfAttendanceRosterUser===user&&Date.now()-sfAttendanceRosterAt<SF_ROSTER_FRESH_MS)return;
 if(sfAttendanceFetch&&sfAttendanceFetchUser===user)return sfAttendanceFetch;
 sfAttendanceFetchUser=user;
 const task=(async()=>{
  sfAttendanceRosterStatus('جاري تحميل مهندسي الحضور… / Loading attendance engineers…');
  try{
   const {data,error}=await sfDb.rpc('sf_get_attendance_engineers');if(error)throw error;
   if(sfCurrentUser?.id!==user||!sfAuthReady)return;
   sfAttendanceRoster=data||[];sfAttendanceRosterReady=true;sfAttendanceRosterUser=user;sfAttendanceRosterAt=Date.now();
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
 if(sfSyncDailyDepth>0)return; // a sync is already running and covers this
 if(sfExpenseAutoSync){sfExpenseSyncAgain=true;return sfExpenseAutoSync}
 sfExpenseAutoSync=(async()=>{try{do{sfExpenseSyncAgain=false;await sfSyncDailyModule(true)}while(sfExpenseSyncAgain)}finally{sfExpenseAutoSync=null}})();
 return sfExpenseAutoSync;
}
const sfExpenseOpenProjectBase=openProjectDetails;
openProjectDetails=function(id){sfExpenseOpenProjectBase(id);void sfAutoSyncProjectExpenses()};
const sfExpensePanelBase=setProjectDetailsPanel;
setProjectDetailsPanel=function(panel){sfExpensePanelBase(panel);if(panel==='expenses')void sfAutoSyncProjectExpenses()};

// ── Payroll ← approved attendance ───────────────────────────────────────────
// Fills Attendance Days, OT hours and (only when the engineer has no fixed site allowance in his file) the site
// allowance from approved attendance. Every field stays editable. The paid-days rule is chosen on the sheet,
// so the company can decide its policy later without code changes. Automatic fills never overwrite a value
// typed by hand: rows filled before and then edited, and older sheets typed manually, are left as they are.
const SF_PAYROLL_RULES={month_minus_absence:'الشهر كامل ناقص الغياب / Full month minus absence',recorded:'الأيام المسجلة المعتمدة / Approved recorded days',recorded_fridays:'المسجلة + الجمع غير المسجلة / Recorded + unrecorded Fridays'};
const SF_PAYROLL_LEAVES={annual:'سنوية / Annual',sick:'مرضية / Sick',emergency:'طارئة / Emergency'};
const SF_PAYROLL_DEFAULT_RULE={mode:'month_minus_absence',paidLeave:['annual','sick','emergency']};
const SF_PAYROLL_AUTO_FIELDS=['attendanceDays','overtimeHours','siteAllowance'];
let sfPayrollFillBusy=false,sfPayrollFillAgain=false;
function sfRiyadhToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function sfMonthDays(month){const [y,m]=month.split('-').map(Number),n=new Date(Date.UTC(y,m,0)).getUTCDate();return Array.from({length:n},(_,i)=>month+'-'+String(i+1).padStart(2,'0'))}
function sfPayrollAttendanceSummary(records,month,rule,standardDays,today){
 const S=Math.max(1,Math.min(31,Number(standardDays)||30)),paid=new Set(rule?.paidLeave||[]),mode=rule?.mode||'month_minus_absence';
 const elapsed=sfMonthDays(month).filter(d=>d<=today),byUser=new Map(),out=new Map();
 for(const r of records){if(!String(r.day).startsWith(month))continue;if(!byUser.has(r.user_id))byUser.set(r.user_id,[]);byUser.get(r.user_id).push(r)}
 for(const [uid,rows] of byUser){
  const s={worked:0,paidLeave:0,unpaidLeave:0,absent:0,pending:0,rejected:0,inside:0,outside:0,unrecorded:0,unrecordedFridays:0,otHours:0,otAmount:0,allowance:0,days:0,mode};
  const recorded=new Set(rows.map(r=>r.day));
  for(const r of rows){
   if(r.review!=='approved'){if(r.review==='rejected')s.rejected++;else s.pending++;continue}
   if(r.status==='inside')s.inside++;if(r.status==='outside')s.outside++;
   if(['office','inside','outside'].includes(r.status))s.worked++;
   else if(r.status==='leave'){if(paid.has(r.leave_type))s.paidLeave++;else s.unpaidLeave++}
   else if(r.status==='absent')s.absent++;
   s.otHours+=Number(r.overtime)||0;s.otAmount+=Number(r.overtime_amount)||0;s.allowance+=Number(r.allowance)||0;
  }
  for(const d of elapsed)if(!recorded.has(d)){s.unrecorded++;if(new Date(d+'T12:00:00Z').getUTCDay()===5)s.unrecordedFridays++}
  const days=mode==='recorded'?s.worked+s.paidLeave:mode==='recorded_fridays'?s.worked+s.paidLeave+s.unrecordedFridays:S-s.absent-s.unpaidLeave;
  s.days=Math.max(0,Math.min(S,days));s.otHours=sfRound2(s.otHours);s.otAmount=sfRound2(s.otAmount);s.allowance=sfRound2(s.allowance);
  out.set(uid,s);
 }
 return out;
}
function sfPayrollRule(){
 return {mode:'month_minus_absence',paidLeave:['annual','sick','emergency']};
}
// A row counts as hand-edited if it differs from its last fill, or (never filled) already holds typed values.
function sfPayrollRowEdited(r){return r.attFill?SF_PAYROLL_AUTO_FIELDS.some(f=>sfNum(r[f])!==sfNum(r.attFill[f])):(sfNum(r.attendanceDays)>0||sfNum(r.overtimeHours)>0)}
function sfPayrollStatus(text){const el=document.getElementById('sf-payroll-att-status');if(el)el.textContent=text}
async function sfPayrollFillFromAttendance({auto=false}={}){
 if(sfPayrollFillBusy){sfPayrollFillAgain=true;return}
 if(!sfCurrentPayroll||!sfDb||!sfCurrentUser||!sfHasAccess('payroll'))return;
 const sheet=sfCurrentPayroll,month=sheet.month;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))return;
 if(sheet.status==='approved'){sfPayrollStatus('هذا الكشف معتمد ومحفوظ بقيمه. أنشئ كشفًا جديدًا للمراجعة.');return}
 sfPayrollFillBusy=true;sfPayrollStatus('جاري حساب الراتب من ملف المهندس والحضور المعتمد…');
 try{
  const {data:member,error:memberError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
  if(memberError)throw memberError;if(member?.role!=='admin')throw Error('يلزم حساب إدارة الحضور');
  await sfRefreshAttendanceRoster(true);if(!sfAttendanceRosterReady)throw Error('تعذر تحميل بيانات رواتب المهندسين');
  const [y,m]=month.split('-').map(Number),end=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}-01`;
  const records=[];
  for(let o=0;;o+=1000){const {data,error}=await sfDb.from('sf_daily_records').select('user_id,day,status,leave_type,overtime,overtime_amount,allowance,review').gte('day',month+'-01').lt('day',end).order('day').order('id').range(o,o+999);if(error)throw error;records.push(...data);if(data.length<1000)break}
  if(sfCurrentPayroll!==sheet||sheet.month!==month)return;
  const today=sfRiyadhToday();if(month>today.slice(0,7))throw Error('لا يمكن حساب راتب شهر مستقبلي');
  const summary=sfPayrollAttendanceSummary(records,month,sfPayrollRule(),30,today);
  const have=new Set(sheet.rows.map(r=>r.engineerId));
  if(!sheet.projectId)for(const eng of sfEngineers)if(!have.has(eng.id)){sheet.rows.push(payrollRowFromEngineer(eng));have.add(eng.id)}
  let filled=0;
  const nextRows=sheet.rows.map(r=>({...r}));
  for(const r of nextRows){
   if(!String(r.engineerId||'').startsWith('attendance_'))continue;
   const uid=r.engineerId.slice(11),eng=sfEngineers.find(e=>e.id===r.engineerId)||sfAttendanceSupplemental.get(r.engineerId);
   if(!eng)throw Error('بيانات راتب مهندس غير متاحة: '+r.name);
   // No entries does not mean absence. Mark it explicitly for month-end review.
   const v=summary.get(uid)||{worked:0,paidLeave:0,unpaidLeave:0,absent:0,pending:0,rejected:0,inside:0,outside:0,unrecorded:sfMonthDays(month).filter(d=>d<=today).length,unrecordedFridays:0,otHours:0,otAmount:0,allowance:0,days:30,noData:true};
   Object.assign(r,{salaryModel:2,baseSalary:sfNum(eng.monthly),housingTransport:sfNum(eng.housingTransport),carAllowance:sfNum(eng.carAllowance??eng.siteCar),attendanceDays:v.days,siteAllowance:v.allowance,overtimeHours:v.otHours,attendanceOvertimeAmount:v.otAmount,overtimeRate:v.otHours?v.otAmount/v.otHours:sfNum(eng.overtime),attSummary:{...v},attFill:{attendanceDays:v.days,overtimeHours:v.otHours,siteAllowance:v.allowance,at:new Date().toISOString()}});
   filled++;
  }
  sheet.rows=nextRows;sheet.standardDays=30;sheet.salaryModel=2;sheet.attendanceRule=sfPayrollRule();sheet.attendanceLoadedMonth=month;sheet.updatedAt=new Date().toISOString();
  payrollRenderRows();sfPayrollStatus(`تم حساب ${filled} مهندس — راجع الغياب والأيام غير المسجلة ثم احفظ الشهر. أسعار الإضافي المختلفة تُجمع بقيمها المعتمدة.`);return true;
 }catch(error){sfPayrollStatus('تعذر حساب الرواتب: '+error.message);return false}
 finally{sfPayrollFillBusy=false;if(sfPayrollFillAgain){sfPayrollFillAgain=false;setTimeout(()=>void sfPayrollFillFromAttendance(),0)}}
}
function sfPayrollNoteHtml(r){
 const s=r.attSummary;if(!s)return '';
 if(s.noData)return '<span class="warn">لا يوجد حضور مسجل: الراتب الثابت محسوب كاملًا مبدئيًا. راجع الغياب قبل الاعتماد.</span>';
 // Paid days are already in the field above; the breakdown shows only what is non-zero, as small chips.
 const parts=[[s.inside,'داخل الرياض'],[s.outside,'خارج الرياض'],[s.paidLeave,'إجازة مدفوعة'],[s.unpaidLeave,'إجازة غير مدفوعة'],[s.absent,'غياب']].filter(([n])=>n>0).map(([n,l])=>`<span class="sf-chip">${escHtml(l)} ${n}</span>`); let html=parts.length?`<span class="sf-chips">${parts.join('')}</span>`:'';
 if(s.pending)html+=`<br><span class="warn" title="بدله وإضافيه غير محسوبين، وخصم الغياب يتطلب الاعتماد / Not counted until approved">${s.pending} يوم بانتظار الاعتماد ⓘ</span>`;
 if(s.rejected)html+=`<br><span class="warn">${s.rejected} يوم مرفوض يحتاج تصحيحًا</span>`;
 if(s.unrecorded)html+=`<br><span class="warn">${s.unrecorded} يوم غير مسجل${s.unrecordedFridays?` (منها ${s.unrecordedFridays} جمعة)`:''}</span>`;
 if(s.fixedAllowance>0&&s.allowance>0)html+=`<br><span class="warn">بدل ثابت في ملفه ${payrollMoney(s.fixedAllowance)} وبدلات يومية معتمدة ${payrollMoney(s.allowance)} — راجع البدل</span>`;
 if(r.salaryModel!==2&&s.otHours>0&&Math.abs(s.otHours*sfNum(r.overtimeRate)-s.otAmount)>0.01)html+=`<br><span class="warn">قيمة الأوفر في الحضور ${payrollMoney(s.otAmount)} تختلف عن سعر الكشف</span>`;
 if(r.salaryModel!==2&&(s.kept||sfPayrollRowEdited(r)))html+=`<br><span class="edited">قيم معدّلة يدويًا</span>`;
 return html;
}
function sfPayrollSyncPanel(){}
function sfPayrollEnsurePanel(){
 if(document.getElementById('sf-payroll-att'))return;
 const anchor=document.querySelector('#tab-payroll .payroll-controls');if(!anchor)return;
 const box=document.createElement('div');box.id='sf-payroll-att';box.className='payroll-note';
 box.innerHTML='<b>حساب الراتب تلقائيًا / Automatic payroll</b> <button class="btn-outline" type="button" id="sf-payroll-fill" style="margin-inline-start:8px">تحديث الحساب من الحضور / Refresh payroll</button><small id="sf-payroll-att-status" dir="rtl" style="display:block;margin-top:8px"></small><details class="payroll-howto" dir="rtl"><summary>كيف يُحسب الراتب؟ / How is payroll calculated?</summary><p>بيانات الراتب تُدخل مرة واحدة في ملف المهندس. الراتب = (الأساسي + السكن والتنقل + السيارة) ÷ 30 × أيام الاستحقاق + بدل الموقع داخل وخارج الرياض + الإضافي المعتمد.</p><p>أيام الاستحقاق = 30 − الغياب المعتمد − الإجازة غير المدفوعة المعتمدة. الإجازات السنوية والمرضية والطارئة مدفوعة، والمكتب والراحة والأيام دون تكليف بالموقع لا تُخصم. الأيام غير المسجلة لا تعتبر غيابًا تلقائيًا؛ راجعها قبل اعتماد الشهر.</p><p>الحقول المحسوبة تُعدّل من ملف المهندس أو سجل الحضور. تكلفة المشروع تُرحّل من أيام الموقع المعتمدة، وباقي تكلفة الراتب تتحملها الشركة.</p></details>';
 anchor.after(box);box.querySelector('#sf-payroll-fill').onclick=()=>void sfPayrollFillFromAttendance();
}
function sfPayrollVisible(){const tab=document.getElementById('tab-payroll');return !!tab&&tab.style.display!=='none'}
// Hook the payroll page only where it exists, so this file never breaks pages without it.
if(typeof payrollRenderRows==='function'&&typeof payrollRender==='function'){
const sfPayrollRenderRowsBase=payrollRenderRows;
payrollRenderRows=function(){
 sfPayrollRenderRowsBase();
 if(!sfHasAccess('payroll'))return;
 sfPayrollEnsurePanel();
 const body=document.getElementById('payroll-table-body');if(!body||!sfCurrentPayroll)return;
 for(const r of sfCurrentPayroll.rows){
  if(r.salaryModel===2)for(const field of ['baseSalary','housingTransport','carAllowance','siteAllowance','attendanceDays','overtimeHours','overtimeRate']){const input=body.querySelector(`input[onchange^="payrollSetRow('${r.id}','${field}'"]`);if(input){input.readOnly=true;input.title='يُحسب من ملف المهندس والحضور / Calculated automatically';}}
  const html=sfPayrollNoteHtml(r);if(!html)continue;
  const input=body.querySelector(`input[onchange^="payrollSetRow('${r.id}','attendanceDays'"]`);if(!input)continue;
  const note=document.createElement('div');note.className='sf-att-note';note.innerHTML=html;input.after(note);
 }
};
const sfPayrollRenderBase=payrollRender;
payrollRender=function(){
 sfPayrollRenderBase();
 // A brand-new, empty sheet on the visible payroll page is filled once automatically.
 if(sfCurrentPayroll&&!sfCurrentPayroll.rows.length&&!sfCurrentPayroll.attAutoTried&&sfPayrollVisible()&&sfHasAccess('payroll')){sfCurrentPayroll.attAutoTried=true;void sfPayrollFillFromAttendance({auto:true})}
};
const sfPayrollNewBase=payrollNewSheet;
payrollNewSheet=function(){sfPayrollNewBase();if(sfCurrentPayroll){sfCurrentPayroll.attAutoTried=true;void sfPayrollFillFromAttendance({auto:true})}};
const sfPayrollMonthBase=payrollMonthChanged;
payrollMonthChanged=function(){
 if(sfCurrentPayroll?.status==='approved'){document.getElementById('payroll-month').value=sfCurrentPayroll.month;sfPayrollStatus('أنشئ كشفًا جديدًا لتغيير الشهر.');return}
 sfPayrollMonthBase();if(sfCurrentPayroll){delete sfCurrentPayroll.attendanceLoadedMonth;void sfPayrollFillFromAttendance({auto:true})}
};
const sfPayrollLoadEngineersBase=payrollLoadProjectEngineers;
payrollLoadProjectEngineers=function(){sfPayrollLoadEngineersBase();void sfPayrollFillFromAttendance({auto:true})};
const sfPayrollSetRowBase=payrollSetRow;
payrollSetRow=function(id,field,value){
 const before=sfCurrentPayroll?.rows.find(x=>x.id===id),wasAuto=field==='engineerId'&&!!before?.attFill&&!sfPayrollRowEdited(before);
 sfPayrollSetRowBase(id,field,value);
 if(field!=='engineerId')return;
 const r=sfCurrentPayroll?.rows.find(x=>x.id===id);
 // Values filled for the previous engineer must not carry over to the newly selected one.
 if(r){if(wasAuto){r.attendanceDays=0;r.overtimeHours=0}delete r.attFill;delete r.attSummary;delete r.salaryModel;delete r.attendanceOvertimeAmount;payrollRenderRows()}
 void sfPayrollFillFromAttendance({auto:true});
};
}

// ── Project → Engineers tab: who actually worked on the project, from approved attendance ─────────
// The existing list shows the engineers planned in the quotation cost plan. This adds the actual crew per month,
// with the same salary formula and monthly cap as the project-cost sync, so its total matches the attendance
// lines in the project's Expenses. Salary columns need payroll access; the whole tab needs engineers access.
let sfProjectCrewRequest=0;
function sfProjectCrewStyle(){
 if(document.getElementById('sf-crew-style'))return;
 const st=document.createElement('style');st.id='sf-crew-style';
 st.textContent='.sf-crew-sub{font-weight:400;font-size:11px;color:var(--gray-500,#6b7a90);font-family:Tajawal,sans-serif;margin-inline-start:6px}'
  +'.sf-crew-tag{display:inline-block;font-size:10.5px;font-family:Tajawal,sans-serif;padding:2px 7px;border-radius:5px;background:#fff4de;color:#96620b;margin:2px 4px 2px 0}'
  +'.sf-crew-tag.muted{background:#eef3f8;color:#516173}.sf-crew-pending{margin:0 0 10px;font-size:12px;font-family:Tajawal,sans-serif;color:#96620b}'
  +'#sf-project-crew tfoot td{font-weight:700;border-top:2px solid var(--gray-200,#e3e8f0)}';
 document.head.appendChild(st);
}
async function sfRenderProjectCrew(){
 const p=projects.find(x=>x.id===sfActiveProjectDetailsId),panel=document.querySelector('#project-details-root .pd-panel.active');
 if(!p||!panel||!sfDb)return;
 sfProjectCrewStyle();
 const plannedHdr=[...panel.querySelectorAll('.pd-card-hdr h3')].find(x=>x.textContent.trim()==='Assigned Engineers');
 if(plannedHdr)plannedHdr.innerHTML='Assigned Engineers <span class="sf-crew-sub">Planned in the quotation cost plan / المخطط في عرض السعر</span>';
 let card=panel.querySelector('#sf-project-crew');
 if(!card){card=document.createElement('div');card.className='pd-card';card.id='sf-project-crew';card.style.marginTop='16px';panel.appendChild(card)}
 const pay=sfHasAccess('payroll'),pid=String(p.id),token=++sfProjectCrewRequest;
 const head='<div class="pd-card-hdr"><h3>Worked on this project <span class="sf-crew-sub">من عمل فعليًا — من الحضور المعتمد</span></h3></div>';
 const body=html=>{card.innerHTML=head+'<div class="pd-card-body">'+html+'</div>'};
 body('<div class="pd-empty">جاري تحميل الحضور… / Loading attendance…</div>');
 try{
  const [cost,members,pending]=await Promise.all([
   sfDb.rpc('sf_get_attendance_cost_rows',{p_from:'2000-01-01'}),
   sfDb.from('sf_daily_members').select('user_id,name,engineer_id'),
   sfDb.from('sf_daily_records').select('user_id,project_id,review').eq('project_id',pid).eq('review','pending').range(0,4999)]);
  if(token!==sfProjectCrewRequest||String(sfActiveProjectDetailsId)!==pid)return;
  if(cost.error){
   const text=String(cost.error.message||'');
   if(cost.error.code==='PGRST202'||/sf_get_attendance_cost_rows/.test(text))throw Error('شغّل ملف 08-attendance-project-costs-v9.sql في Supabase لعرض الحضور على المشروع.');
   if(cost.error.code==='42501'||/admin/i.test(text))throw Error('يلزم حساب إدارة الحضور لعرض من عمل على المشروع.');
   throw cost.error;
  }
  const unpaid=await sfSalaryUnpaidDays('2000-01-01');
  if(token!==sfProjectCrewRequest||String(sfActiveProjectDetailsId)!==pid)return;
  const rows=cost.data||[],totalDays=new Map();
  for(const r of rows){const k=r.u_id+'|'+r.ym;totalDays.set(k,(totalDays.get(k)||0)+Number(r.day_count))}
  const names=new Map((members.data||[]).map(m=>[m.user_id,m.name]));
  const nameOf=uid=>{const e=sfEngineers.find(x=>x.id==='attendance_'+uid)||sfAttendanceSupplemental.get('attendance_'+uid);return e?.name||names.get(uid)||String(uid).slice(0,8)};
  const planned=new Set((p.assignedEngineers||[]).map(a=>a.engineerId).filter(Boolean));
  const lines=rows.filter(r=>String(r.proj_id)===pid).map(r=>{
   const eid='attendance_'+r.u_id,eng=sfEngineers.find(e=>e.id===eid)||sfAttendanceSupplemental.get(eid)||{};
   const days=Number(r.day_count),costed=!!SF_ATTENDANCE_COSTING_FROM&&r.ym>=SF_ATTENDANCE_COSTING_FROM;
   const {pkg,cap}=sfProjectSalaryBasis(eid,r.ym,eng,unpaid.get(r.u_id+'|'+r.ym),totalDays.get(r.u_id+'|'+r.ym));
   const salary=costed&&pkg>0?sfRound2(pkg*(days*cap)/SF_ATTENDANCE_STANDARD_DAYS):null,allowance=sfRound2(r.allowance_sum),ot=sfRound2(r.ot_amount);
   return{uid:r.u_id,name:nameOf(r.u_id),ym:r.ym,days,allowance,otHours:Number(r.ot_hours)||0,ot,salary,pkg,costed,capped:cap<1,
    total:costed?sfRound2((salary||0)+allowance+ot):null,offPlan:planned.size>0&&!planned.has(eid)};
  }).sort((a,b)=>b.ym.localeCompare(a.ym)||a.name.localeCompare(b.name));
  const waiting=new Map();for(const r of pending.data||[])if(r.review==='pending'&&String(r.project_id)===pid)waiting.set(r.user_id,(waiting.get(r.user_id)||0)+1);
  const pendingNote=waiting.size?`<p class="sf-crew-pending" dir="rtl">بانتظار الاعتماد ولم تُحسب بعد: ${[...waiting].map(([u,n])=>'<bdi>'+escHtml(nameOf(u))+'</bdi> '+n+' يوم').join('، ')}</p>`:'';
  if(!lines.length){body(pendingNote+'<div class="pd-empty" dir="auto">لا توجد أيام حضور معتمدة على هذا المشروع. / No approved attendance on this project yet.</div>');return}
  const sum=f=>sfRound2(lines.reduce((s,l)=>s+(f(l)||0),0)),tag=(t,muted)=>`<span class="sf-crew-tag${muted?' muted':''}">${escHtml(t)}</span>`;
  const tr=lines.map(l=>{
   const notes=[l.offPlan?tag('خارج خطة عرض السعر'):'',pay&&l.costed&&!(l.pkg>0)?tag('لا يوجد راتب مسجل'):'',pay&&!l.costed?tag('قبل بدء ترحيل الحضور — لا يُحمّل',true):'',pay&&l.capped?tag('سقف الشهر: عمل على أكثر من مشروع',true):''].join('');
   return `<tr><td>${escHtml(l.name)}</td><td>${escHtml(l.ym)}</td><td>${l.days}</td><td>${fmtSAR(l.allowance)}</td><td>${l.otHours} h · ${fmtSAR(l.ot)}</td>`
    +(pay?`<td>${l.salary===null?'—':fmtSAR(l.salary)}</td><td><strong>${l.total===null?'—':fmtSAR(l.total)}</strong></td>`:'')+`<td>${notes||'—'}</td></tr>`;
  }).join('');
  const foot=`<tr><td colspan="2">Total / الإجمالي</td><td>${sum(l=>l.days)}</td><td>${fmtSAR(sum(l=>l.allowance))}</td><td>${sfRound2(lines.reduce((s,l)=>s+l.otHours,0))} h · ${fmtSAR(sum(l=>l.ot))}</td>`
   +(pay?`<td>${fmtSAR(sum(l=>l.salary))}</td><td>${fmtSAR(sum(l=>l.total))}</td>`:'')+'<td></td></tr>';
  body(pendingNote+`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Engineer</th><th>Month</th><th>Site days</th><th>Allowance</th><th>Overtime</th>${pay?'<th>Salary share</th><th>Total cost</th>':''}<th>Notes</th></tr></thead><tbody>${tr}</tbody><tfoot>${foot}</tfoot></table></div>`
   +(pay?'<p dir="rtl" style="font-size:11px;color:var(--gray-500,#6b7a90);margin-top:8px;font-family:Tajawal,sans-serif">إجمالي الأشهر المرحّلة يطابق أسطر الحضور في تبويب Expenses بعد المزامنة.</p>':''));
 }catch(error){if(token===sfProjectCrewRequest)body(`<div class="pd-empty">${escHtml(error.message||String(error))}</div>`)}
}
// Hook only where the project page exists, so this file never breaks pages without it.
if(typeof renderProjectDetails==='function'){
 const sfProjectCrewRenderBase=renderProjectDetails;
 renderProjectDetails=function(){sfProjectCrewRenderBase();if(sfProjectDetailsPanel==='engineers'&&sfHasAccess('engineers'))void sfRenderProjectCrew()};
}

// Saving a draft always refreshes the six salary inputs and approved attendance first.
const sfSimplePayrollSaveBase=payrollSaveSheet;
payrollSaveSheet=async function(){
 if(sfPayrollFillBusy){sfPayrollStatus('انتظر اكتمال الحساب قبل الحفظ.');return}
 if(!sfCurrentPayroll)return;
 if(sfCurrentPayroll.status==='approved'){sfPayrollStatus('الكشف معتمد. أنشئ كشفًا جديدًا لأي مراجعة.');return}
 const sheet=sfCurrentPayroll;
 if(!(await sfPayrollFillFromAttendance())||sfCurrentPayroll!==sheet)return;
 return await sfSimplePayrollSaveBase();
};
// Why approval stopped, shown beside the Approve button (the status line is at the top of the page, out of view).
function sfPayrollApproveNotice(text){
 let el=document.getElementById('sf-payroll-approve-msg');
 if(!el&&text){const anchor=document.querySelector('#tab-payroll button[onclick^="payrollApproveCurrent"]')?.parentElement;if(!anchor)return;el=document.createElement('p');el.id='sf-payroll-approve-msg';el.className='payroll-approve-msg';el.setAttribute('role','alert');el.dir='rtl';anchor.after(el)}
 if(el){el.textContent=text||'';el.hidden=!text}
}
payrollApproveCurrent=async function(){
 if(!sfCurrentPayroll||sfCurrentPayroll.status==='approved')return;
 if(sfPayrollFillBusy){sfPayrollApproveNotice('انتظر اكتمال الحساب ثم اضغط اعتماد مرة أخرى. / Please wait for the calculation to finish.');return}
 const sheet=sfCurrentPayroll;sfPayrollApproveNotice('');
 if(!(await sfPayrollFillFromAttendance())){sfPayrollApproveNotice(document.getElementById('sf-payroll-att-status')?.textContent||'تعذر حساب الرواتب.');return}
 if(sfCurrentPayroll!==sheet)return;
 const held=sheet.rows.filter(r=>(r.attSummary?.pending||0)+(r.attSummary?.rejected||0)>0);
 if(held.length){
  const who=held.map(r=>{const s=r.attSummary;return `${r.name} (${[s.pending?s.pending+' يوم معلق':'',s.rejected?s.rejected+' يوم مرفوض':''].filter(Boolean).join('، ')})`}).join('، ');
  const text=`لا يمكن الاعتماد بعد: يوجد حضور لم يُراجع — ${who}. اعتمد هذه الأيام أو صحّحها من صفحة الحضور، ثم اضغط اعتماد مرة أخرى. / Cannot approve yet: review the pending or rejected attendance first.`;
  sfPayrollStatus(text);sfPayrollApproveNotice(text);return;
 }
 if(sheet.month===sfRiyadhToday().slice(0,7)||sheet.rows.some(r=>r.attSummary?.unrecorded)){
  if(!confirm('تأكيد مراجعة الشهر: الأيام غير المسجلة والأيام المتبقية لا تخصم تلقائيًا، وتُحسب ضمن الراتب الثابت. هل راجعت الغياب والإجازات قبل الاعتماد؟'))return;
 }
 if(!sheet.rows.length||!sfValidatePayrollUnique(sheet))return;
 sheet.status='approved';return await sfSimplePayrollSaveBase();
};

async function sfSyncDailyModule(){
 if(!sfHasAccess('payroll')){alert('هذه العملية للإدارة فقط');return;}
 try{
  const {data:member,error:memberError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
  if(memberError)throw memberError;if(member?.role!=='admin')throw Error('يجب تفعيل صلاحية إدارة الحضور لهذا الحساب');
  if(projects.length){const {error}=await sfDb.from('sf_daily_projects').upsert(projects.map(p=>({id:String(p.id),name:p.name||String(p.id)})));if(error)throw error;}
  let expenses=[];
  for(let offset=0;;offset+=500){const {data,error}=await sfDb.from('sf_daily_expenses').select('*').eq('review','approved').order('id').range(offset,offset+499);if(error)throw error;expenses.push(...data);if(data.length<500)break;}
  projects.forEach(p=>{p.actualExpenses=(p.actualExpenses||[]).filter(e=>e.source!=='daily_expense');expenses.filter(e=>String(e.project_id)===String(p.id)).forEach(e=>p.actualExpenses.push({id:'daily_'+e.id,source:'daily_expense',sourceId:e.id,category:e.category,description:e.description,amount:Number(e.amount),date:e.day}));});
  saveProjects();alert('تم تحديث قائمة المشاريع وترحيل المصروفات المعتمدة دون تكرار. البدلات اليومية والأوفر تايم تظهر في تقرير الحضور؛ تُنقل للرواتب مرة واحدة بعد المراجعة، ولا تُرحّل هنا لتجنب تكرارها مع الرواتب. المصروفات العامة تظهر في تقرير الحضور فقط.');
 }catch(e){alert('لم تكتمل المزامنة: '+e.message)}
}

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

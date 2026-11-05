'use strict';
// Leave page (طلبات الإجازة): the company's paper leave form, online. An engineer fills the request; the direct
// supervisor (project leader or administrator), HR and the executive manager (administrator) approve in turn; approved
// days go to attendance by the database (supabase/attendance/29-leave-requests.sql). After the leave, the actual dates
// are sent by the engineer or entered by HR. Every role uses this one page; the database decides what each may do.
let sfLeaveMe=null,sfLeaveChecked=false,sfLeaveRows=[],sfLeavePeople=[],sfLeaveTab='',sfLeaveLoading=false,sfLeaveSearch='',sfLeaveOpenId='';
let sfLeaveWanted=location.hash.slice(1)==='leave'||(!location.hash&&localStorage.getItem('sfLastModule')==='leave');
const sfLeaveBaseShow=showTab,sfLeaveBaseAllowed=sfUnifiedAllowed,sfLeaveBaseUnlock=sfUnlockApp,sfLeaveBaseLock=sfLockApp,sfLeaveBaseLanguage=sfSetInterfaceLanguage;

const sfLeaveAr=()=>sfUiLanguage==='ar';
const sfLeaveT=(en,ar)=>sfLeaveAr()?ar:en;
const sfLeaveEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sfLeaveDate=d=>{if(!d)return '—';const [y,m,x]=String(d).slice(0,10).split('-');return `${x}/${m}/${y}`};
const sfLeaveIso=t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
const sfLeaveAdd=(d,n)=>{const t=new Date(String(d).slice(0,10)+'T00:00:00');t.setDate(t.getDate()+n);return sfLeaveIso(t)};
const sfLeaveToday=()=>sfLeaveMe?.today||sfLeaveIso(new Date());
const sfLeaveOffice=()=>!!(sfLeaveMe?.admin||sfLeaveMe?.hr);
const SF_LEAVE_TYPES={annual:['Annual','سنوية'],sick:['Sick','مرضية'],emergency:['Emergency','طارئة'],unpaid:['Unpaid','بدون راتب']};
const sfLeaveType=t=>sfLeaveT(...(SF_LEAVE_TYPES[t]||[t,t]));
const SF_LEAVE_ACTIONS={submitted:['Request sent','إرسال الطلب'],supervisor_approved:['Approved by the direct supervisor','موافقة الرئيس المباشر'],hr_approved:['Approved by HR','موافقة الموارد البشرية'],
 approved:['Approved by the executive manager','اعتماد المدير التنفيذي'],approved_all:['Approved at all stages by the administrator','اعتماد كل المراحل من الأدمن'],rejected:['Rejected','رفض'],cancelled:['Cancelled','إلغاء'],
 actual_submitted:['Actual dates sent by the engineer','إرسال التواريخ الفعلية من المهندس'],actual_confirmed:['Actual dates confirmed by HR','تأكيد التواريخ الفعلية من الموارد البشرية']};

// Days counted like the database (sf_leave_private.span): Fridays and official holidays at the start or end are left out.
const sfLeaveOff=d=>new Date(d+'T00:00:00').getDay()===5||(sfLeaveMe?.holidays||[]).some(h=>h.day===d);
function sfLeaveSpan(from,to){
  if(!from||!to||to<from)return {days:0,first:'',last:'',dropped:[]};
  let first=from,last=to;const dropped=[];
  while(first<=last&&sfLeaveOff(first)){dropped.push(first);first=sfLeaveAdd(first,1)}
  while(last>=first&&sfLeaveOff(last)){dropped.push(last);last=sfLeaveAdd(last,-1)}
  const days=first<=last?Math.round((new Date(last+'T00:00:00')-new Date(first+'T00:00:00'))/86400000)+1:0;
  return {days,first:days?first:'',last:days?last:'',dropped};
}
// Back at work: the first day after the leave that is not a Friday or an official holiday.
function sfLeaveReturn(last){if(!last)return '';let d=sfLeaveAdd(last,1);while(sfLeaveOff(d))d=sfLeaveAdd(d,1);return d}
const sfLeaveDays=n=>sfLeaveT(`${n} day${n===1?'':'s'}`,`${n} يوم`);

function sfLeaveState(r){
  const t=sfLeaveToday();
  if(r.status==='supervisor')return ['wait',sfLeaveT('Waiting for the direct supervisor','بانتظار الرئيس المباشر')];
  if(r.status==='hr')return ['wait',sfLeaveT('Waiting for HR','بانتظار الموارد البشرية')];
  if(r.status==='executive')return ['wait',sfLeaveT('Waiting for the executive manager','بانتظار المدير التنفيذي')];
  if(r.status==='rejected')return ['no',sfLeaveT('Rejected','مرفوض')];
  if(r.status==='cancelled')return ['off',sfLeaveT('Cancelled','ملغي')];
  if(r.actual_state==='confirmed')return ['done',sfLeaveT('Finished','منتهية')];
  if(r.actual_state==='submitted')return ['wait',sfLeaveT('Actual dates waiting for HR','التواريخ الفعلية بانتظار الموارد البشرية')];
  if(r.approved_end&&r.approved_end<t)return ['late',sfLeaveT('Return not recorded','لم يُسجَّل الرجوع')];
  if(r.approved_start&&r.approved_start<=t)return ['on',sfLeaveT('On leave','في إجازة')];
  return ['ok',sfLeaveT('Approved','معتمد')];
}
const sfLeaveChip=r=>{const [k,t]=sfLeaveState(r);return `<span class="lv-chip lv-${k}">${sfLeaveEsc(t)}</span>`};
// Waiting for the signed-in person: a decision at their stage, actual dates to confirm, or a return not recorded.
const sfLeaveMine=r=>r.can.supervise||r.can.hr||r.can.execute||(r.can.set_actual&&(r.actual_state==='submitted'||(!r.actual_state&&r.approved_end<sfLeaveToday())));

const SF_LEAVE_ERRORS={ACCESS_DENIED:['You do not have permission for this step.','ليس لديك صلاحية لهذه الخطوة.'],LEAVE_CHANGED:['Someone else changed this request. It has been reloaded; check it and try again.','غيّر شخص آخر هذا الطلب. تم تحديثه؛ راجعه وحاول مرة أخرى.'],
 LEAVE_NOT_FOUND:['This request is no longer available.','هذا الطلب لم يعد متاحًا.'],LEAVE_STAGE_INVALID:['This step does not apply to the request now. Reload the page.','هذه الخطوة لا تنطبق على الطلب الآن. حدّث الصفحة.'],LEAVE_TYPE_REQUIRED:['Choose the type of leave.','اختر نوع الإجازة.'],LEAVE_DATES_INVALID:['Check the dates: the end comes after the start, at most 90 days.','راجع التواريخ: النهاية بعد البداية، وبحد أقصى 90 يومًا.'],
 LEAVE_DATES_RANGE:['Leave can start from 60 days ago up to 6 months ahead.','يمكن أن تبدأ الإجازة من 60 يومًا مضت حتى 6 أشهر قادمة.'],NO_LEAVE_DAYS:['These dates have no leave days (only Fridays or official holidays).','هذه التواريخ ليس فيها أيام إجازة (جمعة أو إجازات رسمية فقط).'],
 UNDERTAKING_REQUIRED:['Tick the undertaking to return to work on time.','علّم على التعهد بالعودة للعمل في موعدها.'],SICK_REPORT_REQUIRED:['Attach the medical report for sick leave.','أرفق التقرير الطبي للإجازة المرضية.'],
 ATTACHMENT_INVALID:['The attached file could not be used. Attach it again.','تعذر استخدام الملف المرفق. أرفقه مرة أخرى.'],LEAVE_REASON_REQUIRED:['Write the reason for the leave.','اكتب سبب الإجازة.'],
 LEAVE_OVERLAP:['There is already a leave request for some of these days.','يوجد طلب إجازة بالفعل لبعض هذه الأيام.'],REJECT_REASON_REQUIRED:['Write the reason for rejecting.','اكتب سبب الرفض.'],
 LEAVE_DAYS_TAKEN:['These days already have attendance recorded; remove it first:','هذه الأيام مسجّل فيها حضور بالفعل؛ احذفه أولًا:'],LEAVE_CANNOT_CANCEL:['This request can no longer be cancelled.','لم يعد ممكنًا إلغاء هذا الطلب.'],
 LEAVE_NOT_APPROVED:['Actual dates are recorded after the leave is approved.','تُسجَّل التواريخ الفعلية بعد اعتماد الإجازة.'],EXTRA_TYPE_REQUIRED:['Some days fall outside the approved leave: choose how to count them.','بعض الأيام خارج الإجازة المعتمدة: اختر كيف تُحسب.'],
 PROJECT_UNAVAILABLE:['Choose a project from the list.','اختر مشروعًا من القائمة.'],TEXT_TOO_LONG:['A text is too long; shorten it.','أحد النصوص طويل جدًا؛ اختصره.'],
 PROFILE_INVALID:['Check the start date and the yearly leave days (0–60).','راجع تاريخ بداية الخدمة وأيام الإجازة السنوية (0–60).'],NOT_AN_ENGINEER:['This account is not an engineer.','هذا الحساب ليس مهندسًا.'],HOLIDAY_INVALID:['Choose the date.','اختر التاريخ.']};
function sfLeaveError(error){
  const msg=String(error?.message||error||'');const code=Object.keys(SF_LEAVE_ERRORS).find(k=>msg.includes(k));
  if(!code)return msg;const text=sfLeaveT(...SF_LEAVE_ERRORS[code]);
  return code==='LEAVE_DAYS_TAKEN'?text+' '+msg.split('LEAVE_DAYS_TAKEN:')[1]?.trim():text;
}
async function sfLeaveRpc(name,args){const {data,error}=await sfDb.rpc(name,args);if(error)throw error;return data}
// Days changed in a month whose payroll sheet is already approved: the payroll sheet is corrected by hand.
function sfLeavePayrollWarning(data){
  const months=data?.payroll_warning||[];if(!months.length)return;
  sfNotice(sfLeaveT(`Payroll for ${months.join(', ')} is already approved. Correct the payroll sheet for the changed leave days.`,`كشف رواتب ${months.join('، ')} معتمد بالفعل. صحّح كشف الرواتب بأيام الإجازة التي تغيّرت.`));
}

function sfLeaveStyles(){
  if(document.getElementById('sf-leave-style'))return;
  const s=document.createElement('style');s.id='sf-leave-style';
  s.textContent=`#sf-leave-panel{width:100%;min-width:0;display:flex;flex-direction:column;gap:16px}
.lv-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.lv-kpi{font-family:inherit;text-align:start;background:#fff;border:1px solid var(--sf-line);border-radius:12px;padding:12px 14px;border-top:3px solid var(--k);cursor:pointer;transition:box-shadow .15s ease-out}
.lv-kpi:active{transform:scale(.98)}@media(hover:hover) and (pointer:fine){.lv-kpi:hover{box-shadow:0 4px 14px rgba(31,56,100,.08)}}
.lv-kpi span{display:block;font-size:12px;font-weight:600;color:var(--sf-muted)}.lv-kpi b{display:block;font-size:24px;font-weight:800;color:var(--sf-navy);margin-top:2px}.lv-kpi small{display:block;font-size:11px;color:var(--sf-muted);margin-top:2px}
.lv-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.lv-tabs{display:flex;flex-wrap:wrap;gap:6px}
.lv-tab{font-family:inherit;font-size:13px;font-weight:600;padding:7px 13px;border-radius:999px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-muted);cursor:pointer}
.lv-tab[aria-selected="true"]{background:var(--sf-navy);border-color:var(--sf-navy);color:#fff}.lv-tab b{margin-inline-start:6px;font-size:11px}
.lv-card{background:#fff;border:1px solid var(--sf-line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(31,56,100,.04)}
.lv-card-hdr{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--sf-line)}
.lv-card-hdr h3{margin:0;font-size:15px;font-weight:700;color:var(--sf-navy)}
.lv-card-hdr input{font-family:inherit;font-size:13px;padding:7px 11px;border-radius:9px;border:1px solid var(--sf-line);min-width:200px}
.lv-btn{font-family:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:9px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-navy);cursor:pointer;white-space:nowrap}
.lv-btn:active{transform:scale(.97)}@media(hover:hover) and (pointer:fine){.lv-btn:hover{border-color:var(--sf-navy);background:#F5F7FB}}
.lv-btn.primary{background:var(--sf-orange);border-color:var(--sf-orange);color:#fff}@media(hover:hover) and (pointer:fine){.lv-btn.primary:hover{background:#d15608;border-color:#d15608}}
.lv-btn.ok{background:#2f6f49;border-color:#2f6f49;color:#fff}.lv-btn.no{color:var(--sf-alert-text);border-color:#f0c9c7}
.lv-list{list-style:none;margin:0;padding:6px 10px 10px}
.lv-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:11px 12px;margin-top:6px;border-radius:10px;background:#FAFBFD;border:1px solid transparent;cursor:pointer;width:100%;font-family:inherit;text-align:start}
.lv-item:active{transform:scale(.995)}@media(hover:hover) and (pointer:fine){.lv-item:hover{border-color:var(--sf-line);background:#F2F6FC}}
.lv-item b{font-size:14px;color:var(--sf-text)}.lv-item .sub{grid-column:1;font-size:12px;color:var(--sf-muted)}
.lv-chip{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.lv-wait{background:#FFF1E0;color:var(--sf-warn-text)}.lv-ok,.lv-done{background:#E8F5EC;color:var(--sf-ok-text)}.lv-on{background:#E7EEFA;color:var(--sf-navy)}
.lv-no,.lv-late{background:#FDECEC;color:var(--sf-alert-text)}.lv-off{background:#EEF0F4;color:var(--sf-muted)}
.lv-empty{padding:18px 16px;color:var(--sf-muted);font-size:13px;text-align:center}
.lv-table-wrap{overflow-x:auto}.lv-table{width:100%;border-collapse:collapse;font-size:13px}
.lv-table th{background:#F4F6FA;color:var(--sf-muted);font-weight:700;font-size:12px;text-align:start;padding:10px 12px;white-space:nowrap;border-bottom:1px solid var(--sf-line)}
.lv-table td{padding:10px 12px;border-bottom:1px solid var(--sf-line)}.lv-num{font-variant-numeric:tabular-nums;white-space:nowrap}
.lv-who{min-width:200px}.lv-who small{display:block;color:var(--sf-muted);font-size:11px;margin-top:2px}
.lv-sheet{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;z-index:9998;padding:16px;overflow:auto}
.lv-dialog{background:#fff;border-radius:16px;width:min(760px,100%);margin:auto 0;box-shadow:0 20px 50px rgba(0,0,0,.25);display:flex;flex-direction:column}
.lv-dialog header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid var(--sf-line)}
.lv-dialog header h3{margin:0;font-size:16px;color:var(--sf-navy)}
.lv-close{font-family:inherit;font-size:20px;line-height:1;border:0;background:none;color:var(--sf-muted);cursor:pointer;padding:4px 8px;border-radius:8px}
.lv-body{padding:14px 18px;display:flex;flex-direction:column;gap:14px}
.lv-sec{border:1px solid var(--sf-line);border-radius:12px;padding:12px 14px}
.lv-sec h4{margin:0 0 10px;font-size:13px;color:var(--sf-navy)}
.lv-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 14px;margin:0}
.lv-kv div{min-width:0}.lv-kv dt{font-size:11px;font-weight:600;color:var(--sf-muted)}.lv-kv dd{margin:2px 0 0;font-size:13px;color:var(--sf-text);overflow-wrap:anywhere}
.lv-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 14px}
.lv-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sf-muted)}
.lv-form .wide{grid-column:1/-1}
.lv-form input:not([type=checkbox]),.lv-form select,.lv-form textarea{font-family:inherit;font-size:14px;padding:8px 10px;border-radius:9px;border:1px solid var(--sf-line);color:var(--sf-text);background:#fff}
.lv-form textarea{min-height:64px;resize:vertical}
.lv-check{flex-direction:row!important;align-items:flex-start;gap:8px!important;font-size:13px!important;color:var(--sf-text)!important;line-height:1.6}
.lv-count{grid-column:1/-1;margin:0;padding:8px 12px;border-radius:9px;background:#F4F6FA;font-size:13px;color:var(--sf-navy)}
.lv-count small{display:block;color:var(--sf-muted);font-size:12px}
.lv-hint{margin:0;font-size:12px;color:var(--sf-muted);line-height:1.6}
.lv-custody{margin:0;padding-inline-start:18px;font-size:13px}
.lv-log{list-style:none;margin:0;padding:0;font-size:12px;color:var(--sf-muted)}.lv-log li{padding:4px 0}.lv-log b{color:var(--sf-text)}
.lv-error{margin:0;color:var(--sf-alert-text);font-size:13px}
.lv-dialog footer{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:14px 18px;border-top:1px solid var(--sf-line)}
.lv-dialog footer .lv-left{margin-inline-end:auto;display:flex;gap:8px;flex-wrap:wrap}
@media(max-width:760px){.lv-card-hdr input{min-width:0;flex:1}.lv-sheet{padding:0}.lv-dialog{border-radius:0;min-height:100%}
 .lv-table thead{display:none}.lv-table tr{display:block;border-bottom:1px solid var(--sf-line);padding:6px 0}.lv-table td{display:flex;justify-content:space-between;gap:10px;border:0;padding:5px 14px}
 .lv-table td::before{content:attr(data-label);color:var(--sf-muted);font-weight:600;font-size:12px}}
@media(prefers-reduced-motion:reduce){.lv-kpi,.lv-btn,.lv-item{transition:none}.lv-kpi:active,.lv-btn:active,.lv-item:active{transform:none}}`;
  document.head.appendChild(s);
}

function sfLeaveTabs(){
  const tabs=[],mine=sfLeaveRows.filter(r=>r.user_id===sfLeaveMe.user_id),waiting=sfLeaveRows.filter(sfLeaveMine);
  if(sfLeaveOffice()||sfLeaveMe.leader)tabs.push(['waiting',sfLeaveT('Waiting for me','بانتظار قراري'),waiting.length]);
  if(sfLeaveMe.member)tabs.push(['mine',sfLeaveT('My requests','طلباتي'),mine.length]);
  if(sfLeaveOffice())tabs.push(['all',sfLeaveT('All requests','كل الطلبات'),sfLeaveRows.length],['people',sfLeaveT('Balances','الأرصدة'),null],['holidays',sfLeaveT('Official holidays','الإجازات الرسمية'),null]);
  else if(sfLeaveMe.leader)tabs.push(['all',sfLeaveT('My team','فريقي'),sfLeaveRows.filter(r=>r.user_id!==sfLeaveMe.user_id).length]);
  return tabs;
}
function sfLeaveRender(){
  const panel=document.getElementById('sf-leave-panel');if(!panel||!sfLeaveMe?.access)return;
  sfLeaveStyles();
  const tabs=sfLeaveTabs();if(!tabs.some(t=>t[0]===sfLeaveTab))sfLeaveTab=(tabs.find(t=>t[0]==='waiting'&&t[2])||tabs.find(t=>t[0]==='mine')||tabs[0])[0];
  const t=sfLeaveToday(),own=sfLeavePeople.find(p=>p.user_id===sfLeaveMe.user_id);
  const kpi=(color,label,value,hint,tab)=>`<button type="button" class="lv-kpi" style="--k:${color}" data-lv-tab="${tab}"><span>${sfLeaveEsc(label)}</span><b>${value}</b><small>${sfLeaveEsc(hint)}</small></button>`;
  const kpis=sfLeaveOffice()?[
    kpi('var(--sf-warn)',sfLeaveT('Waiting for me','بانتظار قراري'),sfLeaveRows.filter(sfLeaveMine).length,sfLeaveT('Decisions and actual dates','قرارات وتواريخ فعلية'),'waiting'),
    kpi('var(--sf-navy)',sfLeaveT('On leave today','في إجازة اليوم'),sfLeavePeople.filter(p=>p.on_leave).length,sfLeaveT('Engineers','مهندسون'),'people'),
    kpi('var(--sf-alert)',sfLeaveT('Return not recorded','لم يُسجَّل رجوعهم'),sfLeaveRows.filter(r=>r.status==='approved'&&!r.actual_state&&r.approved_end<t).length,sfLeaveT('Leave ended','انتهت إجازتهم'),'waiting'),
    kpi('var(--sf-ok)',sfLeaveT('In progress','قيد الاعتماد'),sfLeaveRows.filter(r=>['supervisor','hr','executive'].includes(r.status)).length,sfLeaveT('All stages','كل المراحل'),'all')].join('')
   :own?[kpi('var(--sf-ok)',sfLeaveT('Annual leave left','المتبقي من الإجازة السنوية'),own.annual_days-own.annual_used,sfLeaveT(`of ${own.annual_days} days this year`,`من ${own.annual_days} يومًا هذا العام`),'mine'),
    kpi('var(--sf-warn)',sfLeaveT('In progress','قيد الاعتماد'),sfLeaveRows.filter(r=>r.user_id===sfLeaveMe.user_id&&['supervisor','hr','executive'].includes(r.status)).length,sfLeaveT('My requests','طلباتي'),'mine'),
    kpi('var(--sf-navy)',sfLeaveT('Last leave','آخر إجازة'),sfLeaveDate(own.last_leave),sfLeaveT('Last day of leave','آخر يوم إجازة'),'mine')].join(''):'';
  const bar=`<div class="lv-bar"><div class="lv-tabs" role="tablist">${tabs.map(([k,label,n])=>`<button type="button" class="lv-tab" role="tab" aria-selected="${k===sfLeaveTab}" data-lv-tab="${k}">${sfLeaveEsc(label)}${n?`<b>${n}</b>`:''}</button>`).join('')}</div>
    ${sfLeaveMe.member?`<button type="button" class="lv-btn primary" data-lv-act="new">＋ ${sfLeaveEsc(sfLeaveT('New leave request','طلب إجازة جديد'))}</button>`:''}</div>`;
  let body='';
  if(sfLeaveTab==='people')body=sfLeavePeopleHtml();
  else if(sfLeaveTab==='holidays')body=sfLeaveHolidaysHtml();
  else{
    const rows=sfLeaveRows.filter(r=>sfLeaveTab==='waiting'?sfLeaveMine(r):sfLeaveTab==='mine'?r.user_id===sfLeaveMe.user_id:sfLeaveOffice()||r.user_id!==sfLeaveMe.user_id);
    const title={waiting:sfLeaveT('Waiting for my decision','بانتظار قراري'),mine:sfLeaveT('My leave requests','طلبات إجازتي'),all:sfLeaveOffice()?sfLeaveT('All leave requests','كل طلبات الإجازة'):sfLeaveT('My team\'s requests','طلبات فريقي')}[sfLeaveTab];
    const item=r=>{const a=r.approved_start||r.start_date,b=r.approved_end||r.end_date;
      return `<li><button type="button" class="lv-item" data-lv-open="${r.id}" data-search="${sfLeaveEsc([r.name,r.engineer_id,r.project_name,sfLeaveType(r.leave_type)].filter(Boolean).join(' ').toLowerCase())}">
      <b>${sfLeaveTab==='mine'?sfLeaveEsc(sfLeaveType(r.leave_type)+' — '+sfLeaveDays(r.approved_days||r.days)):`<bdi>${sfLeaveEsc(r.name)}</bdi> · ${sfLeaveEsc(sfLeaveType(r.leave_type))}`}</b>${sfLeaveChip(r)}
      <span class="sub"><span class="lv-num" dir="ltr">${sfLeaveDate(a)} → ${sfLeaveDate(b)}</span> · ${sfLeaveEsc(sfLeaveDays(r.approved_days||r.days))}${r.project_name?` · <bdi>${sfLeaveEsc(r.project_name)}</bdi>`:''}</span></button></li>`};
    body=`<div class="lv-card"><div class="lv-card-hdr"><h3>${sfLeaveEsc(title)}</h3>${sfLeaveTab==='mine'?'':`<input type="search" id="sf-leave-search" value="${sfLeaveEsc(sfLeaveSearch)}" placeholder="${sfLeaveEsc(sfLeaveT('Search by name, code or project','بحث بالاسم أو الكود أو المشروع'))}" aria-label="${sfLeaveEsc(sfLeaveT('Search','بحث'))}">`}</div>
      ${sfLeaveLoading&&!sfLeaveRows.length?`<div class="lv-empty">${sfLeaveEsc(sfLeaveT('Loading…','جاري التحميل…'))}</div>`:rows.length?`<ul class="lv-list">${rows.map(item).join('')}</ul>`:`<div class="lv-empty">${sfLeaveEsc(sfLeaveTab==='waiting'?sfLeaveT('Nothing is waiting for you.','لا يوجد ما ينتظر قرارك.'):sfLeaveT('No leave requests yet.','لا توجد طلبات إجازة بعد.'))}</div>`}</div>`;
  }
  panel.innerHTML=(kpis?`<div class="lv-kpis">${kpis}</div>`:'')+bar+body;
  sfLeaveApplySearch();
}
function sfLeaveApplySearch(){const q=sfLeaveSearch.trim().toLowerCase();document.querySelectorAll('#sf-leave-panel [data-lv-open]').forEach(b=>{b.parentElement.hidden=!!q&&!b.dataset.search.includes(q)})}

function sfLeavePeopleHtml(){
  const L=t=>` data-label="${sfLeaveEsc(t)}"`;
  return `<div class="lv-card"><div class="lv-card-hdr"><h3>${sfLeaveEsc(sfLeaveT('Leave balances and HR details','أرصدة الإجازات وبيانات الموارد البشرية'))}</h3></div><div class="lv-table-wrap"><table class="lv-table"><thead><tr>
   <th>${sfLeaveEsc(sfLeaveT('Engineer','المهندس'))}</th><th>${sfLeaveEsc(sfLeaveT('Service start','بداية الخدمة'))}</th><th>${sfLeaveEsc(sfLeaveT('Department / section / position','الإدارة / القسم / الوظيفة'))}</th>
   <th>${sfLeaveEsc(sfLeaveT('Yearly days','الأيام السنوية'))}</th><th>${sfLeaveEsc(sfLeaveT('Used this year','المستخدم هذا العام'))}</th><th>${sfLeaveEsc(sfLeaveT('Left','المتبقي'))}</th><th>${sfLeaveEsc(sfLeaveT('Last leave','آخر إجازة'))}</th><th></th></tr></thead>
   <tbody>${sfLeavePeople.map(p=>`<tr><td class="lv-who"${L(sfLeaveT('Engineer','المهندس'))}><span><bdi>${sfLeaveEsc(p.name)}</bdi>${p.on_leave?` <span class="lv-chip lv-on">${sfLeaveEsc(sfLeaveT('On leave','في إجازة'))}</span>`:''}<small class="lv-num" dir="ltr">${sfLeaveEsc(p.engineer_id)}</small></span></td>
    <td class="lv-num"${L(sfLeaveT('Service start','بداية الخدمة'))}>${sfLeaveDate(p.service_start)}</td><td${L(sfLeaveT('Department / section / position','الإدارة / القسم / الوظيفة'))}>${sfLeaveEsc([p.department,p.section,p.position].filter(Boolean).join(' / ')||'—')}</td>
    <td class="lv-num"${L(sfLeaveT('Yearly days','الأيام السنوية'))}>${p.annual_days}</td><td class="lv-num"${L(sfLeaveT('Used this year','المستخدم هذا العام'))}>${p.annual_used}</td><td class="lv-num"${L(sfLeaveT('Left','المتبقي'))}><b>${p.annual_days-p.annual_used}</b></td>
    <td class="lv-num"${L(sfLeaveT('Last leave','آخر إجازة'))}>${sfLeaveDate(p.last_leave)}</td><td><button type="button" class="lv-btn" data-lv-profile="${p.user_id}">${sfLeaveEsc(sfLeaveT('Edit','تعديل'))}</button></td></tr>`).join('')
    ||`<tr><td colspan="8" class="lv-empty">${sfLeaveEsc(sfLeaveT('No engineers.','لا يوجد مهندسون.'))}</td></tr>`}</tbody></table></div>
   <p class="lv-hint" style="padding:10px 16px">${sfLeaveEsc(sfLeaveT('Used days are the annual leave days in attendance this year, Fridays and holidays inside a leave included.','الأيام المستخدمة هي أيام الإجازة السنوية المسجلة في الحضور هذا العام، ومنها الجمعة والإجازات الرسمية التي تقع داخل الإجازة.'))}</p></div>`;
}
function sfLeaveHolidaysHtml(){
  const list=sfLeaveMe.holidays||[],t=sfLeaveToday();
  return `<div class="lv-card"><div class="lv-card-hdr"><h3>${sfLeaveEsc(sfLeaveT('Official holidays','الإجازات الرسمية'))}</h3><button type="button" class="lv-btn" data-lv-act="holiday">＋ ${sfLeaveEsc(sfLeaveT('Add a holiday','إضافة إجازة رسمية'))}</button></div>
   <p class="lv-hint" style="padding:10px 16px 0">${sfLeaveEsc(sfLeaveT('Enter each official holiday day (Eid al-Fitr, Eid al-Adha, National Day, Founding Day). Inside a leave they count; at its start or end they do not.','أدخل كل يوم من أيام الإجازات الرسمية (عيد الفطر، عيد الأضحى، اليوم الوطني، يوم التأسيس). داخل الإجازة تُحسب، وفي أولها أو آخرها لا تُحسب.'))}</p>
   ${list.length?`<ul class="lv-list">${list.map(h=>`<li class="lv-item" style="cursor:default${h.day<t?';opacity:.6':''}"><b><span class="lv-num">${sfLeaveDate(h.day)}</span> · ${sfLeaveEsc(h.name)}</b><button type="button" class="lv-btn no" data-lv-holiday-del="${h.day}">${sfLeaveEsc(sfLeaveT('Remove','حذف'))}</button></li>`).join('')}</ul>`
    :`<div class="lv-empty">${sfLeaveEsc(sfLeaveT('No official holidays entered yet.','لم تُدخل إجازات رسمية بعد.'))}</div>`}</div>`;
}

async function sfLeaveLoad(){
  if(!sfLeaveMe?.access||sfLeaveLoading)return;
  sfLeaveLoading=true;sfLeaveRender();
  try{
    const [rows,people,me]=await Promise.all([sfLeaveRpc('sf_leave_list'),sfLeaveRpc('sf_leave_people'),sfLeaveRpc('sf_leave_me')]);
    sfLeaveRows=rows||[];sfLeavePeople=people||[];if(me?.access)sfLeaveMe=me;
  }catch(error){sfNotice(sfLeaveError(error))}
  finally{sfLeaveLoading=false;sfLeaveRender();sfLeaveBadge();if(sfLeaveOpenId)sfLeaveOpen(sfLeaveOpenId)}
}
// The sidebar count: what is waiting for the signed-in person.
function sfLeaveBadge(){
  const b=document.querySelector('.side-nav-btn[data-module="leave"] .side-nav-count');if(!b)return;
  const n=sfLeaveRows.filter(sfLeaveMine).length;b.textContent=n||'';b.hidden=!n;
}

// ── The request form ──
function sfLeaveSheet(html,onReady){
  document.querySelector('.lv-sheet')?.remove();
  const sheet=document.createElement('div');sheet.className='lv-sheet';sheet.innerHTML=html;document.body.appendChild(sheet);
  const close=()=>{sheet.remove();sfLeaveOpenId='';document.removeEventListener('keydown',onKey)};
  const onKey=e=>{if(e.key==='Escape'&&!document.querySelector('.sf-dialog-backdrop, dialog[open]'))close()};
  document.addEventListener('keydown',onKey);
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('[data-lv-close]'))close()});
  onReady?.(sheet,close);
  setTimeout(()=>sheet.querySelector('input,select,textarea,button:not(.lv-close)')?.focus(),30);
  return {sheet,close};
}
function sfLeaveNew(){
  const me=sfLeaveMe,t=sfLeaveToday();
  const types=Object.keys(SF_LEAVE_TYPES).map(k=>`<option value="${k}">${sfLeaveEsc(sfLeaveType(k))}</option>`).join('');
  const projects=`<option value="">—</option>`+(me.projects||[]).map(p=>`<option value="${sfLeaveEsc(p.id)}"${p.id===me.default_project?' selected':''}>${sfLeaveEsc(p.name)}</option>`).join('');
  sfLeaveSheet(`<form class="lv-dialog" novalidate><header><h3>${sfLeaveEsc(sfLeaveT('Leave application','طلب إجازة'))}</h3><button type="button" class="lv-close" data-lv-close aria-label="${sfLeaveEsc(sfLeaveT('Close','إغلاق'))}">×</button></header>
   <div class="lv-body"><div class="lv-form">
    <label>${sfLeaveEsc(sfLeaveT('Type of leave','نوع الإجازة'))}<select name="leave_type" required>${types}</select></label>
    <label>${sfLeaveEsc(sfLeaveT('Current project','المشروع الحالي'))}<select name="project_id">${projects}</select></label>
    <label>${sfLeaveEsc(sfLeaveT('Leave start date','تاريخ بداية الإجازة'))}<input type="date" name="start_date" required min="${sfLeaveAdd(t,-60)}" max="${sfLeaveAdd(t,183)}"></label>
    <label>${sfLeaveEsc(sfLeaveT('Leave end date','تاريخ نهاية الإجازة'))}<input type="date" name="end_date" required min="${sfLeaveAdd(t,-60)}"></label>
    <p class="lv-count" data-lv-count>${sfLeaveEsc(sfLeaveT('Choose the dates to see the number of days.','اختر التواريخ لعرض عدد الأيام.'))}</p>
    <label class="wide">${sfLeaveEsc(sfLeaveT('Contact address during the leave','العنوان أثناء الإجازة'))}<input name="address" maxlength="300" autocomplete="off"></label>
    <label>${sfLeaveEsc(sfLeaveT('Phone number','رقم الهاتف'))}<input name="phone" maxlength="30" dir="ltr" inputmode="tel" autocomplete="tel"></label>
    <label class="wide">${sfLeaveEsc(sfLeaveT('Reason','السبب'))}<textarea name="reason" maxlength="1000" required></textarea></label>
    <label class="wide" data-lv-report hidden>${sfLeaveEsc(sfLeaveT('Medical report — PDF / JPG / PNG up to 5MB','التقرير الطبي — PDF / JPG / PNG حتى 5MB'))}<input type="file" name="report" accept="application/pdf,image/jpeg,image/png"></label>
    <label class="wide lv-check"><input type="checkbox" name="undertaking"><span>${sfLeaveEsc(sfLeaveT('I, the undersigned, undertake to resume my work after returning from the leave granted to me by the company; if I am late, I bear all the regular procedures followed in the company, including dismissal and deprivation of service.','أتعهد أنا الموقع أدناه بأن أباشر مهام عملي بعد عودتي من الإجازة الممنوحة لي من الشركة، وعند تأخري أتحمل كافة الإجراءات النظامية المتبعة في الشركة من فصل وحرمان من الخدمة.'))}</span></label>
    <p class="lv-error wide" role="alert" hidden></p></div></div>
   <footer><button type="button" class="lv-btn" data-lv-close>${sfLeaveEsc(sfLeaveT('Cancel','إلغاء'))}</button><button type="submit" class="lv-btn primary">${sfLeaveEsc(sfLeaveT('Send the request','إرسال الطلب'))}</button></footer></form>`,(sheet,close)=>{
    const f=sheet.querySelector('form'),count=sheet.querySelector('[data-lv-count]'),err=sheet.querySelector('.lv-error');
    const update=()=>{
      sheet.querySelector('[data-lv-report]').hidden=f.leave_type.value!=='sick';
      if(f.start_date.value)f.end_date.min=f.start_date.value;
      const s=sfLeaveSpan(f.start_date.value,f.end_date.value);
      if(!f.start_date.value||!f.end_date.value){count.textContent=sfLeaveT('Choose the dates to see the number of days.','اختر التواريخ لعرض عدد الأيام.');return}
      count.innerHTML=`<b>${sfLeaveEsc(sfLeaveT('Number of leave days:','عدد أيام الإجازة:'))} ${s.days}</b>${s.days?` · ${sfLeaveEsc(sfLeaveT('back at work','العودة للعمل'))} <span class="lv-num">${sfLeaveDate(sfLeaveReturn(s.last))}</span>`:''}
        ${s.dropped.length?`<small>${sfLeaveEsc(sfLeaveT('Not counted (Friday or official holiday at the start or end):','لا تُحسب (جمعة أو إجازة رسمية في أول الإجازة أو آخرها):'))} ${s.dropped.sort().map(sfLeaveDate).join('، ')}</small>`:''}
        <small>${sfLeaveEsc(sfLeaveT('Fridays and official holidays inside the leave are counted.','الجمعة والإجازات الرسمية داخل الإجازة تُحسب.'))}</small>`;
    };
    f.addEventListener('input',update);f.addEventListener('change',update);update();
    f.addEventListener('submit',async e=>{
      e.preventDefault();err.hidden=true;
      const fail=(msg,el)=>{err.textContent=msg;err.hidden=false;el?.focus()};
      const v={leave_type:f.leave_type.value,project_id:f.project_id.value,start_date:f.start_date.value,end_date:f.end_date.value,address:f.address.value.trim(),phone:f.phone.value.trim(),reason:f.reason.value.trim(),undertaking:f.undertaking.checked};
      if(!v.start_date||!v.end_date)return fail(sfLeaveT('Choose the start and end dates.','اختر تاريخ البداية والنهاية.'),f.start_date);
      if(!sfLeaveSpan(v.start_date,v.end_date).days)return fail(sfLeaveError('NO_LEAVE_DAYS'),f.end_date);
      if(!v.reason)return fail(sfLeaveError('LEAVE_REASON_REQUIRED'),f.reason);
      const file=f.report.files?.[0];
      if(v.leave_type==='sick'&&!file)return fail(sfLeaveError('SICK_REPORT_REQUIRED'),f.report);
      if(file&&(file.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(file.type)))return fail(sfLeaveT('The report must be PDF, JPG or PNG, up to 5MB.','التقرير يجب أن يكون PDF أو JPG أو PNG، حتى 5MB.'),f.report);
      if(!v.undertaking)return fail(sfLeaveError('UNDERTAKING_REQUIRED'),f.undertaking);
      const btn=f.querySelector('[type=submit]');btn.disabled=true;
      try{
        if(file&&v.leave_type==='sick'){v.attachment_path=`${me.user_id}/leave/${crypto.randomUUID()}`;const {error}=await sfDb.storage.from('sf-receipts').upload(v.attachment_path,file,{contentType:file.type});if(error)throw error}
        const row=await sfLeaveRpc('sf_leave_submit',{p:v});
        close();sfLeaveTab='mine';await sfLeaveLoad();sfNotice(sfLeaveT(`Your leave request was sent: ${sfLeaveDays(row.days)}. It now waits for your direct supervisor.`,`تم إرسال طلب الإجازة: ${sfLeaveDays(row.days)}. الطلب الآن بانتظار الرئيس المباشر.`));
      }catch(error){fail(sfLeaveError(error))}finally{btn.disabled=false}
    });
  });
}

// ── One request: the paper form's sections, with the step the signed-in person may take ──
function sfLeaveOpen(id){
  const r=sfLeaveRows.find(x=>x.id===id);if(!r){document.querySelector('.lv-sheet')?.remove();sfLeaveOpenId='';return}
  sfLeaveOpenId=id;
  const kv=(label,value,ltr)=>`<div><dt>${sfLeaveEsc(label)}</dt><dd${ltr?' dir="ltr" class="lv-num"':''}>${value===''||value==null?'—':value}</dd></div>`;
  const e=sfLeaveEsc,T=sfLeaveT,pr=r.profile||{};
  const span=sfLeaveSpan(r.approved_start||r.start_date,r.approved_end||r.end_date);
  const left=r.annual_left-(r.leave_type==='annual'&&!['approved','rejected','cancelled'].includes(r.status)?(r.approved_days||r.days):0);
  const note=(name,label)=>`<label class="wide">${e(label)}<textarea name="${name}" maxlength="1000"></textarea></label>`;
  const stageButtons=stage=>`<div class="wide" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
    <button type="button" class="lv-btn no" data-lv-decide="${stage}" data-approve="0">${e(T('Reject','رفض'))}</button>
    <button type="button" class="lv-btn ok" data-lv-decide="${stage}" data-approve="1">${e(stage==='supervisor'?T('Approve as direct supervisor','موافقة الرئيس المباشر'):stage==='hr'?T('Approve for HR','موافقة الموارد البشرية'):T('Final approval','الاعتماد النهائي'))}</button></div>`;
  const employee=`<section class="lv-sec"><h4>${e(T('Completed by the employee','يعبأ بواسطة الموظف'))}</h4><dl class="lv-kv">
    ${kv(T('Employee no.','الرقم الوظيفي'),e(r.engineer_id),true)}${kv(T('Name','الاسم'),`<bdi>${e(r.name)}</bdi>`)}${kv(T('Request date','تاريخ الطلب'),sfLeaveDate(String(r.created_at).slice(0,10)),true)}
    ${kv(T('Department','الإدارة'),e(pr.department))}${kv(T('Section','القسم'),e(pr.section))}${kv(T('Position','الوظيفة'),e(pr.position))}
    ${kv(T('Project','المشروع'),r.project_name?`<bdi>${e(r.project_name)}</bdi>`:'')}${kv(T('Type of leave','نوع الإجازة'),e(sfLeaveType(r.leave_type)))}
    ${kv(T('Leave start date','تاريخ بداية الإجازة'),sfLeaveDate(r.start_date),true)}${kv(T('Leave end date','تاريخ نهاية الإجازة'),sfLeaveDate(r.end_date),true)}${kv(T('Number of days','عدد الأيام'),e(sfLeaveDays(r.days)))}
    ${kv(T('Address during the leave','العنوان أثناء الإجازة'),e(r.address))}${kv(T('Phone','رقم الهاتف'),e(r.phone),true)}${kv(T('Reason','السبب'),e(r.reason))}
    ${r.attachment_path?kv(T('Medical report','التقرير الطبي'),`<button type="button" class="lv-btn" data-lv-report="${r.id}">${e(T('Open','فتح'))}</button>`):''}</dl></section>`;
  const supervisor=r.can.supervise?`<section class="lv-sec"><h4>${e(T('Completed by the direct supervisor','يعبأ من قبل الرئيس المباشر'))}</h4><form class="lv-form" data-lv-stage="supervisor">
     <label>${e(T('Approved from','اعتبارًا من'))}<input type="date" name="approved_start" value="${e(r.start_date)}"></label><label>${e(T('Until','وحتى'))}<input type="date" name="approved_end" value="${e(r.end_date)}"></label>
     <p class="lv-count" data-lv-count></p>
     <label class="lv-check"><input type="checkbox" name="replacement_needed"><span>${e(T('A replacement is required','يحتاج بديل'))}</span></label><label>${e(T('Replacement name','اسم البديل'))}<input name="replacement_name" maxlength="120"></label>
     <div class="wide"><span class="lv-hint">${e(T('Custody the engineer holds:','العهدة المدرجة مع المهندس:'))}</span><ul class="lv-custody" data-lv-custody><li>${e(T('Loading…','جاري التحميل…'))}</li></ul></div>
     <label class="wide">${e(T('Custody to be handed over to','يتم تسليمها لـ'))}<input name="custody_to" maxlength="120"></label>
     ${note('note',T('Reasons / notes','الأسباب / ملاحظات'))}${stageButtons('supervisor')}</form></section>`
   :r.approved_start?`<section class="lv-sec"><h4>${e(T('Direct supervisor','الرئيس المباشر'))}</h4><dl class="lv-kv">${kv(T('Approved from','اعتبارًا من'),sfLeaveDate(r.approved_start),true)}${kv(T('Until','وحتى'),sfLeaveDate(r.approved_end),true)}${kv(T('For','لمدة'),e(sfLeaveDays(r.approved_days)))}
     ${kv(T('Replacement','البديل'),r.replacement_needed?e(r.replacement_name||T('Required','يحتاج')):e(T('Not required','لا يحتاج')))}${kv(T('Custody handed over to','العهدة تُسلَّم لـ'),e(r.custody_to))}${kv(T('Notes','ملاحظات'),e(r.supervisor_note))}</dl></section>`:'';
  const hrFacts=`<dl class="lv-kv">${kv(T('Service start date','تاريخ بداية الخدمة'),sfLeaveDate(pr.service_start),true)}${kv(T('Leave credit','رصيد الإجازات'),e(T(`${left} of ${pr.annual_days} days`,`${left} من ${pr.annual_days} يومًا`)))}
     ${kv(T('Last leave','تاريخ آخر إجازة'),sfLeaveDate(r.last_leave),true)}${kv(T('Days given','عدد الأيام الممنوحة'),e(sfLeaveDays(r.approved_days||span.days)))}
     ${kv(T('Leave start date','تاريخ بداية الإجازة'),sfLeaveDate(span.first),true)}${kv(T('Date of return to work','تاريخ العودة إلى العمل'),sfLeaveDate(sfLeaveReturn(span.last)),true)}${r.hr_note?kv(T('HR remarks','ملاحظات الموارد البشرية'),e(r.hr_note)):''}</dl>`;
  const hr=r.can.hr?`<section class="lv-sec"><h4>${e(T('Completed by HR','يعبأ من قبل إدارة الموارد البشرية'))}</h4>${hrFacts}<form class="lv-form" data-lv-stage="hr" style="margin-top:10px">${note('note',T('HR remarks','ملاحظات الموارد البشرية'))}${stageButtons('hr')}</form></section>`
   :['executive','approved'].includes(r.status)||r.hr_note?`<section class="lv-sec"><h4>${e(T('Human resources','الموارد البشرية'))}</h4>${hrFacts}</section>`:'';
  const exec=r.can.execute?`<section class="lv-sec"><h4>${e(T('Executive manager approval','اعتماد المدير التنفيذي'))}</h4><form class="lv-form" data-lv-stage="executive">${note('note',T('Notes','ملاحظات'))}${stageButtons('executive')}</form></section>`
   :r.executive_note?`<section class="lv-sec"><h4>${e(T('Executive manager','المدير التنفيذي'))}</h4><p class="lv-hint">${e(r.executive_note)}</p></section>`:'';
  const all=r.can.approve_all&&!r.can.execute?`<section class="lv-sec"><h4>${e(T('Administrator','الأدمن'))}</h4><p class="lv-hint">${e(T('Approve every remaining stage at once (when the supervisor or HR is not available).','اعتماد كل المراحل المتبقية مرة واحدة (لو الرئيس المباشر أو الموارد البشرية غير متاحين).'))}</p>
     <div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="lv-btn ok" data-lv-decide="all" data-approve="1">${e(T('Approve all stages','اعتماد كل المراحل'))}</button></div></section>`:'';
  const actualForm=r.can.set_actual||r.can.submit_actual?`<form class="lv-form" data-lv-actual style="margin-top:10px">
     <label>${e(T('First day away','أول يوم غياب للإجازة'))}<input type="date" name="start" value="${e(r.actual_start||span.first)}"></label>
     <label>${e(T('Back at work on','العودة إلى العمل يوم'))}<input type="date" name="return" value="${e(r.actual_return||sfLeaveReturn(span.last))}"></label>
     <p class="lv-count" data-lv-actual-count></p>
     ${r.can.set_actual?`<label class="wide" data-lv-extra hidden>${e(T('Days outside the approved leave count as','الأيام خارج الإجازة المعتمدة تُحسب'))}<select name="extra"><option value="">—</option><option value="annual"${r.extra_type==='annual'?' selected':''}>${e(T('Annual leave','إجازة سنوية'))}</option><option value="unpaid"${r.extra_type==='unpaid'?' selected':''}>${e(T('Unpaid leave','إجازة بدون راتب'))}</option><option value="absent"${r.extra_type==='absent'?' selected':''}>${e(T('Absence','غياب'))}</option></select></label>`:''}
     <div class="wide" style="display:flex;justify-content:flex-end"><button type="submit" class="lv-btn ok">${e(r.can.set_actual?T('Confirm the actual dates','تأكيد التواريخ الفعلية'):T('Send to HR','إرسال للموارد البشرية'))}</button></div></form>`:'';
  const actual=r.status==='approved'?`<section class="lv-sec"><h4>${e(T('Actual leave','الإجازة الفعلية'))}</h4>${r.actual_start?`<dl class="lv-kv">${kv(T('First day away','أول يوم غياب للإجازة'),sfLeaveDate(r.actual_start),true)}${kv(T('Back at work on','العودة إلى العمل يوم'),sfLeaveDate(r.actual_return),true)}${kv(T('Actual days','الأيام الفعلية'),e(sfLeaveDays(r.actual_days)))}
     ${kv(T('State','الحالة'),e(r.actual_state==='confirmed'?T('Confirmed by HR','مؤكدة من الموارد البشرية'):T('Waiting for HR','بانتظار الموارد البشرية')))}${r.extra_type?kv(T('Extra days counted as','الأيام الزائدة تُحسب'),e({annual:T('Annual leave','إجازة سنوية'),unpaid:T('Unpaid leave','إجازة بدون راتب'),absent:T('Absence','غياب')}[r.extra_type])):''}</dl>`
     :`<p class="lv-hint">${e(T('If the engineer travelled or came back on different days, record the actual dates here; attendance and payroll follow them.','لو سافر المهندس أو رجع في أيام مختلفة، سجّل التواريخ الفعلية هنا؛ الحضور والرواتب يتبعانها.'))}</p>`}${actualForm}</section>`:'';
  const rejected=r.status==='rejected'?`<section class="lv-sec"><h4>${e(T('Rejected','مرفوض'))}</h4><p class="lv-hint">${e(r.reject_note)}</p></section>`:'';
  const log=`<section class="lv-sec"><h4>${e(T('History','السجل'))}</h4><ul class="lv-log">${(r.log||[]).map(l=>`<li><b>${e(sfLeaveT(...(SF_LEAVE_ACTIONS[l.action]||[l.action,l.action])))}</b> · <bdi>${e(l.by)}</bdi> · <span class="lv-num" dir="ltr">${e(new Date(l.at).toLocaleString(sfLeaveAr()?'ar-SA-u-nu-latn-ca-gregory':'en-GB',{dateStyle:'short',timeStyle:'short'}))}</span>${l.note?` — ${e(l.note)}`:''}</li>`).join('')}</ul></section>`;
  sfLeaveSheet(`<div class="lv-dialog" role="dialog" aria-modal="true" aria-labelledby="lv-title"><header><h3 id="lv-title">${e(T('Leave application','طلب إجازة'))} — <bdi>${e(r.name)}</bdi> ${sfLeaveChip(r)}</h3><button type="button" class="lv-close" data-lv-close aria-label="${e(T('Close','إغلاق'))}">×</button></header>
    <div class="lv-body">${employee}${rejected}${supervisor}${hr}${exec}${all}${actual}${log}</div>
    <footer><span class="lv-left"><button type="button" class="lv-btn" data-lv-print="${r.id}">🖨 ${e(T('Print the form','طباعة النموذج'))}</button></span>
     ${r.can.cancel?`<button type="button" class="lv-btn no" data-lv-cancel="${r.id}">${e(T('Cancel the request','إلغاء الطلب'))}</button>`:''}<button type="button" class="lv-btn" data-lv-close>${e(T('Close','إغلاق'))}</button></footer></div>`,(sheet)=>{
    const sup=sheet.querySelector('[data-lv-stage="supervisor"]');
    if(sup){const c=sup.querySelector('[data-lv-count]');const upd=()=>{const s=sfLeaveSpan(sup.approved_start.value,sup.approved_end.value);c.textContent=sfLeaveT(`Approved for ${s.days} day${s.days===1?'':'s'}`,`لمدة ${s.days} يوم`)+(s.days?sfLeaveT(` · back at work ${sfLeaveDate(sfLeaveReturn(s.last))}`,` · العودة للعمل ${sfLeaveDate(sfLeaveReturn(s.last))}`):'')};sup.addEventListener('input',upd);upd();
      sfLeaveRpc('sf_leave_custody',{p_user:r.user_id}).then(list=>{const ul=sup.querySelector('[data-lv-custody]');ul.innerHTML=(list||[]).map(d=>`<li><span dir="ltr" class="lv-num">${e(d.code)}</span> · ${e(d.name)}${d.serial?` · <span dir="ltr">${e(d.serial)}</span>`:''}</li>`).join('')||`<li>${e(T('No equipment in custody.','لا توجد عهدة.'))}</li>`}).catch(()=>{sup.querySelector('[data-lv-custody]').innerHTML=`<li>—</li>`})}
    const act=sheet.querySelector('[data-lv-actual]');
    if(act){const c=act.querySelector('[data-lv-actual-count]'),extra=act.querySelector('[data-lv-extra]');
      const upd=()=>{const s=sfLeaveSpan(act.start.value,act.return.value?sfLeaveAdd(act.return.value,-1):'');c.textContent=sfLeaveT(`Actual leave: ${s.days} day${s.days===1?'':'s'}`,`الإجازة الفعلية: ${s.days} يوم`);
        if(extra)extra.hidden=!(s.days&&(s.first<span.first||s.last>span.last))};
      act.addEventListener('input',upd);upd();
      act.addEventListener('submit',ev=>{ev.preventDefault();void sfLeaveActual(r,act)})}
  });
}
async function sfLeaveDecide(r,stage,approve){
  // "All stages" uses the supervisor's form when the request is still at that stage (approved dates, replacement).
  const sheet=document.querySelector('.lv-sheet'),form=sheet?.querySelector(`[data-lv-stage="${stage==='all'?'supervisor':stage}"]`);
  const p={note:form?.note?.value.trim()||''};
  if(form&&form.dataset.lvStage==='supervisor')Object.assign(p,{approved_start:form.approved_start.value,approved_end:form.approved_end.value,replacement_needed:form.replacement_needed.checked,replacement_name:form.replacement_name.value.trim(),custody_to:form.custody_to.value.trim()});
  if(!approve&&!p.note){const v=await sfAskForm({title:sfLeaveT('Reject this leave request?','رفض طلب الإجازة؟'),fields:[{name:'note',label:sfLeaveT('Reason for rejecting','سبب الرفض'),required:true}],ok:sfLeaveT('Reject','رفض')});if(!v)return;p.note=v.note}
  if(stage==='all'&&!(await sfConfirm({title:sfLeaveT('Approve every remaining stage?','اعتماد كل المراحل المتبقية؟'),message:sfLeaveT('The leave days are written to attendance at once.','أيام الإجازة تُسجَّل في الحضور فورًا.'),ok:sfLeaveT('Approve all','اعتماد الكل')})))return;
  try{const data=await sfLeaveRpc('sf_leave_decide',{p_id:r.id,p_revision:r.revision,p_stage:stage,p_approve:approve,p});sfLeavePayrollWarning(data)}
  catch(error){sfNotice(sfLeaveError(error))}
  await sfLeaveLoad();
}
async function sfLeaveCancel(r){
  const v=await sfAskForm({title:sfLeaveT('Cancel this leave request?','إلغاء طلب الإجازة؟'),note:r.status==='approved'?sfLeaveT('The leave days are removed from attendance.','أيام الإجازة تُحذف من الحضور.'):'',fields:[{name:'note',label:sfLeaveT('Reason (optional)','السبب (اختياري)')}],ok:sfLeaveT('Cancel the request','إلغاء الطلب')});
  if(!v)return;
  try{const data=await sfLeaveRpc('sf_leave_cancel',{p_id:r.id,p_revision:r.revision,p_note:v.note||null});sfLeavePayrollWarning(data)}catch(error){sfNotice(sfLeaveError(error))}
  await sfLeaveLoad();
}
async function sfLeaveActual(r,form){
  if(!form.start.value||!form.return.value)return sfNotice(sfLeaveT('Choose both actual dates.','اختر التاريخين الفعليين.'));
  try{const data=await sfLeaveRpc('sf_leave_actual',{p_id:r.id,p_revision:r.revision,p_start:form.start.value,p_return:form.return.value,p_extra_type:form.extra?.value||null});sfLeavePayrollWarning(data);
    if(!r.can.set_actual)sfNotice(sfLeaveT('The actual dates were sent to HR.','تم إرسال التواريخ الفعلية للموارد البشرية.'))}
  catch(error){sfNotice(sfLeaveError(error))}
  await sfLeaveLoad();
}
async function sfLeaveReport(r){
  try{const {data,error}=await sfDb.storage.from('sf-receipts').createSignedUrl(r.attachment_path,60);if(error)throw error;window.open(data.signedUrl,'_blank','noopener')}catch(error){sfNotice(sfLeaveError(error))}
}
async function sfLeaveProfile(userId){
  const p=sfLeavePeople.find(x=>x.user_id===userId);if(!p)return;
  const v=await sfAskForm({title:sfLeaveT('HR details — ','بيانات الموارد البشرية — ')+p.name,fields:[
    {name:'service_start',label:sfLeaveT('Service start date','تاريخ بداية الخدمة'),type:'date',value:p.service_start||''},
    {name:'department',label:sfLeaveT('Department','الإدارة'),value:p.department||''},{name:'section',label:sfLeaveT('Section','القسم'),value:p.section||''},
    {name:'position',label:sfLeaveT('Position','الوظيفة'),value:p.position||''},{name:'annual_days',label:sfLeaveT('Yearly leave days','أيام الإجازة السنوية'),value:String(p.annual_days),required:true}],ok:sfLeaveT('Save','حفظ')});
  if(!v)return;
  if(!/^\d{1,2}$/.test(v.annual_days)||Number(v.annual_days)>60)return sfNotice(sfLeaveError('PROFILE_INVALID'));
  try{await sfLeaveRpc('sf_leave_set_profile',{p_user:userId,p:v})}catch(error){sfNotice(sfLeaveError(error))}
  await sfLeaveLoad();
}
async function sfLeaveHoliday(day){
  let name='';
  if(!day){const v=await sfAskForm({title:sfLeaveT('Add an official holiday','إضافة إجازة رسمية'),note:sfLeaveT('One day per entry; add each day of an Eid separately.','يوم واحد لكل إدخال؛ أضف كل يوم من أيام العيد على حدة.'),fields:[{name:'day',label:sfLeaveT('Date','التاريخ'),type:'date',required:true},{name:'name',label:sfLeaveT('Name','الاسم'),required:true}],ok:sfLeaveT('Add','إضافة')});if(!v)return;day=v.day;name=v.name}
  else if(!(await sfConfirm({title:sfLeaveT('Remove this official holiday?','حذف هذه الإجازة الرسمية؟'),message:sfLeaveDate(day),ok:sfLeaveT('Remove','حذف'),danger:true})))return;
  try{const list=await sfLeaveRpc('sf_leave_set_holiday',{p_day:day,p_name:name});sfLeaveMe.holidays=list||[];sfLeaveRender()}catch(error){sfNotice(sfLeaveError(error))}
}

// ── The printed form: the company's paper layout, Arabic and English, each approval with its name and time ──
function sfLeavePrint(id){
  const r=sfLeaveRows.find(x=>x.id===id);if(!r)return;
  const w=window.open('','_blank');if(!w){sfNotice(sfLeaveT('Allow pop-ups to print.','اسمح بالنوافذ المنبثقة للطباعة.'));return}
  const e=sfLeaveEsc,pr=r.profile||{},span=sfLeaveSpan(r.approved_start||r.start_date,r.approved_end||r.end_date);
  const by=(...actions)=>{const l=[...(r.log||[])].reverse().find(x=>actions.includes(x.action));return l?`${e(l.by)} · ${new Date(l.at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}`:''};
  const box=on=>on?'☑':'☐',t=r.leave_type,rej=r.status==='rejected';
  const cell=(ar,en,v,cls='')=>`<td class="${cls}"><span class="l">${ar}</span><b>${v||'&nbsp;'}</b><span class="l en">${en}</span></td>`;
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${e('طلب إجازة — '+r.name)}</title>
<style>@page{size:A4;margin:12mm}body{font-family:'Tajawal','Inter',Arial,sans-serif;color:#1A1A2E;font-size:12px;margin:0}
.top{display:flex;justify-content:space-between;align-items:center}.top img{height:64px}.title{text-align:center;flex:1}.title h1{margin:0;font-size:20px;text-decoration:underline}.title div{font-weight:700;letter-spacing:.5px}
h2{display:flex;justify-content:space-between;font-size:13px;margin:14px 0 6px}table{width:100%;border-collapse:collapse}td{border:1px solid #333;padding:6px 8px;vertical-align:top}
.l{display:block;font-size:10px;color:#444}.en{direction:ltr;text-align:left}b{display:block;font-size:12px;min-height:14px}.pledge{margin:8px 0;line-height:1.7;font-weight:600}
.sig{display:flex;justify-content:space-between;margin:6px 0;font-weight:600}.muted{color:#555;font-size:10px}</style></head><body>
<div class="top"><div class="title"><h1>طــلب إجـــازة</h1><div>LEAVE APPLICATION</div></div><img src="${location.origin+location.pathname.replace(/[^/]*$/,'')}skyfield-logo.webp" alt=""></div>
<h2><span>يعبأ بواسطة الموظف</span><span dir="ltr">TO BE COMPLETED BY EMPLOYEE</span></h2>
<table><tr>${cell('الرقم الوظيفي','Employee no.',e(r.engineer_id))}${cell('الاسم','Name',e(r.name))}${cell('التاريخ','Date',sfLeaveDate(String(r.created_at).slice(0,10)))}</tr>
<tr>${cell('الإدارة','Department',e(pr.department))}${cell('القسم','Section',e(pr.section))}${cell('الوظيفة','Position',e(pr.position))}</tr>
<tr>${cell('نوع الإجازة','Type of leave',['annual','sick','emergency','unpaid'].map(k=>`${box(t===k)} ${e(SF_LEAVE_TYPES[k][1])}`).join('&nbsp; '))}${cell('تاريخ بداية الإجازة','Leave start date',sfLeaveDate(r.start_date))}${cell('تاريخ نهاية الإجازة','Leave end date',sfLeaveDate(r.end_date))}</tr>
<tr>${cell('عدد أيام الإجازة','No. of leave days',`( ${r.days} ) يوم`)}${cell('العنوان أثناء الإجازة','Contact address during vacation',e(r.address))}${cell('رقم الهاتف','Phone',`<span dir="ltr">${e(r.phone)}</span>`)}</tr>
<tr><td colspan="3"><span class="l">الأسباب / Reasons</span><b>${e(r.reason)}</b></td></tr></table>
<p class="pledge">${r.undertaking===false?'':'☑ '}أتعهد أنا الموقع أدناه بأن أباشر مهام عملي بعد عودتي من الإجازة الممنوحة لي من الشركة وعند تأخري أتحمل كافة الإجراءات النظامية المتبعة في الشركة من فصل وحرمان من الخدمة.</p>
<div class="sig"><span>توقيع طالب الإجازة: ${e(r.name)}</span><span class="muted">${by('submitted')}</span><span dir="ltr">Applicant's signature</span></div>
<h2><span>يعبأ من قبل الرئيس المباشر</span><span dir="ltr">TO BE COMPLETED BY SUPERVISOR</span></h2>
<table><tr><td>${box(!!r.approved_start)} موافق Approved &nbsp; ${box(rej&&r.log?.some(l=>l.action==='rejected'))} غير موافق Not approved</td>
<td>اعتبارًا من: <b>${sfLeaveDate(r.approved_start)}</b> وحتى: <b>${sfLeaveDate(r.approved_end)}</b> ولمدة ( ${r.approved_days??''} ) يوم</td></tr>
<tr><td>البديل / Replacement: ${box(r.replacement_needed===true)} يحتاج Required &nbsp; ${box(r.replacement_needed===false)} لا يحتاج Not required<br>اسم البديل / Replacement name: <b>${e(r.replacement_name)}</b></td>
<td>العهدة يتم تسليمها لـ / Custody handed over to: <b>${e(r.custody_to)}</b><br>ملاحظات: ${e(rej?r.reject_note:r.supervisor_note)}</td></tr>
<tr><td>الرئيس المباشر / Supervisor: <b>${by('supervisor_approved','approved_all')}</b></td><td>&nbsp;</td></tr></table>
<h2><span>يعبأ من قبل إدارة الموارد البشرية</span><span dir="ltr">TO BE COMPLETED BY HUMAN RESOURCES DEPARTMENT</span></h2>
<table><tr>${cell('تاريخ بداية الخدمة','Start date',sfLeaveDate(pr.service_start))}${cell('رصيد الإجازات','Leave credit',r.annual_left!=null?`${r.annual_left} / ${pr.annual_days}`:'')}${cell('تاريخ آخر إجازة','Last leave',sfLeaveDate(r.last_leave))}
${cell('عدد الأيام الممنوحة','Days given',r.approved_days??'')}${cell('تاريخ بداية الإجازة','Leave start date',sfLeaveDate(span.first))}${cell('تاريخ العودة إلى العمل','Date of start work',sfLeaveDate(r.actual_return||sfLeaveReturn(span.last)))}</tr>
<tr><td colspan="6"><span class="l">ملاحظات إدارة الموارد البشرية / Human Resources Remarks</span><b>${e(r.hr_note)}</b>${r.actual_start?`<span class="muted">الإجازة الفعلية: من ${sfLeaveDate(r.actual_start)} والعودة ${sfLeaveDate(r.actual_return)} — ${r.actual_days} يوم</span>`:''}</td></tr>
<tr><td colspan="6">الموارد البشرية / HR: <b>${by('hr_approved','approved_all')}</b></td></tr></table>
<h2><span>إعتماد السيد المدير التنفيذي</span><span dir="ltr">Executive Manager Approval</span></h2>
<table><tr><td>${box(r.status==='approved')} معتمد / Approved: <b>${by('approved','approved_all')}</b>${r.executive_note?`<span class="muted">${e(r.executive_note)}</span>`:''}</td></tr></table>
<p class="muted">${e(sfLeaveT('Approved online in the Sky Field system; each name above is the account that approved the step.','اعتُمد إلكترونيًا في نظام سماء الميدان؛ كل اسم أعلاه هو الحساب الذي وافق على الخطوة.'))}</p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
}

// ── Shell: sidebar entry, access, navigation, language ──
sfUnifiedAllowed=function(route){return route==='leave'?!!sfLeaveMe?.access:sfLeaveBaseAllowed(route)};
async function sfLeaveCheckAccess(){
  sfLeaveMe=null;
  try{const {data,error}=await sfDb.rpc('sf_leave_me');sfLeaveMe=!error&&data?.access?data:null}catch(error){console.warn('Leave access check skipped',error)}
  sfLeaveChecked=true;sfUnifiedApplyAccess();
  if(sfLeaveMe){try{sfLeaveRows=await sfLeaveRpc('sf_leave_list')||[];sfLeaveBadge()}catch(_){}}
  if(sfLeaveWanted&&sfLeaveMe)showTab('leave');
  sfLeaveWanted=false;
}
function sfLeaveTitle(){document.getElementById('app-page-title').textContent=sfLeaveT('Leave requests','طلبات الإجازة');
  document.getElementById('app-page-subtitle').textContent=sfLeaveT('Request leave, approvals, actual dates and balances.','طلب الإجازة والاعتمادات والتواريخ الفعلية والأرصدة.')}
showTab=function(name,button){
  const panel=document.getElementById('sf-leave-panel');
  if(name!=='leave'){if(panel)panel.hidden=true;document.querySelector('.lv-sheet')?.remove();return sfLeaveBaseShow(name,button)}
  if(!sfAuthReady||!sfLeaveChecked){sfLeaveWanted=true;return}
  if(!sfUnifiedAllowed('leave'))return sfLeaveBaseShow('dashboard');
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  for(const id of ['sf-unified-panel','sf-equipment-panel','sf-documents-panel','sf-users-panel']){const el=document.getElementById(id);if(el)el.hidden=true}
  document.getElementById('command-primary-action').hidden=true;panel.hidden=false;
  sfUnifiedRoute='leave';sfUnifiedDesired='leave';document.body.dataset.module='leave';
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module==='leave'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  sfLeaveTitle();sfLeaveRender();void sfLeaveLoad();
  history.replaceState(null,'','#leave');localStorage.setItem('sfLastModule','leave');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});sfUnifiedApplyAccess();
};
sfUnlockApp=function(user){sfLeaveChecked=false;sfLeaveBaseUnlock(user);void sfLeaveCheckAccess()};
sfLockApp=function(clear){sfLeaveMe=null;sfLeaveChecked=false;sfLeaveRows=[];sfLeavePeople=[];sfLeaveTab='';document.querySelector('.lv-sheet')?.remove();const p=document.getElementById('sf-leave-panel');if(p){p.hidden=true;p.innerHTML=''}sfLeaveBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){sfLeaveBaseLanguage(lang,persist);if(sfUnifiedRoute==='leave'&&!document.getElementById('sf-leave-panel').hidden){sfLeaveTitle();sfLeaveRender();if(sfLeaveOpenId)sfLeaveOpen(sfLeaveOpenId)}};
document.addEventListener('click',e=>{
  if(!e.target.closest)return;
  const t=e.target.closest('[data-lv-tab]');if(t){sfLeaveTab=t.dataset.lvTab;sfLeaveRender();return}
  const o=e.target.closest('[data-lv-open]');if(o)return sfLeaveOpen(o.dataset.lvOpen);
  const a=e.target.closest('[data-lv-act]');if(a){if(a.dataset.lvAct==='new')return sfLeaveNew();if(a.dataset.lvAct==='holiday')return void sfLeaveHoliday('')}
  const row=()=>sfLeaveRows.find(x=>x.id===sfLeaveOpenId);
  const d=e.target.closest('[data-lv-decide]');if(d&&row())return void sfLeaveDecide(row(),d.dataset.lvDecide,d.dataset.approve==='1');
  const c=e.target.closest('[data-lv-cancel]');if(c&&row())return void sfLeaveCancel(row());
  const p=e.target.closest('[data-lv-print]');if(p)return sfLeavePrint(p.dataset.lvPrint);
  const rep=e.target.closest('[data-lv-report]');if(rep&&row())return void sfLeaveReport(row());
  const pf=e.target.closest('[data-lv-profile]');if(pf)return void sfLeaveProfile(pf.dataset.lvProfile);
  const h=e.target.closest('[data-lv-holiday-del]');if(h)return void sfLeaveHoliday(h.dataset.lvHolidayDel);
});
document.addEventListener('input',e=>{if(e.target?.id==='sf-leave-search'){sfLeaveSearch=e.target.value;sfLeaveApplySearch()}});

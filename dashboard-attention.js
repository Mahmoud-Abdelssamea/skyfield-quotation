// SKY FIELD — "Needs your attention" on the dashboard: what is waiting for a decision, with a button
// to the page where it is handled. Commercial items come from the data already loaded; attendance
// items (pending approvals, settlement, project locations) are read for attendance administrators
// only and cached for a minute so redrawing the dashboard does not query the database each time.
(function(){
const OVERDUE_DAYS=60,CACHE_MS=60000;
let att={at:0,data:null,busy:null,user:''},expanded=false;
const SHOW=5; // more than SHOW+1 items: show the most urgent SHOW and a "Show more" button
const ar=()=>typeof sfUiLanguage!=='undefined'&&sfUiLanguage==='ar';
const L=(en,a)=>ar()?a:en;
const sar=n=>typeof fmtSAR==='function'?fmtSAR(n):'SAR '+Math.round(n).toLocaleString('en-US');
const sar2=n=>'SAR '+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); // same as the approval page
const esc=s=>typeof escHtml==='function'?escHtml(s):String(s??'');
const daysSince=d=>{const t=Date.parse(String(d||'').slice(0,10)+'T00:00:00');return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):null};
const daysUntil=d=>{const s=daysSince(d);return s===null?null:-s};
const names=list=>esc(list.slice(0,3).join(L(', ','، ')))+(list.length>3?L(` and ${list.length-3} more`,` و${list.length-3} غيرها`):'');
const attendanceAdmin=()=>typeof sfUnifiedProfile!=='undefined'&&sfUnifiedProfile?.role==='admin'&&!(typeof sfAttendanceOnly!=='undefined'&&sfAttendanceOnly)&&typeof sfDb!=='undefined'&&!!sfDb;

function commercialItems(){
 const out=[],ps=typeof projects!=='undefined'?projects:[],costs=typeof sfHasAccess==='function'&&sfHasAccess('payroll');
 // Unpaid invoices and installments issued more than 60 days ago (no due dates are recorded).
 let overdue=0,count=0;
 ps.forEach(p=>(p.payments||[]).forEach(raw=>{const x=sfNormalizePaymentRecord(raw),left=x.amount-x.receivedAmount,age=daysSince(x.date);if(left>0.005&&age!==null&&age>OVERDUE_DAYS){overdue+=left;count++}}));
 (typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():[]).forEach(pi=>{const age=daysSince(pi.issueDate);let t=0;try{t=sfNum(resolvedProformaCalculation(pi).grandTotal)}catch(_){}if(t>0.005&&age!==null&&age>OVERDUE_DAYS){overdue+=t;count++}});
 if(count)out.push({sev:'high',title:L(`${count} unpaid invoice${count>1?'s':''} older than ${OVERDUE_DAYS} days`,`${count} فاتورة غير مدفوعة مضى عليها أكثر من ${OVERDUE_DAYS} يومًا`),detail:L(`${sar(overdue)} still to collect, incl. VAT.`,`${sar(overdue)} لم تُحصَّل بعد، شاملة الضريبة.`),go:'analytics:an-collection',btn:L('Collection','التحصيل')});
 if(costs){
  const fin=ps.filter(p=>p.status!=='completed').map(p=>({p,f:sfProjectFinance(p)}));
  const loss=fin.filter(x=>x.f.hasEstimate&&x.f.expectedProfit<0).sort((a,b)=>a.f.expectedProfit-b.f.expectedProfit);
  if(loss.length)out.push({sev:'high',title:L(`${loss.length} active project${loss.length>1?'s':''} expected to lose money`,`${loss.length} مشروع نشط متوقع أن يخسر`),detail:names(loss.map(x=>`${x.p.name} (${sar(x.f.expectedProfit)})`)),go:'analytics:an-profit',btn:L('Profitability','الربحية')});
  const over=fin.filter(x=>x.f.costOverEstimate&&!loss.includes(x));
  if(over.length)out.push({sev:'mid',title:L(`${over.length} project${over.length>1?'s':''} over estimated cost`,`${over.length} مشروع تجاوز التكلفة المقدّرة`),detail:names(over.map(x=>x.p.name)),go:'analytics:an-profit',btn:L('Profitability','الربحية')});
  const review=typeof sfCommissionReviewItems==='function'?sfCommissionReviewItems().length:0;
  if(review)out.push({sev:'info',title:L(`${review} commission${review>1?'s':''} still calculated on the amount incl. VAT`,`${review} عمولة ما زالت محسوبة على المبلغ شاملًا الضريبة`),detail:L('Review and apply the new calculation on the Projects page.','راجعها وطبّق الحساب الجديد من صفحة المشاريع.'),go:'projects',btn:L('Review','مراجعة')});
  const thisMonth=new Date().toISOString().slice(0,7),drafts=(typeof sfPayrollSheets!=='undefined'?sfPayrollSheets:[]).filter(s=>s.status!=='approved'&&String(s.month||'')<thisMonth);
  if(drafts.length)out.push({sev:'mid',title:L(`${drafts.length} payroll sheet${drafts.length>1?'s':''} from past months not approved`,`${drafts.length} كشف رواتب لشهر سابق غير معتمد`),detail:esc([...new Set(drafts.map(s=>s.month))].sort().join('، ')),go:'payroll',btn:L('Payroll','الرواتب')});
 }
 const loose=typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():[];
 if(loose.length)out.push({sev:'info',title:L(`${loose.length} proforma invoice${loose.length>1?'s':''} not linked to a project`,`${loose.length} فاتورة مبدئية غير مرتبطة بمشروع`),detail:L('Their amounts do not appear in any project. Link them from the invoice card.','مبالغها لا تظهر في أي مشروع. اربطها من بطاقة الفاتورة.'),go:'proformas-unlinked',btn:L('Invoices','الفواتير')});
 return out;
}
function attendanceItems(d){
 const out=[];if(!d)return out;
 if(d.periods)out.push({sev:'mid',title:L(`${d.periods} attendance period${d.periods>1?'s':''} awaiting approval`,`${d.periods} فترة حضور بانتظار الاعتماد`),detail:L(`${d.days} day${d.days>1?'s':''} from ${d.engineers} engineer${d.engineers>1?'s':''}${d.months>1?` across ${d.months} months`:''}. Payroll only counts approved days.`,`${d.days} يوم من ${d.engineers} مهندس${d.months>1?` في ${d.months} شهور`:''}. الرواتب لا تحسب إلا الأيام المعتمدة.`),go:'timesheets-pending',btn:L('Review','مراجعة')});
 if(d.pendingExp)out.push({sev:'mid',title:L(`${d.pendingExp} expense${d.pendingExp>1?'s':''} awaiting approval`,`${d.pendingExp} مصروف بانتظار الاعتماد`),detail:L(`${sar2(d.pendingAmt)} in total.`,`بإجمالي ${sar2(d.pendingAmt)}.`),go:'timesheets',btn:L('Review','مراجعة')});
 if(d.unsettled)out.push({sev:'info',title:L(`${d.unsettled} approved expense${d.unsettled>1?'s':''} not settled`,`${d.unsettled} مصروف معتمد لم يُصفَّ`),detail:L(`${sar2(d.unsettledAmt)} owed to engineers. Export them for accounting from Timesheets & Approvals.`,`${sar2(d.unsettledAmt)} مستحقة للمهندسين. صدّرها للحسابات من التايم شيت والاعتمادات.`),go:'timesheets',btn:L('Open','فتح')});
 if(d.secCards&&d.secCards.length){const n=d.secCards.length,label=x=>x<0?L('expired','منتهية'):x===0?L('today','اليوم'):L(`${x} day${x>1?'s':''}`,`${x} يوم`);
  out.push({sev:d.secCards.some(c=>c.days<=10)?'high':'mid',title:L(`${n} SEC ID card${n>1?'s':''} expiring within 15 days`,`${n} بطاقة SEC تنتهي خلال 15 يومًا`),detail:L('Remind them to send the card to the Qassim office: ','ذكّرهم بإرسال البطاقة إلى مكتب القصيم: ')+names(d.secCards.map(c=>`${c.name} (${label(c.days)})`)),go:'engineers',btn:L('Open engineers','فتح المهندسين')});}
 if(d.iqamas&&d.iqamas.length){const n=d.iqamas.length,label=x=>x<0?L('expired','منتهية'):x===0?L('today','اليوم'):L(`${x} day${x>1?'s':''}`,`${x} يوم`);
  out.push({sev:d.iqamas.some(c=>c.days<=7)?'high':'mid',title:L(`${n} Iqama${n>1?'s':''} expiring within 45 days`,`${n} إقامة تنتهي خلال 45 يومًا`),detail:L('Start the renewal for: ','ابدأ إجراءات التجديد لـ: ')+names(d.iqamas.map(c=>`${c.name} (${label(c.days)})`)),go:'devices',btn:L('Open equipment','فتح الأجهزة')});}
 if(d.noLocation&&d.noLocation.length)out.push({sev:'high',title:L(`${d.noLocation.length} project${d.noLocation.length>1?'s':''} without a location`,`${d.noLocation.length} مشروع بلا موقع`),detail:L('Engineers cannot record site days on: ','لا يستطيع المهندسون تسجيل أيام موقع على: ')+names(d.noLocation),go:'attendancesettings',btn:L('Set location','تحديد الموقع')});
 return out;
}
async function loadAttendance(){
 const all=async(q)=>{const {data,error}=await q;if(error)throw error;return data||[]};
 const [records,pendingExp,unsettled]=await Promise.all([
  all(sfDb.from('sf_daily_records').select('user_id,period_id,day').eq('review','pending').range(0,4999)),
  all(sfDb.from('sf_daily_expenses').select('amount').eq('review','pending').range(0,4999)),
  all(sfDb.from('sf_daily_expenses').select('amount').eq('review','approved').is('settled_at',null).range(0,4999))]);
 const sum=list=>list.reduce((s,r)=>s+(Number(r.amount)||0),0);
 let noLocation=null;
 try{ // needs 13-attendance-project-location-v14.sql; quietly skipped before it is run
  const [vis,prj]=await Promise.all([all(sfDb.from('sf_daily_project_visibility').select('project_id')),all(sfDb.from('sf_daily_projects').select('id,name,location'))]);
  const shown=new Set(vis.map(v=>String(v.project_id)));noLocation=prj.filter(p=>shown.has(String(p.id))&&!p.location).map(p=>p.name||p.id);
 }catch(_){}
 let secCards=null;
 try{ // needs 24-sec-card-reminders.sql; quietly skipped before it is run
  const limit=new Date(Date.now()+15*86400000).toISOString().slice(0,10);
  const cards=await all(sfDb.from('sf_daily_members').select('name,sec_card_expiry').eq('role','engineer').eq('is_active',true).not('sec_card_expiry','is',null).lte('sec_card_expiry',limit).order('sec_card_expiry'));
  secCards=cards.map(c=>({name:c.name,days:daysUntil(c.sec_card_expiry)})).filter(c=>c.days!==null&&c.days<=15);
 }catch(_){}
 let iqamas=null;
 try{ // the equipment records (eq_recipients) hold the Iqama dates; only equipment members can read them
  const limit=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
  const people=await all(sfDb.from('eq_recipients').select('name,iqama_expiry').not('iqama_expiry','is',null).lte('iqama_expiry',limit).order('iqama_expiry'));
  iqamas=people.map(c=>({name:c.name,days:daysUntil(c.iqama_expiry)})).filter(c=>c.days!==null&&c.days<=45);
 }catch(_){}
 const months=[...new Set(records.map(r=>String(r.day).slice(0,7)))].sort();
 return{periods:new Set(records.map(r=>r.user_id+'|'+(r.period_id||r.day))).size,days:records.length,engineers:new Set(records.map(r=>r.user_id)).size,months:months.length,oldestMonth:months[0]||'',
  pendingExp:pendingExp.length,pendingAmt:sum(pendingExp),unsettled:unsettled.length,unsettledAmt:sum(unsettled),noLocation,secCards,iqamas};
}
function draw(){
 const root=document.getElementById('dash-attention');if(!root)return;
 const admin=attendanceAdmin(),items=[...attendanceItems(admin?att.data:null),...commercialItems()];
 const order={high:0,mid:1,info:2};items.sort((a,b)=>order[a.sev]-order[b.sev]);
 const loading=admin&&!att.data&&att.busy?`<div class="attn-loading">${L('Checking attendance and expenses…','جاري التحقق من الحضور والمصروفات…')}</div>`:'';
 const failed=admin&&att.error?`<div class="attn-loading">${L('Attendance could not be checked right now.','تعذر التحقق من الحضور الآن.')}</div>`:'';
 root.innerHTML=`<div class="dash-panel dash-attn"><div class="dash-panel-hdr"><h3>${L('Needs your attention','يحتاج انتباهك')}</h3>${items.length?`<span class="attn-count">${items.length}</span>`:''}</div>
  <div class="attn-list">${(expanded||items.length<=SHOW+1?items:items.slice(0,SHOW)).map(x=>`<div class="attn-item sev-${x.sev}"><div class="attn-text"><strong>${x.title}</strong><span>${x.detail}</span></div><button type="button" class="attn-go" data-attn-go="${esc(x.go)}">${esc(x.btn)}</button></div>`).join('')}
  ${!expanded&&items.length>SHOW+1?`<button type="button" class="attn-more" data-attn-more="1">${L(`Show ${items.length-SHOW} more`,`عرض ${items.length-SHOW} أخرى`)}</button>`:''}${!items.length&&!loading?`<div class="attn-ok">✓ ${L('Nothing needs your attention right now.','لا يوجد ما يحتاج انتباهك الآن.')}</div>`:''}${loading}${failed}</div></div>`;
}
function go(target){
 const open=m=>showTab(m,document.querySelector(`.side-nav-btn[data-module="${m}"]`));
 const [page,anchor]=target.split(':');
 // Pending periods: open the approvals on the oldest month that still has some.
 if(page==='timesheets-pending'){try{if(att.data?.oldestMonth)sessionStorage.setItem('sfApprovalMonth',att.data.oldestMonth)}catch(e){}open('timesheets');return}
 if(page==='proformas-unlinked'){open('proformas');const f=document.getElementById('if-project');if(f&&[...f.options].some(o=>o.value==='__none')){f.value='__none';renderProformas()}return}
 open(page);
 if(anchor)setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),400);
}
document.addEventListener('click',e=>{if(!e.target.closest)return;const b=e.target.closest('[data-attn-go]');if(b)return go(b.dataset.attnGo);if(e.target.closest('[data-attn-more]')){expanded=true;draw()}});
// Sidebar counter on "Timesheets & Approvals": periods + expenses waiting for approval (attendance administrators).
function badge(){
 const btn=document.querySelector('.side-nav-btn[data-module="timesheets"]');if(!btn)return;
 let el=document.getElementById('side-approval-count');
 if(!el){el=document.createElement('span');el.id='side-approval-count';el.className='side-nav-count side-nav-alert';btn.appendChild(el)}
 const d=attendanceAdmin()?att.data:null,n=d?(d.periods||0)+(d.pendingExp||0):0;
 el.textContent=n;el.hidden=!n;el.title=n?L(`${d.periods} period(s) and ${d.pendingExp} expense(s) awaiting approval`,`${d.periods} فترة و${d.pendingExp} مصروف بانتظار الاعتماد`):'';
}
function refreshAttendance(maxAge){
 if(!attendanceAdmin()){badge();return}
 const user=typeof sfCurrentUser!=='undefined'&&sfCurrentUser?.id||'';
 if(att.user!==user)att={at:0,data:null,busy:null,user};
 if(att.busy||Date.now()-att.at<maxAge)return;
 att.busy=loadAttendance().then(d=>{if(att.user!==user)return;att.data=d;att.error=null}).catch(err=>{if(att.user===user)att.error=err}).finally(()=>{if(att.user!==user)return;att.at=Date.now();att.busy=null;draw();badge()});
}
window.sfRenderAttention=function(){draw();refreshAttendance(CACHE_MS);draw()};
window.sfAttentionInvalidate=function(){att.at=0};
// The approvals screen reports changes at once; otherwise the counter is refreshed every 45 seconds.
window.sfApprovalsChanged=function(){att.at=0;refreshAttendance(0)};
setInterval(()=>{if(document.visibilityState==='visible')refreshAttendance(40000)},45000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshAttendance(40000)});
})();

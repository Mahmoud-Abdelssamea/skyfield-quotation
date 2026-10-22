'use strict';
const translations={'عمل بالموقع':'Site work','باستثناء الجمعة':'Excludes Friday','كود الموظف يجب أن يكون من 6 إلى 40 رقمًا.':'Employee code must contain 6 to 40 digits.',"الحضور والمصروفات": "Attendance & expenses", "النظام الرئيسي ←": "Main system →", "دخول المهندس أو الإدارة": "Engineer / administrator sign in", "كود الموظف": "Employee code", "كلمة المرور": "Password", "تسجيل الدخول": "Sign in", "الدوام الافتراضي 08:00 — 16:00": "Standard working day 08:00 — 16:00", "تسجيل الخروج": "Sign out", "تسجيل اليوم": "Daily attendance", "التاريخ": "Date", "حالة اليوم": "Day status", "المكتب — بدون بدل موقع": "Office — no site allowance", "موقع داخل الرياض": "Site inside Riyadh", "موقع خارج الرياض": "Site outside Riyadh", "إجازة": "Leave", "غياب": "Absent", "المشروع": "Project", "نوع الإجازة": "Leave type", "سنوية": "Annual", "مرضية": "Sick", "طارئة": "Emergency", "يوجد أوفر تايم": "Add overtime", "ساعات إضافية": "Overtime hours", "ملاحظات": "Notes", "إرسال الحضور للاعتماد": "Submit attendance for approval", "طلب تعويض مصروف": "Expense reimbursement", "سجّل الفاتورة مرة واحدة. بدل السكن وتعويض فاتورة السكن لنفس الفترة يحتاجان مراجعة الإدارة قبل الاعتماد.": "Submit each invoice once. Housing allowance and housing invoice for the same period require administrator review.", "المشروع / مصروف عام": "Project / general expense", "نوع المصروف": "Expense type", "فاتورة سكن": "Housing invoice", "بدل سكن": "Housing allowance", "بنزين": "Fuel", "انتقالات": "Transport", "بدل إضافي": "Additional allowance", "أخرى": "Other", "المبلغ — ريال": "Amount — SAR", "السبب / الفترة / رقم الفاتورة": "Reason / period / invoice number", "فاتورة إلزامية — PDF / JPG / PNG حتى 5MB": "Required invoice — PDF / JPG / PNG up to 5MB", "إرسال المصروف للاعتماد": "Submit expense for approval", "إعدادات الإدارة": "Administrator settings", "اسم المهندس": "Engineer name", "كلمة مرور مؤقتة": "Temporary password", "إنشاء حساب مهندس": "Create engineer account", "معرّف حساب Supabase": "Supabase account ID", "كود المهندس بالنظام": "Engineer code in main system", "بدل داخل الرياض / يوم": "Daily allowance inside Riyadh", "بدل خارج الرياض / يوم": "Daily allowance outside Riyadh", "سعر الساعة الإضافية": "Overtime hourly rate", "حفظ المهندس والبدلات": "Save engineer and rates", "القيم تطبق على التسجيلات الجديدة؛ التسجيل السابق يحتفظ بقيمته.": "Rates apply to new entries. Existing entries retain their original amounts.", "السجل الشهري والاعتمادات": "Monthly records & approvals", "الشهر": "Month", "تحديث": "Refresh", "تصدير CSV لـ Excel": "Export CSV for Excel", "المهندس / التاريخ": "Engineer / date", "البند": "Item", "المبلغ / ريال": "Amount / SAR", "الحالة": "Approval", "التصفية": "Settlement", "إجراءات": "Actions", "المكتب": "Office", "داخل الرياض": "Inside Riyadh", "خارج الرياض": "Outside Riyadh", "بانتظار الاعتماد": "Pending approval", "معتمد": "Approved", "مرفوض": "Rejected", "تمت التصفية": "Settled", "لم تتم التصفية": "Unsettled", "تصفية كاملة": "Settle in full", "الفاتورة مطلوبة": "Invoice is required", "تم إنشاء حساب المهندس": "Engineer account created", "بدون مشروع / مصروف عام": "No project / general expense", "عرض الإيصال": "View invoice", "اعتماد": "Approve", "رفض": "Reject", "عام": "General", "لا توجد سجلات لهذا الشهر": "No records for this month", "تم الحفظ وإرسال الطلب للاعتماد.": "Saved and submitted for approval."};
Object.assign(translations,{"بوابة المهندسين": "Engineer portal", "سجّل يومك وتابع طلباتك في مكان واحد.": "Record your day and track your requests in one place.", "إضافة مصروف": "Add an expense", "حدد المربع لإدخال المبلغ والسبب ورفع الفاتورة.": "Select to enter an amount, reason and invoice.", "المشاريع المتاحة للمهندسين": "Projects available to engineers", "حدد المشاريع التي تظهر في قوائم الحضور والمصروفات لجميع المهندسين، ثم احفظ الاختيار.": "Choose the projects shown in attendance and expense lists for all engineers, then save.", "لإضافة مشروع جديد، أضفه في النظام الرئيسي ثم اضغط «مزامنة الحضور والمشاريع» أسفل القائمة الجانبية.": "Add new projects in the main system, then press “Sync attendance & projects” at the bottom of the sidebar.", "بحث عن مشروع": "Search projects", "تحديد الكل": "Select all", "إلغاء التحديد": "Clear selection", "حفظ المشاريع المختارة": "Save selected projects", "اختر المشروع": "Choose a project", "لا توجد مشاريع متاحة حاليًا. اطلب من الإدارة تحديد المشاريع.": "No projects are available. Ask your administrator to select projects.", "لا توجد مشاريع. زامن المشاريع من النظام الرئيسي أولًا.": "No projects found. Sync projects from the main system first.", "تم حفظ المشاريع المختارة.": "Selected projects saved.", "حدد مشروعًا متاحًا من القائمة.": "Select an available project from the list.", "تم تسجيل حضورك لهذا اليوم بالفعل.": "Your attendance has already been recorded for this date."});
Object.assign(translations,{"بوابة المهندسين — سجّل حضورك ومصروفاتك وتابع التايم شيت من مكان واحد.": "Engineer portal — record attendance, expenses and track your timesheet in one place.", "حضور بفترات وتوزيع على المشاريع": "Date ranges across multiple projects", "متابعة المصروفات والاعتمادات": "Track expenses and approvals", "تصدير التايم شيت إلى Excel": "Export your timesheet to Excel", "أدخل كود الموظف وكلمة المرور لفتح حسابك.": "Enter your employee code and password to open your account.", "كود الموظف أو البريد الإلكتروني": "Employee code or email", "بيانات الدخول يصدرها مسؤول النظام. تواصل معه إذا نسيت كلمة المرور.": "Your administrator provides your sign-in details. Contact them if you forget your password.", "الدخول إلى النظام الرئيسي": "Open the main system", "سجّل فترات العمل وتابع الحضور والمصروفات في مكان واحد.": "Record work periods and track attendance and expenses in one place.", "حدد الفترة والمشروع واضغط إضافة. كل فترة تظهر في سطر واحد أسفل النموذج.": "Select dates and a project, then add. Each period appears as one row below.", "تحديث الفترات": "Refresh periods", "إضافة فترة حضور": "Add an attendance period", "من تاريخ": "From date", "إلى تاريخ": "To date", "حالة الحضور": "Attendance status", "إضافة الفترة": "Add period", "حفظ التعديل": "Save changes", "إلغاء التعديل": "Cancel edit", "تعديل فترة الحضور": "Edit attendance period", "تعديل الفترة يعيد إرسالها للاعتماد.": "Editing resubmits the period for approval.", "الإضافة تحفظ الفترة وترسلها للاعتماد. لا يمكن تكرار نفس اليوم. من يوم 24 يمكن تسجيل بقية الشهر مقدمًا، ومعها الإضافي المتوقع، والإدارة تعتمده أو ترفضه.": "Adding saves the period and submits it for approval. Duplicate days are not allowed. From the 24th, the rest of the month can be submitted in advance with the expected overtime, for the administration to approve or reject.", "الفترات المسجلة": "Recorded periods", "يمكن تعديل الفترة أو مسحها قبل الاعتماد. الفترة التي تحتوي أيامًا معتمدة تكون مقفولة.": "Edit or delete a period before approval. Periods containing approved days are locked.", "الفترة": "Period", "المشروع / الحالة": "Project / status", "عدد الأيام": "Days", "إضافي / يوم": "OT / day", "الاعتماد": "Approval", "تنزيل Excel Timesheet": "Download Excel Timesheet", "خيارات التايم شيت": "Timesheet options", "حالة التصدير": "Export status", "ملف شهري واحد يشمل مشاريعك؛ تفاصيل الأيام تظهر داخل Excel. تصدير كل الحالات يحمل علامة مسودة.": "One monthly file includes all your projects with daily details in Excel. All-status exports are marked DRAFT.", "باستثناء الجمعة والسبت": "Excludes Friday and Saturday", "اعتماد جزئي": "Mixed review status", "مقفولة — بها أيام معتمدة": "Locked — contains approved days", "تعديل": "Edit", "مسح": "Delete", "غير متاح": "Unavailable", "يوم مسجل": "recorded days", "ساعة إضافية": "overtime hours", "أيام": "days", "فترة": "periods", "لا توجد فترات مسجلة. أضف أول فترة من النموذج أعلاه.": "No recorded periods. Add your first period above.", "جاري تحميل الفترات…": "Loading periods…", "حدد فترة صحيحة داخل الشهر المختار.": "Select a valid period within the selected month.", "لا يمكن تسجيل أيام مستقبلية، إلا من يوم 24 حتى نهاية الشهر الحالي.": "Future days are not allowed, except from the 24th up to the end of the current month.", "لا يمكن تسجيل ساعات إضافية لأيام لم تأتِ بعد. سجّل الأيام القادمة في فترة منفصلة بدون إضافي.": "Overtime cannot be entered for days that have not happened yet. Record the coming days in a separate period without overtime.", "تشمل أيامًا لم تأتِ بعد": "Includes days not yet worked", "حتى": "until", "الإضافي فيها متوقع وليس فعليًا": "its overtime is expected, not actual", "الفترة لا تحتوي أيامًا بعد استثناء الجمعة.": "No days remain after excluding Friday.", "الملاحظات بحد أقصى 2000 حرف.": "Notes are limited to 2,000 characters.", "لديك تغييرات لم تحفظ. هل تريد تركها؟": "You have unsaved changes. Discard them?", "هل تريد مسح الفترة بالكامل؟": "Delete the entire period?", "الفترة تتداخل مع حضور مسجل. اختر تواريخ أخرى.": "This period overlaps existing attendance. Choose other dates.", "يلزم تشغيل ملف attendance-friday-v8.sql في Supabase لتفعيل الفترات والتعديل والمسح.": "Run attendance-friday-v8.sql in Supabase to enable periods, editing and deletion.", "الفترة تتداخل مع حضور مسجل. لم يتم تغيير أي سجل؛ اضغط تحديث وراجع التواريخ.": "This period overlaps recorded attendance. Nothing was changed; refresh and check the dates.", "تغيرت الفترة أو تم اعتمادها. لم يتم تغيير أي سجل؛ اضغط تحديث قبل المحاولة مجددًا.": "The period changed or was approved. Nothing was changed; refresh before trying again.", "تم الحفظ، لكن تعذر تحديث العرض. اضغط تحديث قبل إجراء تغييرات أخرى.": "Saved, but the view could not refresh. Refresh before making further changes.", "تم مسح الفترة.": "Period deleted.", "تم حفظ التعديل وإعادة إرسال الفترة للاعتماد.": "Changes saved and period resubmitted for approval.", "تمت إضافة الفترة وإرسالها للاعتماد.": "Period added and submitted for approval."});
Object.assign(translations,{"قائمة المهندسين": "Engineer list", "إضافة مهندس": "Add engineer", "بحث بالاسم أو الكود": "Search by name or code", "إغلاق": "Close", "كلمة المرور — 6 أرقام أو أكثر": "Password — 6 or more digits", "تغيير كلمة مرور المهندس": "Change engineer password", "كلمة المرور الجديدة — 6 أرقام أو أكثر": "New password — 6 or more digits", "حفظ كلمة المرور الجديدة": "Save new password", "الحذف يوقف حساب المهندس ويزيله من القائمة النشطة، مع حفظ الحضور والمصروفات السابقة في التقارير.": "Removing an engineer disables their attendance account and removes them from active lists. Historical attendance and expenses remain in reports.", "كود الدخول ثابت. القيم تطبق على التسجيلات الجديدة؛ التسجيل السابق يحتفظ بقيمته.": "The login code is fixed. Rates apply to new records; existing records retain their amounts.", "اختر مهندسًا نشطًا.": "Select an active engineer.", "أدخل قيمًا صحيحة للبدلات.": "Enter valid allowance rates.", "المهندس غير متاح للتعديل. حدّث القائمة.": "The engineer is no longer available for editing. Refresh the list.", "كلمة المرور يجب أن تكون 6 أرقام على الأقل (0–9).": "Password must contain at least 6 digits (0–9).", "تم حفظ بيانات المهندس.": "Engineer details saved.", "لا يوجد مهندسون مطابقون للبحث.": "No engineers match your search.", "حذف المهندس": "Remove engineer", "سيتم إيقاف حساب المهندس وحذفه من القائمة النشطة مع الاحتفاظ بسجلاته السابقة. هل تريد المتابعة؟": "This disables the attendance account and removes it from active lists, keeping historical records. Continue?", "تم حذف المهندس من القائمة وإيقاف حسابه. سجلاته السابقة محفوظة.": "Engineer removed and attendance account disabled. Historical records are retained.", "تم تغيير كلمة مرور المهندس.": "Engineer password changed.", "الحساب غير متاح أو تم إيقافه. تواصل مع الإدارة.": "This attendance account is unavailable or disabled. Contact your administrator."});
let language=localStorage.getItem('sf-language')||'ar';
function tr(s){return language==='en'?(translations[s]||s):s}
const originals=new WeakMap();
function translateUI(){document.documentElement.lang=language;document.documentElement.dir=language==='en'?'ltr':'rtl';for(const node of document.querySelectorAll('.sf-auth-card,.auth-brand-content'))node.dir=document.documentElement.dir;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(['SCRIPT','STYLE'].includes(n.parentElement?.tagName))continue;const original=originals.get(n)||n.textContent;originals.set(n,original);const trimmed=original.trim();if(translations[trimmed])n.textContent=original.replace(trimmed,tr(trimmed));}}

const db=window.supabase.createClient('https://kmcgnttunukbwsqyilcv.supabase.co','sb_publishable_yWyzQzP3IWu0pNzEBDbLNg_sLgr4VJC');
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let me, members=[], projects=[], records=[];
let selectedProjectIds=new Set(), projectVisibilityReady=false;
let teamLoadRequest=0,teamLoadError='',teamLoadedMonth='';
const teamReviewBusy=new Set();
let teamApprovalMode='mine',teamApprovalData={projects:[],members:[],records:[]},teamGroups=[],teamRejectKey='',teamLoading=false;

const labels={office:'المكتب',inside:'داخل الرياض',outside:'خارج الرياض',leave:'إجازة',absent:'غياب',housing_invoice:'فاتورة سكن',housing_allowance:'بدل سكن',fuel:'بنزين',transport:'انتقالات',extra:'بدل إضافي',other:'أخرى',pending:'بانتظار الاعتماد',approved:'معتمد',rejected:'مرفوض'};
function message(s){for(const id of ['message','loginMessage']){$(id).textContent=tr(s);$(id).hidden=!s;}}
async function checked(q){const r=await q;if(r.error)throw r.error;return r.data;}
async function run(fn){try{await fn()}catch(e){const msg=e.code==='23505'&&String(e.message).includes('sf_daily_records_user_id_day_key')?tr('تم تسجيل حضورك لهذا اليوم بالفعل.'):(language==='en'?'Unable to complete: ':'لم تتم العملية: ')+e.message;message(msg)}}
// From day 24, attendance may be recorded up to the month end. The server decides (SQL 11); until it is
// installed, or if the call fails, the limit stays today.
let lastAllowedDay=null;
async function loadAllowedDay(){try{const d=String(await checked(db.rpc('sf_attendance_last_allowed_day'))||'');lastAllowedDay=/^\d{4}-\d{2}-\d{2}$/.test(d)?d:null}catch(error){lastAllowedDay=null}}
function allowedUntil(){const t=today();return lastAllowedDay&&lastAllowedDay>t&&lastAllowedDay.slice(0,7)===t.slice(0,7)?lastAllowedDay:t}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
// SEC ID card reminder shown to the engineer from 15 days before expiry (red from 10 days and after expiry).
function secCardNotice(expiry,day=today()){
 if(!expiry)return null;const days=Math.round((Date.parse(expiry+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000);
 if(!Number.isFinite(days)||days>15)return null;
 const date=new Date(expiry+'T00:00:00Z').toLocaleDateString(language==='en'?'en-GB':'ar-SA-u-nu-latn',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 const text=language==='en'
  ?(days<0?`Your SEC ID card expired on ${date}. Please send it to the Qassim office for renewal now.`:days===0?`Your SEC ID card expires today (${date}). Please send it to the Qassim office for renewal.`:`Your SEC ID card expires on ${date} (in ${days} day${days===1?'':'s'}). Please send it to the Qassim office for renewal.`)
  :(days<0?`انتهت بطاقة SEC الخاصة بك في ${date}. يرجى إرسالها إلى مكتب القصيم للتجديد الآن.`:days===0?`تنتهي بطاقة SEC الخاصة بك اليوم (${date}). يرجى إرسالها إلى مكتب القصيم للتجديد.`:`تنتهي بطاقة SEC الخاصة بك في ${date} (بعد ${days} ${days===1?'يوم':'أيام'}). يرجى إرسالها إلى مكتب القصيم للتجديد.`);
 return {days,urgent:days<=10,text};
}
function renderSecCardBanner(){const el=$('secCardBanner');if(!el)return;const notice=me?.role==='engineer'?secCardNotice(me.sec_card_expiry):null;el.hidden=!notice;el.textContent=notice?notice.text:'';el.classList.toggle('urgent',!!notice?.urgent)}
function showPortal(ready){$('login').hidden=ready;$('app').hidden=!ready;document.body.classList.toggle('signed-out',!ready);}
async function load(){
 showPortal(false);me=null;
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;if(!session)return;
 const member=await checked(db.from('sf_daily_members').select('*').eq('user_id',session.user.id).maybeSingle());
 if(!member||member.is_active===false){message('الحساب غير متاح أو تم إيقافه. تواصل مع الإدارة.');return;}
 me=member;
 if(me.role==='accountant'){
  members=[me];projects=[];$('who').textContent=me.name;$('tabAdmin').hidden=true;$('adminNav').hidden=true;
  syncLeaderTabAccess();showPortal(true);window.sfAccountingInit?.();setAttendanceView('accountingSection',false);
  if(window.sfEmbeddedLoaded)window.sfEmbeddedLoaded();return;
 }
 members=await checked(db.from('sf_daily_members').select('*'));projects=await checked(db.from('sf_daily_projects').select('*').order('name'));
 syncLeaderTabAccess();
 $('who').textContent=me.name;$('tabAdmin').hidden=me.role!=='admin';$('adminNav').hidden=me.role!=='admin';
 await loadProjectVisibility();showPortal(true);renderSecCardBanner();placeExportTools();setAttendanceView(window.sfEmbeddedInitialPanel||'dailySection',false);
 const form=$('expenseForm');form.elements.day.value=today();form.elements.day.max=today();populateProjectSelect(form);
 $('month').value=today().slice(0,7);
 window.sfAccountingInit?.();renderEngineerList();
 renderProjectChoices();renderTimesheetControls();await loadAllowedDay();await loadAttendanceMonth();await refresh();if(window.sfEmbeddedLoaded)window.sfEmbeddedLoaded();
}
async function allRows(table,start,end){let result=[];for(let offset=0;;offset+=500){const batch=await checked(db.from(table).select('*').gte('day',start).lt('day',end).order('day').order('id').range(offset,offset+499));result.push(...batch);if(batch.length<500)return result}}
let approvalType='attendance',approvalFiltersReady=false,reviewRequest=0;
// People shown in engineer lists: active engineers plus anyone with attendance this month (never accountants).
function approvalPeople(){
 const withDays=new Set(records.filter(r=>r.table==='sf_daily_records').map(r=>r.user_id));
 return members.filter(m=>m.role!=='accountant'&&((m.role==='engineer'&&m.is_active!==false)||withDays.has(m.user_id))).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
function renderApprovalFilters(){
 const select=$('approvalEngineer'),old=select.value,list=me.role==='admin'?approvalPeople():members.filter(m=>m.user_id===me.user_id);
 const overviewTab=document.querySelector('[data-approval-type="overview"]');if(overviewTab)overviewTab.hidden=me.role!=='admin';
 select.innerHTML=(me.role==='admin'?`<option value="all">${esc(tr('كل المهندسين'))}</option>`:'')+list.map(m=>`<option value="${esc(m.user_id)}">${esc(m.name)} — ${esc(m.engineer_id)}</option>`).join('');
 select.value=list.some(m=>m.user_id===old)?old:me.role==='admin'?'all':me.user_id;
 if(!approvalFiltersReady){$('approvalState').value=me.role==='admin'?'pending':'all';approvalFiltersReady=true;}
  syncApprovalExportEngineer();
 if(window.sfAccountingExportSync)window.sfAccountingExportSync();
}
function filteredApprovalRecords(){
 const table=approvalType==='expenses'?'sf_daily_expenses':'sf_daily_records',engineer=$('approvalEngineer').value,state=$('approvalState').value;
 return records.map((r,i)=>({r,i})).filter(({r})=>r.table===table&&(engineer==='all'||r.user_id===engineer)&&(state==='all'||r.review===state));
}
function syncApprovalExportEngineer(){const engineer=$('approvalEngineer').value;if(engineer&&engineer!=='all')$('timesheetEngineer').value=engineer;}
function setApprovalType(type){
 approvalType=type==='expenses'||type==='overview'?type:'attendance';
 for(const button of document.querySelectorAll('[data-approval-type]'))button.setAttribute('aria-pressed',String(button.dataset.approvalType===approvalType));
 const overview=approvalType==='overview';$('teamOverview').hidden=!overview;$('summary').hidden=overview;$('rows').closest('.scroll').hidden=overview;
 const filters=document.querySelector('#monthlySection .approval-filters');if(filters)filters.hidden=overview;
 $('timesheetExportPanel').hidden=approvalType==='expenses';renderApprovalTable();
}
// ── Team overview: engineers × days of the month ───────────────────────────
// approved / pending / rejected from the recorded day; a past working day without a record is missing.
// Fridays and days still to come are never counted as missing.
function teamOverview(people,days,month,todayIso){
 const [y,n]=month.split('-').map(Number),count=new Date(Date.UTC(y,n,0)).getUTCDate();
 const dates=Array.from({length:count},(_,i)=>{const d=new Date(Date.UTC(y,n-1,i+1));return{iso:d.toISOString().slice(0,10),day:i+1,friday:d.getUTCDay()===5}});
 const byKey=new Map(days.map(r=>[r.user_id+'|'+r.day,r]));
 const rows=people.map(person=>{const totals={approved:0,pending:0,rejected:0,missing:0};
  const cells=dates.map(d=>{const r=byKey.get(person.user_id+'|'+d.iso);
   if(r){const state=r.review==='approved'?'approved':r.review==='rejected'?'rejected':'pending';totals[state]++;return{...d,state,kind:r.status}}
   if(d.iso>todayIso)return{...d,state:'future'};
   if(d.friday)return{...d,state:'friday'};
   totals.missing++;return{...d,state:'missing'}});
  return{person,cells,totals}});
 return{dates,rows,missingPeople:rows.filter(r=>r.totals.missing>0).length,missingDays:rows.reduce((t,r)=>t+r.totals.missing,0),pendingDays:rows.reduce((t,r)=>t+r.totals.pending,0)};
}
function renderTeamOverview(){
 if(me?.role!=='admin')return;const month=$('month').value;if(!/^\d{4}-\d{2}$/.test(month))return;
 const ov=teamOverview(approvalPeople(),records.filter(r=>r.table==='sf_daily_records'),month,today());
 const letters=language==='en'?{inside:'S',outside:'S',office:'O',leave:'L',absent:'A'}:{inside:'م',outside:'م',office:'ك',leave:'ج',absent:'غ'};
 const wd=language==='en'?['Su','Mo','Tu','We','Th','Fr','Sa']:['أح','إث','ثل','أر','خم','جم','سب'];
 const state={approved:tr('معتمد'),pending:tr('بانتظار الاعتماد'),rejected:tr('مرفوض'),missing:tr('غير مسجّل'),friday:tr('جمعة'),future:tr('لم يأتِ بعد')};
 $('teamOverviewSummary').textContent=language==='en'
  ?`${ov.rows.length} engineers · ${ov.missingPeople} with missing days (${ov.missingDays} days) · ${ov.pendingDays} days awaiting approval`
  :`${ov.rows.length} مهندس · ${ov.missingPeople} لديهم أيام غير مسجّلة (${ov.missingDays} يوم) · ${ov.pendingDays} يوم بانتظار الاعتماد`;
 const head=`<thead><tr><th class="ov-name">${esc(tr('المهندس'))}</th>${ov.dates.map(d=>`<th class="${d.friday?'ov-fri':''}"><span>${d.day}</span><small>${esc(wd[new Date(d.iso+'T00:00:00Z').getUTCDay()])}</small></th>`).join('')}<th class="ov-total" title="${esc(tr('معتمد'))}">✓</th><th class="ov-total" title="${esc(tr('بانتظار الاعتماد'))}">…</th><th class="ov-total" title="${esc(tr('غير مسجّل'))}">✕</th></tr></thead>`;
 const body=ov.rows.map(r=>`<tr><th class="ov-name"><button type="button" class="ov-person" data-ov-user="${esc(r.person.user_id)}" title="${esc(tr('عرض فترات هذا المهندس'))}">${esc(r.person.name)}</button><small>${esc(r.person.engineer_id)}</small></th>${r.cells.map(c=>`<td class="ov-cell ${c.state}" title="${esc(c.iso+' · '+state[c.state]+(c.kind?' · '+tr(labels[c.kind]||c.kind):''))}">${c.kind?esc(letters[c.kind]||''):''}</td>`).join('')}<td class="ov-total ok">${r.totals.approved}</td><td class="ov-total wait">${r.totals.pending}</td><td class="ov-total miss">${r.totals.missing}</td></tr>`).join('');
 $('teamOverviewTable').innerHTML=head+`<tbody>${body||`<tr><td class="empty-state">${esc(tr('لا يوجد مهندسون.'))}</td></tr>`}</tbody>`;
}
// ── Summary cards above the approvals (administrators) ──
function renderApprovalCards(){
 const box=$('approvalCards');if(!box)return;box.hidden=me?.role!=='admin';if(box.hidden)return;
 const days=records.filter(r=>r.table==='sf_daily_records'),pendingDays=days.filter(r=>r.review==='pending'),pendingExp=records.filter(r=>r.table==='sf_daily_expenses'&&r.review==='pending');
 const periods=new Set(pendingDays.map(r=>r.user_id+'|'+(r.period_id||r.day))).size,month=$('month').value;
 const ov=/^\d{4}-\d{2}$/.test(month)?teamOverview(approvalPeople(),days,month,today()):{missingPeople:0,missingDays:0};
 const card=(key,label,value,sub,tone)=>`<button type="button" class="ap-card ${tone}" data-ap-card="${key}"><span>${esc(label)}</span><b>${esc(String(value))}</b><small>${esc(sub)}</small></button>`;
 box.innerHTML=card('periods',tr('فترات بانتظار الاعتماد'),periods,language==='en'?`${pendingDays.length} days`:`${pendingDays.length} يوم`,periods?'warn':'')
  +card('expenses',tr('مصروفات بانتظار الاعتماد'),pendingExp.length,`${money(pendingExp.reduce((t,r)=>t+Number(r.amount||0),0))} ${tr('ريال')}`,pendingExp.length?'warn':'')
  +card('missing',tr('أيام غير مسجّلة'),ov.missingDays,language==='en'?`${ov.missingPeople} engineers · Fridays not counted`:`${ov.missingPeople} مهندس · بدون أيام الجمعة`,ov.missingDays?'alert':'');
}
// ── Export tools: below the list for administrators, closed until needed ──
function placeExportTools(){
 const box=$('exportTools');if(!box||me?.role!=='admin')return;
 for(const id of ['timesheetExportPanel','accountingExportPanel']){const panel=document.getElementById(id);if(panel&&panel.parentElement!==box){box.appendChild(panel);panel.open=false}}
 box.hidden=false;
}
// ── Timesheet approval by period ───────────────────────────────────────────
// Administrators review the periods engineers submitted, not individual days. Each period shows the money it
// adds to its project: site allowance + overtime as recorded, and the salary share computed with the same
// formula as the project-cost sync (package ÷ standard days × site days, capped per engineer and month).
let salaryInfo=null,reviewHistory=[],approvalGroups=[],rejectingPeriod='',selectedPeriods=new Set(),bulkApproving=false;
// Bulk approval: pending periods only; each period is approved on its own with the same change check.
const bulkSelectable=g=>g&&(g.review==='pending'||g.review==='mixed');
function renderPeriodBulkBar(){
 const bar=$('periodBulkBar');if(!bar)return;const admin=me?.role==='admin'&&approvalType==='attendance';
 for(const key of [...selectedPeriods])if(!approvalGroups.some(g=>g.key===key&&bulkSelectable(g)))selectedPeriods.delete(key);
 const chosen=approvalGroups.filter(g=>selectedPeriods.has(g.key));bar.hidden=!admin||!approvalGroups.some(bulkSelectable);if(bar.hidden)return;
 const days=chosen.reduce((t,g)=>t+g.rows.length,0),total=chosen.filter(g=>g.costed).reduce((t,g)=>t+Number(g.total||0),0);
 $('periodBulkInfo').textContent=chosen.length
  ?(language==='en'?`${chosen.length} periods · ${days} days`:`${chosen.length} فترة · ${days} يوم`)+(salaryInfo?` · ${money(total)} ${tr('ريال')}`:'')
  :tr('حدّد الفترات المطلوب اعتمادها، أو «تحديد كل المعروض».');
 $('periodBulkApprove').disabled=!chosen.length||bulkApproving;$('periodBulkClear').disabled=!chosen.length||bulkApproving;$('periodBulkAll').disabled=bulkApproving;
}
async function approveSelectedPeriods(){
 const groups=approvalGroups.filter(g=>selectedPeriods.has(g.key)&&bulkSelectable(g));if(!groups.length||bulkApproving)return;
 const days=groups.reduce((t,g)=>t+g.rows.length,0),total=groups.filter(g=>g.costed).reduce((t,g)=>t+Number(g.total||0),0);
 if(!confirm(language==='en'?`Approve ${groups.length} periods (${days} days)${salaryInfo?` — total to projects SAR ${money(total)}`:''}?`:`اعتماد ${groups.length} فترة (${days} يوم)${salaryInfo?` — الإجمالي على المشاريع ${money(total)} ريال`:''}؟`))return;
 bulkApproving=true;renderPeriodBulkBar();let ok=0,changed=0;const failed=[];
 try{for(const g of groups){
  try{await checked(db.rpc('sf_review_attendance_period',{p_rows:g.rows.map(r=>({id:r.id,revision:r.period_revision})),p_review:'approved',p_note:null}));ok++;selectedPeriods.delete(g.key)}
  catch(error){if(String(error?.message||'').includes('PERIOD_STALE'))changed++;else failed.push(periodReviewError(error).message)}
 }}finally{bulkApproving=false}
 await refresh();if(ok&&window.sfEmbeddedReviewChanged)window.sfEmbeddedReviewChanged();
 message((language==='en'?`Approved ${ok} of ${groups.length} periods.`:`تم اعتماد ${ok} من ${groups.length} فترة.`)+(changed?(language==='en'?` ${changed} changed after the page loaded and were not approved; review them again.`:` ${changed} تغيّرت بعد تحميل الصفحة ولم تُعتمد؛ راجعها من جديد.`):'')+(failed.length?' '+failed[0]:''));
}
const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const round2=n=>Math.round((Number(n)||0)*100)/100;
const isSiteRow=r=>['inside','outside'].includes(r.status)&&!!r.project_id;
function groupReview(rows){const set=[...new Set(rows.map(r=>r.review))];return set.length===1?set[0]:'mixed'}
function buildApprovalGroups(){
 const engineer=$('approvalEngineer').value,state=$('approvalState').value,days=records.filter(r=>r.table==='sf_daily_records');
 const approvedSite=new Map();
 for(const r of days)if(r.review==='approved'&&isSiteRow(r)){const k=r.user_id+'|'+r.day.slice(0,7);approvedSite.set(k,(approvedSite.get(k)||0)+1)}
 const byUser=new Map();for(const r of days){if(engineer!=='all'&&r.user_id!==engineer)continue;if(!byUser.has(r.user_id))byUser.set(r.user_id,[]);byUser.get(r.user_id).push(r)}
 const groups=[];
 for(const [userId,rows] of byUser)for(const g of groupAttendancePeriods(rows)){
  const first=g.rows[0],review=groupReview(g.rows),month=g.from.slice(0,7),site=isSiteRow(first);
  if(state!=='all'&&review!==state&&!(review==='mixed'&&state==='pending'))continue;
  const allowance=round2(g.rows.reduce((s,r)=>s+Number(r.allowance||0),0)),otHours=g.rows.reduce((s,r)=>s+Number(r.overtime||0),0),otAmount=round2(g.rows.reduce((s,r)=>s+Number(r.overtime_amount||0),0));
  const rates=[...new Set(g.rows.map(r=>Number(r.allowance||0)))];
  const group={...g,userId,first,review,month,site,allowance,rate:rates.length===1?rates[0]:null,otHours,otAmount,salary:null,salaryNote:'',factor:1,pkg:null,total:null,costed:false,
   note:g.rows.find(r=>r.review==='rejected'&&r.review_note)?.review_note||'',previous:null};
  if(salaryInfo){
   if(!site)group.salaryNote='لا يُحمّل على مشروع';
   else if(!salaryInfo.costingFrom)group.salaryNote='ترحيل الحضور للمشاريع متوقف';
   else if(month<salaryInfo.costingFrom)group.salaryNote='قبل شهر بدء الترحيل '+salaryInfo.costingFrom;
   else{
    group.costed=true;const std=Number(salaryInfo.standardDays)||30,pkg=salaryInfo.packages?.[userId];
    // Days of this period not yet approved are added, so a pending period shows its cost as if approved now.
    const total=(approvedSite.get(userId+'|'+month)||0)+g.rows.filter(r=>r.review!=='approved').length;
    group.factor=Math.min(1,std/Math.max(total,1));group.std=std;
    if(!(pkg>0))group.salaryNote='لا يوجد راتب مسجل لهذا المهندس';
    else{group.pkg=pkg;group.salary=round2(pkg*(g.rows.length*group.factor)/std)}
    group.total=round2((group.salary||0)+allowance+otAmount);
   }
  }
  if(review!=='approved'){
   const earlier=reviewHistory.filter(h=>h.user_id===userId&&h.action==='rejected'&&h.period_from<=g.to&&h.period_to>=g.from&&!g.rows.some(r=>r.review==='rejected'));
   group.previous=earlier.sort((a,b)=>String(b.reviewed_at).localeCompare(String(a.reviewed_at)))[0]||null;
  }
  groups.push(group);
 }
 const name=g=>members.find(m=>m.user_id===g.userId)?.name||'';
 return groups.sort((a,b)=>name(a).localeCompare(name(b))||a.from.localeCompare(b.from));
}
function periodStatusLabel(row){return tr(labels[row.status])+(row.status==='leave'&&row.leave_type?' · '+tr({annual:'سنوية',sick:'مرضية',emergency:'طارئة',unpaid:'بدون راتب'}[row.leave_type]):'')}
function renderPeriodApprovalTable(){
 const admin=me.role==='admin',cost=!!salaryInfo;approvalGroups=buildApprovalGroups();
 $('rows').closest('table').className='period-table approval-periods';
 const heads=['المهندس / الفترة','المشروع / الحالة','الأيام','البدل','الإضافي',...(cost?['حصة الراتب','الإجمالي على المشروع']:[]),'الاعتماد','إجراءات'];
 $('approvalTableHead').innerHTML=(admin?`<th class="pick-col"><span class="acct-sr">${esc(tr('تحديد'))}</span></th>`:'')+heads.map(h=>`<th>${esc(tr(h))}</th>`).join('');
 const sum=(list,f)=>round2(list.reduce((s,g)=>s+(f(g)||0),0));
 const approved=approvalGroups.filter(g=>g.review==='approved'),open=approvalGroups.filter(g=>g.review==='pending'||g.review==='mixed');
 const count=language==='en'?`${approvalGroups.length} periods`:`${approvalGroups.length} فترة`;
 $('summary').textContent=cost
  ?`${count} · ${tr('تكلفة معتمدة على المشاريع')}: ${money(sum(approved,g=>g.total))} · ${tr('بانتظار الاعتماد')}: ${money(sum(open,g=>g.total))} ${tr('ريال')}`
  :`${count} · ${tr('البدلات')}: ${money(sum(approvalGroups,g=>g.allowance))} · ${tr('الإضافي')}: ${money(sum(approvalGroups,g=>g.otAmount))} ${tr('ريال')}`+(admin?' · '+tr('الرواتب تظهر لحساب الإدارة الذي لديه صلاحية الرواتب داخل الموقع الموحد.'):'');
 const L=t=>` data-label="${esc(tr(t))}"`;
 $('rows').innerHTML=approvalGroups.map((g,i)=>{
  const project=projects.find(p=>String(p.id)===String(g.first.project_id))?.name,status=periodStatusLabel(g.first);
  const daysList=g.rows.map(r=>`<li><span class="period-dates">${esc(r.day)}</span> · ${esc(tr(labels[r.status]))} · ${money(r.allowance)}${Number(r.overtime)?` · ${Number(r.overtime)} ${esc(tr('س'))}`:''} · ${esc(r.accounting_action==='changes_requested'?(language==='en'?'Changes requested':'مطلوب تعديل'):tr(labels[r.review]))}</li>`).join('');
  const salaryCell=g.salary!==null
   ?`<b>${money(g.salary)}</b><small class="calc">${money(g.pkg)} ÷ ${g.std} × ${g.rows.length}${g.factor<1?` × ${g.factor.toFixed(4)}`:''}</small>${g.factor<1?`<small>${esc(tr('سقف الشهر: لا يتجاوز الراتب الشهري'))}</small>`:''}`
   :`—${g.salaryNote?`<small>${esc(tr(g.salaryNote))}</small>`:''}`;
  const totalCell=g.costed?`<b>${money(g.total)}</b>${g.review==='rejected'?`<small>${esc(tr('مرفوضة — لا تُحمّل'))}</small>`:''}`:`—`;
  let actions='';
  if(admin&&rejectingPeriod===g.key)actions=`<div class="reject-box"><textarea id="rejectReason" maxlength="500" rows="3" placeholder="${esc(tr('اكتب سبب الرفض ليراه المهندس ويعدّل الفترة'))}"></textarea><div class="actions"><button type="button" class="delete-period" data-period-reject-confirm="${i}">${esc(tr('تأكيد الرفض'))}</button><button type="button" class="secondary" data-period-reject-cancel>${esc(tr('إلغاء'))}</button></div></div>`;
  else if(admin)actions=`<div class="actions">${g.review!=='approved'?`<button type="button" data-period-approve="${i}">${esc(tr('اعتماد الفترة'))}</button>`:''}${g.review!=='rejected'?`<button type="button" class="secondary" data-period-reject="${i}">${esc(tr('رفض'))}</button>`:''}</div>`;
  else actions=`<small>${esc(tr(g.review==='rejected'?'عدّل الفترة من شاشة الحضور ثم احفظها لإعادة إرسالها':'—'))}</small>`;
  const pick=admin?`<td class="pick">${bulkSelectable(g)?`<label class="pick-label"><input type="checkbox" data-period-select="${esc(g.key)}" ${selectedPeriods.has(g.key)?'checked':''} ${bulkApproving?'disabled':''} aria-label="${esc(tr('تحديد الفترة'))}"></label>`:''}</td>`:'';
  return `<tr class="${rejectingPeriod===g.key?'editing':''}">${pick}<td${L('المهندس / الفترة')}><b>${esc(members.find(m=>m.user_id===g.userId)?.name||'')}</b><span class="period-dates">${esc(g.from)} → ${esc(g.to)}</span>${g.skipFriday?`<small>${esc(tr('باستثناء الجمعة'))}</small>`:''}${g.skipWeekend?`<small>${esc(tr('باستثناء الجمعة والسبت'))}</small>`:''}<details class="period-days"><summary>${esc(tr('عرض الأيام'))} (${g.rows.length})</summary><ul>${daysList}</ul></details></td>`
   +`<td${L('المشروع / الحالة')}><b>${esc(project||status)}</b>${project?`<small>${esc(status)}</small>`:''}${g.first.notes?`<small>${esc(g.first.notes)}</small>`:''}</td>`
   +`<td${L('الأيام')}>${g.rows.length}</td>`
   +`<td${L('البدل')}><b>${money(g.allowance)}</b>${g.rate!==null&&g.rate>0?`<small class="calc">${money(g.rate)} × ${g.rows.length}</small>`:''}</td>`
   +`<td${L('الإضافي')}><b>${money(g.otAmount)}</b><small>${g.otHours} ${esc(tr('ساعة'))}</small></td>`
   +(cost?`<td${L('حصة الراتب')}>${salaryCell}</td><td${L('الإجمالي على المشروع')}>${totalCell}</td>`:'')
   +`<td${L('الاعتماد')}><span class="status-badge ${g.review}">${esc(tr(labels[g.review]||'حالات اعتماد مختلفة'))}</span>${g.review==='rejected'&&g.note?`<small class="review-note">${esc(tr('سبب الرفض'))}: ${esc(g.note)}</small>`:''}${g.previous?`<small class="review-note previous">${esc(tr('أُعيد إرسالها بعد رفض'))}: ${esc(g.previous.note||'')}</small>`:''}${g.to>today()?`<small class="review-note previous">${esc(tr('تشمل أيامًا لم تأتِ بعد'))} (${esc(tr('حتى'))} <bdi dir="ltr">${esc(g.to)}</bdi>)${g.otHours>0?' — '+esc(tr('الإضافي فيها متوقع وليس فعليًا')):''}</small>`:''}</td>`
   +`<td${L('إجراءات')}>${actions}</td></tr>`;
 }).join('')||`<tr><td colspan="${heads.length+(admin?1:0)}" class="empty-state">${esc(tr('لا توجد فترات مطابقة للاختيارات.'))}</td></tr>`;
 $('export').disabled=!approvalGroups.length;renderPeriodBulkBar();
 if(rejectingPeriod&&$('rejectReason'))$('rejectReason').focus({preventScroll:false});
}
function periodReviewError(error){
 const text=String(error?.message||'');
 if(error?.code==='PGRST202'||/sf_review_attendance_period/.test(text))return Error(tr('شغّل ملف 09-attendance-period-review-v10.sql في Supabase لتفعيل اعتماد الفترات وسبب الرفض.'));
 if(text.includes('PERIOD_STALE'))return Error(tr('عدّل المهندس هذه الفترة بعد تحميل الصفحة، فلم يتغير شيء. تم التحديث؛ راجع الفترة من جديد.'));
 if(text.includes('REVIEW_NOTE_REQUIRED'))return Error(tr('اكتب سبب الرفض.'));
 return error;
}
async function reviewPeriod(group,review,note){
 if(!group)return;
 try{await checked(db.rpc('sf_review_attendance_period',{p_rows:group.rows.map(r=>({id:r.id,revision:r.period_revision})),p_review:review,p_note:note||null}))}
 catch(error){const mapped=periodReviewError(error);if(String(error?.message||'').includes('PERIOD_STALE')){rejectingPeriod='';await refresh()}throw mapped}
 rejectingPeriod='';message('');await refresh();
 if(window.sfEmbeddedReviewChanged)window.sfEmbeddedReviewChanged();
}
async function handlePeriodAction(b){
 if(b.dataset.periodApprove!==undefined){
  const g=approvalGroups[Number(b.dataset.periodApprove)];
  if(g&&!confirm(tr('اعتماد الفترة')+` ${g.from} → ${g.to} (${g.rows.length} ${tr('يوم')})`+(g.costed?` — ${tr('الإجمالي على المشروع')}: ${money(g.total)} ${tr('ريال')}`:'')+'؟'))return true;
  b.disabled=true;try{await reviewPeriod(g,'approved')}finally{b.disabled=false}return true;
 }
 if(b.dataset.periodReject!==undefined){rejectingPeriod=approvalGroups[Number(b.dataset.periodReject)]?.key||'';renderApprovalTable();return true}
 if(b.dataset.periodRejectCancel!==undefined){rejectingPeriod='';renderApprovalTable();return true}
 if(b.dataset.periodRejectConfirm!==undefined){
  const note=($('rejectReason')?.value||'').trim();
  if(!note){message('اكتب سبب الرفض.');$('rejectReason')?.focus();return true}
  b.disabled=true;try{await reviewPeriod(approvalGroups[Number(b.dataset.periodRejectConfirm)],'rejected',note)}finally{b.disabled=false}return true;
 }
 return false;
}
async function loadApprovalExtras(month,end){
 salaryInfo=null;reviewHistory=[];
 if(me.role!=='admin')return;
 if(window.sfEmbeddedSalaryInfo)salaryInfo=await window.sfEmbeddedSalaryInfo();
 try{reviewHistory=await checked(db.from('sf_daily_review_log').select('user_id,period_from,period_to,action,note,reviewed_at').eq('action','rejected').lt('period_from',end).gte('period_to',month+'-01').order('reviewed_at'))}
 catch(error){reviewHistory=[]} // history is optional until 09 is installed
}
// unified-module.js may arrive after the first refresh; it calls this once ready so salaries still appear.
async function sfApprovalSalaryReady(){
 if(me?.role!=='admin'||salaryInfo||!window.sfEmbeddedSalaryInfo)return;
 const info=await window.sfEmbeddedSalaryInfo();
 if(info&&!salaryInfo){salaryInfo=info;renderApprovalTable()}
}
function exportPeriodRows(){
 const cost=!!salaryInfo;
 return [['المهندس','من','إلى','المشروع / الحالة','الأيام','البدل','ساعات الإضافي','مبلغ الإضافي',...(cost?['حصة الراتب','الإجمالي على المشروع']:[]),'الاعتماد','سبب الرفض'],
  ...approvalGroups.map(g=>[members.find(m=>m.user_id===g.userId)?.name,g.from,g.to,projects.find(p=>String(p.id)===String(g.first.project_id))?.name||periodStatusLabel(g.first),g.rows.length,g.allowance,g.otHours,g.otAmount,...(cost?[g.salary??'',g.costed?g.total:'']:[]),labels[g.review]||'حالات اعتماد مختلفة',g.note||''])];
}
// ── Expense review: rejection reason, correction and resubmission, withdrawal ──────────────────
// Needs 10-attendance-expense-review-v11.sql. Before it is installed, approval still works the old way.
let expenseHistory=[],rejectingExpense='',editingExpense=null;
function expenseError(error){
 const text=String(error?.message||'');
 if(error?.code==='PGRST202'||/sf_(review|resubmit|withdraw)_expense/.test(text))return Error(tr('شغّل ملف 10-attendance-expense-review-v11.sql في Supabase لتفعيل سبب الرفض والتعديل والسحب.'));
 if(text.includes('EXPENSE_STALE'))return Error(tr('تغيّر هذا المصروف بعد تحميل الصفحة (عُدّل أو سُحب). اضغط تحديث.'));
 if(text.includes('EXPENSE_LOCKED'))return Error(tr('لا يمكن تعديل أو سحب مصروف معتمد أو مصفّى.'));
 if(text.includes('EXPENSE_SETTLED'))return Error(tr('المصروف مصفّى ولا يمكن تغيير اعتماده.'));
 if(text.includes('RECEIPT_ALREADY_USED'))return Error(tr('ملف الفاتورة مستخدم في مصروف آخر. ارفع فاتورة مختلفة، أو عدّل المصروف الأصلي بدل إضافة مصروف جديد.'));
 if(text.includes('DESCRIPTION_TOO_LONG'))return Error(tr('البيان لا يتجاوز 1000 حرف.'));
 if(text.includes('INVALID_AMOUNT'))return Error(tr('المبلغ يجب ألا يتجاوز 1,000,000 ريال وبحد أقصى رقمين عشريين.'));
 if(text.includes('REVIEW_NOTE_REQUIRED'))return Error(tr('اكتب سبب الرفض.'));
 return error;
}
async function loadExpenseHistory(){
 expenseHistory=[];
 const ids=records.filter(r=>r.table==='sf_daily_expenses'&&r.review==='pending').map(r=>r.id);
 try{for(let i=0;i<ids.length;i+=100)expenseHistory.push(...await checked(db.from('sf_daily_expense_log').select('replaced_by,note,amount,at').eq('action','resubmitted').in('replaced_by',ids.slice(i,i+100))))}
 catch(error){expenseHistory=[]} // history is optional until 10 is installed
}
async function setExpenseReview(r,review,note){
 try{await checked(db.rpc('sf_review_expense',{p_id:r.id,p_review:review,p_note:note||null}))}
 catch(error){
  const missing=error?.code==='PGRST202'||/sf_review_expense/.test(String(error?.message||''));
  if(missing&&review==='approved')await checked(db.from('sf_daily_expenses').update({review}).eq('id',r.id));
  else{if(String(error?.message||'').includes('EXPENSE_STALE')){rejectingExpense='';await refresh()}throw expenseError(error)}
 }
 rejectingExpense='';message('');await refresh();
 if(window.sfEmbeddedReviewChanged)window.sfEmbeddedReviewChanged();
}
function expenseRowHtml(r,i){
 const admin=me.role==='admin',own=r.user_id===me.user_id,open=r.accounting_action!=='cancelled'&&!r.settled_at&&['pending','rejected'].includes(r.review);
 const prev=r.review==='pending'?expenseHistory.find(h=>h.replaced_by===r.id):null;
 const status=(r.accounting_comment?`<small class="review-note">${esc(language==='en'?'Accounts comment':'تعليق الحسابات')}: ${esc(r.accounting_comment)}</small>`:'')+(r.accounting_action==='cancelled'?`<span class="status-badge rejected">${esc(language==='en'?'Cancelled':'ملغاة')}</span>`:'')+`<span class="status-badge ${esc(r.review)}">${esc(r.accounting_action==='changes_requested'?(language==='en'?'Changes requested':'مطلوب تعديل'):tr(labels[r.review]))}</span>`
  +(r.review==='rejected'&&r.review_note?`<small class="review-note">${esc(tr('سبب الرفض'))}: ${esc(r.review_note)}</small>`:'')
  +(prev?`<small class="review-note previous">${esc(tr('أُعيد إرسالها بعد رفض'))}: ${esc(prev.note||'')}${prev.amount!=null&&Number(prev.amount)!==Number(r.amount)?` · ${esc(tr('المبلغ السابق'))} ${Number(prev.amount).toFixed(2)}`:''}</small>`:'');
 let actions=r.receipt_path?`<button data-receipt="${i}">${esc(tr('عرض الإيصال'))}</button>`:'';
 if(admin&&rejectingExpense===r.id)actions+=`<div class="reject-box"><textarea id="expenseRejectReason" maxlength="500" rows="3" placeholder="${esc(tr('اكتب سبب الرفض ليراه المهندس ويصحح المصروف'))}"></textarea><div class="actions"><button type="button" class="delete-period" data-expense-reject-confirm="${i}">${esc(tr('تأكيد الرفض'))}</button><button type="button" class="secondary" data-expense-reject-cancel>${esc(tr('إلغاء'))}</button></div></div>`;
 else if(admin&&!r.settled_at&&!['cancelled','changes_requested'].includes(r.accounting_action))actions+=`<div class="actions">${r.review!=='approved'?`<button data-review="${i}" data-value="approved">${esc(tr('اعتماد'))}</button>`:''}${r.review!=='rejected'?`<button class="secondary" data-expense-reject="${i}">${esc(tr('رفض'))}</button>`:''}</div>`;
 if(own&&open&&rejectingExpense!==r.id)actions+=`<div class="actions"><button type="button" class="secondary" data-expense-edit="${i}">${esc(tr('تعديل وإعادة الإرسال'))}</button><button type="button" class="delete-period" data-expense-withdraw="${i}">${esc(tr('سحب'))}</button></div>`;
 return `<tr class="${rejectingExpense===r.id?'editing':''}"><td><b>${esc(members.find(m=>m.user_id===r.user_id)?.name)}</b><br>${esc(r.day)}</td><td>${esc(r.label)}<br><small>${esc(r.description||'')}</small></td><td>${esc(projects.find(p=>p.id===r.project_id)?.name||tr('عام'))}</td><td>${Number(r.amount).toFixed(2)}</td><td>${status}</td>`
  +`<td>${esc(tr(r.settled_at?'تمت التصفية':'لم تتم التصفية'))}${admin&&r.review==='approved'&&!r.settled_at?`<button data-settle="${i}">${esc(tr('تصفية كاملة'))}</button>`:''}</td><td>${actions}</td></tr>`;
}
function renderExpenseEditBanner(){
 const f=$('expenseForm'),submitButton=f.querySelector('button');let box=$('expenseEditBanner');
 if(!editingExpense){box?.remove();f.elements.receipt.required=true;submitButton.textContent=tr('إرسال المصروف للاعتماد');return}
 if(!box){box=document.createElement('div');box.id='expenseEditBanner';box.className='range-box';f.before(box)}
 box.innerHTML=`<b>${esc(tr('تعديل مصروف وإعادة إرساله'))} — <bdi dir="ltr">${esc(editingExpense.day)}</bdi> · <bdi dir="ltr">${Number(editingExpense.amount).toFixed(2)}</bdi></b>`
  +(editingExpense.review_note?`<small class="review-note">${esc(tr('سبب الرفض'))}: ${esc(editingExpense.review_note)}</small>`:'')
  +`<small>${esc(tr('اترك الإيصال فارغًا للإبقاء على الإيصال الحالي، أو اختر ملفًا لاستبداله.'))}</small><button type="button" class="secondary" id="cancelExpenseEdit">${esc(tr('إلغاء التعديل'))}</button>`;
 $('cancelExpenseEdit').onclick=()=>{editingExpense=null;f.elements.amount.value='';f.elements.description.value='';f.elements.receipt.value='';renderExpenseEditBanner()};
 f.elements.receipt.required=false;submitButton.textContent=tr('حفظ التعديل وإعادة الإرسال');
}
function startExpenseEdit(r){
 if(!r)return;editingExpense={...r};const f=$('expenseForm');
 setAttendanceView('expenseSection');populateProjectSelect(f);
 const select=f.elements.project_id;
 if(r.project_id&&![...select.options].some(o=>o.value===String(r.project_id)))select.insertAdjacentHTML('beforeend',`<option value="${esc(r.project_id)}">${esc((projects.find(p=>p.id===r.project_id)?.name||r.project_id)+' ('+tr('غير متاح')+')')}</option>`);
 select.value=r.project_id||'';f.elements.day.value=r.day;f.elements.category.value=r.category;f.elements.amount.value=r.amount;f.elements.description.value=r.description||'';f.elements.receipt.value='';
 renderExpenseEditBanner();$('expenseEditBanner').scrollIntoView({behavior:'smooth',block:'start'});
}
async function handleExpenseAction(b){
 const rec=key=>records[Number(b.dataset[key])];
 if(b.dataset.expenseReject!==undefined){rejectingExpense=rec('expenseReject')?.id||'';renderApprovalTable();$('expenseRejectReason')?.focus();return true}
 if(b.dataset.expenseRejectCancel!==undefined){rejectingExpense='';renderApprovalTable();return true}
 if(b.dataset.expenseRejectConfirm!==undefined){
  const note=($('expenseRejectReason')?.value||'').trim();
  if(!note){message('اكتب سبب الرفض.');$('expenseRejectReason')?.focus();return true}
  b.disabled=true;try{await setExpenseReview(rec('expenseRejectConfirm'),'rejected',note)}finally{b.disabled=false}return true;
 }
 if(b.dataset.expenseWithdraw!==undefined){
  const r=rec('expenseWithdraw');if(!r||!confirm(tr('سحب هذا المصروف؟ سيُحذف الطلب ولن يُراجع.')))return true;
  try{await checked(db.rpc('sf_withdraw_expense',{p_id:r.id}))}catch(error){throw expenseError(error)}
  if(editingExpense?.id===r.id){editingExpense=null;renderExpenseEditBanner()}
  message('تم سحب المصروف.');await refresh();return true;
 }
 if(b.dataset.expenseEdit!==undefined){startExpenseEdit(rec('expenseEdit'));return true}
 return false;
}
function renderApprovalTable(){
 renderApprovalCards();
 if(approvalType==='overview'){$('periodBulkBar').hidden=true;return renderTeamOverview()}
 if(approvalType!=='expenses')return renderPeriodApprovalTable();
 $('periodBulkBar').hidden=true;
 $('rows').closest('table').className='';
 const expenses=approvalType==='expenses',list=filteredApprovalRecords(),total=list.reduce((sum,{r})=>sum+Number(r.amount),0);
 $('approvalTableHead').innerHTML=[tr('المهندس / التاريخ'),tr(expenses?'البند':'حالة اليوم'),tr('المشروع'),tr(expenses?'قيمة المصروف':'بدلات + إضافي'),tr('الحالة'),...(expenses?[tr('التصفية')]:[]),tr('إجراءات')].map(title=>`<th>${esc(title)}</th>`).join('');
 $('summary').textContent=language==='en'?`${list.length} matching ${expenses?'expenses':'attendance entries'} · Displayed total: ${total.toFixed(2)} SAR${expenses?'':' (allowances + overtime only; no base salary)'}`:`${list.length} ${expenses?'مصروف':'سجل حضور'} مطابق · إجمالي المعروض: ${total.toFixed(2)} ريال${expenses?'':' (بدلات وإضافي فقط؛ بدون الراتب الأساسي)'}`;
 $('rows').innerHTML=list.map(({r,i})=>expenseRowHtml(r,i)).join('')||`<tr><td colspan="${expenses?7:6}">${esc(tr('لا توجد سجلات مطابقة للاختيارات.'))}</td></tr>`;
 $('export').disabled=!list.length;
}
async function refresh(opts={}){ const m=$('month').value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))throw Error(tr('اختر الشهر'));
 const request=++reviewRequest,[y,n]=m.split('-').map(Number),end=`${n===12?y+1:y}-${String(n===12?1:n+1).padStart(2,'0')}-01`;
 if(!opts.quiet){records=[];renderApprovalTable();$('summary').textContent=language==='en'?'Loading records…':'جاري تحميل السجلات…';if(window.sfLiveAbsorb)window.sfLiveAbsorb();}
 let days,expenses;try{[days,expenses]=await Promise.all([allRows('sf_daily_records',m+'-01',end),allRows('sf_daily_expenses',m+'-01',end),loadApprovalExtras(m,end)])}catch(error){if(request===reviewRequest)$('summary').textContent=language==='en'?'Unable to load records. Click Refresh to retry.':'تعذر تحميل السجلات. اضغط تحديث للمحاولة مجددًا.';throw error}
 if(request!==reviewRequest)return;
 records=[...days.map(r=>({...r,table:'sf_daily_records',amount:Number(r.allowance)+Number(r.overtime_amount),label:tr(labels[r.status])+' · '+r.overtime+' '+(language==='en'?'OT hours':'س إضافي')})),...expenses.map(r=>({...r,table:'sf_daily_expenses',label:tr(labels[r.category])}))];
 await loadExpenseHistory();if(request!==reviewRequest)return;
 renderApprovalFilters();renderApprovalTable();if(window.sfEmbeddedRosterChanged)window.sfEmbeddedRosterChanged();
}
function setupApprovalFilters(){
 Object.assign(translations,{'تعديل وإعادة الإرسال':'Edit & resubmit','سحب':'Withdraw','المبلغ السابق':'Previous amount','تعديل مصروف وإعادة إرساله':'Edit and resubmit an expense','إلغاء التعديل':'Cancel edit','حفظ التعديل وإعادة الإرسال':'Save and resubmit','إرسال المصروف للاعتماد':'Submit expense for approval',
  'اترك الإيصال فارغًا للإبقاء على الإيصال الحالي، أو اختر ملفًا لاستبداله.':'Leave the receipt empty to keep the current one, or choose a file to replace it.','اكتب سبب الرفض ليراه المهندس ويصحح المصروف':'Write the reason; the engineer will see it and correct the expense',
  'سحب هذا المصروف؟ سيُحذف الطلب ولن يُراجع.':'Withdraw this expense? The request will be removed and not reviewed.','تم سحب المصروف.':'Expense withdrawn.','غير متاح':'unavailable',
  'شغّل ملف 10-attendance-expense-review-v11.sql في Supabase لتفعيل سبب الرفض والتعديل والسحب.':'Run 10-attendance-expense-review-v11.sql in Supabase to enable rejection reasons, edits and withdrawals.',
  'تغيّر هذا المصروف بعد تحميل الصفحة (عُدّل أو سُحب). اضغط تحديث.':'This expense changed after the page loaded (edited or withdrawn). Click Refresh.','لا يمكن تعديل أو سحب مصروف معتمد أو مصفّى.':'Approved or settled expenses cannot be edited or withdrawn.','أدخل بريدًا إلكترونيًا صحيحًا للتذكير.':'Enter a valid reminder email address.','ملف الفاتورة مستخدم في مصروف آخر. ارفع فاتورة مختلفة، أو عدّل المصروف الأصلي بدل إضافة مصروف جديد.':'This invoice file is already used by another expense. Upload a different invoice, or edit the original expense instead of adding a new one.','البيان لا يتجاوز 1000 حرف.':'The description is limited to 1000 characters.','المبلغ يجب ألا يتجاوز 1,000,000 ريال وبحد أقصى رقمين عشريين.':'The amount must be at most SAR 1,000,000 with no more than two decimals.','المصروف مصفّى ولا يمكن تغيير اعتماده.':'This expense is settled; its approval cannot change.',
  'المهندس / الفترة':'Engineer / period','الأيام':'Days','البدل':'Allowance','الإضافي':'Overtime','حصة الراتب':'Salary share','الإجمالي على المشروع':'Total to project','الاعتماد':'Approval','عرض الأيام':'Show days','س':'h','ساعة':'h',
  'اعتماد الفترة':'Approve period','تأكيد الرفض':'Confirm rejection','إلغاء':'Cancel','سبب الرفض':'Rejection reason','أُعيد إرسالها بعد رفض':'Resubmitted after rejection','اكتب سبب الرفض ليراه المهندس ويعدّل الفترة':'Write the reason; the engineer will see it and edit the period','اكتب سبب الرفض.':'Write the rejection reason.',
  'تكلفة معتمدة على المشاريع':'Approved project cost','البدلات':'Allowances','ريال':'SAR','يوم':'days','لا توجد فترات مطابقة للاختيارات.':'No periods match your filters.','مرفوضة — لا تُحمّل':'Rejected — not charged',
  'لا يُحمّل على مشروع':'Not charged to a project','ترحيل الحضور للمشاريع متوقف':'Attendance costing is switched off','لا يوجد راتب مسجل لهذا المهندس':'No salary recorded for this engineer','سقف الشهر: لا يتجاوز الراتب الشهري':'Monthly cap: never above the monthly salary',
  'الرواتب تظهر لحساب الإدارة الذي لديه صلاحية الرواتب داخل الموقع الموحد.':'Salaries appear for payroll administrators inside the unified site.','عدّل الفترة من شاشة الحضور ثم احفظها لإعادة إرسالها':'Edit the period in Attendance and save it to resubmit',
  'شغّل ملف 09-attendance-period-review-v10.sql في Supabase لتفعيل اعتماد الفترات وسبب الرفض.':'Run 09-attendance-period-review-v10.sql in Supabase to enable period approval and rejection reasons.',
  'عدّل المهندس هذه الفترة بعد تحميل الصفحة، فلم يتغير شيء. تم التحديث؛ راجع الفترة من جديد.':'The engineer changed this period after the page loaded, so nothing was changed. The list was refreshed; review the period again.',
  'السكن خارج الرياض الذي توفره الشركة منفصل عن بدل السكن في الراتب، ويُحمّل على المشروع. تأكد فقط أن نفس السكن ونفس الفترة لم يُعتمدا من قبل. هل تعتمد؟':'Housing the company provides outside Riyadh is separate from the housing allowance in the salary and is charged to the project. Just make sure the same housing for the same period was not approved before. Approve?',
  'الفترة المرفوضة: عدّلها حسب سبب الرفض ثم احفظها لتُرسل للاعتماد من جديد.':'A rejected period: edit it according to the reason, then save it to resubmit.',
  'اعتماد التايم شيت':'Timesheet approvals','اعتماد المصروفات':'Expense approvals','كل المهندسين':'All engineers','كل الحالات':'All statuses','حالة الاعتماد':'Approval status','قيمة المصروف':'Expense amount','بدلات + إضافي':'Allowances + overtime','لا توجد سجلات مطابقة للاختيارات.':'No records match your filters.','تصدير المعروض CSV':'Export displayed CSV','اختر المهندس ونوع الطلب، ثم راجع واعتمد السجلات الظاهرة.':'Choose an engineer and request type, then review and approve the displayed records.'});
 $('approvalEngineer').onchange=()=>{syncApprovalExportEngineer();renderApprovalTable()};$('approvalState').onchange=renderApprovalTable;
 $('rows').addEventListener('change',e=>{const c=e.target.closest?.('[data-period-select]');if(!c||bulkApproving)return;if(c.checked)selectedPeriods.add(c.dataset.periodSelect);else selectedPeriods.delete(c.dataset.periodSelect);renderPeriodBulkBar()});
 $('periodBulkAll').onclick=()=>{for(const g of approvalGroups)if(bulkSelectable(g))selectedPeriods.add(g.key);renderApprovalTable()};
 $('periodBulkClear').onclick=()=>{selectedPeriods.clear();renderApprovalTable()};
 $('periodBulkApprove').onclick=()=>run(approveSelectedPeriods);
 $('approvalCards').onclick=e=>{const b=e.target.closest('[data-ap-card]');if(!b)return;const k=b.dataset.apCard;
  if(k==='missing')return setApprovalType('overview');
  $('approvalEngineer').value='all';$('approvalState').value='pending';setApprovalType(k==='expenses'?'expenses':'attendance')};
 $('teamOverview').onclick=e=>{const b=e.target.closest('[data-ov-user]');if(!b)return;$('approvalEngineer').value=b.dataset.ovUser;$('approvalState').value='all';syncApprovalExportEngineer();setApprovalType('attendance')};
 Object.assign(translations,{'نظرة على الفريق':'Team overview','معتمد':'Approved','غير مسجّل':'Not recorded','جمعة':'Friday','لم يأتِ بعد':'Not yet','جمعة / لم يأتِ بعد':'Friday / not yet','المهندس':'Engineer','عرض فترات هذا المهندس':'Show this engineer’s periods','لا يوجد مهندسون.':'No engineers.','الحرف داخل اليوم: م موقع · ك مكتب · ج إجازة · غ غياب':'Letter in a day: S site · O office · L leave · A absent','فترات بانتظار الاعتماد':'Periods awaiting approval','مصروفات بانتظار الاعتماد':'Expenses awaiting approval','أيام غير مسجّلة':'Days not recorded','تحديد كل المعروض':'Select all shown','إلغاء التحديد':'Clear selection','اعتماد المحدد':'Approve selected','حدّد الفترات المطلوب اعتمادها، أو «تحديد كل المعروض».':'Select the periods to approve, or “Select all shown”.','تحديد الفترة':'Select period','تحديد':'Select','تصدير':'Export'});
 for(const button of document.querySelectorAll('[data-approval-type]'))button.onclick=()=>setApprovalType(button.dataset.approvalType);
 translateUI();
}
$('loginForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const button=$('loginButton');button.disabled=true;message('');
 try{const code=$('email').value.trim();await checked(db.auth.signInWithPassword({email:code.includes('@')?code:code.toLowerCase()+'@engineers.skyfield.invalid',password:$('password').value}));$('password').value='';await load()}
 finally{button.disabled=false}
})};
$('logout').onclick=()=>{if(monthBusy||!mayDiscardForm()||(window.sfAccountingHasDraft?.()&&!confirm(tr('لديك تغييرات لم تحفظ. هل تريد تركها؟'))))return;run(async()=>{await checked(db.auth.signOut());periodFormDirty=false;location.reload()})};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){window.sfAccountingClose?.();me=null;members=[];records=[];monthSaved.clear();editingPeriod=null;periodFormDirty=false;showPortal(false);}});

function submit(form,fn){form.onsubmit=e=>{e.preventDefault();run(async()=>{const b=form.querySelector('button');b.disabled=true;try{await fn(form);message(form.id==='memberForm'?'تم حفظ بيانات المهندس.':'تم الحفظ وإرسال الطلب للاعتماد.');await refresh()}finally{b.disabled=false}})}}
submit($('expenseForm'),async f=>{const v=Object.fromEntries(new FormData(f)),file=v.receipt;delete v.receipt;v.project_id=v.project_id||null;v.amount=Number(v.amount);assertProjectAllowed(v.project_id);if(!file?.size&&!editingExpense)throw Error(tr('الفاتورة مطلوبة'));if(file?.size){if(file.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error('نوع أو حجم الإيصال غير مسموح');v.receipt_path=me.user_id+'/'+crypto.randomUUID();await checked(db.storage.from('sf-receipts').upload(v.receipt_path,file,{contentType:file.type}));}if(editingExpense){const editing=editingExpense;try{await checked(db.rpc('sf_resubmit_expense',{p_id:editing.id,p_day:v.day,p_project_id:v.project_id,p_category:v.category,p_amount:v.amount,p_description:v.description,p_receipt_path:v.receipt_path||editing.receipt_path}))}catch(error){throw expenseError(error)}editingExpense=null;renderExpenseEditBanner();}
 else try{await checked(db.from('sf_daily_expenses').insert(v))}catch(error){throw expenseError(error)}f.elements.amount.value='';f.elements.description.value='';f.elements.receipt.value='';});
submit($('memberForm'),async f=>{
 const v=Object.fromEntries(new FormData(f));if(!activeEngineer(v.user_id))throw Error(tr('اختر مهندسًا نشطًا.'));
 const updates={name:v.name.trim()};if(!updates.name)throw Error(tr('اسم المهندس مطلوب'));
 for(const k of ['inside_rate','outside_rate','overtime_rate']){updates[k]=Number(v[k]);if(!Number.isFinite(updates[k])||updates[k]<0)throw Error(tr('أدخل قيمًا صحيحة للبدلات.'));}
 updates.sec_card_no=(v.sec_card_no||'').trim()||null;updates.sec_card_expiry=v.sec_card_expiry||null;updates.contact_email=(v.contact_email||'').trim().toLowerCase()||null;
 if(updates.contact_email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(updates.contact_email))throw Error(tr('أدخل بريدًا إلكترونيًا صحيحًا للتذكير.'));
 const updated=await checked(db.from('sf_daily_members').update(updates).eq('user_id',v.user_id).eq('role','engineer').eq('is_active',true).select('user_id'));
 if(!updated?.length)throw Error(tr('المهندس غير متاح للتعديل. حدّث القائمة.'));
 if(window.sfSaveSupplemental)await window.sfSaveSupplemental(v.user_id,updates);
 await reloadEngineerDirectory();$('editEngineerPanel').hidden=true;
});
$('rows').onclick=e=>run(async()=>{const b=e.target.closest('button');if(!b)return;if(await handlePeriodAction(b))return;if(await handleExpenseAction(b))return;if(b.dataset.receipt!==undefined){const r=records[Number(b.dataset.receipt)];const d=await checked(db.storage.from('sf-receipts').createSignedUrl(r.receipt_path,60));window.open(d.signedUrl,'_blank','noopener');}if(b.dataset.settle!==undefined){const r=records[Number(b.dataset.settle)];await checked(db.rpc('sf_settle_expense',{expense_id:r.id}));await refresh();}if(b.dataset.review!==undefined){const r=records[Number(b.dataset.review)];if(b.dataset.value==='approved'&&r.category?.startsWith('housing')&&!confirm(tr('السكن خارج الرياض الذي توفره الشركة منفصل عن بدل السكن في الراتب، ويُحمّل على المشروع. تأكد فقط أن نفس السكن ونفس الفترة لم يُعتمدا من قبل. هل تعتمد؟')))return;await setExpenseReview(r,b.dataset.value);}});
$('refresh').onclick=()=>run(refresh);$('month').onchange=()=>run(refresh);
$('export').onclick=()=>{const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=approvalType!=='expenses'?exportPeriodRows():[['المهندس','التاريخ','البند','المشروع','المبلغ','الحالة','ساعات إضافية','التصفية','تاريخ التصفية'],...filteredApprovalRecords().map(({r})=>[members.find(m=>m.user_id===r.user_id)?.name,r.day,r.label,projects.find(p=>p.id===r.project_id)?.name||'عام',r.amount,labels[r.review],r.overtime||0,r.table==='sf_daily_expenses'?tr(r.settled_at?'تمت التصفية':'لم تتم التصفية'):'',r.settled_at||''])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='skyfield-'+approvalType+'-'+$('month').value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('createAccountForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const form=e.target,b=form.querySelector('button');b.disabled=true;
 try{const body=Object.fromEntries(new FormData(form));if(!/^[0-9]{6,40}$/.test(body.engineer_id))throw Error(tr('كود الموظف يجب أن يكون من 6 إلى 40 رقمًا.'));if(!validEngineerPassword(body.password))throw Error(tr('كلمة المرور يجب أن تكون 6 أرقام على الأقل (0–9).'));
 await engineerAccountAction({...body,action:'create'});form.reset();await reloadEngineerDirectory();$('createEngineerPanel').hidden=true;message(tr('تم إنشاء حساب المهندس'));}
 finally{b.disabled=false}
})};
$('language').value=language;$('loginLanguage').value=language;function changeLanguage(value){language=value;$('language').value=value;$('loginLanguage').value=value;localStorage.setItem('sf-language',language);translateUI();window.sfAccountingLanguageChanged?.();if(me?.role==='accountant')return;if(me)run(async()=>{renderMonthEntries();updateRangeControls();populateProjectSelect($('expenseForm'));renderProjectChoices();renderEngineerList();renderTimesheetControls();await refresh()})};$('language').onchange=()=>changeLanguage($('language').value);$('loginLanguage').onchange=()=>changeLanguage($('loginLanguage').value);new MutationObserver(()=>translateUI()).observe(document.body,{childList:true,subtree:true});translateUI();
function availableProjects(){return projects.filter(p=>selectedProjectIds.has(String(p.id)))}
function populateProjectSelect(form){const select=form.elements.project_id,previous=select.value;select.innerHTML=`<option value="">${esc(tr('بدون مشروع / مصروف عام'))}</option>`+availableProjects().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');select.value=selectedProjectIds.has(previous)?previous:'';}
function assertProjectAllowed(id){if(id&&(!projectVisibilityReady||!selectedProjectIds.has(String(id))))throw Error(tr('حدد مشروعًا متاحًا من القائمة.'));}
async function loadProjectVisibility(){projectVisibilityReady=false;try{const rows=await checked(db.from('sf_daily_project_visibility').select('project_id'));selectedProjectIds=new Set(rows.map(r=>String(r.project_id)));projectVisibilityReady=true;}catch(e){selectedProjectIds=new Set();message(language==='en'?'Project selection needs setup: run attendance-projects-v3.sql in Supabase.':'اختيار المشاريع يحتاج تفعيل: نفّذ attendance-projects-v3.sql في Supabase.');}$('saveProjectChoices').disabled=!projectVisibilityReady;}
const projectFilter=()=>window.sfProjectFilter||(selectedProjectIds.size?'on':'all');
function markProjectsDirty(on){const label=$('projectDirty');if(label)label.hidden=!on}
function updateProjectCount(){
 const rows=[...$('projectChoices').querySelectorAll('.project-choice')],on=rows.filter(r=>r.querySelector('.pc-check').checked),missing=on.filter(r=>!projectRowLocation(r)).length;
 $('projectCount').textContent=(language==='en'?`${on.length} of ${projects.length} available`:`المتاح ${on.length} من ${projects.length}`)+(missing?(language==='en'?` · ${missing} without a location`:` · ${missing} بلا موقع`):'');
 $('projectCount').classList.toggle('location-missing',missing>0);
 // Once nothing is missing a location, leave the "No location" view (it would stay empty).
 if(!missing&&window.sfProjectFilter==='missing'){window.sfProjectFilter='all';filterProjectChoices()}
 const counts={all:rows.length,on:on.length,off:rows.length-on.length,missing};
 for(const b of document.querySelectorAll('#projectFilters [data-filter]')){const n=b.querySelector('b');if(n)n.textContent=counts[b.dataset.filter];b.classList.toggle('active',projectFilter()===b.dataset.filter);b.hidden=b.dataset.filter==='missing'&&!missing&&projectFilter()!=='missing'}
}
function filterProjectChoices(){
 const term=$('projectSearch').value.trim().toLocaleLowerCase(),f=projectFilter();
 for(const row of $('projectChoices').querySelectorAll('.project-choice')){
  const on=row.querySelector('.pc-check').checked,loc=projectRowLocation(row);
  const keep=f==='all'||(f==='on'&&on)||(f==='off'&&!on)||(f==='missing'&&on&&!loc);
  row.hidden=!keep||!row.querySelector('.pc-name').textContent.toLocaleLowerCase().includes(term);
 }
 const shown=[...$('projectChoices').querySelectorAll('.project-choice')].filter(r=>!r.hidden).length,empty=$('projectNoMatch');
 if(empty)empty.hidden=shown>0||!projects.length;
}
function renderProjectChoices(){if(me?.role!=='admin')return;
 $('projectSearch').placeholder=tr('ابحث باسم المشروع');
 // One row per project: checkbox, full name, and an inside / outside toggle. Available projects first.
 const list=[...projects].sort((a,b)=>(selectedProjectIds.has(String(b.id))-selectedProjectIds.has(String(a.id)))||String(a.name).localeCompare(String(b.name)));
 const loc=(p,v,label)=>`<label class="pc-loc-option"><input type="radio" name="loc-${esc(p.id)}" value="${v}" ${p.location===v?'checked':''}><span>${esc(tr(label))}</span></label>`;
 const leaderOptions=(p)=>`<label class="pc-leader">${esc(tr('قائد المشروع'))}<select class="pc-leader-select" aria-label="${esc(tr('قائد المشروع'))} — ${esc(p.name)}"><option value="">${esc(tr('بدون قائد — تعتمد الإدارة'))}</option>${members.filter(m=>m.role==='engineer'&&m.is_active!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(m=>`<option value="${esc(m.user_id)}" ${m.user_id===p.leader_user_id?'selected':''}>${esc(m.name)} (${esc(m.engineer_id)})</option>`).join('')}</select></label>`;
 $('projectChoices').innerHTML=list.map(p=>`<div class="project-choice" data-project-row="${esc(p.id)}"><label class="pc-main"><input class="pc-check" type="checkbox" name="project" value="${esc(p.id)}" ${selectedProjectIds.has(String(p.id))?'checked':''}><span class="pc-name" title="${esc(p.name)}">${esc(p.name)}</span></label><div class="pc-loc" role="radiogroup" aria-label="${esc(tr('موقع المشروع'))}">${loc(p,'inside','داخل الرياض')}${loc(p,'outside','خارج الرياض')}</div>${leaderOptions(p)}<span class="pc-missing">${esc(tr('حدد الموقع'))}</span></div>`).join('')||`<p class="pc-empty">${esc(tr('لا توجد مشاريع. زامن المشاريع من النظام الرئيسي أولًا.'))}</p>`;
 filterProjectChoices();updateProjectCount();markProjectsDirty(false);}
function projectRowLocation(row){return row.querySelector('.pc-loc input:checked')?.value||''}
$('projectSearch').oninput=filterProjectChoices;
$('projectChoices').onchange=()=>{markProjectsDirty(true);updateProjectCount();if(projectFilter()!=='all')filterProjectChoices()};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#projectFilters [data-filter]');if(!b)return;window.sfProjectFilter=b.dataset.filter;filterProjectChoices();updateProjectCount()});
$('selectAllProjects').onclick=()=>{for(const field of $('projectChoices').querySelectorAll('.project-choice:not([hidden]) .pc-check'))field.checked=true;markProjectsDirty(true);updateProjectCount();};
$('clearProjects').onclick=()=>{for(const field of $('projectChoices').querySelectorAll('.project-choice:not([hidden]) .pc-check'))field.checked=false;markProjectsDirty(true);updateProjectCount();};
$('projectVisibilityForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(me?.role!=='admin'||!projectVisibilityReady)return;const button=$('saveProjectChoices');button.disabled=true;try{const rows=[...$('projectChoices').querySelectorAll('.project-choice')],missing=rows.filter(r=>r.querySelector('.pc-check').checked&&!projectRowLocation(r)).map(r=>r.querySelector('.pc-name').textContent);
 if(missing.length){window.sfProjectFilter='missing';$('projectSearch').value='';filterProjectChoices();updateProjectCount();}
 if(missing.length)throw Error(tr('حدد موقع كل مشروع متاح للمهندسين (داخل أو خارج الرياض):')+' '+missing.join('، '));
 const locations=rows.map(r=>({id:r.querySelector('.pc-check').value,location:projectRowLocation(r)}));
 try{await checked(db.rpc('sf_set_project_locations',{p_locations:locations}))}catch(error){if(/sf_set_project_locations|function/i.test(String(error?.message||'')))throw Error(tr('حفظ مواقع المشاريع يحتاج تشغيل الملف 13-attendance-project-location-v14.sql في Supabase أولًا.'));throw error}
 for(const l of locations){const p=projects.find(x=>String(x.id)===String(l.id));if(p)p.location=l.location||null}
 const ids=Array.from($('projectChoices').querySelectorAll('.pc-check:checked'),i=>i.value);
 // Save delegation separately: it is project-scoped and optional, not tied to visibility.
 const assignments=rows.map(r=>({id:r.querySelector('.pc-check').value,leader_user_id:r.querySelector('.pc-leader-select').value||null}));
 await checked(db.rpc('sf_set_project_leaders',{p_assignments:assignments}));
 for(const item of assignments){const p=projects.find(x=>String(x.id)===String(item.id));if(p)p.leader_user_id=item.leader_user_id}
 await checked(db.rpc('sf_set_visible_projects',{project_ids:ids}));selectedProjectIds=new Set(ids);
 updateRangeControls();renderMonthEntries();populateProjectSelect($('expenseForm'));markProjectsDirty(false);message('تم حفظ المشاريع وقادة المشاريع المختارين.');}finally{button.disabled=false}})};



Object.assign(translations,{'تعديل بيانات المهندس والبدلات':'Edit engineer and allowances','اختر المهندس من الأسماء أسفل النموذج لتعديل بياناته.':'Select an engineer below to edit their details.','أضف المهندس هنا ليظهر تلقائيًا في قائمة المهندسين بالنظام الرئيسي.':'Add engineers here to show them automatically in the main Engineers list.'});translateUI();

Object.assign(translations,{
 'الحضور الشهري':'Monthly attendance','وزّع أيام الشهر على المشاريع. يمكنك تعبئة فترة كاملة ثم تعديل كل يوم قبل الإرسال.':'Assign the month across projects. Fill a date range, then adjust individual days before submitting.',
 'تحديث الأيام المسجلة':'Refresh recorded days','تعبئة فترة':'Fill a date range','من يوم':'From day','إلى يوم':'To day','ساعات إضافية لكل يوم':'Overtime hours per day','تضمين يوم الجمعة':'Include Friday','تطبيق على الأيام':'Apply to days','التطبيق يعبّئ الجدول فقط. الأيام المسجلة سابقًا والمستقبلية لا تتغير.':'This fills the draft only. Recorded and future days are unchanged.',
 'اختر حالة للأيام المطلوب إرسالها. الأيام الفارغة لا تُرسل. لكل يوم مشروع واحد.':'Choose a status for each day to submit. Blank days are skipped. One project per day.',
 'اليوم':'Day','المشروع / نوع الإجازة':'Project / leave type','إرسال الأيام الجديدة للاعتماد':'Submit new days for approval','لم يُحدد':'Not entered','مسودة':'Draft','يوم مستقبلي':'Future day','مسح اليوم':'Clear day','الأيام المسجلة للعرض فقط.':'Recorded days are read-only.','جاري تحميل الشهر…':'Loading month…','تعذر تحميل الشهر. اضغط تحديث للمحاولة مجددًا.':'Unable to load month. Click refresh to retry.',
 'اختر الشهر':'Choose a month','الفترة غير صحيحة.':'Invalid day range.','اختر حالة اليوم.':'Choose a day status.','اختر المشروع.':'Choose a project.','نوع الإجازة مطلوب.':'A leave type is required.','ساعات الإضافي يجب أن تكون بين 0 و16 وبمضاعفات ربع ساعة.':'Overtime must be between 0 and 16 in quarter-hour increments.',
 'لا توجد أيام جديدة لإرسالها.':'There are no new days to submit.','عندك أيام لم تُرسل. هل تريد تغيير الشهر وتركها؟':'You have unsent days. Change the month and discard them?','الفترة تتداخل مع مسودة سابقة. هل تريد استبدال بيانات الأيام المتداخلة؟':'This range overlaps an existing draft. Replace the overlapping draft days?',
 'تم إرسال الأيام للاعتماد.':'Days submitted for approval.','توجد أيام سُجلت من نافذة أخرى. لم تُحفظ هذه الدفعة؛ اضغط تحديث وراجع الأيام المتبقية.':'Some days were recorded in another window. This batch was not saved. Refresh and review the remaining days.'
});
let attendanceMonthKey='',monthSaved=new Map(),monthReady=false,monthBusy=false,periodGroups=[],editingPeriod=null,periodFormDirty=false;
function monthDates(key){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)||Number(key.slice(0,4))<1900)throw Error(tr('اختر الشهر'));
 const [year,month]=key.split('-').map(Number),count=new Date(Date.UTC(year,month,0)).getUTCDate();
 return Array.from({length:count},(_,i)=>key+'-'+String(i+1).padStart(2,'0'));
}
function isWeekend(day){return new Date(day+'T12:00:00Z').getUTCDay()===5}
function normalizeMonthEntry(entry){
 const row={day:entry.day,status:entry.status,project_id:entry.project_id||null,leave_type:entry.leave_type||null,overtime:Number(entry.overtime||0),notes:String(entry.notes||'').trim()};
 if(!['inside','outside'].includes(row.status))row.project_id=null;
 if(row.status!=='leave')row.leave_type=null;
 if(['leave','absent'].includes(row.status))row.overtime=0;
 return row;
}
function validateMonthEntry(row){
 if(!['office','inside','outside','leave','absent'].includes(row.status))throw Error(tr('اختر حالة اليوم.'));
 if(['inside','outside'].includes(row.status)){if(!row.project_id)throw Error(tr('اختر المشروع.'));assertProjectAllowed(row.project_id);}
 if(row.status==='leave'&&!['annual','sick','emergency','unpaid'].includes(row.leave_type))throw Error(tr('نوع الإجازة مطلوب.'));
 if(!Number.isFinite(row.overtime)||row.overtime<0||row.overtime>16||!Number.isInteger(row.overtime*4))throw Error(tr('ساعات الإضافي يجب أن تكون بين 0 و16 وبمضاعفات ربع ساعة.'));
 if(row.notes.length>2000)throw Error(tr('الملاحظات بحد أقصى 2000 حرف.'));
}
function periodDates(from,to,month,skipWeekend,cutoff=allowedUntil()){
 const days=monthDates(month);
 if(!days.includes(from)||!days.includes(to)||to<from)throw Error(tr('حدد فترة صحيحة داخل الشهر المختار.'));
 if(to>cutoff)throw Error(tr('لا يمكن تسجيل أيام مستقبلية، إلا من يوم 24 حتى نهاية الشهر الحالي.'));
 const result=days.filter(day=>day>=from&&day<=to&&(!skipWeekend||!isWeekend(day)));
 if(!result.length)throw Error(tr('الفترة لا تحتوي أيامًا بعد استثناء الجمعة.'));
 return result;
}
function periodSignature(row){return JSON.stringify([row.status,row.project_id||null,row.leave_type||null,Number(row.overtime),row.notes||'',row.review])}
function groupAttendancePeriods(rows){
 const groups=[],byId=new Map();let legacy=null;
 for(const row of [...rows].sort((a,b)=>a.day.localeCompare(b.day))){
  if(row.period_id){let group=byId.get(row.period_id);if(!group){group={key:row.period_id,from:row.period_from||row.day,to:row.period_to||row.day,skipWeekend:!!row.period_skip_weekend,skipFriday:!!row.period_skip_friday,rows:[]};byId.set(row.period_id,group);groups.push(group)}group.rows.push(row);legacy=null;}
  else{
   const consecutive=legacy&&(Date.parse(row.day+'T12:00:00Z')-Date.parse(legacy.to+'T12:00:00Z')===86400000);
   if(!consecutive||periodSignature(legacy.rows[0])!==periodSignature(row)){legacy={key:'legacy:'+row.id,from:row.day,to:row.day,skipWeekend:false,rows:[]};groups.push(legacy)}
   legacy.to=row.day;legacy.rows.push(row);
  }
 }
 return groups.sort((a,b)=>a.from.localeCompare(b.from));
}
function monthlyNotice(text){$('monthlyEntryMessage').textContent=tr(text)}
function monthlyDirty(){return periodFormDirty}
function monthProjectOptions(selected){
 const list=availableProjects();let html=`<option value="">${esc(tr('اختر المشروع'))}</option>`+list.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.name)}</option>`).join('');
 if(selected&&!list.some(p=>String(p.id)===String(selected)))html+=`<option value="${esc(selected)}" selected>${esc(projects.find(p=>String(p.id)===String(selected))?.name||selected)} (${esc(tr('غير متاح'))})</option>`;
 return html;
}
// The administrator sets each project's location; a site day always takes it (the server enforces it too).
function projectLocationOf(id){return projects.find(p=>String(p.id)===String(id))?.location||''}
function applyProjectLocation(){
 const status=$('rangeStatus'),hint=$('rangeLocationHint');if(!status||!hint)return;
 const site=status.value==='site',pid=$('rangeProject').value,loc=projectLocationOf(pid);
 hint.hidden=!site||!pid||!!loc;hint.classList.toggle('missing',site&&!!pid&&!loc);
 hint.textContent=site&&pid&&!loc?tr('لم يحدد المدير موقع هذا المشروع بعد، فلا يمكن تسجيل أيام موقع عليه.') : '';
}
function updateRangeControls(){
 const disabled=monthBusy||!monthReady;
 for(const field of $('rangeForm').elements)field.disabled=disabled;
 const status=$('rangeStatus').value,site=status==='site',off=['leave','absent'].includes(status);
 $('rangeProjectLabel').hidden=!site;$('rangeProject').required=site;$('rangeProject').disabled=disabled||!site;
 const selected=$('rangeProject').value;$('rangeProject').innerHTML=monthProjectOptions(selected);
 $('rangeLeaveLabel').hidden=status!=='leave';$('rangeLeave').disabled=disabled||status!=='leave';
 $('rangeOvertimeToggle').hidden=off;$('rangeHasOvertime').disabled=disabled||off;
 $('rangeOvertimeLabel').hidden=off||!$('rangeHasOvertime').checked;$('rangeOvertime').disabled=disabled||off||!$('rangeHasOvertime').checked;
 $('attendanceMonth').disabled=monthBusy;$('reloadAttendance').disabled=monthBusy;
 $('applyRange').textContent=tr(editingPeriod?'حفظ التعديل':'إضافة الفترة');$('rangeFormTitle').textContent=tr(editingPeriod?'تعديل فترة الحضور':'إضافة فترة حضور');
 $('cancelPeriodEdit').hidden=!editingPeriod;$('rangeEditHint').hidden=!editingPeriod;applyProjectLocation();
 $('quickTimesheet').disabled=disabled||!monthSaved.size;$('timesheetOptions').disabled=monthBusy;
}
function resetPeriodForm(){
 editingPeriod=null;periodFormDirty=false;$('rangeForm').reset();
 if(attendanceMonthKey){const days=monthDates(attendanceMonthKey),available=days.find(day=>day<=today()&&!monthSaved.has(day))||days[0];$('rangeFrom').value=available;$('rangeTo').value=available;}
 updateRangeControls();
}
function renderMonthSummary(){
 const groups=new Map();let otHours=0;
 for(const row of monthSaved.values()){
  const site=['inside','outside'].includes(row.status),key=site?'p:'+row.project_id:'s:'+row.status,name=site?(projects.find(p=>p.id===row.project_id)?.name||row.project_id):tr(labels[row.status]);
  const group=groups.get(key)||{name,count:0};group.count++;groups.set(key,group);otHours+=Number(row.overtime)||0;
 }
 $('monthProjectSummary').innerHTML=`<span><b>${monthSaved.size} ${esc(tr('يوم مسجل'))}</b><br>${otHours} ${esc(tr('ساعة إضافية'))}</span>`+[...groups.values()].map(g=>`<span>${esc(g.name)}<br><b>${g.count} ${esc(tr('أيام'))}</b></span>`).join('');
}
function renderMonthEntries(){
 periodGroups=groupAttendancePeriods([...monthSaved.values()]);
 $('periodCount').textContent=periodGroups.length+' '+tr('فترة');
 $('monthEntryRows').innerHTML=periodGroups.map((group,i)=>{
  const row=group.rows[0],reviews=[...new Set(group.rows.map(r=>r.review))],locked=group.rows.some(r=>r.review==='approved'),review=reviews.length===1?reviews[0]:'mixed';
  const status=tr(labels[row.status])+(row.status==='leave'?' · '+tr({annual:'سنوية',sick:'مرضية',emergency:'طارئة',unpaid:'بدون راتب'}[row.leave_type]):''),project=projects.find(p=>String(p.id)===String(row.project_id))?.name;
  return `<tr class="${editingPeriod?.key===group.key?'editing':''}"><td data-label="${esc(tr('الفترة'))}"><span class="period-dates">${group.from} → ${group.to}</span>${group.skipFriday?`<small>${esc(tr('باستثناء الجمعة'))}</small>`:''}${group.skipWeekend?`<small>${esc(tr('باستثناء الجمعة والسبت'))}</small>`:''}</td><td data-label="${esc(tr('المشروع / الحالة'))}"><b>${esc(project||status)}</b>${project?`<small>${esc(status)}</small>`:''}${row.notes?`<small>${esc(row.notes)}</small>`:''}</td><td data-label="${esc(tr('عدد الأيام'))}">${group.rows.length}</td><td data-label="${esc(tr('إضافي / يوم'))}">${Number(row.overtime)||0}</td><td data-label="${esc(tr('الاعتماد'))}"><span class="status-badge ${review}">${esc(tr(labels[review]||'حالات اعتماد مختلفة'))}</span>${(()=>{const note=group.rows.find(r=>r.review==='rejected'&&r.review_note)?.review_note;return note?`<small class="review-note">${esc(tr('سبب الرفض'))}: ${esc(note)}</small>`:''})()}</td><td data-label="${esc(tr('إجراءات'))}">${locked?`<small>${esc(tr('مقفولة — بها أيام معتمدة'))}</small>`:`<div class="actions"><button type="button" class="secondary" data-edit-period="${i}" ${monthBusy||!monthReady?'disabled':''}>${esc(tr('تعديل'))}</button><button type="button" class="delete-period" data-delete-period="${i}" ${monthBusy||!monthReady?'disabled':''}>${esc(tr('مسح'))}</button></div>`}</td></tr>`;
 }).join('')||`<tr><td colspan="6" class="empty-state">${esc(tr(monthReady?'لا توجد فترات مسجلة. أضف أول فترة من النموذج أعلاه.':'جاري تحميل الفترات…'))}</td></tr>`;
 renderMonthSummary();updateRangeControls();
}
async function loadAttendanceMonth(resetForm=true){
 if(monthBusy)return;
 const key=$('attendanceMonth').value||today().slice(0,7),days=monthDates(key);
 attendanceMonthKey=key;$('attendanceMonth').value=key;$('attendanceMonth').max=today().slice(0,7);
 for(const id of ['rangeFrom','rangeTo']){$(id).min=days[0];$(id).max=days.at(-1)>allowedUntil()?allowedUntil():days.at(-1);}
 monthReady=false;monthBusy=true;monthSaved=new Map();renderMonthEntries();monthlyNotice('جاري تحميل الفترات…');
 try{
  const rows=await checked(db.from('sf_daily_records').select('*').eq('user_id',me.user_id).gte('day',days[0]).lte('day',days.at(-1)).order('day'));
  monthSaved=new Map(rows.map(row=>[row.day,row]));monthReady=true;
  monthlyNotice('');if(resetForm)resetPeriodForm();
 }catch(error){monthlyNotice('تعذر تحميل الشهر. اضغط تحديث للمحاولة مجددًا.');throw error}
 finally{monthBusy=false;renderMonthEntries();}
}
function mayDiscardForm(){return !periodFormDirty||confirm(tr('لديك تغييرات لم تحفظ. هل تريد تركها؟'))}
function startPeriodEdit(group){
 if(monthBusy||!monthReady||group.rows.some(r=>r.review==='approved')||!mayDiscardForm())return;
 editingPeriod={...group,rows:group.rows.map(row=>({...row}))};const row=group.rows[0];
 $('rangeFrom').value=group.from;$('rangeTo').value=group.to;$('rangeStatus').value=['inside','outside'].includes(row.status)?'site':row.status;$('rangeLeave').value=row.leave_type||'annual';
 $('rangeProject').innerHTML=monthProjectOptions(row.project_id);$('rangeProject').value=row.project_id||'';$('includeFriday').checked=!(group.skipFriday||group.skipWeekend);
 $('rangeOvertime').value=row.overtime||0;$('rangeHasOvertime').checked=Number(row.overtime)>0;$('rangeNotes').value=row.notes||'';
 periodFormDirty=false;renderMonthEntries();$('rangeForm').scrollIntoView({behavior:'smooth',block:'start'});$('rangeFrom').focus({preventScroll:true});
}
function periodExisting(group){return group?group.rows.map(row=>({id:row.id,revision:row.period_revision})):[]}
function periodError(error){
 const text=String(error.message||'');
 if(error.code==='PGRST202'||/sf_save_attendance_period.*(schema cache|does not exist)/i.test(text))return Error(tr('يلزم تشغيل ملف attendance-friday-v8.sql في Supabase لتفعيل الفترات والتعديل والمسح.'));
 if(text.includes('FUTURE_OVERTIME'))return Error(tr('لا يمكن تسجيل ساعات إضافية لأيام لم تأتِ بعد. سجّل الأيام القادمة في فترة منفصلة بدون إضافي.'));
  if(text.includes('Future dates are not allowed'))return Error(tr('لا يمكن تسجيل أيام مستقبلية، إلا من يوم 24 حتى نهاية الشهر الحالي.'));
  if(error.code==='23505'||text.includes('PERIOD_OVERLAP'))return Error(tr('الفترة تتداخل مع حضور مسجل. لم يتم تغيير أي سجل؛ اضغط تحديث وراجع التواريخ.'));
 if(/PERIOD_STALE|PERIOD_APPROVED|PERIOD_INCOMPLETE/.test(text))return Error(tr('تغيرت الفترة أو تم اعتمادها. لم يتم تغيير أي سجل؛ اضغط تحديث قبل المحاولة مجددًا.'));
 return error;
}
async function savePeriod(remove=false,group=editingPeriod){
 if(monthBusy||!monthReady)return;
 if(!remove&&$('rangeStatus').value==='site'&&!projectLocationOf($('rangeProject').value))throw Error(tr('لم يحدد المدير موقع هذا المشروع بعد، فلا يمكن تسجيل أيام موقع عليه.'));
 const from=$('rangeFrom').value,to=$('rangeTo').value,skip=!$('includeFriday').checked;
 const row=normalizeMonthEntry({status:$('rangeStatus').value==='site'?projectLocationOf($('rangeProject').value):$('rangeStatus').value,project_id:$('rangeProject').value,leave_type:$('rangeLeave').value,overtime:$('rangeHasOvertime').checked?$('rangeOvertime').value:0,notes:$('rangeNotes').value});
 if(!remove){
  const days=periodDates(from,to,attendanceMonthKey,skip);validateMonthEntry(row);
  const replaced=new Set(group?.rows.map(r=>r.id)||[]);
  if(days.some(day=>monthSaved.has(day)&&!replaced.has(monthSaved.get(day).id)))throw Error(tr('الفترة تتداخل مع حضور مسجل. اختر تواريخ أخرى.'));
 }
 if(group?.rows.some(r=>r.period_revision==null))throw Error(tr('يلزم تشغيل ملف attendance-friday-v8.sql في Supabase لتفعيل الفترات والتعديل والمسح.'));
 monthBusy=true;renderMonthEntries();let committed=false;
 try{
  await checked(db.rpc('sf_save_attendance_period_v8',{
   p_existing:periodExisting(group),p_delete:remove,p_from:remove?null:from,p_to:remove?null:to,p_skip_friday:skip,
   p_status:row.status,p_project_id:row.project_id,p_leave_type:row.leave_type,p_overtime:row.overtime,p_notes:row.notes
  }));committed=true;periodFormDirty=false;editingPeriod=null;
 }catch(error){throw periodError(error)}
 finally{monthBusy=false;renderMonthEntries();}
 if(committed){
  try{await loadAttendanceMonth(true);$('month').value=attendanceMonthKey;await refresh();}
  catch(error){message(tr('تم الحفظ، لكن تعذر تحديث العرض. اضغط تحديث قبل إجراء تغييرات أخرى.'));return;}
  message('');monthlyNotice(remove?'تم مسح الفترة.':group?'تم حفظ التعديل وإعادة إرسال الفترة للاعتماد.':'تمت إضافة الفترة وإرسالها للاعتماد.');
 }
}
$('rangeStatus').onchange=updateRangeControls;$('rangeProject').addEventListener('change',applyProjectLocation);$('rangeHasOvertime').onchange=updateRangeControls;
$('rangeForm').addEventListener('input',()=>{periodFormDirty=true});$('rangeForm').addEventListener('change',()=>{periodFormDirty=true});
$('rangeForm').onsubmit=event=>{event.preventDefault();run(()=>savePeriod())};
$('cancelPeriodEdit').onclick=()=>{if(mayDiscardForm()){resetPeriodForm();renderMonthEntries()}};
$('monthEntryRows').onclick=event=>{
 const button=event.target.closest('button');if(!button||monthBusy||!monthReady)return;
 if(button.dataset.editPeriod!==undefined)startPeriodEdit(periodGroups[Number(button.dataset.editPeriod)]);
 if(button.dataset.deletePeriod!==undefined){const group=periodGroups[Number(button.dataset.deletePeriod)];if(group&&!group.rows.some(row=>row.review==='approved')&&mayDiscardForm()&&confirm(tr('هل تريد مسح الفترة بالكامل؟')+'\n'+group.from+' → '+group.to+' · '+group.rows.length+' '+tr('أيام')))run(()=>savePeriod(true,group));}
};
$('attendanceMonth').onchange=()=>{if(!mayDiscardForm()){$('attendanceMonth').value=attendanceMonthKey;return}run(()=>loadAttendanceMonth(true))};
$('reloadAttendance').onclick=()=>{if(mayDiscardForm())run(async()=>{await loadAttendanceMonth(true);message('')})};
$('quickTimesheet').onclick=()=>run(async()=>{
 if(monthBusy||!monthReady||!me)return;
 $('month').value=attendanceMonthKey;renderTimesheetControls();$('timesheetEngineer').value=me.user_id;$('timesheetProject').value='all';$('timesheetReview').value=$('quickExportReview').value;
 $('quickTimesheet').disabled=true;try{await exportEngineerTimesheets(false)}finally{updateRangeControls()}
});
$('timesheetOptions').onclick=()=>{if(!me)return;$('month').value=attendanceMonthKey;setAttendanceView('monthlySection');setApprovalType('attendance');$('timesheetExportPanel').open=true;renderTimesheetControls();$('timesheetEngineer').value=me.user_id;$('timesheetReview').value=$('quickExportReview').value;run(refresh)};
window.addEventListener('beforeunload',event=>{if(monthlyDirty()){event.preventDefault();event.returnValue=''}});
function activeEngineer(id){return me?.role==='admin'&&members.find(m=>m.user_id===id&&m.role==='engineer'&&m.is_active!==false)}
function validEngineerPassword(password){return typeof password==='string'&&/^[0-9]{6,}$/.test(password)}
async function engineerAccountAction(body){
 const result=await db.functions.invoke('rapid-task',{body});
 if(result.error){let detail;try{detail=await result.error.context.json()}catch{}throw Error(detail?.error||result.error.message)}
 if(result.data?.error)throw Error(result.data.error);return result.data;
}
// Things to fix for an engineer: no allowances set, SEC card expired or expiring within 15 days, card without a reminder email.
function engineerWarnings(m,day=today()){
 const out=[];if(!Number(m.inside_rate)&&!Number(m.outside_rate)&&!Number(m.overtime_rate))out.push({tone:'warn',text:tr('البدلات غير محددة')});
 if(m.sec_card_expiry){const days=Math.round((Date.parse(m.sec_card_expiry+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000);
  if(days<0)out.push({tone:'alert',text:tr('بطاقة SEC منتهية')});else if(days<=15)out.push({tone:'alert',text:language==='en'?`SEC card expires in ${days} day${days===1?'':'s'}`:`بطاقة SEC تنتهي خلال ${days} يوم`});
  if(!m.contact_email)out.push({tone:'info',text:tr('لا يوجد بريد للتذكير')});}
 return out;
}
let engineerFilter='all';
function renderEngineerList(){
 if(me?.role!=='admin'){$('members').innerHTML='';return;}
 const term=$('engineerSearch').value.trim().toLocaleLowerCase();
 const all=members.filter(m=>m.role==='engineer'&&m.is_active!==false).sort((a,b)=>String(a.engineer_id||'').localeCompare(String(b.engineer_id||''),'en',{numeric:true}));
 const attention=all.filter(m=>engineerWarnings(m).length);
 for(const b of document.querySelectorAll('#engineerFilters [data-eng-filter]')){b.classList.toggle('active',b.dataset.engFilter===engineerFilter);const n=b.querySelector('b');if(n)n.textContent=b.dataset.engFilter==='attention'?attention.length:all.length}
 const list=(engineerFilter==='attention'?attention:all).filter(m=>(m.name+' '+m.engineer_id).toLocaleLowerCase().includes(term));
 $('engineerCount').textContent=language==='en'?`${list.length} of ${all.length} active engineers`:`${list.length} من ${all.length} مهندس نشط`;
 const card=m=>{if(!m.sec_card_expiry)return '—';const w=engineerWarnings(m).find(x=>/SEC/.test(x.text));return `<span dir="ltr">${esc(m.sec_card_expiry)}</span>${w?`<small class="eng-flag ${w.tone}">${esc(w.text)}</small>`:''}`};
 $('members').innerHTML=list.map(m=>`<tr><td data-label="${esc(tr('كود الموظف'))}">${esc(m.engineer_id)}</td><td data-label="${esc(tr('اسم المهندس'))}"><b>${esc(m.name)}</b>${engineerWarnings(m).filter(w=>!/SEC/.test(w.text)).map(w=>`<small class="eng-flag ${w.tone}">${esc(w.text)}</small>`).join('')}</td><td data-label="${esc(tr('بدل داخل الرياض / يوم'))}">${Number(m.inside_rate).toFixed(2)}</td><td data-label="${esc(tr('بدل خارج الرياض / يوم'))}">${Number(m.outside_rate).toFixed(2)}</td><td data-label="${esc(tr('سعر الساعة الإضافية'))}">${Number(m.overtime_rate).toFixed(2)}</td><td data-label="${esc(tr('بطاقة SEC'))}">${card(m)}</td><td><div class="eng-actions"><button type="button" class="secondary" data-edit-member="${esc(m.user_id)}">${esc(tr('تعديل'))}</button><details class="eng-menu"><summary aria-label="${esc(tr('إجراءات أخرى'))}">⋯</summary><div class="eng-menu-list"><button type="button" class="danger" data-remove-member="${esc(m.user_id)}">${esc(tr('حذف المهندس'))}</button></div></details></div></td></tr>`).join('')||`<tr><td colspan="7">${esc(tr('لا يوجد مهندسون مطابقون للبحث.'))}</td></tr>`;
}
async function reloadEngineerDirectory(){
 members=await checked(db.from('sf_daily_members').select('*'));renderEngineerList();renderProjectChoices();renderTimesheetControls();renderApprovalFilters();renderApprovalTable();
}
$('engineerSearch').oninput=renderEngineerList;
$('engineerFilters').onclick=e=>{const b=e.target.closest('[data-eng-filter]');if(!b)return;engineerFilter=b.dataset.engFilter;renderEngineerList()};
Object.assign(translations,{'يحتاج انتباه':'Needs attention','البدلات غير محددة':'Allowances not set','بطاقة SEC منتهية':'SEC card expired','لا يوجد بريد للتذكير':'No reminder email','بطاقة SEC':'SEC card','إجراءات أخرى':'More actions','تغييرات غير محفوظة':'Unsaved changes'});
$('showCreateEngineer').onclick=()=>{$('createEngineerPanel').hidden=false;$('createAccountForm').elements.engineer_id.focus();$('createEngineerPanel').scrollIntoView({behavior:'smooth',block:'start'})};
$('cancelCreateEngineer').onclick=()=>{$('createAccountForm').reset();$('createEngineerPanel').hidden=true};
$('cancelEditEngineer').onclick=()=>{$('engineerPasswordForm').reset();$('editEngineerPanel').hidden=true};
$('members').onclick=e=>{
 const edit=e.target.closest('[data-edit-member]'),remove=e.target.closest('[data-remove-member]');
 if(edit){const member=activeEngineer(edit.dataset.editMember);if(!member)return;
  for(const k of ['user_id','engineer_id','name','inside_rate','outside_rate','overtime_rate','sec_card_no','sec_card_expiry','contact_email'])$('memberForm').elements[k].value=member[k]??'';
  $('engineerPasswordForm').reset();$('engineerPasswordPanel').open=false;$('editEngineerTitle').textContent=tr('تعديل بيانات المهندس والبدلات')+' — '+member.name;
  if(window.sfLoadSupplemental)run(()=>window.sfLoadSupplemental(member));
  $('editEngineerPanel').hidden=false;$('editEngineerPanel').scrollIntoView({behavior:'smooth',block:'start'});$('memberForm').elements.name.focus({preventScroll:true});
 }
 if(remove){const member=activeEngineer(remove.dataset.removeMember);if(!member||!confirm(member.name+' ('+member.engineer_id+')\n'+tr('سيتم إيقاف حساب المهندس وحذفه من القائمة النشطة مع الاحتفاظ بسجلاته السابقة. هل تريد المتابعة؟')))return;
  run(async()=>{remove.disabled=true;try{await checked(db.rpc('sf_archive_attendance_engineer',{engineer_user_id:member.user_id}));$('editEngineerPanel').hidden=true;$('engineerPasswordForm').reset();await reloadEngineerDirectory();message('تم حذف المهندس من القائمة وإيقاف حسابه. سجلاته السابقة محفوظة.')}finally{remove.disabled=false}});
 }
};
$('engineerPasswordForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const form=e.target,password=form.elements.password.value,id=$('memberForm').elements.user_id.value;
 if(!activeEngineer(id))throw Error(tr('اختر مهندسًا نشطًا.'));
 if(!validEngineerPassword(password))throw Error(tr('كلمة المرور يجب أن تكون 6 أرقام على الأقل (0–9).'));
 const button=form.querySelector('button');button.disabled=true;
 try{await engineerAccountAction({action:'password',user_id:id,password});form.reset();$('engineerPasswordPanel').open=false;message('تم تغيير كلمة مرور المهندس.')}finally{button.disabled=false}
})};

translateUI();
setupApprovalFilters();
setupAttendanceTabs();
setupTimesheetExports();
run(load);

function isProjectLeader(){return me?.role==='engineer'&&projects.some(p=>p.leader_user_id===me.user_id)}
function syncLeaderTabAccess(){
 const available=isProjectLeader();$('leaderReviewTabs').hidden=!available;
 if(!available){teamApprovalMode='mine';$('ownApprovalContent').hidden=false;$('teamApprovalContent').hidden=true}
}
function showLeaderReview(mode){
 ++teamLoadRequest;teamLoading=false;
 teamApprovalMode=(mode==='team'&&isProjectLeader())?'team':'mine';
 $('ownApprovalContent').hidden=teamApprovalMode==='team';$('teamApprovalContent').hidden=teamApprovalMode!=='team';
 $('leaderOwnTab').classList.toggle('active',teamApprovalMode==='mine');
 $('leaderTeamTab').classList.toggle('active',teamApprovalMode==='team');
 $('leaderOwnTab').setAttribute('aria-pressed',String(teamApprovalMode==='mine'));
 $('leaderTeamTab').setAttribute('aria-pressed',String(teamApprovalMode==='team'));
 if(teamApprovalMode==='team')run(loadTeamApprovals);
}
$('leaderOwnTab').onclick=()=>showLeaderReview('mine');
$('leaderTeamTab').onclick=()=>showLeaderReview('team');
$('teamApprovalMonth').onchange=()=>run(loadTeamApprovals);
$('teamApprovalRefresh').onclick=()=>run(loadTeamApprovals);
for(const id of ['teamApprovalProject','teamApprovalEngineer','teamApprovalState'])$(id).onchange=renderTeamApprovals;

async function loadTeamApprovals(){
 if(teamApprovalMode!=='team'||!isProjectLeader())return;
 const month=$('teamApprovalMonth').value||$('month').value||today().slice(0,7);
 const request=++teamLoadRequest,userId=me.user_id;
 $('teamApprovalMonth').value=month;teamLoading=true;teamLoadError='';
 teamApprovalData={projects:[],members:[],records:[]};teamGroups=[];teamRejectKey='';
 $('teamApprovalSummary').textContent=tr('جاري تحميل اعتمادات الفريق…');renderTeamApprovals();
 const current=()=>request===teamLoadRequest&&teamApprovalMode==='team'&&me?.user_id===userId&&$('teamApprovalMonth').value===month;
 try{
  const response=await checked(db.rpc('sf_team_approval_data',{p_month:month}));
  if(!current())return;
  teamLoadedMonth=month;
  teamApprovalData={projects:response?.projects||[],members:response?.members||[],records:response?.records||[]};
  const selects=[['teamApprovalProject',teamApprovalData.projects,'جميع مشاريعي','name','id'],['teamApprovalEngineer',teamApprovalData.members,'كل المهندسين','name','user_id']];
  for(const [id,items,all,label,key] of selects){
   const select=$(id),previous=select.value;
   select.innerHTML=`<option value="all">${esc(tr(all))}</option>`+items.map(it=>`<option value="${esc(it[key])}">${esc(it[label])}</option>`).join('');
   select.value=items.some(it=>String(it[key])===String(previous))?previous:'all';
  }
 }catch(error){
  if(!current())return;
  teamLoadError=tr('تعذر تحميل اعتمادات الفريق. اضغط تحديث للمحاولة مجددًا.');
  teamApprovalData={projects:[],members:[],records:[]};teamGroups=[];throw error;
 }finally{if(current()){teamLoading=false;renderTeamApprovals()}}
}
function renderTeamApprovals(){
 const root=$('teamApprovalRows');if(!root)return;
 if(teamLoading){root.innerHTML='';teamGroups=[];return;}
 if(teamLoadError){root.innerHTML='';teamGroups=[];$('teamApprovalSummary').textContent=teamLoadError;return;}
 const project=$('teamApprovalProject').value,engineer=$('teamApprovalEngineer').value,state=$('teamApprovalState').value;
 const items=teamApprovalData.records.filter(r=>(project==='all'||String(r.project_id)===project)&&(engineer==='all'||r.user_id===engineer));
 const grouped=new Map();
 for(const row of items){const key=row.user_id+'|'+(row.period_id||row.id);
  if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row)}
 teamGroups=[...grouped.entries()].map(([key,rows])=>{
  const review=groupReview(rows);return {key,rows,review,from:rows[0].period_from||rows[0].day,to:rows[0].period_to||rows.at(-1).day,
   project_id:rows[0].project_id,user_id:rows[0].user_id,note:rows.find(r=>r.review_note)?.review_note||''};
 }).filter(g=>state==='all'||g.review===state||(state==='pending'&&g.review==='mixed'))
 .sort((a,b)=>a.from.localeCompare(b.from)||a.user_id.localeCompare(b.user_id));
 $('teamApprovalSummary').textContent=tr('الفترات المعروضة')+': '+teamGroups.length+' · '+tr('بانتظار الاعتماد')+': '+teamGroups.filter(g=>g.review==='pending').length;
 const L=v=>` data-label="${esc(tr(v))}"`;
 root.innerHTML=teamGroups.map((g,i)=>{
  const person=teamApprovalData.members.find(m=>m.user_id===g.user_id);
  const project=teamApprovalData.projects.find(p=>String(p.id)===String(g.project_id));
  const canReview=g.review==='pending'&&!teamReviewBusy.has(g.key);
  const actions=canReview&&teamRejectKey===g.key?
   `<div class="reject-box"><textarea id="teamRejectReason" maxlength="500" placeholder="${esc(tr('اكتب سبب الرفض'))}"></textarea><div class="actions"><button type="button" data-team-reject-confirm="${i}">${esc(tr('تأكيد الرفض'))}</button><button type="button" class="secondary" data-team-reject-cancel>${esc(tr('إلغاء'))}</button></div></div>`:
   canReview?`<div class="actions"><button type="button" data-team-approve="${i}">${esc(tr('اعتماد الفترة'))}</button><button type="button" class="secondary" data-team-reject="${i}">${esc(tr('رفض'))}</button></div>`:'—';
  return `<tr><td${L('المهندس / الفترة')}><b>${esc(person?.name||'')}</b><span class="period-dates">${esc(g.from)} → ${esc(g.to)}</span>${g.to>today()?`<small class="review-note previous">${esc(tr('تشمل أيامًا لم تأتِ بعد'))}</small>`:''}</td>`+
   `<td${L('المشروع')}>${esc(project?.name||g.project_id)}</td>`+
   `<td${L('الأيام')}>${g.rows.length}</td>`+
   `<td${L('الاعتماد')}><span class="status-badge ${esc(g.review)}">${esc(tr(labels[g.review]||'حالات اعتماد مختلفة'))}</span>${g.note?`<small class="review-note">${esc(g.note)}</small>`:''}</td>`+
   `<td${L('الإجراءات')}>${actions}</td></tr>`;
 }).join('')||`<tr><td colspan="5" class="empty-state">${esc(tr('لا توجد فترات لفريقك مطابقة للاختيارات.'))}</td></tr>`;
}
$('teamApprovalRows').onclick=e=>run(async()=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.teamRejectCancel!==undefined){teamRejectKey='';renderTeamApprovals();return}
 const index=b.dataset.teamApprove??b.dataset.teamRejectConfirm??b.dataset.teamReject;
 const g=teamGroups[Number(index)];if(!g)return;
 if(b.dataset.teamReject!==undefined){teamRejectKey=g.key;renderTeamApprovals();$('teamRejectReason')?.focus();return}
 const approving=b.dataset.teamApprove!==undefined;
 const note=approving?null:$('teamRejectReason')?.value.trim();
 if(!approving&&!note){message('اكتب سبب الرفض.');return}
 if(approving&&!confirm(tr('اعتماد الفترة')+' '+g.from+' → '+g.to+'؟'))return;
 if(teamReviewBusy.has(g.key)||teamLoadedMonth!==$('teamApprovalMonth').value)return;
 teamReviewBusy.add(g.key);b.disabled=true;
 try{
 try{await checked(db.rpc('sf_leader_review_period',{p_rows:g.rows.map(r=>({id:r.id,revision:r.period_revision})),p_review:approving?'approved':'rejected',p_note:note||null}))}
 catch(error){if(String(error?.message||'').includes('PERIOD_STALE')){teamRejectKey='';await loadTeamApprovals()}throw periodReviewError(error)}
 teamRejectKey='';await loadTeamApprovals();await refresh({quiet:true});
 if(window.sfEmbeddedReviewChanged)window.sfEmbeddedReviewChanged();
 }finally{teamReviewBusy.delete(g.key);b.disabled=false;if(!teamLoading)renderTeamApprovals()}
});
Object.assign(translations,{'تعذر تحميل اعتمادات الفريق. اضغط تحديث للمحاولة مجددًا.':'Unable to load team approvals. Click Refresh to retry.','قائد المشروع':'Project leader','بدون قائد — تعتمد الإدارة':'No leader — admin approval',
 'حالة التايم شيت الخاصة بي':'My timesheet status','اعتماد فريق المشروع':'Team approvals',
 'اعتماد التايم شيت لفريق المشروع':'Project team timesheet approvals','جميع مشاريعي':'All my projects',
 'كل المهندسين':'All engineers','جاري تحميل اعتمادات الفريق…':'Loading team approvals…',
 'الفترات المعروضة':'Displayed periods','لا توجد فترات لفريقك مطابقة للاختيارات.':'No matching team periods.',
 'تحديث اعتمادات الفريق':'Refresh team approvals','تم حفظ المشاريع وقادة المشاريع المختارين.':'Saved project settings and leaders.'});
function setAttendanceView(view,updateHash=true){
 if(view!=='accountingSection'&&window.sfAccountingHasDraft?.()){if(!confirm(tr('لديك تغييرات لم تحفظ. هل تريد تركها؟')))return;window.sfAccountingDiscardDraft?.()}
 const panels=['dailySection','expenseSection','monthlySection','admin','engineersSection','accountingSection'];
 if(me?.role==='accountant')view='accountingSection';
 if(view==='accountingSection'&&!['admin','accountant'].includes(me?.role))view='dailySection';
 if(!panels.includes(view)||(['admin','engineersSection'].includes(view)&&me?.role!=='admin'))view='dailySection';
 for(const id of panels)$(id).hidden=id!==view;
 if(view==='accountingSection')window.sfAccountingOpen?.();else window.sfAccountingClose?.();
 for(const control of document.querySelectorAll('[data-attendance-view]')){
  const selected=control.dataset.attendanceView===view;
  if(control.getAttribute('role')==='tab'){control.setAttribute('aria-selected',String(selected));control.tabIndex=selected?0:-1}else{control.classList.toggle('active',selected);if(selected)control.setAttribute('aria-current','page');else control.removeAttribute('aria-current')}
 }
 if(updateHash&&window.sfEmbeddedNavigate)window.sfEmbeddedNavigate(view);else if(updateHash&&location.hash!=='#'+view)history.replaceState(null,'','#'+view);
}
function setupAttendanceTabs(){
 Object.assign(translations,{'الحسابات':'Accounts','الحضور':'Attendance','المصروفات':'Expenses','السجل والتصدير':'Records & export'});
 for(const control of document.querySelectorAll('[data-attendance-view]'))control.addEventListener('click',event=>{event.preventDefault();setAttendanceView(control.dataset.attendanceView)});
 $('attendanceTabs').addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  const tabs=Array.from($('attendanceTabs').querySelectorAll('[role="tab"]')).filter(tab=>!tab.hidden),index=tabs.indexOf(document.activeElement);if(index<0)return;
  event.preventDefault();const forward=(event.key==='ArrowRight')===(document.documentElement.dir!=='rtl');
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(forward?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus();setAttendanceView(tabs[next].dataset.attendanceView);
 });
 window.addEventListener('hashchange',()=>{if(me)setAttendanceView(location.hash.slice(1),false)});
 translateUI();
}

Object.assign(translations,{"بدون راتب":"Unpaid leave"});

Object.assign(translations,{'ملف Excel واحد لكل المشاريع، من الحضور المعتمد فقط، مع تفاصيل كل يوم وإجمالي الساعات.':'One Excel file for all projects, approved attendance only, with daily details and total hours.'});


Object.assign(translations,{'خارج الرياض':'Outside Riyadh','داخل الرياض':'Inside Riyadh','موقع المشروع':'Project location','— الموقع —':'— Location —',
'موقع هذا المشروع: خارج الرياض — يحدده المدير':'This project is outside Riyadh — set by the administrator',
'موقع هذا المشروع: داخل الرياض — يحدده المدير':'This project is inside Riyadh — set by the administrator',
'لم يحدد المدير موقع هذا المشروع بعد، فلا يمكن تسجيل أيام موقع عليه.':'The administrator has not set this project\'s location yet, so site days cannot be recorded on it.',
'حدد موقع كل مشروع متاح للمهندسين (داخل أو خارج الرياض):':'Set the location (inside or outside Riyadh) of every project available to engineers:',
'حفظ مواقع المشاريع يحتاج تشغيل الملف 13-attendance-project-location-v14.sql في Supabase أولًا.':'Saving project locations needs 13-attendance-project-location-v14.sql to be run in Supabase first.'});
Object.assign(translations,{'حدد موقع كل مشروع (داخل أو خارج الرياض). المهندس لا يختاره؛ أيام الموقع تأخذ موقع المشروع ويُحسب البدل على أساسه.':'Set each project\'s location (inside or outside Riyadh). Engineers do not choose it: site days take the project\'s location and the allowance follows it.'});

Object.assign(translations,{'حدد الموقع':'Set location','المتاحة':'Available','غير المتاحة':'Not available','بلا موقع':'No location','الكل':'All','تحديد المعروض':'Select shown','إلغاء تحديد المعروض':'Clear shown','لا توجد مشاريع مطابقة.':'No matching projects.','ابحث باسم المشروع':'Search by project name'});

// After "Sync attendance & projects" in the main system: reload the project list in place (no page refresh).
// Changes made in Attendance Settings but not saved yet (ticks and locations) are kept; only the rows the
// administrator actually changed are carried over, so changes saved elsewhere are not overwritten.
let sfAttendanceProjectReloadSequence=0;
window.sfReloadAttendanceProjects=async function(){
 if(typeof db==='undefined'||!db||!me)return null;
 const userId=me.user_id,sequence=++sfAttendanceProjectReloadSequence;
 // Stage both reads before touching local state. Failed reads leave the draft intact.
 const latest=await checked(db.from('sf_daily_projects').select('*').order('name'));
 if(me?.user_id!==userId||sequence!==sfAttendanceProjectReloadSequence)return null;
 const visibility=me.role==='admin'?await checked(db.from('sf_daily_project_visibility').select('project_id')):null;
 if(me?.user_id!==userId||sequence!==sfAttendanceProjectReloadSequence)return null;
 // Read the current DOM after all awaits, including changes made during the request.
 const before=new Map(projects.map(p=>[String(p.id),p])),savedOn=new Set(selectedProjectIds),pending=new Map();
 for(const row of document.querySelectorAll('#projectChoices .project-choice')){
  const id=row.dataset.projectRow,on=row.querySelector('.pc-check').checked,loc=projectRowLocation(row),p=before.get(id);
  if(!p)continue;
  const v={};if(on!==savedOn.has(id))v.on=on;if(loc!==(p.location||''))v.loc=loc;
  const leader=row.querySelector('.pc-leader-select')?.value||'';
  if(leader!==(p.leader_user_id||''))v.leader=leader;
  if(Object.keys(v).length)pending.set(id,v);
 }
 projects=latest;syncLeaderTabAccess();
 if(visibility!==null){selectedProjectIds=new Set(visibility.map(r=>String(r.project_id)));projectVisibilityReady=true;$('saveProjectChoices').disabled=false;}
 const added=projects.filter(p=>!before.has(String(p.id))).map(p=>String(p.id));
 const renamed=projects.filter(p=>before.has(String(p.id))&&before.get(String(p.id)).name!==p.name).length;
 if(me.role==='admin'){
  renderProjectChoices();
  for(const [id,v] of pending){
   const row=document.querySelector(`#projectChoices [data-project-row="${CSS.escape(id)}"]`);if(!row)continue;
   if('on' in v)row.querySelector('.pc-check').checked=v.on;
   if('loc' in v)row.querySelectorAll('.pc-loc input').forEach(r=>{r.checked=r.value===v.loc});
   if('leader' in v&&row.querySelector('.pc-leader-select'))row.querySelector('.pc-leader-select').value=v.leader;
  }
  for(const id of added){const row=document.querySelector(`#projectChoices [data-project-row="${CSS.escape(id)}"]`);if(row){row.classList.add('pc-new');row.querySelector('.pc-main').insertAdjacentHTML('beforeend',`<em class="pc-new-badge">${esc(tr('جديد'))}</em>`)}}
  filterProjectChoices();updateProjectCount();
 }
 updateRangeControls();renderMonthEntries();populateProjectSelect($('expenseForm'));
 if(added.length||renamed){
  const parts=[];if(added.length)parts.push(language==='en'?`${added.length} new project${added.length>1?'s':''} added`:`أُضيف ${added.length} مشروع جديد`);
  if(renamed)parts.push(language==='en'?`${renamed} renamed`:`تحدّث اسم ${renamed}`);
  message((parts.join(language==='en'?' · ':' · '))+(pending.size?(language==='en'?' — your unsaved changes were kept.':' — تعديلاتك غير المحفوظة باقية.'):'.'));
 }
 return{added:added.length,renamed,kept:pending.size};
};
Object.assign(translations,{'جديد':'New'});

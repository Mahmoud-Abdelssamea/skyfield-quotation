'use strict';
const translations={"الحضور والمصروفات": "Attendance & expenses", "النظام الرئيسي ←": "Main system →", "دخول المهندس أو الإدارة": "Engineer / administrator sign in", "كود الموظف": "Employee code", "كلمة المرور": "Password", "تسجيل الدخول": "Sign in", "الدوام الافتراضي 08:00 — 16:00": "Standard working day 08:00 — 16:00", "تسجيل الخروج": "Sign out", "تسجيل اليوم": "Daily attendance", "التاريخ": "Date", "حالة اليوم": "Day status", "المكتب — بدون بدل موقع": "Office — no site allowance", "موقع داخل الرياض": "Site inside Riyadh", "موقع خارج الرياض": "Site outside Riyadh", "إجازة": "Leave", "غياب": "Absent", "المشروع": "Project", "نوع الإجازة": "Leave type", "سنوية": "Annual", "مرضية": "Sick", "طارئة": "Emergency", "يوجد أوفر تايم": "Add overtime", "ساعات إضافية": "Overtime hours", "ملاحظات": "Notes", "إرسال الحضور للاعتماد": "Submit attendance for approval", "طلب تعويض مصروف": "Expense reimbursement", "سجّل الفاتورة مرة واحدة. بدل السكن وتعويض فاتورة السكن لنفس الفترة يحتاجان مراجعة الإدارة قبل الاعتماد.": "Submit each invoice once. Housing allowance and housing invoice for the same period require administrator review.", "المشروع / مصروف عام": "Project / general expense", "نوع المصروف": "Expense type", "فاتورة سكن": "Housing invoice", "بدل سكن": "Housing allowance", "بنزين": "Fuel", "انتقالات": "Transport", "بدل إضافي": "Additional allowance", "أخرى": "Other", "المبلغ — ريال": "Amount — SAR", "السبب / الفترة / رقم الفاتورة": "Reason / period / invoice number", "فاتورة إلزامية — PDF / JPG / PNG حتى 5MB": "Required invoice — PDF / JPG / PNG up to 5MB", "إرسال المصروف للاعتماد": "Submit expense for approval", "إعدادات الإدارة": "Administrator settings", "اسم المهندس": "Engineer name", "كلمة مرور مؤقتة": "Temporary password", "إنشاء حساب مهندس": "Create engineer account", "معرّف حساب Supabase": "Supabase account ID", "كود المهندس بالنظام": "Engineer code in main system", "بدل داخل الرياض / يوم": "Daily allowance inside Riyadh", "بدل خارج الرياض / يوم": "Daily allowance outside Riyadh", "سعر الساعة الإضافية": "Overtime hourly rate", "حفظ المهندس والبدلات": "Save engineer and rates", "القيم تطبق على التسجيلات الجديدة؛ التسجيل السابق يحتفظ بقيمته.": "Rates apply to new entries. Existing entries retain their original amounts.", "السجل الشهري والاعتمادات": "Monthly records & approvals", "الشهر": "Month", "تحديث": "Refresh", "تصدير CSV لـ Excel": "Export CSV for Excel", "المهندس / التاريخ": "Engineer / date", "البند": "Item", "المبلغ / ريال": "Amount / SAR", "الحالة": "Approval", "التصفية": "Settlement", "إجراءات": "Actions", "المكتب": "Office", "داخل الرياض": "Inside Riyadh", "خارج الرياض": "Outside Riyadh", "بانتظار الاعتماد": "Pending approval", "معتمد": "Approved", "مرفوض": "Rejected", "تمت التصفية": "Settled", "لم تتم التصفية": "Unsettled", "تصفية كاملة": "Settle in full", "الفاتورة مطلوبة": "Invoice is required", "تم إنشاء حساب المهندس": "Engineer account created", "بدون مشروع / مصروف عام": "No project / general expense", "عرض الإيصال": "View invoice", "اعتماد": "Approve", "رفض": "Reject", "عام": "General", "لا توجد سجلات لهذا الشهر": "No records for this month", "تم الحفظ وإرسال الطلب للاعتماد.": "Saved and submitted for approval."};
Object.assign(translations,{"بوابة المهندسين": "Engineer portal", "سجّل يومك وتابع طلباتك في مكان واحد.": "Record your day and track your requests in one place.", "إضافة مصروف": "Add an expense", "حدد المربع لإدخال المبلغ والسبب ورفع الفاتورة.": "Select to enter an amount, reason and invoice.", "المشاريع المتاحة للمهندسين": "Projects available to engineers", "حدد المشاريع التي تظهر في قوائم الحضور والمصروفات لجميع المهندسين، ثم احفظ الاختيار.": "Choose the projects shown in attendance and expense lists for all engineers, then save.", "لإضافة مشروع جديد، أضفه في النظام الرئيسي ثم اضغط مزامنة مصروفات الحضور والمشاريع.": "Add new projects in the main system, then use the attendance and projects sync action.", "بحث عن مشروع": "Search projects", "تحديد الكل": "Select all", "إلغاء التحديد": "Clear selection", "حفظ المشاريع المختارة": "Save selected projects", "اختر المشروع": "Choose a project", "لا توجد مشاريع متاحة حاليًا. اطلب من الإدارة تحديد المشاريع.": "No projects are available. Ask your administrator to select projects.", "لا توجد مشاريع. زامن المشاريع من النظام الرئيسي أولًا.": "No projects found. Sync projects from the main system first.", "تم حفظ المشاريع المختارة.": "Selected projects saved.", "حدد مشروعًا متاحًا من القائمة.": "Select an available project from the list.", "تم تسجيل حضورك لهذا اليوم بالفعل.": "Your attendance has already been recorded for this date."});
Object.assign(translations,{"بوابة المهندسين — سجّل حضورك ومصروفاتك وتابع التايم شيت من مكان واحد.": "Engineer portal — record attendance, expenses and track your timesheet in one place.", "حضور بفترات وتوزيع على المشاريع": "Date ranges across multiple projects", "متابعة المصروفات والاعتمادات": "Track expenses and approvals", "تصدير التايم شيت إلى Excel": "Export your timesheet to Excel", "أدخل كود الموظف وكلمة المرور لفتح حسابك.": "Enter your employee code and password to open your account.", "كود الموظف أو البريد الإلكتروني": "Employee code or email", "بيانات الدخول يصدرها مسؤول النظام. تواصل معه إذا نسيت كلمة المرور.": "Your administrator provides your sign-in details. Contact them if you forget your password.", "الدخول إلى النظام الرئيسي": "Open the main system", "سجّل فترات العمل وتابع الحضور والمصروفات في مكان واحد.": "Record work periods and track attendance and expenses in one place.", "حدد الفترة والمشروع واضغط إضافة. كل فترة تظهر في سطر واحد أسفل النموذج.": "Select dates and a project, then add. Each period appears as one row below.", "تحديث الفترات": "Refresh periods", "إضافة فترة حضور": "Add an attendance period", "من تاريخ": "From date", "إلى تاريخ": "To date", "حالة الحضور": "Attendance status", "إضافة الفترة": "Add period", "حفظ التعديل": "Save changes", "إلغاء التعديل": "Cancel edit", "تعديل فترة الحضور": "Edit attendance period", "تعديل الفترة يعيد إرسالها للاعتماد.": "Editing resubmits the period for approval.", "الإضافة تحفظ الفترة وترسلها للاعتماد. لا يمكن تكرار نفس اليوم أو تسجيل أيام مستقبلية.": "Adding saves the period and submits it for approval. Duplicate and future dates are not allowed.", "الفترات المسجلة": "Recorded periods", "يمكن تعديل الفترة أو مسحها قبل الاعتماد. الفترة التي تحتوي أيامًا معتمدة تكون مقفولة.": "Edit or delete a period before approval. Periods containing approved days are locked.", "الفترة": "Period", "المشروع / الحالة": "Project / status", "عدد الأيام": "Days", "إضافي / يوم": "OT / day", "الاعتماد": "Approval", "تنزيل Excel Timesheet": "Download Excel Timesheet", "خيارات التايم شيت": "Timesheet options", "حالة التصدير": "Export status", "ملف شهري واحد يشمل مشاريعك؛ تفاصيل الأيام تظهر داخل Excel. تصدير كل الحالات يحمل علامة مسودة.": "One monthly file includes all your projects with daily details in Excel. All-status exports are marked DRAFT.", "باستثناء الجمعة والسبت": "Excludes Friday and Saturday", "اعتماد جزئي": "Mixed review status", "مقفولة — بها أيام معتمدة": "Locked — contains approved days", "تعديل": "Edit", "مسح": "Delete", "غير متاح": "Unavailable", "يوم مسجل": "recorded days", "ساعة إضافية": "overtime hours", "أيام": "days", "فترة": "periods", "لا توجد فترات مسجلة. أضف أول فترة من النموذج أعلاه.": "No recorded periods. Add your first period above.", "جاري تحميل الفترات…": "Loading periods…", "حدد فترة صحيحة داخل الشهر المختار.": "Select a valid period within the selected month.", "لا يمكن تسجيل أيام مستقبلية.": "Future attendance is not allowed.", "الفترة لا تحتوي أيامًا بعد استثناء الجمعة والسبت.": "No days remain after excluding Friday and Saturday.", "الملاحظات بحد أقصى 2000 حرف.": "Notes are limited to 2,000 characters.", "لديك تغييرات لم تحفظ. هل تريد تركها؟": "You have unsaved changes. Discard them?", "هل تريد مسح الفترة بالكامل؟": "Delete the entire period?", "الفترة تتداخل مع حضور مسجل. اختر تواريخ أخرى.": "This period overlaps existing attendance. Choose other dates.", "يلزم تشغيل ملف attendance-periods-v6.sql في Supabase لتفعيل الفترات والتعديل والمسح.": "Run attendance-periods-v6.sql in Supabase to enable periods, editing and deletion.", "الفترة تتداخل مع حضور مسجل. لم يتم تغيير أي سجل؛ اضغط تحديث وراجع التواريخ.": "This period overlaps recorded attendance. Nothing was changed; refresh and check the dates.", "تغيرت الفترة أو تم اعتمادها. لم يتم تغيير أي سجل؛ اضغط تحديث قبل المحاولة مجددًا.": "The period changed or was approved. Nothing was changed; refresh before trying again.", "تم الحفظ، لكن تعذر تحديث العرض. اضغط تحديث قبل إجراء تغييرات أخرى.": "Saved, but the view could not refresh. Refresh before making further changes.", "تم مسح الفترة.": "Period deleted.", "تم حفظ التعديل وإعادة إرسال الفترة للاعتماد.": "Changes saved and period resubmitted for approval.", "تمت إضافة الفترة وإرسالها للاعتماد.": "Period added and submitted for approval."});
let language=localStorage.getItem('sf-language')||'ar';
function tr(s){return language==='en'?(translations[s]||s):s}
const originals=new WeakMap();
function translateUI(){document.documentElement.lang=language;document.documentElement.dir=language==='en'?'ltr':'rtl';for(const node of document.querySelectorAll('.sf-auth-card,.auth-brand-content'))node.dir=document.documentElement.dir;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(['SCRIPT','STYLE'].includes(n.parentElement?.tagName))continue;const original=originals.get(n)||n.textContent;originals.set(n,original);const trimmed=original.trim();if(translations[trimmed])n.textContent=original.replace(trimmed,tr(trimmed));}}

const db=window.supabase.createClient('https://kmcgnttunukbwsqyilcv.supabase.co','sb_publishable_yWyzQzP3IWu0pNzEBDbLNg_sLgr4VJC');
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let me, members=[], projects=[], records=[];
let selectedProjectIds=new Set(), projectVisibilityReady=false;
const labels={office:'المكتب',inside:'داخل الرياض',outside:'خارج الرياض',leave:'إجازة',absent:'غياب',housing_invoice:'فاتورة سكن',housing_allowance:'بدل سكن',fuel:'بنزين',transport:'انتقالات',extra:'بدل إضافي',other:'أخرى',pending:'بانتظار الاعتماد',approved:'معتمد',rejected:'مرفوض'};
function message(s){for(const id of ['message','loginMessage']){$(id).textContent=tr(s);$(id).hidden=!s;}}
async function checked(q){const r=await q;if(r.error)throw r.error;return r.data;}
async function run(fn){try{await fn()}catch(e){const msg=e.code==='23505'&&String(e.message).includes('sf_daily_records_user_id_day_key')?tr('تم تسجيل حضورك لهذا اليوم بالفعل.'):(language==='en'?'Unable to complete: ':'لم تتم العملية: ')+e.message;message(msg)}}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function showPortal(ready){$('login').hidden=ready;$('app').hidden=!ready;document.body.classList.toggle('signed-out',!ready);}
async function load(){
 showPortal(false);me=null;
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;if(!session)return;
 const member=await checked(db.from('sf_daily_members').select('*').eq('user_id',session.user.id).maybeSingle());
 if(!member){message('الحساب غير مربوط بمهندس. اطلب من الإدارة إضافة حسابك.');return;}
 me=member;members=await checked(db.from('sf_daily_members').select('*'));projects=await checked(db.from('sf_daily_projects').select('*').order('name'));
 $('who').textContent=me.name;$('tabAdmin').hidden=me.role!=='admin';$('adminNav').hidden=me.role!=='admin';
 await loadProjectVisibility();showPortal(true);setAttendanceView(location.hash.slice(1)||'dailySection',false);
 const form=$('expenseForm');form.elements.day.value=today();form.elements.day.max=today();populateProjectSelect(form);
 $('month').value=today().slice(0,7);
 $('members').innerHTML=me.role==='admin'?members.map(m=>`<button type="button" class="secondary" data-member="${esc(m.user_id)}">${esc(m.name)} · ${esc(m.engineer_id)}</button>`).join(''):'';
 renderProjectChoices();renderTimesheetControls();await loadAttendanceMonth();await refresh();
}
async function allRows(table,start,end){let result=[];for(let offset=0;;offset+=500){const batch=await checked(db.from(table).select('*').gte('day',start).lt('day',end).order('day').order('id').range(offset,offset+499));result.push(...batch);if(batch.length<500)return result}}
let approvalType='attendance',approvalFiltersReady=false,reviewRequest=0;
function renderApprovalFilters(){
 const select=$('approvalEngineer'),old=select.value,list=me.role==='admin'?members:members.filter(m=>m.user_id===me.user_id);
 select.innerHTML=(me.role==='admin'?`<option value="all">${esc(tr('كل المهندسين'))}</option>`:'')+list.map(m=>`<option value="${esc(m.user_id)}">${esc(m.name)} — ${esc(m.engineer_id)}</option>`).join('');
 select.value=list.some(m=>m.user_id===old)?old:me.role==='admin'?'all':me.user_id;
 if(!approvalFiltersReady){$('approvalState').value=me.role==='admin'?'pending':'all';approvalFiltersReady=true;}
 syncApprovalExportEngineer();
}
function filteredApprovalRecords(){
 const table=approvalType==='expenses'?'sf_daily_expenses':'sf_daily_records',engineer=$('approvalEngineer').value,state=$('approvalState').value;
 return records.map((r,i)=>({r,i})).filter(({r})=>r.table===table&&(engineer==='all'||r.user_id===engineer)&&(state==='all'||r.review===state));
}
function syncApprovalExportEngineer(){const engineer=$('approvalEngineer').value;if(engineer&&engineer!=='all')$('timesheetEngineer').value=engineer;}
function setApprovalType(type){
 approvalType=type==='expenses'?'expenses':'attendance';
 for(const button of document.querySelectorAll('[data-approval-type]'))button.setAttribute('aria-pressed',String(button.dataset.approvalType===approvalType));
 $('timesheetExportPanel').hidden=approvalType==='expenses';renderApprovalTable();
}
function renderApprovalTable(){
 const expenses=approvalType==='expenses',list=filteredApprovalRecords(),total=list.reduce((sum,{r})=>sum+Number(r.amount),0);
 $('approvalTableHead').innerHTML=[tr('المهندس / التاريخ'),tr(expenses?'البند':'حالة اليوم'),tr('المشروع'),tr(expenses?'قيمة المصروف':'بدلات + إضافي'),tr('الحالة'),...(expenses?[tr('التصفية')]:[]),tr('إجراءات')].map(title=>`<th>${esc(title)}</th>`).join('');
 $('summary').textContent=language==='en'?`${list.length} matching ${expenses?'expenses':'attendance entries'} · Displayed total: ${total.toFixed(2)} SAR${expenses?'':' (allowances + overtime only; no base salary)'}`:`${list.length} ${expenses?'مصروف':'سجل حضور'} مطابق · إجمالي المعروض: ${total.toFixed(2)} ريال${expenses?'':' (بدلات وإضافي فقط؛ بدون الراتب الأساسي)'}`;
 $('rows').innerHTML=list.map(({r,i})=>`<tr><td><b>${esc(members.find(m=>m.user_id===r.user_id)?.name)}</b><br>${esc(r.day)}</td><td>${esc(r.label)}<br><small>${esc(r.description||r.notes||'')}</small></td><td>${esc(projects.find(p=>p.id===r.project_id)?.name||tr('عام'))}</td><td>${Number(r.amount).toFixed(2)}</td><td>${esc(tr(labels[r.review]))}</td>${expenses?`<td>${esc(tr(r.settled_at?'تمت التصفية':'لم تتم التصفية'))}${me.role==='admin'&&r.review==='approved'&&!r.settled_at?`<button data-settle="${i}">${esc(tr('تصفية كاملة'))}</button>`:''}</td>`:''}<td>${r.receipt_path?`<button data-receipt="${i}">${esc(tr('عرض الإيصال'))}</button>`:''}${me.role==='admin'&&!r.settled_at?`<div class="actions"><button data-review="${i}" data-value="approved">${esc(tr('اعتماد'))}</button><button class="secondary" data-review="${i}" data-value="rejected">${esc(tr('رفض'))}</button></div>`:''}</td></tr>`).join('')||`<tr><td colspan="${expenses?7:6}">${esc(tr('لا توجد سجلات مطابقة للاختيارات.'))}</td></tr>`;
 $('export').disabled=!list.length;
}
async function refresh(){
 const m=$('month').value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))throw Error(tr('اختر الشهر'));
 const request=++reviewRequest,[y,n]=m.split('-').map(Number),end=`${n===12?y+1:y}-${String(n===12?1:n+1).padStart(2,'0')}-01`;
 records=[];renderApprovalTable();$('summary').textContent=language==='en'?'Loading records…':'جاري تحميل السجلات…';
 let days,expenses;try{[days,expenses]=await Promise.all([allRows('sf_daily_records',m+'-01',end),allRows('sf_daily_expenses',m+'-01',end)])}catch(error){if(request===reviewRequest)$('summary').textContent=language==='en'?'Unable to load records. Click Refresh to retry.':'تعذر تحميل السجلات. اضغط تحديث للمحاولة مجددًا.';throw error}
 if(request!==reviewRequest)return;
 records=[...days.map(r=>({...r,table:'sf_daily_records',amount:Number(r.allowance)+Number(r.overtime_amount),label:tr(labels[r.status])+' · '+r.overtime+' '+(language==='en'?'OT hours':'س إضافي')})),...expenses.map(r=>({...r,table:'sf_daily_expenses',label:tr(labels[r.category])}))];
 renderApprovalFilters();renderApprovalTable();
}
function setupApprovalFilters(){
 Object.assign(translations,{'اعتماد التايم شيت':'Timesheet approvals','اعتماد المصروفات':'Expense approvals','كل المهندسين':'All engineers','كل الحالات':'All statuses','حالة الاعتماد':'Approval status','قيمة المصروف':'Expense amount','بدلات + إضافي':'Allowances + overtime','لا توجد سجلات مطابقة للاختيارات.':'No records match your filters.','تصدير المعروض CSV':'Export displayed CSV','اختر المهندس ونوع الطلب، ثم راجع واعتمد السجلات الظاهرة.':'Choose an engineer and request type, then review and approve the displayed records.'});
 $('approvalEngineer').onchange=()=>{syncApprovalExportEngineer();renderApprovalTable()};$('approvalState').onchange=renderApprovalTable;
 for(const button of document.querySelectorAll('[data-approval-type]'))button.onclick=()=>setApprovalType(button.dataset.approvalType);
 translateUI();
}
$('loginForm').onsubmit=e=>{e.preventDefault();run(async()=>{
 const button=$('loginButton');button.disabled=true;message('');
 try{const code=$('email').value.trim();await checked(db.auth.signInWithPassword({email:code.includes('@')?code:code.toLowerCase()+'@engineers.skyfield.invalid',password:$('password').value}));$('password').value='';await load()}
 finally{button.disabled=false}
})};
$('logout').onclick=()=>{if(monthBusy||!mayDiscardForm())return;run(async()=>{await checked(db.auth.signOut());periodFormDirty=false;location.reload()})};
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){me=null;members=[];records=[];monthSaved.clear();editingPeriod=null;periodFormDirty=false;showPortal(false);}});

function submit(form,fn){form.onsubmit=e=>{e.preventDefault();run(async()=>{const b=form.querySelector('button');b.disabled=true;try{await fn(form);message('تم الحفظ وإرسال الطلب للاعتماد.');await refresh()}finally{b.disabled=false}})}}
submit($('expenseForm'),async f=>{const v=Object.fromEntries(new FormData(f)),file=v.receipt;delete v.receipt;v.project_id=v.project_id||null;v.amount=Number(v.amount);assertProjectAllowed(v.project_id);if(!file?.size)throw Error(tr('الفاتورة مطلوبة'));if(file?.size){if(file.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error('نوع أو حجم الإيصال غير مسموح');v.receipt_path=me.user_id+'/'+crypto.randomUUID();await checked(db.storage.from('sf-receipts').upload(v.receipt_path,file,{contentType:file.type}));}await checked(db.from('sf_daily_expenses').insert(v));f.elements.amount.value='';f.elements.description.value='';f.elements.receipt.value='';});
submit($('memberForm'),async f=>{const v=Object.fromEntries(new FormData(f));if(!members.some(m=>m.user_id===v.user_id))throw Error('اختر مهندسًا من القائمة أولًا');const updates={name:v.name.trim()};if(!updates.name)throw Error('اسم المهندس مطلوب');for(const k of ['inside_rate','outside_rate','overtime_rate'])updates[k]=Number(v[k]);await checked(db.from('sf_daily_members').update(updates).eq('user_id',v.user_id));await load();});
$('members').onclick=e=>{const b=e.target.closest('[data-member]');if(b){const m=members.find(x=>x.user_id===b.dataset.member);for(const k of ['user_id','engineer_id','name','inside_rate','outside_rate','overtime_rate'])$('memberForm').elements[k].value=m[k]}};
$('rows').onclick=e=>run(async()=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.receipt!==undefined){const r=records[Number(b.dataset.receipt)];const d=await checked(db.storage.from('sf-receipts').createSignedUrl(r.receipt_path,60));window.open(d.signedUrl,'_blank','noopener');}if(b.dataset.settle!==undefined){const r=records[Number(b.dataset.settle)];await checked(db.rpc('sf_settle_expense',{expense_id:r.id}));await refresh();}if(b.dataset.review!==undefined){const r=records[Number(b.dataset.review)];if(b.dataset.value==='approved'&&r.category?.startsWith('housing')&&!confirm('تأكد من عدم تعويض نفس السكن ببدل وفاتورة لنفس الفترة. هل تعتمد؟'))return;await checked(db.from(r.table).update({review:b.dataset.value}).eq('id',r.id));await refresh();}});
$('refresh').onclick=()=>run(refresh);$('month').onchange=()=>run(refresh);
$('export').onclick=()=>{const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['المهندس','التاريخ','البند','المشروع','المبلغ','الحالة','ساعات إضافية','التصفية','تاريخ التصفية'],...filteredApprovalRecords().map(({r})=>[members.find(m=>m.user_id===r.user_id)?.name,r.day,r.label,projects.find(p=>p.id===r.project_id)?.name||'عام',r.amount,labels[r.review],r.overtime||0,r.table==='sf_daily_expenses'?tr(r.settled_at?'تمت التصفية':'لم تتم التصفية'):'',r.settled_at||''])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='skyfield-'+approvalType+'-'+$('month').value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('createAccountForm').onsubmit=e=>{e.preventDefault();run(async()=>{const form=e.target,b=form.querySelector('button');b.disabled=true;try{const result=await db.functions.invoke('rapid-task',{body:Object.fromEntries(new FormData(form))});if(result.error){let detail;try{detail=await result.error.context.json()}catch{}throw Error(detail?.error||result.error.message)}form.reset();message(tr('تم إنشاء حساب المهندس'));await load();}finally{b.disabled=false}})};
$('language').value=language;$('loginLanguage').value=language;function changeLanguage(value){language=value;$('language').value=value;$('loginLanguage').value=value;localStorage.setItem('sf-language',language);translateUI();if(me)run(async()=>{renderMonthEntries();updateRangeControls();populateProjectSelect($('expenseForm'));renderProjectChoices();renderTimesheetControls();await refresh()})};$('language').onchange=()=>changeLanguage($('language').value);$('loginLanguage').onchange=()=>changeLanguage($('loginLanguage').value);new MutationObserver(()=>translateUI()).observe(document.body,{childList:true,subtree:true});translateUI();
function availableProjects(){return projects.filter(p=>selectedProjectIds.has(String(p.id)))}
function populateProjectSelect(form){const select=form.elements.project_id,previous=select.value;select.innerHTML=`<option value="">${esc(tr('بدون مشروع / مصروف عام'))}</option>`+availableProjects().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');select.value=selectedProjectIds.has(previous)?previous:'';}
function assertProjectAllowed(id){if(id&&(!projectVisibilityReady||!selectedProjectIds.has(String(id))))throw Error(tr('حدد مشروعًا متاحًا من القائمة.'));}
async function loadProjectVisibility(){projectVisibilityReady=false;try{const rows=await checked(db.from('sf_daily_project_visibility').select('project_id'));selectedProjectIds=new Set(rows.map(r=>String(r.project_id)));projectVisibilityReady=true;}catch(e){selectedProjectIds=new Set();message(language==='en'?'Project selection needs setup: run attendance-projects-v3.sql in Supabase.':'اختيار المشاريع يحتاج تفعيل: نفّذ attendance-projects-v3.sql في Supabase.');}$('saveProjectChoices').disabled=!projectVisibilityReady;}
function updateProjectCount(){const count=$('projectChoices').querySelectorAll('input:checked').length;$('projectCount').textContent=language==='en'?`${count} of ${projects.length} selected`:`تم اختيار ${count} من ${projects.length}`;}
function filterProjectChoices(){const term=$('projectSearch').value.trim().toLocaleLowerCase();for(const label of $('projectChoices').querySelectorAll('label'))label.hidden=!label.textContent.toLocaleLowerCase().includes(term);}
function renderProjectChoices(){if(me?.role!=='admin')return;$('projectChoices').innerHTML=projects.map(p=>`<label><input type="checkbox" name="project" value="${esc(p.id)}" ${selectedProjectIds.has(String(p.id))?'checked':''}><span>${esc(p.name)}</span></label>`).join('')||`<p>${esc(tr('لا توجد مشاريع. زامن المشاريع من النظام الرئيسي أولًا.'))}</p>`;filterProjectChoices();updateProjectCount();}
$('projectSearch').oninput=filterProjectChoices;
$('projectChoices').onchange=updateProjectCount;
$('selectAllProjects').onclick=()=>{for(const field of $('projectChoices').querySelectorAll('input'))field.checked=true;updateProjectCount();};
$('clearProjects').onclick=()=>{for(const field of $('projectChoices').querySelectorAll('input'))field.checked=false;updateProjectCount();};
$('projectVisibilityForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(me?.role!=='admin'||!projectVisibilityReady)return;const button=$('saveProjectChoices');button.disabled=true;try{const ids=Array.from($('projectChoices').querySelectorAll('input:checked'),i=>i.value);await checked(db.rpc('sf_set_visible_projects',{project_ids:ids}));selectedProjectIds=new Set(ids);updateRangeControls();renderMonthEntries();populateProjectSelect($('expenseForm'));message('تم حفظ المشاريع المختارة.');}finally{button.disabled=false}})};



Object.assign(translations,{'تعديل بيانات المهندس والبدلات':'Edit engineer and allowances','اختر المهندس من الأسماء أسفل النموذج لتعديل بياناته.':'Select an engineer below to edit their details.','أضف المهندس هنا ليظهر تلقائيًا في قائمة المهندسين بالنظام الرئيسي.':'Add engineers here to show them automatically in the main Engineers list.'});translateUI();

Object.assign(translations,{
 'الحضور الشهري':'Monthly attendance','وزّع أيام الشهر على المشاريع. يمكنك تعبئة فترة كاملة ثم تعديل كل يوم قبل الإرسال.':'Assign the month across projects. Fill a date range, then adjust individual days before submitting.',
 'تحديث الأيام المسجلة':'Refresh recorded days','تعبئة فترة':'Fill a date range','من يوم':'From day','إلى يوم':'To day','ساعات إضافية لكل يوم':'Overtime hours per day','استثناء الجمعة والسبت':'Exclude Friday and Saturday','تطبيق على الأيام':'Apply to days','التطبيق يعبّئ الجدول فقط. الأيام المسجلة سابقًا والمستقبلية لا تتغير.':'This fills the draft only. Recorded and future days are unchanged.',
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
function isWeekend(day){return [5,6].includes(new Date(day+'T12:00:00Z').getUTCDay())}
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
 if(row.status==='leave'&&!['annual','sick','emergency'].includes(row.leave_type))throw Error(tr('نوع الإجازة مطلوب.'));
 if(!Number.isFinite(row.overtime)||row.overtime<0||row.overtime>16||!Number.isInteger(row.overtime*4))throw Error(tr('ساعات الإضافي يجب أن تكون بين 0 و16 وبمضاعفات ربع ساعة.'));
 if(row.notes.length>2000)throw Error(tr('الملاحظات بحد أقصى 2000 حرف.'));
}
function periodDates(from,to,month,skipWeekend,cutoff=today()){
 const days=monthDates(month);
 if(!days.includes(from)||!days.includes(to)||to<from)throw Error(tr('حدد فترة صحيحة داخل الشهر المختار.'));
 if(to>cutoff)throw Error(tr('لا يمكن تسجيل أيام مستقبلية.'));
 const result=days.filter(day=>day>=from&&day<=to&&(!skipWeekend||!isWeekend(day)));
 if(!result.length)throw Error(tr('الفترة لا تحتوي أيامًا بعد استثناء الجمعة والسبت.'));
 return result;
}
function periodSignature(row){return JSON.stringify([row.status,row.project_id||null,row.leave_type||null,Number(row.overtime),row.notes||'',row.review])}
function groupAttendancePeriods(rows){
 const groups=[],byId=new Map();let legacy=null;
 for(const row of [...rows].sort((a,b)=>a.day.localeCompare(b.day))){
  if(row.period_id){let group=byId.get(row.period_id);if(!group){group={key:row.period_id,from:row.period_from||row.day,to:row.period_to||row.day,skipWeekend:!!row.period_skip_weekend,rows:[]};byId.set(row.period_id,group);groups.push(group)}group.rows.push(row);legacy=null;}
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
function updateRangeControls(){
 const disabled=monthBusy||!monthReady;
 for(const field of $('rangeForm').elements)field.disabled=disabled;
 const status=$('rangeStatus').value,site=['inside','outside'].includes(status),off=['leave','absent'].includes(status);
 $('rangeProjectLabel').hidden=!site;$('rangeProject').required=site;$('rangeProject').disabled=disabled||!site;
 const selected=$('rangeProject').value;$('rangeProject').innerHTML=monthProjectOptions(selected);
 $('rangeLeaveLabel').hidden=status!=='leave';$('rangeLeave').disabled=disabled||status!=='leave';
 $('rangeOvertimeToggle').hidden=off;$('rangeHasOvertime').disabled=disabled||off;
 $('rangeOvertimeLabel').hidden=off||!$('rangeHasOvertime').checked;$('rangeOvertime').disabled=disabled||off||!$('rangeHasOvertime').checked;
 $('attendanceMonth').disabled=monthBusy;$('reloadAttendance').disabled=monthBusy;
 $('applyRange').textContent=tr(editingPeriod?'حفظ التعديل':'إضافة الفترة');$('rangeFormTitle').textContent=tr(editingPeriod?'تعديل فترة الحضور':'إضافة فترة حضور');
 $('cancelPeriodEdit').hidden=!editingPeriod;$('rangeEditHint').hidden=!editingPeriod;
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
  const status=tr(labels[row.status])+(row.status==='leave'?' · '+tr({annual:'سنوية',sick:'مرضية',emergency:'طارئة'}[row.leave_type]):''),project=projects.find(p=>String(p.id)===String(row.project_id))?.name;
  return `<tr class="${editingPeriod?.key===group.key?'editing':''}"><td data-label="${esc(tr('الفترة'))}"><span class="period-dates">${group.from} → ${group.to}</span>${group.skipWeekend?`<small>${esc(tr('باستثناء الجمعة والسبت'))}</small>`:''}</td><td data-label="${esc(tr('المشروع / الحالة'))}"><b>${esc(project||status)}</b>${project?`<small>${esc(status)}</small>`:''}${row.notes?`<small>${esc(row.notes)}</small>`:''}</td><td data-label="${esc(tr('عدد الأيام'))}">${group.rows.length}</td><td data-label="${esc(tr('إضافي / يوم'))}">${Number(row.overtime)||0}</td><td data-label="${esc(tr('الاعتماد'))}"><span class="status-badge ${review}">${esc(tr(labels[review]||'حالات اعتماد مختلفة'))}</span></td><td data-label="${esc(tr('إجراءات'))}">${locked?`<small>${esc(tr('مقفولة — بها أيام معتمدة'))}</small>`:`<div class="actions"><button type="button" class="secondary" data-edit-period="${i}" ${monthBusy||!monthReady?'disabled':''}>${esc(tr('تعديل'))}</button><button type="button" class="delete-period" data-delete-period="${i}" ${monthBusy||!monthReady?'disabled':''}>${esc(tr('مسح'))}</button></div>`}</td></tr>`;
 }).join('')||`<tr><td colspan="6" class="empty-state">${esc(tr(monthReady?'لا توجد فترات مسجلة. أضف أول فترة من النموذج أعلاه.':'جاري تحميل الفترات…'))}</td></tr>`;
 renderMonthSummary();updateRangeControls();
}
async function loadAttendanceMonth(resetForm=true){
 if(monthBusy)return;
 const key=$('attendanceMonth').value||today().slice(0,7),days=monthDates(key);
 attendanceMonthKey=key;$('attendanceMonth').value=key;$('attendanceMonth').max=today().slice(0,7);
 for(const id of ['rangeFrom','rangeTo']){$(id).min=days[0];$(id).max=days.at(-1)>today()?today():days.at(-1);}
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
 $('rangeFrom').value=group.from;$('rangeTo').value=group.to;$('rangeStatus').value=row.status;$('rangeLeave').value=row.leave_type||'annual';
 $('rangeProject').innerHTML=monthProjectOptions(row.project_id);$('rangeProject').value=row.project_id||'';$('skipWeekend').checked=group.skipWeekend;
 $('rangeOvertime').value=row.overtime||0;$('rangeHasOvertime').checked=Number(row.overtime)>0;$('rangeNotes').value=row.notes||'';
 periodFormDirty=false;renderMonthEntries();$('rangeForm').scrollIntoView({behavior:'smooth',block:'start'});$('rangeFrom').focus({preventScroll:true});
}
function periodExisting(group){return group?group.rows.map(row=>({id:row.id,revision:row.period_revision})):[]}
function periodError(error){
 const text=String(error.message||'');
 if(error.code==='PGRST202'||/sf_save_attendance_period.*(schema cache|does not exist)/i.test(text))return Error(tr('يلزم تشغيل ملف attendance-periods-v6.sql في Supabase لتفعيل الفترات والتعديل والمسح.'));
 if(error.code==='23505'||text.includes('PERIOD_OVERLAP'))return Error(tr('الفترة تتداخل مع حضور مسجل. لم يتم تغيير أي سجل؛ اضغط تحديث وراجع التواريخ.'));
 if(/PERIOD_STALE|PERIOD_APPROVED|PERIOD_INCOMPLETE/.test(text))return Error(tr('تغيرت الفترة أو تم اعتمادها. لم يتم تغيير أي سجل؛ اضغط تحديث قبل المحاولة مجددًا.'));
 return error;
}
async function savePeriod(remove=false,group=editingPeriod){
 if(monthBusy||!monthReady)return;
 const from=$('rangeFrom').value,to=$('rangeTo').value,skip=$('skipWeekend').checked;
 const row=normalizeMonthEntry({status:$('rangeStatus').value,project_id:$('rangeProject').value,leave_type:$('rangeLeave').value,overtime:$('rangeHasOvertime').checked?$('rangeOvertime').value:0,notes:$('rangeNotes').value});
 if(!remove){
  const days=periodDates(from,to,attendanceMonthKey,skip);validateMonthEntry(row);
  const replaced=new Set(group?.rows.map(r=>r.id)||[]);
  if(days.some(day=>monthSaved.has(day)&&!replaced.has(monthSaved.get(day).id)))throw Error(tr('الفترة تتداخل مع حضور مسجل. اختر تواريخ أخرى.'));
 }
 if(group?.rows.some(r=>r.period_revision==null))throw Error(tr('يلزم تشغيل ملف attendance-periods-v6.sql في Supabase لتفعيل الفترات والتعديل والمسح.'));
 monthBusy=true;renderMonthEntries();let committed=false;
 try{
  await checked(db.rpc('sf_save_attendance_period',{
   p_existing:periodExisting(group),p_delete:remove,p_from:remove?null:from,p_to:remove?null:to,p_skip_weekend:skip,
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
$('rangeStatus').onchange=updateRangeControls;$('rangeHasOvertime').onchange=updateRangeControls;
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
translateUI();
setupApprovalFilters();
setupAttendanceTabs();
setupTimesheetExports();
run(load);

function setAttendanceView(view,updateHash=true){
 const panels=['dailySection','expenseSection','monthlySection','admin'];
 if(!panels.includes(view)||(view==='admin'&&me?.role!=='admin'))view='dailySection';
 for(const id of panels)$(id).hidden=id!==view;
 for(const control of document.querySelectorAll('[data-attendance-view]')){
  const selected=control.dataset.attendanceView===view;
  if(control.getAttribute('role')==='tab'){control.setAttribute('aria-selected',String(selected));control.tabIndex=selected?0:-1}else{control.classList.toggle('active',selected);if(selected)control.setAttribute('aria-current','page');else control.removeAttribute('aria-current')}
 }
 if(updateHash&&location.hash!=='#'+view)history.replaceState(null,'','#'+view);
}
function setupAttendanceTabs(){
 Object.assign(translations,{'الحضور':'Attendance','المصروفات':'Expenses','السجل والتصدير':'Records & export'});
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

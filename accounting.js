// Engineers' approved invoices only. All authorization and payment transitions are checked by SQL.
(function(){
'use strict';
const A=id=>document.getElementById(id),T=(ar,en)=>language==='en'?en:ar;
let items=[],request=0,busy=false,loading=false,accountBusy=false,stale=false,timer=0,channel=null,opened=false,editing=null,identity='',exportBusy=false;
const statuses={awaiting:['بانتظار التجهيز','Awaiting preparation'],preparing:['جاري التجهيز','Preparing'],ready:['جاهز للصرف','Ready for payment'],paid:['تم السداد','Paid']};
const status=s=>T(...(statuses[s]||[s,s]));
const permitted=()=>typeof me!=='undefined'&&me&&['admin','accountant'].includes(me.role);
const visible=()=>opened&&permitted()&&document.visibilityState==='visible'&&!A('accountingSection').hidden;
function note(s,error=false){A('acctMessage').textContent=s;A('acctMessage').classList.toggle('error',error)}
function errorText(e){
 const m=String(e?.message||e);
 if(e?.code==='PGRST202'||/Could not find.*sf_accounting/.test(m))return T('قسم الحسابات يحتاج تفعيل ملف SQL رقم 18.','Accounting requires SQL setup file 18.');
 if(/ACCOUNTING_STALE/.test(m))return T('غيّر مستخدم آخر حالة المصروف. حدّث القائمة ثم افتحه مجددًا.','Another user changed this expense. Refresh and open it again.');
 if(/EXPENSE_NOT_APPROVED|EXPENSE_SETTLED/.test(m))return T('تغيّر اعتماد المصروف أو تم سداده. حدّث القائمة.','The expense approval changed or it has been paid. Refresh the list.');
 return m;
}
function filtered(){const state=A('acctState').value,term=A('acctSearch').value.trim().toLocaleLowerCase(),project=A('acctProject').value;
 return items.filter(r=>(!project||project==='all'||(r.project_id||'general')===project)&&(state==='all'||r.status===state)&&(!term||[r.engineer_name,r.engineer_id,r.project_name,r.description,r.payment_reference,r.expense_id].join(' ').toLocaleLowerCase().includes(term)))}
function projectOptions(){const select=A('acctProject'),old=select.value,projects=new Map(items.map(r=>[r.project_id||'general',r.project_name||T('مصروف عام','General expense')]));
 select.innerHTML=`<option value="all">${esc(T('كل المشاريع','All projects'))}</option>`+[...projects].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');select.value=projects.has(old)?old:'all';}
function render(){
 const list=filtered();A('acctSummary').textContent=T(`${list.length} مصروف · الإجمالي ${money(list.reduce((s,r)=>s+Number(r.amount),0))} ريال`,`${list.length} expenses · Total SAR ${money(list.reduce((s,r)=>s+Number(r.amount),0))}`);
 A('acctRows').innerHTML=list.map(r=>`<tr><td><b>${esc(r.engineer_name)}</b><small>${esc(r.engineer_id)} · ${esc(r.day)}</small></td><td>${esc(r.project_name||T('مصروف عام','General expense'))}<small>${esc(tr(labels[r.category]||r.category))} · ${esc(r.description)}</small><small dir="ltr">${esc(r.expense_id)}</small></td><td>${money(r.amount)}</td><td><span class="status-badge ${r.status==='paid'?'approved':'pending'}">${esc(status(r.status))}</span>${r.payment_date?`<small>${esc(r.payment_date)} · ${esc(r.payment_reference)}</small>`:''}${r.updated_by_name?`<small>${esc(r.updated_by_name)}</small>`:''}</td><td><div class="actions"><button type="button" class="secondary" data-acct-action="receipt" data-id="${esc(r.expense_id)}">${esc(T('الفاتورة','Invoice'))}</button><button type="button" class="secondary" data-acct-action="print" data-id="${esc(r.expense_id)}">${esc(T('طباعة سند','Print voucher'))}</button><button type="button" class="secondary" data-acct-action="history" data-id="${esc(r.expense_id)}">${esc(T('السجل','History'))}</button>${r.payment_proof_path?`<button type="button" class="secondary" data-acct-action="proof" data-id="${esc(r.expense_id)}">${esc(T('إثبات السداد','Payment proof'))}</button>`:''}${r.status!=='paid'?`<button type="button" data-acct-action="edit" data-id="${esc(r.expense_id)}" ${stale||busy?'disabled':''}>${esc(T('تجهيز / سداد','Prepare / pay'))}</button>`:''}</div></td></tr>`).join('')||`<tr><td colspan="5">${esc(T('لا توجد مصروفات معتمدة مطابقة.','No matching approved expenses.'))}</td></tr>`;
 A('acctExport').disabled=A('acctPrintAll').disabled=!list.length||stale;
 A('acctPrintList').disabled=!list.length||stale;A('acctReceiptsZip').disabled=!list.length||stale||exportBusy;
}
async function refreshQueue({automatic=false}={}){
 if(!visible()||busy||(automatic&&(editing||loading)))return;
 const token=++request,user=me.user_id,month=A('acctMonth').value||null;
 loading=true;
 if(!automatic){stale=true;items=[];render();note(T('جاري تحميل المصروفات المعتمدة…','Loading approved expenses…'))}
 try{
  const all=[];
  for(let offset=0;;offset+=200){
   const batch=await checked(db.rpc('sf_accounting_queue',{p_month:month,p_offset:offset}));
   if(token!==request||me?.user_id!==user||!opened||A('acctMonth').value!==(month||''))return;
   all.push(...(batch||[]));if((batch||[]).length<200)break;
  }
  items=[...new Map(all.map(r=>[r.expense_id,r])).values()];stale=false;projectOptions();render();if(!exportBusy)note('');
  A('acctUpdated').textContent=T('آخر تحديث: ','Last updated: ')+new Date().toLocaleTimeString(language==='en'?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh'});
 }catch(e){if(token!==request||me?.user_id!==user)return;stale=true;render();note(errorText(e),true)}
 finally{if(token===request)loading=false}
}
async function openFile(r,proof=false){
 // Open synchronously so the browser does not block the invoice after the async signed URL request.
 const popup=window.open('about:blank','_blank');if(!popup)throw Error(T('اسمح بفتح نافذة الفاتورة في المتصفح.','Allow the invoice popup in your browser.'));
 popup.opener=null;
 try{const data=await checked(db.storage.from(proof?'sf-payment-proofs':'sf-receipts').createSignedUrl(proof?r.payment_proof_path:r.receipt_path,120));
  if(!data?.signedUrl)throw Error(T('تعذر فتح المرفق.','Unable to open attachment.'));popup.location.replace(data.signedUrl);
 }catch(e){popup.close();throw e}
}
function printable(rows){
 const cell=x=>esc(x??'');
 return `<!doctype html><html lang="${language}" dir="${language==='en'?'ltr':'rtl'}"><meta charset="utf-8"><title>Sky Field — Expense vouchers</title><style>body{font:14px Arial,sans-serif;color:#152c45;margin:25px}article{page-break-after:always}article:last-child{page-break-after:auto}h1{font-size:21px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bcc8d2;padding:10px;text-align:start}th{width:26%}small{color:#526679}footer{display:flex;justify-content:space-between;margin-top:65px}@media print{button{display:none}}</style><button onclick="window.print()">${cell(T('طباعة','Print'))}</button>`+rows.map(r=>`<article><h1>SKY FIELD · ${cell(T('سند مصروف مهندس','Engineer expense voucher'))}</h1><small dir="ltr">${cell(r.expense_id)}</small><table>`+[
 [T('المهندس / الكود','Engineer / code'),r.engineer_name+' / '+r.engineer_id],[T('تاريخ المصروف','Expense date'),r.day],
 [T('المشروع','Project'),r.project_name||T('مصروف عام','General expense')],[T('المصروف','Expense'),tr(labels[r.category]||r.category)],
 [T('البيان','Description'),r.description],[T('المبلغ / ريال','Amount / SAR'),money(r.amount)],[T('حالة الحسابات','Accounting status'),status(r.status)],
 [T('اعتماد الإدارة','Administrator approval'),r.reviewed_at||T('معتمد','Approved')],[T('تاريخ السداد','Payment date'),r.payment_date||'—'],
 [T('مرجع التحويل','Payment reference'),r.payment_reference||'—'],[T('ملاحظات الحسابات','Accounting note'),r.note||'—']
 ].map(([k,v])=>`<tr><th>${cell(k)}</th><td>${cell(v)}</td></tr>`).join('')+`</table><p>${cell(T('الفاتورة الأصلية وإثبات التحويل يفتحان من قائمة الحسابات للطباعة. هذا السند لا ينفّذ أي تحويل مالي.','Open the original invoice and payment proof from Accounts to print them. This voucher does not execute a money transfer.'))}</p><footer><span>${cell(T('إعداد الحسابات','Prepared by accounting'))}</span><span>${cell(T('المراجعة','Reviewed by'))}</span><span>${cell(T('استلام المستفيد','Received by'))}</span></footer></article>`).join('')+'</html>';
}
function printRows(rows){const w=window.open('about:blank','_blank');if(!w)throw Error(T('اسمح بنافذة الطباعة.','Allow the print popup.'));w.opener=null;w.document.open();w.document.write(printable(rows));w.document.close();w.focus()}
function csvText(rows,receipts=null){
 const safe=v=>'"'+String(v??'').replace(/^\s*[=+@\-]/,"'$&").replace(/"/g,'""')+'"';
 const headers=['Expense ID','Engineer','Employee code','Date','Project','Category','Description','Amount SAR','Accounting status','Payment date','Payment reference','Note'];if(receipts)headers.push('Invoice file');
 const data=[headers,...rows.map(r=>{const values=[r.expense_id,r.engineer_name,r.engineer_id,r.day,r.project_name,tr(labels[r.category]||r.category),r.description,r.amount,status(r.status),r.payment_date,r.payment_reference,r.note];if(receipts)values.push(receipts.get(r.expense_id)||'');return values})];
 return '\ufeff'+data.map(row=>row.map(safe).join(',')).join('\r\n');
}
function exportCsv(){
 if(stale)return;
 const url=URL.createObjectURL(new Blob([csvText(filtered())],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='SkyField-Engineer-Expenses-'+(A('acctMonth').value||'unpaid')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function downloadReceipts(){
 if(stale||exportBusy||!permitted())return;const rows=filtered().map(r=>({...r})),user=me.user_id;if(!rows.length)return;
 exportBusy=true;render();const files={},receipts=new Map();let size=0;
 try{
  for(let i=0;i<rows.length;i++){
   if(me?.user_id!==user||!permitted())return;note(T(`جاري تجهيز الإيصالات ${i+1} / ${rows.length}…`,`Preparing receipts ${i+1} / ${rows.length}…`));const r=rows[i];
   if(!r.receipt_path)throw Error(T('يوجد مصروف بدون فاتورة.','An expense has no invoice.'));
   const blob=await checked(db.storage.from('sf-receipts').download(r.receipt_path));size+=blob.size;
   if(size>150*1024*1024)throw Error(T('حجم الإيصالات كبير؛ صفِّ القائمة بمشروع أو شهر ثم أعد التنزيل.','Receipts are too large; filter by project or month and retry.'));
   const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[blob.type]||'bin',file=`receipts/${String(i+1).padStart(4,'0')}-${r.expense_id}.${ext}`;
   files[file]=new Uint8Array(await blob.arrayBuffer());receipts.set(r.expense_id,file);
  }
  if(me?.user_id!==user||!permitted())return;files['expenses.csv']=fflate.strToU8(csvText(rows,receipts));files['README.txt']=fflate.strToU8(T('فك الضغط وافتح expenses.csv. عمود Invoice file يحدد الفاتورة الأصلية لكل مصروف.','Extract the ZIP and open expenses.csv. The Invoice file column identifies each original invoice.'));
  const url=URL.createObjectURL(new Blob([fflate.zipSync(files,{level:0})],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='SkyField-Accounting-'+today()+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note(T('تم تجهيز الكشف والفواتير الأصلية.','The list and original invoices are ready.'));
 }catch(e){if(me?.user_id===user)note(errorText(e),true)}finally{exportBusy=false;render();}
}
function printList(){
 if(stale)return;const rows=filtered(),heads=T(['التاريخ','المهندس / الكود','المشروع','الوصف','المبلغ SAR','الحالة'],['Date','Engineer / code','Project','Description','Amount SAR','Status']);
 const w=window.open('about:blank','_blank');if(!w)throw Error(T('اسمح بنافذة الطباعة.','Allow the print popup.'));w.opener=null;
 const cells=r=>[r.day,r.engineer_name+' / '+r.engineer_id,r.project_name||T('مصروف عام','General expense'),r.description,money(r.amount),status(r.status)].map(v=>`<td>${esc(v)}</td>`).join('');
 w.document.write(`<!doctype html><html lang="${language}" dir="${language==='en'?'ltr':'rtl'}"><meta charset="utf-8"><title>Sky Field — Expense list</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#173b65}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbc8d6;padding:9px;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}@media print{button{display:none}}</style><h1>SKY FIELD · ${esc(T('كشف المصروفات المعتمدة','Approved expense list'))}</h1><p>${esc(today())}</p><button onclick="window.print()">${esc(T('طباعة','Print'))}</button><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cells(r)}</tr>`).join('')}<tr><th colspan="4">${esc(T('الإجمالي','Total'))}</th><th>${money(rows.reduce((s,r)=>s+Number(r.amount),0))}</th><td>${rows.length}</td></tr></tbody></table></html>`);w.document.close();w.focus();
}
function openEditor(r){
 if(stale||busy)return;editing={...r};const f=A('acctPaymentForm');f.reset();
 A('acctEditTitle').textContent=r.engineer_name+' · '+money(r.amount)+' '+T('ريال','SAR');
 A('acctNextStatus').value={awaiting:'preparing',preparing:'ready',ready:'paid'}[r.status];
 A('acctNextLabel').textContent=status(A('acctNextStatus').value);
 f.elements.payment_date.value=today();f.elements.payment_date.max=today();f.elements.note.value=r.note||'';
 const paying=r.status==='ready';A('acctPaymentFields').hidden=!paying;
 for(const key of ['payment_date','reference','proof'])f.elements[key].required=paying;
 A('acctEditPanel').hidden=false;A('acctEditPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function closeEditor(){editing=null;A('acctEditPanel').hidden=true;A('acctPaymentForm').reset()}
async function savePayment(e){
 e.preventDefault();if(!editing||busy||!permitted())return;const row={...editing},user=me.user_id,f=e.target;
 const next=A('acctNextStatus').value;if(next==='paid'&&!confirm(T(`تأكيد تسجيل سداد ${money(row.amount)} ريال إلى ${row.engineer_name}؟ لا ينفّذ النظام تحويلًا بنكيًا.`,`Record payment of SAR ${money(row.amount)} to ${row.engineer_name}? No bank transfer will be executed.`)))return;
 const payment={date:f.elements.payment_date.value,reference:f.elements.reference.value.trim(),note:f.elements.note.value.trim()||null,file:f.elements.proof.files[0]};
 busy=true;let completion='',failed=false;const button=A('acctSavePayment');button.disabled=true;
 try{
  let path=null;
  if(next==='paid'){
   const file=payment.file;if(!file||file.size>5242880||!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error(T('إثبات التحويل مطلوب: PDF أو JPG أو PNG حتى 5MB.','A payment proof is required: PDF/JPG/PNG up to 5MB.'));
   if(!payment.date||payment.date>today()||payment.date<'2000-01-01'||!payment.reference)throw Error(T('أدخل تاريخ سداد صحيحًا ومرجع التحويل.','Enter a valid payment date and transfer reference.'));
   path=user+'/'+row.expense_id+'/'+crypto.randomUUID();
   await checked(db.storage.from('sf-payment-proofs').upload(path,file,{contentType:file.type,upsert:false}));
  }
  if(me?.user_id!==user)return;
  await checked(db.rpc('sf_accounting_advance',{p_id:row.expense_id,p_expected_revision:row.revision,p_status:next,
   p_payment_date:next==='paid'?payment.date:null,p_reference:next==='paid'?payment.reference:null,p_proof_path:path,p_note:payment.note}));
  if(me?.user_id!==user)return;
  closeEditor();completion=T('تم حفظ حالة المصروف.','Expense status saved.');stale=false;
 }catch(error){completion=errorText(error);failed=true;if(/ACCOUNTING_STALE|EXPENSE_NOT_APPROVED|EXPENSE_SETTLED/.test(String(error.message))){closeEditor();stale=true}}
 finally{busy=false;button.disabled=false;if(me?.user_id===user){render();if(!editing)await refreshQueue();if(completion)note(completion,failed)}}
}
async function history(r){const rows=await checked(db.rpc('sf_accounting_history',{p_id:r.expense_id}));
 A('acctHistory').hidden=false;A('acctHistoryRows').innerHTML=rows.map(h=>`<tr><td>${esc(status(h.action))}</td><td>${esc(h.actor||'')}</td><td>${esc(new Date(h.at).toLocaleString(language==='en'?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh'}))}</td><td>${esc(h.note||h.reference||'')}</td></tr>`).join('')||`<tr><td colspan="4">${esc(T('لا توجد إجراءات حسابات بعد.','No accounting actions yet.'))}</td></tr>`;
 A('acctHistoryTitle').textContent=r.engineer_name+' · '+r.expense_id;A('acctHistory').scrollIntoView({behavior:'smooth',block:'start'});
}
async function action(e){const b=e.target.closest('[data-acct-action]');if(!b)return;const r=items.find(x=>x.expense_id===b.dataset.id);if(!r)return;
 b.disabled=true;try{const kind=b.dataset.acctAction;if(kind==='receipt'||kind==='proof')await openFile(r,kind==='proof');else if(kind==='edit')openEditor(r);else if(kind==='history')await history(r);else if(kind==='print')printRows([r])}catch(error){note(errorText(error),true)}finally{b.disabled=false}
}
function renderAccounts(){
 A('acctSetup').hidden=me?.role!=='admin';if(me?.role!=='admin')return;
 A('acctAccounts').innerHTML=members.filter(m=>m.role==='accountant').map(m=>`<tr><td>${esc(m.name)}</td><td dir="ltr">${esc(m.engineer_id)}</td><td>${esc(m.is_active?T('نشط','Active'):T('موقوف','Disabled'))}</td><td>${m.is_active?`<button class="secondary" type="button" data-disable-accountant="${esc(m.user_id)}">${esc(T('إيقاف الحساب','Disable account'))}</button>`:''}</td></tr>`).join('');
}
const accountingTranslations={"الحسابات": "Accounts", "حسابات مصروفات المهندسين": "Engineers’ expense accounting", "تظهر فواتير ومصروفات المهندسين هنا بعد اعتماد الإدارة تلقائيًا. القائمة الافتراضية تشمل كل غير المسدد من جميع الشهور. حدّد شهرًا لعرض سجله بما فيه المسدد. يتم التحديث المباشر عند توفره، مع فحص تلقائي كل 15 ثانية أثناء فتح القسم.": "Approved engineers’ invoices appear here automatically. The default list includes unpaid expenses from every month. Choose a month to include its paid items. Live updates are used when available, with a check every 15 seconds while this section is open.", "شهر المصروف — اختياري": "Expense month — optional", "كل غير المسدد": "All unpaid", "حالة الحسابات": "Accounting status", "بانتظار التجهيز": "Awaiting preparation", "جاري التجهيز": "Preparing", "جاهز للصرف": "Ready for payment", "تم السداد": "Paid", "بحث باسم المهندس أو المشروع": "Search engineer or project", "طباعة سندات المعروض": "Print displayed vouchers", "الحالة التالية:": "Next status:", "بيانات السداد": "Payment details", "تاريخ السداد": "Payment date", "مرجع التحويل / السند": "Payment / voucher reference", "إثبات التحويل — PDF / JPG / PNG حتى 5MB": "Payment proof — PDF / JPG / PNG up to 5MB", "سجّل السداد بعد تنفيذ التحويل الفعلي. النظام لا ينفّذ تحويلًا بنكيًا.": "Record payment after the actual transfer. The system does not execute a bank transfer.", "ملاحظات الحسابات": "Accounting note", "حفظ الحالة": "Save status", "المشروع / البيان": "Project / description", "بواسطة": "By", "إغلاق": "Close", "إدارة حسابات المحاسبين": "Manage accountant accounts", "يرى المحاسب المصروفات المعتمدة ومرفقاتها فقط، ويطبعها ويسجل تجهيزها وسدادها. لا يغيّر المبلغ أو الاعتماد ولا يرى الرواتب أو فواتير العملاء أو إعدادات الإدارة.": "Accountants see approved expenses and attachments, print them and record preparation and payment. They cannot change amounts or approvals or access payroll, customer invoices or administration.", "اسم المحاسب": "Accountant name", "البريد الإلكتروني": "Email", "كلمة مرور مؤقتة — 8 أحرف على الأقل": "Temporary password — at least 8 characters", "إنشاء حساب محاسب": "Create accountant account", "الاسم": "Name", "تغيير كلمة المرور": "Change password", "كلمة المرور الجديدة — 8 أحرف على الأقل": "New password — at least 8 characters", "حفظ كلمة المرور": "Save password"};
window.sfAccountingInit=function(){
 Object.assign(translations,accountingTranslations,{'كل المشاريع':'All projects','تنزيل الكشف والفواتير ZIP':'Download list & invoices ZIP','طباعة كشف المصروفات':'Print expense list'});translateUI();
 if(identity!==me?.user_id){window.sfAccountingClose();items=[];identity=me?.user_id||'';editing=null;stale=true;A('acctEditPanel').hidden=true;A('acctHistory').hidden=true}
 A('tabAccounting').hidden=!permitted();renderAccounts();
 if(me?.role==='accountant')for(const b of A('attendanceTabs').querySelectorAll('[data-attendance-view]'))b.hidden=b.id!=='tabAccounting';
};
window.sfAccountingOpen=function(){
 if(!permitted())return;const start=!opened;opened=true;renderAccounts();if(!editing)render();
 if(start){void refreshQueue();timer=setInterval(()=>void refreshQueue({automatic:true}),15000);
  channel=db.channel('accounting-inbox-'+me.user_id).on('postgres_changes',{event:'*',schema:'public',table:'sf_expense_workflow'},()=>{if(visible())void refreshQueue({automatic:true})}).subscribe();}
};
window.sfAccountingClose=function(){opened=false;++request;loading=false;clearInterval(timer);timer=0;if(channel){void db.removeChannel(channel);channel=null}};
A('acctRows').onclick=action;A('acctRefresh').onclick=()=>void refreshQueue();
A('acctMonth').onchange=()=>{if(editing&&!confirm(T('لديك بيانات سداد لم تحفظ. هل تريد تركها؟','Discard the unsaved payment details?'))){A('acctMonth').value=A('acctMonth').dataset.previous||'';return}closeEditor();A('acctMonth').dataset.previous=A('acctMonth').value;A('acctHistory').hidden=true;void refreshQueue()};
A('acctState').onchange=render;A('acctProject').onchange=render;A('acctSearch').oninput=render;
A('acctAllUnpaid').onclick=()=>{A('acctMonth').value='';A('acctMonth').dispatchEvent(new Event('change'))};
A('acctExport').onclick=exportCsv;A('acctPrintAll').onclick=()=>{try{printRows(filtered())}catch(e){note(errorText(e),true)}};
A('acctPrintList').onclick=()=>{try{printList()}catch(e){note(errorText(e),true)}};A('acctReceiptsZip').onclick=downloadReceipts;
A('acctCancelEdit').onclick=()=>{if(busy)return;closeEditor();void refreshQueue()};A('acctPaymentForm').onsubmit=savePayment;
A('acctCloseHistory').onclick=()=>{A('acctHistory').hidden=true};
A('acctCreateForm').onsubmit=async e=>{e.preventDefault();if(me?.role!=='admin'||busy||accountBusy)return;const f=e.target,b=f.querySelector('button');b.disabled=true;accountBusy=true;
 try{await engineerAccountAction({action:'create-accountant',name:f.elements.name.value.trim(),email:f.elements.email.value.trim(),password:f.elements.password.value});f.reset();members=await checked(db.from('sf_daily_members').select('*'));renderAccounts();note(T('تم إنشاء حساب المحاسب. يدخل من نفس صفحة النظام بالبريد وكلمة المرور.','Accountant account created. Sign in from the same system page using email and password.'))}catch(error){note(errorText(error),true)}finally{b.disabled=false;accountBusy=false}};
A('acctAccounts').onclick=async e=>{const b=e.target.closest('[data-disable-accountant]');if(!b||me?.role!=='admin'||!confirm(T('إيقاف صلاحية هذا المحاسب فورًا مع الاحتفاظ بسجل عملياته؟','Disable this accountant immediately and keep their audit history?')))return;
 b.disabled=true;try{await engineerAccountAction({action:'disable-accountant',user_id:b.dataset.disableAccountant});members=await checked(db.from('sf_daily_members').select('*'));renderAccounts();note(T('تم إيقاف حساب المحاسب.','Accountant disabled.'))}catch(error){note(errorText(error),true);b.disabled=false}};
A('acctPasswordForm').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
 try{await checked(db.auth.updateUser({password:f.elements.password.value}));f.reset();note(T('تم تغيير كلمة المرور.','Password changed.'))}catch(error){note(errorText(error),true)}finally{b.disabled=false}};
document.addEventListener('visibilitychange',()=>{if(visible())void refreshQueue({automatic:true})});
window.addEventListener('online',()=>{if(visible())void refreshQueue({automatic:true})});
window.addEventListener('beforeunload',e=>{if(editing){e.preventDefault();e.returnValue=''}});
window.sfAccountingHasDraft=()=>!!editing;
window.sfAccountingLanguageChanged=()=>{if(opened){render();renderAccounts();if(editing)A('acctNextLabel').textContent=status(A('acctNextStatus').value)}};
window.sfAccountingDiscardDraft=closeEditor;
// Expose pure renderers for the local regression harness only through source extraction, not production globals.
})();

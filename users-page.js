'use strict';
// Users & Permissions page, for the system administrator only (sf_my_access().users_admin): every account with its
// attendance role, equipment / Iqama access and commercial access; add engineer, accountant, storekeeper, viewer and
// Iqama-only accounts; change access, password and suspension. Access changes go through sf_users_set_access, accounts,
// passwords and suspension through the rapid-task edge function; every change is written to sf_access_log.
let sfUsersRows=[],sfUsersLog=[],sfUsersLoading=false,sfUsersSearch='',sfUsersFilter='all',sfUsersAdding='',sfUsersNote=null;
const sfUsersBaseShow=showTab,sfUsersBaseAllowed=sfUnifiedAllowed,sfUsersBaseLock=sfLockApp,sfUsersBaseLanguage=sfSetInterfaceLanguage;

const sfUsersT=(en,ar)=>sfUiLanguage==='ar'?ar:en;
const sfUsersEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sfUsersAccess=()=>!!sfAuthReady&&sfUnifiedAccess?.users_admin===true;
const SF_USERS_KINDS={owner:['System administrator','مدير النظام'],engineer:['Engineer','مهندس'],accountant:['Accountant','محاسب'],eqadmin:['Equipment administrator','مدير الأجهزة'],
  storekeeper:['Storekeeper','أمين مخزن'],commercial:['Commercial','تجاري'],viewer:['Equipment viewer','عارض أجهزة'],documents:['Iqama & SEC-ID only','الإقامات فقط'],none:['No access','بدون صلاحيات']};
const SF_USERS_EQUIPMENT=[['','None','لا شيء'],['documents','Iqama & SEC-ID only','الإقامات وSEC-ID فقط'],['viewer','View equipment','عرض الأجهزة فقط'],
  ['storekeeper','Storekeeper (equipment + Iqama)','أمين مخزن (الأجهزة + الإقامات)'],['admin','Equipment administrator','مدير الأجهزة']];
const SF_USERS_NEW=[['engineer','Engineer','مهندس'],['accountant','Accountant','محاسب'],['storekeeper','Storekeeper','أمين مخزن'],['viewer','Equipment viewer','عارض أجهزة'],['documents','Iqama & SEC-ID only','الإقامات فقط']];
function sfUsersKind(u){
  if(u.commercial==='full')return 'owner';
  if(u.engineer_account||u.attendance_role==='engineer')return 'engineer';
  if(u.attendance_role==='accountant')return 'accountant';
  if(u.equipment==='admin')return 'eqadmin';
  if(u.equipment==='storekeeper')return 'storekeeper';
  if(u.commercial==='limited')return 'commercial';
  return u.equipment==='viewer'?'viewer':u.equipment==='documents'?'documents':'none';
}
const sfUsersLabel=k=>sfUsersT(...SF_USERS_KINDS[k]);
function sfUsersDate(v){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
function sfUsersMatches(u){
  const k=sfUsersKind(u);
  if(sfUsersFilter==='engineers')return k==='engineer';
  if(sfUsersFilter==='office')return k!=='engineer';
  if(sfUsersFilter==='suspended')return !!u.suspended;
  return true;
}

function sfUsersStyles(){
  if(document.getElementById('sf-users-style'))return;
  const s=document.createElement('style');s.id='sf-users-style';
  s.textContent=`#sf-users-panel{width:100%;min-width:0;display:flex;flex-direction:column;gap:16px}
.users-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.users-kpi{font-family:inherit;text-align:start;background:#fff;border:1px solid var(--sf-line);border-radius:12px;padding:12px 14px;cursor:pointer;border-top:3px solid var(--k)}
.users-kpi span{display:block;font-size:12px;font-weight:600;color:var(--sf-muted)}.users-kpi b{display:block;font-size:24px;font-weight:800;color:var(--sf-navy);margin-top:2px}
.users-card{background:#fff;border:1px solid var(--sf-line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(31,56,100,.04)}
.users-hdr{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--sf-line)}
.users-hdr h3{margin:0;font-size:15px;font-weight:700;color:var(--sf-navy);display:flex;align-items:center;gap:8px}
.users-count{display:inline-block;min-width:22px;padding:1px 8px;border-radius:999px;background:#EEF1F7;color:var(--sf-navy);font-size:12px;font-weight:700;text-align:center}
.users-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.users-tools input,.users-tools select,.users-table select,.users-form input{font-family:inherit;font-size:13px;padding:7px 10px;border-radius:9px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-text)}
.users-tools input{min-width:200px}.users-table select{max-width:250px}
.users-btn{font-family:inherit;font-size:12px;font-weight:600;padding:6px 11px;border-radius:8px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-navy);cursor:pointer;white-space:nowrap}
.users-btn:hover{border-color:var(--sf-navy);background:#F5F7FB}.users-btn.primary{background:var(--sf-navy);color:#fff;border-color:var(--sf-navy)}.users-btn.primary:hover{opacity:.92}
.users-btn.warn{color:var(--sf-alert-text);border-color:#F2C9C9}.users-btn:disabled{opacity:.55;cursor:default}
.users-table-wrap{overflow-x:auto}
.users-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.users-table th{background:#F4F6FA;color:var(--sf-muted);font-weight:700;font-size:12px;text-align:start;padding:10px 12px;white-space:nowrap;border-bottom:1px solid var(--sf-line)}
.users-table td{padding:10px 12px;border-bottom:1px solid var(--sf-line);vertical-align:middle}.users-table tr[hidden]{display:none!important}
.users-table tbody tr:hover td{background:#F7F9FC}.users-table tr.is-suspended td{background:#FFF8F8}
.users-person{display:flex;align-items:center;gap:10px}.users-person b{display:block;font-weight:700;color:var(--sf-text)}
.users-person .sub{display:block;color:var(--sf-muted);font-size:11px}
.users-avatar{flex:0 0 34px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#E7ECF6;color:var(--sf-navy);font-weight:800;font-size:14px}
.users-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:#EEF0F4;color:var(--sf-navy)}
.users-badge.owner{background:#1F3864;color:#fff}.users-badge.engineer{background:#E8F0FE;color:#1F4E9E}.users-badge.accountant{background:#F3E8FD;color:#6B2FA0}
.users-badge.storekeeper,.users-badge.eqadmin{background:#E8F5EC;color:var(--sf-ok-text)}.users-badge.commercial{background:#FFF1E0;color:var(--sf-warn-text)}
.users-badge.none{background:#F4F4F6;color:var(--sf-muted)}.users-badge.off{background:#FDECEC;color:var(--sf-alert-text)}
.users-row-actions{display:flex;flex-wrap:wrap;gap:5px}.users-muted{color:var(--sf-muted);font-size:12px}
.users-form{padding:14px 16px;border-bottom:1px solid var(--sf-line);background:#FAFBFD;display:flex;flex-direction:column;gap:12px}
.users-types{display:flex;flex-wrap:wrap;gap:6px}.users-types button[aria-pressed="true"]{background:var(--sf-navy);color:#fff;border-color:var(--sf-navy)}
.users-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.users-fields label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sf-muted)}
.users-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--sf-text)}.users-hint{font-size:12px;color:var(--sf-muted);margin:0}
.users-note{padding:10px 16px;font-size:13px;border-radius:10px}.users-note.ok{background:#E8F5EC;color:var(--sf-ok-text)}.users-note.err{background:#FDECEC;color:var(--sf-alert-text)}
.users-log{list-style:none;margin:0;padding:6px 16px 14px;font-size:12px}.users-log li{padding:7px 0;border-bottom:1px dashed var(--sf-line);display:flex;justify-content:space-between;gap:10px}
.users-log li:last-child{border-bottom:0}.users-empty{padding:18px 16px;color:var(--sf-muted);font-size:13px;text-align:center}
.users-sheet{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.users-sheet form{background:#fff;border-radius:14px;padding:18px;width:min(380px,100%);display:flex;flex-direction:column;gap:10px}
.users-sheet h4{margin:0;color:var(--sf-navy);font-size:15px}.users-sheet input{font-family:inherit;font-size:14px;padding:9px 11px;border-radius:9px;border:1px solid var(--sf-line)}
@media(max-width:760px){.users-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.users-tools input{min-width:0;flex:1}
 .users-table thead{display:none}.users-table tr{display:block;border-bottom:1px solid var(--sf-line);padding:8px 0}
 .users-table td{display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;padding:6px 14px;background:transparent!important}
 .users-table td::before{content:attr(data-label);color:var(--sf-muted);font-weight:600;font-size:12px}.users-table td.users-name-cell::before{display:none}}`;
  document.head.appendChild(s);
}

function sfUsersEquipmentCell(u){
  if(u.engineer_account)return '<span class="users-muted">—</span>';
  const current=SF_USERS_EQUIPMENT.find(o=>o[0]===(u.equipment||''));
  if(u.protected)return `<span>${sfUsersEsc(sfUsersT(current[1],current[2]))}</span>`;
  return `<select data-users-set="equipment" data-id="${u.user_id}" aria-label="${sfUsersEsc(sfUsersT('Equipment & Iqama','الأجهزة والإقامات'))}">${SF_USERS_EQUIPMENT.map(o=>`<option value="${o[0]}"${o[0]===(u.equipment||'')?' selected':''}>${sfUsersEsc(sfUsersT(o[1],o[2]))}</option>`).join('')}</select>`;
}
function sfUsersCommercialCell(u){
  if(u.commercial==='full')return `<span>${sfUsersEsc(sfUsersT('Full','كامل'))}</span>`;
  if(u.engineer_account||u.attendance_role)return `<span class="users-muted" title="${sfUsersEsc(sfUsersT('Engineer and accountant accounts open their own pages.','حسابات المهندسين والمحاسبين تفتح صفحاتها فقط.'))}">—</span>`;
  if(u.protected)return `<span>${sfUsersEsc(u.commercial?sfUsersT('Limited','محدود'):sfUsersT('None','لا شيء'))}</span>`;
  // Short option text so it fits the column; what "limited" leaves out is in the tooltip.
  return `<select data-users-set="commercial" data-id="${u.user_id}" aria-label="${sfUsersEsc(sfUsersT('Commercial','الأقسام التجارية'))}" title="${sfUsersEsc(sfUsersT('Limited: quotations, projects and invoices, without salaries or engineers','محدود: عروض الأسعار والمشاريع والفواتير، بدون الرواتب والمهندسين'))}">
    <option value=""${u.commercial?'':' selected'}>${sfUsersEsc(sfUsersT('None','لا شيء'))}</option>
    <option value="limited"${u.commercial==='limited'?' selected':''}>${sfUsersEsc(sfUsersT('Limited','محدود'))}</option></select>`;
}
function sfUsersFormHtml(){
  if(!sfUsersAdding)return '';
  const type=sfUsersAdding,engineer=type==='engineer';
  return `<form class="users-form" id="sf-users-form" autocomplete="off">
    <div class="users-types">${SF_USERS_NEW.map(([k,en,ar])=>`<button type="button" class="users-btn" data-users-type="${k}" aria-pressed="${k===type}">${sfUsersEsc(sfUsersT(en,ar))}</button>`).join('')}</div>
    <div class="users-fields">
      <label>${sfUsersEsc(sfUsersT('Name','الاسم'))}<input name="name" required maxlength="150"></label>
      ${engineer?`<label>${sfUsersEsc(sfUsersT('Employee code (signs in with it)','كود الموظف (يدخل به)'))}<input name="code" required inputmode="numeric" pattern="[0-9]{6,40}" dir="ltr"></label>`
        :`<label>${sfUsersEsc(sfUsersT('E-mail (signs in with it)','البريد الإلكتروني (يدخل به)'))}<input name="email" type="email" required maxlength="254" dir="ltr"></label>`}
      <label>${sfUsersEsc(sfUsersT('Password','كلمة المرور'))}<input name="password" type="password" required autocomplete="new-password" dir="ltr" ${engineer?'inputmode="numeric" pattern="[0-9]{6,}"':'minlength="8" maxlength="128"'}></label>
    </div>
    <p class="users-hint">${sfUsersEsc(engineer?sfUsersT('At least 6 digits. Set the wage and job details afterwards on the Engineers page.','6 أرقام على الأقل. حدّد الأجر وبيانات الوظيفة بعد ذلك من صفحة المهندسين.'):sfUsersT('8 to 128 characters.','من 8 إلى 128 حرفًا.'))}</p>
    ${type==='accountant'?`<label class="users-check"><input type="checkbox" name="docs"> ${sfUsersEsc(sfUsersT('Can also update Iqama and SEC-ID dates','يقدر كمان يحدّث تواريخ الإقامات وSEC-ID'))}</label>`:''}
    ${['storekeeper','viewer','documents'].includes(type)?`<label class="users-check"><input type="checkbox" name="commercial"> ${sfUsersEsc(sfUsersT('Also open the commercial pages (limited: quotations, projects, invoices — no salaries or engineers)','يدخل كمان الأقسام التجارية (محدود: عروض الأسعار والمشاريع والفواتير — بدون الرواتب والمهندسين)'))}</label>`:''}
    <div class="users-row-actions"><button type="submit" class="users-btn primary">${sfUsersEsc(sfUsersT('Create account','إنشاء الحساب'))}</button><button type="button" class="users-btn" data-users-cancel>${sfUsersEsc(sfUsersT('Cancel','إلغاء'))}</button></div>
  </form>`;
}

function sfUsersRender(){
  const panel=document.getElementById('sf-users-panel');if(!panel)return;
  sfUsersStyles();
  const kinds=sfUsersRows.map(sfUsersKind);
  const kpi=(color,label,value,filter)=>`<button type="button" class="users-kpi" style="--k:${color}" data-users-filter="${filter}"><span>${sfUsersEsc(label)}</span><b>${value}</b></button>`;
  const kpis=`<div class="users-kpis">${kpi('var(--sf-navy)',sfUsersT('All accounts','كل الحسابات'),sfUsersRows.length,'all')}
    ${kpi('#3B6FD8',sfUsersT('Engineers','المهندسون'),kinds.filter(k=>k==='engineer').length,'engineers')}
    ${kpi('#2E8B57',sfUsersT('Office & equipment','المكتب والأجهزة'),kinds.filter(k=>k!=='engineer').length,'office')}
    ${kpi('var(--sf-alert)',sfUsersT('Suspended','موقوفة'),sfUsersRows.filter(u=>u.suspended).length,'suspended')}</div>`;
  const rows=sfUsersRows.filter(sfUsersMatches);
  const L=t=>` data-label="${sfUsersEsc(t)}"`;
  const actions=u=>u.protected?`<span class="users-muted">🔒 ${sfUsersEsc(sfUsersT('Protected','محمي'))}</span>`:`<div class="users-row-actions">
    <button type="button" class="users-btn" data-users-act="password" data-id="${u.user_id}">🔑 ${sfUsersEsc(sfUsersT('Password','كلمة المرور'))}</button>
    ${u.suspended?`<button type="button" class="users-btn" data-users-act="unsuspend" data-id="${u.user_id}">▶ ${sfUsersEsc(sfUsersT('Reactivate','تفعيل'))}</button>`
      :`<button type="button" class="users-btn warn" data-users-act="suspend" data-id="${u.user_id}">⏸ ${sfUsersEsc(sfUsersT('Suspend','إيقاف'))}</button>`}</div>`;
  const table=`<div class="users-card"><div class="users-hdr"><h3>👤 ${sfUsersEsc(sfUsersT('Accounts','الحسابات'))} <span class="users-count" id="sf-users-count">${rows.length}</span></h3>
    <div class="users-tools"><input type="search" id="sf-users-search" placeholder="${sfUsersEsc(sfUsersT('Search by name, code or e-mail','بحث بالاسم أو الكود أو البريد'))}" aria-label="${sfUsersEsc(sfUsersT('Search','بحث'))}">
      <select id="sf-users-filter" aria-label="${sfUsersEsc(sfUsersT('Filter','تصفية'))}">${[['all','Everyone','الكل'],['engineers','Engineers','المهندسون'],['office','Office & equipment','المكتب والأجهزة'],['suspended','Suspended','الموقوفة']]
        .map(([v,en,ar])=>`<option value="${v}"${sfUsersFilter===v?' selected':''}>${sfUsersEsc(sfUsersT(en,ar))}</option>`).join('')}</select>
      <button type="button" class="users-btn primary" data-users-add>＋ ${sfUsersEsc(sfUsersT('Add account','إضافة حساب'))}</button></div></div>
    ${sfUsersFormHtml()}
    ${sfUsersLoading?`<div class="users-empty">${sfUsersEsc(sfUsersT('Loading…','جاري التحميل…'))}</div>`:''}
    <div class="users-table-wrap"><table class="users-table"><thead><tr><th>${sfUsersEsc(sfUsersT('Account','الحساب'))}</th><th>${sfUsersEsc(sfUsersT('Type','النوع'))}</th>
      <th>${sfUsersEsc(sfUsersT('Equipment & Iqama','الأجهزة والإقامات'))}</th><th>${sfUsersEsc(sfUsersT('Commercial pages','الأقسام التجارية'))}</th><th>${sfUsersEsc(sfUsersT('Last sign-in','آخر دخول'))}</th><th>${sfUsersEsc(sfUsersT('Actions','إجراءات'))}</th></tr></thead>
    <tbody>${rows.map(u=>{const k=sfUsersKind(u),login=u.engineer_account?(u.code||String(u.email).split('@')[0]):u.email;
      return `<tr class="${u.suspended?'is-suspended':''}" data-search="${sfUsersEsc([u.name,u.code,u.email].filter(Boolean).join(' ').toLowerCase())}">
      <td class="users-name-cell"${L(sfUsersT('Account','الحساب'))}><div class="users-person"><span class="users-avatar">${sfUsersEsc(String(u.name||'?').trim().charAt(0).toUpperCase()||'?')}</span>
        <span><b><bdi>${sfUsersEsc(u.name)}</bdi></b><span class="sub" dir="ltr">${sfUsersEsc(login)}</span></span></div></td>
      <td${L(sfUsersT('Type','النوع'))}><span class="users-badge ${k}">${sfUsersEsc(sfUsersLabel(k))}</span>${u.suspended?` <span class="users-badge off">${sfUsersEsc(sfUsersT('Suspended','موقوف'))}</span>`:''}${u.attendance_role&&u.attendance_active===false?` <span class="users-badge none">${sfUsersEsc(sfUsersT('Archived','مؤرشف'))}</span>`:''}</td>
      <td${L(sfUsersT('Equipment & Iqama','الأجهزة والإقامات'))}>${sfUsersEquipmentCell(u)}</td>
      <td${L(sfUsersT('Commercial pages','الأقسام التجارية'))}>${sfUsersCommercialCell(u)}</td>
      <td${L(sfUsersT('Last sign-in','آخر دخول'))}>${u.last_sign_in?sfUsersDate(u.last_sign_in):`<span class="users-muted">${sfUsersEsc(sfUsersT('Never','لم يدخل بعد'))}</span>`}</td>
      <td${L(sfUsersT('Actions','إجراءات'))}>${actions(u)}</td></tr>`}).join('')||`<tr><td colspan="6" class="users-empty">${sfUsersEsc(sfUsersT('No accounts match.','لا توجد حسابات مطابقة.'))}</td></tr>`}</tbody></table></div></div>`;
  const area={equipment:sfUsersT('Equipment & Iqama','الأجهزة والإقامات'),commercial:sfUsersT('Commercial','التجاري'),password:sfUsersT('Password changed','تغيير كلمة المرور'),suspended:sfUsersT('Suspension','الإيقاف'),account:sfUsersT('Account created','إنشاء حساب')};
  const val=(a,v)=>v===null||v===undefined||v===''?sfUsersT('none','لا شيء'):a==='suspended'?(v==='true'?sfUsersT('suspended','موقوف'):sfUsersT('active','نشط')):a==='account'?sfUsersOptionText('equipment',String(v).replace('created:','')):a==='equipment'||a==='commercial'?sfUsersOptionText(a,v):String(v);
  const log=`<div class="users-card"><div class="users-hdr"><h3>🕘 ${sfUsersEsc(sfUsersT('Recent changes','آخر التغييرات'))}</h3></div>
    ${sfUsersLog.length?`<ul class="users-log">${sfUsersLog.slice(0,30).map(l=>`<li><span><b><bdi>${sfUsersEsc(l.target||'')}</bdi></b> — ${sfUsersEsc(area[l.area]||l.area)}${l.area==='password'?'':`: ${sfUsersEsc(val(l.area,l.old_value))} ${sfUiLanguage==='ar'?'←':'→'} ${sfUsersEsc(val(l.area,l.new_value))}`}</span>
      <span class="users-muted">${sfUsersEsc(sfUsersDate(l.at))} · <bdi>${sfUsersEsc(l.actor||'')}</bdi></span></li>`).join('')}</ul>`
      :`<div class="users-empty">${sfUsersEsc(sfUsersT('No changes yet.','لا توجد تغييرات بعد.'))}</div>`}</div>`;
  const note=sfUsersNote?`<div class="users-note ${sfUsersNote.ok?'ok':'err'}" role="status">${sfUsersEsc(sfUsersNote.text)}</div>`:'';
  panel.innerHTML=note+kpis+table+log;
  sfUsersApplySearch();
}
function sfUsersApplySearch(){
  const q=sfUsersSearch.trim().toLowerCase(),input=document.getElementById('sf-users-search');if(input&&input.value!==sfUsersSearch)input.value=sfUsersSearch;
  const rows=[...(document.getElementById('sf-users-panel')?.querySelectorAll?.('.users-table tbody tr[data-search]')||[])];
  let shown=0;for(const tr of rows){const hit=!q||tr.dataset.search.includes(q);tr.hidden=!hit;if(hit)shown++}
  const c=document.getElementById('sf-users-count');if(c&&rows.length)c.textContent=shown;
}

async function sfUsersLoad(){
  sfUsersLoading=true;sfUsersRender();
  try{
    const [list,log]=await Promise.all([sfDb.rpc('sf_users_list'),sfDb.rpc('sf_users_log',{p_limit:50})]);
    if(list.error)throw list.error;
    sfUsersRows=list.data||[];sfUsersLog=log.error?[]:(log.data||[]);
  }catch(error){console.warn('Users list could not be loaded',error);sfUsersNote={ok:false,text:sfUsersT('The account list could not be loaded. Try again.','تعذر تحميل قائمة الحسابات. حاول مرة أخرى.')}}
  sfUsersLoading=false;sfUsersRender();
}

const SF_USERS_ERRORS={ADMIN_PROTECTED:['The system administrator account cannot be changed here.','حساب مدير النظام لا يتغير من هنا.'],
  ENGINEER_ACCOUNT:['Engineer code accounts open the attendance pages only.','حسابات أكواد المهندسين تفتح صفحات الحضور فقط.'],
  ROLE_CONFLICT:['Engineer and accountant accounts cannot open the commercial pages.','حسابات المهندسين والمحاسبين لا تفتح الأقسام التجارية.'],
  ACCESS_DENIED:['Only the system administrator can change accounts.','تغيير الحسابات لمدير النظام فقط.'],USER_NOT_FOUND:['This account was not found. Refresh the page.','الحساب غير موجود. حدّث الصفحة.'],
  'already been registered':['This e-mail or code already has an account.','هذا البريد أو الكود له حساب بالفعل.'],'duplicate key':['This e-mail or code already has an account.','هذا البريد أو الكود له حساب بالفعل.']};
function sfUsersError(error){const m=String(error?.message||error||'');const code=Object.keys(SF_USERS_ERRORS).find(k=>m.includes(k));return code?sfUsersT(...SF_USERS_ERRORS[code]):m}
async function sfUsersInvoke(body){
  const result=await sfDb.functions.invoke('rapid-task',{body});
  if(result.error){let detail;try{detail=await result.error.context.json()}catch{}throw Error(detail?.error||result.error.message)}
  if(result.data?.error)throw Error(result.data.error);return result.data;
}
const sfUsersName=u=>u?.name||u?.email||'';
function sfUsersOptionText(area,value){
  if(area==='equipment'){const o=SF_USERS_EQUIPMENT.find(x=>x[0]===(value||''));return o?sfUsersT(o[1],o[2]):value}
  return value?sfUsersT('Limited','محدود'):sfUsersT('None','لا شيء');
}
async function sfUsersSetAccess(id,area,value){
  const u=sfUsersRows.find(r=>r.user_id===id);if(!u)return;
  const question=(area==='equipment'?sfUsersT('Equipment & Iqama access','صلاحية الأجهزة والإقامات'):sfUsersT('Commercial pages','الأقسام التجارية'))+` — ${sfUsersName(u)}: ${sfUsersOptionText(area,value)}?`;
  if(!confirm(question)){sfUsersRender();return}
  const {error}=await sfDb.rpc('sf_users_set_access',{p_user:id,p_area:area,p_value:value||null});
  sfUsersNote=error?{ok:false,text:sfUsersError(error)}:{ok:true,text:sfUsersT('Saved. It applies the next time this account opens the site.','تم الحفظ. يسري التغيير عند فتح الحساب للموقع مرة أخرى.')};
  await sfUsersLoad();
}
// Password entry in a small sheet (never a plain prompt), so it is not shown on screen.
let sfUsersAskPassword=(title,hint,pattern)=>new Promise(done=>{
  const sheet=document.createElement('div');sheet.className='users-sheet';
  sheet.innerHTML=`<form><h4>${sfUsersEsc(title)}</h4><input type="password" autocomplete="new-password" dir="ltr" required ${pattern}><p class="users-hint">${sfUsersEsc(hint)}</p>
    <div class="users-row-actions"><button type="submit" class="users-btn primary">${sfUsersEsc(sfUsersT('Save','حفظ'))}</button><button type="button" class="users-btn">${sfUsersEsc(sfUsersT('Cancel','إلغاء'))}</button></div></form>`;
  const close=v=>{sheet.remove();done(v)};
  sheet.querySelector('form').onsubmit=e=>{e.preventDefault();close(sheet.querySelector('input').value)};
  sheet.querySelector('button[type="button"]').onclick=()=>close(null);
  document.body.appendChild(sheet);sheet.querySelector('input').focus();
});
async function sfUsersAction(act,id){
  const u=sfUsersRows.find(r=>r.user_id===id);if(!u||u.protected)return;
  try{
    if(act==='password'){
      const engineer=!!u.engineer_account;
      const password=await sfUsersAskPassword(sfUsersT('New password','كلمة مرور جديدة')+' — '+sfUsersName(u),
        engineer?sfUsersT('At least 6 digits.','6 أرقام على الأقل.'):sfUsersT('8 to 128 characters.','من 8 إلى 128 حرفًا.'),engineer?'inputmode="numeric" pattern="[0-9]{6,}"':'minlength="8" maxlength="128"');
      if(password===null)return;
      if(engineer?!/^[0-9]{6,}$/.test(password):(password.length<8||password.length>128)){sfUsersNote={ok:false,text:engineer?sfUsersT('The password must be at least 6 digits.','كلمة المرور يجب أن تكون 6 أرقام على الأقل.'):sfUsersT('The password must be 8 to 128 characters.','كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.')};return sfUsersRender()}
      await sfUsersInvoke(engineer?{action:'password',user_id:id,password}:{action:'staff-password',user_id:id,password});
      sfUsersNote={ok:true,text:sfUsersT('Password changed.','تم تغيير كلمة المرور.')};return void await sfUsersLoad();
    }
    if(act==='suspend'||act==='unsuspend'){
      const suspend=act==='suspend';
      if(!confirm(suspend?sfUsersT(`Suspend ${sfUsersName(u)}? Sign-in is blocked; the data and permissions stay, and reactivating restores them.`,`إيقاف ${sfUsersName(u)}؟ يتمنع الدخول، والبيانات والصلاحيات تفضل زي ما هي وترجع عند التفعيل.`)
        :sfUsersT(`Reactivate ${sfUsersName(u)}?`,`تفعيل ${sfUsersName(u)}؟`)))return;
      await sfUsersInvoke({action:'set-suspended',user_id:id,suspended:suspend});
      sfUsersNote={ok:true,text:suspend?sfUsersT('Account suspended.','تم إيقاف الحساب.'):sfUsersT('Account reactivated.','تم تفعيل الحساب.')};return void await sfUsersLoad();
    }
  }catch(error){sfUsersNote={ok:false,text:sfUsersError(error)};sfUsersRender()}
}
async function sfUsersCreate(form){
  const type=sfUsersAdding,f=form.elements,name=f.name.value.trim(),password=f.password.value;
  const fail=text=>{sfUsersNote={ok:false,text};sfUsersRender()};
  if(!name)return fail(sfUsersT('Write the name.','اكتب الاسم.'));
  let body;
  if(type==='engineer'){
    const code=f.code.value.trim();
    if(!/^[0-9]{6,40}$/.test(code))return fail(sfUsersT('The employee code must be 6 to 40 digits.','كود الموظف يجب أن يكون من 6 إلى 40 رقمًا.'));
    if(!/^[0-9]{6,}$/.test(password))return fail(sfUsersT('The password must be at least 6 digits.','كلمة المرور يجب أن تكون 6 أرقام على الأقل.'));
    body={action:'create',engineer_id:code,name,password};
  }else{
    const email=f.email.value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail(sfUsersT('Write a valid e-mail.','اكتب بريدًا إلكترونيًا صحيحًا.'));
    if(password.length<8||password.length>128)return fail(sfUsersT('The password must be 8 to 128 characters.','كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.'));
    body=type==='accountant'?{action:'create-accountant',name,email,password}:{action:'create-staff',name,email,password,equipment_role:type};
  }
  const extra=[];
  if(type==='accountant'&&f.docs?.checked)extra.push(['equipment','documents']);
  if(['storekeeper','viewer','documents'].includes(type)&&f.commercial?.checked)extra.push(['commercial','limited']);
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
  try{
    const created=await sfUsersInvoke(body);
    const missed=[];
    for(const [area,value] of extra){const {error}=await sfDb.rpc('sf_users_set_access',{p_user:created.user_id,p_area:area,p_value:value});if(error)missed.push(sfUsersError(error))}
    sfUsersAdding='';
    sfUsersNote=missed.length?{ok:false,text:sfUsersT('Account created, but an extra permission was not saved: ','تم إنشاء الحساب، لكن صلاحية إضافية لم تُحفظ: ')+missed.join(' ')}
      :{ok:true,text:type==='engineer'?sfUsersT('Engineer account created. Set the wage and job details on the Engineers page.','تم إنشاء حساب المهندس. حدّد الأجر وبيانات الوظيفة من صفحة المهندسين.'):sfUsersT('Account created. It signs in from the same site with its e-mail and password.','تم إنشاء الحساب. يدخل من نفس الموقع بالبريد وكلمة المرور.')};
    await sfUsersLoad();
  }catch(error){if(submit)submit.disabled=false;fail(sfUsersError(error))}
}

// ── Routing inside the main site ──────────────────────────────
sfUnifiedAllowed=function(route){return route==='users'?sfUsersAccess():sfUsersBaseAllowed(route)};
function sfUsersTitle(){document.getElementById('app-page-title').textContent=sfUsersT('Users & Permissions','المستخدمون والصلاحيات');
  document.getElementById('app-page-subtitle').textContent=sfUsersT('Add engineer, accountant and storekeeper accounts and choose what each one opens.','إضافة حسابات المهندسين والمحاسبين وأمناء المخزن وتحديد ما يفتحه كل حساب.')}
showTab=function(name,button){
  const panel=document.getElementById('sf-users-panel');
  if(name!=='users'){if(panel)panel.hidden=true;return sfUsersBaseShow(name,button)}
  if(!sfAuthReady)return sfUsersBaseShow(name,button);
  if(!sfUnifiedAllowed('users'))return sfUsersBaseShow(sfUnifiedHome());
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  for(const id of ['sf-unified-panel','sf-equipment-panel','sf-documents-panel']){const el=document.getElementById(id);if(el)el.hidden=true}
  document.getElementById('command-primary-action').hidden=true;panel.hidden=false;
  sfUnifiedRoute='users';sfUnifiedDesired='users';document.body.dataset.module='users';
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module==='users'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  sfUsersNote=null;sfUsersTitle();sfUsersRender();void sfUsersLoad();
  history.replaceState(null,'','#users');localStorage.setItem('sfLastModule','users');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});sfUnifiedApplyAccess();
};
sfLockApp=function(clear){sfUsersRows=[];sfUsersLog=[];sfUsersAdding='';sfUsersNote=null;const p=document.getElementById('sf-users-panel');if(p){p.hidden=true;p.innerHTML=''}sfUsersBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){sfUsersBaseLanguage(lang,persist);if(sfUnifiedRoute==='users'&&!document.getElementById('sf-users-panel').hidden){sfUsersTitle();sfUsersRender()}};
document.addEventListener('click',e=>{
  if(!e.target.closest)return;
  const act=e.target.closest('[data-users-act]');if(act)return void sfUsersAction(act.dataset.usersAct,act.dataset.id);
  if(e.target.closest('[data-users-add]')){sfUsersAdding=sfUsersAdding?'':'engineer';sfUsersNote=null;return sfUsersRender()}
  const t=e.target.closest('[data-users-type]');if(t){
    // Switching the type keeps the name and e-mail already typed (never the password).
    const f=document.getElementById('sf-users-form')?.elements,keep={name:f?.name?.value||'',email:f?.email?.value||''};
    sfUsersAdding=t.dataset.usersType;sfUsersRender();
    const g=document.getElementById('sf-users-form')?.elements;if(g){g.name.value=keep.name;if(g.email)g.email.value=keep.email}return}
  if(e.target.closest('[data-users-cancel]')){sfUsersAdding='';return sfUsersRender()}
  const k=e.target.closest('[data-users-filter]');if(k){sfUsersFilter=k.dataset.usersFilter;sfUsersRender()}
});
document.addEventListener('change',e=>{
  if(e.target?.id==='sf-users-filter'){sfUsersFilter=e.target.value;return sfUsersRender()}
  if(e.target?.dataset?.usersSet)void sfUsersSetAccess(e.target.dataset.id,e.target.dataset.usersSet,e.target.value);
});
document.addEventListener('input',e=>{if(e.target?.id==='sf-users-search'){sfUsersSearch=e.target.value;sfUsersApplySearch()}});
document.addEventListener('submit',e=>{if(e.target?.id==='sf-users-form'){e.preventDefault();void sfUsersCreate(e.target)}});

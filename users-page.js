'use strict';
// Users & Permissions page, for the system administrator only (sf_my_access().users_admin): every account with its
// roles — accountant, HR, storekeeper, employee, in any combination — and commercial access; new accounts with any
// set of roles; password and suspension. Roles go through sf_users_set_role, commercial access through
// sf_users_set_access, accounts, passwords and suspension through the rapid-task edge function; every change is
// written to sf_access_log.
let sfUsersRows=[],sfUsersLog=[],sfUsersLoading=false,sfUsersSearch='',sfUsersFilter='all',sfUsersAdding=false,sfUsersNote=null;
let sfUsersDraft={name:'',roles:[],login:'email',code:'',email:'',commercial:false};
const sfUsersBaseShow=showTab,sfUsersBaseAllowed=sfUnifiedAllowed,sfUsersBaseLock=sfLockApp,sfUsersBaseLanguage=sfSetInterfaceLanguage;

const sfUsersT=(en,ar)=>sfUiLanguage==='ar'?ar:en;
const sfUsersEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sfUsersAccess=()=>!!sfAuthReady&&sfUnifiedAccess?.users_admin===true;
// The four roles, in display order: label and what it opens.
const SF_USERS_ROLES=[
  ['accountant',['Accountant','محاسب'],['Approved invoices and payment preparation','الفواتير بعد اعتمادها وتجهيز الدفع']],
  ['hr',['HR','HR'],['Iqama and SEC-ID cards','الإقامات وبطاقات SEC-ID']],
  ['storekeeper',['Storekeeper','مدير مخزن'],['Equipment: add devices, record movements','الأجهزة: إضافة الأجهزة وتسجيل الحركات والنقل']],
  ['employee',['Employee','موظف'],['Attendance and own invoices for approval','تسجيل الحضور ورفع فواتيره للاعتماد']]];
const sfUsersRoleName=k=>{const r=SF_USERS_ROLES.find(x=>x[0]===k);return r?sfUsersT(...r[1]):k};
const sfUsersRoles=u=>u.roles||{};
function sfUsersDate(v){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
function sfUsersMatches(u){
  if(sfUsersFilter==='employees')return !!sfUsersRoles(u).employee;
  if(sfUsersFilter==='office')return !sfUsersRoles(u).employee;
  if(sfUsersFilter==='suspended')return !!u.suspended;
  return true;
}
// Why a role cannot be switched on this account (the database refuses it too), or '' when it can.
function sfUsersRoleBlocked(u,role){
  if(u.protected)return sfUsersT('The system administrator account cannot be changed here.','حساب مدير النظام لا يتغير من هنا.');
  if(['accountant','employee'].includes(role)&&u.commercial)return sfUsersT('Commercial accounts do not open attendance or the Accounts page.','الحسابات التجارية لا تفتح الحضور أو صفحة الحسابات.');
  if(['hr','storekeeper'].includes(role)&&['admin','viewer'].includes(u.equipment))return sfUsersT('This account has another equipment role.','هذا الحساب له دور آخر في الأجهزة.');
  return '';
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
.users-tools input,.users-tools select,.users-table select,.users-form input[type=text],.users-form input[type=email],.users-form input[type=password],.users-form input:not([type]){font-family:inherit;font-size:13px;padding:7px 10px;border-radius:9px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-text)}
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
.users-roles{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.users-role{font-family:inherit;font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;border:1px dashed #C9D0DD;background:#fff;color:#8A93A6;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
.users-role::before{content:'＋ ';font-weight:700}.users-role[aria-pressed="true"]::before{content:'✓ '}
.users-role:hover:not(:disabled){border-color:var(--sf-navy);color:var(--sf-navy)}
.users-role[aria-pressed="true"]{border-style:solid;border-color:transparent;color:#fff}
.users-role[data-users-role="accountant"][aria-pressed="true"]{background:#7B3FB4}.users-role[data-users-role="hr"][aria-pressed="true"]{background:#0E7C86}
.users-role[data-users-role="storekeeper"][aria-pressed="true"]{background:#2E8B57}.users-role[data-users-role="employee"][aria-pressed="true"]{background:#2F5FC4}
.users-role:disabled{cursor:not-allowed;opacity:.5}.users-role[aria-pressed="true"]:disabled{opacity:.75}
.users-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:#EEF0F4;color:var(--sf-navy)}
.users-badge.owner{background:#1F3864;color:#fff}.users-badge.eq{background:#E8F5EC;color:var(--sf-ok-text)}.users-badge.off{background:#FDECEC;color:var(--sf-alert-text)}.users-badge.none{background:#F4F4F6;color:var(--sf-muted)}
.users-row-actions{display:flex;flex-wrap:wrap;gap:5px}.users-muted{color:var(--sf-muted);font-size:12px}
.users-form{padding:16px;border-bottom:1px solid var(--sf-line);background:#FAFBFD;display:flex;flex-direction:column;gap:14px}
.users-form h4{margin:0;font-size:13px;color:var(--sf-navy)}
.users-pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.users-pick label{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--sf-line);border-radius:10px;background:#fff;cursor:pointer}
.users-pick label:has(input:checked){border-color:var(--sf-navy);box-shadow:0 0 0 1px var(--sf-navy) inset;background:#F5F8FF}
.users-pick b{display:block;font-size:13px;color:var(--sf-text)}.users-pick small{display:block;font-size:11px;color:var(--sf-muted);margin-top:2px}
.users-pick input{margin-top:3px}
.users-login{display:flex;flex-wrap:wrap;gap:14px;font-size:13px}.users-login label{display:flex;gap:6px;align-items:center;cursor:pointer}.users-login label.disabled{opacity:.5;cursor:not-allowed}
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
 .users-table td::before{content:attr(data-label);color:var(--sf-muted);font-weight:600;font-size:12px;flex:0 0 auto}.users-table td.users-name-cell::before{display:none}
 .users-roles{justify-content:flex-end}}`;
  document.head.appendChild(s);
}

function sfUsersRolesCell(u){
  const r=sfUsersRoles(u);
  const chips=SF_USERS_ROLES.map(([k,label,hint])=>{const blocked=sfUsersRoleBlocked(u,k);
    return `<button type="button" class="users-role" data-users-role="${k}" data-id="${u.user_id}" aria-pressed="${!!r[k]}"${blocked?' disabled':''} title="${sfUsersEsc(blocked||sfUsersT(...hint))}">${sfUsersEsc(sfUsersT(...label))}</button>`}).join('');
  const extra=[u.commercial==='full'?`<span class="users-badge owner">${sfUsersEsc(sfUsersT('System administrator','مدير النظام'))}</span>`:'',
    u.equipment==='admin'?`<span class="users-badge eq">${sfUsersEsc(sfUsersT('Equipment administrator','مدير الأجهزة'))}</span>`:'',
    u.equipment==='viewer'?`<span class="users-badge eq">${sfUsersEsc(sfUsersT('Equipment viewer','عارض أجهزة'))}</span>`:'',
    u.suspended?`<span class="users-badge off">${sfUsersEsc(sfUsersT('Suspended','موقوف'))}</span>`:'',
    u.attendance_role&&u.attendance_active===false?`<span class="users-badge none">${sfUsersEsc(sfUsersT('Archived in attendance','مؤرشف في الحضور'))}</span>`:''].join('');
  return `<div class="users-roles">${chips}${extra}</div>`;
}
function sfUsersCommercialCell(u){
  if(u.commercial==='full')return `<span>${sfUsersEsc(sfUsersT('Full','كامل'))}</span>`;
  const r=sfUsersRoles(u);
  if(u.engineer_account||r.accountant||r.employee)return `<span class="users-muted" title="${sfUsersEsc(sfUsersT('Employee and accountant accounts open their own pages.','حسابات الموظفين والمحاسبين تفتح صفحاتها فقط.'))}">—</span>`;
  if(u.protected)return `<span>${sfUsersEsc(u.commercial?sfUsersT('Limited','محدود'):sfUsersT('None','لا شيء'))}</span>`;
  // Short option text so it fits the column; what "limited" leaves out is in the tooltip.
  return `<select data-users-set="commercial" data-id="${u.user_id}" aria-label="${sfUsersEsc(sfUsersT('Commercial','الأقسام التجارية'))}" title="${sfUsersEsc(sfUsersT('Limited: quotations, projects and invoices, without salaries or engineers','محدود: عروض الأسعار والمشاريع والفواتير، بدون الرواتب والمهندسين'))}">
    <option value=""${u.commercial?'':' selected'}>${sfUsersEsc(sfUsersT('None','لا شيء'))}</option>
    <option value="limited"${u.commercial==='limited'?' selected':''}>${sfUsersEsc(sfUsersT('Limited','محدود'))}</option></select>`;
}
function sfUsersFormHtml(){
  if(!sfUsersAdding)return '';
  const d=sfUsersDraft,employee=d.roles.includes('employee'),code=employee&&d.login==='code',office=!d.roles.some(r=>r==='accountant'||r==='employee');
  return `<form class="users-form" id="sf-users-form" autocomplete="off">
    <h4>${sfUsersEsc(sfUsersT('1. Roles — choose one or more','١. الأدوار — اختر دورًا أو أكثر'))}</h4>
    <div class="users-pick">${SF_USERS_ROLES.map(([k,label,hint])=>`<label><input type="checkbox" name="role" value="${k}"${d.roles.includes(k)?' checked':''}><span><b>${sfUsersEsc(sfUsersT(...label))}</b><small>${sfUsersEsc(sfUsersT(...hint))}</small></span></label>`).join('')}</div>
    <h4>${sfUsersEsc(sfUsersT('2. Account','٢. الحساب'))}</h4>
    <div class="users-login">
      <label><input type="radio" name="login" value="email"${code?'':' checked'}> ${sfUsersEsc(sfUsersT('Signs in with e-mail','يدخل بالبريد الإلكتروني'))}</label>
      <label class="${employee?'':'disabled'}" title="${sfUsersEsc(employee?'':sfUsersT('Employees only','للموظفين فقط'))}"><input type="radio" name="login" value="code"${code?' checked':''}${employee?'':' disabled'}> ${sfUsersEsc(sfUsersT('Signs in with employee code','يدخل بكود الموظف'))}</label>
    </div>
    <div class="users-fields">
      <label>${sfUsersEsc(sfUsersT('Name','الاسم'))}<input name="name" required maxlength="150" value="${sfUsersEsc(d.name)}"></label>
      ${code?`<label>${sfUsersEsc(sfUsersT('Employee code','كود الموظف'))}<input name="code" required inputmode="numeric" pattern="[0-9]{6,40}" dir="ltr" value="${sfUsersEsc(d.code)}"></label>`
        :`<label>${sfUsersEsc(sfUsersT('E-mail','البريد الإلكتروني'))}<input name="email" type="email" required maxlength="254" dir="ltr" value="${sfUsersEsc(d.email)}"></label>`}
      <label>${sfUsersEsc(sfUsersT('Password','كلمة المرور'))}<input name="password" type="password" required autocomplete="new-password" dir="ltr" ${code?'inputmode="numeric" pattern="[0-9]{6,}"':'minlength="8" maxlength="128"'}></label>
    </div>
    <p class="users-hint">${sfUsersEsc(code?sfUsersT('Password: at least 6 digits. Set the wage and job details afterwards on the Engineers page.','كلمة المرور: 6 أرقام على الأقل. حدّد الأجر وبيانات الوظيفة بعد ذلك من صفحة المهندسين.'):sfUsersT('Password: 8 to 128 characters.','كلمة المرور: من 8 إلى 128 حرفًا.'))}</p>
    ${office&&d.roles.length?`<label class="users-check"><input type="checkbox" name="commercial"${d.commercial?' checked':''}> ${sfUsersEsc(sfUsersT('Also open the commercial pages (limited: quotations, projects, invoices — no salaries or engineers)','يدخل كمان الأقسام التجارية (محدود: عروض الأسعار والمشاريع والفواتير — بدون الرواتب والمهندسين)'))}</label>`:''}
    <div class="users-row-actions"><button type="submit" class="users-btn primary">${sfUsersEsc(sfUsersT('Create account','إنشاء الحساب'))}</button><button type="button" class="users-btn" data-users-cancel>${sfUsersEsc(sfUsersT('Cancel','إلغاء'))}</button></div>
  </form>`;
}

function sfUsersRender(){
  const panel=document.getElementById('sf-users-panel');if(!panel)return;
  sfUsersStyles();
  const employees=sfUsersRows.filter(u=>sfUsersRoles(u).employee).length;
  const kpi=(color,label,value,filter)=>`<button type="button" class="users-kpi" style="--k:${color}" data-users-filter="${filter}"><span>${sfUsersEsc(label)}</span><b>${value}</b></button>`;
  const kpis=`<div class="users-kpis">${kpi('var(--sf-navy)',sfUsersT('All accounts','كل الحسابات'),sfUsersRows.length,'all')}
    ${kpi('#2F5FC4',sfUsersT('Employees','الموظفون'),employees,'employees')}
    ${kpi('#2E8B57',sfUsersT('Office & equipment','المكتب والأجهزة'),sfUsersRows.length-employees,'office')}
    ${kpi('var(--sf-alert)',sfUsersT('Suspended','موقوفة'),sfUsersRows.filter(u=>u.suspended).length,'suspended')}</div>`;
  const rows=sfUsersRows.filter(sfUsersMatches);
  const L=t=>` data-label="${sfUsersEsc(t)}"`;
  const actions=u=>u.protected?`<span class="users-muted">🔒 ${sfUsersEsc(sfUsersT('Protected','محمي'))}</span>`:`<div class="users-row-actions">
    <button type="button" class="users-btn" data-users-act="password" data-id="${u.user_id}">🔑 ${sfUsersEsc(sfUsersT('Password','كلمة المرور'))}</button>
    ${u.suspended?`<button type="button" class="users-btn" data-users-act="unsuspend" data-id="${u.user_id}">▶ ${sfUsersEsc(sfUsersT('Reactivate','تفعيل'))}</button>`
      :`<button type="button" class="users-btn warn" data-users-act="suspend" data-id="${u.user_id}">⏸ ${sfUsersEsc(sfUsersT('Suspend','إيقاف'))}</button>`}</div>`;
  const table=`<div class="users-card"><div class="users-hdr"><h3>👤 ${sfUsersEsc(sfUsersT('Accounts','الحسابات'))} <span class="users-count" id="sf-users-count">${rows.length}</span></h3>
    <div class="users-tools"><input type="search" id="sf-users-search" placeholder="${sfUsersEsc(sfUsersT('Search by name, code or e-mail','بحث بالاسم أو الكود أو البريد'))}" aria-label="${sfUsersEsc(sfUsersT('Search','بحث'))}">
      <select id="sf-users-filter" aria-label="${sfUsersEsc(sfUsersT('Filter','تصفية'))}">${[['all','Everyone','الكل'],['employees','Employees','الموظفون'],['office','Office & equipment','المكتب والأجهزة'],['suspended','Suspended','الموقوفة']]
        .map(([v,en,ar])=>`<option value="${v}"${sfUsersFilter===v?' selected':''}>${sfUsersEsc(sfUsersT(en,ar))}</option>`).join('')}</select>
      <button type="button" class="users-btn primary" data-users-add>＋ ${sfUsersEsc(sfUsersT('Add account','إضافة حساب'))}</button></div></div>
    ${sfUsersFormHtml()}
    ${sfUsersLoading?`<div class="users-empty">${sfUsersEsc(sfUsersT('Loading…','جاري التحميل…'))}</div>`:''}
    <div class="users-table-wrap"><table class="users-table"><thead><tr><th>${sfUsersEsc(sfUsersT('Account','الحساب'))}</th><th>${sfUsersEsc(sfUsersT('Roles (click to add or remove)','الأدوار (اضغط للإضافة أو الإزالة)'))}</th>
      <th>${sfUsersEsc(sfUsersT('Commercial pages','الأقسام التجارية'))}</th><th>${sfUsersEsc(sfUsersT('Last sign-in','آخر دخول'))}</th><th>${sfUsersEsc(sfUsersT('Actions','إجراءات'))}</th></tr></thead>
    <tbody>${rows.map(u=>{const login=u.engineer_account?(u.code||String(u.email).split('@')[0]):u.email;
      return `<tr class="${u.suspended?'is-suspended':''}" data-search="${sfUsersEsc([u.name,u.code,u.email].filter(Boolean).join(' ').toLowerCase())}">
      <td class="users-name-cell"${L(sfUsersT('Account','الحساب'))}><div class="users-person"><span class="users-avatar">${sfUsersEsc(String(u.name||'?').trim().charAt(0).toUpperCase()||'?')}</span>
        <span><b><bdi>${sfUsersEsc(u.name)}</bdi></b><span class="sub" dir="ltr">${sfUsersEsc(login)}</span></span></div></td>
      <td${L(sfUsersT('Roles','الأدوار'))}>${sfUsersRolesCell(u)}</td>
      <td${L(sfUsersT('Commercial pages','الأقسام التجارية'))}>${sfUsersCommercialCell(u)}</td>
      <td${L(sfUsersT('Last sign-in','آخر دخول'))}>${u.last_sign_in?sfUsersDate(u.last_sign_in):`<span class="users-muted">${sfUsersEsc(sfUsersT('Never','لم يدخل بعد'))}</span>`}</td>
      <td${L(sfUsersT('Actions','إجراءات'))}>${actions(u)}</td></tr>`}).join('')||`<tr><td colspan="5" class="users-empty">${sfUsersEsc(sfUsersT('No accounts match.','لا توجد حسابات مطابقة.'))}</td></tr>`}</tbody></table></div></div>`;
  const note=sfUsersNote?`<div class="users-note ${sfUsersNote.ok?'ok':'err'}" role="status">${sfUsersEsc(sfUsersNote.text)}</div>`:'';
  panel.innerHTML=note+kpis+table+sfUsersLogHtml();
  sfUsersApplySearch();
}
function sfUsersLogHtml(){
  const arrow=sfUiLanguage==='ar'?'←':'→';
  const line=l=>{
    if(l.area==='password')return sfUsersT('Password changed','تغيير كلمة المرور');
    if(l.area==='account'){const v=String(l.new_value||'').replace('created:','');
      const names=v.split('+').map(r=>SF_USERS_ROLES.some(x=>x[0]===r)?sfUsersRoleName(r):sfUsersOptionText('equipment',r));
      return sfUsersT('Account created','إنشاء حساب')+': '+names.join(' + ')}
    if(String(l.area).startsWith('role:'))return (l.new_value==='on'?sfUsersT('Role added','إضافة دور'):sfUsersT('Role removed','إزالة دور'))+': '+sfUsersRoleName(l.area.slice(5));
    if(l.area==='suspended')return sfUsersT('Suspension','الإيقاف')+': '+(l.new_value==='true'?sfUsersT('suspended','موقوف'):sfUsersT('active','نشط'));
    const label=l.area==='commercial'?sfUsersT('Commercial','التجاري'):sfUsersT('Equipment','الأجهزة');
    return `${label}: ${sfUsersOptionText(l.area,l.old_value)} ${arrow} ${sfUsersOptionText(l.area,l.new_value)}`;
  };
  return `<div class="users-card"><div class="users-hdr"><h3>🕘 ${sfUsersEsc(sfUsersT('Recent changes','آخر التغييرات'))}</h3></div>
    ${sfUsersLog.length?`<ul class="users-log">${sfUsersLog.slice(0,30).map(l=>`<li><span><b><bdi>${sfUsersEsc(l.target||'')}</bdi></b> — ${sfUsersEsc(line(l))}</span>
      <span class="users-muted">${sfUsersEsc(sfUsersDate(l.at))} · <bdi>${sfUsersEsc(l.actor||'')}</bdi></span></li>`).join('')}</ul>`
      :`<div class="users-empty">${sfUsersEsc(sfUsersT('No changes yet.','لا توجد تغييرات بعد.'))}</div>`}</div>`;
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
  ENGINEER_ACCOUNT:['Employee code accounts do not open the commercial pages.','حسابات أكواد الموظفين لا تفتح الأقسام التجارية.'],
  ROLE_CONFLICT:['Commercial access does not combine with the attendance / Accounts roles, or the account has another equipment role.','الأقسام التجارية لا تجتمع مع أدوار الحضور والحسابات، أو الحساب له دور آخر في الأجهزة.'],
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
  if(area==='equipment')return ({'':sfUsersT('None','لا شيء'),documents:sfUsersT('Iqama & SEC-ID only','الإقامات فقط'),viewer:sfUsersT('Equipment viewer','عارض أجهزة'),
    storekeeper:sfUsersRoleName('storekeeper'),admin:sfUsersT('Equipment administrator','مدير الأجهزة')})[value||'']??value;
  return value?sfUsersT('Limited','محدود'):sfUsersT('None','لا شيء');
}
const SF_USERS_SAVED=()=>({ok:true,text:sfUsersT('Saved. It applies the next time this account opens the site.','تم الحفظ. يسري التغيير عند فتح الحساب للموقع مرة أخرى.')});
async function sfUsersSetAccess(id,area,value){
  const u=sfUsersRows.find(r=>r.user_id===id);if(!u)return;
  if(!(await sfConfirm({title:sfUsersT('Commercial pages','الأقسام التجارية')+` — ${sfUsersName(u)}: ${sfUsersOptionText(area,value)}?`,ok:sfUsersT('Save','حفظ')}))){sfUsersRender();return}
  const {error}=await sfDb.rpc('sf_users_set_access',{p_user:id,p_area:area,p_value:value||null});
  sfUsersNote=error?{ok:false,text:sfUsersError(error)}:SF_USERS_SAVED();
  await sfUsersLoad();
}
async function sfUsersToggleRole(id,role){
  const u=sfUsersRows.find(r=>r.user_id===id);if(!u||sfUsersRoleBlocked(u,role))return;
  const on=!sfUsersRoles(u)[role],name=sfUsersName(u),label=sfUsersRoleName(role);
  const extra=!on&&role==='employee'&&!sfUsersRoles(u).accountant?sfUsersT('The attendance account is archived (records are kept).','حساب الحضور هيتأرشف (السجلات محفوظة).'):'';
  if(!(await sfConfirm({title:on?sfUsersT(`Give ${name} the role "${label}"?`,`إضافة دور «${label}» لـ ${name}؟`):sfUsersT(`Remove the role "${label}" from ${name}?`,`إزالة دور «${label}» من ${name}؟`),
    message:extra,ok:on?sfUsersT('Give role','إضافة الدور'):sfUsersT('Remove role','إزالة الدور'),danger:!on})))return;
  const {error}=await sfDb.rpc('sf_users_set_role',{p_user:id,p_role:role,p_on:on});
  sfUsersNote=error?{ok:false,text:sfUsersError(error)}:SF_USERS_SAVED();
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
      if(!(await sfConfirm(suspend?{title:sfUsersT(`Suspend ${sfUsersName(u)}?`,`إيقاف ${sfUsersName(u)}؟`),
          message:sfUsersT('Sign-in is blocked; the data and permissions stay, and reactivating restores them.','يتمنع الدخول، والبيانات والصلاحيات تفضل زي ما هي وترجع عند التفعيل.'),ok:sfUsersT('Suspend','إيقاف'),danger:true}
        :{title:sfUsersT(`Reactivate ${sfUsersName(u)}?`,`تفعيل ${sfUsersName(u)}؟`),ok:sfUsersT('Reactivate','تفعيل')})))return;
      await sfUsersInvoke({action:'set-suspended',user_id:id,suspended:suspend});
      sfUsersNote={ok:true,text:suspend?sfUsersT('Account suspended.','تم إيقاف الحساب.'):sfUsersT('Account reactivated.','تم تفعيل الحساب.')};return void await sfUsersLoad();
    }
  }catch(error){sfUsersNote={ok:false,text:sfUsersError(error)};sfUsersRender()}
}
// Keep what was typed when the form is redrawn (roles or sign-in method changed); never the password.
function sfUsersReadDraft(form){
  const f=form?.elements;if(!f)return;
  sfUsersDraft={name:f.name?.value??sfUsersDraft.name,roles:[...form.querySelectorAll('input[name="role"]:checked')].map(i=>i.value),
    login:form.querySelector('input[name="login"]:checked')?.value||'email',code:f.code?.value??sfUsersDraft.code,email:f.email?.value??sfUsersDraft.email,commercial:!!f.commercial?.checked};
  if(!sfUsersDraft.roles.includes('employee'))sfUsersDraft.login='email';
}
async function sfUsersCreate(form){
  sfUsersReadDraft(form);
  const d=sfUsersDraft,password=form.elements.password.value,name=d.name.trim();
  const fail=text=>{sfUsersNote={ok:false,text};sfUsersRender()};
  if(!d.roles.length)return fail(sfUsersT('Choose at least one role.','اختر دورًا واحدًا على الأقل.'));
  if(!name)return fail(sfUsersT('Write the name.','اكتب الاسم.'));
  const body={action:'create-account',name,login:d.login,roles:d.roles,password};
  if(d.login==='code'){
    const code=d.code.trim();
    if(!/^[0-9]{6,40}$/.test(code))return fail(sfUsersT('The employee code must be 6 to 40 digits.','كود الموظف يجب أن يكون من 6 إلى 40 رقمًا.'));
    if(!/^[0-9]{6,}$/.test(password))return fail(sfUsersT('The password must be at least 6 digits.','كلمة المرور يجب أن تكون 6 أرقام على الأقل.'));
    body.engineer_id=code;
  }else{
    const email=d.email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail(sfUsersT('Write a valid e-mail.','اكتب بريدًا إلكترونيًا صحيحًا.'));
    if(password.length<8||password.length>128)return fail(sfUsersT('The password must be 8 to 128 characters.','كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.'));
    body.email=email;
  }
  const commercial=d.commercial&&!d.roles.some(r=>r==='accountant'||r==='employee');
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
  try{
    const created=await sfUsersInvoke(body);
    let missed='';
    if(commercial){const {error}=await sfDb.rpc('sf_users_set_access',{p_user:created.user_id,p_area:'commercial',p_value:'limited'});if(error)missed=sfUsersError(error)}
    sfUsersAdding=false;sfUsersDraft={name:'',roles:[],login:'email',code:'',email:'',commercial:false};
    sfUsersNote=missed?{ok:false,text:sfUsersT('Account created, but commercial access was not saved: ','تم إنشاء الحساب، لكن صلاحية الأقسام التجارية لم تُحفظ: ')+missed}
      :{ok:true,text:(d.login==='code'?sfUsersT('Account created. It signs in with the employee code.','تم إنشاء الحساب. يدخل بكود الموظف.'):sfUsersT('Account created. It signs in from the same site with its e-mail and password.','تم إنشاء الحساب. يدخل من نفس الموقع بالبريد وكلمة المرور.'))
        +(d.roles.includes('employee')?' '+sfUsersT('Set the wage and job details on the Engineers page.','حدّد الأجر وبيانات الوظيفة من صفحة المهندسين.'):'')};
    await sfUsersLoad();
  }catch(error){if(submit)submit.disabled=false;fail(sfUsersError(error))}
}

// ── Routing inside the main site ──────────────────────────────
sfUnifiedAllowed=function(route){return route==='users'?sfUsersAccess():sfUsersBaseAllowed(route)};
function sfUsersTitle(){document.getElementById('app-page-title').textContent=sfUsersT('Users & Permissions','المستخدمون والصلاحيات');
  document.getElementById('app-page-subtitle').textContent=sfUsersT('Add accounts and give each person one or more roles: accountant, HR, storekeeper, employee.','إضافة الحسابات وإعطاء كل شخص دورًا أو أكثر: محاسب، HR، مدير مخزن، موظف.')}
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
sfLockApp=function(clear){sfUsersRows=[];sfUsersLog=[];sfUsersAdding=false;sfUsersNote=null;const p=document.getElementById('sf-users-panel');if(p){p.hidden=true;p.innerHTML=''}sfUsersBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){sfUsersBaseLanguage(lang,persist);if(sfUnifiedRoute==='users'&&!document.getElementById('sf-users-panel').hidden){sfUsersTitle();sfUsersRender()}};
document.addEventListener('click',e=>{
  if(!e.target.closest)return;
  const act=e.target.closest('[data-users-act]');if(act)return void sfUsersAction(act.dataset.usersAct,act.dataset.id);
  const role=e.target.closest('[data-users-role]');if(role)return void sfUsersToggleRole(role.dataset.id,role.dataset.usersRole);
  if(e.target.closest('[data-users-add]')){sfUsersAdding=!sfUsersAdding;sfUsersNote=null;return sfUsersRender()}
  if(e.target.closest('[data-users-cancel]')){sfUsersAdding=false;return sfUsersRender()}
  const k=e.target.closest('[data-users-filter]');if(k){sfUsersFilter=k.dataset.usersFilter;sfUsersRender()}
});
document.addEventListener('change',e=>{
  if(e.target?.id==='sf-users-filter'){sfUsersFilter=e.target.value;return sfUsersRender()}
  if(e.target?.dataset?.usersSet)return void sfUsersSetAccess(e.target.dataset.id,e.target.dataset.usersSet,e.target.value);
  // Roles or sign-in method changed in the new-account form: redraw it (fields depend on them), keeping what was typed.
  const form=e.target?.closest?.('#sf-users-form');
  if(form&&(e.target.name==='role'||e.target.name==='login')){const pw=form.elements.password?.value||'';sfUsersReadDraft(form);sfUsersRender();
    const again=document.getElementById('sf-users-form');if(again?.elements?.password&&sfUsersDraft.login===(again.querySelector('input[name="login"]:checked')?.value))again.elements.password.value=pw}
});
document.addEventListener('input',e=>{if(e.target?.id==='sf-users-search'){sfUsersSearch=e.target.value;sfUsersApplySearch()}});
document.addEventListener('submit',e=>{if(e.target?.id==='sf-users-form'){e.preventDefault();void sfUsersCreate(e.target)}});

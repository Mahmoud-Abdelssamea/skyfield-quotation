'use strict';
// Iqama & SEC-ID page: every person in the equipment records (eq_recipients) with their Iqama and SEC-ID card,
// what is due within 45 days or expired, renewals, hand-in and corrections, print and Excel.
// Opened by the administrator, the storekeeper and the accounting account (eq_can_open_documents); updates go through
// eq_engineer_document / eq_update_documents and are copied to the attendance card fields by the database.
let sfDocsAccess=false,sfDocsChecked=false,sfDocsCanEdit=false,sfDocsRows=[],sfDocsFilter='all',sfDocsLoading=false;
let sfDocsWanted=location.hash.slice(1)==='documents'||(!location.hash&&localStorage.getItem('sfLastModule')==='documents');
const SF_DOCS_ALERT_DAYS=45,SF_DOCS_WAREHOUSE='مدير المخزن (صالح)';
const sfDocsBaseShow=showTab,sfDocsBaseAllowed=sfUnifiedAllowed,sfDocsBaseUnlock=sfUnlockApp,sfDocsBaseLock=sfLockApp,sfDocsBaseLanguage=sfSetInterfaceLanguage;

const sfDocsAr=()=>sfUiLanguage==='ar';
const sfDocsT=(en,ar)=>sfDocsAr()?ar:en;
const sfDocsEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sfDocsToday=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
function sfDocsDays(date){if(!date)return null;const d=new Date(date+'T00:00:00');return Number.isNaN(d.getTime())?null:Math.round((d-sfDocsToday())/86400000)}
function sfDocsDate(date){if(!date)return '—';const [y,m,d]=String(date).split('-');return `${d}/${m}/${y}`}
// Same bands as the equipment section: expired, 7, 30 and 60 days; a handed-in card is no longer tracked.
function sfDocsState(expiry,returnedOn){
  if(returnedOn)return {key:'returned',days:null};
  const days=sfDocsDays(expiry);if(days===null)return {key:'none',days:null};
  return {key:days<0?'expired':days<=7?'critical':days<=30?'urgent':days<=60?'soon':'valid',days};
}
function sfDocsText(state,expiry,returnedOn){
  const d=state.days;
  if(state.key==='returned')return sfDocsT('Handed in ','سُلّمت ')+sfDocsDate(returnedOn);
  if(state.key==='none')return sfDocsT('Not recorded','غير مسجل');
  if(state.key==='valid')return sfDocsT('Valid until ','سارية حتى ')+sfDocsDate(expiry);
  if(d<0)return sfDocsT(`Expired ${-d} day${-d>1?'s':''} ago`,`منتهية منذ ${-d} يوم`);
  if(d===0)return sfDocsT('Expires today','تنتهي اليوم');
  return sfDocsT(`${d} day${d>1?'s':''} left`,`متبقي ${d} يوم`);
}
function sfDocsBadge(expiry,returnedOn){const s=sfDocsState(expiry,returnedOn);return `<span class="docs-badge docs-${s.key}">${sfDocsEsc(sfDocsText(s,expiry,returnedOn))}</span>`}
const sfDocsPerson=r=>r.name!==SF_DOCS_WAREHOUSE;
// Due within 45 days or expired, most urgent first.
function sfDocsDue(doc){
  return sfDocsRows.filter(sfDocsPerson).map(r=>{const s=doc==='iqama'?sfDocsState(r.iqama_expiry,''):sfDocsState(r.sec_id_expiry,r.sec_id_returned_on);return {r,s}})
    .filter(x=>x.s.days!==null&&x.s.days<=SF_DOCS_ALERT_DAYS).sort((a,b)=>a.s.days-b.s.days);
}
function sfDocsListRows(doc){
  return sfDocsDue(doc).map(({r,s})=>[r.name,r.name_en||'',r.phone||'',doc==='iqama'?(r.iqama||''):(r.sec_id_no||''),sfDocsDate(doc==='iqama'?r.iqama_expiry:r.sec_id_expiry),sfDocsText(s,doc==='iqama'?r.iqama_expiry:r.sec_id_expiry,'')]);
}
const sfDocsListHeaders=doc=>[sfDocsT('Name','الاسم'),sfDocsT('English name','الاسم بالإنجليزية'),sfDocsT('Phone','رقم الجوال'),doc==='iqama'?sfDocsT('Iqama No.','رقم الإقامة'):sfDocsT('SEC-ID No.','رقم بطاقة SEC-ID'),sfDocsT('Expiry','تاريخ الانتهاء'),sfDocsT('Status','الحالة')];
const sfDocsListTitle=doc=>doc==='iqama'?sfDocsT('Iqamas expiring within 45 days or expired','الإقامات المنتهية أو التي تنتهي خلال 45 يومًا'):sfDocsT('SEC-ID cards expiring within 45 days or expired','بطاقات SEC-ID المنتهية أو التي تنتهي خلال 45 يومًا');

function sfDocsStyles(){
  if(document.getElementById('sf-docs-style'))return;
  const s=document.createElement('style');s.id='sf-docs-style';
  s.textContent=`#sf-documents-panel{width:100%;min-width:0;display:flex;flex-direction:column;gap:16px}
.docs-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.docs-kpi{font-family:inherit;text-align:start;background:#fff;border:1px solid var(--sf-line);border-radius:12px;padding:12px 14px;cursor:pointer;border-top:3px solid var(--k);transition:box-shadow .15s,transform .15s}
.docs-kpi:hover{box-shadow:0 4px 14px rgba(31,56,100,.08);transform:translateY(-1px)}
.docs-kpi span{display:block;font-size:12px;font-weight:600;color:var(--sf-muted)}
.docs-kpi b{display:block;font-size:24px;font-weight:800;color:var(--sf-navy);margin-top:2px}
.docs-kpi small{display:block;font-size:11px;color:var(--sf-muted);margin-top:2px}
.docs-card{background:#fff;border:1px solid var(--sf-line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(31,56,100,.04)}
.docs-card-hdr{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--sf-line)}
.docs-card-hdr h3{margin:0;font-size:15px;font-weight:700;color:var(--sf-navy);display:flex;align-items:center;gap:8px}
.docs-card-hdr h3 small{font-size:12px;font-weight:500;color:var(--sf-muted)}
.docs-count{display:inline-block;min-width:22px;padding:1px 8px;border-radius:999px;background:#EEF1F7;color:var(--sf-navy);font-size:12px;font-weight:700;text-align:center}
.docs-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.docs-tools input,.docs-tools select{font-family:inherit;font-size:13px;padding:7px 11px;border-radius:9px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-text)}
.docs-tools input{min-width:200px}
.docs-actions{display:flex;gap:6px;flex-wrap:wrap}
.docs-btn{font-family:inherit;font-size:12px;font-weight:600;padding:6px 11px;border-radius:8px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-navy);cursor:pointer;white-space:nowrap}
.docs-btn:hover{border-color:var(--sf-navy);background:#F5F7FB}
.docs-btn.renew{color:#1F6B44;border-color:#CFE6D8}.docs-btn.renew:hover{background:#EEF8F2}
.docs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.docs-list{list-style:none;margin:0;padding:8px 12px 12px}
.docs-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;margin-top:6px;border-radius:9px;background:#FAFBFD;border-inline-start:4px solid var(--b,#cfd5e0);font-size:13px}
.docs-list li.sev-expired,.docs-list li.sev-critical{--b:var(--sf-alert)}.docs-list li.sev-urgent{--b:var(--sf-warn)}.docs-list li.sev-soon{--b:#d9b44a}
.docs-list b{font-weight:700;color:var(--sf-text)}.docs-list .sub{display:block;color:var(--sf-muted);font-size:12px;margin-top:2px}
.docs-empty{padding:18px 16px;color:var(--sf-muted);font-size:13px;text-align:center}
.docs-table-wrap{overflow-x:auto;max-height:70vh}
.docs-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.docs-table th{position:sticky;top:0;z-index:1;background:#F4F6FA;color:var(--sf-muted);font-weight:700;font-size:12px;text-align:start;padding:10px 12px;white-space:nowrap;border-bottom:1px solid var(--sf-line)}
.docs-table td{padding:10px 12px;border-bottom:1px solid var(--sf-line);vertical-align:middle}
.docs-table tr[hidden]{display:none!important}
.docs-table tbody tr:nth-child(even) td{background:#FBFCFE}.docs-table tbody tr:hover td{background:#F2F6FC}
.docs-person{display:flex;align-items:center;gap:10px}
.docs-avatar{flex:0 0 34px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#E7ECF6;color:var(--sf-navy);font-weight:800;font-size:14px}
.docs-person b{display:block;font-weight:700;color:var(--sf-text)}.docs-person .en{display:block;color:var(--sf-muted);font-size:11px}
.docs-code{display:inline-block;padding:2px 8px;border-radius:6px;background:#F1F3F7;color:var(--sf-navy);font-weight:600;font-size:12px}
.docs-doc{display:flex;flex-direction:column;gap:3px;align-items:flex-start}.docs-doc .no{font-size:12px;color:var(--sf-text)}
.docs-row-actions{display:flex;flex-wrap:wrap;gap:5px}
.docs-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.docs-expired,.docs-critical{background:#FDECEC;color:var(--sf-alert-text)}.docs-urgent{background:#FFF1E0;color:var(--sf-warn-text)}
.docs-soon{background:#FFF8E1;color:#7a5a00}.docs-valid{background:#E8F5EC;color:var(--sf-ok-text)}.docs-returned,.docs-none{background:#EEF0F4;color:var(--sf-muted)}
.docs-status{padding:10px 16px;color:var(--sf-muted);font-size:13px}
@media(max-width:760px){.docs-tools input{min-width:0;flex:1}.docs-table-wrap{max-height:none}
 .docs-table thead{display:none}.docs-table tr{display:block;border-bottom:1px solid var(--sf-line);padding:8px 0}
 .docs-table td{display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;padding:6px 14px;background:transparent!important}
 .docs-table td::before{content:attr(data-label);color:var(--sf-muted);font-weight:600;font-size:12px}
 .docs-table td.docs-name-cell::before{display:none}.docs-doc{align-items:flex-end}}`;
  document.head.appendChild(s);
}

function sfDocsRender(){
  const panel=document.getElementById('sf-documents-panel');if(!panel)return;
  sfDocsStyles();
  const expiry=(r,doc)=>doc==='iqama'?r.iqama_expiry:r.sec_id_expiry;
  // Summary: expired and due within 45 days for each document; a click filters the employee table.
  const count=(doc,expired)=>sfDocsDue(doc).filter(x=>expired?x.s.days<0:x.s.days>=0).length;
  const kpi=(color,label,value,hint,filter)=>`<button type="button" class="docs-kpi" style="--k:${color}" data-docs-filter="${filter}"><span>${sfDocsEsc(label)}</span><b>${value}</b><small>${sfDocsEsc(hint)}</small></button>`;
  const kpis=`<div class="docs-kpis">
    ${kpi('var(--sf-alert)',sfDocsT('Expired Iqamas','إقامات منتهية'),count('iqama',true),sfDocsT('Renew now','تحتاج تجديدًا الآن'),'expired')}
    ${kpi('var(--sf-warn)',sfDocsT('Iqamas due','إقامات قريبة الانتهاء'),count('iqama',false),sfDocsT('Within 45 days','خلال 45 يومًا'),'due')}
    ${kpi('var(--sf-alert)',sfDocsT('Expired SEC-ID cards','بطاقات SEC-ID منتهية'),count('sec_id',true),sfDocsT('Renew now','تحتاج تجديدًا الآن'),'expired')}
    ${kpi('var(--sf-warn)',sfDocsT('SEC-ID cards due','بطاقات SEC-ID قريبة الانتهاء'),count('sec_id',false),sfDocsT('Within 45 days','خلال 45 يومًا'),'due')}</div>`;
  // Employee table first.
  const worst=r=>{const keys=[sfDocsState(r.iqama_expiry,'').key,sfDocsState(r.sec_id_expiry,r.sec_id_returned_on).key];return keys.includes('expired')?'expired':keys.some(k=>['critical','urgent','soon'].includes(k))?'due':''};
  const rows=sfDocsRows.filter(r=>sfDocsFilter==='all'||(sfDocsFilter==='expired'?worst(r)==='expired':!!worst(r)));
  const L=t=>` data-label="${sfDocsEsc(t)}"`;
  const actions=r=>!sfDocsCanEdit||!sfDocsPerson(r)?'':`<div class="docs-row-actions">
    <button type="button" class="docs-btn renew" data-docs-act="renew-iqama" data-id="${r.id}">↻ ${sfDocsEsc(sfDocsT('Iqama','الإقامة'))}</button>
    <button type="button" class="docs-btn renew" data-docs-act="renew-sec" data-id="${r.id}">↻ SEC-ID</button>
    ${(r.sec_id_no||r.sec_id_expiry)&&!r.sec_id_returned_on?`<button type="button" class="docs-btn" data-docs-act="handin" data-id="${r.id}">${sfDocsEsc(sfDocsT('Card handed in','سُلّمت البطاقة'))}</button>`:''}
    <button type="button" class="docs-btn" data-docs-act="edit" data-id="${r.id}">✎ ${sfDocsEsc(sfDocsT('Edit','تعديل'))}</button></div>`;
  const people=`<div class="docs-card"><div class="docs-card-hdr"><h3>👥 ${sfDocsEsc(sfDocsT('Employees','الموظفون'))} <span class="docs-count" id="sf-docs-count">${rows.length}</span></h3>
    <div class="docs-tools"><input type="search" id="sf-docs-search" placeholder="${sfDocsEsc(sfDocsT('Search by name, code or number','بحث بالاسم أو الكود أو الرقم'))}" aria-label="${sfDocsEsc(sfDocsT('Search','بحث'))}">
    <select id="sf-docs-filter" aria-label="${sfDocsEsc(sfDocsT('Filter','تصفية'))}">
      <option value="all"${sfDocsFilter==='all'?' selected':''}>${sfDocsEsc(sfDocsT('Everyone','الكل'))}</option>
      <option value="due"${sfDocsFilter==='due'?' selected':''}>${sfDocsEsc(sfDocsT('Due within 60 days or expired','تنتهي خلال 60 يومًا أو منتهية'))}</option>
      <option value="expired"${sfDocsFilter==='expired'?' selected':''}>${sfDocsEsc(sfDocsT('Expired only','منتهية فقط'))}</option></select></div></div>
    ${sfDocsLoading?`<div class="docs-status">${sfDocsEsc(sfDocsT('Loading…','جاري التحميل…'))}</div>`:''}
    <div class="docs-table-wrap"><table class="docs-table"><thead><tr><th>${sfDocsEsc(sfDocsT('Employee','الموظف'))}</th><th>${sfDocsEsc(sfDocsT('Code','الكود'))}</th><th>${sfDocsEsc(sfDocsT('Iqama','الإقامة'))}</th><th>SEC-ID</th>${sfDocsCanEdit?`<th>${sfDocsEsc(sfDocsT('Actions','إجراءات'))}</th>`:''}</tr></thead>
    <tbody>${rows.map(r=>`<tr data-search="${sfDocsEsc([r.name,r.name_en,r.empid,r.iqama,r.sec_id_no].filter(Boolean).join(' ').toLowerCase())}">
      <td class="docs-name-cell"${L(sfDocsT('Employee','الموظف'))}><div class="docs-person"><span class="docs-avatar">${sfDocsEsc(String(r.name||'?').trim().charAt(0))}</span><span><b><bdi>${sfDocsEsc(r.name)}</bdi></b>${r.name_en?`<span class="en" dir="ltr">${sfDocsEsc(r.name_en)}</span>`:''}</span></div></td>
      <td${L(sfDocsT('Code','الكود'))}>${r.empid?`<span class="docs-code" dir="ltr">${sfDocsEsc(r.empid)}</span>`:'—'}</td>
      <td${L(sfDocsT('Iqama','الإقامة'))}><div class="docs-doc"><span class="no" dir="ltr">${sfDocsEsc(r.iqama||'—')}</span>${sfDocsPerson(r)?sfDocsBadge(r.iqama_expiry,''):''}</div></td>
      <td${L('SEC-ID')}><div class="docs-doc"><span class="no" dir="ltr">${sfDocsEsc(r.sec_id_no||'—')}</span>${sfDocsPerson(r)?sfDocsBadge(r.sec_id_expiry,r.sec_id_returned_on):''}</div></td>
      ${sfDocsCanEdit?`<td${L(sfDocsT('Actions','إجراءات'))}>${actions(r)}</td>`:''}</tr>`).join('')||`<tr><td colspan="5" class="docs-empty">${sfDocsEsc(sfDocsT('No employees match.','لا يوجد موظفون مطابقون.'))}</td></tr>`}</tbody></table></div></div>`;
  // Then the two lists of what is due, each with print and Excel.
  const list=doc=>{const due=sfDocsDue(doc);
    return due.length?`<ul class="docs-list">${due.map(({r,s})=>`<li class="sev-${s.key}"><span><b><bdi>${sfDocsEsc(r.name)}</bdi></b><span class="sub" dir="ltr">${sfDocsEsc(doc==='iqama'?(r.iqama||''):(r.sec_id_no||''))} · ${sfDocsDate(expiry(r,doc))}</span></span>${sfDocsBadge(expiry(r,doc),'')}</li>`).join('')}</ul>`
      :`<div class="docs-empty">✅ ${sfDocsEsc(sfDocsT('Nothing due within 45 days.','لا شيء ينتهي خلال 45 يومًا.'))}</div>`};
  const card=(doc,icon,title)=>`<div class="docs-card"><div class="docs-card-hdr"><h3>${icon} ${sfDocsEsc(title)} <span class="docs-count">${sfDocsDue(doc).length}</span> <small>${sfDocsEsc(sfDocsT('expired or within 45 days','منتهية أو خلال 45 يومًا'))}</small></h3>
    <span class="docs-actions"><button type="button" class="docs-btn" data-docs-print="${doc}">🖨 ${sfDocsEsc(sfDocsT('Print','طباعة'))}</button><button type="button" class="docs-btn" data-docs-excel="${doc}">📥 Excel</button></span></div>${list(doc)}</div>`;
  panel.innerHTML=kpis+people+`<div class="docs-grid">${card('iqama','🪪',sfDocsT('Iqamas','الإقامات'))}${card('sec_id','🦺',sfDocsT('SEC-ID cards','بطاقات SEC-ID'))}</div>`;
  sfDocsApplySearch();
}
// Search hides table rows without redrawing, so typing keeps the focus.
let sfDocsSearch='';
function sfDocsApplySearch(){
  const q=sfDocsSearch.trim().toLowerCase(),input=document.getElementById('sf-docs-search');if(input&&input.value!==sfDocsSearch)input.value=sfDocsSearch;
  const rows=[...(document.getElementById('sf-documents-panel')?.querySelectorAll?.('.docs-table tbody tr[data-search]')||[])];
  let shown=0;for(const tr of rows){const hit=!q||tr.dataset.search.includes(q);tr.hidden=!hit;if(hit)shown++}
  const c=document.getElementById('sf-docs-count');if(c&&rows.length)c.textContent=shown;
}

async function sfDocsLoad(){
  sfDocsLoading=true;sfDocsRender();
  try{
    const [{data,error},edit]=await Promise.all([
      sfDb.from('eq_recipients').select('id,name,name_en,empid,iqama,phone,iqama_expiry,sec_id_no,sec_id_expiry,sec_id_returned_on').order('name'),
      sfDb.rpc('eq_can_edit_documents')]);
    if(error)throw error;
    sfDocsRows=data||[];sfDocsCanEdit=!edit.error&&edit.data===true;
  }catch(error){console.warn('Iqama / SEC-ID list could not be loaded',error);alert(sfDocsT('The Iqama / SEC-ID list could not be loaded. Try again.','تعذر تحميل قائمة الإقامات والبطاقات. حاول مرة أخرى.'))}
  sfDocsLoading=false;sfDocsRender();
}

const SF_DOCS_ERRORS={NEW_DATE_NOT_LATER:['The new date must be after the current expiry date.','التاريخ الجديد يجب أن يكون بعد تاريخ الانتهاء الحالي.'],
  DATE_IN_FUTURE:['The hand-in date cannot be in the future.','لا يمكن أن يكون تاريخ التسليم في المستقبل.'],NO_SEC_ID:['No SEC-ID card is recorded.','لا توجد بطاقة SEC-ID مسجلة.'],
  ACCESS_DENIED:['You do not have permission to update this.','ليس لديك صلاحية لهذا التحديث.'],RECIPIENT_NOT_FOUND:['This person was not found. Refresh the page.','الشخص غير موجود. حدّث الصفحة.']};
function sfDocsError(error){const code=Object.keys(SF_DOCS_ERRORS).find(k=>String(error?.message||'').includes(k));return code?sfDocsT(...SF_DOCS_ERRORS[code]):(error?.message||String(error))}
const sfDocsValidDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+'T00:00:00').getTime());
async function sfDocsSave(rpcName,args,row){
  const {data,error}=await sfDb.rpc(rpcName,args);
  if(error){alert(sfDocsError(error));return false}
  const i=sfDocsRows.findIndex(r=>r.id===row.id);if(i>=0&&data)sfDocsRows[i]={...sfDocsRows[i],...data};
  sfDocsRender();if(typeof window.sfDashboardAttentionRefresh==='function')window.sfDashboardAttentionRefresh();
  return true;
}
async function sfDocsAction(act,id){
  const row=sfDocsRows.find(r=>String(r.id)===String(id));if(!row||!sfDocsCanEdit)return;
  const who=' — '+row.name;
  if(act==='renew-iqama'||act==='renew-sec'){
    const doc=act==='renew-iqama'?'iqama':'sec_id',current=doc==='iqama'?row.iqama_expiry:row.sec_id_expiry;
    const base=current?new Date(current+'T00:00:00'):new Date();base.setFullYear(base.getFullYear()+1);
    const suggest=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
    const answer=prompt((doc==='iqama'?sfDocsT('New Iqama expiry date','تاريخ انتهاء الإقامة الجديد'):sfDocsT('New SEC-ID expiry date','تاريخ انتهاء بطاقة SEC-ID الجديدة'))+who+' (YYYY-MM-DD):',suggest);
    if(answer===null)return;const date=String(answer).trim();
    if(!sfDocsValidDate(date)){alert(sfDocsT('Write the date as YYYY-MM-DD.','اكتب التاريخ بصيغة YYYY-MM-DD.'));return}
    return sfDocsSave('eq_engineer_document',{p_id:row.id,p_document:doc,p_action:'renew',p_date:date},row);
  }
  if(act==='handin'){
    const t=new Date(),today=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    const answer=prompt(sfDocsT('Date the SEC-ID card was handed in to the electricity company','تاريخ تسليم بطاقة SEC-ID لشركة الكهرباء')+who+' (YYYY-MM-DD):',today);
    if(answer===null)return;const date=String(answer).trim();
    if(!sfDocsValidDate(date)){alert(sfDocsT('Write the date as YYYY-MM-DD.','اكتب التاريخ بصيغة YYYY-MM-DD.'));return}
    return sfDocsSave('eq_engineer_document',{p_id:row.id,p_document:'sec_id',p_action:'returned',p_date:date},row);
  }
  if(act==='edit'){
    const ask=(label,value)=>{const a=prompt(label+who,value||'');return a===null?null:String(a).trim()};
    const iqama=ask(sfDocsT('Iqama expiry date (YYYY-MM-DD)','تاريخ انتهاء الإقامة (YYYY-MM-DD)'),row.iqama_expiry);if(iqama===null)return;
    const secNo=ask(sfDocsT('SEC-ID card number','رقم بطاقة SEC-ID'),row.sec_id_no);if(secNo===null)return;
    const secExpiry=ask(sfDocsT('SEC-ID card expiry date (YYYY-MM-DD)','تاريخ انتهاء بطاقة SEC-ID (YYYY-MM-DD)'),row.sec_id_expiry);if(secExpiry===null)return;
    if([iqama,secExpiry].some(d=>d&&!sfDocsValidDate(d))){alert(sfDocsT('Write the date as YYYY-MM-DD.','اكتب التاريخ بصيغة YYYY-MM-DD.'));return}
    return sfDocsSave('eq_update_documents',{p_id:row.id,p_iqama_expiry:iqama||null,p_sec_id_no:secNo||null,p_sec_id_expiry:secExpiry||null},row);
  }
}
function sfDocsPrint(doc){
  const rows=sfDocsListRows(doc),head=sfDocsListHeaders(doc),title=sfDocsListTitle(doc),ar=sfDocsAr();
  const w=window.open('','_blank');if(!w){alert(sfDocsT('Allow pop-ups to print.','اسمح بالنوافذ المنبثقة للطباعة.'));return}
  const t=new Date(),date=`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
  w.document.write(`<!DOCTYPE html><html lang="${ar?'ar':'en'}" dir="${ar?'rtl':'ltr'}"><head><meta charset="utf-8"><title>${sfDocsEsc(title)}</title>
<style>body{font-family:'Tajawal','Inter',Arial,sans-serif;margin:24px;color:#1A1A2E}h1{font-size:18px;color:#1F3864;margin:0 0 4px}p{color:#6B6B80;margin:0 0 14px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cfd5e0;padding:6px 8px;text-align:start}th{background:#EEF1F7}</style></head><body>
<h1>Sky Field — ${sfDocsEsc(title)}</h1><p>${sfDocsEsc(sfDocsT('Printed','طُبعت'))} ${date} · ${rows.length}</p>
<table><thead><tr><th>#</th>${head.map(h=>`<th>${sfDocsEsc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td>${r.map(c=>`<td>${sfDocsEsc(c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="7">${sfDocsEsc(sfDocsT('Nothing due within 45 days.','لا شيء ينتهي خلال 45 يومًا.'))}</td></tr>`}</tbody></table>
<script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}
async function sfDocsExcel(doc){
  if(!window.XLSX)await new Promise((ok,fail)=>{const s=document.createElement('script');s.src='xlsx-0.20.3.full.min.js';s.onload=ok;s.onerror=fail;document.head.appendChild(s)}).catch(()=>{});
  if(!window.XLSX){alert(sfDocsT('Excel export is not available right now.','تصدير Excel غير متاح الآن.'));return}
  const sheet=XLSX.utils.aoa_to_sheet([sfDocsListHeaders(doc),...sfDocsListRows(doc)]);
  if(sfDocsAr())sheet['!views']=[{RTL:true}];
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,doc==='iqama'?'Iqama':'SEC-ID');
  const t=new Date();XLSX.writeFile(book,`${doc==='iqama'?'Iqama':'SEC-ID'}_${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}.xlsx`);
}

// ── Routing inside the main site ──────────────────────────────
sfUnifiedAllowed=function(route){return route==='documents'?sfDocsAccess:sfDocsBaseAllowed(route)};
async function sfDocsCheckAccess(){
  sfDocsAccess=false;
  try{const {data,error}=await sfDb.rpc('eq_can_open_documents');sfDocsAccess=!error&&data===true}catch(error){console.warn('Iqama / SEC-ID access check skipped',error)}
  sfDocsChecked=true;sfUnifiedApplyAccess();
  if(sfDocsWanted&&sfDocsAccess)showTab('documents');
  sfDocsWanted=false;
}
function sfDocsTitle(){document.getElementById('app-page-title').textContent=sfDocsT('Iqama & SEC-ID','الإقامات وبطاقات SEC-ID');
  document.getElementById('app-page-subtitle').textContent=sfDocsT('Iqama and SEC-ID card expiry: due, expired, renewals, print and Excel.','انتهاء الإقامات وبطاقات SEC-ID: القريبة والمنتهية والتجديد والطباعة وExcel.')}
showTab=function(name,button){
  const panel=document.getElementById('sf-documents-panel');
  if(name!=='documents'){if(panel)panel.hidden=true;return sfDocsBaseShow(name,button)}
  if(!sfAuthReady||!sfDocsChecked){sfDocsWanted=true;return}
  if(!sfUnifiedAllowed('documents'))return sfDocsBaseShow(sfUnifiedProfile?.role==='accountant'?'accounting':'dashboard');
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  for(const id of ['sf-unified-panel','sf-equipment-panel']){const el=document.getElementById(id);if(el)el.hidden=true}
  document.getElementById('command-primary-action').hidden=true;panel.hidden=false;
  sfUnifiedRoute='documents';sfUnifiedDesired='documents';document.body.dataset.module='documents';
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module==='documents'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  sfDocsTitle();sfDocsRender();void sfDocsLoad();
  history.replaceState(null,'','#documents');localStorage.setItem('sfLastModule','documents');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});sfUnifiedApplyAccess();
};
sfUnlockApp=function(user){sfDocsChecked=false;sfDocsBaseUnlock(user);void sfDocsCheckAccess()};
sfLockApp=function(clear){sfDocsAccess=false;sfDocsChecked=false;sfDocsCanEdit=false;sfDocsRows=[];const p=document.getElementById('sf-documents-panel');if(p){p.hidden=true;p.innerHTML=''}sfDocsBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){sfDocsBaseLanguage(lang,persist);if(sfUnifiedRoute==='documents'&&!document.getElementById('sf-documents-panel').hidden){sfDocsTitle();sfDocsRender()}};
document.addEventListener('click',e=>{
  if(!e.target.closest)return;
  const act=e.target.closest('[data-docs-act]');if(act)return void sfDocsAction(act.dataset.docsAct,act.dataset.id);
  const p=e.target.closest('[data-docs-print]');if(p)return sfDocsPrint(p.dataset.docsPrint);
  const x=e.target.closest('[data-docs-excel]');if(x)return void sfDocsExcel(x.dataset.docsExcel);
  const k=e.target.closest('[data-docs-filter]');if(k){sfDocsFilter=k.dataset.docsFilter;sfDocsRender();document.querySelector('.docs-table')?.scrollIntoView({behavior:'smooth',block:'start'})}
});
document.addEventListener('change',e=>{if(e.target?.id==='sf-docs-filter'){sfDocsFilter=e.target.value;sfDocsRender()}});
document.addEventListener('input',e=>{if(e.target?.id==='sf-docs-search'){sfDocsSearch=e.target.value;sfDocsApplySearch()}});

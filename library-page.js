'use strict';
// Documents library (9 Nov 2026): the files behind each person on the Iqama & SEC-ID list (CV, Iqama, SEC-ID card,
// approvals, SCE membership, C1 certificates, driving licence, passport) and the company cars (registration, insurance,
// periodic inspection, operating card), each with its number and dates. Choose people / cars and document kinds, then
// download them as one ZIP (a folder per person) or, on a computer, straight into a folder.
// Same accounts as the Iqama & SEC-ID page (supabase/2026-11-09-documents-library.sql); files in the private
// "staff-documents" bucket, opened through short-lived links. Photos are made smaller before they are sent.
const SF_LIB_BUCKET='staff-documents',SF_LIB_MAX=10485760,SF_LIB_ALERT_DAYS=30;
// [key, English, Arabic, one file only (a new one replaces it), has an expiry date]
const SF_LIB_PERSON_TYPES=[['cv','CV','السيرة الذاتية',true,false],['iqama','Iqama','الإقامة',true,true],['sec_id','SEC-ID card','بطاقة SEC-ID',true,true],
  ['approval','Approval letter','خطاب الاعتماد',false,true],['sce','SCE membership','عضوية الهيئة السعودية للمهندسين',true,true],['c1','C1 certificate','شهادة C1',false,true],
  ['license','Driving licence','رخصة القيادة',true,true],['passport','Passport','جواز السفر',true,true],['other','Other document','مستند آخر',false,true]];
const SF_LIB_CAR_TYPES=[['registration','Registration (Istimara)','الاستمارة',true,true],['insurance','Insurance','التأمين',true,true],
  ['inspection','Periodic inspection','الفحص الدوري',true,true],['operating_card','Operating card','كرت التشغيل',true,true],['other','Other document','مستند آخر',false,true]];
const SF_LIB_GROUPS=[['engineer','Engineers','المهندسون','Engineer','مهندس'],['technician','Technicians','الفنيون','Technician','فني'],['driver','Drivers','السائقون','Driver','سائق'],['other','Others','آخرون','Other','أخرى']];
const SF_LIB_GROUP_TYPES={engineer:['cv','iqama','sec_id','approval','sce','c1','passport','other'],technician:['cv','iqama','sec_id','approval','c1','passport','other'],
  driver:['iqama','license','passport','cv','other'],other:SF_LIB_PERSON_TYPES.map(t=>t[0]),'':SF_LIB_PERSON_TYPES.map(t=>t[0])};
let sfLib={access:false,checked:false,canEdit:false,people:[],cars:[],files:[],usage:null,view:'people',group:'all',search:'',sel:new Set(),
  types:new Set([...SF_LIB_PERSON_TYPES,...SF_LIB_CAR_TYPES].map(t=>t[0])),loading:false,busy:'',loaded:false};
let sfLibWanted=location.hash.slice(1)==='library'||(!location.hash&&localStorage.getItem('sfLastModule')==='library');
const sfLibBaseShow=showTab,sfLibBaseAllowed=sfUnifiedAllowed,sfLibBaseUnlock=sfUnlockApp,sfLibBaseLock=sfLockApp,sfLibBaseLanguage=sfSetInterfaceLanguage;

const sfLibAr=()=>sfUiLanguage==='ar';
const sfLibT=(en,ar)=>sfLibAr()?ar:en;
const sfLibEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sfLibType=(kind,key)=>(kind==='car'?SF_LIB_CAR_TYPES:SF_LIB_PERSON_TYPES).find(t=>t[0]===key)||['other','Other document','مستند آخر',false,true];
const sfLibTypeName=(kind,key)=>{const t=sfLibType(kind,key);return sfLibT(t[1],t[2])};
const sfLibGroup=key=>SF_LIB_GROUPS.find(g=>g[0]===key);
const sfLibDate=d=>{if(!d)return '';const [y,m,x]=String(d).split('-');return `${x}/${m}/${y}`};
const sfLibToday=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
function sfLibDays(date){if(!date)return null;const d=new Date(date+'T00:00:00');return Number.isNaN(d.getTime())?null:Math.round((d-sfLibToday())/86400000)}
function sfLibState(date){const days=sfLibDays(date);if(days===null)return {key:'none',days};return {key:days<0?'expired':days<=7?'critical':days<=SF_LIB_ALERT_DAYS?'urgent':days<=60?'soon':'valid',days}}
function sfLibStateText(date){const s=sfLibState(date),d=s.days;
  if(s.key==='none')return '';if(s.key==='valid'||s.key==='soon')return sfLibT('Valid until ','سارية حتى ')+sfLibDate(date);
  if(d<0)return sfLibT(`Expired ${-d} day${-d>1?'s':''} ago`,`منتهية منذ ${-d} يوم`);if(d===0)return sfLibT('Expires today','تنتهي اليوم');
  return sfLibT(`${d} day${d>1?'s':''} left`,`متبقي ${d} يوم`)}
const sfLibMB=b=>(Number(b)||0)/1048576;
const sfLibSize=b=>{const mb=sfLibMB(b);return mb>=1?mb.toFixed(1)+' MB':Math.max(1,Math.round((Number(b)||0)/1024))+' KB'};
const sfLibOwnerKey=(kind,id)=>(kind==='car'?'v:':'p:')+id;
const sfLibFilesOf=(kind,id)=>sfLib.files.filter(f=>kind==='car'?String(f.vehicle_id)===String(id):String(f.recipient_id)===String(id));
const sfLibPersonName=p=>p?.name_en||p?.name||'';
const sfLibSafe=s=>String(s||'').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'file';
const sfLibExt=f=>(String(f.storage_path).match(/\.(\w+)$/)||[,'pdf'])[1];
// Files about to expire, for the KPI cards (Iqama and SEC-ID cards are followed on their own page already).
const sfLibDue=()=>sfLib.files.filter(f=>{const s=sfLibState(f.expiry_date);return s.days!==null&&s.days<=SF_LIB_ALERT_DAYS});

function sfLibStyles(){
  if(document.getElementById('sf-lib-style'))return;
  const s=document.createElement('style');s.id='sf-lib-style';
  s.textContent=`#sf-library-panel{width:100%;min-width:0;display:flex;flex-direction:column;gap:16px}
.lib-top{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.lib-kpi{background:#fff;border:1px solid var(--sf-line);border-radius:12px;padding:12px 14px;border-top:3px solid var(--k,var(--sf-navy))}
.lib-kpi span{display:block;font-size:12px;font-weight:600;color:var(--sf-muted)}.lib-kpi b{display:block;font-size:24px;font-weight:800;color:var(--sf-navy);margin-top:2px;font-variant-numeric:tabular-nums}
.lib-kpi small{display:block;font-size:11px;color:var(--sf-muted);margin-top:2px}
.lib-meter{height:6px;border-radius:99px;background:#EEF1F7;overflow:hidden;margin-top:8px}.lib-meter i{display:block;height:100%;background:var(--m,#1F6B44);border-radius:99px;transition:width .4s ease}
.lib-card{background:#fff;border:1px solid var(--sf-line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(31,56,100,.04)}
.lib-hdr{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--sf-line)}
.lib-seg{display:inline-flex;background:#F1F3F7;border-radius:10px;padding:3px;gap:2px}
.lib-seg button{font:inherit;font-size:13px;font-weight:600;border:0;background:transparent;color:var(--sf-muted);padding:6px 14px;border-radius:8px;cursor:pointer;transition:background .15s,color .15s}
.lib-seg button[aria-pressed="true"]{background:#fff;color:var(--sf-navy);box-shadow:0 1px 2px rgba(16,24,40,.08)}
.lib-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.lib-tools input[type=search]{font:inherit;font-size:13px;padding:7px 11px;border-radius:9px;border:1px solid var(--sf-line);min-width:210px}
.lib-chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;border-bottom:1px solid var(--sf-line);background:#FAFBFD}
.lib-chip{font:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-muted);cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.lib-chip[aria-pressed="true"]{background:var(--sf-navy);border-color:var(--sf-navy);color:#fff}
.lib-chip em{font-style:normal;opacity:.75;margin-inline-start:4px}
.lib-btn{font:inherit;font-size:12px;font-weight:600;padding:7px 12px;border-radius:9px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-navy);cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,transform .1s}
.lib-btn:hover{border-color:var(--sf-navy);background:#F5F7FB}.lib-btn:active{transform:scale(.97)}.lib-btn:disabled{opacity:.5;cursor:default;transform:none}
.lib-btn.primary{background:#E8650A;border-color:#E8650A;color:#fff}.lib-btn.primary:hover{background:#cf5806}
.lib-btn.danger{color:var(--sf-alert-text,#b42318);border-color:#F3C7C3}.lib-btn.danger:hover{background:#FDECEC}
.lib-table-wrap{overflow-x:auto}
.lib-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
.lib-table th{background:#F4F6FA;color:var(--sf-muted);font-weight:700;font-size:12px;text-align:start;padding:10px 12px;white-space:nowrap;border-bottom:1px solid var(--sf-line)}
.lib-table td{padding:10px 12px;border-bottom:1px solid var(--sf-line);vertical-align:middle}
.lib-table tr[hidden]{display:none!important}.lib-table tbody tr:hover td{background:#F7F9FC}.lib-table tr.is-selected td{background:#FFF6EE}
.lib-table input[type=checkbox],.lib-bar input[type=checkbox]{width:17px;height:17px;accent-color:#E8650A;cursor:pointer}
.lib-person b{display:block;font-weight:700;color:var(--sf-text)}.lib-person small{display:block;color:var(--sf-muted);font-size:11px}
.lib-group{display:inline-block;padding:2px 9px;border-radius:999px;background:#EEF1F7;color:var(--sf-navy);font-size:11px;font-weight:700;white-space:nowrap}
.lib-group.none{background:#FFF8E1;color:#7a5a00}
.lib-docs{display:flex;flex-wrap:wrap;gap:4px}
.lib-doc{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#E8F5EC;color:var(--sf-ok-text,#1F6B44);white-space:nowrap}
.lib-doc.expired,.lib-doc.critical{background:#FDECEC;color:var(--sf-alert-text,#b42318)}.lib-doc.urgent{background:#FFF1E0;color:var(--sf-warn-text,#b54708)}.lib-doc.soon{background:#FFF8E1;color:#7a5a00}
.lib-missing{font-size:11px;color:var(--sf-muted)}
.lib-empty{padding:22px 16px;color:var(--sf-muted);font-size:13px;text-align:center}
.lib-bar{position:sticky;bottom:12px;z-index:50;background:#1A1A2E;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 14px 40px rgba(15,23,42,.35);display:flex;flex-direction:column;gap:10px;animation:lib-up .2s ease-out}
@keyframes lib-up{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
.lib-bar-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.lib-bar strong{font-size:14px;margin-inline-end:auto}
.lib-bar .lib-chip{background:transparent;color:#cfd3e0;border-color:#3a3d55}.lib-bar .lib-chip[aria-pressed="true"]{background:#fff;color:#1A1A2E;border-color:#fff}
.lib-bar .lib-btn{background:transparent;color:#fff;border-color:#4a4d66}.lib-bar .lib-btn:hover{background:#2a2c44}
.lib-bar .lib-btn.primary{background:#E8650A;border-color:#E8650A}
.lib-bar small{color:#cfd3e0;font-size:12px}
.lib-sheet{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.lib-sheet>div{background:#fff;border-radius:16px;width:min(680px,100%);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25);animation:lib-up .18s ease-out}
.lib-sheet-hdr{position:sticky;top:0;background:#fff;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--sf-line)}
.lib-sheet-hdr h4{margin:0;font-size:16px;color:var(--sf-navy)}.lib-sheet-hdr small{display:block;color:var(--sf-muted);font-size:12px;font-weight:500}
.lib-sheet-body{padding:8px 18px 18px;display:flex;flex-direction:column;gap:4px}
.lib-type{padding:12px 0;border-bottom:1px solid var(--sf-line)}.lib-type:last-child{border-bottom:0}
.lib-type-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px}
.lib-type-hdr b{font-size:13px;color:var(--sf-text)}.lib-type-hdr .none{font-size:12px;color:var(--sf-muted);font-weight:500;margin-inline-start:6px}
.lib-file{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;padding:8px 10px;border-radius:10px;background:#FAFBFD;border-inline-start:4px solid var(--b,#cfd5e0)}
.lib-file.expired,.lib-file.critical{--b:var(--sf-alert,#d92d20)}.lib-file.urgent{--b:var(--sf-warn,#f79009)}.lib-file.soon{--b:#d9b44a}.lib-file.valid{--b:#32a46a}
.lib-file-info{flex:1;min-width:180px;font-size:12px;color:var(--sf-muted);line-height:1.6}.lib-file-info b{color:var(--sf-text);font-size:13px}
.lib-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 18px}
.lib-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sf-muted)}.lib-form label.wide{grid-column:1/-1}
.lib-form input,.lib-form select,.lib-form textarea{font:inherit;font-size:14px;padding:8px 10px;border-radius:9px;border:1px solid var(--sf-line);color:var(--sf-text);background:#fff}
.lib-form .lib-check{flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--sf-text)}
.lib-form-actions{grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end}
.lib-hint{grid-column:1/-1;margin:0;font-size:12px;color:var(--sf-muted);line-height:1.6}
@media(max-width:760px){.lib-top{grid-template-columns:repeat(2,minmax(0,1fr))}.lib-tools input[type=search]{min-width:0;flex:1}.lib-tools{width:100%}
 .lib-table thead{display:none}.lib-table tr{display:grid;grid-template-columns:28px 1fr;gap:4px 8px;padding:10px 12px;border-bottom:1px solid var(--sf-line)}
 .lib-table td{border:0;padding:0;background:transparent!important}.lib-table td:nth-child(n+3){grid-column:2}
 .lib-form{grid-template-columns:1fr}.lib-bar{bottom:8px}}
@media (prefers-reduced-motion:reduce){.lib-bar,.lib-sheet>div{animation:none}.lib-meter i{transition:none}}`;
  document.head.appendChild(s);
}

// ── Page ─────────────────────────────────────────────────────
function sfLibOwners(){
  const q=sfLib.search.trim().toLowerCase();
  if(sfLib.view==='cars')return sfLib.cars.filter(c=>{const d=sfLib.people.find(p=>String(p.id)===String(c.driver_id));
    return !q||[c.plate,c.model,d?.name,d?.name_en].filter(Boolean).join(' ').toLowerCase().includes(q)});
  return sfLib.people.filter(p=>(sfLib.group==='all'||(sfLib.group==='none'?!p.category:p.category===sfLib.group))
    &&(!q||[p.name,p.name_en,p.empid,p.iqama].filter(Boolean).join(' ').toLowerCase().includes(q)));
}
function sfLibDocChips(kind,owner){
  const files=sfLibFilesOf(kind,owner.id),wanted=kind==='car'?SF_LIB_CAR_TYPES.map(t=>t[0]):SF_LIB_GROUP_TYPES[owner.category||''];
  const have=[...new Set(files.map(f=>f.doc_type))];
  const chips=have.map(t=>{const own=files.filter(f=>f.doc_type===t),first=[...own].sort((a,b)=>(sfLibDays(a.expiry_date)??1e9)-(sfLibDays(b.expiry_date)??1e9))[0],worst=sfLibState(first.expiry_date);
    return `<span class="lib-doc ${worst.key}" title="${sfLibEsc(sfLibStateText(first.expiry_date))}">${sfLibEsc(sfLibTypeName(kind,t))}${own.length>1?` ×${own.length}`:''}</span>`}).join('');
  const missing=wanted.filter(t=>t!=='other'&&t!=='passport'&&!have.includes(t)).map(t=>sfLibTypeName(kind,t));
  return `<div class="lib-docs">${chips}</div>${missing.length?`<div class="lib-missing">${sfLibEsc(sfLibT('Missing: ','ناقص: ')+missing.join(sfLibT(', ','، ')))}</div>`:''}`;
}
function sfLibRender(){
  const panel=document.getElementById('sf-library-panel');if(!panel)return;
  sfLibStyles();
  const u=sfLib.usage,used=u?sfLibMB(u.total_bytes):0,limit=u?sfLibMB(u.limit_bytes):1024,pct=Math.min(100,used/limit*100);
  const due=sfLibDue(),expired=due.filter(f=>sfLibDays(f.expiry_date)<0).length;
  const kpi=(k,label,value,hint,extra='')=>`<div class="lib-kpi" style="--k:${k}"><span>${sfLibEsc(label)}</span><b>${value}</b><small>${sfLibEsc(hint)}</small>${extra}</div>`;
  const top=`<div class="lib-top">
    ${kpi('var(--sf-navy)',sfLibT('Files','الملفات'),sfLib.files.length,sfLibT(`${sfLib.people.length} people · ${sfLib.cars.length} cars`,`${sfLib.people.length} شخص · ${sfLib.cars.length} عربية`))}
    ${kpi('var(--sf-warn)',sfLibT('Expiring soon','تنتهي قريبًا'),due.length-expired,sfLibT(`Within ${SF_LIB_ALERT_DAYS} days`,`خلال ${SF_LIB_ALERT_DAYS} يومًا`))}
    ${kpi('var(--sf-alert)',sfLibT('Expired','منتهية'),expired,sfLibT('Upload the renewed copy','ارفع النسخة المجددة'))}
    ${kpi(pct>85?'var(--sf-alert)':pct>65?'var(--sf-warn)':'#32a46a',sfLibT('Storage used','المساحة المستخدمة'),u?`<span dir="ltr">${used.toFixed(0)} <small style="display:inline;font-size:13px">/ ${limit.toFixed(0)} MB</small></span>`:'—',
      u?sfLibT(`Library ${sfLibMB(u.library_bytes).toFixed(1)} MB · all site files counted`,`المكتبة ${sfLibMB(u.library_bytes).toFixed(1)} ميجا · محسوب كل ملفات الموقع`):'',
      `<div class="lib-meter" style="--m:${pct>85?'var(--sf-alert)':pct>65?'var(--sf-warn)':'#32a46a'}"><i style="width:${pct.toFixed(1)}%"></i></div>`)}</div>`;
  const view=sfLib.view,owners=sfLibOwners();
  const count=g=>sfLib.people.filter(p=>g==='all'||(g==='none'?!p.category:p.category===g)).length;
  const groupChip=(g,label)=>`<button type="button" class="lib-chip" data-lib-group="${g}" aria-pressed="${sfLib.group===g}">${sfLibEsc(label)}<em>${count(g)}</em></button>`;
  const chips=view==='people'?`<div class="lib-chips">${groupChip('all',sfLibT('Everyone','الكل'))}${SF_LIB_GROUPS.map(g=>groupChip(g[0],sfLibT(g[1],g[2]))).join('')}${count('none')?groupChip('none',sfLibT('No group yet','بدون تصنيف')):''}</div>`:'';
  const allOn=owners.length&&owners.every(o=>sfLib.sel.has(sfLibOwnerKey(view==='cars'?'car':'person',o.id)));
  const head=`<div class="lib-hdr"><div class="lib-seg" role="group" aria-label="${sfLibEsc(sfLibT('Show','عرض'))}">
      <button type="button" data-lib-view="people" aria-pressed="${view==='people'}">👥 ${sfLibEsc(sfLibT('People','الأشخاص'))}</button>
      <button type="button" data-lib-view="cars" aria-pressed="${view==='cars'}">🚗 ${sfLibEsc(sfLibT('Cars','العربيات'))}</button></div>
    <div class="lib-tools"><input type="search" id="sf-lib-search" value="${sfLibEsc(sfLib.search)}" placeholder="${sfLibEsc(view==='cars'?sfLibT('Search plate, model or driver','بحث باللوحة أو النوع أو السائق'):sfLibT('Search name, code or Iqama','بحث بالاسم أو الكود أو الإقامة'))}" aria-label="${sfLibEsc(sfLibT('Search','بحث'))}">
      ${view==='cars'&&sfLib.canEdit?`<button type="button" class="lib-btn primary" data-lib-car-edit="">＋ ${sfLibEsc(sfLibT('Add car','إضافة عربية'))}</button>`:''}</div></div>`;
  const kind=view==='cars'?'car':'person';
  const row=o=>{const key=sfLibOwnerKey(kind,o.id),on=sfLib.sel.has(key),n=sfLibFilesOf(kind,o.id).length;
    const who=kind==='car'?(()=>{const d=sfLib.people.find(p=>String(p.id)===String(o.driver_id));return `<div class="lib-person"><b dir="ltr">${sfLibEsc(o.plate)}</b><small>${sfLibEsc([o.model,d?sfLibT('Driver: ','السائق: ')+d.name:''].filter(Boolean).join(' · ')||'—')}</small></div>`})()
      :`<div class="lib-person"><b><bdi>${sfLibEsc(o.name)}</bdi></b><small>${sfLibEsc([o.name_en,o.empid].filter(Boolean).join(' · '))}</small></div>`;
    const grp=kind==='car'?'':(o.category?`<span class="lib-group">${sfLibEsc(sfLibT(sfLibGroup(o.category)[3],sfLibGroup(o.category)[4]))}</span>`:`<span class="lib-group none">${sfLibEsc(sfLibT('No group','بدون تصنيف'))}</span>`);
    return `<tr class="${on?'is-selected':''}"><td><input type="checkbox" data-lib-pick="${key}"${on?' checked':''} aria-label="${sfLibEsc(sfLibT('Choose','اختيار'))}"></td>
      <td>${who}</td>${kind==='car'?'':`<td>${grp}</td>`}<td>${sfLibDocChips(kind,o)}</td>
      <td><button type="button" class="lib-btn" data-lib-open="${key}">📁 ${sfLibEsc(sfLibT('Files','الملفات'))} (${n})</button></td></tr>`};
  const table=`<div class="lib-table-wrap"><table class="lib-table"><thead><tr><th><input type="checkbox" data-lib-pick-all${allOn?' checked':''} aria-label="${sfLibEsc(sfLibT('Choose all shown','اختيار كل المعروض'))}"></th>
    <th>${sfLibEsc(kind==='car'?sfLibT('Car','العربية'):sfLibT('Name','الاسم'))}</th>${kind==='car'?'':`<th>${sfLibEsc(sfLibT('Group','الفئة'))}</th>`}<th>${sfLibEsc(sfLibT('Documents','المستندات'))}</th><th></th></tr></thead>
    <tbody>${owners.map(row).join('')||`<tr><td colspan="5" class="lib-empty">${sfLibEsc(sfLib.loading?sfLibT('Loading…','جاري التحميل…'):kind==='car'?sfLibT('No cars yet. Add the first one.','لا توجد عربيات بعد. أضف أول عربية.'):sfLibT('No one matches.','لا يوجد أحد مطابق.'))}</td></tr>`}</tbody></table></div>`;
  panel.innerHTML=top+`<div class="lib-card">${head}${chips}${table}</div>`+sfLibBarHtml();
}
// The bar at the bottom while something is chosen: which kinds of documents, then ZIP or a folder.
function sfLibBarHtml(){
  if(!sfLib.sel.size)return '';
  const people=[...sfLib.sel].filter(k=>k.startsWith('p:')).length,cars=sfLib.sel.size-people;
  const kinds=[...(people?SF_LIB_PERSON_TYPES:[]),...(cars?SF_LIB_CAR_TYPES.filter(t=>!people||t[0]!=='other'):[])];
  const picked=sfLibPicked();
  const chosen=[people?sfLibT(`${people} ${people>1?'people':'person'}`,`${people} شخص`):'',cars?sfLibT(`${cars} car${cars>1?'s':''}`,`${cars} عربية`):''].filter(Boolean).join(sfLibT(' and ',' و'));
  return `<div class="lib-bar" role="region" aria-label="${sfLibEsc(sfLibT('Download chosen','تحميل المحدد'))}">
    <div class="lib-bar-row"><strong>${sfLibEsc(sfLibT('Chosen: ','تم اختيار ')+chosen)}</strong><small>${sfLibEsc(sfLibT(`${picked.length} file${picked.length===1?'':'s'} · ${sfLibSize(picked.reduce((s,f)=>s+Number(f.size_bytes||0),0))}`,`${picked.length} ملف · ${sfLibSize(picked.reduce((s,f)=>s+Number(f.size_bytes||0),0))}`))}</small>
      <button type="button" class="lib-btn" data-lib-clear>${sfLibEsc(sfLibT('Clear','إلغاء الاختيار'))}</button></div>
    <div class="lib-bar-row">${kinds.map(t=>`<button type="button" class="lib-chip" data-lib-kind="${t[0]}" aria-pressed="${sfLib.types.has(t[0])}">${sfLibEsc(sfLibT(t[1],t[2]))}</button>`).join('')}</div>
    <div class="lib-bar-row">${sfLib.busy?`<small aria-live="polite">${sfLibEsc(sfLib.busy)}</small>`:`<small>${sfLibEsc(sfLibT('A folder for each person or car inside.','جواه فولدر لكل شخص أو عربية.'))}</small>`}<span style="margin-inline-start:auto"></span>
      ${'showDirectoryPicker' in window?`<button type="button" class="lib-btn" data-lib-folder${picked.length&&!sfLib.busy?'':' disabled'}>📂 ${sfLibEsc(sfLibT('Save into a folder','حفظ في فولدر'))}</button>`:''}
      <button type="button" class="lib-btn primary" data-lib-zip${picked.length&&!sfLib.busy?'':' disabled'}>⬇ ${sfLibEsc(sfLibT('Download ZIP','تحميل ZIP'))}</button></div></div>`;
}
const sfLibPicked=()=>sfLib.files.filter(f=>sfLib.types.has(f.doc_type)&&sfLib.sel.has(f.vehicle_id?sfLibOwnerKey('car',f.vehicle_id):sfLibOwnerKey('person',f.recipient_id)));
function sfLibRefreshBar(){const panel=document.getElementById('sf-library-panel');if(!panel)return;panel.querySelector('.lib-bar')?.remove();panel.insertAdjacentHTML('beforeend',sfLibBarHtml())}

async function sfLibLoad(){
  sfLib.loading=true;sfLibRender();
  try{
    const [people,cars,files,edit,usage]=await Promise.all([
      sfDb.from('eq_recipients').select('id,name,name_en,empid,job_title,category,iqama,iqama_expiry,sec_id_no,sec_id_expiry').order('name'),
      sfDb.from('eq_vehicles').select('*').order('plate'),
      sfDb.from('eq_library_files').select('*').order('uploaded_at'),
      sfDb.rpc('eq_can_edit_documents'),sfDb.rpc('eq_storage_usage')]);
    for(const r of [people,cars,files])if(r.error)throw r.error;
    const warehouse=typeof SF_DOCS_WAREHOUSE==='string'?SF_DOCS_WAREHOUSE:'';
    sfLib.people=(people.data||[]).filter(p=>p.name!==warehouse);sfLib.cars=cars.data||[];sfLib.files=files.data||[];
    sfLib.canEdit=!edit.error&&edit.data===true;sfLib.usage=usage.error?null:usage.data;sfLib.loaded=true;
    const keys=new Set([...sfLib.people.map(p=>sfLibOwnerKey('person',p.id)),...sfLib.cars.map(c=>sfLibOwnerKey('car',c.id))]);
    for(const k of [...sfLib.sel])if(!keys.has(k))sfLib.sel.delete(k);
  }catch(error){console.warn('Documents library could not be loaded',error);sfNotice(sfLibT('The documents library could not be loaded. Try again.','تعذر تحميل مكتبة المستندات. حاول مرة أخرى.'))}
  sfLib.loading=false;sfLibRender();sfLibRedrawSheet();
}

// ── One person's / car's files ───────────────────────────────
let sfLibSheetKey='';
function sfLibOwner(key){const [k,id]=key.split(':');return k==='v'?{kind:'car',owner:sfLib.cars.find(c=>String(c.id)===id)}:{kind:'person',owner:sfLib.people.find(p=>String(p.id)===id)}}
function sfLibCloseSheet(){document.querySelector('.lib-sheet')?.remove();sfLibSheetKey=''}
function sfLibSheet(html){
  let sheet=document.querySelector('.lib-sheet');
  if(!sheet){sheet=document.createElement('div');sheet.className='lib-sheet';sheet.dir=sfLibAr()?'rtl':'ltr';
    sheet.addEventListener('click',e=>{if(e.target===sheet)sfLibCloseSheet()});
    sheet.addEventListener('keydown',e=>{if(e.key==='Escape')sfLibCloseSheet()});document.body.appendChild(sheet)}
  sheet.innerHTML=`<div role="dialog" aria-modal="true">${html}</div>`;return sheet;
}
function sfLibRedrawSheet(){if(sfLibSheetKey&&document.querySelector('.lib-sheet [data-lib-sheet-list]'))sfLibOpen(sfLibSheetKey)}
function sfLibOpen(key){
  const {kind,owner}=sfLibOwner(key);if(!owner)return sfLibCloseSheet();
  sfLibSheetKey=key;
  const files=sfLibFilesOf(kind,owner.id);
  const types=kind==='car'?SF_LIB_CAR_TYPES.map(t=>t[0]):[...new Set([...SF_LIB_GROUP_TYPES[owner.category||''],...files.map(f=>f.doc_type)])];
  const title=kind==='car'?`<span dir="ltr">${sfLibEsc(owner.plate)}</span>`:`<bdi>${sfLibEsc(owner.name)}</bdi>`;
  const sub=kind==='car'?sfLibEsc(owner.model||''):sfLibEsc([owner.name_en,owner.empid].filter(Boolean).join(' · '));
  const group=kind==='person'&&sfLib.canEdit?`<label style="font-size:12px;color:var(--sf-muted);display:flex;align-items:center;gap:6px">${sfLibEsc(sfLibT('Group','الفئة'))}
    <select data-lib-category="${owner.id}" style="font:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid var(--sf-line)"><option value="">—</option>${SF_LIB_GROUPS.map(g=>`<option value="${g[0]}"${owner.category===g[0]?' selected':''}>${sfLibEsc(sfLibT(g[3],g[4]))}</option>`).join('')}</select></label>`:'';
  const fileHtml=f=>{const s=sfLibState(f.expiry_date);
    return `<div class="lib-file ${s.key}"><div class="lib-file-info"><b>${sfLibEsc(f.label||f.file_name)}</b>${f.label?` · ${sfLibEsc(f.file_name)}`:''}<br>
      ${[f.doc_no?sfLibT('No. ','رقم ')+`<span dir="ltr">${sfLibEsc(f.doc_no)}</span>`:'',f.issue_date?sfLibT('Issued ','صدرت ')+sfLibDate(f.issue_date):'',f.expiry_date?`<strong>${sfLibEsc(sfLibStateText(f.expiry_date))}</strong>`:'',`<span dir="ltr">${sfLibSize(f.size_bytes)}</span>`].filter(Boolean).join(' · ')}</div>
      <button type="button" class="lib-btn" data-lib-view-file="${f.id}">👁 ${sfLibEsc(sfLibT('Open','فتح'))}</button>
      ${sfLib.canEdit?`<button type="button" class="lib-btn" data-lib-upload="${key}|${f.doc_type}|${f.id}">↻ ${sfLibEsc(sfLibT('Replace','استبدال'))}</button><button type="button" class="lib-btn danger" data-lib-delete="${f.id}" aria-label="${sfLibEsc(sfLibT('Delete','حذف'))}">🗑</button>`:''}</div>`};
  const section=t=>{const own=files.filter(f=>f.doc_type===t),meta=sfLibType(kind,t);
    return `<div class="lib-type"><div class="lib-type-hdr"><span><b>${sfLibEsc(sfLibTypeName(kind,t))}</b>${own.length?'':`<span class="none">${sfLibEsc(sfLibT('not uploaded','لم يُرفع'))}</span>`}</span>
      ${sfLib.canEdit&&(!meta[3]||!own.length)?`<button type="button" class="lib-btn" data-lib-upload="${key}|${t}|">＋ ${sfLibEsc(sfLibT('Upload','رفع'))}</button>`:''}</div>${own.map(fileHtml).join('')}</div>`};
  const carTools=kind==='car'&&sfLib.canEdit?`<button type="button" class="lib-btn" data-lib-car-edit="${owner.id}">✎ ${sfLibEsc(sfLibT('Edit car','تعديل'))}</button>`:'';
  sfLibSheet(`<div class="lib-sheet-hdr"><div><h4>${title}</h4><small>${sub}</small></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${group}${carTools}
      <button type="button" class="lib-btn" data-lib-close aria-label="${sfLibEsc(sfLibT('Close','إغلاق'))}">✕</button></div></div>
    <div class="lib-sheet-body" data-lib-sheet-list>${types.map(section).join('')}</div>`);
}

// ── Upload ───────────────────────────────────────────────────
// Phone photos (3–5 MB) become a JPEG of at most 2000 px (about 300 KB), still easy to read. PDFs are kept as they are.
async function sfLibShrink(file){
  const allowed=['image/jpeg','image/png','image/webp'];
  if(!String(file.type).startsWith('image/')||(allowed.includes(file.type)&&file.size<600*1024))return file;
  try{
    const bmp=await createImageBitmap(file),k=Math.min(1,2000/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*k));c.height=Math.max(1,Math.round(bmp.height*k));
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
    const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.82));
    if(blob&&(blob.size<file.size||!allowed.includes(file.type)))return new File([blob],String(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
  }catch(e){console.warn('Photo could not be made smaller',e)}
  return file;
}
const sfLibUuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
function sfLibUploadForm(key,type,replaceId){
  const {kind,owner}=sfLibOwner(key);if(!owner)return;
  const meta=sfLibType(kind,type),old=sfLib.files.find(f=>String(f.id)===String(replaceId));
  // The Iqama and SEC-ID numbers and dates are already on the Iqama & SEC-ID page: start from them.
  const pre=old||(type==='iqama'?{doc_no:owner.iqama,expiry_date:owner.iqama_expiry}:type==='sec_id'?{doc_no:owner.sec_id_no,expiry_date:owner.sec_id_expiry}:{});
  const named=!meta[3];
  sfLibSheet(`<div class="lib-sheet-hdr"><div><h4>${sfLibEsc((old?sfLibT('Replace','استبدال'):sfLibT('Upload','رفع'))+' — '+sfLibTypeName(kind,type))}</h4><small>${kind==='car'?sfLibEsc(owner.plate):`<bdi>${sfLibEsc(owner.name)}</bdi>`}</small></div>
      <button type="button" class="lib-btn" data-lib-open="${key}">${sfLibEsc(sfLibT('Back','رجوع'))}</button></div>
    <form class="lib-form" data-lib-form="${key}|${type}|${replaceId||''}">
      <label class="wide">${sfLibEsc(sfLibT('File (PDF or photo, up to 10 MB)','الملف (PDF أو صورة، حتى 10 ميجا)'))}<input type="file" name="file" accept="application/pdf,image/*" required></label>
      ${named?`<label class="wide">${sfLibEsc(sfLibT('Title (e.g. National Grid approval, C1 — Working at height)','العنوان (مثلًا: اعتماد الشركة الوطنية، C1 — العمل على المرتفعات)'))}<input name="label" maxlength="120" value="${sfLibEsc(pre.label||'')}"></label>`:''}
      <label>${sfLibEsc(sfLibT('Number','الرقم'))}<input name="docNo" dir="ltr" maxlength="60" value="${sfLibEsc(pre.doc_no||'')}"></label>
      <label>${sfLibEsc(sfLibT('Issue date','تاريخ الإصدار'))}<input type="date" name="issue" value="${sfLibEsc(pre.issue_date||'')}"></label>
      ${meta[4]?`<label>${sfLibEsc(sfLibT('Expiry date','تاريخ الانتهاء'))}<input type="date" name="expiry" value="${sfLibEsc(pre.expiry_date||'')}"></label>`:''}
      <p class="lib-hint">${sfLibEsc(old?sfLibT('The old file is removed after the new one is saved, so storage is not used twice.','الملف القديم بيتمسح بعد حفظ الجديد، علشان المساحة ما تتحسبش مرتين.')
        :sfLibT('Photos are made smaller before they are sent; PDFs are kept as they are.','الصور بتتصغر قبل الرفع، وملفات PDF بتترفع زي ما هي.'))}</p>
      <div class="lib-form-actions"><span data-lib-form-status style="margin-inline-end:auto;font-size:12px;color:var(--sf-muted)" aria-live="polite"></span>
        <button type="button" class="lib-btn" data-lib-open="${key}">${sfLibEsc(sfLibT('Cancel','إلغاء'))}</button><button type="submit" class="lib-btn primary">${sfLibEsc(sfLibT('Save','حفظ'))}</button></div></form>`);
  document.querySelector('.lib-form input[type=file]')?.focus();
}
async function sfLibSaveUpload(form){
  const [key,type,replaceId]=form.dataset.libForm.split('|'),{kind,owner}=sfLibOwner(key),f=form.elements;
  const status=form.querySelector('[data-lib-form-status]'),say=t=>{status.textContent=t},submit=form.querySelector('[type=submit]');
  let file=f.file.files[0];if(!file||!owner)return;
  const issue=f.issue.value||null,expiry=f.expiry?.value||null;
  if(issue&&expiry&&expiry<issue)return say(sfLibT('The expiry date is before the issue date.','تاريخ الانتهاء قبل تاريخ الإصدار.'));
  submit.disabled=true;
  try{
    say(sfLibT('Preparing…','جاري التجهيز…'));file=await sfLibShrink(file);
    const types={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'},ext=types[file.type];
    if(!ext)throw new Error(sfLibT('Only PDF files and photos (JPG, PNG, WEBP) can be stored.','يُقبل PDF والصور فقط (JPG أو PNG أو WEBP).'));
    if(file.size>SF_LIB_MAX)throw new Error(sfLibT(`The file is ${sfLibSize(file.size)}; the limit is 10 MB. Scan it at a lower quality or split it.`,`حجم الملف ${sfLibSize(file.size)} والحد 10 ميجا. اعمل له سكان بجودة أقل أو قسّمه.`));
    const path=`${kind==='car'?'vehicle':'person'}/${owner.id}/${sfLibUuid()}.${ext}`;
    say(sfLibT('Uploading…','جاري الرفع…'));
    const up=await sfDb.storage.from(SF_LIB_BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
    const row={[kind==='car'?'vehicle_id':'recipient_id']:owner.id,doc_type:type,label:f.label?.value.trim()||null,doc_no:f.docNo.value.trim()||null,issue_date:issue,expiry_date:expiry,
      storage_path:path,file_name:sfLibSafe(file.name).slice(0,200),mime_type:file.type,size_bytes:file.size};
    const ins=await sfDb.from('eq_library_files').insert(row).select().single();
    if(ins.error){await sfDb.storage.from(SF_LIB_BUCKET).remove([path]);throw ins.error}
    sfLib.files.push(ins.data);
    if(replaceId)await sfLibRemove(sfLib.files.find(x=>String(x.id)===String(replaceId)),true);
    void sfLibUsage();sfLibRender();sfLibOpen(key);
    if(typeof window.sfAttentionInvalidate==='function')window.sfAttentionInvalidate();
  }catch(error){say('');submit.disabled=false;sfNotice(sfLibT('The file was not saved: ','لم يُحفظ الملف: ')+(error?.message||error))}
}
async function sfLibRemove(file,quiet){
  if(!file)return;
  const del=await sfDb.from('eq_library_files').delete().eq('id',file.id);
  if(del.error){if(!quiet)sfNotice(sfLibT('The file was not deleted: ','لم يُحذف الملف: ')+del.error.message);return false}
  await sfDb.storage.from(SF_LIB_BUCKET).remove([file.storage_path]);
  sfLib.files=sfLib.files.filter(x=>x.id!==file.id);return true;
}
async function sfLibUsage(){const {data,error}=await sfDb.rpc('eq_storage_usage');if(!error){sfLib.usage=data;sfLibRender()}}
async function sfLibViewFile(id){
  const f=sfLib.files.find(x=>String(x.id)===String(id));if(!f)return;
  const w=window.open('','_blank'); // opened now so the phone does not block it after the wait
  const {data,error}=await sfDb.storage.from(SF_LIB_BUCKET).createSignedUrl(f.storage_path,300);
  if(error||!data?.signedUrl){w?.close();return sfNotice(sfLibT('The file could not be opened.','تعذر فتح الملف.'))}
  if(w)w.location.href=data.signedUrl;else location.href=data.signedUrl;
}

// ── Cars ─────────────────────────────────────────────────────
function sfLibCarForm(id){
  const car=sfLib.cars.find(c=>String(c.id)===String(id))||{};
  const drivers=[...sfLib.people].sort((a,b)=>(a.category==='driver'?0:1)-(b.category==='driver'?0:1)||String(a.name).localeCompare(String(b.name)));
  sfLibSheet(`<div class="lib-sheet-hdr"><div><h4>${sfLibEsc(car.id?sfLibT('Edit car','تعديل العربية'):sfLibT('Add car','إضافة عربية'))}</h4></div>
      <button type="button" class="lib-btn" data-lib-close aria-label="${sfLibEsc(sfLibT('Close','إغلاق'))}">✕</button></div>
    <form class="lib-form" data-lib-car-form="${car.id||''}">
      <label>${sfLibEsc(sfLibT('Plate number','رقم اللوحة'))}<input name="plate" dir="ltr" maxlength="40" required value="${sfLibEsc(car.plate||'')}"></label>
      <label>${sfLibEsc(sfLibT('Make / model / year','النوع / الموديل / السنة'))}<input name="model" maxlength="80" value="${sfLibEsc(car.model||'')}"></label>
      <label class="wide">${sfLibEsc(sfLibT('Driver in charge','السائق المسؤول'))}<select name="driver"><option value="">—</option>${drivers.map(p=>`<option value="${p.id}"${String(p.id)===String(car.driver_id)?' selected':''}>${sfLibEsc(p.name)}${p.category==='driver'?' — '+sfLibEsc(sfLibT('Driver','سائق')):''}</option>`).join('')}</select></label>
      <label class="wide">${sfLibEsc(sfLibT('Notes','ملاحظات'))}<input name="notes" maxlength="200" value="${sfLibEsc(car.notes||'')}"></label>
      <div class="lib-form-actions">${car.id?`<button type="button" class="lib-btn danger" data-lib-car-delete="${car.id}" style="margin-inline-end:auto">${sfLibEsc(sfLibT('Delete car','حذف العربية'))}</button>`:''}
        <button type="button" class="lib-btn" ${car.id?`data-lib-open="v:${car.id}"`:'data-lib-close'}>${sfLibEsc(sfLibT('Cancel','إلغاء'))}</button><button type="submit" class="lib-btn primary">${sfLibEsc(sfLibT('Save','حفظ'))}</button></div></form>`);
  document.querySelector('.lib-form [name=plate]')?.focus();
}
async function sfLibSaveCar(form){
  const id=form.dataset.libCarForm,f=form.elements;
  const row={plate:f.plate.value.trim(),model:f.model.value.trim()||null,driver_id:f.driver.value?Number(f.driver.value):null,notes:f.notes.value.trim()||null,updated_at:new Date().toISOString()};
  if(!row.plate)return;
  const res=id?await sfDb.from('eq_vehicles').update(row).eq('id',id).select().single():await sfDb.from('eq_vehicles').insert(row).select().single();
  if(res.error)return sfNotice(/unique|duplicate/i.test(res.error.message)?sfLibT('A car with this plate number is already recorded.','فيه عربية متسجلة بنفس رقم اللوحة.'):sfLibT('The car was not saved: ','لم تُحفظ العربية: ')+res.error.message);
  sfLib.cars=[...sfLib.cars.filter(c=>String(c.id)!==String(res.data.id)),res.data].sort((a,b)=>String(a.plate).localeCompare(String(b.plate)));
  sfLibRender();sfLibOpen('v:'+res.data.id);
}
async function sfLibDeleteCar(id){
  const car=sfLib.cars.find(c=>String(c.id)===String(id));if(!car)return;
  const files=sfLibFilesOf('car',id);
  const ok=await sfConfirm({title:sfLibT(`Delete the car ${car.plate}${files.length?` and its ${files.length} file(s)`:''}? This cannot be undone.`,`حذف العربية ${car.plate}${files.length?` و${files.length} ملف تابعين لها`:''}؟ لا يمكن التراجع.`),ok:sfLibT('Delete','حذف'),danger:true});
  if(!ok)return;
  const paths=files.map(f=>f.storage_path);
  const del=await sfDb.from('eq_vehicles').delete().eq('id',id);
  if(del.error)return sfNotice(sfLibT('The car was not deleted: ','لم تُحذف العربية: ')+del.error.message);
  if(paths.length)await sfDb.storage.from(SF_LIB_BUCKET).remove(paths);
  sfLib.cars=sfLib.cars.filter(c=>String(c.id)!==String(id));sfLib.files=sfLib.files.filter(f=>String(f.vehicle_id)!==String(id));sfLib.sel.delete('v:'+id);
  sfLibCloseSheet();sfLibRender();void sfLibUsage();
}

// ── Download chosen ──────────────────────────────────────────
// Each file gets a folder (group / person, or Vehicles / plate) and a clear name, e.g. "Ahmed Ali - Iqama.pdf".
function sfLibPlan(){
  const used=new Set(),out=[];
  for(const f of sfLibPicked()){
    let folder,base;
    if(f.vehicle_id){const c=sfLib.cars.find(x=>String(x.id)===String(f.vehicle_id));folder=`Vehicles/${sfLibSafe(c?.plate)}`;base=`${sfLibSafe(c?.plate)} - ${sfLibType('car',f.doc_type)[1]}`}
    else{const p=sfLib.people.find(x=>String(x.id)===String(f.recipient_id)),g=sfLibGroup(p?.category);folder=`${g?g[1]:'Others'}/${sfLibSafe(sfLibPersonName(p))}`;base=`${sfLibSafe(sfLibPersonName(p))} - ${sfLibType('person',f.doc_type)[1]}`}
    if(f.label)base+=` - ${sfLibSafe(f.label)}`;
    let name=`${base}.${sfLibExt(f)}`,n=2;while(used.has(`${folder}/${name}`.toLowerCase()))name=`${base} (${n++}).${sfLibExt(f)}`;
    used.add(`${folder}/${name}`.toLowerCase());out.push({file:f,folder,name});
  }
  return out;
}
async function sfLibFetch(plan,each){
  const missing=[];let i=0;
  for(const item of plan){
    sfLib.busy=sfLibT(`Downloading ${++i} of ${plan.length}…`,`جاري تحميل ${i} من ${plan.length}…`);sfLibRefreshBar();
    try{const {data,error}=await sfDb.storage.from(SF_LIB_BUCKET).download(item.file.storage_path);if(error)throw error;await each(item,data)}
    catch(e){console.warn('Library file not read',item.file.storage_path,e);missing.push(`${item.folder}/${item.name}`)}
  }
  return missing;
}
const sfLibStamp=()=>{const t=new Date();return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`};
async function sfLibZip(){
  const plan=sfLibPlan();if(!plan.length||sfLib.busy)return;
  const root=`SkyField Documents ${sfLibStamp()}`,files={};
  try{
    const missing=await sfLibFetch(plan,async(item,blob)=>{files[`${root}/${item.folder}/${item.name}`]=[new Uint8Array(await blob.arrayBuffer()),{level:0}]});
    sfLib.busy=sfLibT('Making the ZIP…','جاري تجهيز ملف ZIP…');sfLibRefreshBar();
    if(missing.length)files[`${root}/NOT INCLUDED.txt`]=fflate.strToU8(missing.join('\r\n'));
    const zip=await new Promise((ok,fail)=>fflate.zip(files,(e,out)=>e?fail(e):ok(out)));
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));
    a.href=url;a.download=`${root}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    sfLib.busy='';sfLibRefreshBar();
    sfNotice(missing.length?sfLibT(`Downloaded ${plan.length-missing.length} files. ${missing.length} could not be read (listed in NOT INCLUDED.txt).`,`اتحمّل ${plan.length-missing.length} ملف، وتعذّر قراءة ${missing.length} (أسماؤها في NOT INCLUDED.txt).`)
      :sfLibT(`Downloaded ${plan.length} files in one ZIP.`,`اتحمّل ${plan.length} ملف في ZIP واحد.`));
  }catch(error){sfLib.busy='';sfLibRefreshBar();sfNotice(sfLibT('The download failed: ','تعذر التحميل: ')+(error?.message||error))}
}
// On a computer (Chrome / Edge): write the files straight into a folder the user picks, e.g. inside Google Drive.
async function sfLibFolder(){
  const plan=sfLibPlan();if(!plan.length||sfLib.busy)return;
  let dir;try{dir=await window.showDirectoryPicker({mode:'readwrite',id:'skyfield-documents'})}catch(e){return}
  try{
    const root=await dir.getDirectoryHandle(`SkyField Documents ${sfLibStamp()}`,{create:true});
    const missing=await sfLibFetch(plan,async(item,blob)=>{let d=root;for(const part of item.folder.split('/'))d=await d.getDirectoryHandle(part,{create:true});
      const w=await (await d.getFileHandle(item.name,{create:true})).createWritable();await w.write(blob);await w.close()});
    sfLib.busy='';sfLibRefreshBar();
    sfNotice(missing.length?sfLibT(`Saved ${plan.length-missing.length} files; ${missing.length} could not be read.`,`اتحفظ ${plan.length-missing.length} ملف، وتعذر قراءة ${missing.length}.`)
      :sfLibT(`Saved ${plan.length} files in the folder "${root.name}".`,`اتحفظ ${plan.length} ملف في فولدر "${root.name}".`));
  }catch(error){sfLib.busy='';sfLibRefreshBar();sfNotice(sfLibT('Saving failed: ','تعذر الحفظ: ')+(error?.message||error))}
}

// ── Routing inside the main site ─────────────────────────────
sfUnifiedAllowed=function(route){return route==='library'?sfLib.access:sfLibBaseAllowed(route)};
async function sfLibCheckAccess(){
  sfLib.access=false;
  try{const {data,error}=await sfDb.rpc('eq_can_open_documents');sfLib.access=!error&&data===true}catch(error){console.warn('Documents library access check skipped',error)}
  sfLib.checked=true;sfUnifiedApplyAccess();
  if(sfLibWanted&&sfLib.access)showTab('library');
  sfLibWanted=false;
}
function sfLibTitle(){document.getElementById('app-page-title').textContent=sfLibT('Documents Library','مكتبة المستندات');
  document.getElementById('app-page-subtitle').textContent=sfLibT('CVs, Iqamas, SEC-ID cards, approvals, certificates, licences and car papers — choose and download together.','السير الذاتية والإقامات وبطاقات SEC والاعتمادات والشهادات والرخص وأوراق العربيات — اختار ونزّل مرة واحدة.')}
showTab=function(name,button){
  const panel=document.getElementById('sf-library-panel');
  if(name!=='library'){if(panel)panel.hidden=true;sfLibCloseSheet();return sfLibBaseShow(name,button)}
  if(!sfAuthReady||!sfLib.checked){sfLibWanted=true;return}
  if(!sfUnifiedAllowed('library'))return sfLibBaseShow(sfUnifiedProfile?.role==='accountant'?'accounting':'dashboard');
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  for(const id of ['sf-unified-panel','sf-equipment-panel','sf-documents-panel','sf-users-panel','sf-leave-panel']){const el=document.getElementById(id);if(el)el.hidden=true}
  document.getElementById('command-primary-action').hidden=true;panel.hidden=false;
  sfUnifiedRoute='library';sfUnifiedDesired='library';document.body.dataset.module='library';
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module==='library'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  sfLibTitle();sfLibRender();void sfLibLoad();
  history.replaceState(null,'','#library');localStorage.setItem('sfLastModule','library');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});sfUnifiedApplyAccess();
};
sfUnlockApp=function(user){sfLib.checked=false;sfLibBaseUnlock(user);void sfLibCheckAccess()};
sfLockApp=function(clear){Object.assign(sfLib,{access:false,checked:false,canEdit:false,people:[],cars:[],files:[],usage:null,busy:'',loaded:false});sfLib.sel.clear();sfLibCloseSheet();
  const p=document.getElementById('sf-library-panel');if(p){p.hidden=true;p.innerHTML=''}sfLibBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){sfLibBaseLanguage(lang,persist);if(sfUnifiedRoute==='library'&&!document.getElementById('sf-library-panel').hidden){sfLibTitle();sfLibRender();sfLibRedrawSheet()}};

document.addEventListener('click',e=>{
  const t=e.target;if(!t.closest||!t.closest('#sf-library-panel,.lib-sheet'))return;
  const hit=sel=>t.closest(sel);let b;
  if((b=hit('[data-lib-view]'))){sfLib.view=b.dataset.libView;sfLib.search='';return sfLibRender()}
  if((b=hit('[data-lib-group]'))){sfLib.group=b.dataset.libGroup;return sfLibRender()}
  if((b=hit('[data-lib-kind]'))){const k=b.dataset.libKind;sfLib.types.has(k)?sfLib.types.delete(k):sfLib.types.add(k);return sfLibRefreshBar()}
  if(hit('[data-lib-clear]')){sfLib.sel.clear();return sfLibRender()}
  if(hit('[data-lib-zip]'))return void sfLibZip();
  if(hit('[data-lib-folder]'))return void sfLibFolder();
  if((b=hit('[data-lib-open]')))return sfLibOpen(b.dataset.libOpen);
  if(hit('[data-lib-close]'))return sfLibCloseSheet();
  if((b=hit('[data-lib-upload]'))){const [key,type,id]=b.dataset.libUpload.split('|');return sfLibUploadForm(key,type,id)}
  if((b=hit('[data-lib-view-file]')))return void sfLibViewFile(b.dataset.libViewFile);
  if((b=hit('[data-lib-delete]'))){const f=sfLib.files.find(x=>String(x.id)===b.dataset.libDelete);if(!f)return;
    return void sfConfirm({title:sfLibT(`Delete "${f.label||f.file_name}"? This cannot be undone.`,`حذف "${f.label||f.file_name}"؟ لا يمكن التراجع.`),ok:sfLibT('Delete','حذف'),danger:true})
      .then(async ok=>{if(ok&&await sfLibRemove(f)){sfLibRender();sfLibOpen(sfLibSheetKey);void sfLibUsage()}})}
  if((b=hit('[data-lib-car-edit]')))return sfLibCarForm(b.dataset.libCarEdit);
  if((b=hit('[data-lib-car-delete]')))return void sfLibDeleteCar(b.dataset.libCarDelete);
});
document.addEventListener('change',async e=>{
  const t=e.target;if(!t.closest||!t.closest('#sf-library-panel,.lib-sheet'))return;
  if(t.dataset.libPick){t.checked?sfLib.sel.add(t.dataset.libPick):sfLib.sel.delete(t.dataset.libPick);t.closest('tr')?.classList.toggle('is-selected',t.checked);
    const all=document.querySelector('[data-lib-pick-all]'),kind=sfLib.view==='cars'?'car':'person',owners=sfLibOwners();
    if(all)all.checked=owners.length&&owners.every(o=>sfLib.sel.has(sfLibOwnerKey(kind,o.id)));return sfLibRefreshBar()}
  if(t.hasAttribute('data-lib-pick-all')){const kind=sfLib.view==='cars'?'car':'person';for(const o of sfLibOwners()){const k=sfLibOwnerKey(kind,o.id);t.checked?sfLib.sel.add(k):sfLib.sel.delete(k)}return sfLibRender()}
  if(t.dataset.libCategory){const {data,error}=await sfDb.rpc('eq_set_category',{p_id:Number(t.dataset.libCategory),p_category:t.value||null});
    if(error)return sfNotice(sfLibT('The group was not saved: ','لم تُحفظ الفئة: ')+error.message);
    const p=sfLib.people.find(x=>String(x.id)===String(data.id));if(p)p.category=data.category;sfLibRender();sfLibOpen(sfLibSheetKey)}
});
document.addEventListener('submit',e=>{
  const form=e.target;if(form.dataset?.libForm!==undefined){e.preventDefault();return void sfLibSaveUpload(form)}
  if(form.dataset?.libCarForm!==undefined){e.preventDefault();return void sfLibSaveCar(form)}
});
// Search redraws the list and puts the cursor back where it was.
document.addEventListener('input',e=>{if(e.target?.id!=='sf-lib-search')return;sfLib.search=e.target.value;
  const keep=e.target.selectionStart;sfLibRender();const box=document.getElementById('sf-lib-search');if(box){box.focus();try{box.setSelectionRange(keep,keep)}catch(_){}}});

// SKY FIELD — Shared helpers (formatting, numbers, dates, ids, small utilities).
// Function declarations only (moved from index.html); nothing runs when this file loads.
function sfSafeFileNamePart(value,fallback='Document'){
  const cleaned=String(value||'').trim()
    .replace(/[\\/:*?\"<>|]+/g,' ')
    .replace(/\s+/g,' ')
    .replace(/[. ]+$/g,'')
    .trim();
  return cleaned||fallback;
}
function sfApplyPreviewTitle(kind='quotation'){
  document.title=sfSuggestedPrintTitle(kind);
  sfPreviewTitleActive=true;
}
function fmtN(n){return Math.round(n).toLocaleString()}

function toggleSOWMenu(){
  const menu=document.getElementById('sow-menu');
  const btn=document.getElementById('sow-toggle-btn');
  const hidden=menu.classList.toggle('sow-hidden');
  btn.textContent = hidden ? 'Show Scope of Work Menu' : 'Hide Scope of Work Menu';
  btn.classList.toggle('active-toggle', hidden);
  btn.setAttribute('aria-expanded',String(!hidden));
}
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function sfSafeSegment(value){return String(value||'item').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100)||'item'}
async function sfOpenDocumentRecord(doc){
  if(!doc)return;
  let url='';
  if(doc.storagePath&&sfDb){const {data,error}=await sfDb.storage.from(SF_STORAGE_BUCKET).createSignedUrl(doc.storagePath,300);if(error){alert('Unable to open this document: '+(error.message||error));return}url=data?.signedUrl||''}
  else url=sfLegacySafeUrl(doc.url);
  if(!url||url==='#'){alert('The document link is not available.');return}
  const w=window.open(url,'_blank');if(w)w.opener=null;
}
async function sfRemoveStoredDocument(doc){if(doc?.storagePath&&sfDb&&sfCurrentUser){try{await sfDb.storage.from(SF_STORAGE_BUCKET).remove([doc.storagePath])}catch(e){console.warn('Storage cleanup failed',e)}}}










function removeSelectedEquipment(i){
  delete selEq[i];delete eqQty[i];buildEq();recalc();renderQuot();
}
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }


// ══════════════════════════════════════════════════════════════════════════════
// PROFORMA INVOICE MODULE
// ══════════════════════════════════════════════════════════════════════════════
function roundMoney(n){ return Math.round((Number(n)||0)*100)/100; }
function fmtMoney(n){ return (Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function getPriorAdvancePct(src,excludeId){
  if(!src)return 0;
  return Math.min(100,proformaInvoices.reduce((sum,p)=>{
    if(excludeId&&p.id===excludeId)return sum;
    if((p.sourceQuoteId||'')!==(src.id||''))return sum;
    return p.basis==='percentage'?sum+(parseFloat(p.percentage)||0):sum;
  },0));
}
// Returns the cumulative percentage already billed for every quotation item. A percentage
// advance is treated as a proportional advance against all items so it cannot be billed twice.
function getPriorProgressMap(src,excludeId){
  const map={};
  if(!src)return map;
  const advancePct=getPriorAdvancePct(src,excludeId);
  proformaInvoices.forEach(p=>{
    if(excludeId&&p.id===excludeId)return;
    if(p.basis!=='progress')return;
    if((p.sourceQuoteId||'')!==(src.id||''))return;
    (p.itemsProgress||[]).forEach(ip=>{
      const cur=parseFloat(ip.currentPct)||0;
      const keys=[ip.itemId,ip.key,ip.legacyKey].filter(Boolean);
      keys.forEach(k=>{if(!(k in map)||cur>map[k])map[k]=cur;});
    });
  });
  map.__advancePct=advancePct;
  return map;
}
function collectProgressContractItems(snap,includeOptional){
  const items=collectProformaBaseItems(snap,includeOptional);
  const totals=snapshotTotals(snap);
  const requiredBefore=parseFloat(totals.subBeforeDiscount)||0;
  const requiredAfter=parseFloat(totals.sub)||0;
  const netFactor=requiredBefore>0?requiredAfter/requiredBefore:1;
  const rows=items.map(x=>{
    const contractLineTotal=roundMoney(x.optional?x.baseLineTotal:x.baseLineTotal*netFactor);
    return {...x,baseLineTotal:contractLineTotal,contractLineTotal};
  });
  const optionalTotal=rows.filter(x=>x.optional).reduce((a,x)=>a+x.baseLineTotal,0);
  const target=roundMoney(requiredAfter+optionalTotal);
  const actual=roundMoney(rows.reduce((a,x)=>a+x.baseLineTotal,0));
  const diff=roundMoney(target-actual);
  if(rows.length&&Math.abs(diff)>=0.01){
    const idx=Math.max(0,rows.map(x=>!x.optional).lastIndexOf(true));
    rows[idx].baseLineTotal=roundMoney(rows[idx].baseLineTotal+diff);
    rows[idx].contractLineTotal=rows[idx].baseLineTotal;
  }
  return rows;
}
// Called on the "Include accepted optional items" checkbox — the item list can change, so rebuild
// the progress rows if that mode is active, then recalc.
function handleIncludeOptionalChange(){
  if(document.getElementById('pi-basis').value==='progress')renderPiProgressRows();
  recalcProformaModal();
}
function currentProgressInputs(){
  return [...document.querySelectorAll('#pi-progress-wrap tr[data-key]')].map(tr=>({
    key:tr.dataset.key,
    priorPct:parseFloat(tr.dataset.prior)||0,
    currentPct:parseFloat(tr.querySelector('.pi-prog-pct')?.value)||0
  }));
}
function infoRow(label,value){return value?`<div class="pi-info-row"><div class="key">${escHtml(label)}</div><div class="value">${escHtml(String(value))}</div></div>`:'';}
function multilineHtml(v){return escHtml(String(v||'')).replace(/\n/g,'<br>');}
function amountInWords(amount){const a=roundMoney(amount),riyals=Math.floor(a),halalas=Math.round((a-riyals)*100);return `${numberToWords(riyals)} Saudi Riyals${halalas?` and ${numberToWords(halalas)} Halalas`:''} Only`;}

function sfUid(prefix){return prefix+'_'+Date.now()+'_'+Math.floor(Math.random()*100000)}
function sfNum(v){return Math.max(0,parseFloat(v)||0)}

function fmtSAR(n){ return 'SAR '+(parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}); }

// ── List filters (Projects, Proforma Invoices) ─────────────────────────────────
function sfFillFilterOptions(id,values,allLabel,labelOf){
  const el=document.getElementById(id);if(!el)return;
  const keep=el.value,list=[...new Set(values.map(v=>String(v??'').trim()).filter(Boolean))];
  const label=v=>labelOf?labelOf(v):v;list.sort((a,b)=>label(a).localeCompare(label(b)));
  const sig=list.map(v=>v+'='+label(v)).join('\u0001');
  if(el.dataset.sig!==sig){el.dataset.sig=sig;el.innerHTML=`<option value="">${escHtml(allLabel)}</option>`+list.map(v=>`<option value="${escHtml(v)}">${escHtml(label(v))}</option>`).join('');}
  el.value=list.includes(keep)?keep:'';
}
function sfIsoDate(v){const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''}
// ── Commission review: amounts calculated automatically on the contract incl. VAT ──
// Only amounts that exactly follow the % of the VAT-inclusive contract are listed;
// manually typed amounts never match that formula and are left untouched.
function sfCommissionReviewItems(){
  if(typeof sfHasAccess!=='function'||!sfHasAccess('payroll'))return[];
  const out=[];
  projects.forEach(p=>{
    if(p.commissionBasis==='net')return;
    const contract=sfNum(p.contract);if(!(contract>0))return;
    const net=contract/(1+sfProjectVatPct(p)/100),items=[];
    const pct=sfNum(p.commissionPct),amt=sfNum(p.commissionAmount);
    if(pct>0&&Math.abs(amt-contract*pct/100)<=0.6){const next=Math.round(net*pct)/100;if(Math.abs(next-amt)>=0.5)items.push({kind:'main',index:'',label:'Quotation commission',pct,old:amt,next})}
    (p.commissions||[]).forEach((c,i)=>{const cp=sfNum(c.pct),ca=sfNum(c.amount);if(cp>0&&Math.abs(ca-contract*cp/100)<=0.6){const next=Math.round(net*cp)/100;if(Math.abs(next-ca)>=0.5)items.push({kind:'entry',index:i,label:c.label||'Commission entry',pct:cp,old:ca,next})}});
    if(items.length)out.push({id:p.id,name:p.name||'Project',client:p.client||'',items});
  });
  return out;
}
function sfRenderCommissionReviewNotice(){
  const el=document.getElementById('proj-comm-review');if(!el)return;
  const list=sfCommissionReviewItems();
  if(!list.length){el.innerHTML='';el.style.display='none';return}
  const diff=list.reduce((s,x)=>s+x.items.reduce((a,i)=>a+i.old-i.next,0),0);
  el.style.display='';
  el.innerHTML=`<div class="comm-review-bar"><div><strong>Commission is now calculated on the amount before VAT.</strong> ${list.length} project(s) still hold commission calculated on the amount including VAT (difference ${fmtSAR(diff)}).<br><span dir="rtl">العمولة صارت تُحسب على المبلغ قبل الضريبة، و${list.length} مشروع ما زال بالحساب القديم.</span></div><button class="btn-primary" onclick="sfOpenCommissionReview()">Review / مراجعة</button></div>`;
}
function sfCloseCommissionReview(){document.getElementById('comm-review-overlay')?.classList.remove('open')}
function sfOpenCommissionReview(){
  const list=sfCommissionReviewItems();if(!list.length)return;
  let ov=document.getElementById('comm-review-overlay');
  if(!ov){ov=document.createElement('div');ov.id='comm-review-overlay';ov.className='proj-modal-overlay';document.body.appendChild(ov)}
  const rows=list.map(x=>x.items.map((it,k)=>`<tr><td>${k?'':`<strong>${escHtml(x.name)}</strong><div style="font-size:10px;color:var(--gray-500)">${escHtml(x.client)}</div>`}</td><td>${escHtml(it.label)} (${it.pct}%)</td><td>${fmtSAR(it.old)}</td><td><strong>${fmtSAR(it.next)}</strong></td><td style="color:#15803d">−${fmtSAR(it.old-it.next)}</td><td style="text-align:center"><input type="checkbox" checked data-comm-review="${escHtml(x.id+'|'+it.kind+'|'+it.index)}" aria-label="Apply"></td></tr>`).join('')).join('');
  ov.innerHTML=`<div class="proj-modal" style="width:min(96vw,780px)"><div class="proj-modal-hdr"><h3>Commission before VAT / العمولة قبل الضريبة</h3><button type="button" onclick="sfCloseCommissionReview()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer" aria-label="Close">×</button></div>
   <div style="padding:16px 20px;font-size:12px">
   <p style="margin:0 0 6px">These amounts were calculated automatically from the commission % on the contract value <b>including</b> VAT. Ticked rows will be recalculated on the amount before VAT; unticked rows keep their current amount. Amounts that were typed manually are not listed and stay unchanged.</p>
   <p dir="rtl" style="margin:0 0 12px;color:var(--gray-600)">هذه العمولات حُسبت تلقائيًا من النسبة على قيمة العقد شاملة الضريبة. الصفوف المحددة تُعاد حسابها على المبلغ قبل الضريبة، وغير المحددة تبقى كما هي. المبالغ المكتوبة يدويًا لا تظهر هنا ولن تتغير.</p>
   <div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Project</th><th>Commission</th><th>Current</th><th>Before VAT</th><th>Difference</th><th>Apply</th></tr></thead><tbody>${rows}</tbody></table></div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button type="button" class="btn-outline" onclick="sfCloseCommissionReview()">Later / لاحقًا</button><button type="button" class="btn-primary" id="comm-review-apply" onclick="sfApplyCommissionReview()">Apply / تطبيق</button></div></div></div>`;
  ov.classList.add('open');
}
async function sfApplyCommissionReview(){
  const list=sfCommissionReviewItems(),ticked=new Set([...document.querySelectorAll('[data-comm-review]')].filter(x=>x.checked).map(x=>x.dataset.commReview));
  const btn=document.getElementById('comm-review-apply');if(btn)btn.disabled=true;
  const now=new Date().toISOString();let changed=0;
  list.forEach(x=>{
    const p=projects.find(q=>q.id===x.id);if(!p)return;
    x.items.forEach(it=>{
      if(!ticked.has(x.id+'|'+it.kind+'|'+it.index))return;
      if(it.kind==='main')p.commissionAmount=it.next;
      else if(p.commissions?.[it.index])p.commissions[it.index]={...p.commissions[it.index],amount:it.next};
      changed++;
    });
    p.commissionBasis='net';p.updatedAt=now;
  });
  let result=null;try{result=await saveProjects()}catch(e){console.error(e)}
  sfCloseCommissionReview();renderProjects();
  if(!result||result.conflicts?.length||result.errors?.length)alert('Some projects could not be saved to the shared database. Their latest version was kept; open Projects again and review the remaining ones.\nبعض المشاريع لم تُحفظ. افتح المشاريع وراجع الباقي.');
  else alert(`Updated ${changed} commission amount(s) to the amount before VAT.\nتم تحديث ${changed} عمولة على المبلغ قبل الضريبة.`);
}
function clearListFilters(kind){
  const ids=kind==='proj'?['proj-search','pf-status','pf-client','pf-from','pf-to','pf-collect']:['pi-search','if-status','if-client','if-project'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  kind==='proj'?renderProjects():renderProformas();
}

// Attendance cost lines are monthly totals: show the month, not its first day.
function sfExpenseDateLabel(x){
  if(x?.source==='payroll'&&String(x.sourceId||'').startsWith('attendance:')&&/^\d{4}-\d{2}/.test(String(x.date||''))){const [y,m]=String(x.date).split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y+' · month total'}
  return pdDate(x?.date);
}
function sfExpenseCategoryLabel(x){const c=String(x?.category||x?.source||'Other');return SF_EXPENSE_CATEGORY_LABELS[c]||c}

async function handleDocFiles(input){
  const files=Array.from(input.files||[]),projectId=document.getElementById('pm-id')?.value||'draft';input.disabled=true;setCloudStatus('saving','Uploading project document…');
  try{for(const file of files){pmTempDocs.push(await sfUploadDocument(file,'project',projectId));renderPmLists()}setCloudStatus('','Documents uploaded securely')}
  catch(error){console.error('Project document upload failed',error);alert('Document upload failed. Ensure the Supabase Storage SQL setup has been applied.\n'+(error?.message||error));setCloudStatus('error','Upload failed')}
  finally{input.disabled=false;input.value=''}
}

// Stable numeric employee-code order; empty codes appear last. Never mutate source arrays.
function sfSortEmployees(rows){
 const key=r=>String(r.employeeNo??'').trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
 return [...rows].sort((a,b)=>{const x=key(a),y=key(b);if(!x||!y)return x?-1:y?1:0;return x.localeCompare(y,'en',{numeric:true})});
}

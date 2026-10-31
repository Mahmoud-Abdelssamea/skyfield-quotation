// SKY FIELD — Projects: list, details, purchase orders, commission.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function sfProjectChildRecords(kind){
  const out=[];
  (typeof projects!=='undefined'?projects:[]).forEach(p=>{
    const list=kind==='payments'?(p.payments||[]):kind==='expenses'?(p.actualExpenses||[]):(p.docs||[]);
    list.forEach((x,i)=>out.push({...x,id:String(x.id||x.sourceProformaId||x.storagePath||(`${p.id}_${kind}_${i}`)),projectId:p.id,updatedAt:p.updatedAt||new Date().toISOString()}));
  });
  return out;
}
function commissionPct(){return parseFloat(document.getElementById('commission').value)||0}
// One definition of invoiced / received / outstanding for every screen. Each project billing entry
// (a linked proforma invoice or an installment) counts once, and a receipt only reduces its own entry,
// so money received on one project can never hide an unpaid invoice on another.
function sfProjectMoney(p){let invoiced=0,received=0;(p?.payments||[]).forEach(raw=>{const x=sfNormalizePaymentRecord(raw);invoiced+=x.amount;received+=x.receivedAmount});const contract=sfNum(p?.contract);return{contract,invoiced,received,outstanding:Math.max(0,invoiced-received),toInvoice:Math.max(0,contract-invoiced)}}
function sfMoneyTotals(list){const t={contract:0,invoiced:0,received:0,outstanding:0,toInvoice:0};(list||[]).forEach(p=>{const m=sfProjectMoney(p);for(const k in t)t[k]+=m[k]});return t}
function updateProjectDuration(val){
  projectDuration = val.trim();
  buildConds();renderQuot();
}
// Button handler: create/update the linked project for a given saved quotation id, then confirm to the user.
function addQuotationAsProject(id){
  const rec = savedQuotes.find(q=>q.id===id); if(!rec) return;
  const wasLinked = !!rec.projectId;
  const proj = syncProjectFromQuotation(rec);
  saveSavedQuotes(); renderSavedQuotations(); updateProformaAvailabilityControls();
  alert((wasLinked?'Project updated: ':'Project created: ')+proj.name+'\nYou can find it in the Projects tab — add commission, invoices, and other documents there.');
}
// Button handler for the quotation currently open in the editor.
function addCurrentQuotationAsProject(){
  if(!activeQuoteId){ alert('Save this quotation first, then you can add it as a project.'); return; }
  addQuotationAsProject(activeQuoteId);
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function sfNormalizeProjectRecord(p={}){
  return {...p,
    id:p.id,name:p.name||'',client:p.client||'',status:p.status||'active',
    contract:p.contract||0,start:p.start||'',notes:p.notes||'',
    pos:Array.isArray(p.pos)?p.pos:[],payments:(Array.isArray(p.payments)?p.payments:[]).map(sfNormalizePaymentRecord),
    docs:Array.isArray(p.docs)?p.docs:[],quotes:Array.isArray(p.quotes)?p.quotes:[],proformas:Array.isArray(p.proformas)?p.proformas:[],
    commissionPct:p.commissionPct||0,commissionAmount:p.commissionAmount||0,commissionNotes:p.commissionNotes||'',
    commissions:Array.isArray(p.commissions)?p.commissions:[],
    estimatedInternalCost:parseFloat(p.estimatedInternalCost)||0,
    expectedProfit:parseFloat(p.expectedProfit)||0,
    assignedEngineers:Array.isArray(p.assignedEngineers)?p.assignedEngineers:[],
    costPlan:p.costPlan||null,actualExpenses:Array.isArray(p.actualExpenses)?p.actualExpenses:[],
    updatedAt:p.updatedAt||'',_syncRevision:p._syncRevision,_syncUpdatedAt:p._syncUpdatedAt,_syncDeletedAt:p._syncDeletedAt
  };
}
// Total commission for a project = the auto-synced amount from its linked quotation (if any) + any manually added commission entries.
// ── Project finance before VAT ───────────────────────────────────────────────
// Contract, invoice and receipt amounts include VAT. VAT is owed to ZATCA and is
// never profit, so profit and commission use the amounts before VAT.
function sfProjectVatPct(p){
  const v=parseFloat(p?.vatPct);if(Number.isFinite(v)&&v>=0&&v<100)return v;
  const q=(typeof savedQuotes!=='undefined'?savedQuotes:[]).find(r=>r&&r.projectId===p?.id&&parseFloat(r.snapshot?.totals?.sub)>0&&Number.isFinite(parseFloat(r.snapshot?.totals?.vatA)));
  if(q)return Math.round(parseFloat(q.snapshot.totals.vatA)/parseFloat(q.snapshot.totals.sub)*10000)/100;
  return 15;
}
function sfProjectFinance(p){
  const contract=sfNum(p.contract),vat=sfProjectVatPct(p),contractNet=contract/(1+vat/100);
  let invoiced=0,invoicedNet=0,received=0,receivedNet=0;
  (p.payments||[]).forEach(raw=>{const pay=sfNormalizePaymentRecord(raw),r=sfPaymentNetRatio(p,pay),amount=sfNum(pay.amount),got=pay.receivedAmount;invoiced+=amount;invoicedNet+=amount*r;received+=got;receivedNet+=got*r});
  const estimated=sfNum(p.estimatedInternalCost),actual=projectActualExpenseTotal(p),commission=projTotalCommission(p);
  // The final cost can never be lower than what is already spent, so the expected cost is the larger of the
  // estimate and the actual cost. Without an estimate there is no expected profit, only a ceiling.
  const hasEstimate=estimated>0,expectedCost=hasEstimate?Math.max(estimated,actual):null;
  const expectedProfit=hasEstimate?contractNet-expectedCost-commission:null,cashProfit=receivedNet-actual-commission,profitCeiling=contractNet-actual-commission;
  return{contract,vat,contractNet,invoiced,invoicedNet,received,receivedNet,outstanding:Math.max(0,invoiced-received),remaining:Math.max(0,contract-invoiced),
    estimated,actual,commission,hasEstimate,expectedCost,expectedProfit,expectedMargin:hasEstimate&&contractNet>0?expectedProfit/contractNet*100:null,profitCeiling,costOverEstimate:hasEstimate&&actual>estimated,cashProfit,costUsedPct:estimated>0?actual/estimated*100:null};
}
function projTotalCommission(p){
  const manual = (p.commissions||[]).reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
  return (parseFloat(p.commissionAmount)||0) + manual;
}

function saveProjects(){
  try{
    sfCachePerRecordCollection('sfProjects',projects);
  }catch(e){
    alert('Could not save project data in the local cache. New documents are stored in Supabase Storage; remove old legacy Base64 attachments if this continues.');
  }
  updateSidebarCounts();
  if(document.body.dataset.module==='dashboard') renderDashboard();
  return sfSyncDirtyProjects();
}
function sfProjectFilterValues(){const v=id=>(document.getElementById(id)||{value:''}).value;return{status:v('pf-status'),client:v('pf-client'),from:v('pf-from'),to:v('pf-to'),collect:v('pf-collect')}}
function sfProjectPassesFilters(p,f){
  const status={active:'active',completed:'completed',hold:'hold'}[p.status]||'active';
  if(f.status&&status!==f.status)return false;
  if(f.client&&String(p.client||'').trim()!==f.client)return false;
  if(f.from||f.to){const start=sfIsoDate(p.start);if(!start||(f.from&&start<f.from)||(f.to&&start>f.to))return false;}
  if(f.collect){
    const sfM=sfProjectMoney(p),invoiced=sfM.invoiced,pending=sfM.outstanding;
    if(f.collect==='outstanding'&&!(pending>0.005))return false;
    if(f.collect==='paid'&&!(invoiced>0&&pending<=0.005))return false;
    if(f.collect==='none'&&invoiced>0)return false;
  }
  return true;
}
function renderProjects(){
  const q=(document.getElementById('proj-search')||{value:''}).value.toLowerCase();
    sfRenderCommissionReviewNotice();
  sfFillFilterOptions('pf-client',projects.map(p=>p.client),'All clients / كل العملاء');
  const pf=sfProjectFilterValues();
  const filtered = projects.filter(p=>(p.name.toLowerCase().includes(q)||(p.client||'').toLowerCase().includes(q))&&sfProjectPassesFilters(p,pf));
  sfListCount('pf-count',filtered.length,projects.length,'project(s)');

  // Summary bar
  const sfMoney=sfMoneyTotals(filtered); const totContract=sfMoney.contract; const totInvoiced=sfMoney.invoiced; const totReceived=sfMoney.received; const totPending=sfMoney.outstanding; const sfLooseTotal=sfUnlinkedProformaTotal();
  const totCommission = filtered.reduce((s,p)=>s+projTotalCommission(p),0);
  document.getElementById('proj-summary').innerHTML=`
    <div class="pfs-card"><div class="pfs-lbl">Total Contract Value</div><div class="pfs-val">${fmtSAR(totContract)}</div><div class="pfs-sub">Incl. VAT · ${filtered.length===projects.length?projects.length+' project(s)':filtered.length+' of '+projects.length+' project(s) · filtered'}</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Total Invoiced</div><div class="pfs-val">${fmtSAR(totInvoiced)}</div><div class="pfs-sub">Incl. VAT · project invoices &amp; installments</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Total Received</div><div class="pfs-val tone-ok">${fmtSAR(totReceived)}</div><div class="pfs-sub">Incl. VAT · recorded invoice receipts</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Outstanding / Pending</div><div class="pfs-val tone-warn">${fmtSAR(totPending)}</div><div class="pfs-sub">Incl. VAT · unpaid on these projects</div>${sfLooseTotal>0.005?`<div class="pfs-sub pfs-loose">+ ${fmtSAR(sfLooseTotal)} on invoices not linked to a project</div>`:''}</div>
    <div class="pfs-card"><div class="pfs-lbl">Total Commission (عمولة)</div><div class="pfs-val tone-warn">${fmtSAR(totCommission)}</div><div class="pfs-sub">Before VAT · ${filtered.length===projects.length?'across all projects':'across shown projects'}</div></div>
  `;

  const grid=document.getElementById('proj-grid');
  if(!filtered.length){
    grid.innerHTML=`<div class="proj-empty" style="grid-column:1/-1"><div class="pe-icon">📁</div><p>${projects.length?'No projects match your search or filters.':'No projects yet. Click <strong>+ New Project</strong> to get started.'}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p=>{
    const sfM=sfProjectMoney(p); const contract=sfM.contract; const invoiced=sfM.invoiced; const received=sfM.received; const pending=sfM.outstanding; const remainingToInvoice=sfM.toInvoice;
    const statusColor = {active:'active',completed:'completed',hold:'hold'}[p.status]||'active';
    const statusLabel = {active:'Active',completed:'Completed',hold:'On Hold'}[p.status]||'Active';

    const poHTML = p.pos.length
      ? p.pos.map((raw,poIndex)=>{const po=sfPoRecord(raw),meta=sfPoMeta(po);return `<div class="proj-po-item" style="flex-wrap:wrap">📄 <span>${escHtml(po.number||'—')}</span>${meta?`<span style="color:var(--gray-500);font-size:11px">${escHtml(meta)}</span>`:''}${po.file?`<button type="button" class="po-file-btn" style="margin-left:auto" onclick="sfOpenProjectPo('${p.id}',${poIndex})">📎 Open PO</button>`:''}</div>`}).join('')
      : '<div style="font-size:11px;color:var(--gray-400)">No POs added</div>';

    const payHTML = p.payments.length
      ? p.payments.map(rawPay=>{const pay=sfNormalizePaymentRecord(rawPay),received=paymentReceivedAmount(pay),balance=paymentRemainingAmount(pay);return`
          <div class="proj-pay-item" style="display:flex;align-items:center;gap:7px;font-size:11.5px;background:var(--gray-100);border-radius:5px;padding:6px 8px;flex-wrap:wrap">
            <span style="flex:1;min-width:150px">${escHtml(pay.label)}</span><span style="font-weight:600">Invoice ${fmtSAR(pay.amount)}</span>
            ${received>0?`<span style="color:#15803d;font-size:11px">Received ${fmtSAR(received)}</span>`:''}${balance>0?`<span style="color:#b45309;font-size:11px">Balance ${fmtSAR(balance)}</span>`:''}
            <span class="pay-badge ${escHtml(pay.status)}">${escHtml(pay.status)}</span>${pay.sourceProformaId?invoiceStatusActionHtml(p.id,pay.sourceProformaId,pay.status):''}
            ${(pay.receipts||[]).length?`<div style="flex-basis:100%;padding-left:8px;color:var(--gray-500);font-size:11px">${pay.receipts.map(r=>`${escHtml(r.date||'')} · ${fmtSAR(r.amount)}${r.reference?' · '+escHtml(r.reference):''}`).join('<br>')}</div>`:''}
          </div>`}).join('')
      : '<div style="font-size:11px;color:var(--gray-400)">No installments added</div>';

    const docHTML = p.docs.length
      ? p.docs.map((d,di)=>`<div class="proj-doc-item">📎 <button type="button" onclick="openProjectDocument('${p.id}',${di})" style="background:none;border:none;padding:0;color:var(--orange);cursor:pointer;font:inherit;text-align:left;flex:1">${escHtml(d.name)}</button>${d.fromQuoteNumber?` <span style="color:var(--gray-400);font-size:11px">(from ${escHtml(d.fromQuoteNumber)})</span>`:''}</div>`).join('')
      : '<div style="font-size:11px;color:var(--gray-400)">No documents attached</div>';

    const quotesHTML = (p.quotes||[]).length
      ? p.quotes.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(qe=>`
          <div style="display:flex;align-items:center;gap:7px;font-size:11.5px;background:var(--gray-100);border-radius:5px;padding:5px 8px">
            <span class="pay-badge ${qe.type==='invoice'?'paid':'pending'}" style="text-transform:uppercase">${qe.type==='invoice'?'Invoice':'Quote'}</span>
            <span style="flex:1">${escHtml(qe.number)}</span>
            <span style="color:var(--gray-500);font-size:11px">${escHtml(qe.date||'')}</span>
            <span style="font-weight:600">${fmtSAR(qe.total)}</span>
            <button onclick="previewSavedQuotation('${qe.id}')" style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:11px;font-weight:600">View</button>
          </div>`).join('')
      : '<div style="font-size:11px;color:var(--gray-400)">No quotations linked yet — use "Add as Project" on a saved quotation to link it here.</div>';

    const proformaHTML = (p.proformas||[]).length
      ? p.proformas.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(pe=>{
          const payment=(p.payments||[]).find(x=>x.sourceProformaId===pe.id);
          const status=payment?.status||'pending';
          return `
          <div style="display:flex;align-items:center;gap:7px;font-size:11.5px;background:var(--gray-100);border-radius:5px;padding:5px 8px;flex-wrap:wrap">
            <span class="pay-badge ${escHtml(status)}" style="text-transform:uppercase">${escHtml(status)}</span>
            <span style="flex:1;min-width:120px">${escHtml(pe.number)}</span>
            <span style="color:var(--gray-500);font-size:11px">${escHtml(pe.date||'')}</span>
            <span style="color:var(--gray-500);font-size:11px">${escHtml(pe.basis||'')}</span>
            <span style="font-weight:600">${fmtSAR(pe.total)}</span>
            ${invoiceStatusActionHtml(p.id,pe.id,status)}
            <button onclick="previewProforma('${pe.id}')" style="background:none;border:none;color:var(--orange);cursor:pointer;font-size:11px;font-weight:600">View</button>
          </div>`;
        }).join('')
      : '<div style="font-size:11px;color:var(--gray-400)">No Proforma Invoices linked yet.</div>';

    const commHTML = (p.commissions||[]).length
      ? p.commissions.map(c=>`
          <div style="display:flex;align-items:center;gap:7px;font-size:11.5px;background:var(--gray-100);border-radius:5px;padding:5px 8px">
            <span style="flex:1">${escHtml(c.label||'Commission')}${c.notes?` <span style="color:var(--gray-400)">— ${escHtml(c.notes)}</span>`:''}</span>
            ${c.pct?`<span style="color:var(--gray-500);font-size:11px">${parseFloat(c.pct)||0}%</span>`:''}
            <span style="font-weight:600;color:#f59e0b">${fmtSAR(c.amount)}</span>
          </div>`).join('')
      : '';

    const totalComm = projTotalCommission(p);
    const estimatedInternalCost=parseFloat(p.estimatedInternalCost)||0;
    const expectedProjectProfit=sfProjectFinance(p).expectedProfit;
    const assignedEngineerCount=(p.assignedEngineers||[]).length;

    return `<div class="proj-card" data-project-id="${escHtml(p.id)}">
      <div class="proj-card-hdr">
        <div class="proj-name">${escHtml(p.name)}</div>
        <span class="proj-status ${statusColor}">${statusLabel}</span>
      </div>
      <div class="proj-card-body">
        ${p.client?`<div style="font-size:11px;color:var(--gray-500);margin-bottom:8px">🏢 ${escHtml(p.client)}${p.start?' &nbsp;·&nbsp; 📅 '+escHtml(p.start):''}</div>`:''}
        <div class="proj-fin-row" style="grid-template-columns:repeat(2,1fr)">
          <div class="proj-fin-box"><div class="pfb-label">Contract</div><div class="pfb-value">${fmtSAR(contract)}</div></div>
          <div class="proj-fin-box"><div class="pfb-label">Invoiced</div><div class="pfb-value" style="color:var(--navy-mid)">${fmtSAR(invoiced)}</div></div>
          <div class="proj-fin-box"><div class="pfb-label">Received</div><div class="pfb-value green">${fmtSAR(received)}</div></div>
          <div class="proj-fin-box"><div class="pfb-label">Outstanding</div><div class="pfb-value red">${fmtSAR(pending)}</div></div>
          <div class="proj-fin-box" style="grid-column:1/-1"><div class="pfb-label">Remaining to Invoice</div><div class="pfb-value">${fmtSAR(remainingToInvoice)}</div></div>
        </div>
        ${sfHasAccess('payroll')&&estimatedInternalCost?`<div class="project-cost-strip"><div><small>Estimated Cost</small><strong>${fmtSAR(estimatedInternalCost)}</strong></div><div><small>Expected Profit before VAT</small><strong style="color:${expectedProjectProfit>=0?'#15803d':'#b91c1c'}">${fmtSAR(expectedProjectProfit)}</strong></div>${sfHasAccess('engineers')?`<div><small>Assigned Engineers</small><strong>${assignedEngineerCount}</strong></div>`:''}</div>`:''}
        ${totalComm?`<div class="proj-fin-row" style="grid-template-columns:1fr">
          <div class="proj-fin-box"><div class="pfb-label">Total Commission (عمولة)</div><div class="pfb-value" style="color:#f59e0b">${fmtSAR(totalComm)}</div></div>
        </div>`:''}
        <div class="proj-section-lbl">Commission (عمولة)</div>
        <div class="proj-comm-list">
          ${p.commissionAmount?`<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;background:var(--gray-100);border-radius:5px;padding:5px 8px">
            <span style="flex:1">Auto (from linked quotation)</span>
            <span style="color:var(--gray-500);font-size:11px">${parseFloat(p.commissionPct)||0}%</span>
            <span style="font-weight:600;color:#f59e0b">${fmtSAR(p.commissionAmount)}</span>
          </div>`:''}
          ${commHTML}
          ${(!p.commissionAmount && !(p.commissions||[]).length)?'<div style="font-size:11px;color:var(--gray-400)">No commission added yet — click Edit to add one.</div>':''}
        </div>
        <div class="proj-section-lbl">Linked Quotations &amp; Legacy Invoices</div>
        <div class="proj-quotes-list">${quotesHTML}</div>
        <div class="proj-section-lbl">Invoices &amp; Collection Status</div>
        <div class="proj-quotes-list">${proformaHTML}</div>
        <div class="proj-section-lbl">Purchase Orders</div>
        <div class="proj-po-list">${poHTML}</div>
        <div class="proj-section-lbl">Payment Installments</div>
        <div class="proj-pay-list">${payHTML}</div>
        <div class="proj-section-lbl">Documents</div>
        <div class="proj-doc-list">${docHTML}</div>
        ${p.notes?`<div style="margin-top:8px;font-size:11px;color:var(--gray-600);font-style:italic">${escHtml(p.notes)}</div>`:''}
      </div>
      <div class="proj-card-actions">
        <button class="btn-proj-edit" onclick="openProjectDetails('${p.id}')">↗ Open Project</button>
        <button class="btn-proj-invoice" onclick="openProformaFromProject('${p.id}')">🧾 New Invoice</button>
        <button class="btn-proj-edit" onclick="openProjModal('${p.id}')">✏ Edit</button>
        ${sfMoreMenu([`<button type="button" class="sf-more-item danger" onclick="deleteProject('${p.id}')">Delete project…</button>`])}
      </div>
    </div>`;
  }).join('');
}
function openProjectDetails(projectId){
  const p=projects.find(x=>x.id===projectId);if(!p)return;
  sfActiveProjectDetailsId=projectId;sfProjectDetailsPanel='overview';
  showTab('projectdetails',null);renderProjectDetails();
}
function closeProjectDetails(){sfActiveProjectDetailsId='';showTab('projects',document.querySelector('.side-nav-btn[data-module="projects"]'));}
function setProjectDetailsPanel(panel){
  if((panel==='engineers'&&!sfHasAccess('engineers'))||(['payroll','profitability'].includes(panel)&&!sfHasAccess('payroll'))){
    alert('Your account does not have access to Engineers or Payroll / Salaries.');
    sfProjectDetailsPanel='overview';
  }else sfProjectDetailsPanel=panel;
  renderProjectDetails();
}
function pdDate(v){if(!v)return '—';try{return new Date(v+'T00:00:00').toLocaleDateString('en-GB')}catch{return v}}
function pdStatusBadge(status){const s=String(status||'pending').toLowerCase();return `<span class="pay-badge ${escHtml(s)}">${escHtml(s)}</span>`}
function projectActualExpenseTotal(p){
  return (p.actualExpenses||[]).reduce((a,x)=>a+sfNum(x.amount),0);
}
function projectReceivedTotal(p){return (p.payments||[]).reduce((a,x)=>a+paymentReceivedAmount(sfNormalizePaymentRecord(x)),0)}
function projectDetailsTabs(){
  const tabs=[['overview','Overview'],['commercial','Quotations & PO'],['invoices','Invoices & Payments'],['engineers','Engineers'],['payroll','Payroll'],['expenses','Expenses'],['documents','Documents'],['profitability','Profitability']];
  const visible=tabs.filter(([k])=>(k!=='engineers'||sfHasAccess('engineers'))&&(!['payroll','profitability'].includes(k)||sfHasAccess('payroll')));
  return `<div class="pd-tabs">${visible.map(([k,l])=>`<button class="pd-tab ${sfProjectDetailsPanel===k?'active':''}" onclick="setProjectDetailsPanel('${k}')">${l}</button>`).join('')}</div>`;
}
function renderProjectDetails(){
  const root=document.getElementById('project-details-root');if(!root)return;
  const p=projects.find(x=>x.id===sfActiveProjectDetailsId);
  if(!p){root.innerHTML='<div class="pd-empty">Project not found.</div>';return;}
  const invoices=projectInvoiceRecords(p),payroll=projectPayrollRecords(p),contract=sfNum(p.contract),sfM=sfProjectMoney(p),invoiced=sfM.invoiced,received=sfM.received,outstanding=sfM.outstanding,remaining=sfM.toInvoice,fin=sfProjectFinance(p),estimated=fin.estimated,actual=fin.actual,commission=fin.commission,expectedProfit=fin.expectedProfit,actualProfit=fin.cashProfit;
  const newInvoiceBtn=document.getElementById('pd-new-invoice-btn');if(newInvoiceBtn)newInvoiceBtn.onclick=()=>openProformaFromProject(p.id);
  const editBtn=document.getElementById('pd-edit-project-btn');if(editBtn)editBtn.onclick=()=>openProjModal(p.id);
  root.innerHTML=`
    <div class="pd-hero"><div class="pd-hero-top"><div><h2 class="pd-title">${escHtml(p.name||'Untitled Project')}</h2><div class="pd-sub">${escHtml(p.client||'No client')} · Started ${escHtml(pdDate(p.start))}</div></div><span class="pd-status">${escHtml(p.status||'active')}</span></div>
    <div class="pd-kpis"><div class="pd-kpi"><small>Contract</small><strong>${fmtSAR(contract)}</strong><span class="pd-kpi-note">Incl. VAT</span></div><div class="pd-kpi"><small>Invoiced</small><strong>${fmtSAR(invoiced)}</strong><span class="pd-kpi-note">Incl. VAT</span></div><div class="pd-kpi"><small>Received</small><strong>${fmtSAR(received)}</strong><span class="pd-kpi-note">Incl. VAT</span></div><div class="pd-kpi"><small>Outstanding</small><strong>${fmtSAR(outstanding)}</strong><span class="pd-kpi-note">Incl. VAT</span></div>${sfHasAccess('payroll')?`<div class="pd-kpi"><small>Actual Cost</small><strong>${fmtSAR(actual)}</strong><span class="pd-kpi-note">Before VAT</span></div><div class="pd-kpi"><small>Cash Profit before VAT</small><strong>${fmtSAR(actualProfit)}</strong></div>`:`<div class="pd-kpi"><small>Non-Payroll Expenses</small><strong>${fmtSAR(actual)}</strong><span class="pd-kpi-note">Before VAT</span></div>`}</div></div>
    ${projectDetailsTabs()}${renderProjectDetailsPanel(p,{invoices,payroll,contract,invoiced,received,outstanding,remaining,estimated,actual,commission,expectedProfit,actualProfit,fin})}`;
}
function renderProjectDetailsPanel(p,m){
  const empty=t=>`<div class="pd-empty">${t}</div>`;
  if(sfProjectDetailsPanel==='overview')return `<div class="pd-panel active"><div class="pd-grid">
    <div class="pd-card"><div class="pd-card-hdr"><h3>Project Information</h3></div><div class="pd-card-body"><dl class="pd-info"><dt>Project Name</dt><dd>${escHtml(p.name||'—')}</dd><dt>Client</dt><dd>${escHtml(p.client||'—')}</dd><dt>Status</dt><dd>${escHtml(p.status||'active')}</dd><dt>Start Date</dt><dd>${escHtml(pdDate(p.start))}</dd><dt>Contract Value</dt><dd>${fmtSAR(m.contract)}</dd><dt>Last Updated</dt><dd>${escHtml(p.updatedAt?new Date(p.updatedAt).toLocaleString():'—')}</dd></dl></div></div>
    <div class="pd-card"><div class="pd-card-hdr"><h3>Workspace Summary</h3></div><div class="pd-card-body"><dl class="pd-info"><dt>Quotations</dt><dd>${(p.quotes||[]).length}</dd><dt>Invoices</dt><dd>${m.invoices.length}</dd><dt>Purchase Orders</dt><dd>${(p.pos||[]).length}</dd>${sfHasAccess('engineers')?`<dt>Assigned Engineers</dt><dd>${(p.assignedEngineers||[]).length}</dd>`:''}${sfHasAccess('payroll')?`<dt>Payroll Sheets</dt><dd>${m.payroll.length}</dd>`:''}<dt>Documents</dt><dd>${(p.docs||[]).length}</dd></dl></div></div>
    <div class="pd-card full"><div class="pd-card-hdr"><h3>Notes</h3></div><div class="pd-card-body">${p.notes?`<div style="white-space:pre-wrap;font-size:12px;line-height:1.65">${escHtml(p.notes)}</div>`:empty('No project notes recorded.')}</div></div></div></div>`;
  if(sfProjectDetailsPanel==='commercial'){
    const qs=(p.quotes||[]).map(q=>`<tr><td>${escHtml(q.number||'—')}</td><td>${escHtml(q.type||'Quotation')}</td><td>${escHtml(pdDate(q.date))}</td><td>${fmtSAR(q.total||0)}</td><td><button class="btn-sm" onclick="showTab('quotes',document.querySelector('.side-nav-btn[data-module=quotes]'))">Open Register</button></td></tr>`).join('');
    const poList=(p.pos||[]).map(sfPoRecord),poTotal=poList.reduce((s,x)=>s+x.amount,0);
    const pos=poList.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${escHtml(x.number||'—')}</strong></td><td>${escHtml(x.date?pdDate(x.date):'—')}</td><td>${x.amount?fmtSAR(x.amount):'—'}</td><td>${x.file?`<button class="pd-doc-btn" onclick="sfOpenProjectPo('${p.id}',${i})">📎 ${escHtml(x.file.name||'Open PO')}</button>`:'<span style="color:var(--gray-400)">No file attached</span>'}</td></tr>`).join('')+(poTotal?`<tr><td></td><td colspan="2"><strong>Total PO value</strong></td><td><strong>${fmtSAR(poTotal)}</strong></td><td></td></tr>`:'');
    return `<div class="pd-panel active"><div class="pd-grid"><div class="pd-card full"><div class="pd-card-hdr"><h3>Linked Quotations</h3></div><div class="pd-card-body">${qs?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Number</th><th>Type</th><th>Date</th><th>Total</th><th></th></tr></thead><tbody>${qs}</tbody></table></div>`:empty('No linked quotations.')}</div></div><div class="pd-card full"><div class="pd-card-hdr"><h3>Purchase Orders</h3><button class="btn-sm" onclick="openProjModal('${p.id}')">Add / Attach PO</button></div><div class="pd-card-body">${pos?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>#</th><th>PO Number</th><th>Date</th><th>Value</th><th>File</th></tr></thead><tbody>${pos}</tbody></table></div>`:empty('No purchase orders recorded. Use Add / Attach PO to add the PO number and its file.')}</div></div></div></div>`;
  }
  if(sfProjectDetailsPanel==='invoices'){
    const rows=m.invoices.map(pi=>{const pay=(p.payments||[]).find(x=>x.sourceProformaId===pi.id),n=sfNormalizePaymentRecord(pay||{amount:(pi.totals||{}).grandTotal||0}),r=paymentReceivedAmount(n),b=paymentRemainingAmount(n);return `<tr><td>${escHtml(pi.number||'—')}</td><td>${escHtml(pdDate(pi.issueDate))}</td><td>${escHtml(proformaBasisLabel(pi))}</td><td>${fmtSAR(n.amount)}</td><td>${fmtSAR(r)}</td><td>${fmtSAR(b)}</td><td>${pdStatusBadge(n.status)}</td><td><button class="btn-sm" onclick="previewProforma('${pi.id}')">Preview</button></td></tr>`}).join('');
    const receipts=(p.payments||[]).flatMap(pay=>(sfNormalizePaymentRecord(pay).receipts||[]).map(r=>({...r,invoice:pay.label}))).map(r=>`<tr><td>${escHtml(r.invoice||'')}</td><td>${escHtml(pdDate(r.date))}</td><td>${fmtSAR(r.amount)}</td><td>${escHtml(r.method||'')}</td><td>${escHtml(r.reference||'—')}</td></tr>`).join('');
    return `<div class="pd-panel active"><div class="pd-grid"><div class="pd-card full"><div class="pd-card-hdr"><h3>Invoices</h3><button class="btn-primary" style="padding:6px 10px;font-size:11px" onclick="openProformaFromProject('${p.id}')">+ New Invoice</button></div><div class="pd-card-body">${rows?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Invoice</th><th>Date</th><th>Basis</th><th>Total</th><th>Received</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:empty('No invoices issued for this project.')}</div></div><div class="pd-card full"><div class="pd-card-hdr"><h3>Receipt History</h3></div><div class="pd-card-body">${receipts?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead><tbody>${receipts}</tbody></table></div>`:empty('No payments received yet.')}</div></div></div></div>`;
  }
  if(sfProjectDetailsPanel==='engineers'){
    const rows=(p.assignedEngineers||[]).map((a,i)=>{const e=sfEngineers.find(x=>x.id===a.engineerId)||{};return `<tr><td>${i+1}</td><td>${escHtml(a.name||e.name||'—')}</td><td>${escHtml(e.specialization||e.profession||'—')}</td><td>${escHtml(e.loa||'—')}</td><td>${escHtml(e.status||'—')}</td><td>${escHtml(a.basis||'—')}</td><td>${sfNum(a.duration)||'—'}</td><td>${fmtSAR(a.rate||0)}</td></tr>`}).join('');
    return `<div class="pd-panel active"><div class="pd-card"><div class="pd-card-hdr"><h3>Assigned Engineers</h3></div><div class="pd-card-body">${rows?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>#</th><th>Name</th><th>Position</th><th>LOA</th><th>Status</th><th>Basis</th><th>Duration</th><th>Rate</th></tr></thead><tbody>${rows}</tbody></table></div>`:empty('No engineers assigned through the quotation cost plan.')}</div></div></div>`;
  }
  if(sfProjectDetailsPanel==='payroll'){
    const rows=m.payroll.map(s=>{const total=(s.rows||[]).reduce((a,r)=>a+payrollCalcStandalone(r,s.standardDays).net,0);return `<tr><td>${escHtml(s.month||'—')}</td><td>${(s.rows||[]).length}</td><td>${fmtSAR(total)}</td><td>${escHtml(s.status||'draft')}</td><td><button class="btn-sm" onclick="payrollLoadSheet('${s.id}');showTab('payroll',document.querySelector('.side-nav-btn[data-module=payroll]'))">Open</button></td></tr>`}).join('');
    return `<div class="pd-panel active"><div class="pd-card"><div class="pd-card-hdr"><h3>Monthly Payroll Sheets</h3><button class="btn-sm" onclick="showTab('payroll',document.querySelector('.side-nav-btn[data-module=payroll]'))">Open Payroll Module</button></div><div class="pd-card-body">${rows?`<table class="pd-table"><thead><tr><th>Month</th><th>Employees</th><th>Net Payroll</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:empty('No monthly timesheets linked to this project.')}</div></div></div>`;
  }
  if(sfProjectDetailsPanel==='expenses'){
    const rows=(p.actualExpenses||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${escHtml(sfExpenseDateLabel(x))}</td><td>${escHtml(sfExpenseCategoryLabel(x))}</td><td>${escHtml(x.description||'')}</td><td>${fmtSAR(x.amount||0)}</td></tr>`).join('');
    return `<div class="pd-panel active"><div class="pd-card"><div class="pd-card-hdr"><h3>Actual Expenses</h3><strong>${fmtSAR(m.actual)}</strong></div><div class="pd-card-body">${rows?`<div class="pd-table-wrap"><table class="pd-table"><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></div>`:empty('No actual expenses recorded.')}</div></div></div>`;
  }
  if(sfProjectDetailsPanel==='documents'){
    const rows=(p.docs||[]).map((d,i)=>`<tr><td>${i+1}</td><td><button class="pd-doc-btn" onclick="openProjectDocument('${p.id}',${i})">${escHtml(d.name||'Document')}</button></td><td>${escHtml(d.type||d.mimeType||'file')}</td><td>${escHtml(d.uploadedAt?new Date(d.uploadedAt).toLocaleString():'—')}</td></tr>`).join('');
    return `<div class="pd-panel active"><div class="pd-card"><div class="pd-card-hdr"><h3>Project Documents</h3><button class="btn-sm" onclick="openProjModal('${p.id}')">Upload / Manage</button></div><div class="pd-card-body">${rows?`<table class="pd-table"><thead><tr><th>#</th><th>Document</th><th>Type</th><th>Uploaded</th></tr></thead><tbody>${rows}</tbody></table>`:empty('No project documents uploaded.')}</div></div></div>`;
  }
  const f=m.fin||sfProjectFinance(p),pct=v=>(Math.round(v*10)/10).toFixed(1)+'%',red=true;
  const costingFrom=typeof SF_ATTENDANCE_COSTING_FROM==='string'?SF_ATTENDANCE_COSTING_FROM:'',start=sfIsoDate(p.start),partial=!!(costingFrom&&start&&start.slice(0,7)<costingFrom);
  const kpi=(label,value,note,alert)=>`<div class="pd-kpi${alert?' is-alert':''}"><small>${label}</small><strong${alert?' class="tone-alert"':''}>${value}</strong>${note?`<span class="pd-kpi-note">${note}</span>`:''}</div>`;
  return `<div class="pd-panel active"><div class="pd-grid"><div class="pd-card full"><div class="pd-card-hdr"><h3>Profitability Summary</h3><span class="pd-hdr-note">All figures before VAT / كل الأرقام قبل الضريبة</span></div><div class="pd-card-body"><div class="pd-kpis" style="margin-top:0">
    ${kpi('Contract before VAT',fmtSAR(f.contractNet),`Incl. VAT ${fmtSAR(f.contract)} (VAT ${f.vat}%)`)}
    ${kpi('Estimated Cost',f.estimated?fmtSAR(f.estimated):'—',f.estimated?'Quotation cost plan':'No cost plan saved')}
    ${kpi('Actual Cost',fmtSAR(f.actual),f.costUsedPct==null?'':`${pct(f.costUsedPct)} of estimate`,f.costUsedPct>100?red:'')}
    ${kpi('Commission',fmtSAR(f.commission),'On the amount before VAT')}
    ${f.hasEstimate?kpi('Expected Profit',fmtSAR(f.expectedProfit),f.expectedMargin==null?'':`Margin ${pct(f.expectedMargin)}${f.costOverEstimate?' · on actual cost':''}`,f.expectedProfit<0?red:''):kpi('Expected Profit','—','Needs a cost estimate')}
    ${kpi('Cash Profit',fmtSAR(f.cashProfit),`Received before VAT ${fmtSAR(f.receivedNet)}`,f.cashProfit<0?red:'')}
  </div>
  <p class="pd-fin-note">The VAT in the contract and in receipts (${fmtSAR(f.contract-f.contractNet)} on this contract) is owed to ZATCA, so it is not counted as profit. <b>Expected Profit</b> = contract before VAT − expected cost − commission, where the expected cost is the larger of the estimated and the actual cost. <b>Cash Profit</b> = received before VAT − actual cost − commission; it is cash-based, not an accrual-accounting profit.</p>
  ${partial?`<p class="pd-fin-warn">Labour cost from attendance (salary days, site allowance, overtime) is included only from ${escHtml(costingFrom)}. This project started on ${escHtml(start)}, so earlier labour cost is missing and Cash Profit appears higher than it really is.</p>`:''}
  ${!f.hasEstimate?`<p class="pd-fin-warn">No cost estimate is saved, so Expected Profit cannot be calculated. With the cost so far, the most this project can make is <b>${fmtSAR(f.profitCeiling)}</b> (contract before VAT − actual cost to date − commission), and this falls as more costs are added. Add the cost estimate in the quotation cost plan.</p>`:''}${f.costOverEstimate?`<p class="pd-fin-warn">The actual cost (${fmtSAR(f.actual)}) already exceeds the estimate (${fmtSAR(f.estimated)}), so Expected Profit uses the actual cost.</p>`:''}
  </div></div></div></div>`;
}
function openProjectDocument(projectId,index){const p=projects.find(x=>x.id===projectId);if(p)sfOpenDocumentRecord((p.docs||[])[index])}
function openProjModal(id){
  pmTempPOs=[]; pmTempPays=[]; pmTempDocs=[]; pmTempComms=[];
  const p = id ? projects.find(x=>x.id===id) : null;
  document.getElementById('pm-id').value = id||'';
  document.getElementById('pm-name').value = p?p.name:'';
  document.getElementById('pm-client').value = p?p.client:'';
  document.getElementById('pm-status').value = p?p.status:'active';
  document.getElementById('pm-contract').value = p?p.contract:'';
  document.getElementById('pm-start').value = p?p.start:'';
  document.getElementById('pm-commission-pct').value = p?(p.commissionPct||0):0;
  document.getElementById('pm-vat').value = p?sfProjectVatPct(p):15;
  document.getElementById('pm-commission-amt').value = p?(p.commissionAmount||0):0;
  document.getElementById('pm-notes').value = p?p.notes:'';
  document.getElementById('proj-modal-title').textContent = id?'Edit Project':'New Project';
  if(p){ pmTempPOs=[...p.pos]; pmTempPays=p.payments.map(x=>({...x})); pmTempDocs=p.docs.map(x=>({...x})); pmTempComms=(p.commissions||[]).map(x=>({...x})); }
  renderPmLists();pmShowContractNet();
  ['pm-po-input','pm-po-date','pm-po-amount','pm-po-file'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''}); // never carry a PO from the previous projectdelete document.getElementById('pm-commission-amt').dataset.auto;
  document.getElementById('proj-modal-overlay').classList.add('open');
}

function closeProjModal(){ document.getElementById('proj-modal-overlay').classList.remove('open'); }
function pmContractNet(){
  const contract=parseFloat(document.getElementById('pm-contract').value)||0,vatRaw=parseFloat(document.getElementById('pm-vat').value),vat=Number.isFinite(vatRaw)&&vatRaw>=0&&vatRaw<100?vatRaw:15;
  return contract/(1+vat/100);
}
function pmShowContractNet(){const el=document.getElementById('pm-contract-net');if(el)el.textContent=(parseFloat(document.getElementById('pm-contract').value)||0)?'Before VAT: '+fmtSAR(pmContractNet()):''}
function pmRecalcCommission(){
  const pct=parseFloat(document.getElementById('pm-commission-pct').value)||0,amt=document.getElementById('pm-commission-amt');
  amt.value=(pmContractNet()*pct/100).toFixed(2);amt.dataset.auto=amt.value;
}
// Contract or VAT changed: refresh the before-VAT hint, and the commission only while it still follows the %.
function pmContractChanged(){
  pmShowContractNet();
  const pct=parseFloat(document.getElementById('pm-commission-pct').value)||0,amt=document.getElementById('pm-commission-amt');
  if(pct>0&&(amt.value===amt.dataset.auto||!(parseFloat(amt.value)>0)))pmRecalcCommission();
}
function pmSuggestCommAmount(){
  const pct=parseFloat(document.getElementById('pm-comm-pct').value)||0;
  if(pct) document.getElementById('pm-comm-amount').value = (pmContractNet()*pct/100).toFixed(2);
}
function renderPmLists(){
  document.getElementById('pm-po-list').innerHTML=pmTempPOs.map((raw,i)=>{const po=sfPoRecord(raw),meta=sfPoMeta(po);return`
    <div class="proj-po-item" style="flex-wrap:wrap">📄 <span style="font-weight:600">${escHtml(po.number||'—')}</span>${meta?`<span style="color:var(--gray-500);font-size:11px">${escHtml(meta)}</span>`:''}
      ${po.file?`<button type="button" class="po-file-btn" onclick="openPmPoFile(${i})">📎 ${escHtml(po.file.name||'PO file')}</button><label class="po-file-btn po-attach">Replace<input type="file" accept="application/pdf,image/*" hidden onchange="sfPmAttachPoFile(${i},this)"></label>`:`<label class="po-file-btn po-attach">📎 Attach file<input type="file" accept="application/pdf,image/*" hidden onchange="sfPmAttachPoFile(${i},this)"></label>`}
      <button onclick="pmTempPOs.splice(${i},1);renderPmLists()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;margin-left:auto" aria-label="Remove PO">×</button></div>`}).join('');
  document.getElementById('pm-comm-list').innerHTML=pmTempComms.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:6px;background:var(--gray-100);border-radius:5px;padding:5px 8px;font-size:11.5px">
      <span style="flex:1">${escHtml(c.label)}${c.notes?` <span style="color:var(--gray-500)">— ${escHtml(c.notes)}</span>`:''}</span>${c.pct?`<span style="color:var(--gray-500);font-size:11px">${parseFloat(c.pct)||0}%</span>`:''}
      <span style="font-weight:600;color:#f59e0b">${fmtSAR(c.amount)}</span><button onclick="pmTempComms.splice(${i},1);renderPmLists()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px">×</button>
    </div>`).join('');
  document.getElementById('pm-pay-list').innerHTML=pmTempPays.map((rawPay,i)=>{const pay=sfNormalizePaymentRecord(rawPay),received=paymentReceivedAmount(pay),balance=paymentRemainingAmount(pay);return`
    <div style="display:flex;align-items:center;gap:6px;background:var(--gray-100);border-radius:5px;padding:5px 8px;font-size:11.5px;flex-wrap:wrap">
      <span style="flex:1">${escHtml(pay.label)}</span><span style="font-weight:600">${fmtSAR(pay.amount)}</span>${received?`<span style="font-size:11px;color:#15803d">Received ${fmtSAR(received)}</span>`:''}${balance?`<span style="font-size:11px;color:#b45309">Balance ${fmtSAR(balance)}</span>`:''}
      <span class="pay-badge ${escHtml(pay.status)}">${escHtml(pay.status)}</span>${pay.sourceProformaId?(pay.status==='paid'?`<button type="button" class="pay-undo-link" onclick="pmTogglePaymentStatus(${i})">Mark as not paid…</button>`:`<button class="pay-action-btn mark-paid" onclick="pmTogglePaymentStatus(${i})">＋ Record Payment</button>`):''}
      <button onclick="pmTempPays.splice(${i},1);renderPmLists()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px">×</button>
    </div>`}).join('');
  document.getElementById('pm-doc-list').innerHTML=pmTempDocs.map((d,i)=>`
    <div class="proj-doc-item">📎 <button type="button" onclick="openPmDocument(${i})" style="background:none;border:none;padding:0;color:var(--orange);cursor:pointer;font:inherit;text-align:left;flex:1">${escHtml(d.name)}</button>
      <button onclick="removePmDocument(${i})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;margin-left:auto">×</button></div>`).join('');
}
function openPmDocument(i){sfOpenDocumentRecord(pmTempDocs[i])}
// ── Purchase orders: number, date, optional value and an attached file ──────────
// Older POs were saved as plain text; they are read as {number} and can get a file later.
function sfPoRecord(po){
  if(po&&typeof po==='object')return{...po,id:po.id||'',number:String(po.number??po.label??'').trim(),date:po.date||'',amount:sfNum(po.amount),file:po.file&&(po.file.storagePath||po.file.url)?po.file:null};
  return{id:'',number:String(po??'').trim(),date:'',amount:0,file:null};
}
function sfPoMeta(po){return[po.date?pdDate(po.date):'',po.amount?fmtSAR(po.amount):''].filter(Boolean).join(' · ')}
function sfPoFileAllowed(file){return /^(application\/pdf|image\/)/i.test(file?.type||'')||/\.(pdf|png|jpe?g|webp|heic|gif)$/i.test(file?.name||'')}
async function sfPmAddPo(){
  const num=document.getElementById('pm-po-input'),date=document.getElementById('pm-po-date'),amount=document.getElementById('pm-po-amount'),fileInput=document.getElementById('pm-po-file'),btn=document.getElementById('pm-po-add-btn');
  const number=num.value.trim();
  if(!number){alert('Enter the PO number first. / اكتب رقم أمر الشراء أولًا.');num.focus();return}
  const file=fileInput?.files?.[0]||null;let stored=null;
  if(file){
    if(btn)btn.disabled=true;
    try{stored=await sfUploadPoFile(file)}
    catch(error){console.error('PO upload failed',error);alert('The PO file could not be uploaded, so the PO was not added.\n'+(error?.message||error));setCloudStatus('error','Upload failed');return}
    finally{if(btn)btn.disabled=false}
  }
  pmTempPOs.push({id:'po_'+Date.now()+'_'+Math.floor(Math.random()*1000),number,date:date.value||'',amount:Math.max(0,parseFloat(amount.value)||0),file:stored,addedAt:new Date().toISOString()});
  num.value='';date.value='';amount.value='';if(fileInput)fileInput.value='';
  renderPmLists();
}
async function sfPmAttachPoFile(i,input){
  const file=input?.files?.[0];if(!file||!pmTempPOs[i])return;
  input.disabled=true;
  try{const stored=await sfUploadPoFile(file),po=sfPoRecord(pmTempPOs[i]);pmTempPOs[i]={...po,id:po.id||('po_'+Date.now()),file:stored};renderPmLists()}
  catch(error){console.error('PO upload failed',error);alert('The PO file could not be uploaded.\n'+(error?.message||error));setCloudStatus('error','Upload failed')}
  finally{input.disabled=false;input.value=''}
}
function openPmPoFile(i){const po=sfPoRecord(pmTempPOs[i]);if(po.file)sfOpenDocumentRecord(po.file)}
function sfOpenProjectPo(projectId,i){const p=projects.find(x=>String(x.id)===String(projectId)),po=p?sfPoRecord((p.pos||[])[i]):null;if(po?.file)sfOpenDocumentRecord(po.file);else alert('No file is attached to this PO.')}
function removePmDocument(i){if(!pmTempDocs[i])return;pmTempDocs.splice(i,1);renderPmLists()}

function addProjItem(type){
  if(type==='po'){ void sfPmAddPo(); return; } else if(type==='comm'){
    const label=document.getElementById('pm-comm-label').value.trim();
    const pct=document.getElementById('pm-comm-pct').value;
    const amount=document.getElementById('pm-comm-amount').value;
    const notes=document.getElementById('pm-comm-notes').value.trim();
    if(!label||!amount){alert('Please enter a label and an amount (or a % to auto-suggest one) for the commission.');return;}
    pmTempComms.push({label, pct:parseFloat(pct)||0, amount:parseFloat(amount)||0, notes});
    document.getElementById('pm-comm-label').value='';
    document.getElementById('pm-comm-pct').value='';
    document.getElementById('pm-comm-amount').value='';
    document.getElementById('pm-comm-notes').value='';
  } else if(type==='pay'){
    const label=document.getElementById('pm-pay-label').value.trim();
    const amount=document.getElementById('pm-pay-amount').value;
    const date=document.getElementById('pm-pay-date').value;
    const status=document.getElementById('pm-pay-status').value;
    if(!label||!amount)return;
    pmTempPays.push({label,amount:parseFloat(amount),date,status});
    document.getElementById('pm-pay-label').value='';
    document.getElementById('pm-pay-amount').value='';
    document.getElementById('pm-pay-date').value='';
  } else if(type==='doc'){
    const name=document.getElementById('pm-doc-name').value.trim();
    const url=document.getElementById('pm-doc-url').value.trim();
    if(!name)return;
    pmTempDocs.push({name,url}); 
    document.getElementById('pm-doc-name').value='';
    document.getElementById('pm-doc-url').value='';
  }
  renderPmLists();
}

async function saveProjModal(){
  const name=document.getElementById('pm-name').value.trim();
  if(!name){alert('Project name is required.');return;}
  // A PO typed or chosen but not yet added with "+ Add PO" is added now instead of being lost.
  const poNumber=document.getElementById('pm-po-input'),poFile=document.getElementById('pm-po-file');
  if(poNumber&&(poNumber.value.trim()||poFile?.files?.length)){
    if(!poNumber.value.trim()){alert('A PO file is selected but the PO number is empty. Enter the PO number, or remove the file.\nاخترت ملف أمر شراء بدون رقم. اكتب الرقم أو أزل الملف.');poNumber.focus();return;}
    const before=pmTempPOs.length;await sfPmAddPo();if(pmTempPOs.length===before)return;
  }
  const id=document.getElementById('pm-id').value || 'proj_'+Date.now();
  const oldProject=projects.find(p=>p.id===id)||{};
  const proj={
    ...oldProject,
    id, name,
    client: document.getElementById('pm-client').value.trim(),
    status: document.getElementById('pm-status').value,
    contract: parseFloat(document.getElementById('pm-contract').value)||0,
    vatPct: (v=>Number.isFinite(v)&&v>=0&&v<100?v:15)(parseFloat(document.getElementById('pm-vat').value)),
    start: document.getElementById('pm-start').value,
    commissionPct: parseFloat(document.getElementById('pm-commission-pct').value)||0,
    commissionAmount: parseFloat(document.getElementById('pm-commission-amt').value)||0,
    commissions: [...pmTempComms],
    notes: document.getElementById('pm-notes').value.trim(),
    pos: [...pmTempPOs],
    payments: pmTempPays.map(sfNormalizePaymentRecord),
    docs: [...pmTempDocs],
    quotes: (projects.find(p=>p.id===id)||{}).quotes || [],
    proformas: (projects.find(p=>p.id===id)||{}).proformas || [],
    updatedAt: new Date().toISOString()
  };
  const idx=projects.findIndex(p=>p.id===id);
  if(idx>=0) projects[idx]=proj; else projects.unshift(proj);
  const syncResult=await saveProjects();renderProjects();
  if(syncResult.conflicts.some(item=>item.id===id))return;
  if(syncResult.errors.some(item=>item.id===id)){
    alert('The Project remains in the local cache, but it could not be saved to the shared database. Please keep this window open and retry after the connection is restored.');
    return;
  }
  closeProjModal();
}

async function deleteProject(id){
  const project=projects.find(p=>p.id===id);if(!project)return;
  if(!(await sfConfirm({title:sfUiLanguage==='ar'?`حذف المشروع «${project.name||''}»${project.client?' للعميل '+project.client:''}؟`:`Delete project "${project.name||''}"${project.client?' for '+project.client:''}?`,
    message:sfLang('This cannot be undone.','لا يمكن التراجع عن الحذف.'),ok:sfLang('Delete project','حذف المشروع'),danger:true}))) return;
  const deletion=await sfSyncProjectDelete(project);
  if(!deletion.ok&&deletion.status==='conflict'){
    sfApplyProjectConflict({id,status:'conflict',remote:deletion.remote});sfCachePerRecordCollection('sfProjects',projects);renderProjects();
    alert('This Project was changed by another team member. The latest version has been loaded and was not deleted.');return;
  }
  if(!deletion.ok){alert('The Project was not deleted because the shared database could not confirm the operation. Please retry when the connection is available.');return;}
  projects=projects.filter(p=>p.id!==id);sfCachePerRecordCollection('sfProjects',projects);
  savedQuotes.forEach(q=>{if(q.projectId===id){q.projectId='';q.updatedAt=new Date().toISOString();}});
  proformaInvoices.forEach(pi=>{if(pi.projectId===id){pi.projectId='';pi.updatedAt=new Date().toISOString();}});
  const [quoteSync,invoiceSync]=await Promise.all([saveSavedQuotes(),saveProformaStore()]);
  if(quoteSync.conflicts.length||invoiceSync.conflicts.length||invoiceSync.errors.length)alert('The Project was deleted, but one linked quotation or invoice changed at the same time. Its latest shared version was retained for review.');
  updateSidebarCounts();renderProjects();renderSavedQuotations();renderProformas();updateProformaAvailabilityControls();
}

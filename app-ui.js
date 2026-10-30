// SKY FIELD — Navigation, dashboard, sidebar, interface language.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function sfSetFormBusy(form,busy,busyLabel){
  if(!form)return;
  const btn=form.querySelector('button[type="submit"]');
  if(!btn)return;
  if(!btn.dataset.normalLabel)btn.dataset.normalLabel=btn.textContent;
  btn.disabled=!!busy;
  btn.textContent=busy?(busyLabel||'Please wait…'):btn.dataset.normalLabel;
}
function setIncludeArabicTranslation(includeArabic){setConditionLanguage(includeArabic?'both':'en')}
function sfUiLookup(value){
  const key=String(value||'').replace(/\s+/g,' ').trim();
  if(!key)return '';
  // English interface: only labels written in both languages change (to their English half).
  if(sfUiLanguage==='en')return typeof sfUiEnglishLookup==='function'?sfUiEnglishLookup(key):'';
  return SF_UI_AR[key]||(typeof SF_UI_AR_COMMERCIAL!=='undefined'&&(SF_UI_AR_COMMERCIAL[key]||sfUiPatternLookup(key)))||'';
}
function sfUiExcluded(element){
  return !!(element&&element.closest&&element.closest(SF_UI_EXCLUDE_SELECTOR));
}
function sfTranslateUiTextNode(node){
  if(!node||node.nodeType!==Node.TEXT_NODE||sfUiExcluded(node.parentElement))return;
  const raw=sfUiOriginalText.get(node)??node.nodeValue;
  const trimmed=String(raw||'').trim(),translated=sfUiLookup(trimmed);
  if(!translated){
    if(sfUiOriginalText.has(node)){if(node.nodeValue!==raw)node.nodeValue=raw;sfUiOriginalText.delete(node);}
    return;
  }
  if(!sfUiOriginalText.has(node))sfUiOriginalText.set(node,raw);
  const leading=String(raw).match(/^\s*/)?.[0]||'',trailing=String(raw).match(/\s*$/)?.[0]||'';
  const next=leading+translated+trailing;
  if(node.nodeValue!==next)node.nodeValue=next;
}
function sfTranslateUiAttributes(element){
  if(!element||element.nodeType!==Node.ELEMENT_NODE||sfUiExcluded(element))return;
  const attrs=['placeholder','title','aria-label'];
  let originals=sfUiOriginalAttrs.get(element);
  // Each attribute is set only when its value actually changes, so the mutation observer settles.
  attrs.forEach(name=>{
    if(!element.hasAttribute(name))return;
    const current=element.getAttribute(name),source=originals?.[name]??current,translated=sfUiLookup(source);
    if(!translated){
      if(originals&&name in originals){if(current!==originals[name])element.setAttribute(name,originals[name]);delete originals[name];}
      return;
    }
    if(!originals){originals={};sfUiOriginalAttrs.set(element,originals);}
    if(!(name in originals))originals[name]=current;
    if(current!==translated)element.setAttribute(name,translated);
  });
  if(originals&&!Object.keys(originals).length)sfUiOriginalAttrs.delete(element);
}
function sfApplyUiTranslation(root=document.body){
  if(!root||sfUiMutationGuard)return;
  sfUiMutationGuard=true;
  try{
    if(root.nodeType===Node.TEXT_NODE){sfTranslateUiTextNode(root);return;}
    if(root.nodeType===Node.ELEMENT_NODE)sfTranslateUiAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(node.nodeType===Node.TEXT_NODE)sfTranslateUiTextNode(node);else sfTranslateUiAttributes(node);
    }
  }finally{sfUiMutationGuard=false;}
}
function sfSetInterfaceLanguage(lang,persist=true){
  sfUiLanguage=lang==='ar'?'ar':'en';
  document.documentElement.lang=sfUiLanguage;
  document.documentElement.dir=sfUiLanguage==='ar'?'rtl':'ltr';
  document.body.dataset.uiLanguage=sfUiLanguage;
  const select=document.getElementById('sf-ui-language');if(select)select.value=sfUiLanguage;
  if(persist)try{localStorage.setItem(sfUiStorageKey(),sfUiLanguage);}catch(e){}
  sfApplyUiTranslation(document.body);
  try{updateLcControls();}catch(e){}
  try{updateActiveQuoteNote();}catch(e){}
  requestAnimationFrame(()=>sfApplyUiTranslation(document.body));
}
function sfLoadUserInterfaceLanguage(user){
  let selected='';
  try{selected=localStorage.getItem(sfUiStorageKey(user))||localStorage.getItem(sfUiStorageKey(null))||'';}catch(e){}
  // No language chosen yet on this device: follow the device language (an Arabic phone or PC opens in Arabic).
  if(!selected)selected=String((typeof navigator!=='undefined'&&(navigator.languages?.[0]||navigator.language))||'').toLowerCase().startsWith('ar')?'ar':'en';
  sfSetInterfaceLanguage(selected==='ar'?'ar':'en',false);
}
function sfInitInterfaceLanguage(){
  if(!sfUiObserver){
    sfUiObserver=new MutationObserver(mutations=>{
      if(sfUiMutationGuard)return;
      mutations.forEach(m=>{
        if(m.type==='characterData')sfApplyUiTranslation(m.target);
        else if(m.type==='attributes')sfApplyUiTranslation(m.target);
        else m.addedNodes.forEach(node=>sfApplyUiTranslation(node));
      });
    });
    sfUiObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
  }
  sfLoadUserInterfaceLanguage(sfCurrentUser);
}

function toggleSidebar(){ document.body.classList.toggle('nav-open'); }
function closeSidebar(){ document.body.classList.remove('nav-open'); }
function toggleAdvancedFields(){
  document.body.classList.toggle('show-advanced');
  const b=document.getElementById('advanced-fields-btn');
  if(b) b.textContent=document.body.classList.contains('show-advanced')?'Hide Commercial Fields':'Show Commercial Fields';
}
function updateSidebarCounts(){
  const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val||0;};
  try{ set('side-quote-count',savedQuotes.length); }catch(e){}
  try{ set('side-project-count',projects.length); }catch(e){}
  try{ set('side-pi-count',proformaInvoices.length); }catch(e){}
  try{ set('side-engineer-count',sfEngineers.length); }catch(e){}
  try{ set('side-payroll-count',sfPayrollSheets.length); }catch(e){}
}

function renderDashboard(){
  const root=document.getElementById('dashboard-content'); if(!root)return;
  const ps=(typeof projects!=='undefined'?projects:[]);
  const qs=(typeof savedQuotes!=='undefined'?savedQuotes:[]);
  const pis=(typeof proformaInvoices!=='undefined'?proformaInvoices:[]);
  const totalContract=ps.reduce((s,p)=>s+(parseFloat(p.contract)||0),0);
  const sfMoney=sfMoneyTotals(ps),sfLoose=sfUnlinkedProformaTotal(); const totalInvoiced=sfMoney.invoiced+sfLoose; const totalReceived=sfMoney.received; const outstanding=sfMoney.outstanding+sfLoose;
  const recentProjects=ps.slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0,5);
  const recentInvoices=pis.slice().sort((a,b)=>(b.updatedAt||b.date||'').localeCompare(a.updatedAt||a.date||'')).slice(0,5);
  root.innerHTML=`
    <div class="dash-kpis">
      <div class="dash-kpi"><div class="dk-icon">▣</div><div class="dk-label">Active Projects</div><div class="dk-value">${ps.filter(p=>p.status!=='completed').length}</div><div class="dk-sub">${ps.length} projects in total</div></div>
      <div class="dash-kpi"><div class="dk-icon">◫</div><div class="dk-label">Contract Value</div><div class="dk-value">${fmtSAR(totalContract)}</div><div class="dk-sub">Incl. VAT · across tracked projects</div></div>
      <div class="dash-kpi"><div class="dk-icon">▧</div><div class="dk-label">Total Invoiced</div><div class="dk-value">${fmtSAR(totalInvoiced)}</div><div class="dk-sub">All invoices, incl. VAT</div></div>
      <div class="dash-kpi"><div class="dk-icon">◉</div><div class="dk-label">Outstanding</div><div class="dk-value">${fmtSAR(outstanding)}</div><div class="dk-sub">Unpaid, incl. VAT</div></div> </div> <div id="dash-attention"></div> <div class="dash-grid">
      <div class="dash-panel">
        <div class="dash-panel-hdr"><h3>Recent Projects</h3><button class="eo-mini-link" onclick="showTab('projects',document.querySelector('.side-nav-btn[data-module=projects]'))">View all</button></div>
        <div class="dash-list">${recentProjects.length?recentProjects.map(p=>`<div class="dash-row"><div class="dash-row-main"><div class="dash-row-title">${escHtml(p.name)}</div><div class="dash-row-sub">${escHtml(p.client||'No client')} · ${escHtml(p.status||'active')}</div></div><strong>${fmtSAR(p.contract||0)}</strong></div>`).join(''):'<div class="dash-empty">No projects yet. Convert an approved quotation into a project.</div>'}</div>
      </div>
      <div class="dash-panel">
        <div class="dash-panel-hdr"><h3>Quick Actions</h3></div>
        <div class="dash-actions">
          <button class="dash-action" onclick="sfStartNewQuotation()">＋ Create quotation</button>
          <button class="dash-action" onclick="openProjModal('')">▣ Create project</button>
          <button class="dash-action" onclick="showTab('quotes',document.querySelector('.side-nav-btn[data-module=quotes]'))">▤ Saved quotations</button>
          <button class="dash-action" onclick="showTab('proformas',document.querySelector('.side-nav-btn[data-module=proformas]'))">▧ Invoice register</button>
        </div>
        <div class="dash-panel-hdr" style="border-top:1px solid var(--gray-200)"><h3>Recent Invoices</h3></div>
        <div class="dash-list">${recentInvoices.length?recentInvoices.map(pi=>{const st=invoicePaymentStatus(pi);return `<div class="dash-row"><div class="dash-row-main"><div class="dash-row-title">${escHtml(pi.number||'Invoice')}</div><div class="dash-row-sub">${escHtml(pi.clientName||pi.client||'')} · <span class="dash-date">${escHtml(pi.issueDate||pi.date||'')}</span></div></div><span class="pay-badge ${escHtml(st)}">${escHtml(st)}</span><strong>${fmtSAR((pi.totals||{}).grandTotal||(pi.amounts||{}).grandTotal||pi.total||0)}</strong></div>`}).join(''):'<div class="dash-empty">No invoices issued yet.</div>'}</div> </div> </div>`; if(typeof sfRenderAttention==='function')sfRenderAttention();
}

function showTab(name,btn){
  if((name==='engineers'&&!sfHasAccess('engineers'))||(name==='payroll'&&!sfHasAccess('payroll'))){
    alert('Your account does not have access to Engineers or Payroll / Salaries.');
    name='dashboard';
    btn=document.querySelector('.side-nav-btn[data-module="dashboard"]');
  }
  const builderTabs=['activities','equipment','costplanning','conditions'];
  const allTabs=['dashboard','activities','equipment','costplanning','conditions','projects','projectdetails','quotes','proformas','analytics','engineers','payroll','costsettings'];
  const isBuilder=builderTabs.includes(name);
  document.body.dataset.module=isBuilder?'quotation':name;
  allTabs.forEach(t=>{
    const el=document.getElementById('tab-'+t);
    if(el)el.style.display=t===name?'':'none';
  });
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.builderTab===name));
  document.querySelectorAll('.side-nav-btn').forEach(b=>{
    const target=b.dataset.module;
    b.classList.toggle('active',isBuilder?target==='activities':target===name);
  });
  const meta=APP_PAGE_META[name]||APP_PAGE_META.dashboard;
  const title=document.getElementById('app-page-title');if(title)title.textContent=meta[0];
  const sub=document.getElementById('app-page-subtitle');if(sub)sub.textContent=meta[1];
  const primary=document.getElementById('command-primary-action');
  if(primary){
    if(name==='projects'){primary.textContent='+ New Project';primary.onclick=()=>openProjModal('');}
    else if(name==='projectdetails'){primary.hidden=true;}
    else if(name==='proformas'){primary.textContent='View Projects to Invoice';primary.onclick=()=>showTab('projects',document.querySelector('.side-nav-btn[data-module=projects]'));}
    else if(name==='quotes'){primary.textContent='+ New Quotation';primary.onclick=()=>sfStartNewQuotation();}
    else if(name==='dashboard'){primary.textContent='+ New Quotation';primary.onclick=()=>sfStartNewQuotation();}
    else if(name==='engineers'){primary.textContent='+ Add Engineer';primary.onclick=()=>{resetEngineerForm();document.getElementById('eng-name')?.focus();};}
    else if(name==='payroll'){primary.hidden=true;}
    else if(name==='analytics'){primary.textContent='Refresh / تحديث';primary.onclick=()=>{if(typeof sfRenderAnalytics==='function')sfRenderAnalytics({reload:true})};} else if(name==='costsettings'){primary.textContent='+ Add Equipment';primary.onclick=()=>{resetCostEquipmentForm();document.getElementById('cost-eq-name')?.focus();};}
    else {primary.textContent='Save Quotation';primary.onclick=()=>saveCurrentQuotation(false,'quotation');}
  }
  if(isBuilder) updateActiveQuoteNote();
  if(name==='dashboard') renderDashboard();
  if(name==='projects') renderProjects();
  if(name==='projectdetails') renderProjectDetails();
  if(name==='quotes') renderSavedQuotations();
  if(name==='proformas') renderProformas(); if(name==='analytics'&&typeof sfRenderAnalytics==='function') sfRenderAnalytics();
  if(name==='engineers') renderEngineers();
  if(name==='payroll') payrollRender();
  if(name==='costsettings') renderCostLibrary(); if(name==='equipment') buildEq();
  if(name==='costplanning') renderCostPlan();
  updateSidebarCounts();
  closeSidebar();
  try{if(name!=='projectdetails')localStorage.setItem('sfLastModule',name);}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});
}
function togglePreviewArabicTranslation(includeArabic){
  setIncludeArabicTranslation(includeArabic);
  showExport(activeExportDocType);
}
function sfListCount(id,shown,total,noun){const el=document.getElementById(id);if(el)el.textContent=shown===total?`${total} ${noun}`:`Showing ${shown} of ${total} ${noun} / المعروض ${shown} من ${total}`}

// SKY FIELD — Quotation builder: scope, equipment, conditions, totals, customer document.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function sfSuggestedPrintTitle(kind='quotation'){
  if(kind==='proforma'){
    const rec=(typeof proformaInvoices!=='undefined'&&typeof activeProformaId!=='undefined')
      ? proformaInvoices.find(x=>x.id===activeProformaId)
      : null;
    const company=rec?.clientName||document.getElementById('pi-client')?.value||'Client';
    const number=rec?.number||document.getElementById('pi-number')?.value||'Proforma Invoice';
    return `${sfSafeFileNamePart(company,'Client')} - ${sfSafeFileNamePart(number,'Proforma Invoice')}`;
  }
  const company=document.getElementById('client')?.value||'Client';
  const number=document.getElementById('qno')?.value||'Quotation';
  return `${sfSafeFileNamePart(company,'Client')} - ${sfSafeFileNamePart(number,'Quotation')}`;
}
// Print only after the preview's images (the logo) have loaded, at most 3 seconds.
function sfPrintWhenImagesReady(){
  const waiting=[...document.querySelectorAll('#preview-doc img,#pi-preview-doc img')].filter(img=>img.getAttribute('src')&&!img.complete);
  let printed=false;const go=()=>{if(printed)return;printed=true;setTimeout(()=>window.print(),120)};
  if(!waiting.length){go();return}
  Promise.all(waiting.map(img=>new Promise(done=>{img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})}))).then(go);
  setTimeout(go,3000);
}
function sfPrintWithSuggestedName(kind='quotation'){
  // Keep the generated document title active for the entire preview session.
  // This also covers Ctrl+P and browsers that capture the title before afterprint.
  sfApplyPreviewTitle(kind);
  sfPrintWhenImagesReady();
}
function condSection(cat,condition){ return condition?.section || CAT_SECTION[cat] || 'Liability & General'; } // files attached to the current quotation: {name,url,type,size}

function k(cat,code){return cat+'|||'+code}
function rate(){return parseFloat(document.getElementById('rate').value)||1500}
function hpd(){return parseFloat(document.getElementById('hpd').value)||8}
function profitPct(){return parseFloat(document.getElementById('profit').value)||0}
function vatPct(){return parseFloat(document.getElementById('vat').value)||0}
function discountType(){ const el=document.getElementById('discount-type'); return el?el.value:'pct'; }
function discountValue(){ return parseFloat(document.getElementById('discount-value').value)||0; }
// Computes the discount amount off a given pre-discount subtotal, clamped to [0, subtotal].
function discountAmountFor(subBeforeDiscount){
  const dv=discountValue(); if(!dv) return 0;
  const raw = discountType()==='fixed' ? dv : subBeforeDiscount*dv/100;
  return Math.max(0, Math.min(raw, subBeforeDiscount));
}
function commercialMobilizationRate(){return Math.max(0,parseFloat(document.getElementById('commercial-mobilization-rate')?.value)||0)}
function fmtConditionRate(n){return Number(n).toLocaleString('en-US',{minimumFractionDigits:Number(n)%1?2:0,maximumFractionDigits:2})}
function conditionDisplayText(text,cat='',lang='en'){
  let out=String(text||'');
  const daily=commercialEngineerDailyRate(), monthly=commercialEngineerMonthlyRate(), mobilization=commercialMobilizationRate();
  const rateParts=[];
  if(lang==='ar'){
    if(daily)rateParts.push(`السعر اليومي: ${fmtConditionRate(daily)} ريال/يوم`);
    if(monthly)rateParts.push(`السعر الشهري: ${fmtConditionRate(monthly)} ريال/شهر`);
    if(rateParts.length && /بالسعر اليومي أو الشهري المبين في العرض التجاري/.test(out)){
      out=out.replace(/بالسعر اليومي أو الشهري المبين في العرض التجاري/g,`بسعر المهندس المطبق (${rateParts.join(' أو ')})`);
    }else if(rateParts.length && cat==='Additional Days' && !/السعر اليومي:\s*/.test(out)){
      out += ` أسعار المهندس المطبقة: ${rateParts.join(' أو ')}.`;
    }
    if((cat==='General – Mobilization & Demobilization' || /رحلة تعبئة وعودة أخرى/.test(out)) && mobilization){
      out=out.replace(/بالسعر المتفق عليه لكل شخص لكل رحلة ذهاب وعودة/g,`بمبلغ ${fmtConditionRate(mobilization)} ريال لكل مهندس عن كل رحلة ذهاب وعودة`);
    }
    return out;
  }

  if(daily)rateParts.push(`Daily Rate: SAR ${fmtConditionRate(daily)}/day`);
  if(monthly)rateParts.push(`Monthly Rate: SAR ${fmtConditionRate(monthly)}/month`);
  if(rateParts.length && /daily or monthly rate stated in the commercial offer/i.test(out)){
    out=out.replace(/the daily or monthly rate stated in the commercial offer/gi,`the applicable engineer rate (${rateParts.join(' or ')})`);
  }else if(rateParts.length && cat==='Additional Days' && !/Daily Rate:\s*SAR/i.test(out)){
    out += ` Applicable engineer rates: ${rateParts.join(' or ')}.`;
  }
  if(cat==='General – Mobilization & Demobilization' || /additional round-trip mobilization required after initial demobilization/i.test(out)){
    if(mobilization && /the agreed per-person(?: round-trip)? rate/i.test(out)){
      out=out.replace(/the agreed per-person(?: round-trip)? rate/gi,`SAR ${fmtConditionRate(mobilization)} per engineer per round trip`);
    }
  }
  return out;
}
function conditionSectionLabel(sec){
  const ar=COND_SECTION_AR[sec]||sec;
  return conditionLanguage==='ar'?ar:(conditionLanguage==='both'?`${sec} / ${ar}`:sec);
}
function conditionCategoryLabel(cat){
  const ar=COND_CATEGORY_AR[cat]||GENERAL_CATEGORY_AR[cat]||cat;
  return conditionLanguage==='ar'?ar:(conditionLanguage==='both'&&ar!==cat?`${cat} / ${ar}`:cat);
}
function quotationLabel(en,ar){
  const enSafe=escHtml(String(en||'')),arSafe=escHtml(String(ar||''));
  if(conditionLanguage==='ar')return `<span dir="rtl">${arSafe}</span>`;
  if(conditionLanguage==='both')return `<span dir="ltr">${enSafe}</span> / <span dir="rtl">${arSafe}</span>`;
  return `<span dir="ltr">${enSafe}</span>`;
}
function quotationUnit(value,enSingular,enPlural,ar){
  if(conditionLanguage==='ar')return `${value} ${ar}`;
  const one=parseFloat(value)===1;
  if(conditionLanguage==='both')return `${value} ${one?enSingular:enPlural} / ${ar}`;
  return `${value} ${one?enSingular:enPlural}`;
}
function conditionCopyHtml(c,doc=false){
  const en=conditionDisplayText(c?.text||'',c?.cat||'','en');
  const ar=conditionDisplayText(c?.textAr||c?.text||'',c?.cat||'','ar');
  const ep=doc?'doc-cond-en':'cond-copy-en',ap=doc?'doc-cond-ar':'cond-copy-ar',wrap=doc?'doc-cond-body':'cond-copy';
  if(conditionLanguage==='ar')return `<div class="${wrap}"><div class="${ap}" dir="rtl">${escHtml(ar)}</div></div>`;
  if(conditionLanguage==='en')return `<div class="${wrap}"><div class="${ep}" dir="ltr">${escHtml(en)}</div></div>`;
  const arBlock=(c?.textAr||'').trim()?`<div class="${ap}" dir="rtl">${escHtml(ar)}</div>`:'';
  return `<div class="${wrap}"><div class="${ep}" dir="ltr">${escHtml(en)}</div>${arBlock}</div>`;
}
function setConditionLanguage(lang){
  conditionLanguage=(lang==='both'||lang==='ar')?'both':'en';
  const toggle=document.getElementById('include-arabic-translation');if(toggle)toggle.checked=conditionLanguage==='both';
  buildConds();renderQuot();
}
function setLcApplicable(value){setPaymentMethod(value?'lc':'bank_transfer')}
function lcApplicantName(){return document.getElementById('client')?.value.trim()||'Customer'}
function updateLcApplicantFromClient(){
  updateLcControls();
  if(lcApplicable){refreshPaymentCondition();buildConds();renderQuot()}
}
function lcDocumentLabels(lang='en'){
  const labels=lang==='ar'
    ? {commercial_invoice:'الفاتورة التجارية',delivery_note:'إشعار التسليم',progress_certificate:'شهادة التقدم',timesheet:'كشف الساعات الموقع'}
    : {commercial_invoice:'commercial invoice',delivery_note:'delivery note',progress_certificate:'progress certificate',timesheet:'signed timesheet'};
  return Object.keys(labels).filter(key=>lcDocuments[key]).map(key=>labels[key]);
}
function lcDocumentsPhrase(lang='en'){
  const list=lcDocumentLabels(lang);if(!list.length)return lang==='ar'?'المستندات المحددة في الاعتماد':'the documents specified in the L/C';
  if(list.length===1)return list[0];
  return list.slice(0,-1).join(lang==='ar'?' و/أو ':' and/or ')+(lang==='ar'?' و/أو ':' and/or ')+list[list.length-1];
}
function updateLcAmountSummary(){
  let totals={sub:0,tot:0};try{totals=calcQuotationTotals()}catch(_error){}
  const base=lcCalculationBasis==='including_vat'?totals.tot:totals.sub;
  const advance=base*Math.max(0,Math.min(100,lcAdvancePct))/100,balance=base-advance;
  const currency=lcCurrency||'SAR';
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=`${currency} ${fmtN(value)}`};
  set('lc-base-amount',base);set('lc-advance-amount',advance);set('lc-balance-amount',balance);
}
function updateLcControls(){
  const sel=document.getElementById('payment-method');if(sel)sel.value=paymentMethod;
  const card=document.getElementById('lc-summary-card');if(card)card.classList.toggle('show',lcApplicable);
  const controls=document.getElementById('lc-controls');if(controls)controls.classList.toggle('show',lcApplicable);
  const standard=document.getElementById('standard-payment-controls');if(standard)standard.classList.toggle('lc-disabled',lcApplicable);
  const balance=Math.max(0,100-lcAdvancePct);
  const ap=document.getElementById('lc-advance-pct');if(ap)ap.value=lcAdvancePct;
  const bp=document.getElementById('lc-balance-pct');if(bp)bp.value=balance;
  const type=document.getElementById('lc-type');if(type)type.value=lcType;
  const ad=document.getElementById('lc-advance-days');if(ad)ad.value=lcAdvanceDays;
  const od=document.getElementById('lc-open-days');if(od)od.value=lcOpenDays;
  const dd=document.getElementById('lc-document-days');if(dd)dd.value=lcDocumentDays;
  const basis=document.getElementById('lc-payment-basis');if(basis)basis.value=lcPaymentBasis;
  const currency=document.getElementById('lc-currency');if(currency)currency.value=lcCurrency;
  const calcBasis=document.getElementById('lc-calculation-basis');if(calcBasis)calcBasis.value=lcCalculationBasis;
  const applicant=document.getElementById('lc-applicant');if(applicant)applicant.value=lcApplicantName();
  const beneficiary=document.getElementById('lc-beneficiary');if(beneficiary)beneficiary.value=lcBeneficiary;
  const charges=document.getElementById('lc-bank-charges');if(charges)charges.value=lcBankCharges;
  const rules=document.getElementById('lc-rules');if(rules)rules.value=lcRules;
  const bank=document.getElementById('lc-acceptable-bank');if(bank)bank.value=lcAcceptableBank;
  const validity=document.getElementById('lc-validity-days');if(validity)validity.value=lcValidityDays;
  const docIds={commercial_invoice:'lc-doc-commercial-invoice',delivery_note:'lc-doc-delivery-note',progress_certificate:'lc-doc-progress-certificate',timesheet:'lc-doc-timesheet'};
  Object.entries(docIds).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.checked=!!lcDocuments[key]});
  const isAr=document.documentElement.lang==='ar';
  const typeEn=lcType==='confirmed_at_sight'?'confirmed irrevocable L/C at sight':'irrevocable L/C at sight';
  const typeAr=lcType==='confirmed_at_sight'?'اعتماد مستندي مؤكد وغير قابل للإلغاء ومستحق الدفع عند الاطلاع':'اعتماد مستندي غير قابل للإلغاء ومستحق الدفع عند الاطلاع';
  const basisEn=lcPaymentBasis==='after_completion'?'after completion of the work':'against monthly progress invoices';
  const basisAr=lcPaymentBasis==='after_completion'?'بعد اكتمال الأعمال':'مقابل فواتير التقدم الشهرية';
  if(card)card.innerHTML=isAr
    ? `<strong>هيكل الدفع بالاعتماد المستندي:</strong> دفعة تعبئة ${lcAdvancePct}% بالتحويل البنكي + ${balance}% عن طريق ${typeAr}، ويتم السحب ${basisAr}، مع إدراج شرط التوقيع خلال ${lcDocumentDays} يومًا داخل شرط الدفع رقم 1.`
    : `<strong>L/C payment structure:</strong> ${lcAdvancePct}% mobilization payment by bank transfer + ${balance}% by ${typeEn}, drawn ${basisEn}. The ${lcDocumentDays}-day countersignature protection is included in Payment Condition No. 1.`;
  const status=document.getElementById('lc-quick-status');if(status)status.textContent=lcApplicable
    ? (isAr?'شروط الاعتماد المستندي مدرجة في شرط الدفع رقم 1.':'L/C conditions are included in Payment Condition No. 1.')
    : (isAr?'تم اختيار الدفع بالفاتورة والتحويل البنكي.':'Invoice and bank-transfer conditions are currently selected.');
  updateLcAmountSummary();
}
function updateLcTerms(){
  lcAdvancePct=Math.min(100,Math.max(0,parseFloat(document.getElementById('lc-advance-pct')?.value)||0));
  lcType=['irrevocable_at_sight','confirmed_at_sight'].includes(document.getElementById('lc-type')?.value)?document.getElementById('lc-type').value:'irrevocable_at_sight';
  lcAdvanceDays=Math.max(0,parseInt(document.getElementById('lc-advance-days')?.value)||0);
  lcOpenDays=Math.max(0,parseInt(document.getElementById('lc-open-days')?.value)||0);
  lcDocumentDays=Math.max(1,parseInt(document.getElementById('lc-document-days')?.value)||14);
  lcPaymentBasis=['monthly_progress','after_completion'].includes(document.getElementById('lc-payment-basis')?.value)?document.getElementById('lc-payment-basis').value:'monthly_progress';
  lcCurrency=['SAR','USD','EUR'].includes(document.getElementById('lc-currency')?.value)?document.getElementById('lc-currency').value:'SAR';
  lcCalculationBasis=document.getElementById('lc-calculation-basis')?.value==='including_vat'?'including_vat':'before_vat';
  lcBeneficiary=document.getElementById('lc-beneficiary')?.value.trim()||'Sky Field Company Limited';
  lcBankCharges=['client','shared','beneficiary'].includes(document.getElementById('lc-bank-charges')?.value)?document.getElementById('lc-bank-charges').value:'shared';
  lcRules=document.getElementById('lc-rules')?.value.trim()||'UCP 600';
  lcAcceptableBank=document.getElementById('lc-acceptable-bank')?.value.trim()||'';
  lcValidityDays=Math.max(0,parseInt(document.getElementById('lc-validity-days')?.value)||0);
  lcDocuments={
    commercial_invoice:!!document.getElementById('lc-doc-commercial-invoice')?.checked,
    delivery_note:!!document.getElementById('lc-doc-delivery-note')?.checked,
    progress_certificate:!!document.getElementById('lc-doc-progress-certificate')?.checked,
    timesheet:!!document.getElementById('lc-doc-timesheet')?.checked
  };
  paymentConditionOverrideEn='';paymentConditionOverrideAr='';
  const bank=conds.find(c=>c.cat==='Payment – Bank');
  if(bank&&!bank.modified){bank.text=paymentBankConditionText('en');bank.textAr=paymentBankConditionText('ar');}
  updateLcControls();refreshPaymentCondition();buildConds();renderQuot();
}
function refreshCommercialConditionRates(){buildConds();renderQuot();}
function sfLocalMaxSequence(kind){
  const year=new Date().getFullYear();
  const prefix=kind==='quotation'?'SF-Q':'SF-PI';
  const list=kind==='quotation'?(typeof savedQuotes!=='undefined'?savedQuotes:[]):(typeof proformaInvoices!=='undefined'?proformaInvoices:[]);
  return list.reduce((m,r)=>{const mt=String(r.number||'').match(new RegExp('^'+prefix+'-'+year+'-(\\d+)$','i'));return mt?Math.max(m,parseInt(mt[1],10)||0):m},0);
}
async function sfGetDocumentNumber(kind,reserve=false){
  const year=new Date().getFullYear(),prefix=kind==='quotation'?'SF-Q':'SF-PI',localMax=sfLocalMaxSequence(kind);
  if(sfDb&&sfCurrentUser){
    try{
      const {data,error}=await sfDb.rpc('sf_next_document_number',{p_kind:kind,p_minimum:localMax,p_reserve:!!reserve});
      if(error)throw error;
      const number=String(data||'');
      if(number){if(reserve)sfReservedDocumentNumbers.add(number);return number;}
    }catch(error){console.warn('Central document numbering unavailable; using local fallback.',error)}
  }
  const key=(kind==='quotation'?'sf_qno_seq_':'sf_pi_seq_')+year;
  const current=Math.max(parseInt(localStorage.getItem(key)||'0',10)||0,localMax),seq=current+1;
  const number=`${prefix}-${year}-${String(seq).padStart(3,'0')}`;
  if(reserve){localStorage.setItem(key,String(seq));sfReservedDocumentNumbers.add(number)}
  return number;
}
async function generateNextQuoteNumber(forceIncrement=false){
  const el=document.getElementById('qno');if(el)el.value=await sfGetDocumentNumber('quotation',!!forceIncrement);
}
function setupQuotationFieldGroups(){
  const advancedIds=['vat','profit','discount-type','discount-value','commission','prep-name','prep-email','substation'];
  advancedIds.forEach(id=>{
    const input=document.getElementById(id);
    const card=input&&input.closest('.meta-card');
    if(card)card.classList.add('advanced-field');
  });
}

function filterCats(){
  const q=document.getElementById('csearch').value.toLowerCase();
  buildCatList(q);
}

function scopeActivityBaseId(cat,code){
  const input=String(cat||'')+'\u241f'+String(code||'');let hash=2166136261;
  for(let index=0;index<input.length;index++)hash=Math.imul(hash^input.charCodeAt(index),16777619);
  return 'base_'+(hash>>>0).toString(36);
}
function baseScopeActivityById(id){
  for(const [cat,items] of Object.entries(ACTS)){
    for(const [task,code,dur,unit] of items){
      if(scopeActivityBaseId(cat,code)===String(id))return {id:String(id),cat,task,code,dur,unit,custom:false,modified:false};
    }
  }
  return null;
}
function loadScopeActivityRecords(){
  const records=[];
  for(let index=0;index<localStorage.length;index++){
    const storageKey=localStorage.key(index);
    if(!storageKey||!storageKey.startsWith(SF_SCOPE_ACTIVITY_KEY_PREFIX))continue;
    try{
      const item=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(!item||item.deleted||!item.id||!String(item.cat||'').trim()||!String(item.task||'').trim()||!String(item.code||'').trim())continue;
      records.push({
        id:String(item.id),cat:String(item.cat).trim(),task:String(item.task).trim(),code:String(item.code).trim(),
        dur:Math.max(0,parseFloat(item.dur)||0),unit:String(item.unit||'').trim()||'Unit',custom:!!item.custom,
        createdAt:item.createdAt||'',updatedAt:item.updatedAt||''
      });
    }catch(error){console.warn('Skipped invalid Scope of Work activity record:',storageKey,error)}
  }
  return records.sort((a,b)=>(a.createdAt||a.updatedAt||a.task).localeCompare(b.createdAt||b.updatedAt||b.task));
}
function scopeActivityCatalog(){
  const catalog={},baseIndex=new Map();
  Object.entries(ACTS).forEach(([cat,items])=>{
    catalog[cat]=items.map(([task,code,dur,unit])=>{
      const item={id:scopeActivityBaseId(cat,code),cat,task,code,dur,unit,custom:false,modified:false};
      baseIndex.set(item.id,item);return item;
    });
  });
  loadScopeActivityRecords().forEach(record=>{
    if(record.custom){
      (catalog[record.cat]=catalog[record.cat]||[]).push({...record,modified:false});return;
    }
    const base=baseIndex.get(record.id);if(!base)return;
    catalog[base.cat]=(catalog[base.cat]||[]).filter(item=>item.id!==record.id);
    (catalog[record.cat]=catalog[record.cat]||[]).push({...record,custom:false,modified:true});
  });
  Object.keys(catalog).forEach(cat=>{if(!catalog[cat].length)delete catalog[cat]});
  return catalog;
}
function scopeActivityItemById(id){
  const target=String(id||'');
  for(const items of Object.values(scopeActivityCatalog())){
    const item=items.find(row=>row.id===target);if(item)return item;
  }
  return null;
}
function renderScopeCategoryOptions(){
  const list=document.getElementById('scope-category-options');if(!list)return;list.innerHTML='';
  Object.keys(scopeActivityCatalog()).forEach(cat=>{const option=document.createElement('option');option.value=cat;list.appendChild(option)});
}
function openScopeActivityForm(id=''){
  editingScopeActivityId=String(id||'');
  const item=editingScopeActivityId?scopeActivityItemById(editingScopeActivityId):null;
  renderScopeCategoryOptions();
  document.getElementById('scope-activity-category').value=item?.cat||activeCat||'';
  document.getElementById('scope-activity-name').value=item?.task||'';
  document.getElementById('scope-activity-code').value=item?.code||'';
  document.getElementById('scope-activity-duration').value=item?.dur??'';
  document.getElementById('scope-activity-unit').value=item?.unit||'';
  document.getElementById('scope-activity-form-title').textContent=item?'Edit Activity':'Add Activity';
  document.getElementById('scope-activity-form').classList.add('open');
  document.getElementById(item?'scope-activity-name':'scope-activity-category').focus();
}
function closeScopeActivityForm(){
  editingScopeActivityId='';
  const panel=document.getElementById('scope-activity-form');if(panel)panel.classList.remove('open');
  ['scope-activity-category','scope-activity-name','scope-activity-code','scope-activity-duration','scope-activity-unit'].forEach(id=>{const input=document.getElementById(id);if(input)input.value=''});
  const title=document.getElementById('scope-activity-form-title');if(title)title.textContent='Add Activity';
}
function refreshScopeActivityUi(){
  buildCatList((document.getElementById('csearch')?.value||'').toLowerCase());buildTasks();recalc();renderQuot();
}
function saveScopeActivity(){
  let cat=document.getElementById('scope-activity-category').value.trim();
  const task=document.getElementById('scope-activity-name').value.trim();
  const code=document.getElementById('scope-activity-code').value.trim();
  const dur=parseFloat(document.getElementById('scope-activity-duration').value);
  const unit=document.getElementById('scope-activity-unit').value.trim();
  if(!cat){alert('Category is required.');document.getElementById('scope-activity-category').focus();return}
  if(!task){alert('Activity name is required.');document.getElementById('scope-activity-name').focus();return}
  if(!code){alert('Activity code is required.');document.getElementById('scope-activity-code').focus();return}
  if(!Number.isFinite(dur)||dur<0){alert('Enter valid activity hours.');document.getElementById('scope-activity-duration').focus();return}
  if(!unit){alert('Activity unit is required.');document.getElementById('scope-activity-unit').focus();return}
  const matchingCategory=Object.keys(scopeActivityCatalog()).find(name=>name.toLowerCase()===cat.toLowerCase());
  if(matchingCategory)cat=matchingCategory;
  const current=editingScopeActivityId?scopeActivityItemById(editingScopeActivityId):null;
  const duplicate=Object.values(scopeActivityCatalog()).flat().find(item=>item.id!==editingScopeActivityId&&item.cat.toLowerCase()===cat.toLowerCase()&&item.code.toLowerCase()===code.toLowerCase());
  if(duplicate){alert('This activity code already exists in the selected category.');document.getElementById('scope-activity-code').focus();return}
  const id=editingScopeActivityId||('scope_'+Date.now()+'_'+Math.floor(Math.random()*100000));
  const existingRecord=loadScopeActivityRecords().find(item=>item.id===id);
  const record={id,cat,task,code,dur,unit,custom:current?current.custom:true,createdAt:existingRecord?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:sfCurrentUser?.email||''};
  localStorage.setItem(SF_SCOPE_ACTIVITY_KEY_PREFIX+id,JSON.stringify(record));
  const newKey=k(cat,code);
  if(current){
    const oldKey=k(current.cat,current.code);
    if(selActs[oldKey]){
      const qty=actQty[oldKey]||1;delete selActs[oldKey];delete actQty[oldKey];
      selActs[newKey]={cat,task,code,dur,unit,scopeActivityId:id};actQty[newKey]=qty;
    }
  }else{
    selActs[newKey]={cat,task,code,dur,unit,scopeActivityId:id};actQty[newKey]=1;
  }
  activeCat=cat;closeScopeActivityForm();refreshScopeActivityUi();
}
function deleteScopeActivity(id){
  const item=scopeActivityItemById(id);if(!item?.custom||!confirm('Delete this added activity from the Scope of Work list?'))return;
  localStorage.setItem(SF_SCOPE_ACTIVITY_KEY_PREFIX+item.id,JSON.stringify({id:item.id,deleted:true,updatedAt:new Date().toISOString(),updatedBy:sfCurrentUser?.email||''}));
  const key=k(item.cat,item.code);delete selActs[key];delete actQty[key];
  if(editingScopeActivityId===item.id)closeScopeActivityForm();refreshScopeActivityUi();
}

function buildCatList(q=''){
  const el=document.getElementById('cat-list');if(!el)return;el.innerHTML='';
  const catalog=scopeActivityCatalog(),categories=Object.keys(catalog);
  if(!catalog[activeCat])activeCat=categories[0]||'';
  categories.filter(c=>c.toLowerCase().includes(q)).forEach(c=>{
    const hasSel=catalog[c].some(item=>selActs[k(c,item.code)]);
    const d=document.createElement('div');
    d.className='cat-item'+(c===activeCat?' active':'')+(hasSel?' has-sel':'');
    d.innerHTML=`<span class="cat-dot"></span><span class="cat-name">${escHtml(c)}</span><span class="cat-badge">${catalog[c].length}</span>`;
    d.onclick=()=>{activeCat=c;buildCatList(q);buildTasks()};
    el.appendChild(d);
  });
}

function buildTasks(){
  const tasks=scopeActivityCatalog()[activeCat]||[];
  document.getElementById('tp-title').textContent=activeCat||'Select a category';
  const el=document.getElementById('task-list');if(!el)return;el.innerHTML='';
  tasks.forEach(item=>{
    const {id,task,code,dur,unit,custom,modified}=item;
    const ky=k(activeCat,code);
    const chk=!!selActs[ky];
    const qty=actQty[ky]||1;
    const row=document.createElement('div');
    row.className='task-row'+(chk?' checked':'');
    row.innerHTML=`<input type="checkbox" aria-label="${escHtml(task)}" ${chk?'checked':''}>
      <div><div class="task-name">${escHtml(task)}${custom?'<span class="task-library-badge">Custom</span>':modified?'<span class="task-library-badge">Modified</span>':''}</div><div class="task-code">${escHtml(code)}</div></div>
      <div class="task-dur">${dur}h<div class="task-unit">${escHtml(unit)}</div></div>
      <input class="qty-inp task-qty-input" type="number" min="1" value="${qty}" title="Qty">
      <div class="task-hrs">${chk?(dur*qty).toFixed(2)+'h':'—'}</div>
      <div class="task-manage-actions"><button class="task-manage-btn edit" type="button" title="Edit activity">✎</button>${custom?'<button class="task-manage-btn delete" type="button" title="Delete activity">×</button>':modified?'<button class="task-manage-btn restore" type="button" title="Restore default">↺</button>':''}</div>`;
    const checkbox=row.querySelector('input[type=checkbox]'),qtyInput=row.querySelector('.task-qty-input');
    checkbox.onclick=event=>event.stopPropagation();
    checkbox.onchange=event=>toggleAct(ky,activeCat,task,code,dur,unit,event.target.checked,{scopeActivityId:id});
    qtyInput.onclick=event=>event.stopPropagation();
    qtyInput.oninput=event=>setActQty(ky,event.target.value,activeCat,task,code,dur,unit);
    row.onclick=()=>{checkbox.checked=!checkbox.checked;toggleAct(ky,activeCat,task,code,dur,unit,checkbox.checked,{scopeActivityId:id})};
    row.querySelector('.task-manage-btn.edit').onclick=event=>{event.stopPropagation();openScopeActivityForm(id)};
    const deleteBtn=row.querySelector('.task-manage-btn.delete');if(deleteBtn)deleteBtn.onclick=event=>{event.stopPropagation();deleteScopeActivity(id)};
    const restoreBtn=row.querySelector('.task-manage-btn.restore');if(restoreBtn)restoreBtn.onclick=event=>{event.stopPropagation();restoreDefaultScopeActivity(id)};
    el.appendChild(row);
  });
}

function toggleAct(ky,cat,task,code,dur,unit,on,extra={}){
  if(on){selActs[ky]={cat,task,code,dur,unit,...extra};if(!actQty[ky])actQty[ky]=1;}
  else delete selActs[ky];
  buildTasks();buildCatList();recalc();renderQuot();
}
function setActQty(ky,val,cat,task,code,dur,unit){
  actQty[ky]=Math.max(1,parseInt(val)||1);
  if(selActs[ky])selActs[ky]={...selActs[ky],cat,task,code,dur,unit};
  recalc();renderQuot();
}
function selAll(){
  (scopeActivityCatalog()[activeCat]||[]).forEach(({id,task,code,dur,unit})=>{
    const ky=k(activeCat,code);selActs[ky]={cat:activeCat,task,code,dur,unit};
    selActs[ky].scopeActivityId=id;
    if(!actQty[ky])actQty[ky]=1;
  });
  buildTasks();buildCatList();recalc();renderQuot();
}
function clrCat(){
  (scopeActivityCatalog()[activeCat]||[]).forEach(({code})=>delete selActs[k(activeCat,code)]);
  buildTasks();buildCatList();recalc();renderQuot();
}
function clearAll(){
  selActs={};selEq={};actQty={};eqQty={};customSOW=[];customSOWLabel='';conditionType='testing';conditionLanguage='en';conditionTypeDrafts.clear();
  paymentMethod='bank_transfer';lcApplicable=false;lcAdvancePct=30;lcType='irrevocable_at_sight';lcAdvanceDays=7;lcOpenDays=10;lcDocumentDays=14;
  lcPaymentBasis='monthly_progress';lcCurrency='SAR';lcCalculationBasis='before_vat';lcBeneficiary='Sky Field Company Limited';lcBankCharges='shared';lcRules='UCP 600';lcAcceptableBank='';lcValidityDays=30;
  lcDocuments={commercial_invoice:true,delivery_note:true,progress_certificate:true,timesheet:false};paymentConditionOverrideEn='';paymentConditionOverrideAr='';
  paymentTermType='advance_balance';paymentAdvancePct=30;paymentDueDays=30;paymentBalanceBasis='monthly_progress';paymentCustomText='';paymentCustomTextAr='';
  conds=conditionTemplate('testing');projectDuration='';quoteAttachments=[];
  const lbl=document.getElementById('custom-sow-label');if(lbl)lbl.value='';
  const dur=document.getElementById('proj-duration');if(dur)dur.value='';
  ['commercial-engineer-daily-rate','commercial-engineer-monthly-rate','commercial-mobilization-rate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const ct=document.getElementById('condition-type');if(ct)ct.value='testing';
  const arToggle=document.getElementById('include-arabic-translation');if(arToggle)arToggle.checked=false;
  const pm=document.getElementById('payment-method');if(pm)pm.value='bank_transfer';
  const pt=document.getElementById('payment-term-type');if(pt)pt.value='advance_balance';
  const ap=document.getElementById('payment-advance-pct');if(ap)ap.value='30';
  const pd=document.getElementById('payment-due-days');if(pd)pd.value='30';
  const pb=document.getElementById('payment-balance-basis');if(pb)pb.value='monthly_progress';
  const pc=document.getElementById('payment-custom-text');if(pc)pc.value='';
  const pca=document.getElementById('payment-custom-text-ar');if(pca)pca.value='';
  updatePaymentTermControls();buildTasks();buildCatList();buildEq();buildCustomSOWList();buildConds();recalc();renderQuot();renderQuoteAttachments();
}

function updateCustomSOWLabel(val){
  customSOWLabel = val.trim();
  recalc();renderQuot();
}
function customSOWType(item){return item?.itemType==='main'?'main':item?.itemType==='sub'?'sub':'item'}
function normalizeCustomSOWHierarchy(){
  customSOW.forEach(c=>{
    c.itemType=customSOWType(c);
    c.parentId=c.itemType==='sub'?(c.parentId||''):'';
    if(c.itemType==='main'){c.qty=0;c.unit='';c.unitPrice=0;c.optional=false;c.parentId='';}
  });
}
function nextCustomMainSN(){
  const used=customSOW.filter(c=>customSOWType(c)==='main').map(c=>parseInt(String(c.sn||'').split('.')[0],10)).filter(Number.isFinite);
  return String((used.length?Math.max(...used):0)+1);
}
function nextCustomSubSN(parentId){
  const parent=customSOW.find(c=>c.id===parentId);const prefix=String(parent?.sn||nextCustomMainSN()).trim();
  const used=customSOW.filter(c=>customSOWType(c)==='sub'&&c.parentId===parentId).map(c=>parseInt(String(c.sn||'').split('.').pop(),10)).filter(Number.isFinite);
  return prefix+'.'+String((used.length?Math.max(...used):0)+1);
}
function renumberCustomSubItems(parentId){
  const parent=customSOW.find(c=>c.id===parentId);if(!parent)return;
  const prefix=String(parent.sn||'').trim();let n=1;
  customSOW.forEach(c=>{if(customSOWType(c)==='sub'&&c.parentId===parentId)c.sn=(prefix?prefix+'.':'')+(n++);});
}
function addCustomSOW(kind='item'){
  const ta=document.getElementById('new-sow');
  const raw=ta.value.replace(/\r\n/g,'\n');
  const splitLines=document.getElementById('sow-split-lines')?.checked&&kind!=='main';
  const makeItem=(text)=>({id:'csw'+(sowSeq++),sn:kind==='main'?nextCustomMainSN():'',text,spec:'',remark:'',qty:kind==='main'?0:1,unit:kind==='main'?'':'lot',unitPrice:0,optional:false,itemType:kind==='main'?'main':'item',parentId:''});
  if(splitLines){
    const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
    if(!lines.length)return;
    lines.forEach(text=>customSOW.push(makeItem(text)));
  }else{
    const text=raw.split('\n').map(s=>s.trim()).filter((s,i,arr)=>!(s===''&&(i===0||i===arr.length-1))).join('\n').trim();
    if(!text)return;
    customSOW.push(makeItem(text));
  }
  ta.value='';
  buildCustomSOWList();recalc();renderQuot();
}
function addCustomSubItem(parentId){
  const parent=customSOW.find(c=>c.id===parentId&&customSOWType(c)==='main');if(!parent)return;
  const child={id:'csw'+(sowSeq++),sn:nextCustomSubSN(parentId),text:'',spec:'',remark:'',qty:1,unit:'lot',unitPrice:0,optional:false,itemType:'sub',parentId};
  let insertAt=customSOW.findIndex(c=>c.id===parentId)+1;
  while(insertAt<customSOW.length&&customSOWType(customSOW[insertAt])==='sub'&&customSOW[insertAt].parentId===parentId)insertAt++;
  customSOW.splice(insertAt,0,child);
  renumberCustomSubItems(parentId);
  buildCustomSOWList();recalc();renderQuot();
  setTimeout(()=>document.querySelector(`[data-csw-id="${child.id}"] textarea.csw-item`)?.focus(),0);
}
function removeCustomSOW(id){
  const item=customSOW.find(c=>c.id===id);if(!item)return;
  if(customSOWType(item)==='main'){
    const count=customSOW.filter(c=>c.parentId===id).length;
    if(count&&!confirm(`Remove this main item and its ${count} sub-item(s)?`))return;
    customSOW=customSOW.filter(c=>c.id!==id&&c.parentId!==id);
  }else{
    const parentId=item.parentId||'';
    customSOW=customSOW.filter(c=>c.id!==id);
    if(parentId)renumberCustomSubItems(parentId);
  }
  buildCustomSOWList();recalc();renderQuot();
}
function updateCustomSOW(id,field,val){
  const item=customSOW.find(c=>c.id===id);if(!item)return;
  const type=customSOWType(item);
  if(field==='text')item.text=val;
  else if(field==='sn'){
    item.sn=val;
    if(type==='main')renumberCustomSubItems(id);
  }
  else if(field==='spec')item.spec=val;
  else if(field==='remark')item.remark=val;
  else if(field==='unit'&&type!=='main')item.unit=val;
  else if(field==='qty'&&type!=='main')item.qty=Math.max(0,parseFloat(val)||0);
  else if(field==='unitPrice'&&type!=='main')item.unitPrice=Math.max(0,parseFloat(val)||0);
  else if(field==='optional'&&type!=='main')item.optional=!!val;
  const row=document.querySelector(`[data-csw-id="${id}"]`);
  if(row){
    const totalSpan=row.querySelector('.custom-sow-total');
    if(totalSpan)totalSpan.textContent='SAR '+fmtN((item.qty*item.unitPrice)||0)+(item.optional?' (optional)':'');
  }
  recalc();renderQuot();
}
function toggleCustomSOWOptional(id,checked){
  updateCustomSOW(id,'optional',checked);
  buildCustomSOWList();
}
async function handleQuoteAttachFiles(input){
  const files=Array.from(input.files||[]);input.disabled=true;setCloudStatus('saving','Uploading document…');
  try{
    for(const file of files){const qno=document.getElementById('qno')?.value||activeQuoteId||'draft';quoteAttachments.push(await sfUploadDocument(file,'quotation',qno));renderQuoteAttachments()}
    setCloudStatus('','Documents uploaded securely');
  }catch(error){console.error('Quotation document upload failed',error);alert('Document upload failed. Ensure the Supabase Storage SQL setup has been applied.\n'+(error?.message||error));setCloudStatus('error','Upload failed')}
  finally{input.disabled=false;input.value=''}
}
function removeQuoteAttachment(i){if(!quoteAttachments[i])return;quoteAttachments.splice(i,1);renderQuoteAttachments()}
function openQuoteAttachment(i){sfOpenDocumentRecord(quoteAttachments[i])}

function renderQuoteAttachments(){
  const el=document.getElementById('qa-list'); if(!el)return;
  if(!quoteAttachments.length){
    el.innerHTML='<div style="font-size:11px;color:var(--gray-400)">No files attached to this quotation yet.</div>';
    return;
  }
  el.innerHTML = quoteAttachments.map((f,i)=>`
    <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;background:var(--gray-100);border-radius:6px;padding:6px 10px">
      <span style="flex:1">📎 <button type="button" onclick="openQuoteAttachment(${i})" style="background:none;border:none;padding:0;color:var(--orange);cursor:pointer;font:inherit;text-align:left">${escHtml(f.name)}</button></span>
      <button onclick="removeQuoteAttachment(${i})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px">×</button>
    </div>`).join('');
}
function autoGrowCSW(el){ el.style.height='auto'; el.style.height=(el.scrollHeight+2)+'px'; }
function buildCustomSOWList(){
  const el=document.getElementById('custom-sow-list');if(!el)return;el.innerHTML='';
  normalizeCustomSOWHierarchy();
  customSOW.forEach(c=>{
    const type=customSOWType(c);const isMain=type==='main';
    const row=document.createElement('div');
    row.dataset.cswId=c.id;
    row.className='custom-sow-row is-'+type+(c.optional?' is-optional':'');
    const total=isMain?0:(c.qty*c.unitPrice)||0;
    if(isMain){
      const childCount=customSOW.filter(x=>customSOWType(x)==='sub'&&x.parentId===c.id).length;
      row.innerHTML=`
        <div class="csw-row-top">
          <div class="csw-field csw-sn-field"><label>SN</label><input type="text" placeholder="1" value="${escHtml(c.sn||'')}" oninput="updateCustomSOW('${c.id}','sn',this.value)"></div>
          <div class="csw-field csw-item-field"><label>Main Item / Heading</label><textarea class="csw-item" rows="1" placeholder="Main scope heading…" oninput="autoGrowCSW(this);updateCustomSOW('${c.id}','text',this.value)">${escHtml(c.text||'')}</textarea></div>
          <div class="csw-field csw-opt-field"><label>Type</label><span class="csw-type-badge main">Main</span></div>
          <button class="rm-btn csw-rm-btn" onclick="removeCustomSOW('${c.id}')" title="Remove main item">×</button>
        </div>
        <div class="csw-main-actions" style="margin-top:9px">
          <button class="btn-sm" onclick="addCustomSubItem('${c.id}')">+ Add Sub-item ${escHtml(c.sn||'')}.${childCount+1}</button>
          <span style="font-size:10.5px;color:var(--gray-500)">${childCount} sub-item${childCount===1?'':'s'} · main headings have no quantity or price</span>
        </div>`;
    }else{
      const parent=type==='sub'?customSOW.find(x=>x.id===c.parentId):null;
      row.innerHTML=`
        <div class="csw-row-top">
          <div class="csw-field csw-sn-field"><label>SN</label><input type="text" placeholder="${type==='sub'?'1.1':'1'}" value="${escHtml(c.sn||'')}" oninput="updateCustomSOW('${c.id}','sn',this.value)"></div>
          <div class="csw-field csw-item-field"><label>${type==='sub'?'Sub-item':'Item'}</label><textarea class="csw-item" rows="1" oninput="autoGrowCSW(this);updateCustomSOW('${c.id}','text',this.value)">${escHtml(c.text||'')}</textarea></div>
          <div class="csw-field csw-opt-field"><label>${type==='sub'?'Sub / Optional':'Optional'}</label>${type==='sub'?`<span class="csw-type-badge sub" title="Under ${escHtml(parent?.sn||'main item')}">Sub</span><span class="custom-sow-opt-wrap" title="Mark as optional offer"><input type="checkbox" ${c.optional?'checked':''} onchange="toggleCustomSOWOptional('${c.id}',this.checked)"></span>`:`<span class="custom-sow-opt-wrap" title="Mark as optional offer (excluded from Grand Total, listed separately in report)"><input type="checkbox" ${c.optional?'checked':''} onchange="toggleCustomSOWOptional('${c.id}',this.checked)"></span>`}</div>
          <button class="rm-btn csw-rm-btn" onclick="removeCustomSOW('${c.id}')" title="Remove">×</button>
        </div>
        <div class="csw-row-mid">
          <div class="csw-field"><label>Specification</label><textarea class="csw-spec" rows="2" placeholder="Detailed specification…" oninput="autoGrowCSW(this);updateCustomSOW('${c.id}','spec',this.value)">${escHtml(c.spec||'')}</textarea></div>
          <div class="csw-field"><label>Remark</label><textarea class="csw-remark" rows="1" placeholder="Remark…" oninput="autoGrowCSW(this);updateCustomSOW('${c.id}','remark',this.value)">${escHtml(c.remark||'')}</textarea></div>
        </div>
        <div class="csw-row-bottom">
          <div class="csw-field csw-qty-field"><label>Qty</label><input type="text" class="qty-inp" style="width:100%" value="${c.qty}" oninput="updateCustomSOW('${c.id}','qty',this.value)"></div>
          <div class="csw-field csw-unit-field"><label>Unit</label><input type="text" class="qty-inp" style="width:100%" value="${escHtml(c.unit||'')}" oninput="updateCustomSOW('${c.id}','unit',this.value)"></div>
          <div class="csw-field csw-price-field"><label>Unit Price (SAR)</label><input type="text" class="qty-inp" style="width:100%" value="${c.unitPrice}" oninput="updateCustomSOW('${c.id}','unitPrice',this.value)"></div>
          <div class="csw-field csw-total-field"><label>Total</label><span class="custom-sow-total${c.optional?' is-optional-total':''}">SAR ${fmtN(total)}${c.optional?' (optional)':''}</span></div>
        </div>`;
    }
    el.appendChild(row);row.querySelectorAll('textarea').forEach(t=>autoGrowCSW(t));
  });
}
function sfCompanyConditionDefaults(){try{return JSON.parse(localStorage.getItem(SF_COMPANY_CONDITION_DEFAULTS_KEY)||'{}')}catch(_error){return {}}}
function conditionDefaultKey(type,number){return `${type||'testing'}:${number}`}
function conditionAlpha(value){let n=Math.max(1,parseInt(value)||1),out='';while(n){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26)}return out}
function normalizeConditionMetadata(list,type=conditionType){
  let core=0;
  const defaults=sfCompanyConditionDefaults();
  (Array.isArray(list)?list:[]).forEach((c,index)=>{
    c.custom=!!c.custom||c.cat==='Custom';
    c.id=c.id||`${c.custom?'custom':'core'}_${Date.now()}_${index}_${Math.floor(Math.random()*10000)}`;
    if(c.custom){c.section=c.section||'Liability & General';c.defaultText=c.defaultText??c.text;c.defaultTextAr=c.defaultTextAr??c.textAr;return}
    core++;
    c.coreNumber=core;
    const saved=defaults[conditionDefaultKey(type,core)];
    if(saved&&c.defaultText==null&&!c.modified){c.text=saved.text||c.text;c.textAr=saved.textAr||c.textAr}
    c.defaultText=c.defaultText??c.text;c.defaultTextAr=c.defaultTextAr??c.textAr;
  });
  return list;
}
function conditionDisplayNumbers(list=conds){
  const maxBySection={};
  list.forEach(c=>{if(c.custom)return;const sec=condSection(c.cat,c);maxBySection[sec]=Math.max(maxBySection[sec]||0,c.coreNumber||0)});
  const counts={};
  return list.map(c=>{
    if(!c.custom)return String(c.coreNumber||'');
    const sec=condSection(c.cat,c),base=maxBySection[sec]||46;
    counts[sec]=(counts[sec]||0)+1;
    return `${base}${conditionAlpha(counts[sec])}`;
  });
}
// Printed terms are grouped by section and numbered 1, 2, 3… in the order they appear.
// coreNumber stays the internal key for saved company wording and the editor list.
function conditionPrintGroups(activeList){
  const groups={};
  activeList.forEach(c=>{const sec=condSection(c.cat,c);(groups[sec]=groups[sec]||[]).push(c)});
  let number=0;
  return COND_SECTION_ORDER.filter(sec=>groups[sec]&&groups[sec].length)
    .map(sec=>({section:sec,items:groups[sec].map(condition=>({condition,number:String(++number)}))}));
}

function conditionTypeKey(type){return Object.prototype.hasOwnProperty.call(QUOTATION_CONDITION_TYPES,type)?type:'testing'}
function conditionTypeInfo(type=conditionType){return QUOTATION_CONDITION_TYPES[conditionTypeKey(type)]}
function conditionTemplate(type){
  const info=conditionTypeInfo(type),source=info.conds,sourceAr=info.ar;
  const list=source
    .map(([text,cat,enabled],i)=>cat==='Payment – Bank'
      ? {text:paymentBankConditionText('en'),textAr:paymentBankConditionText('ar'),cat,enabled}
      : {text,textAr:sourceAr[i]||'',cat,enabled})
    .filter(c=>c.cat!=='Payment');
  const idx=Math.max(0,list.findIndex(c=>c.cat==='Payment – Late'));
  const pay={text:paymentConditionText('en'),textAr:paymentConditionText('ar'),cat:'Payment – Selected',enabled:true};
  if(idx>=0) list.splice(idx,0,pay); else list.unshift(pay);
  return normalizeConditionMetadata(list,type);
}
// Drafts belong to the current quotation only; switching templates never silently loses edits.
let conditionTypeDrafts=new Map();
function setConditionType(type, preserveCustom=false){
  const next=conditionTypeKey(type),sel=document.getElementById('condition-type');
  if(next===conditionType&&conds.length)return;
  if(conds.length&&!confirm(sfUiLanguage==='ar'
    ?'تغيير نوع العرض سيعرض شروط النوع الجديد. ستبقى تعديلات النوع الحالي محفوظة عند الرجوع إليه في هذا العرض. هل تريد المتابعة؟'
    :'Switch quotation type? The new type has its own terms. Your current edits will be restored when you switch back in this quotation.')){
    if(sel)sel.value=conditionType;return false;
  }
  conditionTypeDrafts.set(conditionType,JSON.parse(JSON.stringify(conds)));
  const custom=preserveCustom?conds.filter(c=>c.custom||c.cat==='Custom'):[];
  conditionType=next;
  conds=normalizeConditionMetadata(conditionTypeDrafts.has(next)
    ?JSON.parse(JSON.stringify(conditionTypeDrafts.get(next)))
    :conditionTemplate(next).concat(custom),next);
  if(sel)sel.value=next;
  buildConds();renderQuot();return true;
}
function sfNumberWithDigits(value,lang='en'){
  const n=Math.max(0,parseInt(value)||0),words=lang==='ar'?SF_AR_NUMBER_WORDS:SF_EN_NUMBER_WORDS;
  return words[n]?`${words[n]} (${n})`:String(n);
}
function isConditionEmphasized(cat=''){
  return cat==='Payment – Selected' || cat==='General – Extension Rates' || cat==='General – Mobilization & Demobilization';
}
function durationConditionText(lang='en'){
  if(conditionTypeKey(conditionType)==='equipment_rental')return lang==='ar'
    ? `مدة التأجير: مدة تأجير الأجهزة بموجب هذا العرض هي ${projectDuration||'[تُحدد لاحقًا]'}، وتبدأ من تاريخ تسليم الأجهزة للعميل أو شحنها.`
    : `Rental Duration: the equipment rental period under this offer is ${projectDuration||'[TBD]'}, commencing from the date the equipment is handed over to the Client or dispatched.`;
  const engineerRental=!!conditionTypeInfo().engineerRental;
  if(lang==='ar')return engineerRental
    ? `مدة المهمة: مدة تأجير المهندس بموجب هذا العرض هي ${projectDuration||'[تُحدد لاحقًا]'}، وتبدأ من تاريخ التعبئة أو البدء المؤكد.`
    : `مدة المشروع: المدة الإجمالية لتنفيذ نطاق العمل بموجب هذا العرض هي ${projectDuration||'[تُحدد لاحقًا]'}، وتبدأ من تاريخ التعبئة ما لم يتم تمديدها باتفاق كتابي متبادل.`;
  return engineerRental
    ? `Assignment Duration: the engineer rental period under this offer is ${projectDuration||'[TBD]'}, commencing from the confirmed mobilization/start date.`
    : `Project Duration: the total duration for execution of the Scope of Work under this offer is ${projectDuration||'[TBD]'}, commencing from the mobilization date, unless otherwise extended by mutual written agreement.`;
}
function buildConds(){
  const el=document.getElementById('cond-list'); el.innerHTML='';
  normalizeConditionMetadata(conds,conditionType);
  const numbers=conditionDisplayNumbers(conds);
  const groups={};
  conds.forEach((c,i)=>{ const sec=condSection(c.cat,c); (groups[sec]=groups[sec]||[]).push(i); });
  COND_SECTION_ORDER.concat(Object.keys(groups).filter(s=>!COND_SECTION_ORDER.includes(s))).forEach(sec=>{
    const idxs=groups[sec]; if(!idxs||!idxs.length)return;
    const h=document.createElement('div');
    h.className='cond-sec-hdr';
    h.innerHTML=`<span>${escHtml(conditionSectionLabel(sec))}</span><button type="button" class="cond-sec-add" onclick='openSectionConditionEditor(${JSON.stringify(sec)})'>+ Add Condition</button>`;
    el.appendChild(h);
    if(sec===conditionTypeInfo().durationSection){
      const d=document.createElement('div');
      d.className='cond-item';
      const durationCond={text:durationConditionText('en'),textAr:durationConditionText('ar'),cat:'Duration'};
      d.innerHTML=`<input type="checkbox" checked disabled aria-labelledby="cond-text-duration">
        <div style="flex:1"><div class="cond-text" id="cond-text-duration"><strong>${conditionCopyHtml(durationCond,false)}</strong></div><div class="cond-cat">${conditionLanguage==='ar'?'يُنشأ تلقائيًا من حقل مدة المشروع أعلاه':conditionLanguage==='both'?'Auto-generated from Project Duration / يُنشأ تلقائيًا من مدة المشروع':'Auto-generated from Project Duration field above'}</div></div>
        <span></span>`;
      el.appendChild(d);
    }
    idxs.forEach(i=>{
      const c=conds[i];
      const d=document.createElement('div');
      d.className='cond-item';
      d.innerHTML=`<input type="checkbox" aria-labelledby="cond-text-${i}" ${c.enabled?'checked':''} onchange="conds[${i}].enabled=this.checked;renderQuot()">
        <div style="flex:1"><div class="cond-text${isConditionEmphasized(c.cat)?' cond-emphasis':''}" id="cond-text-${i}">${conditionCopyHtml(c,false)}</div><div class="cond-cat">Condition ${escHtml(numbers[i])} · ${escHtml(conditionCategoryLabel(c.cat))}${c.modified?'<span class="cond-modified">Modified</span>':''}</div></div>
        <div class="cond-actions"><button class="cond-edit" onclick="openConditionEditor(${i})" title="Edit">✎ Edit</button>${c.modified?`<button class="cond-reset" onclick="resetConditionAt(${i})" title="Reset">↺</button>`:''}${c.custom?`<button class="cond-rm" onclick="removeCustomCondition(${i})" title="Remove">×</button>`:''}</div>`;
      el.appendChild(d);
    });
  });
}
function fillConditionSectionSelect(selected,locked=false){
  const select=document.getElementById('condition-edit-section');if(!select)return;
  select.innerHTML=COND_SECTION_ORDER.map(sec=>`<option value="${escHtml(sec)}">${escHtml(conditionSectionLabel(sec))}</option>`).join('');
  select.value=selected||'Liability & General';select.disabled=!!locked;
}
function openConditionEditor(index){
  const c=conds[index];if(!c)return;
  conditionEditorMode='edit';conditionEditorIndex=index;conditionEditorSection=condSection(c.cat,c);
  document.getElementById('condition-modal-title').textContent=c.cat==='Payment – Selected'?'Customize Payment Condition':'Edit Condition';
  document.getElementById('condition-edit-en').value=c.text||'';
  document.getElementById('condition-edit-ar').value=c.textAr||'';
  fillConditionSectionSelect(conditionEditorSection,!c.custom);
  const number=conditionDisplayNumbers(conds)[index]||'Automatic';document.getElementById('condition-edit-number').innerHTML=`<option>${escHtml(number)}</option>`;
  const saveDefault=document.getElementById('condition-save-default');if(saveDefault)saveDefault.style.display=sfIsAdmin()&&!c.custom&&c.cat!=='Payment – Selected'?'':'none';
  document.getElementById('condition-modal-overlay').classList.add('show');
}
function openSectionConditionEditor(section){
  conditionEditorMode='add';conditionEditorIndex=-1;conditionEditorSection=section||'Liability & General';
  document.getElementById('condition-modal-title').textContent='Add Condition to '+conditionSectionLabel(conditionEditorSection);
  document.getElementById('condition-edit-en').value='';document.getElementById('condition-edit-ar').value='';
  fillConditionSectionSelect(conditionEditorSection,false);document.getElementById('condition-edit-number').innerHTML='<option>Automatic suffix</option>';
  const saveDefault=document.getElementById('condition-save-default');if(saveDefault)saveDefault.style.display='none';
  document.getElementById('condition-modal-overlay').classList.add('show');
}
function closeConditionEditor(){document.getElementById('condition-modal-overlay')?.classList.remove('show');conditionEditorIndex=-1}
function saveConditionEditor(){
  const en=document.getElementById('condition-edit-en')?.value.trim()||'';
  const ar=document.getElementById('condition-edit-ar')?.value.trim()||'';
  const section=document.getElementById('condition-edit-section')?.value||conditionEditorSection||'Liability & General';
  if(!en&&!ar){alert('Enter the condition in English or Arabic.');return}
  if(conditionEditorMode==='add'){
    conds.push({id:`custom_${Date.now()}_${Math.floor(Math.random()*10000)}`,text:en||ar,textAr:ar,cat:'Custom',section,custom:true,enabled:true,modified:true,defaultText:en||ar,defaultTextAr:ar});
  }else{
    const c=conds[conditionEditorIndex];if(!c)return;
    c.text=en||ar;c.textAr=ar;c.modified=true;if(c.custom)c.section=section;
    if(c.cat==='Payment – Selected'){paymentConditionOverrideEn=c.text;paymentConditionOverrideAr=c.textAr}
  }
  normalizeConditionMetadata(conds,conditionType);closeConditionEditor();buildConds();renderQuot();
}
function resetConditionAt(index){
  const c=conds[index];if(!c)return;
  if(c.cat==='Payment – Selected'){paymentConditionOverrideEn='';paymentConditionOverrideAr='';refreshPaymentCondition()}
  else{c.text=c.defaultText||c.text;c.textAr=c.defaultTextAr||'';c.modified=false}
  buildConds();renderQuot();
}
function resetConditionEditor(){
  if(conditionEditorMode==='add'){document.getElementById('condition-edit-en').value='';document.getElementById('condition-edit-ar').value='';return}
  resetConditionAt(conditionEditorIndex);closeConditionEditor();
}
function removeCustomCondition(index){const c=conds[index];if(!c?.custom)return;if(confirm('Remove this custom condition?')){conds.splice(index,1);buildConds();renderQuot()}}
function saveConditionAsCompanyDefault(){
  if(!sfIsAdmin()){alert('Only an Administrator can change company defaults.');return}
  const c=conds[conditionEditorIndex];if(!c||c.custom||c.cat==='Payment – Selected')return;
  const en=document.getElementById('condition-edit-en')?.value.trim()||c.text,ar=document.getElementById('condition-edit-ar')?.value.trim()||'';
  const defaults=sfCompanyConditionDefaults();defaults[conditionDefaultKey(conditionType,c.coreNumber)]={text:en,textAr:ar,updatedAt:new Date().toISOString()};
  localStorage.setItem(SF_COMPANY_CONDITION_DEFAULTS_KEY,JSON.stringify(defaults));c.text=en;c.textAr=ar;c.defaultText=en;c.defaultTextAr=ar;c.modified=false;
  closeConditionEditor();buildConds();renderQuot();alert('Company default updated for this condition.');
}

function recalc(){
  let actH=0,eqC=0,customC=0,optionalC=0;
  Object.entries(selActs).forEach(([ky,a])=>{ actH+=a.dur*(actQty[ky]||1); });
  customSOW.forEach(c=>{ if(customSOWType(c)==='main')return; if(c.optional) optionalC+=c.qty*c.unitPrice; else customC+=c.qty*c.unitPrice; });
  Object.entries(selEq).forEach(([i,e])=>{ eqC+=e.daily*(eqQty[i]||1); });
  const days=actH/hpd(), engC=days*rate()+customC;
  const baseSub=engC+eqC, subBeforeDiscount=baseSub*(1+profitPct()/100);
  const discA=discountAmountFor(subBeforeDiscount), sub=subBeforeDiscount-discA;
  const vatA=sub*vatPct()/100, tot=sub+vatA;
  const commA=sub*commissionPct()/100, netTot=tot-commA; // commission on the amount before VAT
  document.getElementById('s-act').textContent=Object.keys(selActs).length+customSOW.length;
  document.getElementById('s-eq').textContent=Object.keys(selEq).length;
  document.getElementById('s-hrs').textContent=actH.toFixed(2);
  document.getElementById('s-eng').textContent='SAR '+fmtN(engC);
  document.getElementById('s-eqc').textContent='SAR '+fmtN(eqC);
  document.getElementById('s-tot').textContent='SAR '+fmtN(tot);
  const sOpt=document.getElementById('s-opt');
  if(optionalC>0){ sOpt.style.display='block'; sOpt.textContent='+ SAR '+fmtN(optionalC)+' optional (not included)'; }
  else { sOpt.style.display='none'; }
  const discCard=document.getElementById('s-disc-card');
  if(discA>0){
    discCard.style.display='block';
    document.getElementById('s-disc-sub').textContent='SAR '+fmtN(subBeforeDiscount)+' → - SAR '+fmtN(discA)+' discount ('+(discountType()==='fixed'?'fixed':discountValue()+'%')+')';
    document.getElementById('s-discsub').textContent='SAR '+fmtN(sub);
  } else {
    discCard.style.display='none';
  }
  const commCard=document.getElementById('s-comm-card');
  if(commA>0){
    commCard.style.display='block';
    document.getElementById('s-nettot').textContent='SAR '+fmtN(netTot);
    document.getElementById('s-comm-sub').textContent='- SAR '+fmtN(commA)+' commission ('+commissionPct()+'% of amount before VAT)';
  } else {
    commCard.style.display='none';
  }
  document.getElementById('tab-act-badge').textContent=Object.keys(selActs).length+customSOW.length;
  document.getElementById('tab-eq-badge').textContent=Object.keys(selEq).length;
  document.getElementById('b-items').textContent=Object.keys(selActs).length+customSOW.length+Object.keys(selEq).length;
  document.getElementById('b-hrs').textContent=actH.toFixed(2);
  document.getElementById('b-eng').textContent='SAR '+fmtN(engC);
  document.getElementById('b-eq').textContent='SAR '+fmtN(eqC);
  document.getElementById('b-sub').textContent='SAR '+fmtN(sub);
  document.getElementById('b-vat').textContent='SAR '+fmtN(vatA);
  document.getElementById('b-tot').textContent='SAR '+fmtN(tot);
  const bCommRow=document.getElementById('b-comm-row');
  if(commA>0){
    bCommRow.style.display='';
    document.getElementById('b-comm').textContent='- SAR '+fmtN(commA)+' ('+commissionPct()+'% before VAT)';
    document.getElementById('b-nettot').textContent='SAR '+fmtN(netTot);
  } else {
    bCommRow.style.display='none';
  }
  updateLcAmountSummary();
}

function renderQuot(){
  const tbody=document.getElementById('q-tbody');
  const sec=document.getElementById('quot-sec');
  const actKeys=Object.keys(selActs), eqKeys=Object.keys(selEq);
  if(!actKeys.length&&!eqKeys.length&&!customSOW.length){sec.style.display='none';return;}
  sec.style.display='block'; tbody.innerHTML='';
  if(actKeys.length||customSOW.length){
    const hr=document.createElement('tr');
    hr.innerHTML=`<td colspan="7" class="sect-label">Scope of Work</td>`;
    tbody.appendChild(hr);
    actKeys.forEach(ky=>{
      const a=selActs[ky];const q=actQty[ky]||1;
      const hrs=(a.dur*q);const cost=hrs/hpd()*rate();
      const tr=document.createElement('tr');
      tr.innerHTML=`<td style="font-size:10px;color:var(--gray-500)">${escHtml(a.cat)}</td><td>${escHtml(a.task)}</td>
        <td style="font-family:monospace;font-size:10px;color:var(--gray-500)">${escHtml(a.code)}</td>
        <td><input class="qty-inp" type="number" min="1" value="${q}"></td>
        <td style="font-weight:600;color:var(--navy-mid)">${hrs.toFixed(2)}h</td>
        <td style="font-weight:600">SAR ${fmtN(cost)}</td>
        <td><button class="rm-btn" type="button">×</button></td>`;
      tr.querySelector('input').oninput=event=>setActQty(ky,event.target.value,a.cat,a.task,a.code,a.dur,a.unit);
      tr.querySelector('button').onclick=()=>{delete selActs[ky];delete actQty[ky];buildCatList();buildTasks();recalc();renderQuot()};
      tbody.appendChild(tr);
    });
    customSOW.forEach(c=>{
      const type=customSOWType(c);const total=type==='main'?0:c.qty*c.unitPrice;
      const tr=document.createElement('tr');
      if(type==='main'){
        tr.style.background='var(--navy-light)';
        tr.innerHTML=`<td style="font-size:10px;color:var(--navy);font-weight:800">MAIN</td><td colspan="4" style="white-space:pre-line;font-weight:800;color:var(--navy)">${c.sn?`<strong>${escHtml(c.sn)}.</strong> `:''}${escHtml(c.text)}</td><td></td><td><button class="rm-btn" onclick="removeCustomSOW('${c.id}')">×</button></td>`;
      }else{
        if(c.optional)tr.style.background='var(--orange-light)';
        const subLines=[c.spec?`<span style="color:var(--gray-500)">Spec: ${escHtml(c.spec)}</span>`:'',c.remark?`<span style="color:var(--gray-500)">Remark: ${escHtml(c.remark)}</span>`:''].filter(Boolean).join('<br>');
        tr.innerHTML=`<td style="font-size:10px;color:var(--gray-500)">${c.optional?'Optional':type==='sub'?'Sub-item':'Custom'}</td><td style="white-space:pre-line;${type==='sub'?'padding-left:18px':''}">${c.sn?`<strong>${escHtml(c.sn)}.</strong> `:''}${escHtml(c.text)}${c.optional?' <span style="font-size:10px;color:var(--orange);font-weight:700">(OPTIONAL — not in total)</span>':''}${subLines?`<br><span style="font-size:10px">${subLines}</span>`:''}</td>
          <td style="font-size:10px;color:var(--gray-500)">manual / ${escHtml(c.unit)}</td>
          <td><input class="qty-inp" type="number" min="0" value="${c.qty}" oninput="updateCustomSOW('${c.id}','qty',this.value)"></td>
          <td style="font-weight:600;color:var(--navy-mid)">SAR ${fmtN(c.unitPrice)}</td>
          <td style="font-weight:600;${c.optional?'color:var(--orange)':''}">SAR ${fmtN(total)}${c.optional?' *':''}</td>
          <td><button class="rm-btn" onclick="removeCustomSOW('${c.id}')">×</button></td>`;
      }
      tbody.appendChild(tr);
    });
  }
  if(eqKeys.length){
    const hr=document.createElement('tr');
    hr.innerHTML=`<td colspan="7" class="sect-label">Equipment Rental</td>`;
    tbody.appendChild(hr);
    eqKeys.forEach(i=>{
      const e=selEq[i];const q=eqQty[i]||1;const cost=e.daily*q;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td style="font-size:10px;color:var(--gray-500)">Equipment</td><td>${escHtml(e.kit)}</td>
        <td style="font-size:10px;color:var(--gray-500)">${escHtml(e.mfr)}</td>
        <td><input class="qty-inp" type="number" min="1" value="${q}"></td>
        <td style="font-weight:600;color:var(--navy-mid)">${q} ${sfEqUnitWord(sfEqUnitOf(e),q,'en')}</td>
        <td style="font-weight:600">SAR ${fmtN(cost)}</td>
        <td><button class="rm-btn" type="button">×</button></td>`;
      tr.querySelector('input').oninput=event=>setEqQty(i,event.target.value,e.kit,e.mfr,e.daily);
      tr.querySelector('button').onclick=()=>removeSelectedEquipment(i);
      tbody.appendChild(tr);
    });
  }
}

// ── EXPORT OPTIONS HELPERS ──────────────────────────────────────────────────
function toggleExportOptsPanel(){
  document.getElementById('export-opts').classList.toggle('collapsed');
}
function onActSectionToggle(){
  const on=document.getElementById('eo-act-show').checked;
  document.getElementById('eo-act-group').classList.toggle('disabled',!on);
  recalc();
}
function onEqSectionToggle(){
  const on=document.getElementById('eo-eq-show').checked;
  document.getElementById('eo-eq-group').classList.toggle('disabled',!on);
  recalc();
}
function eoSetEqCols(on){
  ['eo-eq-mfr','eo-eq-daily','eo-eq-days','eo-eq-total'].forEach(id=>{
    document.getElementById(id).checked=on;
  });
  recalc();
}
function getExportOpts(){
  const g=id=>document.getElementById(id).checked;
  return {
    showEngRate:g('eo-info-rate'),
    actShow:g('eo-act-show'),
    actCodeCol:g('eo-act-code'),
    actQtyCol:g('eo-act-qty'), actHrsCol:g('eo-act-hrs'), actCostCol:g('eo-act-cost'),
    eqShow:g('eo-eq-show'), eqMfrCol:g('eo-eq-mfr'), eqDailyCol:g('eo-eq-daily'),
    eqDaysCol:g('eo-eq-days'), eqTotalCol:g('eo-eq-total'),
    sumHrs:g('eo-sum-hrs'), sumDays:g('eo-sum-days'), sumEng:g('eo-sum-eng'),
    sumEqRental:g('eo-sum-eqrental'), sumSub:g('eo-sum-sub'), sumVat:g('eo-sum-vat'), sumTot:g('eo-sum-tot'),
    sigSkyfield:g('eo-sig-skyfield'), sigClient:g('eo-sig-client')
  };
}
function showExport(docType='quotation'){
  const actKeys=Object.keys(selActs), eqKeys=Object.keys(selEq);
  if(!actKeys.length&&!eqKeys.length&&!customSOW.length){alert('No items selected.');return;}
  activeExportDocType=docType;
  const isInvoice = docType === 'invoice';
  const docTitle = isInvoice
    ? quotationLabel('INVOICE QUOTATION','عرض سعر للفاتورة')
    : quotationLabel('TESTING AND COMMISSIONING QUOTATION','عرض سعر لأعمال الاختبارات والتشغيل');
  const refLabel = isInvoice
    ? quotationLabel('Invoice Quotation Reference','مرجع عرض سعر الفاتورة')
    : quotationLabel('Quotation Reference','مرجع عرض السعر');
  const client=escHtml(document.getElementById('client').value||'[Client Name]');
  const clientAttn=escHtml(document.getElementById('client-attn').value.trim());
  const clientTel=escHtml(document.getElementById('client-tel').value.trim());
  const clientEmail=escHtml(document.getElementById('client-email').value.trim());
  const projName=escHtml(document.getElementById('proj-name').value.trim())||'Testing &amp; Commissioning';
  const stationName=escHtml(document.getElementById('station-name')?.value.trim()||'');
  const qoRef=escHtml(document.getElementById('qo-ref').value.trim());
  const rawQno=document.getElementById('qno').value||'SF-Q-2025-001';
  const qno=escHtml(isInvoice ? invoiceNumberFromQuote(rawQno) : rawQno);
  const dt=document.getElementById('qdate').value||sfRiyadhToday();
  const prepName=escHtml(document.getElementById('prep-name').value.trim());
  const prepEmail=escHtml(document.getElementById('prep-email').value.trim());
  const substation=escHtml(document.getElementById('substation').value.trim())||'132 / 33 / 13.8 kV Substation';
  const headerCompanyName=conditionLanguage==='both'
    ? '<span dir="ltr">Sky Field Company Limited</span> / <span dir="rtl">شركة سماء الميدان المحدودة</span>'
    : '<span dir="ltr">Sky Field Company Limited</span>';
  const r=rate(),h=hpd(),v=vatPct();
  const opt=getExportOpts();
  let actH=0,eqC=0,customC=0;
  const activeConds=conds.filter(c=>c.enabled);

  // Build activity rows by category
  const catGroups={};
  actKeys.forEach(ky=>{
    const a=selActs[ky];const q=actQty[ky]||1;const hrs=a.dur*q;
    actH+=hrs;
    if(!catGroups[a.cat])catGroups[a.cat]=[];
    catGroups[a.cat].push({...a,q,hrs,cost:hrs/h*r,isCustom:false});
  });
  normalizeCustomSOWHierarchy();
  const requiredCustomSOW = customSOW.filter(c=>!c.optional);
  const optionalCustomSOW = customSOW.filter(c=>c.optional&&customSOWType(c)!=='main');
  if(requiredCustomSOW.length){
    const catLabel = customSOWLabel || 'ADDITIONAL SCOPE OF WORK';
    catGroups[catLabel]=requiredCustomSOW.map(c=>{
      const itemType=customSOWType(c);const cost=itemType==='main'?0:c.qty*c.unitPrice;if(itemType!=='main')customC+=cost;
      return {task:c.text,sn:c.sn,spec:c.spec,remark:c.remark,code:'manual',q:itemType==='main'?'':c.qty,unit:itemType==='main'?'':c.unit,unitPrice:itemType==='main'?0:c.unitPrice,cost,isCustom:true,itemType,parentId:c.parentId||''};
    });
  }
  let optionalC=0;
  const optionalRows = optionalCustomSOW.map(c=>{
    const cost=c.qty*c.unitPrice; optionalC+=cost;
    return {task:c.text,sn:c.sn,spec:c.spec,remark:c.remark,q:c.qty,unit:c.unit,unitPrice:c.unitPrice,cost};
  });
  const eqRowsAll=eqKeys.map(i=>{
    const e=selEq[i];const q=eqQty[i]||1;const cost=e.daily*q;
    eqC+=cost;return {...e,q,cost};
  });
  const eqRows = opt.eqShow ? eqRowsAll : [];
  const showAct = opt.actShow;
  const engC=actH/h*r+customC, baseSub=engC+eqC, subBeforeDiscount=baseSub*(1+profitPct()/100);
  const discA=discountAmountFor(subBeforeDiscount), sub=subBeforeDiscount-discA;
  const vatA=sub*v/100, tot=sub+vatA;
  const commPct=commissionPct(), commA=sub*commPct/100, netTot=tot-commA; // commission on the amount before VAT

  // ── Activities table: dynamic columns ──
  // SN and Specification and Remark are always present (custom rows fill them, standard rows leave them blank).
  // Activity/Test is always shown. Code, Qty, Unit / Hours / Cost are optional.
  const hasCustomRows = requiredCustomSOW.length > 0;
  // SN col (width ~55px), Specification col, Remark col — always rendered when any custom rows exist
  const snColCount   = hasCustomRows ? 1 : 0;
  const specColCount = hasCustomRows ? 1 : 0;
  const remColCount  = hasCustomRows ? 1 : 0;
  const actColCount  = snColCount + 1 + specColCount + (opt.actCodeCol?1:0) + (opt.actQtyCol?2:0) + (opt.actHrsCol?1:0) + remColCount + (opt.actCostCol?1:0);
  // Build an exact width map for whichever optional columns are visible.
  // The weights are normalized to 100%, so enabling Rate never squeezes it
  // between Unit and Remark or forces its heading to render letter-by-letter.
  const actColumnDefs = hasCustomRows
    ? [
        ['sn',5],['item',18],['spec',22],
        ...(opt.actCodeCol?[['code',6]]:[]),
        ...(opt.actQtyCol?[['qty',5],['unit',7]]:[]),
        ...(opt.actHrsCol?[['rate',12]]:[]),
        ['remark',15],
        ...(opt.actCostCol?[['total',10]]:[])
      ]
    : [
        ['item',45],
        ...(opt.actCodeCol?[['code',12]]:[]),
        ...(opt.actQtyCol?[['qty',8],['unit',10]]:[]),
        ...(opt.actHrsCol?[['rate',12]]:[]),
        ...(opt.actCostCol?[['total',13]]:[])
      ];
  const actColumnWeight = actColumnDefs.reduce((sum,col)=>sum+col[1],0) || 1;
  const actColgroup = `<colgroup>${actColumnDefs.map(([name,weight])=>`<col class="col-${name}" style="width:${(weight/actColumnWeight*100).toFixed(3)}%">`).join('')}</colgroup>`;
  let actHeadCells = '';
  if(hasCustomRows) actHeadCells += `<th class="col-sn" style="text-align:center">${quotationLabel('SN.','م')}</th>`;
  actHeadCells += `<th class="col-item">${quotationLabel('Activity / Item','النشاط / البند')}</th>`;
  if(hasCustomRows) actHeadCells += `<th class="col-spec">${quotationLabel('Specification','المواصفات')}</th>`;
  if(opt.actCodeCol) actHeadCells += `<th class="col-code">${quotationLabel('Code','الكود')}</th>`;
  if(opt.actQtyCol) actHeadCells += `<th class="col-qty" style="text-align:right">${quotationLabel('QTY','الكمية')}</th><th class="col-unit" style="text-align:right">${quotationLabel('Unit','الوحدة')}</th>`;
  if(opt.actHrsCol) actHeadCells += `<th class="col-rate" style="text-align:right">${quotationLabel('Hours / Rate','الساعات / السعر')}</th>`;
  if(hasCustomRows) actHeadCells += `<th class="col-remark">${quotationLabel('Remark','ملاحظات')}</th>`;
  if(opt.actCostCol) actHeadCells += `<th class="col-total" style="text-align:right">${quotationLabel('Cost (SAR)','التكلفة (ريال)')}</th>`;

  let actTableRows='';
  // A single group named "Scope of Work" would only repeat the section title above the table as a second heading row.
  const repeatsTitle = cat => Object.keys(catGroups).length===1 && /^(additional )?scope of work$|^نطاق العمل$/i.test(String(cat).trim());
  for(const [cat,rows] of Object.entries(catGroups)){
    const isCustomCat = rows.length && rows[0].isCustom;
    const catLblColspan = actColCount - (opt.actHrsCol?1:0) - (remColCount) - (opt.actCostCol?1:0);
    let catCells = `<td colspan="${catLblColspan}">${escHtml(cat.toUpperCase())}</td>`;
    if(opt.actHrsCol) catCells += `<td style="text-align:right">${isCustomCat?quotationLabel('RATE','السعر'):quotationLabel('HOURS','الساعات')}</td>`;
    if(remColCount) catCells += `<td></td>`;
    if(opt.actCostCol) catCells += `<td></td>`;
    if(!repeatsTitle(cat))actTableRows+=`<tr class="cat-row">${catCells}</tr>`;
    rows.forEach(({task,code,q,unit,hrs,cost,isCustom,unitPrice,sn,spec,remark,itemType})=>{
      let cells='';const hierarchyType=itemType||'item';
      if(isCustom){
        // A main item without specification or remark is a heading: its title uses the full width of the row.
        const heading=hierarchyType==='main'&&!String(spec||'').trim()&&!String(remark||'').trim();
        cells += `<td class="col-sn" style="text-align:center;font-weight:700;font-size:11px">${escHtml(sn||'')}</td>`;
        if(heading){actTableRows+=`<tr class="main-sow-row">${cells}<td class="col-item" colspan="${actColCount-snColCount}" style="white-space:pre-line">${escHtml(task)}</td></tr>`;return}
        cells += `<td class="col-item" style="white-space:pre-line">${escHtml(task)}</td>`;
        cells += `<td class="col-spec" style="white-space:pre-line;font-size:10.5px">${escHtml(spec||'')}</td>`;
        if(opt.actCodeCol)cells+='<td class="col-code"></td>';
        if(opt.actQtyCol)cells+=`<td class="col-qty" style="text-align:right">${hierarchyType==='main'?'':q}</td><td class="col-unit" style="text-align:right">${hierarchyType==='main'?'':escHtml(unit||'')}</td>`;
        if(opt.actHrsCol)cells+=`<td class="col-rate" style="text-align:right">${hierarchyType==='main'?'':`${fmtN(unitPrice)}/unit`}</td>`;
        cells += `<td class="col-remark" style="white-space:pre-line;font-size:10.5px">${escHtml(remark||'')}</td>`;
        if(opt.actCostCol)cells+=`<td class="col-total" style="text-align:right;font-weight:600">${hierarchyType==='main'?'':fmtN(cost)}</td>`;
      }else{
        if(hasCustomRows)cells+='<td class="col-sn"></td>';
        cells+=`<td class="col-item">${escHtml(task)}</td>`;
        if(hasCustomRows)cells+='<td class="col-spec"></td>';
        if(opt.actCodeCol)cells+=`<td class="col-code" style="font-family:monospace;font-size:10px">${escHtml(code)}</td>`;
        if(opt.actQtyCol)cells+=`<td class="col-qty" style="text-align:right">${q}</td><td class="col-unit" style="text-align:right">${escHtml(unit)}</td>`;
        if(opt.actHrsCol)cells+=`<td class="col-rate" style="text-align:right">${hrs.toFixed(2)}h</td>`;
        if(hasCustomRows)cells+='<td class="col-remark"></td>';
        if(opt.actCostCol)cells+=`<td class="col-total" style="text-align:right;font-weight:600">${fmtN(cost)}</td>`;
      }
      const rowClass=hierarchyType==='main'?'main-sow-row':hierarchyType==='sub'?'sub-sow-row':'';
      actTableRows+=`<tr class="${rowClass}">${cells}</tr>`;
    });
  }
  if(opt.actHrsCol || opt.actCostCol){
    // colspan covers: SN(opt) + Activity + Spec(opt) + Code(opt)
    const lblColspan = snColCount + 1 + specColCount + (opt.actCodeCol?1:0);
    let totCells = `<td colspan="${lblColspan}">${quotationLabel('TOTAL ACTIVITIES','إجمالي الأنشطة')}</td>`;
    if(opt.actQtyCol) totCells += `<td></td><td></td>`;
    if(opt.actHrsCol) totCells += `<td class="col-rate" style="text-align:right">${requiredCustomSOW.length?'':actH.toFixed(2)+'h'}</td>`;
    if(remColCount) totCells += `<td></td>`;
    if(opt.actCostCol) totCells += `<td class="col-total" style="text-align:right">${fmtN(engC)}</td>`;
    actTableRows+=`<tr class="total-row">${totCells}</tr>`;
  }

  // ── Equipment table: dynamic columns ──
  const eqColCount = 1 + (opt.eqMfrCol?1:0) + (opt.eqDailyCol?1:0) + (opt.eqDaysCol?1:0) + (opt.eqTotalCol?1:0);
  let eqHeadCells = `<th>${quotationLabel('Equipment / Kit','الجهاز / الطقم')}</th>`;
  if(opt.eqMfrCol) eqHeadCells += `<th>${quotationLabel('Manufacturer','المُصنّع')}</th>`;
  if(opt.eqDailyCol) eqHeadCells += `<th style="text-align:right">${quotationLabel('Rate (SAR)','السعر (ريال)')}</th>`; if(opt.eqDaysCol) eqHeadCells += `<th style="text-align:center">${quotationLabel('Duration','المدة')}</th>`;
  if(opt.eqTotalCol) eqHeadCells += `<th style="text-align:right">${quotationLabel('Total (SAR)','الإجمالي (ريال)')}</th>`;

  let eqTableRows='';
  eqRows.forEach(({kit,mfr,daily,unit,q,cost})=>{ const u=sfEqUnitOf({unit}),t=SF_EQ_UNIT_TEXT[u]; let cells = `<td>${escHtml(kit)}</td>`; if(opt.eqMfrCol) cells += `<td>${escHtml(mfr)}</td>`; if(opt.eqDailyCol) cells += `<td style="text-align:right">SAR ${Number(daily).toLocaleString()} / ${sfEqUnitWord(u,1,conditionLanguage)}</td>`; if(opt.eqDaysCol) cells += `<td style="text-align:center">${quotationUnit(q,t[0],t[1],t[2])}</td>`;
    if(opt.eqTotalCol) cells += `<td style="text-align:right;font-weight:600">SAR ${fmtN(cost)}</td>`;
    eqTableRows+=`<tr>${cells}</tr>`;
  });
  if(eqRows.length){
    let totCells = `<td>${quotationLabel('TOTAL EQUIPMENT RENTAL','إجمالي تأجير الأجهزة')}</td>`;
    for(let i=1;i<eqColCount-1;i++) totCells += `<td></td>`;
    if(opt.eqTotalCol) totCells += `<td style="text-align:right">SAR ${fmtN(eqC)}</td>`;
    eqTableRows+=`<tr class="total-row">${totCells}</tr>`;
  }

  const condRows = conditionPrintGroups(activeConds)
    .map(group=>`<div class="doc-cond-sec-hdr">${escHtml(conditionSectionLabel(group.section))}</div>${group.items.map(item=>`<div class="doc-cond${isConditionEmphasized(item.condition.cat)?' doc-cond-emphasis':''}" data-cond-no="${escHtml(item.number)}">${conditionCopyHtml(item.condition,true)}</div>`).join('')}`)
    .join('');
  // Duration remains customer-facing but is an unnumbered note above the T&C list.
  const durationCond={text:durationConditionText('en'),textAr:durationConditionText('ar'),cat:'Duration'};
  const condLeadRows = projectDuration
    ? `<div class="doc-cond-note doc-cond-emphasis">${conditionCopyHtml(durationCond,true)}</div>`
    : '';

  const LOGO_SRC=document.querySelector('.logo-wrap img').src;

  // ── Cost Summary: optional rows ──
  let summaryRows='';
  if(opt.sumHrs) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('Total Engineering Hours','إجمالي الساعات الهندسية')}</span><span class="sv">${quotationUnit(actH.toFixed(2),'hr','hrs','ساعة')}</span></div>`;
  if(opt.sumDays) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('Total Working Days','إجمالي أيام العمل')}</span><span class="sv">${quotationUnit((actH/h).toFixed(2),'day','days','يوم')}</span></div>`;
  if(opt.sumEng) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('Engineer Cost','تكلفة المهندس')}</span><span class="sv">SAR ${fmtN(engC)}</span></div>`;
  if(opt.sumEqRental && eqC) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('Equipment Rental','تأجير الأجهزة')}</span><span class="sv">SAR ${fmtN(eqC)}</span></div>`;
  if(discA>0){
    summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('Subtotal Before Discount','المجموع الفرعي قبل الخصم')}</span><span class="sv">SAR ${fmtN(subBeforeDiscount)}</span></div>`;
    summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel(`Discount ${discountType()==='fixed'?'(Fixed)':'('+discountValue()+'%)'}`,`الخصم ${discountType()==='fixed'?'(ثابت)':'('+discountValue()+'%)'}`)}</span><span class="sv">- SAR ${fmtN(discA)}</span></div>`;
  }
  if(opt.sumSub) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel(`Sub-Total${discA>0?' (After Discount)':''}`,`المجموع الفرعي${discA>0?' (بعد الخصم)':''}`)}</span><span class="sv">SAR ${fmtN(sub)}</span></div>`;
  if(opt.sumVat && v) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel(`VAT (${v}%)`,`ضريبة القيمة المضافة (${v}%)`)}</span><span class="sv">SAR ${fmtN(vatA)}</span></div>`;
  if(opt.sumTot) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel('TOTAL PRICE (SAR)','السعر الإجمالي (ريال)')}</span><span class="sv">SAR ${fmtN(tot)}</span></div>`;
  if(commPct>0) summaryRows+=`<div class="doc-summary-row"><span class="sk">${quotationLabel(`Commission (${commPct}%)`,`العمولة (${commPct}%)`)}</span><span class="sv">- SAR ${fmtN(commA)}</span></div><div class="doc-summary-row"><span class="sk"><strong>${quotationLabel('NET TOTAL AFTER COMMISSION (SAR)','الصافي بعد العمولة (ريال)')}</strong></span><span class="sv"><strong>SAR ${fmtN(netTot)}</strong></span></div>`;
  const summaryEmpty = !summaryRows;

  // ── Optional Offer block: quoted separately, added AFTER the Grand Total, excluded from all totals/VAT ──
  const optRowsHTML = optionalRows.map(({task,sn,spec,remark,q,unit,unitPrice,cost})=>{
    return `
        <tr>
          <td class="col-sn" style="text-align:center;font-weight:700;font-size:11px">${escHtml(sn||'')}</td>
          <td class="col-item" style="white-space:pre-line">${escHtml(task)}</td>
          <td class="col-spec" style="white-space:pre-line;font-size:10.5px">${escHtml(spec||'')}</td>
          <td class="col-qty" style="text-align:right">${q}</td>
          <td class="col-unit" style="text-align:right">${escHtml(unit||'')}</td>
          <td class="col-price">${fmtN(unitPrice)}</td>
          <td class="col-remark" style="white-space:pre-line;font-size:10.5px">${escHtml(remark||'')}</td>
          <td class="col-total" style="font-weight:600">${fmtN(cost)}</td>
        </tr>`;
  }).join('');
  const hasOptional = optionalRows.length>0;

  // ── Section numbering adapts to which sections are present ──
  let secNum=1;
  const actSecNum = showAct ? secNum++ : null;
  const eqSecNum = eqRows.length ? secNum++ : null;
  const sumSecNum = !summaryEmpty ? secNum++ : null;
  const optSecNum = hasOptional ? secNum++ : null;
  const condSecNum = secNum++;

  // ── Signature block: optional boxes ──
  const sigSkyfieldBox = opt.sigSkyfield ? `
        <div class="doc-sig-box">
          <div class="doc-sig-hdr" style="background:var(--navy)">${quotationLabel('SKY FIELD COMPANY','شركة سماء الميدان')}</div>
          <div class="doc-sig-body">
            ${quotationLabel('Authorized Signature','التوقيع المعتمد')}: ______________________<br>
            ${quotationLabel('Name','الاسم')}: ______________________________________<br>
            ${quotationLabel('Title','الصفة')}: _______________________________________<br>
            ${quotationLabel('Date','التاريخ')}: _______________________________________<br>
            ${quotationLabel('Stamp','الختم')}:
          </div>
        </div>` : '';
  const sigClientBox = opt.sigClient ? `
        <div class="doc-sig-box">
          <div class="doc-sig-hdr" style="background:var(--orange)">${quotationLabel('CLIENT ACCEPTANCE','اعتماد العميل')}</div>
          <div class="doc-sig-body">
            ${quotationLabel('Authorized Signature','التوقيع المعتمد')}: ______________________<br>
            ${quotationLabel('Name','الاسم')}: ______________________________________<br>
            ${quotationLabel('Title','الصفة')}: _______________________________________<br>
            ${quotationLabel('Date','التاريخ')}: _______________________________________<br>
            ${quotationLabel('Stamp','الختم')}:
          </div>
        </div>` : '';
  const sigBlock = (sigSkyfieldBox||sigClientBox) ? `
      <div class="doc-sig" style="${(!sigSkyfieldBox||!sigClientBox)?'grid-template-columns:1fr':''}">
        ${sigSkyfieldBox}${sigClientBox}
      </div>` : '';

  document.getElementById('preview-doc').innerHTML=`
    <div class="doc-header">
      <img src="${LOGO_SRC}" alt="SKY FIELD">
      <div class="doc-header-right">
        <h2>${docTitle}</h2>
        <p style="margin-top:4px;font-size:12px;opacity:.8">${substation}</p>
        <p style="font-size:11px;opacity:.7;margin-top:2px">${headerCompanyName}</p>
        <p style="font-size:10.5px;opacity:.75;margin-top:4px">ISO 9001 · ISO 45001 · ISO 14001 Certified</p>
      </div>
    </div>
    <div class="doc-stripe"></div>
    <div class="doc-body">
      <div class="memo-grid">
        <div class="doc-info-item"><span class="dk">${quotationLabel('To','إلى')}</span><span class="dv">${client}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('From','من')}</span><span class="dv">${conditionLanguage==='ar'?'شركة سماء الميدان المحدودة':conditionLanguage==='both'?'Sky Field Company Limited / شركة سماء الميدان المحدودة':'Sky Field Company Limited'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Attention','عناية')}</span><span class="dv">${clientAttn||'-'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Project','المشروع')}</span><span class="dv">${projName}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Client Telephone','هاتف العميل')}</span><span class="dv">${clientTel||'-'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Prepared By','إعداد')}</span><span class="dv">${prepName||'Mahmoud Awwad'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Client Email','بريد العميل')}</span><span class="dv">${clientEmail?`<a href="mailto:${clientEmail}">${clientEmail}</a>`:'-'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Prepared By Email','بريد معد العرض')}</span><span class="dv">${prepEmail?`<a href="mailto:${prepEmail}">${prepEmail}</a>`:'-'}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Station / Section','المحطة / القسم')}</span><span class="dv">${stationName||'-'}</span></div>
        <div class="doc-info-item"><span class="dk">${refLabel}</span><span class="dv">${qno}</span></div>
        <div class="doc-info-item"><span class="dk">${quotationLabel('Date','التاريخ')}</span><span class="dv">${dt}</span></div>
      </div>
      <div class="doc-info-item" style="margin-bottom:16px"><span class="dk">${quotationLabel('Subject','الموضوع')}</span><span class="dv">${qoRef||'-'}</span></div>

      ${showAct?`<div class="doc-section-hdr">${actSecNum}. ${quotationLabel('Scope of Work','نطاق العمل')}</div>
      <table class="doc-table scope-table">
        ${actColgroup}
        <thead><tr>${actHeadCells}</tr></thead>
        <tbody>${actTableRows||`<tr><td colspan="${actColCount}" style="text-align:center;color:#999">${quotationLabel('No activities selected','لم يتم اختيار أنشطة')}</td></tr>`}</tbody>
      </table>`:''}

      ${eqRows.length?`<div class="doc-section-hdr">${eqSecNum}. ${quotationLabel('Equipment Rental','تأجير الأجهزة')}</div>
      <table class="doc-table">
        <thead><tr>${eqHeadCells}</tr></thead>
        <tbody>${eqTableRows}</tbody>
      </table>`:''}

      ${!summaryEmpty?`<div class="doc-section-hdr">${sumSecNum}. ${quotationLabel('Cost Summary','ملخص التكلفة')}</div>
      <div class="doc-summary">
        ${summaryRows}
      </div>`:''}

      ${hasOptional?`<div class="doc-section-hdr" style="border-left-color:var(--orange);background:var(--orange-light)">${optSecNum}. ${quotationLabel('Optional Offer','العرض الاختياري')} <span style="font-weight:400;font-size:11px;color:var(--gray-700)">${quotationLabel('(quoted separately — not included in the Grand Total above)','(يُسعر بصورة منفصلة — غير مشمول في الإجمالي أعلاه)')}</span></div>
      <table class="doc-table optional-table">
        <thead><tr><th class="col-sn" style="text-align:center">${quotationLabel('SN.','م')}</th><th class="col-item">${quotationLabel('Activity / Item','النشاط / البند')}</th><th class="col-spec">${quotationLabel('Specification','المواصفات')}</th><th class="col-qty" style="text-align:right">${quotationLabel('QTY','الكمية')}</th><th class="col-unit" style="text-align:right">${quotationLabel('Unit','الوحدة')}</th><th class="col-price">${quotationLabel('Unit Price (SAR)','سعر الوحدة (ريال)')}</th><th class="col-remark">${quotationLabel('Remark','ملاحظات')}</th><th class="col-total">${quotationLabel('Total (SAR)','الإجمالي (ريال)')}</th></tr></thead>
        <tbody>
          ${optRowsHTML}
        </tbody>
      </table>
      <p style="font-size:11px;color:var(--gray-600);margin:-10px 0 16px 2px">${quotationLabel("The item(s) above are offered at the Client's option and are excluded from the Grand Total and VAT calculated in the Cost Summary. If accepted, they will be invoiced additionally at the stated price(s).",'البنود أعلاه اختيارية للعميل وغير مشمولة في الإجمالي أو ضريبة القيمة المضافة المحتسبة في ملخص التكلفة. وعند قبولها تُفوتر بصورة إضافية بالأسعار المبينة.')}</p>`:''}

      <div class="doc-section-hdr">${condSecNum}. ${quotationLabel('Terms & Conditions','الشروط والأحكام')}</div>
      <div class="doc-conds">${condLeadRows}${condRows}</div>

      ${sigBlock}
      <p style="text-align:center;margin-top:20px;font-size:12px;color:var(--orange);font-weight:600">${quotationLabel('Thank you for the opportunity to serve you.','شكرًا لمنحنا فرصة خدمتكم.')}</p>
    </div>
    <div class="doc-footer">
      <div class="doc-footer-line1">Sky Field Company Limited &nbsp;|&nbsp; شركة سماء الميدان المحدودة</div>
      <div class="doc-footer-line2">Riyadh - Al-Malaz, Salah Salem Street, Al-Falih &nbsp;–&nbsp; C.R. 1116010788 &nbsp;–&nbsp; P.O.Box 7599 Al-Qassim 17471, Kingdom of Saudi Arabia</div>
      <div class="doc-footer-line2">الرياض - الملز - شارع صلاح سالم - الفالح – س ت 1116010788 &nbsp;–&nbsp; ص.ب 7599 القصيم 17471 المملكة العربية السعودية</div>
      <div class="doc-footer-line3">Tel: +966569590822 &nbsp;–&nbsp; Fax: +966163836005 &nbsp;–&nbsp; VAT No: 310049492300003</div>
    </div>
  `;
  const oldPi=document.getElementById('proforma-preview'); if(oldPi){oldPi.classList.remove('print-active');oldPi.style.display='none';}
  document.getElementById('export-preview').classList.add('print-active');
  document.getElementById('export-preview').style.display='block';
  const previewArabic=document.getElementById('preview-include-arabic');if(previewArabic)previewArabic.checked=conditionLanguage==='both';
  document.body.classList.add('preview-open');
  requestAnimationFrame(()=>document.getElementById('export-preview-close')?.focus());
  sfApplyPreviewTitle('quotation');
}
function closeExport(){ const el=document.getElementById('export-preview'); el.style.display='none'; el.classList.remove('print-active'); document.body.classList.remove('preview-open'); sfRestoreAppTitle(); }


function quoteFmtSAR(n){ return 'SAR '+fmtN(parseFloat(n)||0); }
async function saveSavedQuotes(){
  try{
    localStorage.setItem('sfSavedQuotations', JSON.stringify(savedQuotes));
  }catch(e){
    alert('Could not save the quotation — storage is full. Please delete some old saved quotations and try again.');
  }
  updateQuoteBadge(); updateSidebarCounts();
  if(document.body.dataset.module==='dashboard') renderDashboard();
  // Pushes only quotations whose content actually changed, each with its own
  // revision check, instead of overwriting the whole shared list — this is
  // what stops one person's save from deleting another person's new quote.
  return sfSyncDirtyQuotes();
}
function updateQuoteBadge(){ const b=document.getElementById('tab-quote-badge'); if(b)b.textContent=savedQuotes.length; }
function getExportOptionSnapshot(){
  const ids=['eo-info-rate','eo-act-show','eo-act-code','eo-act-qty','eo-act-hrs','eo-act-cost','eo-eq-show','eo-eq-mfr','eo-eq-daily','eo-eq-days','eo-eq-total','eo-sum-hrs','eo-sum-days','eo-sum-eng','eo-sum-eqrental','eo-sum-sub','eo-sum-vat','eo-sum-tot','eo-sig-skyfield','eo-sig-client'];
  const out={}; ids.forEach(id=>{ const el=document.getElementById(id); if(el)out[id]=!!el.checked; });
  return out;
}
function setExportOptionSnapshot(opts={}){
  Object.entries(opts).forEach(([id,val])=>{ const el=document.getElementById(id); if(el)el.checked=!!val; });
  onActSectionToggle(); onEqSectionToggle();
}
function calcQuotationTotals(){
  let actH=0, eqC=0, customC=0, optionalC=0;
  Object.entries(selActs).forEach(([ky,a])=>{ actH+=a.dur*(actQty[ky]||1); });
  customSOW.forEach(c=>{ if(customSOWType(c)==='main')return; const val=(parseFloat(c.qty)||0)*(parseFloat(c.unitPrice)||0); if(c.optional) optionalC+=val; else customC+=val; });
  Object.entries(selEq).forEach(([i,e])=>{ eqC+=e.daily*(eqQty[i]||1); });
  const engC=(actH/hpd()*rate())+customC;
  const subBeforeDiscount=(engC+eqC)*(1+profitPct()/100);
  const discA=discountAmountFor(subBeforeDiscount);
  const sub=subBeforeDiscount-discA;
  const vatA=sub*vatPct()/100;
  const tot=sub+vatA;
  const commA=sub*commissionPct()/100; // commission on the amount before VAT
  return {actH,eqC,customC,optionalC,engC,subBeforeDiscount,discA,sub,vatA,tot,commA,netTot:tot-commA,items:Object.keys(selActs).length+Object.keys(selEq).length+customSOW.length};
}
function collectQuotationSnapshot(type){
  const meta={};
  ['client','client-attn','client-tel','client-email','proj-name','station-name','qo-ref','qno','qdate','rate','hpd','vat','profit','discount-type','discount-value','commission','prep-name','prep-email','substation','commercial-engineer-daily-rate','commercial-engineer-monthly-rate','commercial-mobilization-rate'].forEach(id=>{
    const el=document.getElementById(id); if(el) meta[id]=el.value;
  });
  return {
    version: 6,
    type: type||'quotation',
    meta,
    selActs: deepClone(selActs), selEq: deepClone(selEq), actQty: deepClone(actQty), eqQty: deepClone(eqQty),
    customSOW: deepClone(customSOW), customSOWLabel, sowSeq,
    conds: deepClone(conds), conditionType, conditionLanguage,
    paymentMethod, lcApplicable, lcAdvancePct, lcType, lcAdvanceDays, lcOpenDays, lcDocumentDays,
    lcPaymentBasis, lcCurrency, lcCalculationBasis, lcBeneficiary, lcBankCharges, lcRules, lcAcceptableBank, lcValidityDays, lcDocuments:deepClone(lcDocuments),
    paymentConditionOverrideEn, paymentConditionOverrideAr,
    projectDuration, paymentTermType, paymentAdvancePct, paymentDueDays, paymentBalanceBasis, paymentCustomText, paymentCustomTextAr,
    exportOptions: getExportOptionSnapshot(),
    attachments: deepClone(quoteAttachments),
    totals: calcQuotationTotals()
  };
}
function applyQuotationSnapshot(snap){
  if(!snap)return;
  const meta=snap.meta||{};
  // Avoid carrying a commercial rate from the previously opened quotation
  // when loading an older snapshot that did not yet contain these fields.
  ['commercial-engineer-daily-rate','commercial-engineer-monthly-rate','commercial-mobilization-rate'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value='';
  });
  Object.entries(meta).forEach(([id,val])=>{ const el=document.getElementById(id); if(el)el.value=val; });
  // Legacy snapshots stored mobilization and demobilization separately. The
  // combined field keeps the former mobilization value; when it is absent,
  // fall back to the former demobilization value so older quotations still load.
  const combinedMobDemob=document.getElementById('commercial-mobilization-rate');
  if(combinedMobDemob && !combinedMobDemob.value && meta['commercial-demobilization-rate']!=null){
    combinedMobDemob.value=meta['commercial-demobilization-rate'];
  }
  selActs=deepClone(snap.selActs||{}); selEq=deepClone(snap.selEq||{});
  actQty=deepClone(snap.actQty||{}); eqQty=deepClone(snap.eqQty||{});
  customSOW=deepClone(snap.customSOW||[]); normalizeCustomSOWHierarchy(); customSOWLabel=snap.customSOWLabel||'';
  sowSeq=snap.sowSeq || (customSOW.length+1);
  conditionTypeDrafts.clear();conditionType=conditionTypeKey(snap.conditionType||'testing');
  // v6 keeps English as the mandatory base language. Legacy Arabic-only
  // quotations are migrated to bilingual output so no translation is lost.
  conditionLanguage=(snap.conditionLanguage==='both'||snap.conditionLanguage==='ar')?'both':'en';
  paymentMethod=snap.paymentMethod==='lc'||snap.lcApplicable?'lc':'bank_transfer';
  lcApplicable=paymentMethod==='lc';
  lcAdvancePct=Math.min(100,Math.max(0,parseFloat(snap.lcAdvancePct??30)||0));
  lcType=['irrevocable_at_sight','confirmed_at_sight'].includes(snap.lcType)?snap.lcType:'irrevocable_at_sight';
  lcAdvanceDays=Math.max(0,parseInt(snap.lcAdvanceDays??7)||0);
  lcOpenDays=Math.max(0,parseInt(snap.lcOpenDays??10)||0);
  lcDocumentDays=Math.max(1,parseInt(snap.lcDocumentDays??14)||14);
  lcPaymentBasis=['monthly_progress','after_completion'].includes(snap.lcPaymentBasis)?snap.lcPaymentBasis:'monthly_progress';
  lcCurrency=['SAR','USD','EUR'].includes(snap.lcCurrency)?snap.lcCurrency:'SAR';
  lcCalculationBasis=snap.lcCalculationBasis==='including_vat'?'including_vat':'before_vat';
  lcBeneficiary=String(snap.lcBeneficiary||'Sky Field Company Limited');
  lcBankCharges=['client','shared','beneficiary'].includes(snap.lcBankCharges)?snap.lcBankCharges:'shared';
  lcRules=String(snap.lcRules||'UCP 600');lcAcceptableBank=String(snap.lcAcceptableBank||'');
  lcValidityDays=Math.max(0,parseInt(snap.lcValidityDays??30)||0);
  lcDocuments={commercial_invoice:true,delivery_note:true,progress_certificate:true,timesheet:false,...deepClone(snap.lcDocuments||{})};
  paymentConditionOverrideEn=String(snap.paymentConditionOverrideEn||'');paymentConditionOverrideAr=String(snap.paymentConditionOverrideAr||'');
  paymentTermType=snap.paymentTermType||'advance_balance';
  paymentAdvancePct=snap.paymentAdvancePct ?? 30;
  paymentDueDays=snap.paymentDueDays ?? 30;
  paymentBalanceBasis=snap.paymentBalanceBasis||'monthly_progress';
  paymentCustomText=snap.paymentCustomText||'';
  paymentCustomTextAr=snap.paymentCustomTextAr||'';
  const savedConds=deepClone(snap.conds||[]);
  if(conditionType==='testing' && (((snap.version||0)<3) || savedConds.filter(c=>c.cat!=='Custom'&&!c.custom).length<46)){
    // v1/v2 quotations used the shortened 22-condition set. Upgrade them to
    // the restored canonical set while retaining any user-added conditions
    // and matching enabled/disabled choices where a legacy category matches.
    const canonical=conditionTemplate('testing');
    const legacyNonCustom=savedConds.filter(c=>c.cat!=='Custom');
    canonical.forEach(c=>{
      const exact=legacyNonCustom.find(x=>x.text===c.text);
      const sameCat=legacyNonCustom.filter(x=>x.cat===c.cat);
      const prior=exact||(sameCat.length===1?sameCat[0]:null);
      if(prior)c.enabled=prior.enabled!==false;
    });
    conds=canonical.concat(savedConds.filter(c=>c.cat==='Custom'));
  }else{
    conds=savedConds.length?savedConds:conditionTemplate(conditionType);
  }
  conds=hydrateConditionTranslations(conds,conditionType);
  refreshPaymentCondition();
  projectDuration=snap.projectDuration||'';
  quoteAttachments=deepClone(snap.attachments||[]);
  const lbl=document.getElementById('custom-sow-label'); if(lbl)lbl.value=customSOWLabel;
  const dur=document.getElementById('proj-duration'); if(dur)dur.value=projectDuration;
  const ct=document.getElementById('condition-type'); if(ct)ct.value=conditionType;
  const arToggle=document.getElementById('include-arabic-translation'); if(arToggle)arToggle.checked=conditionLanguage==='both';
  const pm=document.getElementById('payment-method'); if(pm)pm.value=paymentMethod;
  const pt=document.getElementById('payment-term-type'); if(pt)pt.value=paymentTermType;
  const ap=document.getElementById('payment-advance-pct'); if(ap)ap.value=paymentAdvancePct;
  const pd=document.getElementById('payment-due-days'); if(pd)pd.value=paymentDueDays;
  const pb=document.getElementById('payment-balance-basis'); if(pb)pb.value=paymentBalanceBasis;
  const pc=document.getElementById('payment-custom-text'); if(pc)pc.value=paymentCustomText;
  const pca=document.getElementById('payment-custom-text-ar'); if(pca)pca.value=paymentCustomTextAr;
  updatePaymentTermControls();
  setExportOptionSnapshot(snap.exportOptions||getExportOptionSnapshot());
  buildCatList(); buildTasks(); buildEq(); buildCustomSOWList(); buildConds(); recalc(); renderQuot(); renderQuoteAttachments(); updateActiveQuoteNote();
}
function buildQuoteRecordFromCurrent(forceNew=false, forceType){
  const existing = activeQuoteId ? savedQuotes.find(q=>q.id===activeQuoteId) : null;
  const type = forceType || (existing?.type || 'quotation');
  const snap = collectQuotationSnapshot(type);
  if(type==='invoice') snap.meta.qno = invoiceNumberFromQuote(snap.meta.qno);
  const totals=snap.totals;
  const id = (!forceNew && activeQuoteId) ? activeQuoteId : ('quote_'+Date.now());
  return {
    id,
    type,
    number: snap.meta.qno || (type==='invoice'?invoiceNumberFromQuote('SF-Q-'+new Date().getFullYear()+'-001'):'SF-Q-'+new Date().getFullYear()+'-001'),
    client: snap.meta.client || '',
    project: snap.meta['proj-name'] || '',
    station: snap.meta['station-name'] || '',
    subject: snap.meta['qo-ref'] || '',
    date: snap.meta.qdate || sfRiyadhToday(),
    total: totals.tot,
    items: totals.items,
    sourceQuotation: existing?.sourceQuotation || '',
    projectId: existing?.projectId || '',
    snapshot: snap,
    updatedAt: new Date().toISOString()
  };
}
async function saveCurrentQuotation(forceNew=false, forceType){
  const actKeys=Object.keys(selActs), eqKeys=Object.keys(selEq);
  if(!actKeys.length&&!eqKeys.length&&!customSOW.length){ alert('No items selected to save.'); return; }
  const isNew=!!forceNew||!activeQuoteId,qnoEl=document.getElementById('qno');
  if(isNew&&qnoEl&&/^SF-Q-\d{4}-\d+$/i.test(qnoEl.value.trim())&&!sfReservedDocumentNumbers.has(qnoEl.value.trim()))qnoEl.value=await sfGetDocumentNumber('quotation',true);
  const rec=buildQuoteRecordFromCurrent(forceNew, forceType);
  const idx=savedQuotes.findIndex(q=>q.id===rec.id);
  if(idx>=0){rec._syncRevision=savedQuotes[idx]._syncRevision; savedQuotes[idx]=rec;} else savedQuotes.unshift(rec);
  activeQuoteId=rec.id;
  const {conflicts}=await saveSavedQuotes();
  renderSavedQuotations(); updateActiveQuoteNote();
  if(conflicts.some(c=>c.id===rec.id)){
    alert('Another team member saved this quotation at the same time. The latest shared version has been loaded — please check it and save again if your changes are still needed.');
    return;
  }
  sfMarkQuoteClean();
  alert((rec.type==='invoice'?'Invoice Quotation':'Quotation')+' saved: '+rec.number);
}
function loadQuotation(id){
  const rec=savedQuotes.find(q=>q.id===id); if(!rec)return;
  activeQuoteId=id; applyQuotationSnapshot(rec.snapshot); updateProformaAvailabilityControls(); showTab('activities',document.querySelector('.tab-btn[onclick*="activities"]'));
}
function previewSavedQuotation(id){
  const rec=savedQuotes.find(q=>q.id===id); if(!rec)return;
  activeQuoteId=id; applyQuotationSnapshot(rec.snapshot); showExport(rec.type==='invoice'?'invoice':'quotation');
}
// The card shows one next step: create the invoice once the quotation is linked to a project, otherwise link it.
function quoteNextStep(r,isInv){
  if(!isInv&&canCreateProformaFromQuote(r))return `<button class="btn-quote-invoice" onclick="openProformaFromQuotation('${r.id}')">Create Proforma</button>`;
  return r.projectId?'':`<button class="btn-quote-copy" onclick="addQuotationAsProject('${r.id}')">📁 Add as Project</button>`;
}
function duplicateQuotation(id){
  const src=savedQuotes.find(q=>q.id===id); if(!src)return;
  const snap=deepClone(src.snapshot);
  const baseNo=snap.meta?.qno || src.number || '';
  snap.meta.qno = baseNo + '-COPY';
  snap.meta['station-name'] = (snap.meta['station-name']||src.station||'') + ' Copy';
  const totals=snap.totals || src.snapshot.totals || {};
  const rec={...deepClone(src), id:'quote_'+Date.now(), number:snap.meta.qno, station:snap.meta['station-name'], projectId:'', snapshot:snap, total:totals.tot||src.total, updatedAt:new Date().toISOString()};
  delete rec._syncRevision; delete rec._syncUpdatedAt; delete rec._syncDeletedAt;
  savedQuotes.unshift(rec); saveSavedQuotes(); renderSavedQuotations();
}
async function deleteSavedQuotation(id){
  const rec=savedQuotes.find(q=>q.id===id); if(!rec)return;
  if(!confirm(sfUiLanguage==='ar'?`حذف ${rec.type==='invoice'?'فاتورة العرض':'عرض السعر'} ${rec.number}${rec.client?' للعميل '+rec.client:''}؟ لا يمكن التراجع عن الحذف.`:`Delete ${rec.type==='invoice'?'invoice quotation':'quotation'} ${rec.number}${rec.client?' for '+rec.client:''}? This cannot be undone.`)) return;
  savedQuotes=savedQuotes.filter(q=>q.id!==id); if(activeQuoteId===id)activeQuoteId='';
  await saveSavedQuotes(); renderSavedQuotations(); updateActiveQuoteNote();
  const result=await sfSyncQuoteDelete(rec);
  if(result.status==='conflict'){
    alert('This quotation was changed by another team member just now, so it was not deleted. The latest version has been reloaded.');
    await sfHydrateQuotationsFromRemote(); renderSavedQuotations(); updateActiveQuoteNote();
  }
}
function newSeparateQuotation(){
  if((Object.keys(selActs).length||Object.keys(selEq).length||customSOW.length) && confirm('Save the current quotation before creating a new separate one?')) saveCurrentQuotation(false);
  activeQuoteId='';
  clearAll();
  generateNextQuoteNumber(true);
  const st=document.getElementById('station-name'); if(st)st.value='';
  const subj=document.getElementById('qo-ref'); if(subj)subj.value='';
  document.getElementById('qdate').value=sfRiyadhToday();
  updateActiveQuoteNote();
  showTab('activities',document.querySelector('.tab-btn[onclick*="activities"]'));
}
// Unsaved-change tracking for the editor: a fingerprint of its contents is taken
// after a quotation is loaded, saved or started, and compared before discarding it.
let sfQuoteBaseline=null;
function sfQuoteFingerprint(){const s=collectQuotationSnapshot('quotation');delete s.totals;delete s.internalCostSummary;return JSON.stringify(s)}
function sfMarkQuoteClean(){try{sfQuoteBaseline=sfQuoteFingerprint()}catch(e){sfQuoteBaseline=null}}
function sfQuoteHasUnsavedChanges(){
  if(sfQuoteBaseline!==null)return sfQuoteFingerprint()!==sfQuoteBaseline;
  // Nothing loaded, saved or started since the page opened: typed client details or scope items count.
  return !!(Object.keys(selActs).length||Object.keys(selEq).length||customSOW.length||document.getElementById('client')?.value.trim());
}
// "New Quotation" always opens a blank quotation with the next number, after offering
// to save unsaved changes, so a previously opened quotation is never overwritten by mistake.
async function sfStartNewQuotation(){
  const ar=sfUiLanguage==='ar',rec=activeQuoteId?savedQuotes.find(q=>q.id===activeQuoteId):null;
  if(sfQuoteHasUnsavedChanges()){
    const name=rec?rec.number:(ar?'العرض الحالي':'the current quotation');
    if(confirm(ar?`لديك تعديلات غير محفوظة على ${name}. هل تريد حفظها قبل بدء عرض جديد؟`:`You have unsaved changes on ${name}. Save them before starting a new quotation?`)){
      await saveCurrentQuotation(false);
      if(sfQuoteHasUnsavedChanges())return; // not saved (nothing to save, or a conflict): stay on it
    }else if(!confirm(ar?'هل تريد تجاهل التعديلات وبدء عرض سعر جديد فارغ؟':'Discard the changes and start a new blank quotation?'))return;
  }
  activeQuoteId='';
  clearAll();
  ['client','client-attn','client-tel','client-email','station-name','qo-ref'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  ['proj-name','substation','discount-value','commission','profit'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=el.defaultValue});
  const qdate=document.getElementById('qdate');if(qdate)qdate.value=sfRiyadhToday();
  try{updateLcApplicantFromClient()}catch(e){}
  showTab('activities',document.querySelector('.side-nav-btn[data-module=activities]'));
  updateActiveQuoteNote();
  await generateNextQuoteNumber(false);
  recalc();renderQuot();sfMarkQuoteClean();
}
function updateActiveQuoteNote(){
  updateProformaAvailabilityControls();
  const rec=activeQuoteId ? savedQuotes.find(q=>q.id===activeQuoteId) : null;
  const banner=document.getElementById('quote-editing-banner');
  if(banner){banner.hidden=!rec;const no=document.getElementById('quote-editing-number');if(no)no.textContent=rec?rec.number:'';}
  const primary=document.getElementById('command-primary-action');
  const title=document.getElementById('app-page-title');
  if(title&&document.body.dataset.module==='quotation')title.textContent=rec?(sfUiLanguage==='ar'?'تعديل عرض سعر':'Edit Quotation'):(sfUiLanguage==='ar'?'عرض سعر جديد':'New Quotation');
  if(primary&&document.body.dataset.module==='quotation')primary.textContent=rec?(sfUiLanguage==='ar'?'تحديث '+rec.number:'Update '+rec.number):(sfUiLanguage==='ar'?'حفظ عرض السعر':'Save Quotation');
  const note=document.getElementById('quote-active-note'); if(!note)return;
  if(!rec){ note.style.display='none'; note.textContent=''; return; }
  note.style.display='block';
  note.textContent='Loaded record: '+rec.number+' — changes will update this record when you click Save Quotation. Use Duplicate in the ⋯ menu for a separate copy.';
}
function renderSavedQuotations(){
  updateQuoteBadge(); updateActiveQuoteNote(); updateProformaAvailabilityControls();
  const grid=document.getElementById('quote-grid'); if(!grid)return;
  const q=(document.getElementById('quote-search')||{value:''}).value.toLowerCase();
  const filtered=savedQuotes.filter(r=>[r.number,r.client,r.project,r.station,r.subject,r.type,r.sourceQuotation].join(' ').toLowerCase().includes(q));
  if(!filtered.length){
    grid.innerHTML='<div class="proj-empty" style="grid-column:1/-1"><div class="pe-icon">🧾</div><p>No saved quotations yet. Prepare line items, then click <strong>Save Current</strong>.</p></div>';
    return;
  }
  grid.innerHTML=filtered.map(r=>{
    const isInv=r.type==='invoice';
    return `<div class="quote-card ${r.id===activeQuoteId?'active-record':''}">
      <div class="quote-card-hdr"><div class="quote-no">${escHtml(r.number)}</div>${isInv?'<span class="quote-type invoice">Legacy Invoice</span>':''}</div>
      <div class="quote-card-body">
        <div class="quote-line"><span>Client</span><strong>${escHtml(r.client||'-')}</strong></div>
        <div class="quote-line"><span>Project</span><strong>${escHtml(r.project||'-')}</strong></div>
        <div class="quote-line"><span>Station / Section</span><strong>${escHtml(r.station||'-')}</strong></div>
        <div class="quote-line"><span>Subject</span><strong>${escHtml(r.subject||'-')}</strong></div>
        <div class="quote-line"><span>Total incl. VAT</span><strong>${quoteFmtSAR(r.total)}</strong></div>
        <div class="quote-line"><span>Date</span><strong>${escHtml(r.date||'-')}</strong></div>
        ${r.sourceQuotation?`<div class="quote-line"><span>From quotation</span><strong>${escHtml(r.sourceQuotation)}</strong></div>`:''}
        ${r.projectId?`<div class="quote-line"><span>Linked project</span><strong style="color:var(--orange-dark)">📁 ${escHtml((projects.find(p=>p.id===r.projectId)||{}).name||'Linked')}</strong></div>`:''}
      </div>
      <div class="quote-actions">
        <button class="btn-quote-load" onclick="loadQuotation('${r.id}')">Open</button>
        <button class="btn-quote-preview" onclick="previewSavedQuotation('${r.id}')">Preview</button>
        ${quoteNextStep(r,isInv)}
        ${sfMoreMenu([`<button type="button" class="sf-more-item" onclick="duplicateQuotation('${r.id}')">Duplicate</button>`,
          r.projectId?`<button type="button" class="sf-more-item" onclick="addQuotationAsProject('${r.id}')">📁 Update Project</button>`:'',
          `<button type="button" class="sf-more-item danger" onclick="deleteSavedQuotation('${r.id}')">Delete quotation…</button>`])}
      </div>
    </div>`;
  }).join('');
}
function snapshotNumber(snap,id,def=0){ const v=parseFloat((snap.meta||{})[id]); return Number.isFinite(v)?v:def; }
function numberToWordsUnder1000(n){
  const o=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  let s='';if(n>=100){s+=o[Math.floor(n/100)]+' Hundred';n%=100;if(n)s+=' ';}if(n<20)s+=o[n];else{s+=t[Math.floor(n/10)];if(n%10)s+=' '+o[n%10];}return s.trim();
}
function numberToWords(n){
  n=Math.floor(Math.abs(Number(n)||0));if(n===0)return 'Zero';const scales=[[1e9,'Billion'],[1e6,'Million'],[1e3,'Thousand'],[1,'']];let out=[];
  scales.forEach(([v,name])=>{const part=Math.floor(n/v);if(part){out.push(numberToWordsUnder1000(part)+(name?' '+name:''));n%=v;}});return out.join(' ');
}

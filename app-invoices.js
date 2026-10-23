// SKY FIELD — Proforma invoices, installments and payments.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function setPaymentMethod(value){
  paymentMethod=value==='lc'?'lc':'bank_transfer';
  lcApplicable=paymentMethod==='lc';
  paymentConditionOverrideEn='';paymentConditionOverrideAr='';
  const bank=conds.find(c=>c.cat==='Payment – Bank');
  if(bank&&!bank.modified){bank.text=paymentBankConditionText('en');bank.textAr=paymentBankConditionText('ar');}
  updatePaymentTermControls();refreshPaymentCondition();buildConds();renderQuot();
}
function sfNormalizePaymentRecord(pay){
  const x={...(pay||{})};
  x.amount=Math.max(0,parseFloat(x.amount)||0);
  x.receipts=Array.isArray(x.receipts)?x.receipts.filter(r=>(parseFloat(r.amount)||0)>0).map(r=>({...r,amount:Math.max(0,parseFloat(r.amount)||0)})):[];
  if(!x.receipts.length&&x.status==='paid'&&x.amount>0){
    x.receipts=[{id:'rcpt_legacy_'+String(x.sourceProformaId||Date.now()),amount:x.amount,date:x.receivedDate||x.date||'',reference:x.paymentReference||'',method:x.paymentMethod||'Bank Transfer',createdAt:x.receivedDate||new Date().toISOString()}];
  }
  x.receivedAmount=Math.min(x.amount,x.receipts.reduce((sum,r)=>sum+(parseFloat(r.amount)||0),0));
  x.status=x.receivedAmount<=0?'pending':(x.receivedAmount+0.005>=x.amount?'paid':'partial');
  return x;
}
function paymentReceivedAmount(pay){return sfNormalizePaymentRecord(pay).receivedAmount}
function paymentRemainingAmount(pay){const x=sfNormalizePaymentRecord(pay);return Math.max(0,x.amount-x.receivedAmount)}
// Proforma invoices with no billing entry on a project (not linked, or linked to a missing project).
function sfUnlinkedProformas(){return(typeof proformaInvoices!=='undefined'?proformaInvoices:[]).filter(pi=>!(pi&&pi.projectId&&getInvoicePaymentRecord(pi.projectId,pi.id)?.payment))}
function sfUnlinkedProformaTotal(){return sfUnlinkedProformas().reduce((s,pi)=>{try{return s+(sfNum(resolvedProformaCalculation(pi).grandTotal)||0)}catch(_){return s}},0)}
function paymentBankConditionText(lang='en'){
  if(!lcApplicable)return lang==='ar'
    ? 'يتحمل العميل جميع رسوم التحويلات البنكية وأي رسوم مالية ذات صلة.'
    : 'All bank transfer charges and related financial charges shall be borne solely by the Client.';
  const payerEn=lcBankCharges==='shared'?'equally by the Customer and the Beneficiary':lcBankCharges==='beneficiary'?'solely by the Beneficiary':'solely by the Customer';
  const payerAr=lcBankCharges==='shared'?'بالتساوي بين العميل والمستفيد':lcBankCharges==='beneficiary'?'بالكامل من قبل المستفيد':'بالكامل من قبل العميل';
  return lang==='ar'
    ? `تُتحمل جميع رسوم التحويلات البنكية وإصدار الاعتماد المستندي وتأكيده وإبلاغه وتعديله وتمديده وفروقات المستندات والتفاوض وأي رسوم مالية ذات صلة ${payerAr}.`
    : `All bank transfer charges and all L/C issuance, advising, confirmation, amendment, extension, discrepancy, negotiation, and related financial charges shall be borne ${payerEn}.`;
}

function generatedPaymentConditionText(lang='en'){
  const days=Math.max(0,parseInt(paymentDueDays)||0);
  const ar=lang==='ar';
  const transferInstruction=ar
    ? ' وتُسدد جميع الدفعات مقابل فاتورة صادرة من شركة سماء الميدان، عن طريق تحويل بنكي من الحساب البنكي الرسمي للعميل إلى الحساب المبين في الفاتورة.'
    : " All payments shall be made against Sky Field Company's invoice by bank transfer from the Customer's official corporate bank account to the bank account stated on the invoice.";
  if(lcApplicable){
    const advance=Math.min(100,Math.max(0,parseFloat(lcAdvancePct)||0)),balance=100-advance;
    const lcEn=lcType==='confirmed_at_sight'?'confirmed irrevocable L/C at sight':'irrevocable L/C at sight';
    const lcArticle=lcType==='confirmed_at_sight'?'a':'an';
    const lcAr=lcType==='confirmed_at_sight'?'اعتمادًا مستنديًا مؤكدًا وغير قابل للإلغاء ومستحق الدفع عند الاطلاع':'اعتمادًا مستنديًا غير قابل للإلغاء ومستحق الدفع عند الاطلاع';
    const applicant=lcApplicantName(),beneficiary=lcBeneficiary||'Sky Field Company Limited',docsEn=lcDocumentsPhrase('en'),docsAr=lcDocumentsPhrase('ar');
    const basisEn=lcPaymentBasis==='after_completion'?'after completion of the work':'against monthly progress invoices';
    const basisAr=lcPaymentBasis==='after_completion'?'بعد اكتمال الأعمال':'مقابل فواتير التقدم الشهرية';
    const valueBasisEn=lcCalculationBasis==='including_vat'?'including VAT':'excluding VAT';
    const valueBasisAr=lcCalculationBasis==='including_vat'?'شاملة ضريبة القيمة المضافة':'غير شاملة ضريبة القيمة المضافة';
    const bankEn=lcAcceptableBank?` The issuing bank shall be ${lcAcceptableBank} or another bank accepted in writing by the Beneficiary.`:'';
    const bankAr=lcAcceptableBank?` ويكون البنك المصدر هو ${lcAcceptableBank} أو أي بنك آخر يقبله المستفيد كتابيًا.`:'';
    const validityEn=lcValidityDays?` The L/C shall remain valid for at least ${sfNumberWithDigits(lcValidityDays,'en')} calendar days after the expected completion date.`:'';
    const validityAr=lcValidityDays?` ويظل الاعتماد ساريًا لمدة لا تقل عن ${sfNumberWithDigits(lcValidityDays,'ar')} يومًا تقويميًا بعد تاريخ الإنجاز المتوقع.`:'';
    if(ar)return `شروط الدفع — الاعتماد المستندي (L/C):\n(أ) دفعة التعبئة: يدفع العميل ${advance}% من قيمة أمر الشراء عن طريق التحويل البنكي خلال ${sfNumberWithDigits(lcAdvanceDays,'ar')} أيام تقويمية من تاريخ توقيع أمر الشراء، وفي جميع الأحوال قبل بدء التعبئة.\n(ب) دفعة التقدم: يفتح العميل خلال ${sfNumberWithDigits(lcOpenDays,'ar')} أيام تقويمية من توقيع أمر الشراء وقبل التعبئة ${lcAr} لصالح ${beneficiary}، وبعملة ${lcCurrency}، يغطي نسبة ${balance}% من قيمة أمر الشراء ${valueBasisAr}. ويتم السحب ${basisAr}.${bankAr}\n(ج) شرط التوقيع خلال ${sfNumberWithDigits(lcDocumentDays,'ar')} يومًا: إذا لم يوقع طالب الاعتماد (${applicant}) على أي من المستندات المطلوبة (${docsAr}) أو يرفضها بملاحظات كتابية مبررة خلال ${sfNumberWithDigits(lcDocumentDays,'ar')} يومًا تقويميًا من تاريخ ثبوت الاستلام، فيحق للمستفيد تقديم المستندات والتفاوض على الاعتماد دون توقيع طالب الاعتماد، بموجب إقرار من المستفيد مع ما يثبت الإرسال أو الاستلام.\n(د) التزام دفع مستقل: تُسدد جميع المبالغ المستحقة إلى ${beneficiary} في مواعيدها دون ربطها بتحصيل العميل من المالك أو العميل النهائي أو أي طرف ثالث. ويمنح تأخر السداد شركة سماء الميدان تمديدًا مناسبًا للمدة واسترداد التكاليف الإضافية الموثقة، دون الإخلال بحقها في تعليق الأعمال وفق شرط تأخر السداد.\n(هـ) الصياغة والقواعد: يقدم العميل مسودة الاعتماد وقائمة المستندات إلى ${beneficiary} للمراجعة والموافقة الكتابية قبل الإصدار. ويخضع الاعتماد إلى ${lcRules}، ولا يسري أي تعديل دون موافقة المستفيد كتابيًا.${validityAr}`;
    return `Payment Terms — Letter of Credit (L/C):\n(a) Mobilization Payment: The Customer shall pay ${advance}% of the Purchase Order value by bank transfer within ${sfNumberWithDigits(lcAdvanceDays,'en')} calendar days from signing the Purchase Order and, in all cases, before mobilization.\n(b) Progress Payment: Within ${sfNumberWithDigits(lcOpenDays,'en')} calendar days from signing the Purchase Order and before mobilization, the Customer shall open ${lcArticle} ${lcEn} in favour of ${beneficiary}, in ${lcCurrency}, covering ${balance}% of the Purchase Order value ${valueBasisEn}. Drawings shall be made ${basisEn}.${bankEn}\n(c) Mandatory Countersignature Clause — ${sfNumberWithDigits(lcDocumentDays,'en')} calendar days: If any of the required documents (${docsEn}) are not countersigned by the Applicant (${applicant}) or rejected with justified written comments within ${sfNumberWithDigits(lcDocumentDays,'en')} calendar days from confirmed receipt, the Beneficiary may present and negotiate under the L/C without the Applicant's countersignature by providing a Beneficiary declaration together with evidence of submission or receipt.\n(d) Independent Payment Obligation: All amounts due to ${beneficiary} shall be paid on time and shall not be conditional upon or linked to the Customer's receipt of payment from the Project Owner, End Client, or any other third party. Payment delay shall entitle Sky Field Company to a corresponding extension of time and reimbursement of documented additional costs, without prejudice to its right to suspend work under the late-payment condition.\n(e) L/C Wording and Rules: The Customer shall submit the draft L/C and document list to ${beneficiary} for written review and acceptance before issuance. The L/C shall be subject to ${lcRules}, and no amendment shall become effective without the Beneficiary's written acceptance.${validityEn}`;
  }
  if(paymentTermType==='full_advance') return (ar?'شروط الدفع: تُدفع نسبة 100% مقدمًا عند إصدار أمر الشراء وقبل تعبئة الموارد أو بدء العمل.':'Payment Terms: 100% advance payment shall be made upon Purchase Order issuance and before mobilization or commencement of the work.')+transferInstruction;
  if(paymentTermType==='advance_balance'){
    const pct=Math.min(100,Math.max(0,parseFloat(paymentAdvancePct)||0));
    const bal=100-pct;
    if(paymentBalanceBasis==='monthly_progress') {
      return (ar?`شروط الدفع: تُدفع نسبة ${pct}% مقدمًا عند إصدار أمر الشراء، وتُفوتر النسبة المتبقية البالغة ${bal}% شهريًا وفق نسبة الأعمال المنجزة والمعتمدة، وتُسدد خلال ${days} يومًا من تاريخ الفاتورة.`:`Payment Terms: ${pct}% advance payment shall be made upon Purchase Order issuance. The remaining ${bal}% shall be invoiced monthly based on the approved percentage of completed work and shall be paid within ${days} days from the invoice date.`)+transferInstruction;
    }
    return (ar?`شروط الدفع: تُدفع نسبة ${pct}% مقدمًا عند إصدار أمر الشراء، وتُسدد النسبة المتبقية البالغة ${bal}% خلال ${days} يومًا بعد اكتمال العمل وتقديم الفاتورة.`:`Payment Terms: ${pct}% advance payment shall be made upon Purchase Order issuance, and the remaining ${bal}% shall be paid within ${days} days after completion of the work and submission of the invoice.`)+transferInstruction;
  }
  if(paymentTermType==='after_completion') return (ar?`شروط الدفع: تُفوتر نسبة 100% من قيمة العقد بعد اكتمال العمل، وتُسدد خلال ${days} يومًا من تاريخ الفاتورة.`:`Payment Terms: 100% of the contract value shall be invoiced after completion of the work and shall be paid within ${days} days from the invoice date.`)+transferInstruction;
  if(paymentTermType==='monthly_progress') return (ar?`شروط الدفع: تُصدر الفواتير وفق التقدم الشهري المعتمد أو كشوف الساعات الموقعة، وتُسدد خلال ${days} يومًا من تاريخ الفاتورة.`:`Payment Terms: invoices shall be issued based on approved monthly progress or signed timesheets and shall be paid within ${days} days from the invoice date.`)+transferInstruction;
  return ar?(paymentCustomTextAr.trim()||paymentCustomText.trim()||'شروط الدفع: وفق ما يتم الاتفاق عليه ويُذكر في أمر الشراء.'):(paymentCustomText.trim()||'Payment Terms: as mutually agreed and stated in the Purchase Order.');
}
function paymentConditionText(lang='en'){
  if(lang==='ar'&&paymentConditionOverrideAr.trim())return paymentConditionOverrideAr.trim();
  if(lang==='en'&&paymentConditionOverrideEn.trim())return paymentConditionOverrideEn.trim();
  return generatedPaymentConditionText(lang);
}
function refreshPaymentCondition(){
  const bank=conds.find(c=>c.cat==='Payment – Bank');
  if(bank&&!bank.modified){bank.text=paymentBankConditionText('en');bank.textAr=paymentBankConditionText('ar');}
  const previous=conds.find(c=>c.cat==='Payment – Selected');
  conds=conds.filter(c=>c.cat!=='Payment' && c.cat!=='Payment – Selected');
  const insertAt=Math.max(0,conds.findIndex(c=>c.cat==='Payment – Late'));
  const generatedEn=generatedPaymentConditionText('en'),generatedAr=generatedPaymentConditionText('ar');
  const item={
    id:previous?.id||`payment_${Date.now()}`,
    text:paymentConditionText('en'),textAr:paymentConditionText('ar'),cat:'Payment – Selected',enabled:previous?.enabled!==false,
    modified:!!(paymentConditionOverrideEn||paymentConditionOverrideAr),defaultText:generatedEn,defaultTextAr:generatedAr
  };
  if(insertAt>=0) conds.splice(insertAt,0,item); else conds.unshift(item);
  normalizeConditionMetadata(conds,conditionType);
}
function updatePaymentTermControls(){
  const adv=document.getElementById('advance-pct-wrap');
  const basis=document.getElementById('payment-balance-basis-wrap');
  const days=document.getElementById('payment-days-wrap');
  const custom=document.getElementById('payment-custom-text');
  const customAr=document.getElementById('payment-custom-text-ar');
  const paymentSelect=document.getElementById('payment-term-type');
  if(paymentSelect)paymentSelect.disabled=lcApplicable;
  if(adv) adv.style.display=!lcApplicable&&paymentTermType==='advance_balance'?'block':'none';
  if(basis) basis.style.display=!lcApplicable&&paymentTermType==='advance_balance'?'block':'none';
  if(days) days.style.display=!lcApplicable&&['advance_balance','after_completion','monthly_progress'].includes(paymentTermType)?'block':'none';
  if(custom) custom.style.display=!lcApplicable&&paymentTermType==='custom'?'block':'none';
  if(customAr) customAr.style.display=!lcApplicable&&paymentTermType==='custom'?'block':'none';
  updateLcControls();
}
function setPaymentTermType(type){
  paymentTermType=['full_advance','advance_balance','after_completion','monthly_progress','custom'].includes(type)?type:'full_advance';
  updatePaymentTermControls();
  updatePaymentTerms();
}
function updatePaymentTerms(){
  paymentAdvancePct=parseFloat(document.getElementById('payment-advance-pct')?.value)||0;
  paymentDueDays=parseInt(document.getElementById('payment-due-days')?.value)||0;
  paymentBalanceBasis=document.getElementById('payment-balance-basis')?.value||'monthly_progress';
  paymentCustomText=document.getElementById('payment-custom-text')?.value||'';
  paymentCustomTextAr=document.getElementById('payment-custom-text-ar')?.value||'';
  paymentConditionOverrideEn='';paymentConditionOverrideAr='';
  refreshPaymentCondition();
  buildConds();renderQuot();
}
function invoiceNumberFromQuote(qno){
  const raw=String(qno||'').trim()||('SF-Q-'+new Date().getFullYear()+'-001');
  if(/^INV-|^IQ-|INVOICE/i.test(raw)) return raw;
  return 'IQ-'+raw;
}
function createInvoiceFromQuotation(id){
  const src=savedQuotes.find(q=>q.id===id); if(!src)return;
  const snap=deepClone(src.snapshot);
  snap.type='invoice';
  snap.meta.qno = invoiceNumberFromQuote(snap.meta?.qno || src.number);
  snap.meta.qdate = new Date().toISOString().slice(0,10);
  snap.meta['qo-ref'] = snap.meta['qo-ref'] ? ('Invoice Quotation – '+snap.meta['qo-ref']) : 'Invoice Quotation';
  const rec={
    id:'inv_'+Date.now(), type:'invoice', number:snap.meta.qno, client:src.client, project:src.project,
    station:src.station, subject:snap.meta['qo-ref'], date:snap.meta.qdate, total:src.total, items:src.items,
    sourceQuotation:src.number, projectId:src.projectId||'', snapshot:snap, updatedAt:new Date().toISOString()
  };
  savedQuotes.unshift(rec); activeQuoteId=rec.id;
  // If the source quotation was already linked to a project, keep this invoice in the same project automatically.
  if(rec.projectId) syncProjectFromQuotation(rec);
  saveSavedQuotes(); applyQuotationSnapshot(snap); renderSavedQuotations(); showExport('invoice');
}
function fmtPiSAR(n){ return 'SAR '+fmtMoney(n); }
function saveProformaStore(){
  try{ sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices); }
  catch(e){ alert('Could not save the Proforma Invoice — browser storage is full. Remove large attachments or old records and try again.'); throw e; }
  updateSidebarCounts();
  if(document.body.dataset.module==='dashboard') renderDashboard();
  return sfSyncDirtyInvoices();
}
function updateProformaBadge(){ const b=document.getElementById('tab-pi-badge'); if(b)b.textContent=proformaInvoices.length; }
async function nextProformaNumber(reserve=false){return sfGetDocumentNumber('invoice',reserve)}

function commitProformaSequence(number){
  const mt=String(number||'').match(/^SF-PI-(\d{4})-(\d+)$/i); if(!mt)return;
  const key='sf_pi_seq_'+mt[1], seq=parseInt(mt[2],10)||0;
  const old=parseInt(localStorage.getItem(key)||'0',10)||0;
  if(seq>old)localStorage.setItem(key,String(seq));
}
function snapshotTotals(snap){
  if(snap && snap.totals) return snap.totals;
  const meta=(snap&&snap.meta)||{};
  const rateN=parseFloat(meta.rate)||1500, hpdN=parseFloat(meta.hpd)||8, profitN=parseFloat(meta.profit)||0, vatN=parseFloat(meta.vat)||0;
  let actH=0,eqC=0,customC=0,optionalC=0;
  Object.entries((snap&&snap.selActs)||{}).forEach(([ky,a])=>actH+=(parseFloat(a.dur)||0)*(parseFloat((snap.actQty||{})[ky])||1));
  ((snap&&snap.customSOW)||[]).forEach(c=>{if(customSOWType(c)==='main')return;const v=(parseFloat(c.qty)||0)*(parseFloat(c.unitPrice)||0);if(c.optional)optionalC+=v;else customC+=v;});
  Object.entries((snap&&snap.selEq)||{}).forEach(([i,e])=>eqC+=(parseFloat(e.daily)||0)*(parseFloat((snap.eqQty||{})[i])||1));
  const engC=actH/hpdN*rateN+customC, subBeforeDiscount=(engC+eqC)*(1+profitN/100);
  const dv=parseFloat(meta['discount-value'])||0, dtype=meta['discount-type']||'pct';
  const discA=Math.max(0,Math.min(dtype==='fixed'?dv:subBeforeDiscount*dv/100,subBeforeDiscount));
  const sub=subBeforeDiscount-discA,vatA=sub*vatN/100;
  return {actH,eqC,customC,optionalC,engC,subBeforeDiscount,discA,sub,vatA,tot:sub+vatA};
}
function collectProformaBaseItems(snap,includeOptional){
  const meta=snap.meta||{}, rateN=parseFloat(meta.rate)||1500, hpdN=parseFloat(meta.hpd)||8;
  const exportOpts=snap.exportOptions||{};
  // Sections intentionally hidden in the quotation export must never reappear in the Proforma Invoice.
  // Missing options in older saved quotations are treated as visible for backward compatibility.
  const g=(id)=>exportOpts[id]!==false;
  const showActivities=g('eo-act-show');
  const showEquipment=g('eo-eq-show');
  const showActivityCode=g('eo-act-code');
  const showActQty=g('eo-act-qty');
  const showActCost=g('eo-act-cost');
  const showActHrs=g('eo-act-hrs'); // for required custom SOW rows this is the only place a unit price is ever shown in the quotation
  const showEquipmentMfr=g('eo-eq-mfr');
  const showEqDaily=g('eo-eq-daily');
  const showEqDays=g('eo-eq-days');
  const showEqTotal=g('eo-eq-total');
  const items=[];
  if(showActivities){
    Object.entries(snap.selActs||{}).forEach(([ky,a])=>{
      const qty=parseFloat((snap.actQty||{})[ky])||1;
      items.push({itemId:'activity:'+ky,sn:'',description:a.task||'Testing activity',specification:showActivityCode?(a.code||''):'',remark:a.cat||'',qty,unit:a.unit||'EA',rawUnitPrice:(parseFloat(a.dur)||0)/hpdN*rateN,optional:false,
        showQty:showActQty,showUnitPrice:showActCost,showTotal:showActCost});
    });
  }
  (snap.customSOW||[]).forEach(c=>{
    if(customSOWType(c)==='main')return;
    if(c.optional&&!includeOptional)return;
    // Required custom SOW rows are rendered inside the same activities table in the quotation, so they follow
    // the same Qty/Cost toggles there; their unit price is only ever revealed via the Hours/Rate column.
    // Optional (quoted-separately) rows always show every column in the quotation, so they do here too.
    const followsActivityToggles = !c.optional;
    items.push({itemId:'scope:'+(c.id||c.sn||String(items.length+1)),sn:c.sn||'',description:c.text||'Scope item',specification:c.spec||'',remark:c.remark||'',qty:parseFloat(c.qty)||1,unit:c.unit||'EA',rawUnitPrice:parseFloat(c.unitPrice)||0,optional:!!c.optional,
      showQty: followsActivityToggles?showActQty:true,
      showUnitPrice: followsActivityToggles?showActHrs:true,
      showTotal: followsActivityToggles?showActCost:true});
  });
  if(showEquipment){
    Object.entries(snap.selEq||{}).forEach(([i,e])=>{
      const qty=parseFloat((snap.eqQty||{})[i])||1;
      items.push({itemId:'equipment:'+i,sn:'',description:e.kit||'Test equipment rental',specification:showEquipmentMfr?(e.mfr||''):'',remark:'Equipment Rental',qty,unit:SF_EQ_UNIT_TEXT[sfEqUnitOf(e)][3],rawUnitPrice:parseFloat(e.daily)||0,optional:false,
        showQty:showEqDays,showUnitPrice:showEqDaily,showTotal:showEqTotal});
    });
  }
  const totals=snapshotTotals(snap);
  const requiredTarget=parseFloat(totals.subBeforeDiscount)||0;
  // When every detailed section is hidden, use one customer-facing lump-sum line instead of
  // exposing the hidden lists or blocking the Proforma Invoice completely.
  if(!items.some(x=>!x.optional)&&requiredTarget>0){
    items.push({
      itemId:'lumpsum:quotation',
      sn:'1',
      description:snap.customSOWLabel||meta['qo-ref']||meta['proj-name']||'Testing & Commissioning Works as per Quotation',
      specification:'',remark:'',qty:1,unit:'Lot',rawUnitPrice:requiredTarget,optional:false,
      showQty:true,showUnitPrice:true,showTotal:true
    });
  }
  const requiredRaw=items.filter(x=>!x.optional).reduce((sum,x)=>sum+x.qty*x.rawUnitPrice,0);
  // Keep the commercial quotation total unchanged while distributing hidden internal section costs
  // only across the customer-visible lines.
  const factor=requiredRaw>0?requiredTarget/requiredRaw:1;
  return items.map((x,idx)=>{
    const baseUnit=x.optional?x.rawUnitPrice:x.rawUnitPrice*factor;
    return {...x,sn:x.sn||String(idx+1),baseUnitPrice:roundMoney(baseUnit),baseLineTotal:roundMoney(x.qty*baseUnit)};
  });
}
function progressItemKey(item){ return item.itemId||progressLegacyKey(item); }
function hasProgressInvoiceAfter(pi){
  if(!pi||pi.basis!=='progress')return false;
  const stamp=pi.createdAt||pi.issueDate||'';
  return proformaInvoices.some(p=>p.id!==pi.id&&p.basis==='progress'&&(p.sourceQuoteId||'')===(pi.sourceQuoteId||'')&&((p.createdAt||p.issueDate||'')>stamp));
}
function scaleProformaItems(items,scale,targetTotal){
  const rows=items.map((x,idx)=>{
    const total=roundMoney(x.baseLineTotal*scale);
    return {...x,sn:x.sn||String(idx+1),unitPrice:roundMoney(total/(x.qty||1)),total};
  });
  const sum=roundMoney(rows.reduce((s,x)=>s+x.total,0));
  const diff=roundMoney(targetTotal-sum);
  if(rows.length&&Math.abs(diff)>=0.01){
    const last=rows[rows.length-1];last.total=roundMoney(last.total+diff);last.unitPrice=roundMoney(last.total/(last.qty||1));
  }
  return rows;
}
function calculateProforma(snap,opts){
  const totals=snapshotTotals(snap), vatN=parseFloat((snap.meta||{}).vat)||0;
  const items=collectProformaBaseItems(snap,!!opts.includeOptional);
  const optionalBase=items.filter(x=>x.optional).reduce((sum,x)=>sum+x.baseLineTotal,0);
  const baseBefore=roundMoney((parseFloat(totals.subBeforeDiscount)||0)+optionalBase);
  const baseDiscount=roundMoney(parseFloat(totals.discA)||0);
  const baseAfter=roundMoney((parseFloat(totals.sub)||0)+optionalBase);
  const fullVatAmount=roundMoney(baseAfter*vatN/100);
  const fullGrandTotal=roundMoney(baseAfter+fullVatAmount);
  const fullTotals={
    totalBeforeDiscount:baseBefore,
    discount:baseDiscount,
    totalAfterDiscount:baseAfter,
    vatPct:vatN,
    vatAmount:fullVatAmount,
    grandTotal:fullGrandTotal
  };

  let totalBefore=baseBefore,discount=baseDiscount,totalAfter=baseAfter,vatAmount=fullVatAmount,grandTotal=fullGrandTotal,scale=1;
  let lineItems=scaleProformaItems(items,1,baseBefore);

  if(opts.basis==='percentage'){
    const pct=(parseFloat(opts.percentage)||0)/100;
    // Display the complete quotation values first, then calculate the requested percentage from them.
    // The requested total is exactly the selected percentage of the full quotation total including VAT.
    totalBefore=roundMoney(baseBefore*pct);
    discount=roundMoney(baseDiscount*pct);
    totalAfter=roundMoney(baseAfter*pct);
    grandTotal=roundMoney(fullGrandTotal*pct);
    vatAmount=roundMoney(grandTotal-totalAfter);
    scale=pct;
    // Keep line items at their full quotation values. Do not reduce each row to 10%, 20%, etc.
    lineItems=scaleProformaItems(items,1,baseBefore);
  }else if(opts.basis==='fixed'){
    const fixed=roundMoney(parseFloat(opts.fixedAmount)||0);
    if(opts.fixedMode==='includingVat'){
      totalAfter=roundMoney(fixed/(1+vatN/100));
      vatAmount=roundMoney(fixed-totalAfter);
      grandTotal=fixed;
    }else{
      totalAfter=fixed;
      vatAmount=roundMoney(totalAfter*vatN/100);
      grandTotal=roundMoney(totalAfter+vatAmount);
    }
    totalBefore=totalAfter;
    discount=0;
    scale=baseBefore>0?totalBefore/baseBefore:1;
    lineItems=scaleProformaItems(items,scale,totalBefore);
  }else if(opts.basis==='progress'){
    // Use the net contract value after the quotation discount. This prevents a progress invoice
    // from billing percentages against the pre-discount quotation amount.
    const progressItems=collectProgressContractItems(snap,!!opts.includeOptional);
    // Each item carries its own prior (already invoiced) and current (now reported) cumulative
    // completion %. Only the difference between them is billed on this invoice.
    const progMap={};
    (opts.itemProgress||[]).forEach(p=>{progMap[p.key]=p;});
    let sum=0;
    const rows=progressItems.map((x,idx)=>{
      const key=progressItemKey(x);
      const p=progMap[key]||progMap[progressLegacyKey(x)]||{priorPct:0,currentPct:0};
      const priorPct=Math.max(0,parseFloat(p.priorPct)||0);
      const currentPct=Math.max(0,parseFloat(p.currentPct)||0);
      const deltaPct=Math.max(0,currentPct-priorPct);
      const total=roundMoney(x.baseLineTotal*deltaPct/100);
      sum+=total;
      return {...x,sn:x.sn||String(idx+1),priorPct,currentPct,deltaPct,
        contractLineTotal:x.baseLineTotal,unitPrice:roundMoney(x.qty?total/x.qty:0),total};
    });
    totalBefore=roundMoney(sum);
    discount=0;
    totalAfter=totalBefore;
    vatAmount=roundMoney(totalAfter*vatN/100);
    grandTotal=roundMoney(totalAfter+vatAmount);
    scale=baseBefore>0?totalBefore/baseBefore:1;
    lineItems=rows;
  }

  return {
    lineItems,
    totalBeforeDiscount:totalBefore,
    discount,
    totalAfterDiscount:totalAfter,
    vatPct:vatN,
    vatAmount,
    grandTotal,
    fullTotals,
    fullTotalBeforeDiscount:fullTotals.totalBeforeDiscount,
    fullDiscount:fullTotals.discount,
    fullTotalAfterDiscount:fullTotals.totalAfterDiscount,
    fullVatAmount:fullTotals.vatAmount,
    fullGrandTotal:fullTotals.grandTotal,
    requestedPercentage:opts.basis==='percentage'?(parseFloat(opts.percentage)||0):100,
    isPercentageRequest:opts.basis==='percentage'
  };
}
function proformaBasisLabel(pi){
  if(pi.basis==='percentage')return `${fmtMoney(pi.percentage)}% Fixed Advance`;
  if(pi.basis==='fixed')return `Fixed Amount (${pi.fixedMode==='includingVat'?'Including VAT':'Before VAT'})`;
  if(pi.basis==='progress')return 'Progress-Based Invoice (Per-Item Completion %)';
  return 'Full Quotation Amount';
}
function autoPaymentDescription(source,basis,pct){
  const q=source?.number||source?.snapshot?.meta?.qno||'';
  if(basis==='percentage')return `${fmtMoney(parseFloat(pct)||0)}% Advance Payment against Quotation No. ${q}`;
  if(basis==='fixed')return `Fixed Payment Request against Quotation No. ${q}`;
  if(basis==='progress')return `Progress Payment (Per-Item Completion) against Quotation No. ${q}`;
  return `Full Payment against Quotation No. ${q}`;
}
function updatePiBasisUI(){
  const basis=document.getElementById('pi-basis').value;
  document.getElementById('pi-pct-wrap').style.display=basis==='percentage'?'':'none';
  document.getElementById('pi-fixed-wrap').style.display=basis==='fixed'?'':'none';
  document.getElementById('pi-fixed-mode-wrap').style.display=basis==='fixed'?'':'none';
  document.getElementById('pi-progress-wrap').style.display=basis==='progress'?'':'none';
  if(piWorkingSource){
    const desc=document.getElementById('pi-payment-desc');
    const old=desc.dataset.auto||'';
    const next=autoPaymentDescription(piWorkingSource,basis,document.getElementById('pi-percentage').value);
    if(!desc.value||desc.value===old)desc.value=next;
    desc.dataset.auto=next;
  }
}
// Called on the basis <select> onchange. Rebuilds the progress table structure (only needed when
// switching basis or when the item list itself changes) then recalculates the live totals.
function onPiBasisChange(){
  updatePiBasisUI();
  if(document.getElementById('pi-basis').value==='progress')renderPiProgressRows();
  recalcProformaModal();
}
// Builds (or rebuilds) the per-item completion-% table for progress-based invoicing.
// Preserves any percentage the user already typed for a given item across rebuilds, and pre-fills
// values from pendingProgressValues (used once, right after opening/editing a record).
function renderPiProgressRows(){
  const wrap=document.getElementById('pi-progress-wrap');if(!wrap||!piWorkingSource)return;
  const snap=piWorkingSource.snapshot||piWorkingSource.quoteSnapshot||{};
  const includeOptional=document.getElementById('pi-include-optional').checked;
  const items=collectProgressContractItems(snap,includeOptional);
  const existingId=document.getElementById('pi-id').value;
  const priorMap=getPriorProgressMap(piWorkingSource,existingId);
  const keep={};
  wrap.querySelectorAll('.pi-prog-pct').forEach(inp=>{keep[inp.dataset.key]=inp.value;});
  if(!items.length){
    wrap.innerHTML='<div class="pi-progress-note">No line items available for this quotation.</div>';
    return;
  }
  wrap.innerHTML=`<table class="pi-progress-table"><thead><tr>
      <th>Item</th><th class="num">Qty</th><th class="num">Line Amount</th>
      <th class="num">Previously Invoiced %</th><th class="num">Completion % Now *</th><th class="num">This Invoice</th>
    </tr></thead><tbody>${items.map((it,i)=>{
      const key=progressItemKey(it);
      const prior=Math.max(priorMap[key]||0,priorMap[progressLegacyKey(it)]||0,priorMap.__advancePct||0);
      const legacyKey=progressLegacyKey(it);
      const pending=pendingProgressValues?((key in pendingProgressValues)?pendingProgressValues[key]:pendingProgressValues[legacyKey]):undefined;
      const val=keep[key]!==undefined?keep[key]:(pending!==undefined?pending:'');
      return `<tr data-key="${escHtml(key)}" data-base="${it.baseLineTotal}" data-prior="${prior}">
        <td>${escHtml(it.description||('Item '+(i+1)))}</td>
        <td class="num">${fmtMoney(it.qty).replace('.00','')}</td>
        <td class="num">${fmtPiSAR(it.baseLineTotal)}</td>
        <td class="num">${fmtMoney(prior)}%</td>
        <td class="num"><input type="number" class="pi-prog-pct" data-key="${escHtml(key)}" min="${prior}" max="100" step="0.01" value="${escHtml(String(val))}" oninput="recalcProformaModal()"></td>
        <td class="num pi-prog-amt">SAR 0.00</td>
      </tr>`;
    }).join('')}</tbody></table>
    <div class="pi-progress-note">Enter the cumulative completion % for each item. The system deducts all earlier progress invoices and any percentage advance already issued, and bills only the new difference. Line Amount is the net contract value after quotation discount.</div>`;
  pendingProgressValues=null;
}
function currentPiOptions(){
  const basis=document.getElementById('pi-basis').value;
  const opts={
    basis,
    percentage:parseFloat(document.getElementById('pi-percentage').value)||0,
    fixedAmount:parseFloat(document.getElementById('pi-fixed-amount').value)||0,
    fixedMode:document.getElementById('pi-fixed-mode').value,
    includeOptional:document.getElementById('pi-include-optional').checked
  };
  if(basis==='progress')opts.itemProgress=currentProgressInputs();
  return opts;
}
function canCreateProformaFromQuote(rec){
  return !!(rec && rec.type==='quotation' && rec.projectId && projects.find(p=>p.id===rec.projectId));
}
function updateProformaAvailabilityControls(){
  const rec=activeQuoteId?savedQuotes.find(q=>q.id===activeQuoteId):null;
  const allowed=canCreateProformaFromQuote(rec);
  ['pi-from-current-btn','pi-current-action-btn'].forEach(id=>{
    const btn=document.getElementById(id);
    if(btn)btn.style.display=allowed?'':'none';
  });
}
function resolvedProformaCalculation(pi){
  const current=pi&&pi.totals?pi.totals:{};
  if(pi&&pi.basis==='percentage'&&(!current.fullTotals||!Number.isFinite(Number(current.fullGrandTotal)))){
    return calculateProforma(pi.quoteSnapshot||{}, {
      basis:pi.basis||'full',percentage:parseFloat(pi.percentage)||0,
      fixedAmount:parseFloat(pi.fixedAmount)||0,fixedMode:pi.fixedMode||'beforeVat',includeOptional:!!pi.includeOptional
    });
  }
  return current;
}
function recalcProformaModal(){
  if(!piWorkingSource)return;
  updatePiBasisUI();
  const calc=calculateProforma(piWorkingSource.snapshot||piWorkingSource.quoteSnapshot||{},currentPiOptions());
  if(currentPiOptions().basis==='progress'){
    const rowsMap={};(calc.lineItems||[]).forEach(li=>{rowsMap[progressItemKey(li)]=li;});
    document.querySelectorAll('#pi-progress-wrap tr[data-key]').forEach(tr=>{
      const li=rowsMap[tr.dataset.key];const cell=tr.querySelector('.pi-prog-amt');
      if(cell)cell.textContent=fmtPiSAR(li?li.total:0);
    });
  }
  const el=document.getElementById('pi-live-summary');if(!el)return;
  if(currentPiOptions().basis==='progress'){
    el.innerHTML=`
      <div class="pi-live-box"><div class="lbl">This Invoice Before VAT</div><div class="val">${fmtPiSAR(calc.totalAfterDiscount)}</div></div>
      <div class="pi-live-box"><div class="lbl">VAT ${fmtMoney(calc.vatPct)}%</div><div class="val">${fmtPiSAR(calc.vatAmount)}</div></div>
      <div class="pi-live-box total"><div class="lbl">Amount Due</div><div class="val">${fmtPiSAR(calc.grandTotal)}</div></div>`;
    return calc;
  }
  if(currentPiOptions().basis==='percentage'){
    const pct=currentPiOptions().percentage;
    el.innerHTML=`
      <div class="pi-live-box"><div class="lbl">Full Quotation Before VAT</div><div class="val">${fmtPiSAR(calc.fullTotalAfterDiscount)}</div></div>
      <div class="pi-live-box"><div class="lbl">Full Quotation VAT</div><div class="val">${fmtPiSAR(calc.fullVatAmount)}</div></div>
      <div class="pi-live-box total"><div class="lbl">Full Quotation Total</div><div class="val">${fmtPiSAR(calc.fullGrandTotal)}</div></div>
      <div class="pi-live-box"><div class="lbl">Requested ${fmtMoney(pct)}% Before VAT</div><div class="val">${fmtPiSAR(calc.totalAfterDiscount)}</div></div>
      <div class="pi-live-box"><div class="lbl">VAT on ${fmtMoney(pct)}%</div><div class="val">${fmtPiSAR(calc.vatAmount)}</div></div>
      <div class="pi-live-box total"><div class="lbl">Amount Due (${fmtMoney(pct)}%)</div><div class="val">${fmtPiSAR(calc.grandTotal)}</div></div>`;
  }else{
    el.innerHTML=`
      <div class="pi-live-box"><div class="lbl">Before Discount</div><div class="val">${fmtPiSAR(calc.totalBeforeDiscount)}</div></div>
      <div class="pi-live-box"><div class="lbl">Discount</div><div class="val">${fmtPiSAR(calc.discount)}</div></div>
      <div class="pi-live-box"><div class="lbl">After Discount</div><div class="val">${fmtPiSAR(calc.totalAfterDiscount)}</div></div>
      <div class="pi-live-box"><div class="lbl">VAT ${fmtMoney(calc.vatPct)}%</div><div class="val">${fmtPiSAR(calc.vatAmount)}</div></div>
      <div class="pi-live-box total"><div class="lbl">Total Incl. VAT</div><div class="val">${fmtPiSAR(calc.grandTotal)}</div></div>`;
  }
  return calc;
}
function clearPiModal(){
  ['pi-id','pi-source-id','pi-number','pi-date','pi-client','pi-client-vat','pi-client-address','pi-attention','pi-client-tel','pi-client-email','pi-project','pi-subject','pi-quote-ref','pi-po-ref','pi-payment-desc','pi-notes','pi-fixed-amount'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('pi-basis').value='full';document.getElementById('pi-percentage').value='10';document.getElementById('pi-fixed-mode').value='beforeVat';document.getElementById('pi-include-optional').checked=false;
  document.getElementById('pi-progress-wrap').innerHTML='';document.getElementById('pi-progress-wrap').style.display='none';
  pendingProgressValues=null;
}
async function openProformaFromQuotation(id){
  const src=savedQuotes.find(q=>q.id===id);if(!src)return;
  if(src.type==='invoice'){alert('Create a Proforma Invoice from the original quotation, not from a legacy Invoice Quotation.');return;}
  if(!canCreateProformaFromQuote(src)){alert('A Proforma Invoice can only be created after this quotation is converted and linked to a Project. Please click “Add as Project” first.');return;}
  clearPiModal();activeProformaId='';piWorkingSource=src;
  const m=src.snapshot?.meta||{};
  document.getElementById('pi-number').value=await nextProformaNumber(false);
  document.getElementById('pi-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('pi-source-id').value=src.id;
  document.getElementById('pi-client').value=m.client||src.client||'';
  document.getElementById('pi-attention').value=m['client-attn']||'';
  document.getElementById('pi-client-tel').value=m['client-tel']||'';
  document.getElementById('pi-client-email').value=m['client-email']||'';
  document.getElementById('pi-project').value=m['proj-name']||src.project||'';
  document.getElementById('pi-subject').value=m['qo-ref']||src.subject||'';
  document.getElementById('pi-quote-ref').value=src.number||m.qno||'';
  const linked=src.projectId?projects.find(p=>p.id===src.projectId):null;
  document.getElementById('pi-po-ref').value=(linked&&linked.pos&&linked.pos.length?sfPoRecord(linked.pos[0]).number:'');
  document.getElementById('pi-modal-title').textContent='Create Proforma Invoice from '+(src.number||'Quotation');
  document.getElementById('pi-signature-status').textContent=proformaSignature?'Saved signature will be used.':'';
  document.getElementById('pi-stamp-status').textContent=proformaStamp?'Saved stamp will be used.':'';
  updatePiBasisUI();if(document.getElementById('pi-basis').value==='progress')renderPiProgressRows();recalcProformaModal();
  document.getElementById('pi-modal-overlay').classList.add('open');
}
function createProformaFromCurrent(){
  if(!activeQuoteId){alert('Please save the current quotation first, then create the Proforma Invoice from the saved record.');return;}
  const src=savedQuotes.find(q=>q.id===activeQuoteId);
  if(!src||src.type!=='quotation'){alert('Please load or save the original quotation first.');return;}
  if(!canCreateProformaFromQuote(src)){alert('Convert this quotation to a Project first using “Add as Project”. The Proforma Invoice option will then become available.');return;}
  openProformaFromQuotation(src.id);
}
function editProforma(id){
  const pi=proformaInvoices.find(p=>p.id===id);if(!pi)return;
  if(hasProgressInvoiceAfter(pi)){alert('This progress invoice cannot be edited because a later progress invoice already exists. Delete or revise the latest invoice first to preserve the cumulative billing history.');return;}
  clearPiModal();activeProformaId=id;
  const savedSrc=savedQuotes.find(q=>q.id===pi.sourceQuoteId);
  const src=savedSrc||{id:pi.sourceQuoteId,number:pi.sourceQuotation,type:'quotation',snapshot:pi.quoteSnapshot,projectId:pi.projectId};
  if(savedSrc&&!savedSrc.projectId&&pi.projectId&&projects.find(p=>p.id===pi.projectId)){
    savedSrc.projectId=pi.projectId;saveSavedQuotes();
  }
  if(!canCreateProformaFromQuote(src)){alert('This Proforma Invoice must be linked to an existing Project before it can be edited. Use “Link Project” first.');return;}
  piWorkingSource=src;
  const map={
    'pi-id':pi.id,'pi-source-id':pi.sourceQuoteId,'pi-number':pi.number,'pi-date':pi.issueDate,'pi-client':pi.clientName,'pi-client-vat':pi.clientVat,
    'pi-client-address':pi.clientAddress,'pi-attention':pi.attention,'pi-client-tel':pi.clientTel,'pi-client-email':pi.clientEmail,'pi-project':pi.projectName,
    'pi-subject':pi.subject,'pi-quote-ref':pi.quotationRef,'pi-po-ref':pi.poRef,'pi-payment-desc':pi.paymentDescription,'pi-notes':pi.notes,
    'pi-percentage':pi.percentage,'pi-fixed-amount':pi.fixedAmount
  };
  Object.entries(map).forEach(([id,val])=>{const e=document.getElementById(id);if(e)e.value=val??'';});
  document.getElementById('pi-basis').value=pi.basis||'full';document.getElementById('pi-fixed-mode').value=pi.fixedMode||'beforeVat';document.getElementById('pi-include-optional').checked=!!pi.includeOptional;
  document.getElementById('pi-modal-title').textContent='Edit Proforma Invoice '+pi.number;
  document.getElementById('pi-signature-status').textContent=proformaSignature?'Saved signature will be used.':'';
  document.getElementById('pi-stamp-status').textContent=proformaStamp?'Saved stamp will be used.':'';
  if(pi.basis==='progress'){
    pendingProgressValues={};
    (pi.itemsProgress||[]).forEach(ip=>{pendingProgressValues[ip.key]=ip.currentPct;});
    updatePiBasisUI();renderPiProgressRows();
  }else{
    updatePiBasisUI();
  }
  document.getElementById('pi-payment-desc').value=pi.paymentDescription||'';recalcProformaModal();
  document.getElementById('pi-modal-overlay').classList.add('open');
}
function closeProformaModal(){document.getElementById('pi-modal-overlay').classList.remove('open');piWorkingSource=null;}
function handleProformaImage(input,type){
  const f=input.files&&input.files[0];if(!f)return;
  if(!f.type.startsWith('image/')){alert('Please choose an image file.');input.value='';return;}
  const r=new FileReader();r.onload=e=>{
    if(type==='signature'){proformaSignature=e.target.result;localStorage.setItem('sfProformaSignature',proformaSignature);document.getElementById('pi-signature-status').textContent='Signature saved.';}
    else{proformaStamp=e.target.result;localStorage.setItem('sfProformaStamp',proformaStamp);document.getElementById('pi-stamp-status').textContent='Stamp saved.';}
  };r.readAsDataURL(f);input.value='';
}
function validateProforma(calc){
  const id=document.getElementById('pi-id').value,number=document.getElementById('pi-number').value.trim(),date=document.getElementById('pi-date').value,client=document.getElementById('pi-client').value.trim(),opts=currentPiOptions();
  if(!number)return 'Proforma Invoice Number is required.';
  if(proformaInvoices.some(p=>p.number.toLowerCase()===number.toLowerCase()&&p.id!==id))return 'This Proforma Invoice Number already exists.';
  if(!date)return 'Issue Date is required.';
  if(!client)return 'Client Name is required.';
  if(!calc.lineItems.length)return 'At least one invoice line is required.';
  if(opts.basis==='percentage'&&(opts.percentage<=0||opts.percentage>100))return 'Percentage must be greater than 0 and not more than 100.';
  if(opts.basis==='percentage'){
    const src=piWorkingSource;
    const priorAdvance=getPriorAdvancePct(src,id);
    if(proformaInvoices.some(p=>p.id!==id&&p.basis==='progress'&&(p.sourceQuoteId||'')===(src.id||'')))return 'An advance invoice cannot be added after progress invoicing has started.';
    if(priorAdvance+opts.percentage>100.0001)return `Total advance invoices cannot exceed 100%. Previously invoiced advance: ${fmtMoney(priorAdvance)}%.`;
  }
  if(opts.basis==='fixed'&&opts.fixedAmount<=0)return 'Fixed Amount must be greater than zero.';
  if(opts.basis==='progress'){
    if(!opts.itemProgress||!opts.itemProgress.length)return 'No line items are available for a progress-based invoice.';
    if(opts.itemProgress.some(p=>p.currentPct<p.priorPct-0.0001))return 'Completion % cannot be lower than the percentage already invoiced for an item.';
    if(opts.itemProgress.some(p=>p.currentPct>100.0001))return 'Completion % cannot exceed 100%.';
    if(!opts.itemProgress.some(p=>(p.currentPct-p.priorPct)>0.0001))return 'Enter a completion % greater than what was previously invoiced for at least one item.';
  }
  if(calc.totalAfterDiscount<=0||calc.grandTotal<=0)return 'Requested Proforma Invoice amount must be greater than zero.';
  if(calc.grandTotal<0||!Number.isFinite(calc.grandTotal))return 'The total calculation is invalid.';
  return '';
}
async function saveProforma(openPreview){
  if(!piWorkingSource)return;
  if(!canCreateProformaFromQuote(piWorkingSource)){alert('A Proforma Invoice can only be saved for a quotation linked to an existing Project.');return;}
  const pendingExistingId=document.getElementById('pi-id').value,piNoEl=document.getElementById('pi-number');
  if(!pendingExistingId&&piNoEl&&/^SF-PI-\d{4}-\d+$/i.test(piNoEl.value.trim())&&!sfReservedDocumentNumbers.has(piNoEl.value.trim()))piNoEl.value=await nextProformaNumber(true);
  const opts=currentPiOptions(),calc=calculateProforma(piWorkingSource.snapshot||piWorkingSource.quoteSnapshot||{},opts),err=validateProforma(calc);if(err){alert(err);return;}
  const existingId=document.getElementById('pi-id').value;
  const src=piWorkingSource, old=existingId?proformaInvoices.find(p=>p.id===existingId):null;
  const rec={
    id:existingId||('pi_'+Date.now()),type:'proforma',number:document.getElementById('pi-number').value.trim(),issueDate:document.getElementById('pi-date').value,
    clientName:document.getElementById('pi-client').value.trim(),clientAddress:document.getElementById('pi-client-address').value.trim(),clientVat:document.getElementById('pi-client-vat').value.trim(),
    attention:document.getElementById('pi-attention').value.trim(),clientTel:document.getElementById('pi-client-tel').value.trim(),clientEmail:document.getElementById('pi-client-email').value.trim(),
    projectName:document.getElementById('pi-project').value.trim(),subject:document.getElementById('pi-subject').value.trim(),quotationRef:document.getElementById('pi-quote-ref').value.trim(),
    poRef:document.getElementById('pi-po-ref').value.trim(),paymentDescription:document.getElementById('pi-payment-desc').value.trim(),notes:document.getElementById('pi-notes').value.trim(),
    basis:opts.basis,percentage:opts.percentage,fixedAmount:opts.fixedAmount,fixedMode:opts.fixedMode,includeOptional:opts.includeOptional,
    sourceQuoteId:src.id||old?.sourceQuoteId||'',sourceQuotation:src.number||old?.sourceQuotation||'',projectId:src.projectId||old?.projectId||'',quoteSnapshot:deepClone(src.snapshot||src.quoteSnapshot||{}),
    lineItems:calc.lineItems,totals:calc,
    itemsProgress:opts.basis==='progress'?calc.lineItems.map(li=>({itemId:li.itemId||'',key:progressItemKey(li),legacyKey:progressLegacyKey(li),description:li.description,priorPct:li.priorPct,currentPct:li.currentPct,deltaPct:li.deltaPct})):[],
    createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
    _syncRevision:old?._syncRevision,_syncUpdatedAt:old?._syncUpdatedAt,_syncDeletedAt:old?._syncDeletedAt
  };
  const idx=proformaInvoices.findIndex(p=>p.id===rec.id);if(idx>=0)proformaInvoices[idx]=rec;else proformaInvoices.unshift(rec);
  commitProformaSequence(rec.number);activeProformaId=rec.id;
  const syncResult=await saveProformaStore();updateProformaBadge();
  if(syncResult.conflicts.some(item=>item.id===rec.id))return;
  if(syncResult.errors.some(item=>item.id===rec.id)){
    alert('The Proforma Invoice remains in the local cache, but it could not be saved to the shared database. Please keep this window open and retry after the connection is restored.');
    return;
  }
  if(rec.projectId)syncProformaToProject(rec);
  renderProformas();closeProformaModal();
  if(openPreview)previewProforma(rec.id);else alert('Proforma Invoice saved: '+rec.number);
}
function getInvoicePaymentRecord(projectId,sourceProformaId){
  const project=projects.find(p=>p.id===projectId);if(!project)return null;
  const index=(project.payments||[]).findIndex(x=>x.sourceProformaId===sourceProformaId);if(index<0)return null;
  project.payments[index]=sfNormalizePaymentRecord(project.payments[index]);
  return{project,payment:project.payments[index],index};
}
function invoicePaymentStatus(pi){const rec=pi&&pi.projectId?getInvoicePaymentRecord(pi.projectId,pi.id):null;return rec?.payment?.status||'pending'}
async function recordInvoicePayment(projectId,sourceProformaId){
  const rec=getInvoicePaymentRecord(projectId,sourceProformaId);if(!rec){alert('The linked payment record could not be found. Update the Project link for this invoice and try again.');return}
  const{project,payment}=rec,remaining=paymentRemainingAmount(payment);if(remaining<=0.005){alert('This invoice is already fully paid.');return}
  // One form (dialogs.js): amount checked against the balance, date from a date picker, method from a list.
  const entry=await sfAskPayment({remaining,title:'Record payment received'});if(!entry)return;
  const {amount,date,reference,method}=entry;
  payment.receipts=Array.isArray(payment.receipts)?payment.receipts:[];
  payment.receipts.push({id:'rcpt_'+Date.now()+'_'+Math.floor(Math.random()*10000),amount:roundMoney(amount),date,reference,method,createdAt:new Date().toISOString()});
  Object.assign(payment,sfNormalizePaymentRecord(payment));payment.receivedDate=date;payment.paymentReference=reference;payment.paymentMethod=method;
  project.updatedAt=new Date().toISOString();saveProjects();renderProjects();renderProformas();if(document.body.dataset.module==='dashboard')renderDashboard();
}
function setInvoicePaymentStatus(projectId,sourceProformaId,newStatus){
  if(newStatus==='paid')return recordInvoicePayment(projectId,sourceProformaId);
  const rec=getInvoicePaymentRecord(projectId,sourceProformaId);if(!rec){alert('The linked payment record could not be found.');return}
  const{project,payment}=rec,ar=sfUiLanguage==='ar',received=paymentReceivedAmount(payment),number=(proformaInvoices.find(x=>x.id===sourceProformaId)||{}).number||payment.label||'';
  if(!confirm(ar?`إرجاع الفاتورة ${number} إلى غير مدفوعة؟\n\nسيتم مسح ${received>0?'الإيصالات المسجلة بقيمة '+fmtPiSAR(received):'حالة الدفع'}. استخدم هذا فقط إذا سُجّلت الدفعة بالخطأ.`:`Mark invoice ${number} as not paid?\n\nThis clears ${received>0?'the recorded receipt(s) of '+fmtPiSAR(received):'the paid status'}. Use this only if the payment was recorded by mistake.`))return;
  payment.receipts=[];payment.receivedAmount=0;payment.status='pending';payment.receivedDate='';payment.paymentReference='';payment.paymentMethod='';
  project.updatedAt=new Date().toISOString();saveProjects();renderProjects();renderProformas();if(document.body.dataset.module==='dashboard')renderDashboard();
}
function invoiceStatusActionHtml(projectId,sourceProformaId,status){
  if(!projectId||!sourceProformaId)return'';
  return status==='paid'?'':`<button class="pay-action-btn mark-paid" onclick="recordInvoicePayment('${projectId}','${sourceProformaId}')">＋ Record Payment</button>`;
}
function invoiceUndoPaymentItem(projectId,sourceProformaId,status){
  return projectId&&sourceProformaId&&status==='paid'?`<button type="button" class="sf-more-item" onclick="setInvoicePaymentStatus('${projectId}','${sourceProformaId}','pending')">Mark as not paid…</button>`:'';
}

function renderProformas(){
  updateProformaBadge();const grid=document.getElementById('pi-grid');if(!grid)return;
  const q=(document.getElementById('pi-search')||{value:''}).value.toLowerCase();
  const projectLabel=id=>id==='__none'?'Not linked / غير مرتبط':((projects.find(x=>x.id===id)||{}).name||(proformaInvoices.find(x=>x.projectId===id)||{}).projectName||id);
  sfFillFilterOptions('if-client',proformaInvoices.map(p=>p.clientName),'All clients / كل العملاء');
  sfFillFilterOptions('if-project',proformaInvoices.map(p=>p.projectId||'__none'),'All projects / كل المشاريع',projectLabel);
  const fv=id=>(document.getElementById(id)||{value:''}).value,fs=fv('if-status'),fc=fv('if-client'),fp=fv('if-project');
  const pay=new Map(proformaInvoices.map(p=>[p,sfInvoicePayment(p)]));
  const rows=proformaInvoices.filter(p=>{
    if(![p.number,p.clientName,p.projectName,p.sourceQuotation,p.poRef,p.subject].join(' ').toLowerCase().includes(q))return false;
    const st=pay.get(p).status;
    if(fs&&!(fs==='unpaid'?st!=='paid':st===fs))return false;
    if(fc&&String(p.clientName||'').trim()!==fc)return false;
    if(fp&&(p.projectId||'__none')!==fp)return false;
    return true;
  });
  sfListCount('if-count',rows.length,proformaInvoices.length,'invoice(s)');
  const sum=k=>rows.reduce((s,p)=>s+(pay.get(p)[k]||0),0),filteredNote=rows.length===proformaInvoices.length?'All invoices':'Filtered · المعروض';
  const summary=document.getElementById('pi-summary');
  if(summary)summary.innerHTML=proformaInvoices.length?`
    <div class="pfs-card"><div class="pfs-lbl">Invoices / الفواتير</div><div class="pfs-val">${rows.length}</div><div class="pfs-sub">${filteredNote}</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Total incl. VAT</div><div class="pfs-val" style="color:#bfdbfe">${fmtPiSAR(sum('total'))}</div><div class="pfs-sub">${filteredNote}</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Received / المستلم</div><div class="pfs-val" style="color:#4ade80">${fmtPiSAR(sum('received'))}</div><div class="pfs-sub">Recorded receipts</div></div>
    <div class="pfs-card"><div class="pfs-lbl">Outstanding / المتبقي</div><div class="pfs-val" style="color:#fb923c">${fmtPiSAR(sum('remaining'))}</div><div class="pfs-sub">Not yet received</div></div>`:'';
  if(!rows.length){grid.innerHTML=`<div class="proj-empty" style="grid-column:1/-1"><div class="pe-icon">📄</div><p>${proformaInvoices.length?'No invoices match your search or filters. / لا توجد فواتير مطابقة.':'No Proforma Invoices saved yet. Convert a saved quotation to a Project first, then use Create Proforma.'}</p></div>`;return;}
  grid.innerHTML=rows.map(p=>{
    const pt=resolvedProformaCalculation(p);
    const paymentRec=p.projectId?getInvoicePaymentRecord(p.projectId,p.id):null;
    const paymentStatus=paymentRec?.payment?.status||'pending';
    const receivedAmount=paymentRec?.payment?paymentReceivedAmount(paymentRec.payment):0;
    const receiptMeta=receivedAmount>0&&paymentRec?.payment
      ? [`Received ${fmtPiSAR(receivedAmount)}`,paymentRec.payment.receivedDate,paymentRec.payment.paymentReference].filter(Boolean).join(' · ')
      : '';
    return `<div class="quote-card ${p.id===activeProformaId?'active-record':''}">
    <div class="quote-card-hdr"><div class="quote-no">${escHtml(p.number)}</div><span class="pay-badge ${escHtml(paymentStatus)}" style="text-transform:uppercase">${escHtml(paymentStatus)}</span></div>
    <div class="quote-card-body">
      <div class="quote-line"><span>Client</span><strong>${escHtml(p.clientName||'-')}</strong></div>
      <div class="quote-line"><span>Project</span><strong>${escHtml(p.projectName||'-')}</strong></div>
      <div class="quote-line"><span>Source Quotation</span><strong>${escHtml(p.sourceQuotation||p.quotationRef||'-')}</strong></div>
      <div class="quote-line"><span>PO / Contract</span><strong>${escHtml(p.poRef||'-')}</strong></div>
      <div class="quote-line"><span>Issue Date</span><strong>${escHtml(p.issueDate||'-')}</strong></div>
      <div class="quote-line"><span>Basis</span><strong>${escHtml(proformaBasisLabel(p))}</strong></div>
      ${p.basis==='percentage'?`<div class="quote-line"><span>Full quotation incl. VAT</span><strong>${fmtPiSAR(pt.fullGrandTotal)}</strong></div>`:''}
      <div class="quote-line"><span>${p.basis==='percentage'?'Requested amount before VAT':'Before VAT'}</span><strong>${fmtPiSAR(pt.totalAfterDiscount)}</strong></div>
      <div class="quote-line"><span>VAT</span><strong>${fmtPiSAR(pt.vatAmount)}</strong></div>
      <div class="quote-line"><span>${p.basis==='percentage'?'Amount due incl. VAT':'Total incl. VAT'}</span><strong>${fmtPiSAR(pt.grandTotal)}</strong></div>
      ${p.projectId?`<div class="quote-line"><span>Linked Project</span><strong style="color:var(--orange-dark)">📁 ${escHtml((projects.find(x=>x.id===p.projectId)||{}).name||'Linked')}</strong></div>`:''}
      ${receiptMeta?`<div class="quote-line"><span>Payment Receipt</span><strong style="color:#15803d">${escHtml(receiptMeta)}</strong></div>`:''}
    </div>
    <div class="quote-actions">
      ${p.projectId?invoiceStatusActionHtml(p.projectId,p.id,paymentStatus):''}
      <button class="btn-quote-load" onclick="editProforma('${p.id}')">Load/Edit</button>
      <button class="btn-quote-preview" onclick="previewProforma('${p.id}')">Preview / Print</button>
      <button class="btn-quote-copy" onclick="createNextProforma('${p.id}')">Next Invoice</button>
      <button class="btn-quote-copy" onclick="linkProformaToProject('${p.id}')">${p.projectId?'📁 Update Project':'📁 Link Project'}</button>
      ${sfMoreMenu([p.projectId?invoiceUndoPaymentItem(p.projectId,p.id,paymentStatus):'',`<button type="button" class="sf-more-item danger" onclick="deleteProforma('${p.id}')">Delete invoice…</button>`])}
    </div></div>`;
  }).join('');
}
function createNextProforma(id){
  const previous=proformaInvoices.find(p=>p.id===id);if(!previous)return;
  const src=savedQuotes.find(q=>q.id===previous.sourceQuoteId);
  if(!src||!canCreateProformaFromQuote(src)){alert('The original project quotation is missing or is no longer linked to this project.');return;}
  openProformaFromQuotation(src.id);
  document.getElementById('pi-basis').value='progress';
  onPiBasisChange();
  document.getElementById('pi-payment-desc').value=autoPaymentDescription(src,'progress',0);
}
function removeProformaFromProjects(id){
  let changed=false;
  projects.forEach(p=>{
    const proformas=p.proformas||[],payments=p.payments||[];
    const nextProformas=proformas.filter(x=>x.id!==id),nextPayments=payments.filter(x=>x.sourceProformaId!==id);
    if(nextProformas.length!==proformas.length||nextPayments.length!==payments.length){
      p.proformas=nextProformas;p.payments=nextPayments;p.updatedAt=new Date().toISOString();changed=true;
    }
  });
  return changed?saveProjects():Promise.resolve({conflicts:[],errors:[]});
}
async function deleteProforma(id){
  const pi=proformaInvoices.find(p=>p.id===id);if(!pi)return;
  const linkedProject=projects.find(p=>p.id===pi.projectId);
  const linkedPayment=(linkedProject?.payments||[]).find(x=>x.sourceProformaId===id);
  if(linkedPayment?.status==='paid'&&!confirm('This invoice is marked as PAID. Deleting it will also remove the linked payment record. Continue?'))return;
  if(!confirm(sfUiLanguage==='ar'?`حذف فاتورة البروفورما ${pi.number}${pi.clientName?' للعميل '+pi.clientName:''}؟ لا يمكن التراجع عن الحذف.`:`Delete Proforma Invoice ${pi.number}${pi.clientName?' for '+pi.clientName:''}? This cannot be undone.`))return;
  const deletion=await sfSyncInvoiceDelete(pi);
  if(!deletion.ok&&deletion.status==='conflict'){
    sfApplyInvoiceConflict({id,status:'conflict',remote:deletion.remote});sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices);renderProformas();
    alert('This Proforma Invoice was changed by another team member. The latest version has been loaded and was not deleted.');return;
  }
  if(!deletion.ok){alert('The Proforma Invoice was not deleted because the shared database could not confirm the operation. Please retry when the connection is available.');return;}
  proformaInvoices=proformaInvoices.filter(p=>p.id!==id);sfCachePerRecordCollection('sfProformaInvoices',proformaInvoices);
  const projectSync=await removeProformaFromProjects(id);
  if(projectSync.conflicts.length||projectSync.errors.length)alert('The invoice was deleted, but its linked Project changed at the same time. Review the Project payment ledger before continuing.');
  if(activeProformaId===id)activeProformaId='';updateProformaBadge();renderProformas();renderProjects();
}
async function linkProformaToProject(id){
  const pi=proformaInvoices.find(p=>p.id===id);if(!pi)return;
  if(pi.projectId&&projects.find(p=>p.id===pi.projectId)){
    const sourceQuote=savedQuotes.find(q=>q.id===pi.sourceQuoteId);
    if(sourceQuote&&!sourceQuote.projectId){sourceQuote.projectId=pi.projectId;syncProjectFromQuotation(sourceQuote);saveSavedQuotes();}
    syncProformaToProject(pi);renderSavedQuotations();renderProformas();updateProformaAvailabilityControls();alert('Linked project updated.');return;
  }
  if(!projects.length){alert('No projects are available. Create a project first, or link the source quotation using “Add as Project”.');return;}
  const pick=await sfAskChoice({title:'Link to which project?',items:projects.map(p=>({label:p.name||p.id,sub:[p.client,p.status].filter(Boolean).join(' · ')}))});
  if(pick===null)return;const chosen=projects[pick];
  pi.projectId=chosen.id;pi.updatedAt=new Date().toISOString();
  const sourceQuote=savedQuotes.find(q=>q.id===pi.sourceQuoteId);
  if(sourceQuote){sourceQuote.projectId=chosen.id;syncProjectFromQuotation(sourceQuote);saveSavedQuotes();}
  const syncResult=await saveProformaStore();
  if(syncResult.conflicts.some(item=>item.id===pi.id)||syncResult.errors.some(item=>item.id===pi.id))return;
  syncProformaToProject(pi);renderSavedQuotations();renderProformas();updateProformaAvailabilityControls();alert('Proforma Invoice and its source quotation are linked to '+chosen.name+'.');
}
function previewProforma(id){
  const pi=proformaInvoices.find(p=>p.id===id);if(!pi)return;activeProformaId=id;
  const c=proformaCompanySettings,logo=document.querySelector('.logo-wrap img')?.src||'';
  const resolved=resolvedProformaCalculation(pi);
  const displayItems=(pi.basis==='percentage'||!(pi.lineItems||[]).length)?(resolved.lineItems||[]):(pi.lineItems||[]);
  const hasSpec=displayItems.some(x=>x.specification),hasRemark=displayItems.some(x=>x.remark);
  // A column only appears if at least one line item still shows it; individual cells are blanked
  // for items whose own toggle was off in the source quotation (e.g. a hidden Qty or Cost column).
  const hasQtyCol=displayItems.some(x=>x.showQty!==false);
  const hasPriceCol=displayItems.some(x=>x.showUnitPrice!==false);
  const hasTotalCol=displayItems.some(x=>x.showTotal!==false);
  const isProgress=pi.basis==='progress';
  const rows=displayItems.map((x,i)=>`<tr>
    <td class="center" style="width:5%">${escHtml(x.sn||String(i+1))}</td>
    <td>${multilineHtml(x.description)}</td>
    ${hasSpec?`<td>${multilineHtml(x.specification)}</td>`:''}
    ${hasRemark?`<td>${multilineHtml(x.remark)}</td>`:''}
    ${hasQtyCol?`<td class="center" style="width:6%">${x.showQty!==false?fmtMoney(x.qty).replace('.00',''):''}</td><td class="center" style="width:7%">${x.showQty!==false?escHtml(x.unit||'EA'):''}</td>`:''}
    ${hasPriceCol?`<td class="num" style="width:12%">${x.showUnitPrice!==false?fmtMoney(isProgress?(x.contractLineTotal||x.baseLineTotal||0):x.unitPrice):''}</td>`:''}
    ${isProgress?`<td class="center" style="width:7%">${fmtMoney(x.priorPct||0)}%</td><td class="center" style="width:7%">${fmtMoney(x.currentPct||0)}%</td><td class="center" style="width:7%">${fmtMoney(x.deltaPct||0)}%</td>`:''}
    ${hasTotalCol?`<td class="num" style="width:13%">${x.showTotal!==false?fmtMoney(x.total):''}</td>`:''}</tr>`).join('');
  const supplierRows=infoRow('Supplier Name',c.nameEn)+infoRow('الاسم بالعربية',c.nameAr)+infoRow('Supplier Address',c.addressEn)+infoRow('العنوان',c.addressAr)+infoRow('Supplier VAT No.',c.vat)+infoRow('Telephone',c.telephone)+infoRow('Fax',c.fax);
  const clientRows=infoRow('Client Name',pi.clientName)+infoRow('Client Address',pi.clientAddress)+infoRow('Client VAT No.',pi.clientVat)+infoRow('Attention',pi.attention)+infoRow('Telephone',pi.clientTel)+infoRow('Email',pi.clientEmail);
  const t=resolved;
  document.getElementById('pi-preview-doc').innerHTML=`
    <div class="pi-doc-header"><div class="pi-doc-logo"><img src="${logo}"></div><div class="pi-doc-title"><div class="ar">فاتورة مبدئية</div><div class="en">PROFORMA INVOICE</div><div class="warning">This document is a Proforma Invoice and not a Tax Invoice.<br><span dir="rtl">هذه فاتورة مبدئية وليست فاتورة ضريبية.</span></div></div></div>
    <div class="pi-doc-body">
      <div class="pi-party-grid"><div class="pi-party-box"><div class="pi-party-hdr">Supplier / المورّد</div><div class="pi-party-content">${supplierRows}</div></div><div class="pi-party-box"><div class="pi-party-hdr">Client / العميل</div><div class="pi-party-content">${clientRows||'<div style="font-size:10px;color:#9ca3af">Client details not provided.</div>'}</div></div></div>
      <div class="pi-ref-grid">
        ${infoRow('Issue Date',pi.issueDate)}${infoRow('Proforma Invoice No.',pi.number)}${infoRow('Project',pi.projectName)}${infoRow('Subject',pi.subject)}${infoRow('Quotation Reference',pi.quotationRef||pi.sourceQuotation)}${infoRow('PO / Contract Ref.',pi.poRef)}${infoRow('Payment Basis',proformaBasisLabel(pi))}${infoRow('Payment Description',pi.paymentDescription)}
      </div>
      <table class="pi-table"><thead><tr><th>SN</th><th>Description</th>${hasSpec?'<th>Specification</th>':''}${hasRemark?'<th>Remark</th>':''}${hasQtyCol?'<th>Qty</th><th>Unit</th>':''}${hasPriceCol?(isProgress?'<th>Contract Line<br>Amount (SAR)</th>':'<th>Unit Price<br>(SAR)</th>'):''}${isProgress?'<th>Prior %</th><th>Current %</th><th>This Invoice %</th>':''}${hasTotalCol?'<th>Total Price<br>(SAR)</th>':''}</tr></thead><tbody>${rows}</tbody></table>
      <div class="pi-summary-wrap">
        <div><div class="pi-payment-note"><strong>${escHtml(pi.paymentDescription||'Kindly arrange payment of the above Proforma Invoice amount.')}</strong><br>Kindly arrange payment of the above Proforma Invoice amount.<div class="ar">نأمل منكم التكرم بصرف قيمة الفاتورة المبدئية الموضحة أعلاه، ولكم جزيل الشكر.</div></div><div class="pi-words"><strong>Amount in Words:</strong> ${escHtml(amountInWords(t.grandTotal))}</div></div>
        <div>
          ${pi.basis==='percentage'?`
          <div class="pi-summary">
            <div class="pi-summary-title">Full Quotation Value / إجمالي عرض السعر بالكامل</div>
            <div class="pi-summary-row"><span>Total Before Discount</span><span>${fmtPiSAR(t.fullTotalBeforeDiscount)}</span></div>
            <div class="pi-summary-row"><span>Discount</span><span>${fmtPiSAR(t.fullDiscount)}</span></div>
            <div class="pi-summary-row"><span>Total After Discount</span><span>${fmtPiSAR(t.fullTotalAfterDiscount)}</span></div>
            <div class="pi-summary-row"><span>VAT ${fmtMoney(t.vatPct)}%</span><span>${fmtPiSAR(t.fullVatAmount)}</span></div>
            <div class="pi-summary-row"><span>Full Total Including VAT</span><span>${fmtPiSAR(t.fullGrandTotal)}</span></div>
          </div>
          <div class="pi-summary-request">
            <div class="pi-summary-title">Requested ${fmtMoney(pi.percentage)}% Payment / الدفعة المطلوبة ${fmtMoney(pi.percentage)}%</div>
            <div class="pi-summary-row"><span>${fmtMoney(pi.percentage)}% Before VAT</span><span>${fmtPiSAR(t.totalAfterDiscount)}</span></div>
            <div class="pi-summary-row"><span>VAT on ${fmtMoney(pi.percentage)}%</span><span>${fmtPiSAR(t.vatAmount)}</span></div>
            <div class="pi-summary-row"><span>Amount Due Including VAT</span><span>${fmtPiSAR(t.grandTotal)}</span></div>
          </div>
          <div class="pi-full-value-note">The line-item table and first summary show the complete quotation value. The amount due is calculated from the selected percentage of the full quotation total.</div>`:`
          <div class="pi-summary">
            <div class="pi-summary-row"><span>Total Without VAT</span><span>${fmtPiSAR(t.totalBeforeDiscount)}</span></div>
            <div class="pi-summary-row"><span>Discount</span><span>${fmtPiSAR(t.discount)}</span></div>
            <div class="pi-summary-row"><span>Total After Discount</span><span>${fmtPiSAR(t.totalAfterDiscount)}</span></div>
            <div class="pi-summary-row"><span>VAT ${fmtMoney(t.vatPct)}%</span><span>${fmtPiSAR(t.vatAmount)}</span></div>
            <div class="pi-summary-row"><span>Total Including VAT</span><span>${fmtPiSAR(t.grandTotal)}</span></div>
          </div>`}
        </div>
      </div>
      ${pi.notes?`<div class="pi-notes"><strong>Notes:</strong><br>${multilineHtml(pi.notes)}</div>`:''}
      <div class="pi-signatures">
        <div class="pi-sig-box"><div class="label">Prepared By</div><div style="margin-top:24px">${escHtml(pi.preparedBy||'Sky Field Company Limited')}</div><div style="margin-top:14px">Date: ${escHtml(pi.issueDate||'')}</div></div>
        <div class="pi-sig-box"><div class="label">Authorized Signature</div>${proformaSignature?`<img src="${proformaSignature}">`:'<div class="pi-sig-placeholder">Signature</div>'}</div>
        <div class="pi-sig-box"><div class="label">Company Stamp</div>${proformaStamp?`<img src="${proformaStamp}">`:'<div class="pi-sig-placeholder">Company Stamp</div>'}</div>
      </div>
    </div>
    <div class="pi-doc-footer"><strong>${escHtml(c.nameEn)} · ${escHtml(c.nameAr)}</strong><br>Tel: ${escHtml(c.telephone)} &nbsp; | &nbsp; Fax: ${escHtml(c.fax)} &nbsp; | &nbsp; VAT No.: ${escHtml(c.vat)}</div>`;
  const old=document.getElementById('export-preview');old.classList.remove('print-active');old.style.display='none';
  const el=document.getElementById('proforma-preview');el.classList.add('print-active');el.style.display='block';sfApplyPreviewTitle('proforma');renderProformas();
}
function closeProformaPreview(){const el=document.getElementById('proforma-preview');el.style.display='none';el.classList.remove('print-active');sfRestoreAppTitle();}
function sfPaymentNetRatio(p,pay){
  const pi=pay?.sourceProformaId&&typeof proformaInvoices!=='undefined'?proformaInvoices.find(x=>x.id===pay.sourceProformaId):null;
  if(pi){try{const t=resolvedProformaCalculation(pi)||{},g=parseFloat(t.grandTotal),n=parseFloat(t.totalAfterDiscount);if(g>0&&n>=0&&n<=g+0.005)return n/g}catch(_){}}
  return 1/(1+sfProjectVatPct(p)/100);
}

async function openProformaFromProject(projectId){
  const p=projects.find(x=>x.id===projectId);if(!p)return;
  const quoteIds=(p.quotes||[]).filter(q=>q.type==='quotation').map(q=>q.id);
  const candidates=quoteIds.map(id=>savedQuotes.find(q=>q.id===id)).filter(q=>q&&q.type==='quotation');
  if(!candidates.length){alert('This project has no linked original quotation. Link the quotation to the project first.');return;}
  let src=candidates[0];
  if(candidates.length>1){
    const i=await sfAskChoice({title:'Select the quotation / station to invoice',items:candidates.map(q=>({label:q.number||'',sub:q.station||q.subject||q.project||''}))});
    if(i===null)return;src=candidates[i];
  }
  openProformaFromQuotation(src.id);
}
function sfInvoicePayment(p){
  const rec=p.projectId?getInvoicePaymentRecord(p.projectId,p.id):null,total=resolvedProformaCalculation(p).grandTotal||0;
  if(!rec?.payment)return{status:'pending',total,received:0,remaining:total};
  return{status:rec.payment.status||'pending',total,received:paymentReceivedAmount(rec.payment),remaining:paymentRemainingAmount(rec.payment)};
}
function projectInvoiceRecords(p){return proformaInvoices.filter(x=>x.projectId===p.id)}
function projectInvoiceTotal(p){return (p.payments||[]).reduce((a,x)=>a+sfNum(x.amount),0)}

async function pmTogglePaymentStatus(index){
  const pay=sfNormalizePaymentRecord(pmTempPays[index]);if(!pay)return;
  if(pay.status==='paid'){
    if(!confirm(sfUiLanguage==='ar'?`إرجاع ${pay.label||'الدفعة'} إلى غير مدفوعة؟ سيتم مسح الإيصالات المسجلة بقيمة ${fmtPiSAR(paymentReceivedAmount(pay))} عند حفظ المشروع.`:`Mark ${pay.label||'this payment'} as not paid? The recorded receipt(s) of ${fmtPiSAR(paymentReceivedAmount(pay))} are cleared when you save the project.`))return;pay.receipts=[];
  }else{
    const entry=await sfAskPayment({remaining:paymentRemainingAmount(pay),title:'Record payment received'});if(!entry)return;
    pay.receipts=Array.isArray(pay.receipts)?pay.receipts:[];pay.receipts.push({id:'rcpt_'+Date.now(),amount:roundMoney(entry.amount),date:entry.date,reference:entry.reference,method:entry.method,createdAt:new Date().toISOString()});
  }
  pmTempPays[index]=sfNormalizePaymentRecord(pay);renderPmLists();
}

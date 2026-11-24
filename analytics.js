/* Sky Field — Analytics / التحليلات
 * Views built from data the app already holds, in page order:
 *   a. Month at a glance: invoiced, collected, outstanding, collected − cost (one month picker for the page)
 *   b. Invoices: paid in the month and open today, by invoice number
 *   c. Quotations: issued and won in the month, win rate, quotations waiting for a reply
 *   2. Collection and invoice ageing by client      — everyone with the commercial system
 *   3. Monthly trend: invoiced, collected, cost     — cost series for payroll access only
 *   1. Profitability by project (before VAT)        — payroll access only
 *   4. Engineer utilisation from approved attendance — payroll access + attendance admin
 * Nothing here writes data. Amounts use the same functions as the project pages
 * (sfProjectFinance, sfNormalizePaymentRecord, resolvedProformaCalculation).
 */
(function(){
'use strict';

const S={status:'',sort:'margin',month:'',util:null,utilMonth:'',utilError:'',utilLoading:false,utilToken:0,
  vat:(()=>{try{return localStorage.getItem('sfAnalyticsTrendVat')!=='net'}catch(_){return true}})()};
const opt=(v,l,cur)=>`<option value="${v}"${cur===v?' selected':''}>${l}</option>`;
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0};
const esc=v=>escHtml(String(v??''));
const pct=v=>(Math.round(v*10)/10).toFixed(1)+'%';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const canSeeCost=()=>typeof sfHasAccess==='function'&&sfHasAccess('payroll');
const costingFrom=()=>typeof SF_ATTENDANCE_COSTING_FROM==='string'?SF_ATTENDANCE_COSTING_FROM:'';
const isoDate=v=>typeof sfIsoDate==='function'?sfIsoDate(v):String(v||'').slice(0,10);
function today(){try{if(typeof sfRiyadhToday==='function')return sfRiyadhToday()}catch(_){}return new Date().toISOString().slice(0,10)}
function daysBetween(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)}
function monthLabel(key){const [y,m]=key.split('-');return MONTHS[(+m||1)-1]+' '+y.slice(2)}
function monthName(key){const [y,m]=key.split('-');return MONTH_NAMES[(+m||1)-1]+' '+y}
const curMonth=()=>S.month||today().slice(0,7);
const total=(arr,f)=>arr.reduce((s,x)=>s+f(x),0);
function lastMonths(n){
  const t=today();let y=+t.slice(0,4),m=+t.slice(5,7);const out=[];
  for(let i=0;i<n;i++){out.unshift(`${y}-${String(m).padStart(2,'0')}`);if(--m===0){m=12;y--}}
  return out;
}
const statusOf=p=>({active:'active',completed:'completed',hold:'hold'}[p.status]||'active');
const STATUS_LABEL={active:'Active',completed:'Completed',hold:'On Hold'};
function unlinkedProformas(){return typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():(typeof proformaInvoices!=='undefined'?proformaInvoices:[]).filter(pi=>!pi.projectId||!projects.some(p=>p.id===pi.projectId))}

// ── a. Shared lists: one row per invoice (incl. VAT) and per quotation ───────
function invoiceRows(){
  const byId=new Map((typeof proformaInvoices!=='undefined'?proformaInvoices:[]).map(pi=>[pi.id,pi])),rows=[];
  projects.forEach(p=>(p.payments||[]).forEach(raw=>{
    const pay=sfNormalizePaymentRecord(raw),pi=byId.get(pay.sourceProformaId);
    rows.push({no:(pi&&pi.number)||String(pay.label||'').replace(/^Invoice\s+/i,'')||'—',projectId:p.id,project:p.name||'',
      client:String(p.client||'').trim()||'No client',date:isoDate(pay.date),amount:num(pay.amount),received:num(pay.receivedAmount),
      remaining:paymentRemainingAmount(pay),ratio:sfPaymentNetRatio(p,pay),receipts:pay.receipts||[]});
  }));
  unlinkedProformas().forEach(pi=>{
    let g=0;try{g=num((resolvedProformaCalculation(pi)||{}).grandTotal)}catch(_){}
    rows.push({no:pi.number||'—',projectId:'',project:pi.projectName||'',client:String(pi.clientName||'').trim()||'No client',
      date:isoDate(pi.issueDate),amount:g,received:0,remaining:g,ratio:1/1.15,receipts:[]});
  });
  return rows;
}
// Receipts recorded in a month, one row each (an invoice paid in two parts shows twice).
function paidIn(rows,month){
  const out=[];
  rows.forEach(r=>r.receipts.forEach(rc=>{const d=isoDate(rc.date);if(d.startsWith(month))out.push({...r,payDate:d,paid:num(rc.amount),method:rc.method||'',ref:rc.reference||''})}));
  return out.sort((a,b)=>a.payDate.localeCompare(b.payDate)||String(a.no).localeCompare(String(b.no)));
}
// A quotation is won once it is linked to a project (the app has no "lost" status).
function quoteRows(){
  const linked=new Set(projects.flatMap(p=>(p.quotes||[]).map(q=>q.id)));
  return(typeof savedQuotes!=='undefined'?savedQuotes:[]).filter(q=>q&&q.type==='quotation'&&!q._syncDeletedAt).map(q=>({
    id:q.id,no:q.number||'—',client:q.client||'—',subject:q.subject||q.project||'',date:isoDate(q.date),total:num(q.total),won:!!q.projectId||linked.has(q.id)}));
}
function projectCell(r){
  return r.projectId?`<button type="button" class="an-link" onclick="openProjectDetails('${esc(r.projectId)}')">${esc(r.project||'Project')}</button>`
    :`<span class="an-muted">${esc(r.project||'Not linked')}</span>`;
}

// ── a. Month at a glance ─────────────────────────────────────────────────────
function renderMonth(rows,quotes){
  const m=curMonth(),now=today(),label=monthLabel(m);
  const issued=rows.filter(r=>r.date.startsWith(m)),paid=paidIn(rows,m),open=rows.filter(r=>r.remaining>0.005);
  const outstanding=total(open,r=>r.remaining),late=total(open.filter(r=>r.date&&daysBetween(r.date,now)>30),r=>r.remaining);
  let fourth;
  if(canSeeCost()){
    const spent=projects.reduce((s,p)=>s+total((p.actualExpenses||[]).filter(x=>isoDate(x.date).startsWith(m)),x=>num(x.amount)),0);
    const net=total(paid,x=>x.paid*x.ratio)-spent;
    fourth=`<div class="pfs-card"><div class="pfs-lbl">Collected − cost in ${label}</div><div class="pfs-val ${net<0?'tone-alert':'tone-ok'}">${fmtSAR(net)}</div><div class="pfs-sub">Before VAT · cost ${fmtSAR(spent)}</div></div>`;
  }else{
    const q=quotes.filter(x=>x.date.startsWith(m));
    fourth=`<div class="pfs-card"><div class="pfs-lbl">Quotations in ${label}</div><div class="pfs-val">${q.length}</div><div class="pfs-sub">Incl. VAT · ${fmtSAR(total(q,x=>x.total))}</div></div>`;
  }
  return `<section class="an-sec" id="an-month-sum">
    <div class="an-head"><div><h3>${esc(monthName(m))} at a glance <span>ملخص الشهر</span></h3><p>Pick a month to update every section on this page. Money from clients includes VAT.</p></div>
      <div class="an-controls"><label>Month<input type="month" id="an-month" value="${esc(m)}" max="${esc(now.slice(0,7))}" onchange="sfAnalyticsSet('month',this.value)"></label></div></div>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Invoiced in ${label}</div><div class="pfs-val">${fmtSAR(total(issued,r=>r.amount))}</div><div class="pfs-sub">Incl. VAT · ${issued.length} invoice(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Collected in ${label}</div><div class="pfs-val tone-ok">${fmtSAR(total(paid,x=>x.paid))}</div><div class="pfs-sub">Incl. VAT · ${paid.length} payment(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Outstanding today</div><div class="pfs-val ${outstanding>0.005?'tone-warn':'tone-ok'}">${fmtSAR(outstanding)}</div><div class="pfs-sub">Incl. VAT · ${late>0.005?fmtSAR(late)+' older than 30 days':'nothing older than 30 days'}</div></div>
      ${fourth}
    </div>
  </section>`;
}

// ── b. Invoices: paid in the month, open today ───────────────────────────────
// No due dates are stored, so an invoice is expected 30 days after its issue date.
const PAY_DAYS=30;
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
function stillToInvoice(){
  return projects.filter(p=>statusOf(p)!=='completed').map(p=>{const inv=total(p.payments||[],x=>num(x.amount));return{p,contract:num(p.contract),inv,left:Math.max(0,num(p.contract)-inv)}})
    .filter(x=>x.left>0.5).sort((a,b)=>b.left-a.left);
}
function renderForecast(open,now){
  const overdue=open.filter(r=>!r.exp||r.exp<=now),soon=open.filter(r=>r.exp&&r.exp>now),later=stillToInvoice();
  const all=total(open,r=>r.remaining)+total(later,x=>x.left);
  const rows=later.map(x=>`<tr><td>${projectCell({projectId:x.p.id,project:x.p.name})}</td><td>${esc(x.p.client||'—')}</td><td>${STATUS_LABEL[statusOf(x.p)]}</td>
      <td class="an-num">${fmtSAR(x.contract)}</td><td class="an-num">${fmtSAR(x.inv)}</td><td class="an-num an-due">${fmtSAR(x.left)}</td></tr>`).join('');
  return `<h4 class="an-h4">Expected collections</h4>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Overdue now</div><div class="pfs-val ${overdue.length?'tone-alert':'tone-ok'}">${fmtSAR(total(overdue,r=>r.remaining))}</div><div class="pfs-sub">Incl. VAT · ${overdue.length} invoice(s) past ${PAY_DAYS} days</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Due in the next ${PAY_DAYS} days</div><div class="pfs-val tone-warn">${fmtSAR(total(soon,r=>r.remaining))}</div><div class="pfs-sub">Incl. VAT · ${soon.length} invoice(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Still to invoice</div><div class="pfs-val">${fmtSAR(total(later,x=>x.left))}</div><div class="pfs-sub">Incl. VAT · ${later.length} active or on-hold project(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Expected in total</div><div class="pfs-val">${fmtSAR(all)}</div><div class="pfs-sub">Incl. VAT · open invoices and contract value not invoiced yet</div></div>
    </div>
    <p class="an-note">An invoice is expected ${PAY_DAYS} days after its issue date, because the system holds no due dates.</p>
    ${later.length?`<details class="an-details"><summary>Show the ${later.length} project(s) with value still to invoice</summary><div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Contract</th><th>Invoiced</th><th>Still to invoice</th></tr></thead><tbody>${rows}</tbody></table></div></details>`:''}`;
}
function renderInvoices(rows){
  const m=curMonth(),now=today(),label=monthLabel(m),paid=paidIn(rows,m);
  const open=rows.filter(r=>r.remaining>0.005).map(r=>({...r,age:r.date?Math.max(0,daysBetween(r.date,now)):null,exp:r.date?addDays(r.date,PAY_DAYS):''})).sort((a,b)=>(b.age??-1)-(a.age??-1));
  const ageCls=a=>a==null?'':a>90?'an-neg':a>30?'an-due':'';
  const paidBody=paid.length?paid.map(x=>`<tr><td class="an-nw">${esc(x.payDate)}</td><td class="an-nw"><strong>${esc(x.no)}</strong></td><td>${esc(x.client)}</td><td>${projectCell(x)}</td>
      <td class="an-num">${fmtSAR(x.paid)}${x.paid+0.005<x.amount?`<div class="an-sub">of ${fmtSAR(x.amount)}</div>`:''}</td><td>${esc([x.method,x.ref].filter(Boolean).join(' · ')||'—')}</td></tr>`).join('')
    :`<tr><td colspan="6" class="an-empty">No payments recorded in ${esc(label)}.</td></tr>`;
  const openBody=open.length?open.map(r=>`<tr><td class="an-nw"><strong>${esc(r.no)}</strong></td><td>${esc(r.client)}</td><td>${projectCell(r)}</td><td class="an-nw">${esc(r.date||'—')}</td>
      <td class="an-num ${ageCls(r.age)}">${r.age==null?'—':r.age+' days'}</td><td class="an-nw ${r.exp&&r.exp<=now?'an-neg':''}">${esc(r.exp||'—')}</td><td class="an-num">${fmtSAR(r.amount)}</td><td class="an-num">${fmtSAR(r.received)}</td><td class="an-num an-due">${fmtSAR(r.remaining)}</td></tr>`).join('')
    :'<tr><td colspan="9" class="an-empty">No open invoices.</td></tr>';
  return `<section class="an-sec" id="an-invoices">
    <div class="an-head"><div><h3>Invoices <span>الفواتير</span></h3><p>Amounts include VAT. Paid lists the receipts recorded in ${esc(label)}; open lists every invoice still unpaid today, oldest first.</p></div></div>
    <h4 class="an-h4">Paid in ${esc(label)} · ${paid.length} payment(s) · ${fmtSAR(total(paid,x=>x.paid))}</h4>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Paid on</th><th>Invoice</th><th>Client</th><th>Project</th><th>Received</th><th>Method / reference</th></tr></thead><tbody>${paidBody}</tbody></table></div>
    <h4 class="an-h4">Open invoices · ${open.length} · ${fmtSAR(total(open,r=>r.remaining))} outstanding</h4>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Invoice</th><th>Client</th><th>Project</th><th>Issued</th><th>Age</th><th>Expected by</th><th>Invoiced</th><th>Received</th><th>Outstanding</th></tr></thead><tbody>${openBody}</tbody></table></div>
    ${renderForecast(open,now)}
  </section>`;
}

// ── c. Quotations: issued, won, waiting for a reply ──────────────────────────
function renderQuotes(quotes){
  const m=curMonth(),now=today(),label=monthLabel(m);
  const inMonth=quotes.filter(q=>q.date.startsWith(m)),won=inMonth.filter(q=>q.won);
  const from=lastMonths(12)[0]+'-01',year=quotes.filter(q=>q.date&&q.date>=from),yearWon=year.filter(q=>q.won);
  const waiting=quotes.filter(q=>!q.won&&q.date).map(q=>({...q,age:daysBetween(q.date,now)})).filter(q=>q.age>30&&q.age<=180).sort((a,b)=>b.total-a.total);
  const row=q=>`<tr><td class="an-nw"><button type="button" class="an-link" onclick="previewSavedQuotation('${esc(q.id)}')">${esc(q.no)}</button></td><td>${esc(q.client)}</td><td class="an-subject">${esc(q.subject)}</td>
      <td class="an-nw">${esc(q.date)}</td><td class="an-num ${q.age>90?'an-neg':'an-due'}">${q.age} days</td><td class="an-num">${fmtSAR(q.total)}</td></tr>`;
  const head='<thead><tr><th>Quotation</th><th>Client</th><th>Subject</th><th>Date</th><th>Age</th><th>Total</th></tr></thead>';
  const TOP=10,body=waiting.length?waiting.slice(0,TOP).map(row).join('')
    :'<tr><td colspan="6" class="an-empty">No quotation older than 30 days is waiting for a reply.</td></tr>';
  const more=waiting.length>TOP?`<details class="an-details"><summary>Show the other ${waiting.length-TOP} quotation(s)</summary><div class="pd-table-wrap"><table class="pd-table an-table">${head}<tbody>${waiting.slice(TOP).map(row).join('')}</tbody></table></div></details>`:'';
  return `<section class="an-sec" id="an-quotes">
    <div class="an-head"><div><h3>Quotations <span>عروض الأسعار</span></h3><p>Totals include VAT. A quotation counts as won once it is linked to a project. The date is the quotation date, which moves when a quotation is revised.</p></div></div>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Quotations in ${label}</div><div class="pfs-val">${inMonth.length}</div><div class="pfs-sub">Incl. VAT · ${fmtSAR(total(inMonth,q=>q.total))}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Won from ${label}</div><div class="pfs-val ${won.length?'tone-ok':''}">${won.length}</div><div class="pfs-sub">Incl. VAT · ${fmtSAR(total(won,q=>q.total))}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Win rate, last 12 months</div><div class="pfs-val">${year.length?pct(yearWon.length/year.length*100):'—'}</div><div class="pfs-sub">${yearWon.length} of ${year.length} linked to a project</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Waiting over 30 days</div><div class="pfs-val ${waiting.length?'tone-warn':'tone-ok'}">${waiting.length}</div><div class="pfs-sub">Incl. VAT · ${fmtSAR(total(waiting,q=>q.total))} · up to 6 months old</div></div>
    </div>
    <h4 class="an-h4">Follow up: no project yet, 31 to 180 days old, largest first${waiting.length>TOP?` (top ${TOP} of ${waiting.length})`:''}</h4>
    <div class="pd-table-wrap"><table class="pd-table an-table">${head}<tbody>${body}</tbody></table></div>
    ${more}
  </section>`;
}

// ── d. VAT for the quarter of the selected month ─────────────────────────────
function renderVat(rows){
  const [y,mm]=curMonth().split('-').map(Number),qn=Math.floor((mm-1)/3),months=[1,2,3].map(i=>`${y}-${String(qn*3+i).padStart(2,'0')}`);
  const inQ=d=>months.includes(String(d||'').slice(0,7)),q=`Q${qn+1} ${y}`,range=`${MONTHS[qn*3]}–${MONTHS[qn*3+2]} ${y}`;
  const issued=rows.filter(r=>inQ(r.date)),sales=total(issued,r=>r.amount*r.ratio),vat=total(issued,r=>r.amount*(1-r.ratio));
  const got=rows.flatMap(r=>r.receipts.filter(rc=>inQ(isoDate(rc.date))).map(rc=>num(rc.amount)*(1-r.ratio)));
  const endM=qn*3+3,dueY=endM===12?y+1:y,dueM=endM===12?1:endM+1,dueDay=new Date(Date.UTC(dueY,dueM,0)).getUTCDate();
  return `<section class="an-sec" id="an-vat-q">
    <div class="an-head"><div><h3>VAT for ${q} <span>ضريبة الربع</span></h3><p>Output VAT on the invoices issued in ${range}, to prepare the VAT return. Input VAT on purchases (hotels, fuel, rentals) is not recorded here, so the amount payable is this output VAT minus the input VAT on your expense invoices.</p></div></div>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Sales in ${q}</div><div class="pfs-val">${fmtSAR(sales)}</div><div class="pfs-sub">Before VAT · ${issued.length} invoice(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Output VAT in ${q}</div><div class="pfs-val tone-warn">${fmtSAR(vat)}</div><div class="pfs-sub">VAT on invoices issued in ${range}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">VAT collected in ${q}</div><div class="pfs-val tone-ok">${fmtSAR(total(got,v=>v))}</div><div class="pfs-sub">VAT part of client payments received</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Quarterly return due</div><div class="pfs-val">${dueDay} ${MONTHS[dueM-1]} ${dueY}</div><div class="pfs-sub">End of the month after the quarter</div></div>
    </div>
  </section>`;
}

// ── 1. Profitability ─────────────────────────────────────────────────────────
function profitRows(){
  const from=costingFrom();
  return projects.filter(p=>!S.status||statusOf(p)===S.status).map(p=>{
    const f=sfProjectFinance(p),start=isoDate(p.start),flags=[];
    if(f.contractNet>0&&f.expectedProfit<0)flags.push(['bad','Expected loss','خسارة متوقعة']);
    if(f.estimated>0&&f.actual>f.estimated)flags.push(['bad','Cost over estimate','تجاوز التكلفة المقدّرة']);
    else if(f.estimated>0&&f.costUsedPct>=80&&f.invoicedNet<f.contractNet*0.8)flags.push(['warn','80%+ of cost used, under 80% invoiced','صُرف أكثر مما فُوتر']);
    if(!f.hasEstimate)flags.push(['info',`No cost estimate · at most ${fmtSAR(f.profitCeiling)}`,'بلا تكلفة مقدّرة']);
    // Projects started before attendance costing: shown once under the actual cost instead of a flag on every row.
    return{p,f,flags,early:!!(from&&start&&start.slice(0,7)<from)};
  });
}
function sortProfit(rows){
  const by={
    margin:(a,b)=>(a.f.expectedMargin??Infinity)-(b.f.expectedMargin??Infinity),
    profit:(a,b)=>(b.f.expectedProfit??-Infinity)-(a.f.expectedProfit??-Infinity),
    contract:(a,b)=>b.f.contractNet-a.f.contractNet,
    cost:(a,b)=>(b.f.costUsedPct??-1)-(a.f.costUsedPct??-1)
  }[S.sort]||(()=>0);
  return rows.slice().sort(by);
}
function costBar(f){
  if(f.costUsedPct==null)return '<span class="an-muted">—</span>';
  const used=f.costUsedPct,scale=Math.max(100,used),w=Math.min(100,used/scale*100),mark=100/scale*100;
  const tone=used>100?'bad':used>=80?'warn':'ok';
  return `<div class="an-cost" title="${esc(pct(used))} of the estimated cost used"><div class="an-cost-track"><div class="an-cost-fill ${tone}" style="width:${w.toFixed(1)}%"></div><div class="an-cost-mark" style="left:${mark.toFixed(1)}%"></div></div><span class="an-cost-txt ${tone}">${pct(used)}</span></div>`;
}
function renderProfit(){
  if(!canSeeCost())return '';
  const rows=sortProfit(profitRows());
  const t=rows.reduce((s,r)=>{s.contract+=r.f.contractNet;s.est+=r.f.estimated;s.actual+=r.f.actual;s.comm+=r.f.commission;if(r.f.hasEstimate){s.exp+=r.f.expectedProfit;s.estContract+=r.f.contractNet}else s.noEst++;s.cash+=r.f.cashProfit;s.received+=r.f.receivedNet;return s},{contract:0,est:0,actual:0,comm:0,exp:0,estContract:0,noEst:0,cash:0,received:0});
  const attention=rows.filter(r=>r.flags.some(x=>x[0]==='bad'||x[0]==='warn')).length;
  const from=costingFrom();
  const body=rows.length?rows.map(({p,f,flags,early})=>`<tr>
      <td><button type="button" class="an-link" onclick="openProjectDetails('${esc(p.id)}')">${esc(p.name||'Project')}</button><div class="an-sub">${esc(p.client||'—')} · ${STATUS_LABEL[statusOf(p)]}</div></td>
      <td class="an-num">${fmtSAR(f.contractNet)}</td>
      <td class="an-num">${f.estimated?fmtSAR(f.estimated):'<span class="an-muted">—</span>'}</td>
      <td class="an-num">${fmtSAR(f.actual)}${early?`<div class="an-sub">Labour from ${esc(from)} only</div>`:''}</td>
      <td>${costBar(f)}</td>
      <td class="an-num">${fmtSAR(f.commission)}</td>
      <td class="an-num ${f.expectedProfit<0?'an-neg':''}">${f.hasEstimate?`${fmtSAR(f.expectedProfit)}<div class="an-sub">${f.expectedMargin==null?'':pct(f.expectedMargin)}${f.costOverEstimate?' · on actual cost':''}</div>`:`<span class="an-muted">—</span><div class="an-sub"><button type="button" class="an-link an-add" onclick="openProjectDetails('${esc(p.id)}')">Add estimate</button></div>`}</td>
      <td class="an-num ${f.cashProfit<0?'an-neg':''}">${fmtSAR(f.cashProfit)}</td>
      <td class="an-notes">${flags.map(([k,en,ar])=>`<span class="an-flag ${k}">${esc(en)}<bdi dir="rtl" class="an-flag-ar">${esc(ar)}</bdi></span>`).join('')}</td></tr>`).join('')
    :'<tr><td colspan="9" class="an-empty">No projects match this filter.</td></tr>';
  const margin=t.estContract>0?t.exp/t.estContract*100:0;
  return `<section class="an-sec" id="an-profit">
    <div class="an-head"><div><h3>Profitability by project <span>الربحية</span></h3><p>All amounts are before VAT. Expected profit = contract − expected cost (the larger of estimated and actual) − commission. Cash profit = received − actual cost − commission.</p></div>
      <div class="an-controls"><label>Status<select id="an-status" onchange="sfAnalyticsSet('status',this.value)">${opt('','All',S.status)}${opt('active','Active',S.status)}${opt('completed','Completed',S.status)}${opt('hold','On Hold',S.status)}</select></label>
      <label>Sort<select id="an-sort" onchange="sfAnalyticsSet('sort',this.value)">${opt('margin','Lowest margin first',S.sort)}${opt('profit','Highest expected profit',S.sort)}${opt('contract','Largest contract',S.sort)}${opt('cost','Most cost used',S.sort)}</select></label></div></div>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Contracts before VAT</div><div class="pfs-val">${fmtSAR(t.contract)}</div><div class="pfs-sub">${rows.length} project(s)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Expected profit</div><div class="pfs-val ${t.exp<0?'tone-alert':'tone-ok'}">${fmtSAR(t.exp)}</div><div class="pfs-sub">Before VAT · margin ${pct(margin)}${t.noEst?` · ${t.noEst} project(s) without estimate not included`:''}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Cash profit to date</div><div class="pfs-val ${t.cash<0?'tone-alert':''}">${fmtSAR(t.cash)}</div><div class="pfs-sub">Received before VAT ${fmtSAR(t.received)}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Need attention</div><div class="pfs-val ${attention?'tone-warn':'tone-ok'}">${attention}</div><div class="pfs-sub">Loss, over estimate or under-invoiced</div></div>
    </div>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Project</th><th>Contract</th><th>Estimated cost</th><th>Actual cost</th><th>Cost used</th><th>Commission</th><th>Expected profit</th><th>Cash profit</th><th>Notes</th></tr></thead>
      <tbody>${body}</tbody>${rows.length?`<tfoot><tr><td>Total</td><td class="an-num">${fmtSAR(t.contract)}</td><td class="an-num">${fmtSAR(t.est)}</td><td class="an-num">${fmtSAR(t.actual)}</td><td></td><td class="an-num">${fmtSAR(t.comm)}</td><td class="an-num">${fmtSAR(t.exp)}</td><td class="an-num">${fmtSAR(t.cash)}</td><td></td></tr></tfoot>`:''}</table></div>
    ${costingFrom()?`<p class="an-note">Labour cost from attendance (salary days, site allowance, overtime) is posted to projects from ${esc(costingFrom())}. Projects that started earlier show a lower actual cost than they really had.</p>`:''}
  </section>`;
}

// ── 2. Collection and ageing ─────────────────────────────────────────────────
const BUCKETS=[['b0','0–30 days'],['b1','31–60'],['b2','61–90'],['b3','Over 90'],['nd','No date']];
function collectionData(){
  const now=today(),items=[];
  projects.forEach(p=>(p.payments||[]).forEach(raw=>{
    const pay=sfNormalizePaymentRecord(raw);
    items.push({client:String(p.client||'').trim()||'No client',date:isoDate(pay.date),amount:num(pay.amount),received:pay.receivedAmount,remaining:paymentRemainingAmount(pay)});
  }));
  (typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():(typeof proformaInvoices!=='undefined'?proformaInvoices:[]).filter(pi=>!pi.projectId||!projects.some(p=>p.id===pi.projectId))).forEach(pi=>{
    let g=0;try{g=num((resolvedProformaCalculation(pi)||{}).grandTotal)}catch(_){}
    items.push({client:String(pi.clientName||'').trim()||'No client',date:isoDate(pi.issueDate),amount:g,received:0,remaining:g});
  });
  const by=new Map();
  items.forEach(x=>{
    const c=by.get(x.client)||{client:x.client,invoiced:0,received:0,outstanding:0,open:0,b0:0,b1:0,b2:0,b3:0,nd:0,oldest:0};
    c.invoiced+=x.amount;c.received+=x.received;
    if(x.remaining>0.005){
      c.outstanding+=x.remaining;c.open++;
      if(!x.date)c.nd+=x.remaining;
      else{const age=Math.max(0,daysBetween(x.date,now));c[age<=30?'b0':age<=60?'b1':age<=90?'b2':'b3']+=x.remaining;c.oldest=Math.max(c.oldest,age)}
    }
    by.set(x.client,c);
  });
  const clients=[...by.values()].sort((a,b)=>b.outstanding-a.outstanding||b.invoiced-a.invoiced);
  const notInvoiced=projects.reduce((s,p)=>s+Math.max(0,num(p.contract)-(p.payments||[]).reduce((a,x)=>a+num(x.amount),0)),0);
  return{clients,notInvoiced};
}
function renderCollection(){
  const {clients,notInvoiced}=collectionData();
  const tot=clients.reduce((s,c)=>{['invoiced','received','outstanding','b0','b1','b2','b3','nd'].forEach(k=>s[k]+=c[k]);return s},{invoiced:0,received:0,outstanding:0,b0:0,b1:0,b2:0,b3:0,nd:0});
  const showNd=tot.nd>0.005,cols=BUCKETS.filter(([k])=>k!=='nd'||showNd);
  const bar=c=>c.outstanding>0?`<div class="an-age" title="Outstanding by age">${cols.map(([k])=>c[k]>0?`<span class="an-age-${k}" style="width:${(c[k]/c.outstanding*100).toFixed(1)}%"></span>`:'').join('')}</div>`:'<span class="an-muted">Paid</span>';
  const rows=clients.filter(c=>c.invoiced>0.005).map(c=>`<tr><td><strong>${esc(c.client)}</strong><div class="an-sub">${c.open?`${c.open} open invoice(s)${c.oldest?`, oldest ${c.oldest} days`:''}`:'All paid'}</div></td>
      <td class="an-num">${fmtSAR(c.invoiced)}</td><td class="an-num">${fmtSAR(c.received)}</td><td class="an-num ${c.outstanding>0.005?'an-due':''}">${fmtSAR(c.outstanding)}</td>
      ${cols.map(([k])=>`<td class="an-num ${k==='b3'&&c[k]>0?'an-neg':''}">${c[k]>0.005?fmtSAR(c[k]):'<span class="an-muted">—</span>'}</td>`).join('')}<td>${bar(c)}</td></tr>`).join('');
  return `<section class="an-sec" id="an-collection">
    <div class="an-head"><div><h3>Collection and invoice age <span>التحصيل وأعمار الفواتير</span></h3><p>Amounts include VAT, because this is what clients owe. Age is counted from the invoice issue date (the system does not hold due dates).</p></div></div>
    <div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Invoiced</div><div class="pfs-val">${fmtSAR(tot.invoiced)}</div><div class="pfs-sub">Incl. VAT</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Received</div><div class="pfs-val tone-ok">${fmtSAR(tot.received)}</div><div class="pfs-sub">Incl. VAT · ${tot.invoiced>0?pct(tot.received/tot.invoiced*100)+' of invoiced':'—'}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Outstanding</div><div class="pfs-val tone-warn">${fmtSAR(tot.outstanding)}</div><div class="pfs-sub">${tot.b3>0.005?`${fmtSAR(tot.b3)} older than 90 days`:'Nothing older than 90 days'}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Not invoiced yet</div><div class="pfs-val">${fmtSAR(notInvoiced)}</div><div class="pfs-sub">Incl. VAT · contract value still to invoice</div></div>
    </div>
    <div class="an-legend">${cols.map(([k,l])=>`<span><i class="an-age-${k}"></i>${l}</span>`).join('')}</div>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Client</th><th>Invoiced</th><th>Received</th><th>Outstanding</th>${cols.map(([,l])=>`<th>${l}</th>`).join('')}<th>Outstanding by age</th></tr></thead>
      <tbody>${rows||`<tr><td colspan="${5+cols.length}" class="an-empty">No invoices yet.</td></tr>`}</tbody>
      ${rows?`<tfoot><tr><td>Total</td><td class="an-num">${fmtSAR(tot.invoiced)}</td><td class="an-num">${fmtSAR(tot.received)}</td><td class="an-num">${fmtSAR(tot.outstanding)}</td>${cols.map(([k])=>`<td class="an-num">${fmtSAR(tot[k])}</td>`).join('')}<td></td></tr></tfoot>`:''}</table></div>
  </section>`;
}

// ── 3. Monthly trend ─────────────────────────────────────────────────────────
// inv/col hold amounts incl. VAT (what clients are billed and pay); invNet/colNet the same before VAT.
function trendData(){
  const keys=lastMonths(12),at=new Map(keys.map((k,i)=>[k,i])),zero=()=>keys.map(()=>0);
  const inv=zero(),invNet=zero(),col=zero(),colNet=zero(),cost=zero();
  const put=(arr,date,v)=>{const k=isoDate(date).slice(0,7);if(at.has(k))arr[at.get(k)]+=v};
  projects.forEach(p=>{
    (p.payments||[]).forEach(raw=>{
      const pay=sfNormalizePaymentRecord(raw),r=sfPaymentNetRatio(p,pay),a=num(pay.amount);
      put(inv,pay.date,a);put(invNet,pay.date,a*r);
      (pay.receipts||[]).forEach(rc=>{const v=num(rc.amount);put(col,rc.date,v);put(colNet,rc.date,v*r)});
    });
    (p.actualExpenses||[]).forEach(x=>put(cost,x.date,num(x.amount)));
  });
  (typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():(typeof proformaInvoices!=='undefined'?proformaInvoices:[]).filter(pi=>!pi.projectId||!projects.some(p=>p.id===pi.projectId))).forEach(pi=>{
    try{
      const t=resolvedProformaCalculation(pi)||{},net=num(t.totalAfterDiscount)||num(t.grandTotal)/1.15;
      put(inv,pi.issueDate,num(t.grandTotal)||net*1.15);put(invNet,pi.issueDate,net);
    }catch(_){}
  });
  return{keys,inv,invNet,col,colNet,cost};
}
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function shortSar(v){const a=Math.abs(v);return a>=1e6?(v/1e6).toFixed(a>=1e7?0:1)+'M':a>=1e3?(v/1e3).toFixed(a>=1e4?0:1)+'k':String(Math.round(v))}
function trendChart(d,series){
  const W=760,H=250,L=48,R=10,T=14,B=30,cw=(W-L-R)/d.keys.length,max=niceMax(Math.max(1,...series.flatMap(s=>s.v)));
  const y=v=>T+(H-T-B)*(1-v/max),bw=Math.min(16,(cw-8)/series.length);
  let g='';
  for(let i=0;i<=4;i++){const v=max*i/4,yy=y(v).toFixed(1);g+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="an-grid"/><text x="${L-6}" y="${(+yy+3.5).toFixed(1)}" text-anchor="end" class="an-axis">${shortSar(v)}</text>`}
  d.keys.forEach((k,i)=>{
    const x0=L+i*cw+(cw-bw*series.length)/2;
    series.forEach((s,j)=>{const v=s.v[i];if(v>0)g+=`<rect x="${(x0+j*bw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw-1.5).toFixed(1)}" height="${(H-B-y(v)).toFixed(1)}" rx="1.5" class="${s.cls}"><title>${monthLabel(k)} · ${s.name}: ${fmtSAR(v)}</title></rect>`});
    g+=`<text x="${(L+i*cw+cw/2).toFixed(1)}" y="${H-B+16}" text-anchor="middle" class="an-axis">${monthLabel(k)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="an-chart" role="img" aria-label="Monthly ${series.map(s=>s.name).join(', ')} for the last 12 months">${g}</svg>`;
}
function renderTrend(){
  const d=trendData(),cost=canSeeCost(),vat=S.vat;
  const inv=vat?d.inv:d.invNet,col=vat?d.col:d.colNet;
  const series=[{name:'Invoiced',cls:'an-s-inv',v:inv},{name:'Collected',cls:'an-s-col',v:col}].concat(cost?[{name:'Cost',cls:'an-s-cost',v:d.cost}]:[]);
  const sum=a=>a.reduce((s,v)=>s+v,0);
  // Collected − cost always uses collections before VAT: the VAT part is owed to ZATCA, not earned.
  const margin=i=>d.colNet[i]-d.cost[i];
  const rows=d.keys.map((k,i)=>`<tr><td>${monthLabel(k)}</td><td class="an-num">${fmtSAR(inv[i])}</td><td class="an-num">${fmtSAR(col[i])}</td>${cost?`<td class="an-num">${fmtSAR(d.cost[i])}</td><td class="an-num ${margin(i)<0?'an-neg':''}">${fmtSAR(margin(i))}</td>`:''}</tr>`).reverse().join('');
  const basis=vat?'Incl. VAT, as billed to and paid by clients.':'Before VAT.';
  return `<section class="an-sec" id="an-trend">
    <div class="an-head"><div><h3>Monthly trend, last 12 months <span>الاتجاه الشهري</span></h3><p>${basis} Invoiced by invoice date, collected by receipt date${cost?', cost by expense date as recorded':''}.${cost&&vat?' Collected − cost uses collections before VAT.':''}</p></div>
      <div class="an-controls"><label>Amounts<select id="an-vat" onchange="sfAnalyticsSet('vat',this.value)">${opt('incl','Incl. VAT',vat?'incl':'net')}${opt('net','Before VAT',vat?'incl':'net')}</select></label></div></div>
    <div class="an-legend">${series.map(s=>`<span><i class="${s.cls}"></i>${s.name} ${fmtSAR(sum(s.v))}</span>`).join('')}</div>
    <div class="an-chart-wrap">${trendChart(d,series)}</div>
    <details class="an-details"><summary>Show the numbers by month</summary><div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Month</th><th>Invoiced</th><th>Collected</th>${cost?`<th>Cost</th><th>Collected${vat?' before VAT':''} − cost</th>`:''}</tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>12 months</td><td class="an-num">${fmtSAR(sum(inv))}</td><td class="an-num">${fmtSAR(sum(col))}</td>${cost?`<td class="an-num">${fmtSAR(sum(d.cost))}</td><td class="an-num">${fmtSAR(sum(d.colNet)-sum(d.cost))}</td>`:''}</tr></tfoot></table></div></details>
    ${cost&&costingFrom()?`<p class="an-note">Cost before ${esc(costingFrom())} holds invoices and manual expenses only; labour cost from attendance starts in ${esc(costingFrom())}.</p>`:''}
  </section>`;
}

// ── 4. Engineer utilisation ──────────────────────────────────────────────────
async function loadUtil(month){
  const token=++S.utilToken;S.utilLoading=true;S.utilError='';S.util=null;S.utilMonth=month;paintUtil();
  try{
    if(!sfDb||!sfCurrentUser)throw Error('Sign in to load attendance.');
    const {data:me,error:meError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
    if(meError)throw meError;
    if(me?.role!=='admin')throw Error('An attendance administrator account is needed to read every engineer’s attendance. / يلزم حساب إدارة الحضور.');
    const [y,m]=month.split('-').map(Number),end=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}-01`;
    const members=await sfDb.from('sf_daily_members').select('user_id,name,engineer_id');
    if(members.error)throw members.error;
    const records=[];
    for(let o=0;;o+=1000){
      const {data,error}=await sfDb.from('sf_daily_records').select('user_id,day,status,overtime,review').gte('day',month+'-01').lt('day',end).order('day').order('id').range(o,o+999);
      if(error)throw error;records.push(...(data||[]));if(!data||data.length<1000)break;
    }
    if(token!==S.utilToken)return;
    const names=new Map((members.data||[]).map(x=>[x.user_id,x.name||x.engineer_id||'Engineer']));
    const by=new Map();
    records.forEach(r=>{
      const e=by.get(r.user_id)||{id:r.user_id,name:names.get(r.user_id)||'Engineer',site:0,office:0,leave:0,absent:0,pending:0,rejected:0,ot:0};
      if(r.review==='approved'){
        if(r.status==='inside'||r.status==='outside')e.site++;else if(r.status==='office')e.office++;else if(r.status==='leave')e.leave++;else if(r.status==='absent')e.absent++;
        e.ot+=num(r.overtime);
      }else if(r.review==='rejected')e.rejected++;else e.pending++;
      by.set(r.user_id,e);
    });
    S.util=[...by.values()].sort((a,b)=>b.site-a.site||a.name.localeCompare(b.name));
  }catch(error){if(token===S.utilToken)S.utilError=error?.message||String(error)}
  finally{if(token===S.utilToken){S.utilLoading=false;paintUtil()}}
}
function utilBody(){
  if(S.utilLoading)return '<div class="an-empty">Loading attendance… / جاري تحميل الحضور…</div>';
  if(S.utilError)return `<div class="an-error">${esc(S.utilError)}</div>`;
  if(!S.util)return '';
  if(!S.util.length)return `<div class="an-empty">No attendance recorded in ${esc(monthLabel(S.utilMonth))}.</div>`;
  const t=S.util.reduce((s,e)=>{['site','office','leave','absent','pending','ot'].forEach(k=>s[k]+=e[k]);return s},{site:0,office:0,leave:0,absent:0,pending:0,ot:0});
  const share=e=>e.site+e.office>0?e.site/(e.site+e.office)*100:null;
  const mix=e=>{const all=e.site+e.office+e.leave+e.absent;return all?`<div class="an-mix">${[['site',e.site],['office',e.office],['leave',e.leave],['absent',e.absent]].map(([k,v])=>v?`<span class="an-mix-${k}" style="width:${(v/all*100).toFixed(1)}%"></span>`:'').join('')}</div>`:'<span class="an-muted">—</span>'};
  const rows=S.util.map(e=>{const s=share(e);return `<tr><td><strong>${esc(e.name)}</strong></td><td class="an-num">${e.site}</td><td class="an-num">${e.office}</td><td class="an-num">${e.leave}</td><td class="an-num ${e.absent?'an-neg':''}">${e.absent}</td>
    <td class="an-num">${e.pending?`<span class="an-flag warn">${e.pending}</span>`:'0'}</td><td class="an-num">${Math.round(e.ot*10)/10}</td><td class="an-num">${s==null?'—':pct(s)}</td><td>${mix(e)}</td></tr>`}).join('');
  const all=t.site+t.office;
  // Engineers with at least 5 office days and no more site days than office days: candidates for a site or rental job.
  const bench=S.util.filter(e=>e.office>=5&&e.office>=e.site).sort((a,b)=>b.office-a.office||a.name.localeCompare(b.name));
  const benchNote=bench.length?`<div class="an-callout"><div class="an-callout-h">Mostly in the office in ${esc(monthLabel(S.utilMonth))}</div><div>${bench.map(e=>`<span class="an-chip"><bdi>${esc(e.name)}</bdi> · ${e.office} office day(s)</span>`).join('')}</div><div class="an-sub">Free for a site or rental assignment, unless they are office staff.</div></div>`:'';
  return `${benchNote}<div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Site days</div><div class="pfs-val">${t.site}</div><div class="pfs-sub">${S.util.length} engineer(s), approved days</div></div>
      <div class="pfs-card"><div class="pfs-lbl">On site share</div><div class="pfs-val tone-ok">${all?pct(t.site/all*100):'—'}</div><div class="pfs-sub">Site ÷ (site + office)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Overtime hours</div><div class="pfs-val">${Math.round(t.ot*10)/10}</div><div class="pfs-sub">Approved</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Awaiting approval</div><div class="pfs-val ${t.pending?'tone-warn':'tone-ok'}">${t.pending}</div><div class="pfs-sub">Days not yet reviewed</div></div>
    </div>
    <div class="an-legend"><span><i class="an-mix-site"></i>Site</span><span><i class="an-mix-office"></i>Office</span><span><i class="an-mix-leave"></i>Leave</span><span><i class="an-mix-absent"></i>Absent</span></div>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Engineer</th><th>Site</th><th>Office</th><th>Leave</th><th>Absent</th><th>Pending</th><th>OT hours</th><th>On site</th><th>Month mix</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="an-note">Counts approved days only; pending days are shown separately and are not in the totals. ${S.utilMonth===today().slice(0,7)?'This month is still in progress.':''}</p>`;
}
// Phones show every table row as a card: each cell gets its column name in a span, which is hidden on wide
// screens. The span is ordinary text, so the Arabic interface translates it like the column heading.
function labelTables(el){
  if(!el||typeof el.querySelectorAll!=='function')return;
  el.querySelectorAll('table.an-table').forEach(tb=>{
    const heads=[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    tb.querySelectorAll('tbody tr, tfoot tr').forEach(tr=>[...tr.children].forEach((td,i)=>{
      if(td.colSpan>1||td.querySelector(':scope > .an-lbl'))return;
      const v=document.createElement('div');v.className='an-val';while(td.firstChild)v.appendChild(td.firstChild);
      const l=document.createElement('span');l.className='an-lbl';l.setAttribute('aria-hidden','true');l.textContent=heads[i]||'';
      td.append(l,v);
    }));
  });
}
function paintUtil(){const el=document.getElementById('an-util-body');if(el){el.innerHTML=utilBody();labelTables(el)}}
function renderUtil(){
  if(!canSeeCost())return '';
  return `<section class="an-sec" id="an-util">
    <div class="an-head"><div><h3>Engineer utilisation, ${esc(monthName(curMonth()))} <span>استغلال المهندسين</span></h3><p>From approved attendance: days on site, in the office, on leave and absent, with overtime. Change the month at the top of the page.</p></div></div>
    <div id="an-util-body">${utilBody()}</div>
  </section>`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
function render(opts={}){
  const root=document.getElementById('analytics-root');if(!root)return;
  if(typeof projects==='undefined'){root.innerHTML='<div class="an-empty">Loading…</div>';return}
  const month=curMonth(),rows=invoiceRows(),quotes=quoteRows();
  root.innerHTML=renderMonth(rows,quotes)+renderInvoices(rows)+renderQuotes(quotes)+renderVat(rows)+renderCollection()+renderTrend()+renderProfit()+renderUtil()+
    (canSeeCost()?'':'<p class="an-note">Profitability and engineer figures are available to accounts with payroll access.</p>');
  labelTables(root);
  if(canSeeCost()&&(opts.reload||S.utilMonth!==month||(!S.util&&!S.utilLoading&&!S.utilError)))void loadUtil(month);
}
window.sfRenderAnalytics=render;
window.sfAnalyticsSet=function(key,value){
  if(key==='status')S.status=value;
  else if(key==='sort')S.sort=value;
  else if(key==='vat'){S.vat=value!=='net';try{localStorage.setItem('sfAnalyticsTrendVat',S.vat?'incl':'net')}catch(_){}}
  else if(key==='month'){if(!/^\d{4}-\d{2}$/.test(value||''))return;S.month=value}
  render();
};

const css=`
.an-sec{background:#fff;border:1px solid var(--gray-200,#e5e7eb);border-radius:12px;padding:16px 18px;margin:0 0 16px}
.an-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:12px}
.an-head h3{margin:0;font-size:16px;color:var(--navy,#1F3864)}.an-head h3 span{font-size:13px;font-weight:600;color:var(--gray-500,#6b7280);margin-inline-start:6px}
.an-head p{margin:4px 0 0;font-size:11.5px;color:var(--gray-600,#4b5563);max-width:72ch;line-height:1.5}
.an-controls{display:flex;gap:10px;flex-wrap:wrap}.an-controls label{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:600;color:var(--gray-600,#4b5563)}
.an-controls select,.an-controls input{padding:6px 8px;border:1px solid var(--gray-300,#d1d5db);border-radius:6px;font:inherit;font-weight:400;font-size:12px;background:#fff}
.an-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0;border:none;margin:0 0 12px}
.an-table{min-width:860px}
.an-sec .an-table th,.an-sec .an-table td{text-align:center;vertical-align:middle}
.an-sec .an-table .an-link,.an-sec .an-table .an-sub,.an-sec .an-table .an-flag{text-align:center}
#an-profit .an-cost{justify-content:center}
.an-notes{min-width:220px}
.an-table td:first-child{min-width:150px}
.an-table td{vertical-align:top;padding:7px 8px;border-bottom:1px solid var(--gray-100,#f3f4f6)}
.an-table tfoot td{font-weight:700;background:var(--gray-100,#f3f4f6);border-top:2px solid var(--gray-300,#d1d5db)}
.an-num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.an-sub{font-size:11px;color:var(--gray-500,#6b7280);margin-top:2px;font-weight:400}
.an-muted{color:var(--gray-400,#9ca3af)}.an-neg{color:#b91c1c}.an-due{color:#c2410c;font-weight:700}
.an-link{background:none;border:none;padding:0;font:inherit;font-weight:700;color:var(--navy,#1F3864);cursor:pointer;text-align:left}.an-link:hover{color:var(--orange,#E8610A);text-decoration:underline}
.an-flag{display:inline-block;font-size:11px;font-weight:600;border-radius:4px;padding:3px 7px;margin:0 4px 4px 0;line-height:1.35;max-width:220px}
.an-flag-ar{display:block;font-weight:500;opacity:.85}
.an-flag.bad{background:#fee2e2;color:#991b1b}.an-flag.warn{background:#ffedd5;color:#9a3412}.an-flag.info{background:var(--gray-100,#f3f4f6);color:var(--gray-600,#4b5563)}
.an-cost{display:flex;align-items:center;gap:6px;min-width:120px}
.an-cost-track{position:relative;flex:1;height:8px;background:var(--gray-100,#f3f4f6);border-radius:4px}
.an-cost-fill{height:100%;border-radius:4px}.an-cost-fill.ok{background:#16a34a}.an-cost-fill.warn{background:#f59e0b}.an-cost-fill.bad{background:#dc2626}
.an-cost-mark{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--navy,#1F3864)}
.an-cost-txt{font-size:11px;font-weight:700;min-width:42px;text-align:right}.an-cost-txt.ok{color:#15803d}.an-cost-txt.warn{color:#b45309}.an-cost-txt.bad{color:#b91c1c}
.an-age,.an-mix{display:flex;height:10px;min-width:120px;border-radius:5px;overflow:hidden;background:var(--gray-100,#f3f4f6)}
.an-age-b0{background:#16a34a}.an-age-b1{background:#f59e0b}.an-age-b2{background:#ea580c}.an-age-b3{background:#b91c1c}.an-age-nd{background:#9ca3af}
.an-mix-site{background:var(--orange,#E8610A)}.an-mix-office{background:var(--navy,#1F3864)}.an-mix-leave{background:#9ca3af}.an-mix-absent{background:#dc2626}
.an-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--gray-600,#4b5563);margin:0 0 8px}
.an-legend span{display:inline-flex;align-items:center;gap:5px}.an-legend i{display:inline-block;width:10px;height:10px;border-radius:2px}
.an-chart-wrap{overflow-x:auto}.an-chart{width:100%;min-width:560px;height:auto;display:block}
.an-grid{stroke:var(--gray-200,#e5e7eb);stroke-width:1}.an-axis{font-size:11px;fill:var(--gray-500,#6b7280)}
.an-s-inv{fill:var(--navy,#1F3864);background:var(--navy,#1F3864)}.an-s-col{fill:#16a34a;background:#16a34a}.an-s-cost{fill:var(--orange,#E8610A);background:var(--orange,#E8610A)}
.an-h4{margin:14px 0 6px;font-size:13px;font-weight:700;color:var(--navy,#1F3864)}
.an-sec .an-table td.an-subject{max-width:340px;text-align:start;white-space:normal}
.an-sec .an-table td.an-nw{white-space:nowrap}
.an-link.an-add{font-size:11px;font-weight:600;color:var(--orange,#E8610A)}
.an-callout{border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:10px 12px;margin:0 0 12px}
.an-callout-h{font-size:12px;font-weight:700;color:#9a3412;margin-bottom:6px}
.an-chip{display:inline-block;font-size:12px;background:#fff;border:1px solid #fed7aa;border-radius:999px;padding:3px 10px;margin:0 6px 6px 0}
.an-details{margin-top:8px;font-size:12px}.an-details summary{cursor:pointer;color:var(--navy,#1F3864);font-weight:600;margin-bottom:6px}
.an-note{font-size:11px;color:var(--gray-500,#6b7280);margin:10px 0 0;line-height:1.55}
.an-empty{padding:18px;text-align:center;color:var(--gray-500,#6b7280);font-size:12px}
.an-error{padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:12px}
.an-lbl{display:none}
@media(max-width:900px){.an-strip{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.an-sec{padding:12px}.an-head h3{font-size:15px}
  .an-head{flex-direction:column;align-items:stretch}.an-controls label,.an-controls select,.an-controls input{width:100%}
  .an-sec .pd-table-wrap{overflow:visible}
  .an-sec .an-table{min-width:0;width:100%;border:none;background:none}
  .an-sec .an-table thead{display:none}
  .an-sec .an-table,.an-sec .an-table tbody,.an-sec .an-table tfoot,.an-sec .an-table tr{display:block;width:100%}
  .an-sec .an-table tr{border:1px solid var(--gray-200,#e5e7eb);border-radius:10px;margin:0 0 10px;padding:2px 12px;background:#fff}
  .an-sec .an-table tfoot tr{background:var(--gray-100,#f3f4f6)}
  .an-sec .an-table td,.an-sec .an-table tfoot td{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;min-width:0;max-width:none;padding:6px 0;border:none;border-bottom:1px solid var(--gray-100,#f3f4f6);background:none;text-align:end;white-space:normal}
  .an-sec .an-table td:last-child{border-bottom:none}
  .an-sec .an-table td:has(> .an-val:empty){display:none}
  .an-sec .an-table td.an-subject,.an-sec .an-table td.an-nw{max-width:none;white-space:normal}
  .an-sec .an-table .an-lbl{display:block;flex:0 0 42%;font-size:11px;font-weight:600;color:var(--gray-500,#6b7280);text-align:start}
  .an-sec .an-table .an-val{flex:1;min-width:0;text-align:end}
  .an-sec .an-table td:first-child{font-size:14px;padding-top:9px}
  .an-sec .an-table td:first-child .an-lbl{display:none}
  .an-sec .an-table td:first-child .an-val{text-align:start}
  .an-sec .an-table .an-val .an-sub,.an-sec .an-table .an-val .an-link,.an-sec .an-table .an-val .an-flag{text-align:inherit}
  .an-sec .an-table td.an-empty{display:block;text-align:center}
  .an-sec .an-table .an-cost,.an-sec .an-table .an-age,.an-sec .an-table .an-mix{min-width:0;width:100%}
  .an-notes{min-width:0}.an-flag{max-width:none}}
`;
const style=document.createElement('style');style.id='sf-analytics-style';style.textContent=css;document.head.appendChild(style);
})();

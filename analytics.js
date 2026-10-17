/* Sky Field — Analytics / التحليلات
 * Four views built from data the app already holds:
 *   1. Profitability by project (before VAT)        — payroll access only
 *   2. Collection and invoice ageing by client      — everyone with the commercial system
 *   3. Monthly trend: invoiced, collected, cost     — cost series for payroll access only
 *   4. Engineer utilisation from approved attendance — payroll access + attendance admin
 * Nothing here writes data. Amounts use the same functions as the project pages
 * (sfProjectFinance, sfNormalizePaymentRecord, resolvedProformaCalculation).
 */
(function(){
'use strict';

const S={status:'',sort:'margin',month:'',util:null,utilMonth:'',utilError:'',utilLoading:false,utilToken:0};
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0};
const esc=v=>escHtml(String(v??''));
const pct=v=>(Math.round(v*10)/10).toFixed(1)+'%';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const canSeeCost=()=>typeof sfHasAccess==='function'&&sfHasAccess('payroll');
const costingFrom=()=>typeof SF_ATTENDANCE_COSTING_FROM==='string'?SF_ATTENDANCE_COSTING_FROM:'';
const isoDate=v=>typeof sfIsoDate==='function'?sfIsoDate(v):String(v||'').slice(0,10);
function today(){try{if(typeof sfRiyadhToday==='function')return sfRiyadhToday()}catch(_){}return new Date().toISOString().slice(0,10)}
function daysBetween(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)}
function monthLabel(key){const [y,m]=key.split('-');return MONTHS[(+m||1)-1]+' '+y.slice(2)}
function lastMonths(n){
  const t=today();let y=+t.slice(0,4),m=+t.slice(5,7);const out=[];
  for(let i=0;i<n;i++){out.unshift(`${y}-${String(m).padStart(2,'0')}`);if(--m===0){m=12;y--}}
  return out;
}
const statusOf=p=>({active:'active',completed:'completed',hold:'hold'}[p.status]||'active');
const STATUS_LABEL={active:'Active',completed:'Completed',hold:'On Hold'};

// ── 1. Profitability ─────────────────────────────────────────────────────────
function profitRows(){
  const from=costingFrom();
  return projects.filter(p=>!S.status||statusOf(p)===S.status).map(p=>{
    const f=sfProjectFinance(p),start=isoDate(p.start),flags=[];
    if(f.contractNet>0&&f.expectedProfit<0)flags.push(['bad','Expected loss','خسارة متوقعة']);
    if(f.estimated>0&&f.actual>f.estimated)flags.push(['bad','Cost over estimate','تجاوز التكلفة المقدّرة']);
    else if(f.estimated>0&&f.costUsedPct>=80&&f.invoicedNet<f.contractNet*0.8)flags.push(['warn','80%+ of cost used, under 80% invoiced','صُرف أكثر مما فُوتر']);
    if(!f.hasEstimate)flags.push(['info',`No cost estimate · at most ${fmtSAR(f.profitCeiling)}`,'بلا تكلفة مقدّرة']);
    if(from&&start&&start.slice(0,7)<from)flags.push(['info',`Labour cost before ${from} missing`,`العمالة قبل \u2066${from}\u2069 غير مرحّلة`]);
    return{p,f,flags};
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
  const opt=(v,l,cur)=>`<option value="${v}"${cur===v?' selected':''}>${l}</option>`;
  const body=rows.length?rows.map(({p,f,flags})=>`<tr>
      <td><button type="button" class="an-link" onclick="openProjectDetails('${esc(p.id)}')">${esc(p.name||'Project')}</button><div class="an-sub">${esc(p.client||'—')} · ${STATUS_LABEL[statusOf(p)]}</div></td>
      <td class="an-num">${fmtSAR(f.contractNet)}</td>
      <td class="an-num">${f.estimated?fmtSAR(f.estimated):'<span class="an-muted">—</span>'}</td>
      <td class="an-num">${fmtSAR(f.actual)}</td>
      <td>${costBar(f)}</td>
      <td class="an-num">${fmtSAR(f.commission)}</td>
      <td class="an-num ${f.expectedProfit<0?'an-neg':''}">${f.hasEstimate?`${fmtSAR(f.expectedProfit)}<div class="an-sub">${f.expectedMargin==null?'':pct(f.expectedMargin)}${f.costOverEstimate?' · on actual cost':''}</div>`:'<span class="an-muted">—</span><div class="an-sub">no estimate</div>'}</td>
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
      <div class="pfs-card"><div class="pfs-lbl">Expected profit</div><div class="pfs-val" style="color:${t.exp<0?'#fca5a5':'#4ade80'}">${fmtSAR(t.exp)}</div><div class="pfs-sub">Margin ${pct(margin)}${t.noEst?` · ${t.noEst} project(s) without estimate not included`:''}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Cash profit to date</div><div class="pfs-val" style="color:${t.cash<0?'#fca5a5':'#bfdbfe'}">${fmtSAR(t.cash)}</div><div class="pfs-sub">Received before VAT ${fmtSAR(t.received)}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Need attention</div><div class="pfs-val" style="color:${attention?'#fb923c':'#4ade80'}">${attention}</div><div class="pfs-sub">Loss, over estimate or under-invoiced</div></div>
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
      <div class="pfs-card"><div class="pfs-lbl">Invoiced</div><div class="pfs-val" style="color:#bfdbfe">${fmtSAR(tot.invoiced)}</div><div class="pfs-sub">Incl. VAT</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Received</div><div class="pfs-val" style="color:#4ade80">${fmtSAR(tot.received)}</div><div class="pfs-sub">${tot.invoiced>0?pct(tot.received/tot.invoiced*100)+' of invoiced':'—'}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Outstanding</div><div class="pfs-val" style="color:#fb923c">${fmtSAR(tot.outstanding)}</div><div class="pfs-sub">${tot.b3>0.005?`${fmtSAR(tot.b3)} older than 90 days`:'Nothing older than 90 days'}</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Not invoiced yet</div><div class="pfs-val">${fmtSAR(notInvoiced)}</div><div class="pfs-sub">Contract value still to invoice</div></div>
    </div>
    <div class="an-legend">${cols.map(([k,l])=>`<span><i class="an-age-${k}"></i>${l}</span>`).join('')}</div>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Client</th><th>Invoiced</th><th>Received</th><th>Outstanding</th>${cols.map(([,l])=>`<th>${l}</th>`).join('')}<th>Outstanding by age</th></tr></thead>
      <tbody>${rows||`<tr><td colspan="${5+cols.length}" class="an-empty">No invoices yet.</td></tr>`}</tbody>
      ${rows?`<tfoot><tr><td>Total</td><td class="an-num">${fmtSAR(tot.invoiced)}</td><td class="an-num">${fmtSAR(tot.received)}</td><td class="an-num">${fmtSAR(tot.outstanding)}</td>${cols.map(([k])=>`<td class="an-num">${fmtSAR(tot[k])}</td>`).join('')}<td></td></tr></tfoot>`:''}</table></div>
  </section>`;
}

// ── 3. Monthly trend ─────────────────────────────────────────────────────────
function trendData(){
  const keys=lastMonths(12),at=new Map(keys.map((k,i)=>[k,i])),inv=keys.map(()=>0),col=keys.map(()=>0),cost=keys.map(()=>0);
  const put=(arr,date,v)=>{const k=isoDate(date).slice(0,7);if(at.has(k))arr[at.get(k)]+=v};
  projects.forEach(p=>{
    (p.payments||[]).forEach(raw=>{
      const pay=sfNormalizePaymentRecord(raw),r=sfPaymentNetRatio(p,pay);
      put(inv,pay.date,num(pay.amount)*r);
      (pay.receipts||[]).forEach(rc=>put(col,rc.date,num(rc.amount)*r));
    });
    (p.actualExpenses||[]).forEach(x=>put(cost,x.date,num(x.amount)));
  });
  (typeof sfUnlinkedProformas==='function'?sfUnlinkedProformas():(typeof proformaInvoices!=='undefined'?proformaInvoices:[]).filter(pi=>!pi.projectId||!projects.some(p=>p.id===pi.projectId))).forEach(pi=>{
    try{const t=resolvedProformaCalculation(pi)||{};put(inv,pi.issueDate,num(t.totalAfterDiscount)||num(t.grandTotal)/1.15)}catch(_){}
  });
  return{keys,inv,col,cost};
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
  const d=trendData(),cost=canSeeCost();
  const series=[{name:'Invoiced',cls:'an-s-inv',v:d.inv},{name:'Collected',cls:'an-s-col',v:d.col}].concat(cost?[{name:'Cost',cls:'an-s-cost',v:d.cost}]:[]);
  const sum=a=>a.reduce((s,v)=>s+v,0);
  const rows=d.keys.map((k,i)=>`<tr><td>${monthLabel(k)}</td><td class="an-num">${fmtSAR(d.inv[i])}</td><td class="an-num">${fmtSAR(d.col[i])}</td>${cost?`<td class="an-num">${fmtSAR(d.cost[i])}</td><td class="an-num ${d.col[i]-d.cost[i]<0?'an-neg':''}">${fmtSAR(d.col[i]-d.cost[i])}</td>`:''}</tr>`).reverse().join('');
  return `<section class="an-sec" id="an-trend">
    <div class="an-head"><div><h3>Monthly trend, last 12 months <span>الاتجاه الشهري</span></h3><p>Before VAT. Invoiced by invoice date, collected by receipt date${cost?', cost by expense date':''}.</p></div></div>
    <div class="an-legend">${series.map(s=>`<span><i class="${s.cls}"></i>${s.name} ${fmtSAR(sum(s.v))}</span>`).join('')}</div>
    <div class="an-chart-wrap">${trendChart(d,series)}</div>
    <details class="an-details"><summary>Show the numbers by month</summary><div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Month</th><th>Invoiced</th><th>Collected</th>${cost?'<th>Cost</th><th>Collected − cost</th>':''}</tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>12 months</td><td class="an-num">${fmtSAR(sum(d.inv))}</td><td class="an-num">${fmtSAR(sum(d.col))}</td>${cost?`<td class="an-num">${fmtSAR(sum(d.cost))}</td><td class="an-num">${fmtSAR(sum(d.col)-sum(d.cost))}</td>`:''}</tr></tfoot></table></div></details>
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
  return `<div class="proj-fin-summary an-strip">
      <div class="pfs-card"><div class="pfs-lbl">Site days</div><div class="pfs-val">${t.site}</div><div class="pfs-sub">${S.util.length} engineer(s), approved days</div></div>
      <div class="pfs-card"><div class="pfs-lbl">On site share</div><div class="pfs-val" style="color:#4ade80">${all?pct(t.site/all*100):'—'}</div><div class="pfs-sub">Site ÷ (site + office)</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Overtime hours</div><div class="pfs-val" style="color:#bfdbfe">${Math.round(t.ot*10)/10}</div><div class="pfs-sub">Approved</div></div>
      <div class="pfs-card"><div class="pfs-lbl">Awaiting approval</div><div class="pfs-val" style="color:${t.pending?'#fb923c':'#4ade80'}">${t.pending}</div><div class="pfs-sub">Days not yet reviewed</div></div>
    </div>
    <div class="an-legend"><span><i class="an-mix-site"></i>Site</span><span><i class="an-mix-office"></i>Office</span><span><i class="an-mix-leave"></i>Leave</span><span><i class="an-mix-absent"></i>Absent</span></div>
    <div class="pd-table-wrap"><table class="pd-table an-table"><thead><tr><th>Engineer</th><th>Site</th><th>Office</th><th>Leave</th><th>Absent</th><th>Pending</th><th>OT hours</th><th>On site</th><th>Month mix</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="an-note">Counts approved days only; pending days are shown separately and are not in the totals. ${S.utilMonth===today().slice(0,7)?'This month is still in progress.':''}</p>`;
}
function paintUtil(){const el=document.getElementById('an-util-body');if(el)el.innerHTML=utilBody()}
function renderUtil(){
  if(!canSeeCost())return '';
  const month=S.month||today().slice(0,7);
  return `<section class="an-sec" id="an-util">
    <div class="an-head"><div><h3>Engineer utilisation <span>استغلال المهندسين</span></h3><p>From approved attendance: days on site, in the office, on leave and absent, with overtime.</p></div>
      <div class="an-controls"><label>Month<input type="month" id="an-month" value="${esc(month)}" max="${esc(today().slice(0,7))}" onchange="sfAnalyticsSet('month',this.value)"></label></div></div>
    <div id="an-util-body">${utilBody()}</div>
  </section>`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
function render(opts={}){
  const root=document.getElementById('analytics-root');if(!root)return;
  if(typeof projects==='undefined'){root.innerHTML='<div class="an-empty">Loading…</div>';return}
  const month=S.month||today().slice(0,7);
  root.innerHTML=renderProfit()+renderCollection()+renderTrend()+renderUtil()+
    (canSeeCost()?'':'<p class="an-note">Profitability and engineer figures are available to accounts with payroll access.</p>');
  if(canSeeCost()&&(opts.reload||S.utilMonth!==month||(!S.util&&!S.utilLoading&&!S.utilError)))void loadUtil(month);
}
window.sfRenderAnalytics=render;
window.sfAnalyticsSet=function(key,value){
  if(key==='status')S.status=value;
  else if(key==='sort')S.sort=value;
  else if(key==='month'){if(!/^\d{4}-\d{2}$/.test(value||''))return;S.month=value;void loadUtil(value);return}
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
.an-notes{min-width:220px}
.an-table td:first-child{min-width:150px}
.an-table td{vertical-align:top;padding:7px 8px;border-bottom:1px solid var(--gray-100,#f3f4f6)}
.an-table tfoot td{font-weight:700;background:var(--gray-100,#f3f4f6);border-top:2px solid var(--gray-300,#d1d5db)}
.an-num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.an-sub{font-size:10px;color:var(--gray-500,#6b7280);margin-top:2px;font-weight:400}
.an-muted{color:var(--gray-400,#9ca3af)}.an-neg{color:#b91c1c}.an-due{color:#c2410c;font-weight:700}
.an-link{background:none;border:none;padding:0;font:inherit;font-weight:700;color:var(--navy,#1F3864);cursor:pointer;text-align:left}.an-link:hover{color:var(--orange,#E8610A);text-decoration:underline}
.an-flag{display:inline-block;font-size:9.5px;font-weight:600;border-radius:4px;padding:3px 7px;margin:0 4px 4px 0;line-height:1.35;max-width:220px}
.an-flag-ar{display:block;font-weight:500;opacity:.85}
.an-flag.bad{background:#fee2e2;color:#991b1b}.an-flag.warn{background:#ffedd5;color:#9a3412}.an-flag.info{background:var(--gray-100,#f3f4f6);color:var(--gray-600,#4b5563)}
.an-cost{display:flex;align-items:center;gap:6px;min-width:120px}
.an-cost-track{position:relative;flex:1;height:8px;background:var(--gray-100,#f3f4f6);border-radius:4px}
.an-cost-fill{height:100%;border-radius:4px}.an-cost-fill.ok{background:#16a34a}.an-cost-fill.warn{background:#f59e0b}.an-cost-fill.bad{background:#dc2626}
.an-cost-mark{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--navy,#1F3864)}
.an-cost-txt{font-size:10.5px;font-weight:700;min-width:42px;text-align:right}.an-cost-txt.ok{color:#15803d}.an-cost-txt.warn{color:#b45309}.an-cost-txt.bad{color:#b91c1c}
.an-age,.an-mix{display:flex;height:10px;min-width:120px;border-radius:5px;overflow:hidden;background:var(--gray-100,#f3f4f6)}
.an-age-b0{background:#16a34a}.an-age-b1{background:#f59e0b}.an-age-b2{background:#ea580c}.an-age-b3{background:#b91c1c}.an-age-nd{background:#9ca3af}
.an-mix-site{background:var(--orange,#E8610A)}.an-mix-office{background:var(--navy,#1F3864)}.an-mix-leave{background:#9ca3af}.an-mix-absent{background:#dc2626}
.an-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--gray-600,#4b5563);margin:0 0 8px}
.an-legend span{display:inline-flex;align-items:center;gap:5px}.an-legend i{display:inline-block;width:10px;height:10px;border-radius:2px}
.an-chart-wrap{overflow-x:auto}.an-chart{width:100%;min-width:560px;height:auto;display:block}
.an-grid{stroke:var(--gray-200,#e5e7eb);stroke-width:1}.an-axis{font-size:10px;fill:var(--gray-500,#6b7280)}
.an-s-inv{fill:var(--navy,#1F3864);background:var(--navy,#1F3864)}.an-s-col{fill:#16a34a;background:#16a34a}.an-s-cost{fill:var(--orange,#E8610A);background:var(--orange,#E8610A)}
.an-details{margin-top:8px;font-size:12px}.an-details summary{cursor:pointer;color:var(--navy,#1F3864);font-weight:600;margin-bottom:6px}
.an-note{font-size:10.5px;color:var(--gray-500,#6b7280);margin:10px 0 0;line-height:1.55}
.an-empty{padding:18px;text-align:center;color:var(--gray-500,#6b7280);font-size:12px}
.an-error{padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:12px}
@media(max-width:900px){.an-strip{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.an-sec{padding:12px}.an-head h3{font-size:15px}}
`;
const style=document.createElement('style');style.id='sf-analytics-style';style.textContent=css;document.head.appendChild(style);
})();

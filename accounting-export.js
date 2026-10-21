// SKY FIELD — export field expenses for the accounting department.
// One ZIP per month: an Excel workbook (one row per approved expense, a totals row and a summary
// sheet) plus every receipt in a "receipts" folder, each file named after its row number so the
// accountant can match them. Administrators only: storage lets only them read every receipt.
(function(){
Object.assign(translations,{
 'تصدير المصروفات للحسابات':'Export expenses for accounting',
 'ملف ZIP فيه Excel بالمصروفات المعتمدة وكل الإيصالات، وكل إيصال يحمل رقم سطره في الملف. فك الضغط أولًا ثم افتح Excel لتعمل روابط الإيصالات.':'A ZIP with an Excel sheet of approved expenses and every receipt; each receipt carries its row number. Extract the ZIP first, then open Excel, so the receipt links work.',
 'كل المهندسين':'All engineers','غير المصفّاة فقط':'Unsettled only','تنزيل ملف الحسابات ZIP':'Download accounting ZIP',
 'اختر الشهر':'Choose the month','بدون إيصال':'No receipt','تعذر تحميل الإيصال':'Receipt could not be downloaded',
 'مصفّى':'Settled','غير مصفّى':'Not settled','عام':'General','الإجمالي':'Total'
});
const T=(ar,en)=>language==='en'?en:ar;
const LIMIT=400*1024*1024; // keep the ZIP within what a browser (or phone) can build in memory
const xmlEsc=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colName=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
const serial=d=>{const [y,m,dd]=String(d).slice(0,10).split('-').map(Number);return (Date.UTC(y,m-1,dd)-Date.UTC(1899,11,30))/86400000};
const riyadhDate=ts=>ts?new Date(ts).toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'}):'';
const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const safeName=s=>String(s||'').replace(/[\\/:*?"<>|\u0000-\u001F]/g,'').replace(/\s+/g,' ').trim().slice(0,40)||'engineer';
const EXT={'application/pdf':'pdf','image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','image/gif':'gif'};
function extOf(type,b){
 if(EXT[type])return EXT[type];
 const s=String.fromCharCode(...b.slice(0,12));
 if(s.startsWith('%PDF'))return 'pdf';if(b[0]===0xFF&&b[1]===0xD8)return 'jpg';if(s.startsWith('\x89PNG'))return 'png';
 if(s.startsWith('RIFF')&&s.slice(8,12)==='WEBP')return 'webp';if(s.startsWith('GIF8'))return 'gif';
 if(s.slice(4,8)==='ftyp')return 'heic';return 'bin';
}
// Cells: {v} text, {n} number, {d} ISO date, {f,v} formula with cached value; s = style index.
function cellXml(c,ref){
 if(c==null||c==='')return '';
 if(typeof c!=='object')c={v:c};
 const s=c.s!=null?` s="${c.s}"`:'';
 if(c.f!=null)return typeof c.v==='number'?`<c r="${ref}"${s}><f>${xmlEsc(c.f)}</f><v>${c.v}</v></c>`:`<c r="${ref}"${s} t="str"><f>${xmlEsc(c.f)}</f><v>${xmlEsc(c.v)}</v></c>`;
 if(c.d)return `<c r="${ref}"${s}><v>${serial(c.d)}</v></c>`;
 if(c.n!=null)return `<c r="${ref}"${s}><v>${Number(c.n)}</v></c>`;
 return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
}
function sheetXml(rows,widths,{rtl,filterTo}={}){
 const data=rows.map((r,i)=>`<row r="${i+1}">${r.map((c,j)=>cellXml(c,colName(j)+(i+1))).join('')}</row>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"${rtl?' rightToLeft="1"':''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData>${filterTo?`<autoFilter ref="A1:${filterTo}"/>`:''}<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD0D7E2"/></left><right style="thin"><color rgb="FFD0D7E2"/></right><top style="thin"><color rgb="FFD0D7E2"/></top><bottom style="thin"><color rgb="FFD0D7E2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
const absRef=ref=>{const [,c,r]=/^([A-Z]+)(\d+)$/.exec(ref);return `$A$1:$${c}$${r}`};
function workbook(sheets,rtl){ // rtl applies per sheet (sheetView); workbookView has no such attribute
 const enc=fflate.strToU8,files={
  '[Content_Types].xml':enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
  '_rels/.rels':enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
  'xl/workbook.xml':enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames>${sheets.map((s,i)=>s.filterTo?`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(s.name)}'!${absRef(s.filterTo)}</definedName>`:'').join('')}</definedNames></workbook>`),
  'xl/_rels/workbook.xml.rels':enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
  'xl/styles.xml':enc(STYLES)};
 sheets.forEach((s,i)=>files[`xl/worksheets/sheet${i+1}.xml`]=enc(sheetXml(s.rows,s.widths,{rtl,filterTo:s.filterTo})));
 return fflate.zipSync(files);
}
function status(text){const p=$('acctXStatus');p.textContent=text;p.hidden=!text}

async function exportForAccounting(){
 const month=$('acctXMonth').value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error(tr('اختر الشهر'));
 const engineer=$('acctXEngineer').value,unsettledOnly=$('acctXUnsettled').checked,rtl=language!=='en';
 const [y,n]=month.split('-').map(Number),end=`${n===12?y+1:y}-${String(n===12?1:n+1).padStart(2,'0')}-01`;
 status(T('جاري تحميل المصروفات…','Loading expenses…'));
 const scope=(await allRows('sf_daily_expenses',month+'-01',end)).filter(r=>engineer==='all'||r.user_id===engineer);
 const member=id=>members.find(m=>m.user_id===id)||{},project=id=>id?(projects.find(p=>String(p.id)===String(id))?.name||String(id)):tr('عام');
 const pending=scope.filter(r=>r.review==='pending').length;
 const rows=scope.filter(r=>r.review==='approved'&&(!unsettledOnly||!r.settled_at))
  .sort((a,b)=>String(a.day).localeCompare(String(b.day))||String(member(a.user_id).name||'').localeCompare(String(member(b.user_id).name||''))||String(a.id).localeCompare(String(b.id)));
 if(!rows.length)throw Error(T('لا توجد مصروفات معتمدة بهذه الشروط في هذا الشهر.','No approved expenses match these choices in this month.')+(pending?T(` (${pending} بانتظار الاعتماد)`,` (${pending} awaiting approval)`):''));
 // Receipts: four downloads at a time, each named after its row.
 const out={},names=new Map(),notes=new Map(),withReceipt=rows.filter(r=>r.receipt_path).length;
 let done=0,bytes=0,stop=null;const queue=rows.map((r,i)=>[r,i]);
 const worker=async()=>{while(queue.length&&!stop){const [r,i]=queue.shift();
  if(!r.receipt_path){notes.set(i,tr('بدون إيصال'));continue}
  try{const {data,error}=await db.storage.from('sf-receipts').download(r.receipt_path);if(error||!data)throw error||Error('empty');
   const b=new Uint8Array(await data.arrayBuffer());bytes+=b.length;
   if(bytes>LIMIT){stop=Error(T('حجم الإيصالات تجاوز 400 ميجابايت. صدّر لكل مهندس على حدة.','Receipts exceed 400 MB. Export one engineer at a time.'));break}
   const name=`${String(i+1).padStart(3,'0')}_${r.day}_${safeName(member(r.user_id).name)}_${Number(r.amount).toFixed(2)}.${extOf(data.type,b)}`;
   out['receipts/'+name]=[b,{level:0}];names.set(i,name);
  }catch(_){notes.set(i,tr('تعذر تحميل الإيصال'))}
  done++;status(T(`جاري تحميل الإيصالات ${done} من ${withReceipt}…`,`Downloading receipts ${done} of ${withReceipt}…`));
 }};
 await Promise.all([1,2,3,4].map(worker));if(stop)throw stop;
 // Sheet 1: one row per expense.
 const H=[T('#','#'),T('التاريخ','Date'),T('المهندس','Engineer'),T('رقم المهندس','Engineer No.'),T('المشروع','Project'),T('البند','Category'),T('الوصف','Description'),T('المبلغ (ريال)','Amount (SAR)'),T('التصفية','Settlement'),T('تاريخ التصفية','Settled on'),T('الإيصال','Receipt'),T('ملاحظة','Note'),T('المرجع','Reference')].map(v=>({v,s:1}));
 const body=rows.map((r,i)=>{const m=member(r.user_id),file=names.get(i);return[
  {n:i+1,s:8},{d:r.day,s:4},{v:m.name||'',s:2},{v:m.engineer_id||'',s:8},{v:project(r.project_id),s:2},{v:tr(labels[r.category])||r.category||'',s:2},{v:r.description||'',s:2},{n:Number(r.amount)||0,s:3},
  {v:tr(r.settled_at?'مصفّى':'غير مصفّى'),s:2},r.settled_at?{d:riyadhDate(r.settled_at),s:4}:{v:'',s:2},
  file?{f:`HYPERLINK("receipts/${file.replace(/"/g,'""')}","${file.replace(/"/g,'""')}")`,v:file,s:6}:{v:'',s:2},{v:notes.get(i)||'',s:2},{v:String(r.id||'').slice(0,8),s:8}]});
 const total=rows.reduce((s,r)=>s+(Number(r.amount)||0),0),last=rows.length+1;
 const totalRow=[{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:tr('الإجمالي'),s:7},{f:`SUM(H2:H${last})`,v:total,s:5},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7},{v:'',s:7}];
 // Sheet 2: totals by engineer, project and category.
 const group=key=>{const g=new Map();rows.forEach(r=>{const k=key(r),x=g.get(k)||{count:0,total:0,open:0};x.count++;x.total+=Number(r.amount)||0;if(!r.settled_at)x.open+=Number(r.amount)||0;g.set(k,x)});return[...g.entries()].sort((a,b)=>b[1].total-a[1].total)};
 const sum=[[T('المهندس','Engineer'),T('رقم المهندس','Engineer No.'),T('عدد المصروفات','Expenses'),T('الإجمالي','Total'),T('غير المصفّى','Not settled')].map(v=>({v,s:1})),
  ...group(r=>r.user_id).map(([id,x])=>[{v:member(id).name||'',s:2},{v:member(id).engineer_id||'',s:8},{n:x.count,s:8},{n:x.total,s:3},{n:x.open,s:3}]),[],
  [T('المشروع','Project'),'',T('عدد المصروفات','Expenses'),T('الإجمالي','Total')].map(v=>({v,s:1})),
  ...group(r=>project(r.project_id)).map(([k,x])=>[{v:k,s:2},{v:'',s:2},{n:x.count,s:8},{n:x.total,s:3}]),[],
  [T('البند','Category'),'',T('عدد المصروفات','Expenses'),T('الإجمالي','Total')].map(v=>({v,s:1})),
  ...group(r=>tr(labels[r.category])||r.category||'').map(([k,x])=>[{v:k,s:2},{v:'',s:2},{n:x.count,s:8},{n:x.total,s:3}]),[],
  [{v:T('الإجمالي','Total'),s:7},{v:'',s:7},{n:rows.length,s:7},{n:total,s:5}]];
 const base=`SkyField_Expenses_${month}${engineer!=='all'?'_'+safeName(member(engineer).engineer_id||member(engineer).name):''}${unsettledOnly?'_unsettled':''}`;
 out[base+'.xlsx']=[workbook([{name:T('المصروفات','Expenses'),rows:[H,...body,totalRow],widths:[6,12,22,13,22,16,32,14,12,13,38,24,11],filterTo:'M'+last},{name:T('الملخص','Summary'),rows:sum,widths:[26,14,14,16,16]}],rtl),{level:0}];
 status(T('جاري تجهيز الملف…','Building the file…'));
 sfTimesheetDownload(fflate.zipSync(out),base+'.zip','application/zip');
 const missing=rows.filter(r=>!r.receipt_path).length,failed=withReceipt-names.size;
 status([T(`تم تنزيل ${rows.length} مصروف بإجمالي ${money(total)} ريال، و${names.size} إيصال.`,`Downloaded ${rows.length} expenses totalling SAR ${money(total)}, with ${names.size} receipts.`),
  missing?T(`${missing} بدون إيصال.`,`${missing} without a receipt.`):'',failed?T(`${failed} تعذر تحميل إيصالها — موضّحة في عمود الملاحظة.`,`${failed} receipts could not be downloaded — marked in the Note column.`):'',
  pending?T(`${pending} مصروف بانتظار الاعتماد لم يُضمَّن.`,`${pending} expenses awaiting approval were not included.`):''].filter(Boolean).join(' '));
}

// Panel next to the timesheet export, shown to administrators only.
const anchor=document.getElementById('timesheetExportPanel');if(!anchor)return;
anchor.insertAdjacentHTML('afterend',`<details id="accountingExportPanel" class="range-box" hidden><summary><b>تصدير المصروفات للحسابات</b></summary><p><small>ملف ZIP فيه Excel بالمصروفات المعتمدة وكل الإيصالات، وكل إيصال يحمل رقم سطره في الملف. فك الضغط أولًا ثم افتح Excel لتعمل روابط الإيصالات.</small></p><div class="grid"><label>الشهر<input id="acctXMonth" type="month"></label><label>المهندس<select id="acctXEngineer"></select></label><label class="weekend-option"><input id="acctXUnsettled" type="checkbox"> غير المصفّاة فقط</label></div><div class="toolbar"><button type="button" id="acctXExport">تنزيل ملف الحسابات ZIP</button></div><p id="acctXStatus" class="acct-status" hidden></p></details>`);
const panel=document.getElementById('accountingExportPanel');let monthTouched=false;
$('acctXMonth').addEventListener('change',()=>{monthTouched=true});
window.sfAccountingExportSync=function(){
 const admin=typeof me!=='undefined'&&me&&me.role==='admin';panel.hidden=!admin;if(!admin)return;
 const select=$('acctXEngineer'),old=select.value||'all';
 select.innerHTML=`<option value="all">${esc(tr('كل المهندسين'))}</option>`+members.map(m=>`<option value="${esc(m.user_id)}">${esc(m.name)} — ${esc(m.engineer_id)}</option>`).join('');
 select.value=members.some(m=>m.user_id===old)?old:'all';
 if(!monthTouched||!$('acctXMonth').value)$('acctXMonth').value=$('month').value;
};
panel.addEventListener('toggle',()=>{if(panel.open&&!monthTouched)$('acctXMonth').value=$('month').value});
$('acctXExport').onclick=()=>run(async()=>{const b=$('acctXExport');b.disabled=true;try{await exportForAccounting()}catch(e){status('');throw e}finally{b.disabled=false}});
window.sfAccountingExportSync();
})();

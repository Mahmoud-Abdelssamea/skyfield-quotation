/* Excel template authored with Artifact Tool; fill template cells without changing its layout. */
const sfTimesheetXML=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function sfTimesheetColumn(n){let col='';for(;n;n=Math.floor((n-1)/26))col=String.fromCharCode(65+(n-1)%26)+col;return col}
function sfTimesheetCell(xml,address,value,formula){
 const re=new RegExp('<c\\b([^>]*\\br="'+address+'"[^>]*)(?:\\/>|>[\\s\\S]*?<\\/c>)');let found=false;
 xml=xml.replace(re,(_,attrs)=>{found=true;attrs=attrs.replace(/\s+t="[^"]*"/g,'');if(formula)return `<c${attrs}><f>${sfTimesheetXML(formula)}</f><v>${Number(value)||0}</v></c>`;if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid numeric timesheet value');return `<c${attrs}><v>${value}</v></c>`}return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${sfTimesheetXML(value)}</t></is></c>`});
 if(!found)throw Error('Timesheet template cell missing: '+address);return xml;
}
function sfTimesheetModel(member,rows,options,projectList){
 const days=monthDates(options.month),relevant=rows.filter(r=>r.user_id===member.user_id&&r.day.startsWith(options.month+'-')&&(options.project==='all'||String(r.project_id)===options.project)&&(options.review==='all'||r.review==='approved'));
 const byDay=new Map();for(const r of relevant){if(byDay.has(r.day))throw Error('Duplicate attendance date: '+r.day);byDay.set(r.day,r)}
 const projectIds=[...new Set(relevant.map(r=>r.project_id).filter(Boolean))].sort();const codes=new Map(projectIds.map((id,i)=>[id,'P'+(i+1)]));
 let normal=0,friday=0,worked=0;
 const cells={E4:options.po,E5:options.prepared,N5:'PROJECT: '+(options.project==='all'?'All projects':projectList.find(p=>String(p.id)===options.project)?.name||options.project),AD4:days[0]+' TO '+days.at(-1),B10:member.name,B11:'ID: '+member.engineer_id,B12:'',B13:'',E17:options.normalFactor,K17:options.fridayFactor,P17:options.hours,B22:options.signature,N22:options.clientSignature,Z22:options.managerSignature};
 for(let i=0;i<31;i++){
  const c=sfTimesheetColumn(i+5),day=days[i],row=day&&byDay.get(day);cells[c+'7']=day?i+1:'';cells[c+'8']=day?(Date.parse(day+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000:'';cells[c+'9']=day?['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(day+'T12:00:00Z').getUTCDay()]:'';
  let regular='',ot='',project='',review='';if(row){
   if(['inside','outside','office'].includes(row.status)){regular=options.hours;worked++;ot=Number(row.overtime)||0;if(cells[c+'9']==='FRI')friday+=ot;else normal+=ot;}
   else if(row.status==='absent'){regular='ABS';ot=0}else if(row.status==='leave'){regular={annual:'AL',sick:'SL',emergency:'EL',unpaid:'UL'}[row.leave_type]||'L';ot=0}
   project=row.project_id?codes.get(row.project_id)||'':row.status==='office'?'OFF':'';review={approved:'A',pending:'P',rejected:'R'}[row.review]||'';
  }
  cells[c+'10']=regular;cells[c+'11']=ot;cells[c+'12']=project;cells[c+'13']=review;
 }
 cells.AN10=worked+' work days\n'+(relevant.length-worked)+' leave / absent days';
 cells.B16=options.review==='approved'?'APPROVED ATTENDANCE ONLY':'DRAFT EXPORT — includes pending / rejected records; see REVIEW row (A / P / R).';
 cells.B18=projectIds.map(id=>codes.get(id)+' = '+(projectList.find(p=>String(p.id)===String(id))?.name||id)).join('   |   ')||'No project entries in this selection.';
 cells.B25='Regular hours use the standard '+options.hours+' hours/day setting. Blank days are not assumed absent or off. Friday OT is taken from recorded overtime only. Review: A = approved, P = pending, R = rejected.';
 return {daily:relevant.slice().sort((a,b)=>a.day.localeCompare(b.day)).map(r=>({date:r.day,project:projectList.find(p=>String(p.id)===String(r.project_id))?.name||r.project_id||'—',status:r.status==='leave'?'leave / '+r.leave_type:r.status,hours:['inside','outside','office'].includes(r.status)?options.hours:0,ot:['inside','outside','office'].includes(r.status)?Number(r.overtime)||0:0})),member,month:options.month,cells,normal,friday,total:normal+friday,weighted:normal*options.normalFactor+friday*options.fridayFactor,count:relevant.length};
}
function sfFillTimesheet(template,model){
 const files=fflate.unzipSync(template);let xml=fflate.strFromU8(files['xl/worksheets/sheet1.xml']).replace(/(<\/?)x:/g,'$1').replace('xmlns:x=','xmlns=');
 for(const [address,value] of Object.entries(model.cells))xml=sfTimesheetCell(xml,address,value);
 for(const [a,val,formula] of [['AJ10',model.normal,'SUMIFS(E11:AI11,E9:AI9,"<>FRI")'],['AK10',model.friday,'SUMIFS(E11:AI11,E9:AI9,"FRI")'],['AL10',model.total,'SUM(AJ10:AK10)'],['AM10',model.weighted,'AJ10*E17+AK10*K17']])xml=sfTimesheetCell(xml,a,val,formula);
 // Print as a single landscape page, retaining the spreadsheet template styles.
 xml=xml.replace(/<pageMargins\b[^>]*\/>/g,'').replace(/<pageSetup\b[^>]*\/>/g,'');
 const print='<pageMargins left="0.2" right="0.2" top="0.3" bottom="0.3" header="0.1" footer="0.1"/><pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="1"/>';
 const point=xml.search(/<(?:drawing|legacyDrawing|extLst)\b/);xml=point>=0?xml.slice(0,point)+print+xml.slice(point):xml.replace('</worksheet>',print+'</worksheet>');
 xml=xml.replace(/<sheetPr\b[^>]*\/>/,'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
 if(!xml.includes('<sheetPr'))xml=xml.replace(/(<worksheet\b[^>]*>)/,'$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
 files['xl/worksheets/sheet1.xml']=fflate.strToU8(xml);
 let book=fflate.strFromU8(files['xl/workbook.xml']).replace(/(<\/?)x:/g,'$1').replace('xmlns:x=','xmlns=');
 if(!book.includes('_xlnm.Print_Area')){const area='<definedName name="_xlnm.Print_Area" localSheetId="0">Timesheet!$B$2:$AO$25</definedName>';book=book.includes('</definedNames>')?book.replace('</definedNames>',area+'</definedNames>'):book.replace(/<calcPr\b/, '<definedNames>'+area+'</definedNames><calcPr');if(!book.includes('_xlnm.Print_Area'))book=book.replace('</workbook>','<definedNames>'+area+'</definedNames></workbook>');}
 files['xl/workbook.xml']=fflate.strToU8(book);sfAddDailyTimesheet(files,model);return fflate.zipSync(files,{level:6});
}
function sfTimesheetFilename(member,month){return 'Timesheet_'+String(member.engineer_id).replace(/[^\w-]/g,'_')+'_'+member.user_id.slice(0,8)+'_'+month+'.xlsx'}
function sfTimesheetDownload(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
let sfSimpleListReady=false;
function renderTimesheetControls(){
 if(!me)return;document.body.classList.toggle('sf-simple-timesheet',me.role!=='admin');$('timesheetExportPanel').open=me.role!=='admin';if(me.role!=='admin'){$('monthlySection').querySelector('h2').textContent=language==='en'?'Expenses & Timesheets':'المصروفات والتايم شيت';$('tabReports').textContent=language==='en'?'Expenses & Timesheets':'المصروفات والتايم شيت';
  // Engineers keep their own list of attendance and expenses (status, rejection reason, edit, resubmit, withdraw).
  const sw=document.querySelectorAll('[data-approval-type]');if(sw[0])sw[0].textContent=language==='en'?'My attendance':'حضوري';if(sw[1])sw[1].textContent=language==='en'?'My expenses':'مصروفاتي';
  const engFilter=$('approvalEngineer')?.closest('label');if(engFilter)engFilter.hidden=true;
  if(!sfSimpleListReady){sfSimpleListReady=true;$('approvalState').value='all';if(typeof renderApprovalTable==='function')renderApprovalTable();}
 }const list=me.role==='admin'?(typeof approvalPeople==='function'?approvalPeople():members):members.filter(m=>m.user_id===me.user_id),previous=$('timesheetEngineer').value;
 $('timesheetEngineer').innerHTML=list.map(m=>`<option value="${esc(m.user_id)}">${esc(m.name)} — ${esc(m.engineer_id)}</option>`).join('');$('timesheetEngineer').value=list.some(m=>m.user_id===previous)?previous:me.user_id;
 if(!$('timesheetEngineer').value&&list.length)$('timesheetEngineer').value=list[0].user_id;
 $('timesheetAll').hidden=me.role!=='admin';
 const selected=$('timesheetProject').value;$('timesheetProject').innerHTML='<option value="all">'+(language==='en'?'All projects':'كل المشاريع')+'</option>'+projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('timesheetProject').value=projects.some(p=>String(p.id)===selected)?selected:'all';
 if(!$('timesheetPrepared').value)$('timesheetPrepared').value=me.name;
}
async function exportEngineerTimesheets(all=false){
 if(!me)throw Error('Sign in first');if(all&&me.role!=='admin')throw Error('Administrator access required');
 const options={month:$('month').value,project:$('timesheetProject').value,review:$('timesheetReview').value,po:$('timesheetPO').value.trim(),prepared:$('timesheetPrepared').value.trim(),signature:$('timesheetSignature').value.trim(),clientSignature:$('timesheetClientSignature').value.trim(),managerSignature:$('timesheetManagerSignature').value.trim(),hours:Number($('timesheetHours').value),normalFactor:Number($('timesheetNormalFactor').value),fridayFactor:Number($('timesheetFridayFactor').value)};
 options.project='all';options.review='approved';options.po='';options.prepared=me.name;options.signature='';options.clientSignature='';options.managerSignature='';
 if(me.role!=='admin'){options.hours=8;options.normalFactor=1.5;options.fridayFactor=2;$('timesheetEngineer').value=me.user_id;}
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month))throw Error(language==='en'?'Choose a valid month.':'اختر الشهر.');
 const dates=monthDates(options.month);for(const v of [options.hours,options.normalFactor,options.fridayFactor])if(!Number.isFinite(v)||v<0)throw Error('Enter valid hours and factors.');if(options.hours<=0||options.hours>24||options.normalFactor>10||options.fridayFactor>10)throw Error('Check standard hours and OT factors.');
 const targets=all?members.filter(m=>m.role==='engineer'):members.filter(m=>m.user_id===$('timesheetEngineer').value&&(me.role==='admin'||m.user_id===me.user_id));if(!targets.length)throw Error('Select an engineer.');
 const [year,month]=options.month.split('-').map(Number),end=`${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}-01`;
 $('timesheetOne').disabled=true;$('timesheetAll').disabled=true;
 try{
  if(typeof fflate==='undefined')throw Error('Upload fflate-0.8.3.js beside attendance.html.');
  const response=await fetch('timesheet-template.xlsx?v=20261011-1');if(!response.ok)throw Error('Upload timesheet-template.xlsx beside attendance.html.');const template=new Uint8Array(await response.arrayBuffer());
  const rows=await allRows('sf_daily_records',dates[0],end),files={},skipped=[];
  for(const member of targets){const model=sfTimesheetModel(member,rows,{...options,prepared:member.name},projects);if(!model.count){skipped.push(member.name);continue}files[sfTimesheetFilename(member,options.month)]=sfFillTimesheet(template,model);}
  const names=Object.keys(files);if(!names.length)throw Error(language==='en'?'No approved attendance for this month yet. Pending and rejected records are not exported.':'لا يوجد حضور معتمد لهذا الشهر حتى الآن. السجلات المعلقة والمرفوضة لا تدخل الكشف.');
  if(all)sfTimesheetDownload(fflate.zipSync(files,{level:0}),'SkyField_Timesheets_'+options.month+'.zip','application/zip');else sfTimesheetDownload(files[names[0]],names[0],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  message(language==='en'?`Exported ${names.length} timesheet(s). ${skipped.length?skipped.length+' engineers had no matching records.':''}`:`تم تصدير ${names.length} تايم شيت. ${skipped.length?'تم تجاوز '+skipped.length+' مهندس لعدم وجود سجلات مطابقة.':''}`);
 }finally{$('timesheetOne').disabled=false;$('timesheetAll').disabled=false}
}
function setupTimesheetExports(){
 Object.assign(translations,{'تصدير تايم شيت لكل مهندس':'Export engineer timesheets','المهندس':'Engineer','كل الحالات المسجلة — مسودة':'All recorded statuses — draft','المعتمد فقط':'Approved only','رقم أمر الشراء / الملف':'PO / file number','إعداد بواسطة':'Prepared by','ساعات العمل العادية / يوم':'Regular hours per day','معامل الإضافي العادي':'Normal OT factor','معامل إضافي الجمعة':'Friday OT factor','مهندس سكاي فيلد — التوقيع':'Sky Field engineer — signature','مهندس العميل — التوقيع':'Client engineer — signature','مدير المشروع — التوقيع':'Project manager — signature','تنزيل Excel للمهندس':'Download engineer Excel','تنزيل الجميع ZIP':'Download all as ZIP','التصدير يستخدم الشهر المحدد أعلاه. الساعات العادية افتراضيًا 8 ساعات لليوم المسجل؛ راجعها قبل التصدير. معاملات الإضافي من نموذجك ويمكن تعديلها، ولا تغير حساب الرواتب.':'Uses the month selected above. Regular hours default to 8 per recorded workday; review before export. OT factors follow your sample and are editable; they do not change payroll.'});
 $('timesheetOne').onclick=()=>run(()=>exportEngineerTimesheets(false));$('timesheetAll').onclick=()=>run(()=>exportEngineerTimesheets(true));
}

// One workbook, with an additional daily register listing full project names.
function sfAddDailyTimesheet(files,model){
 const rows=[['SKY FIELD — Approved monthly timesheet'],[model.member.name,model.member.engineer_id,model.month],[],['Date','Project','Attendance','Regular hours','Overtime hours']];
 for(const r of model.daily)rows.push([r.date,r.project,r.status,r.hours,r.ot]);
 const workDays=model.daily.filter(r=>['inside','outside','office'].includes(r.status)).length;
 rows.push(['TOTAL',workDays+' work days','',model.daily.reduce((n,r)=>n+r.hours,0),model.daily.reduce((n,r)=>n+r.ot,0)]);
 rows.push([],['Sky Field engineer signature','','Client engineer signature','','Project manager signature']);
 const body=rows.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>{const ref=sfTimesheetColumn(j+1)+(i+1);return typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${sfTimesheetXML(v)}</t></is></c>`}).join('')}</row>`).join('');
 const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="15" customWidth="1"/><col min="2" max="2" width="65" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="5" width="22" customWidth="1"/></cols><sheetData>${body}</sheetData><autoFilter ref="A4:E${4+model.daily.length}"/><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
 let book=fflate.strFromU8(files['xl/workbook.xml']),rels=fflate.strFromU8(files['xl/_rels/workbook.xml.rels']);
 const ids=[...book.matchAll(/sheetId="(\d+)"/g)].map(x=>Number(x[1]));const id=Math.max(0,...ids)+1;
 let rid='rIdDailyTimesheet';while(rels.includes('Id="'+rid+'"'))rid+='X';
 const path='worksheets/sheet'+id+'.xml';
 book=book.replace('</sheets>',`<sheet name="Daily details" sheetId="${id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rid}"/></sheets>`);
 rels=rels.replace('</Relationships>',`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${path}"/></Relationships>`);
 let types=fflate.strFromU8(files['[Content_Types].xml']);types=types.replace('</Types>',`<Override PartName="/xl/${path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
 files['xl/'+path]=fflate.strToU8(xml);files['xl/workbook.xml']=fflate.strToU8(book);files['xl/_rels/workbook.xml.rels']=fflate.strToU8(rels);files['[Content_Types].xml']=fflate.strToU8(types);
}

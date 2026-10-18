/* Preserve the supplied payroll workbook layout; populate only the selected payroll. */
function sfPayrollXml(value){return String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function sfPayrollCell(row,address,value,formula){
 const re=new RegExp('<c\\b([^>]*\\br="'+address+'"[^>]*?)(?:\\s*/>|>[\\s\\S]*?</c>)');
 if(!re.test(row))throw Error('Missing payroll template cell: '+address);
 return row.replace(re,(_,attrs)=>{
  attrs=attrs.replace(/\s+t="[^"]*"/g,'');
  if(formula)return `<c${attrs}><f>${sfPayrollXml(formula)}</f><v>${Number(value)||0}</v></c>`;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid payroll amount');return `<c${attrs}><v>${value}</v></c>`;}
  return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${sfPayrollXml(value)}</t></is></c>`;
 });
}
function sfBuildPayrollWorkbook(template,sheet,projectName=''){
 const files=fflate.unzipSync(template),key='xl/worksheets/sheet1.xml';
 let xml=fflate.strFromU8(files[key]);
 const row=n=>{const m=xml.match(new RegExp('<row\\b[^>]*\\br="'+n+'"[^>]*?(?:\\s*/>|>[\\s\\S]*?</row>)'));if(!m)throw Error('Invalid payroll template');return m[0];};
 const move=(text,n)=>text.replace(/\br="(?:([A-Z]+))?\d+"/g,(_,col)=>`r="${col||''}${n}"`);
 const totalRow=sheet.rows.length+4,signatureRow=totalRow+3;
 const title=`رواتب شركة سماء الميدان${projectName?' ( '+projectName+' )':''} لشهر ${sheet.month}`;
 const rows=[sfPayrollCell(row(1),'A1',title),row(2),row(3)];
 const totals=[0,0,0,0];
 sfSortEmployees(sheet.rows).forEach((r,i)=>{
  const n=i+4,c=payrollCalcStandalone(r,sheet.standardDays),num=sfNum;
  const divisor=r.salaryModel===2?30:Math.max(1,Math.min(31,num(sheet.standardDays)||30));
  const days=Math.min(divisor,Math.max(0,num(r.attendanceDays)));
  const additions=num(r.otherAllowance)+num(r.otherEarnings);
  const notes=[r.notes, num(r.otherAllowance)?`بدلات أخرى: ${num(r.otherAllowance)}`:'',num(r.otherEarnings)?`مكافآت أخرى: ${num(r.otherEarnings)}`:''].filter(Boolean).join(' | ');
  const salary=c.attendanceSalary+num(r.siteAllowance)+additions;
  const values=[i+1,r.name,r.nationality,String(r.iqama??''),String(r.employeeNo??''),r.profession,num(r.baseSalary),num(r.housingTransport),num(r.carAllowance??r.siteCar),num(r.siteAllowance),days,num(r.overtimeHours),salary,c.overtimeAmount,num(r.deductions),c.net,notes];
  let body=move(row(i%2?5:4),n);
  const formulas={M:`K${n}/${divisor}*(G${n}+H${n}+I${n})+J${n}+${additions}`,P:`MAX(0,M${n}+N${n}-O${n})`};
  values.forEach((v,j)=>{const col=String.fromCharCode(65+j);body=sfPayrollCell(body,col+n,v??'',formulas[col]);});
  rows.push(body);[salary,c.overtimeAmount,num(r.deductions),c.net].forEach((v,j)=>totals[j]+=v);
 });
 let total=move(row(17),totalRow);
 ['M','N','O','P'].forEach((col,i)=>{total=sfPayrollCell(total,col+totalRow,totals[i],`SUM(${col}4:${col}${totalRow-1})`);});
 rows.push(total,move(row(19),totalRow+2),move(row(20),signatureRow));
 xml=xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/,'<sheetData>'+rows.join('')+'</sheetData>');
 xml=xml.replace(/<mergeCells\b[\s\S]*?<\/mergeCells>/,`<mergeCells count="8">${['A1:Q1','A2:B2','C2:E2','F2:Q2',`A${totalRow}:L${totalRow}`,`A${signatureRow}:D${signatureRow}`,`F${signatureRow}:J${signatureRow}`,`L${signatureRow}:Q${signatureRow}`].map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`);
 xml=xml.replace(/<dimension[^>]*\/>/,'').replace(/<selection\b[^>]*\/>/g,'');
 files[key]=fflate.strToU8(xml);
 let book=fflate.strFromU8(files['xl/workbook.xml']);
 book=book.replace(/name="Payroll"/,`name="${sfPayrollXml(sheet.month)}"`);
 book=book.replace('</x:workbook>',`<x:definedNames><x:definedName name="_xlnm.Print_Titles" localSheetId="0">'${sfPayrollXml(sheet.month)}'!$1:$3</x:definedName><x:definedName name="_xlnm.Print_Area" localSheetId="0">'${sfPayrollXml(sheet.month)}'!$A$1:$Q$${signatureRow}</x:definedName></x:definedNames><x:calcPr fullCalcOnLoad="1"/></x:workbook>`);
 files['xl/workbook.xml']=fflate.strToU8(book);
 return fflate.zipSync(files,{level:6});
}
async function payrollExportXlsx(id=''){
 const sheet=payrollSheetForAction(id);
 if(!sheet||!sheet.rows.length){alert('No payroll data to export.');return;}
 try{
  if(typeof fflate==='undefined')throw Error('تعذر تحميل ملفات التصدير. حدّث الصفحة.');
  const response=await fetch('payroll-template.xlsx?v=20261017-1');
  if(!response.ok)throw Error('ارفع ملف payroll-template.xlsx مع ملفات الموقع.');
  const bytes=sfBuildPayrollWorkbook(new Uint8Array(await response.arrayBuffer()),sheet,projects.find(p=>p.id===sheet.projectId)?.name||'');
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=`Sama_AlMaydan_Timesheet_${sheet.month}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){alert('تعذر تصدير الرواتب: '+error.message);}
}

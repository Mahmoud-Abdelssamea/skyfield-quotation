// SKY FIELD — Engineers, payroll sheets, internal cost plan.
// Function declarations only (moved from index.html); nothing runs when this file loads.
function commercialEngineerDailyRate(){return Math.max(0,parseFloat(document.getElementById('commercial-engineer-daily-rate')?.value)||0)}
function commercialEngineerMonthlyRate(){return Math.max(0,parseFloat(document.getElementById('commercial-engineer-monthly-rate')?.value)||0)}
function saveEngineerLibrary(){localStorage.setItem('sfEngineers',JSON.stringify(sfEngineers));updateSidebarCounts();renderEngineers();renderCostPlan();sfMirrorCollection(SF_NORMALIZED_TABLES.engineers,sfEngineers);}
function sfNormalizeEngineerKey(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function importSkyFieldEngineers(showMessage=false){
  let added=0,updated=0;
  SKYFIELD_DEFAULT_ENGINEERS.forEach(source=>{
    // A default engineer deleted from the Engineers Database must stay deleted.
    // Previously the automatic startup import recreated the record after refresh.
    if(sfDeletedDefaultEngineerIds.has(source.id))return;
    const match=sfEngineers.find(x=>(source.employeeNo&&String(x.employeeNo||'')===source.employeeNo)||(source.iqama&&String(x.iqama||'')===source.iqama)||sfNormalizeEngineerKey(x.name)===sfNormalizeEngineerKey(source.name));
    if(!match){
      sfEngineers.push({...source,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      added++;
      return;
    }
    let changed=false;
    ['name','nationality','iqama','employeeNo','profession','specialization','loa','employment','status','daily','monthly','overtime','housingTransport','siteAllowance','carAllowance','notes'].forEach(key=>{
      const current=match[key];
      if(current===undefined||current===null||current===''){
        match[key]=source[key];
        changed=true;
      }
    });
    if(changed){match.updatedAt=new Date().toISOString();updated++;}
  });
  if(added||updated){localStorage.setItem('sfEngineers',JSON.stringify(sfEngineers));}
  updateSidebarCounts();renderEngineers();renderCostPlan();
  if(showMessage){alert(added?`${added} engineer(s) added successfully.${updated?` ${updated} existing record(s) completed.`:''}`:(updated?`${updated} existing engineer record(s) completed.`:'All Sky Field engineers are already available.'));}
  return{added,updated};
}

function saveCurrentCostPlan(){renderCostPlan();}

function resetEngineerForm(){
  ['eng-id','eng-name','eng-nationality','eng-iqama','eng-employee-no','eng-profession','eng-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  const defaults={'eng-specialization':'Protection','eng-loa':'Non-LOA','eng-employment':'Company Employee','eng-status':'available','eng-daily':'0','eng-monthly':'0','eng-overtime':'0','eng-housing-transport':'0','eng-site-allowance':'0','eng-car-allowance':'0'};
  Object.entries(defaults).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v});
  const t=document.getElementById('engineer-form-title');if(t)t.textContent='Add Engineer';
  const b=document.getElementById('eng-save-btn');if(b)b.textContent='Save Engineer';
}
function saveEngineerRecord(){
  const name=(document.getElementById('eng-name')?.value||'').trim();if(!name){alert('Engineer name is required.');return;}
  const id=document.getElementById('eng-id')?.value||sfUid('eng');
  const rec={id,name,nationality:(document.getElementById('eng-nationality').value||'').trim(),iqama:(document.getElementById('eng-iqama').value||'').trim(),employeeNo:(document.getElementById('eng-employee-no').value||'').trim(),profession:(document.getElementById('eng-profession').value||'').trim(),specialization:document.getElementById('eng-specialization').value,loa:document.getElementById('eng-loa').value,employment:document.getElementById('eng-employment').value,status:document.getElementById('eng-status').value,daily:sfNum(document.getElementById('eng-daily').value),monthly:sfNum(document.getElementById('eng-monthly').value),overtime:sfNum(document.getElementById('eng-overtime').value),housingTransport:sfNum(document.getElementById('eng-housing-transport').value),siteAllowance:sfNum(document.getElementById('eng-site-allowance').value),carAllowance:sfNum(document.getElementById('eng-car-allowance').value),notes:(document.getElementById('eng-notes').value||'').trim(),updatedAt:new Date().toISOString()};
  const i=sfEngineers.findIndex(x=>x.id===id);if(i>=0)sfEngineers[i]=rec;else sfEngineers.unshift(rec);
  saveEngineerLibrary();resetEngineerForm();
}
function editEngineerRecord(id){const x=sfEngineers.find(e=>e.id===id);if(!x)return;const set=(k,v)=>{const e=document.getElementById(k);if(e)e.value=v??''};set('eng-id',x.id);set('eng-name',x.name);set('eng-nationality',x.nationality);set('eng-iqama',x.iqama);set('eng-employee-no',x.employeeNo);set('eng-profession',x.profession);set('eng-specialization',x.specialization);set('eng-loa',x.loa);set('eng-employment',x.employment);set('eng-status',x.status);set('eng-daily',x.daily);set('eng-monthly',x.monthly);set('eng-overtime',x.overtime);set('eng-housing-transport',x.housingTransport);set('eng-site-allowance',x.siteAllowance||0);set('eng-car-allowance',x.carAllowance??x.siteCar??0);set('eng-notes',x.notes);document.getElementById('engineer-form-title').textContent='Edit Engineer';document.getElementById('eng-save-btn').textContent='Update Engineer';window.scrollTo({top:0,behavior:'smooth'});}
async function deleteEngineerRecord(id){
  if(!sfHasAccess('engineers')){alert('Your account does not have access to Engineers.');return;}
  const x=sfEngineers.find(e=>e.id===id);
  if(!x||!confirm('Delete engineer '+x.name+'?'))return;

  const previousEngineers=sfEngineers.slice();
  const previousDeletedIds=new Set(sfDeletedDefaultEngineerIds);
  const isDefaultEngineer=SKYFIELD_DEFAULT_ENGINEERS.some(e=>e.id===id);

  sfEngineers=sfEngineers.filter(e=>e.id!==id);
  if(isDefaultEngineer)sfDeletedDefaultEngineerIds.add(id);

  try{
    const wasPaused=sfSyncPaused;sfSyncPaused=true;
    try{
      localStorage.setItem('sfEngineers',JSON.stringify(sfEngineers));
      localStorage.setItem('sfDeletedDefaultEngineerIds',JSON.stringify([...sfDeletedDefaultEngineerIds]));
    }finally{sfSyncPaused=wasPaused;}
    renderEngineers();renderCostPlan();

    if(!sfDb||!sfCurrentUser||!sfDataUserId())throw new Error('A secure cloud connection is required to delete an engineer.');
    setCloudStatus('saving','Deleting engineer…');

    // Wait for the shared workspace record to be updated instead of treating an
    // unverified local-only deletion as complete.
    if(isDefaultEngineer){
      const {error:deletedIdsError}=await sfDb.rpc('sf_workspace_save_key',{p_key:'sfDeletedDefaultEngineerIds',p_value:[...sfDeletedDefaultEngineerIds]});
      if(deletedIdsError)throw deletedIdsError;
    }
    const {error:storeError}=await sfDb.rpc('sf_workspace_save_key',{p_key:'sfEngineers',p_value:sfEngineers});
    if(storeError)throw storeError;

    // Keep the normalized reporting table aligned with the master list. The
    // application still works when older installations do not have this table.
    if(sfNormalizedTablesAvailable){
      const {error:normalizedError}=await sfDb.from(SF_NORMALIZED_TABLES.engineers).delete().eq('user_id',sfDataUserId()).eq('id',String(id));
      if(normalizedError){
        if(String(normalizedError?.code||'')==='42P01'||/does not exist|schema cache/i.test(String(normalizedError?.message||'')))sfNormalizedTablesAvailable=false;
        else console.warn('Engineer normalized delete failed',normalizedError);
      }
    }

    setCloudStatus('','Engineer deleted securely');
    alert('Engineer deleted successfully.');
  }catch(error){
    sfEngineers=previousEngineers;
    sfDeletedDefaultEngineerIds=previousDeletedIds;
    const wasPaused=sfSyncPaused;sfSyncPaused=true;
    try{
      localStorage.setItem('sfEngineers',JSON.stringify(sfEngineers));
      localStorage.setItem('sfDeletedDefaultEngineerIds',JSON.stringify([...sfDeletedDefaultEngineerIds]));
    }finally{sfSyncPaused=wasPaused;}
    renderEngineers();renderCostPlan();
    setCloudStatus('error','Engineer deletion failed');
    alert('Could not delete the engineer. '+(error?.message||'Please check the cloud connection and try again.'));
  }
}
function renderEngineers(){
  const body=document.getElementById('engineer-table-body');if(!body)return;
  const q=(document.getElementById('engineer-search')?.value||'').toLowerCase();
  const list=sfEngineers.filter(x=>[x.name,x.nationality,x.iqama,x.employeeNo,x.profession,x.specialization,x.loa,x.employment,x.status].join(' ').toLowerCase().includes(q));
  body.innerHTML=list.length?list.map(x=>`<tr><td><strong>${escHtml(x.name)}</strong>${x.notes?`<div style="font-size:9.5px;color:var(--gray-500);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(x.notes)}</div>`:''}</td><td>${escHtml(x.employeeNo||'—')}<div style="font-size:9px;color:var(--gray-500)">${escHtml(x.iqama||'')}</div></td><td>${escHtml(x.specialization||'')}</td><td>${escHtml(x.loa||'')}</td><td>${fmtSAR(x.monthly)}</td><td>${fmtSAR(x.overtime)}</td><td><span class="status-pill ${escHtml(x.status||'available')}">${escHtml((x.status||'available').replace('_',' '))}</span></td><td style="white-space:nowrap"><button class="btn-sm" onclick="editEngineerRecord('${x.id}')">Edit</button> <button class="btn-sm" onclick="deleteEngineerRecord('${x.id}')">Delete</button></td></tr>`).join(''):`<tr><td colspan="8"><div class="empty-resource">No engineers saved yet.</div></td></tr>`;
  updateSidebarCounts();
}
function payrollMoney(v){return (parseFloat(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function payrollDefaultMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function payrollBlankSheet(){return{id:sfUid('pay'),month:document.getElementById('payroll-month')?.value||payrollDefaultMonth(),projectId:document.getElementById('payroll-project')?.value||'',standardDays:30,status:'draft',rows:[],notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}
function payrollRowFromEngineer(e){return{id:sfUid('pr'),engineerId:e?.id||'',name:e?.name||'',nationality:e?.nationality||'',iqama:e?.iqama||'',employeeNo:e?.employeeNo||'',profession:e?.profession||e?.specialization||'',baseSalary:sfNum(e?.monthly),housingTransport:sfNum(e?.housingTransport),carAllowance:sfNum(e?.carAllowance??e?.siteCar),siteAllowance:0,otherAllowance:0,attendanceDays:0,overtimeHours:0,overtimeRate:sfNum(e?.overtime),otherEarnings:0,deductions:0,notes:''}}
function payrollCalcRow(r){const days=r.salaryModel===2?30:Math.max(1,Math.min(31,sfNum(sfCurrentPayroll?.standardDays)||30));const attendance=Math.min(days,Math.max(0,sfNum(r.attendanceDays)));const monthlyPackage=sfNum(r.baseSalary)+sfNum(r.housingTransport)+sfNum(r.carAllowance??r.siteCar);const attendanceSalary=monthlyPackage*attendance/days;const overtimeAmount=r.salaryModel===2?sfNum(r.attendanceOvertimeAmount):sfNum(r.overtimeHours)*sfNum(r.overtimeRate);const fixedAdditions=sfNum(r.siteAllowance)+sfNum(r.otherAllowance)+sfNum(r.otherEarnings);const gross=attendanceSalary+fixedAdditions+overtimeAmount;const net=Math.max(0,gross-sfNum(r.deductions));return{attendanceSalary,overtimeAmount,allowances:fixedAdditions,gross,net,monthlyPackage}}
function payrollTotals(){return(sfCurrentPayroll?.rows||[]).reduce((a,r)=>{const c=payrollCalcRow(r);a.basic+=sfNum(r.baseSalary);a.attendance+=c.attendanceSalary;a.allowances+=c.allowances;a.overtime+=c.overtimeAmount;a.deductions+=sfNum(r.deductions);a.net+=c.net;return a},{basic:0,attendance:0,allowances:0,overtime:0,deductions:0,net:0})}
function payrollSaveStore(){localStorage.setItem('sfPayrollSheets',JSON.stringify(sfPayrollSheets));updateSidebarCounts();payrollRenderSaved();sfMirrorCollection(SF_NORMALIZED_TABLES.payroll,sfPayrollSheets)}
function payrollPopulateProjects(){const sel=document.getElementById('payroll-project');if(!sel)return;const current=sfCurrentPayroll?.projectId??sel.value;sel.innerHTML='<option value="">General / Not assigned</option>'+projects.map(p=>`<option value="${p.id}">${escHtml(p.name)}${p.client?' — '+escHtml(p.client):''}</option>`).join('');sel.value=current||''}
function payrollNewSheet(){sfCurrentPayroll=payrollBlankSheet();const m=document.getElementById('payroll-month');if(m&&!m.value)m.value=sfCurrentPayroll.month;payrollPopulateProjects();payrollRender()}
function payrollMonthChanged(){if(!sfCurrentPayroll)payrollNewSheet();sfCurrentPayroll.month=document.getElementById('payroll-month').value||payrollDefaultMonth();sfCurrentPayroll.updatedAt=new Date().toISOString();payrollRenderSaved()}
function payrollProjectChanged(){if(!sfCurrentPayroll)payrollNewSheet();sfCurrentPayroll.projectId=document.getElementById('payroll-project').value||'';sfCurrentPayroll.updatedAt=new Date().toISOString()}
function payrollSetHeader(field,value){if(!sfCurrentPayroll)payrollNewSheet();sfCurrentPayroll[field]=field==='standardDays'?Math.max(1,Math.min(31,sfNum(value)||30)):value;payrollRenderRows()}
function payrollAddRow(engineerId=''){if(!sfCurrentPayroll)payrollNewSheet();const e=sfEngineers.find(x=>x.id===engineerId);sfCurrentPayroll.rows.push(payrollRowFromEngineer(e));payrollRenderRows()}
function payrollLoadProjectEngineers(){if(!sfCurrentPayroll)payrollNewSheet();const p=projects.find(x=>x.id===document.getElementById('payroll-project').value);let ids=[];if(p)ids=(p.assignedEngineers||[]).map(x=>x.engineerId).filter(Boolean);const source=ids.length?ids.map(id=>sfEngineers.find(e=>e.id===id)).filter(Boolean):sfEngineers;if(!source.length){alert('No engineers are available. Add engineers first.');return;}const existing=new Set((sfCurrentPayroll.rows||[]).map(r=>r.engineerId).filter(Boolean));source.forEach(e=>{if(!existing.has(e.id))sfCurrentPayroll.rows.push(payrollRowFromEngineer(e))});payrollRenderRows()}
function payrollSetRow(id,field,value){const r=sfCurrentPayroll?.rows.find(x=>x.id===id);if(!r)return;if(field==='engineerId'){const e=sfEngineers.find(x=>x.id===value);const fresh=payrollRowFromEngineer(e);Object.assign(r,fresh,{id:r.id,attendanceDays:r.attendanceDays||0,notes:r.notes||''});}else r[field]=['baseSalary','housingTransport','carAllowance','siteAllowance','otherAllowance','attendanceDays','overtimeHours','overtimeRate','otherEarnings','deductions'].includes(field)?sfNum(value):value;sfCurrentPayroll.updatedAt=new Date().toISOString();payrollRenderRows()}
function payrollRemoveRow(id){if(!sfCurrentPayroll)return;sfCurrentPayroll.rows=sfCurrentPayroll.rows.filter(r=>r.id!==id);payrollRenderRows()}
function payrollEngineerOptions(selected){return '<option value="">Manual employee</option>'+sfEngineers.map(e=>`<option value="${e.id}" ${selected===e.id?'selected':''}>${escHtml(e.name)}</option>`).join('')}
function payrollRenderRows(){const body=document.getElementById('payroll-table-body');if(!body||!sfCurrentPayroll)return;body.innerHTML=sfCurrentPayroll.rows.length?sfCurrentPayroll.rows.map((r,i)=>{const c=payrollCalcRow(r);return`<tr>
<td style="text-align:center">${i+1}</td>
<td><select onchange="payrollSetRow('${r.id}','engineerId',this.value)" style="min-width:160px">${payrollEngineerOptions(r.engineerId)}</select>${r.engineerId&&sfEngineers.some(e=>e.id===r.engineerId)?'':`<input class="name-inp" value="${escHtml(r.name)}" placeholder="Employee name" onchange="payrollSetRow('${r.id}','name',this.value)">`}</td>
<td><input value="${escHtml(r.nationality)}" onchange="payrollSetRow('${r.id}','nationality',this.value)"></td><td><input class="id-inp" value="${escHtml(r.iqama)}" onchange="payrollSetRow('${r.id}','iqama',this.value)"></td><td><input class="id-inp" value="${escHtml(r.employeeNo)}" onchange="payrollSetRow('${r.id}','employeeNo',this.value)"></td><td><input value="${escHtml(r.profession)}" onchange="payrollSetRow('${r.id}','profession',this.value)"></td>
<td><input type="number" value="${r.baseSalary}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','baseSalary',this.value)"></td><td><input type="number" value="${r.housingTransport}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','housingTransport',this.value)"></td><td><input type="number" value="${r.carAllowance??r.siteCar??0}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','carAllowance',this.value)"></td><td><input type="number" value="${r.siteAllowance||0}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','siteAllowance',this.value)"></td><td><input type="number" value="${r.otherAllowance}" onchange="payrollSetRow('${r.id}','otherAllowance',this.value)"></td>
<td><input type="number" min="0" max="31" value="${r.attendanceDays}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','attendanceDays',this.value)"></td><td class="money">${payrollMoney(c.attendanceSalary)}</td><td><input type="number" min="0" value="${r.overtimeHours}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','overtimeHours',this.value)"></td><td><input type="number" min="0" value="${r.overtimeRate}" ${r.salaryModel===2?'readonly class="payroll-locked" title="Calculated from the engineer profile and approved attendance. Change it there, then save again. / يُحسب من ملف المهندس والحضور المعتمد"':''} onchange="payrollSetRow('${r.id}','overtimeRate',this.value)"></td><td class="money">${payrollMoney(c.overtimeAmount)}</td>
<td><input type="number" min="0" value="${r.otherEarnings}" onchange="payrollSetRow('${r.id}','otherEarnings',this.value)"></td><td><input type="number" min="0" value="${r.deductions}" onchange="payrollSetRow('${r.id}','deductions',this.value)"></td><td class="money net-cell">${payrollMoney(c.net)}</td><td><input class="notes-inp" value="${escHtml(r.notes)}" onchange="payrollSetRow('${r.id}','notes',this.value)"></td><td><button class="rm-btn" onclick="payrollRemoveRow('${r.id}')">×</button></td></tr>`}).join(''):'<tr><td colspan="21"><div class="empty-resource">No employees added. Select a project and click Load Engineers, or add a row manually.</div></td></tr>';const t=payrollTotals();const sum=document.getElementById('payroll-summary');if(sum)sum.innerHTML=`<div class="payroll-summary-box"><div class="lbl">Prorated Package</div><div class="val">${fmtSAR(t.attendance)}</div></div><div class="payroll-summary-box"><div class="lbl">Allowances & Additions</div><div class="val">${fmtSAR(t.allowances)}</div></div><div class="payroll-summary-box"><div class="lbl">Overtime</div><div class="val">${fmtSAR(t.overtime)}</div></div><div class="payroll-summary-box"><div class="lbl">Deductions</div><div class="val">${fmtSAR(t.deductions)}</div></div><div class="payroll-summary-box total"><div class="lbl">Net Payroll Total</div><div class="val">${fmtSAR(t.net)}</div></div>`}
function payrollRender(){if(!sfCurrentPayroll)sfCurrentPayroll=payrollBlankSheet();sfCurrentPayroll.standardDays=Math.max(1,Math.min(31,sfNum(sfCurrentPayroll.standardDays)||30));const m=document.getElementById('payroll-month');if(m)m.value=sfCurrentPayroll.month||payrollDefaultMonth();const d=document.getElementById('payroll-standard-days');if(d)d.value=sfCurrentPayroll.standardDays;payrollPopulateProjects();payrollRenderRows();payrollRenderSaved()}
function payrollPostProjectExpense(sheet){projects.forEach(p=>{if(!Array.isArray(p.actualExpenses))p.actualExpenses=[];p.actualExpenses=p.actualExpenses.filter(e=>e.sourceId!==sheet.id)});if(!sheet.projectId)return;const p=projects.find(x=>x.id===sheet.projectId);if(!p)return;const total=(sheet.rows||[]).reduce((s,r)=>s+payrollCalcStandalone(r,sheet.standardDays).net,0);p.actualExpenses.push({id:'exp_'+sheet.id,source:'payroll',sourceId:sheet.id,category:'Payroll',description:`Monthly payroll ${sheet.month}`,amount:total,date:(sheet.month||payrollDefaultMonth())+'-01'});p.updatedAt=new Date().toISOString();saveProjects()}
function payrollCalcStandalone(r,standardDays){const days=r.salaryModel===2?30:Math.max(1,Math.min(31,sfNum(standardDays)||30));const attendance=Math.min(days,Math.max(0,sfNum(r.attendanceDays)));const monthlyPackage=sfNum(r.baseSalary)+sfNum(r.housingTransport)+sfNum(r.carAllowance??r.siteCar);const attendanceSalary=monthlyPackage*attendance/days;const overtimeAmount=r.salaryModel===2?sfNum(r.attendanceOvertimeAmount):sfNum(r.overtimeHours)*sfNum(r.overtimeRate);const fixedAdditions=sfNum(r.siteAllowance)+sfNum(r.otherAllowance)+sfNum(r.otherEarnings);const gross=attendanceSalary+fixedAdditions+overtimeAmount;return{attendanceSalary,overtimeAmount,allowances:fixedAdditions,gross,net:Math.max(0,gross-sfNum(r.deductions)),monthlyPackage}}
function payrollSaveSheet(){if(!sfCurrentPayroll)payrollNewSheet();if(!sfCurrentPayroll.month){alert('Select the payroll month.');return}if(!sfCurrentPayroll.rows.length){alert('Add at least one employee.');return}if(!sfValidatePayrollUnique(sfCurrentPayroll))return;sfCurrentPayroll.projectId=document.getElementById('payroll-project').value||'';sfCurrentPayroll.standardDays=Math.max(1,Math.min(31,sfNum(sfCurrentPayroll.standardDays)||30));sfCurrentPayroll.updatedAt=new Date().toISOString();const copy=deepClone(sfCurrentPayroll);const idx=sfPayrollSheets.findIndex(x=>x.id===copy.id);if(idx>=0)sfPayrollSheets[idx]=copy;else sfPayrollSheets.unshift(copy);payrollSaveStore();payrollPostProjectExpense(copy);setCloudStatus('saved','Saved to cloud');alert(typeof sfAttendanceCostingCovers==='function'&&sfAttendanceCostingCovers(copy)?'Payroll sheet saved. Project cost for this month comes from approved attendance and invoices, so no lump sum is posted from this sheet.':'Monthly timesheet saved and project actual cost updated.')}
function payrollLoadSheet(id){const x=sfPayrollSheets.find(s=>s.id===id);if(!x)return;sfCurrentPayroll=deepClone(x);payrollRender();window.scrollTo({top:0,behavior:'smooth'})}
function payrollDeleteSheet(id){const x=sfPayrollSheets.find(s=>s.id===id);if(x?.status==='approved'){alert('لا يمكن حذف كشف معتمد. يلزم إجراء تصحيح موثق.');return;}if(!x||!confirm('Delete this monthly sheet?'))return;sfPayrollSheets=sfPayrollSheets.filter(s=>s.id!==id);projects.forEach(p=>{p.actualExpenses=(p.actualExpenses||[]).filter(e=>e.sourceId!==id)});saveProjects();payrollSaveStore();if(sfCurrentPayroll?.id===id)payrollNewSheet()}
function payrollApproveCurrent(){if(!sfCurrentPayroll)return;sfCurrentPayroll.status='approved';payrollSaveSheet()}
function payrollRenderSaved(){const root=document.getElementById('payroll-saved-list');if(!root)return;const q=(document.getElementById('payroll-search')?.value||'').toLowerCase();const list=sfPayrollSheets.filter(s=>{const p=projects.find(x=>x.id===s.projectId);return[s.month,p?.name,s.status].join(' ').toLowerCase().includes(q)});root.innerHTML=list.length?list.map(s=>{const p=projects.find(x=>x.id===s.projectId);const total=(s.rows||[]).reduce((a,r)=>a+payrollCalcStandalone(r,s.standardDays).net,0);return`<div class="payroll-sheet-card"><strong>${escHtml(s.month)} — ${escHtml(p?.name||'General')}</strong><small>${s.rows.length} employees · ${fmtSAR(total)} · ${escHtml(s.status||'draft')}</small><div class="payroll-sheet-card-actions"><button class="btn-sm" onclick="payrollLoadSheet('${s.id}')">Open</button><button class="btn-sm" onclick="payrollExportXlsx('${s.id}')">Excel</button>${s.status==='approved'?'':`<button class="btn-sm" onclick="payrollDeleteSheet('${s.id}')">Delete</button>`}</div></div>`}).join(''):'<div class="empty-resource" style="grid-column:1/-1">No monthly sheets saved yet.</div>';updateSidebarCounts()}
function payrollSheetForAction(id){return id?sfPayrollSheets.find(x=>x.id===id):sfCurrentPayroll}

function payrollPrint(){const sheet=sfCurrentPayroll;if(!sheet||!sheet.rows.length){alert('No payroll data to print.');return}const p=projects.find(x=>x.id===sheet.projectId);const rows=sheet.rows.map((r,i)=>{const c=payrollCalcStandalone(r,sheet.standardDays);return`<tr><td>${i+1}</td><td>${escHtml(r.name)}</td><td>${escHtml(r.employeeNo)}</td><td>${payrollMoney(r.baseSalary)}</td><td>${r.attendanceDays}</td><td>${payrollMoney(c.attendanceSalary)}</td><td>${payrollMoney(c.allowances)}</td><td>${payrollMoney(c.overtimeAmount)}</td><td>${payrollMoney(r.deductions)}</td><td>${payrollMoney(c.net)}</td><td>${escHtml(r.notes)}</td></tr>`}).join('');const total=sheet.rows.reduce((a,r)=>a+payrollCalcStandalone(r,sheet.standardDays).net,0);const w=window.open('','_blank');w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Timesheet ${sheet.month}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:18px;color:#111}h2{text-align:center;color:#1F3864}.sub{text-align:center;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#1F3864;color:#fff}th,td{border:1px solid #777;padding:5px;text-align:center}.total{background:#fff4cf;font-weight:bold}.sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:60px;margin-top:55px;text-align:center}.sigs div{border-top:1px solid #222;padding-top:7px}@media print{@page{size:A4 landscape;margin:8mm}}</style></head><body><h2>رواتب شركة سماء الميدان — الشهر ${escHtml(sheet.month)}</h2><div class="sub">${escHtml(p?.name||'عام')} · مقسوم الرواتب الثابت: 30</div><table><thead><tr><th>م</th><th>الاسم</th><th>الرقم الوظيفي</th><th>الراتب الأساسي</th><th>أيام الاستحقاق</th><th>الباقة بالحضور</th><th>إضافات ثابتة</th><th>الإضافي</th><th>الخصومات</th><th>الإجمالي</th><th>ملاحظات</th></tr></thead><tbody>${rows}<tr class="total"><td colspan="9">الإجمالي</td><td>${payrollMoney(total)}</td><td></td></tr></tbody></table><div class="sigs"><div>المدير العام</div><div>الحسابات</div><div>إدارة شؤون الموظفين</div></div><script>window.onload=()=>window.print()<\/script>
</body></html>`);w.document.close()}






function renderCostLibrary(){
  
  sfRenderEquipmentLibrary();
}


function addCostManpowerRow(){sfCurrentCostPlan.manpower.push({id:sfUid('mp'),engineerId:'',label:'',qty:1,duration:1,basis:conditionType==='engineer_rental'?'monthly':'daily',rate:0});renderCostPlan();}

function addCostOtherRow(description='',amount=0){sfCurrentCostPlan.other.push({id:sfUid('oth'),description,amount:sfNum(amount)});renderCostPlan();}
function removeCostPlanRow(group,id){sfCurrentCostPlan[group]=(sfCurrentCostPlan[group]||[]).filter(x=>x.id!==id);renderCostPlan();}
function setCostPlanValue(group,id,field,value){const row=(sfCurrentCostPlan[group]||[]).find(x=>x.id===id);if(!row)return;row[field]=['qty','duration','rate','amount'].includes(field)?sfNum(value):value;if(group==='manpower'&&field==='engineerId'){const e=sfEngineers.find(x=>x.id===value);row.label=e?e.name:'';row.rate=e?(row.basis==='monthly'?e.monthly:row.basis==='hourly'?e.overtime:e.daily):row.rate;}if(group==='manpower'&&field==='basis'){const e=sfEngineers.find(x=>x.id===row.engineerId);if(e)row.rate=value==='monthly'?e.monthly:value==='hourly'?e.overtime:e.daily;}renderCostPlan();}
function calcInternalCostPlan(){const manpower=(sfCurrentCostPlan.manpower||[]).reduce((s,x)=>s+sfNum(x.qty)*sfNum(x.duration)*sfNum(x.rate),0);const equipment=0;/* company-owned equipment has no internal cost; older equipment rows are ignored */const other=(sfCurrentCostPlan.other||[]).reduce((s,x)=>s+sfNum(x.amount),0);return{manpower,equipment,other,total:manpower+equipment+other};}
function engineerOptions(selected){return `<option value="">Select engineer / enter role</option>`+sfEngineers.map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${escHtml(x.name)} — ${escHtml(x.specialization||'')} ${x.loa&&x.loa!=='Non-LOA'?'('+escHtml(x.loa)+')':''}</option>`).join('')}

function renderCostPlan(){
  if(!sfCurrentCostPlan||typeof sfCurrentCostPlan!=='object')sfCurrentCostPlan={manpower:[],equipment:[],other:[]};
  const mb=document.getElementById('cost-manpower-body');if(mb)mb.innerHTML=sfCurrentCostPlan.manpower.length?sfCurrentCostPlan.manpower.map(x=>`<tr><td><select onchange="setCostPlanValue('manpower','${x.id}','engineerId',this.value)">${engineerOptions(x.engineerId)}</select>${!x.engineerId?`<input style="margin-top:4px" placeholder="Or type a role" value="${escHtml(x.label||'')}" oninput="setCostPlanValue('manpower','${x.id}','label',this.value)">`:''}</td><td><input type="number" min="0" value="${sfNum(x.qty)}" oninput="setCostPlanValue('manpower','${x.id}','qty',this.value)"></td><td><input type="number" min="0" step="0.5" value="${sfNum(x.duration)}" oninput="setCostPlanValue('manpower','${x.id}','duration',this.value)"></td><td><select onchange="setCostPlanValue('manpower','${x.id}','basis',this.value)"><option value="daily" ${x.basis==='daily'?'selected':''}>Daily</option><option value="monthly" ${x.basis==='monthly'?'selected':''}>Monthly</option><option value="hourly" ${x.basis==='hourly'?'selected':''}>Overtime Hour</option></select></td><td><input type="number" min="0" step="0.01" value="${sfNum(x.rate)}" oninput="setCostPlanValue('manpower','${x.id}','rate',this.value)"></td><td class="num"><strong>${fmtSAR(sfNum(x.qty)*sfNum(x.duration)*sfNum(x.rate))}</strong></td><td class="remove-col"><button class="rm-btn" onclick="removeCostPlanRow('manpower','${x.id}')">×</button></td></tr>`).join(''):`<tr><td colspan="7"><div class="empty-resource">Add engineers or manpower roles required for this quotation.</div></td></tr>`;
  const ob=document.getElementById('cost-other-body');if(ob)ob.innerHTML=sfCurrentCostPlan.other.length?sfCurrentCostPlan.other.map(x=>`<tr><td><input placeholder="Transportation, accommodation, mobilization..." value="${escHtml(x.description||'')}" oninput="setCostPlanValue('other','${x.id}','description',this.value)"></td><td><input type="number" min="0" step="0.01" value="${sfNum(x.amount)}" oninput="setCostPlanValue('other','${x.id}','amount',this.value)"></td><td class="remove-col"><button class="rm-btn" onclick="removeCostPlanRow('other','${x.id}')">×</button></td></tr>`).join(''):`<tr><td colspan="3"><div class="empty-resource">Add transportation, accommodation, mobilization, or other project costs.</div></td></tr>`;
  
  const c=calcInternalCostPlan();let selling=0;try{selling=calcQuotationTotals().sub||0}catch(e){}const profit=selling-c.total;const margin=selling?profit/selling*100:0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('cost-sum-manpower',fmtSAR(c.manpower));set('cost-sum-resources',fmtSAR(c.other));set('cost-sum-total',fmtSAR(c.total));set('cost-sum-profit',fmtSAR(profit)+' · '+margin.toFixed(1)+'%');const box=document.getElementById('cost-profit-box');if(box)box.className='cost-summary-box '+(profit>=0?'good':'bad');
}
function projectPayrollRecords(p){return sfHasAccess('payroll')?sfPayrollSheets.filter(x=>x.projectId===p.id):[]}

function sfPayrollEmployeeKey(row){return String(row.engineerId||row.employeeNo||row.iqama||'').trim()}
function sfValidatePayrollUnique(sheet){
 const seen=new Set();
 for(const row of sheet.rows||[]){
  const key=sfPayrollEmployeeKey(row);
  if(!key){alert('يلزم تحديد الموظف لكل صف قبل حفظ الكشف.');return false;}
  if(seen.has(key)){alert('الموظف مكرر داخل الكشف: '+(row.name||key));return false;}seen.add(key);
  if(sfPayrollSheets.some(s=>s.id!==sheet.id&&s.status==='approved'&&s.month===sheet.month&&(s.rows||[]).some(r=>sfPayrollEmployeeKey(r)===key))){alert('يوجد كشف معتمد لهذا الموظف في نفس الشهر: '+(row.name||key));return false;}
 }
 return true;
}

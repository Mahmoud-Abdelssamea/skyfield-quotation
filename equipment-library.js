// SKY FIELD — Equipment Library (page module id 'costsettings'), the only place devices are managed.
// Every device has a price per day, per week and per month. In a quotation the person preparing it
// picks the unit (days / weeks / months) and how many; the line total is price × quantity.
//
// Equipment belongs to the company: it has no internal cost (the Internal Cost step has no equipment section).
//
// Storage: one localStorage key per device ('sfQuoteEquipmentItem_<id>'), so two people editing
// different devices never overwrite each other. The older Cost Library array ('sfCostEquipment') is
// read as it is; a saved record with the same id overrides it, and a record marked deleted hides it.
// The former built-in quotation list and devices added from inside a quotation are no longer offered;
// quotations that already contain them keep them (they are stored inside the quotation).
// In a quotation, selEq[key] = {kit, mfr, daily: price of the chosen unit, unit: 'day'|'week'|'month'}
// and eqQty[key] = number of units, so every existing total (price × quantity) stays correct.

const SF_EQUIPMENT_KEY_PREFIX='sfQuoteEquipmentItem_';
const SF_EQ_UNITS=['day','week','month'];
const SF_EQ_UNIT_TEXT={day:['day','days','يوم','Day'],week:['week','weeks','أسبوع','Week'],month:['month','months','شهر','Month']};
let sfEquipmentEditingId='';
const sfEqUnitChoice={}; // unit picked on a row before it is ticked (not saved)

function sfEquipmentNum(v){const n=parseFloat(v);return Number.isFinite(n)&&n>0?n:0}
function sfEquipmentLegacyRates(){try{const v=JSON.parse(localStorage.getItem('sfCostEquipment')||'[]');return Array.isArray(v)?v:[]}catch(_){return []}}
function sfEquipmentStoredRecords(){
 const out=[];
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);if(!key||!key.startsWith(SF_EQUIPMENT_KEY_PREFIX))continue;
  try{const r=JSON.parse(localStorage.getItem(key)||'null');if(r&&r.id)out.push(r)}catch(error){console.warn('Skipped invalid equipment record:',key,error)}
 }
 return out;
}
// Prices of a saved record, whichever version wrote it. Null = not an Equipment Library device.
function sfEquipmentRecordPrices(r){
 if(r.v===2)return{day:sfEquipmentNum(r.daily),week:sfEquipmentNum(r.weekly),month:sfEquipmentNum(r.monthly)};
 if('costDaily' in r&&!Number.isInteger(r.builtin))// written by the previous Cost Library form
  return{day:sfEquipmentNum(r.costDaily)||sfEquipmentNum(r.daily),week:sfEquipmentNum(r.costWeekly),month:sfEquipmentNum(r.costMonthly)};
 return null; // former built-in list or a device added from inside a quotation
}
function sfEquipmentLibrary(){
 const byId=new Map();
 sfEquipmentLegacyRates().forEach(x=>{if(x&&x.id&&String(x.name||'').trim())byId.set(String(x.id),{id:String(x.id),name:String(x.name).trim(),mfr:'',category:x.category||'',day:sfEquipmentNum(x.daily),week:sfEquipmentNum(x.weekly),month:sfEquipmentNum(x.monthly)})});
 sfEquipmentStoredRecords().forEach(r=>{
  const id=String(r.id);
  if(r.deleted){byId.delete(id);return}
  const p=sfEquipmentRecordPrices(r);if(!p||!String(r.kit||'').trim())return;
  const base=byId.get(id)||{};
  byId.set(id,{...base,id,name:String(r.kit).trim(),mfr:String(r.mfr||'').replace(/^—$/,'').trim(),category:r.category??base.category??'',...p,updatedAt:r.updatedAt||''});
 });
 return [...byId.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
const sfEqHasPrice=x=>x.day>0||x.week>0||x.month>0;
const sfEqDefaultUnit=rates=>SF_EQ_UNITS.find(u=>rates[u]>0)||'day';
function sfEqUnitWord(unit,n,lang){const t=SF_EQ_UNIT_TEXT[unit]||SF_EQ_UNIT_TEXT.day,one=parseFloat(n)===1;
 if(lang==='ar')return t[2];if(lang==='both')return `${one?t[0]:t[1]} / ${t[2]}`;return one?t[0]:t[1]}
function sfEqUnitOf(e){return SF_EQ_UNITS.includes(e?.unit)?e.unit:'day'}

// Rows for the quotation "Equipment" step.
function quoteEquipmentRows(){
 const rows=sfEquipmentLibrary().filter(sfEqHasPrice).map(x=>({key:'custom:'+x.id,kit:x.name,mfr:x.mfr||'—',rates:{day:x.day,week:x.week,month:x.month},id:x.id}));
 const shown=new Set(rows.map(r=>r.key));
 // A device no longer in the library stays visible in a quotation that already includes it.
 Object.entries(typeof selEq!=='undefined'?selEq:{}).forEach(([key,item])=>{
  if(shown.has(key)||!item)return;const unit=sfEqUnitOf(item);
  rows.push({key,kit:item.kit||'Equipment',mfr:item.mfr||'—',rates:{[unit]:Math.max(0,parseFloat(item.daily)||0)},archived:true});
 });
 return rows;
}
function buildEq(){
 const el=document.getElementById('eq-list');if(!el)return;el.innerHTML='';
 const rows=quoteEquipmentRows();
 if(!rows.length){el.innerHTML=`<div class="eq-empty">${typeof sfUiLanguage!=='undefined'&&sfUiLanguage==='ar'?'لا توجد أجهزة بعد. أضفها من قائمة الأجهزة.':'No equipment yet. Add devices in the Equipment Library.'}</div>`;return}
 rows.forEach(({key,kit,mfr,rates,archived})=>{
  const chk=!!selEq[key],qty=eqQty[key]||1;
  const unit=chk?sfEqUnitOf(selEq[key]):(rates[sfEqUnitChoice[key]]>0?sfEqUnitChoice[key]:sfEqDefaultUnit(rates));
  const price=chk?(parseFloat(selEq[key].daily)||0):(rates[unit]||0);
  const units=SF_EQ_UNITS.filter(u=>rates[u]>0||(chk&&u===unit));
  const row=document.createElement('div');row.className='eq-row'+(chk?' checked':'')+(archived?' archived':'');
  row.innerHTML=`<input type="checkbox" ${chk?'checked':''}>
   <div><div class="eq-name">${escHtml(kit)}</div><div class="eq-mfr">${escHtml(mfr==='—'?'':mfr)}${archived?' · '+escHtml(typeof sfUiLanguage!=='undefined'&&sfUiLanguage==='ar'?'لم يعد في القائمة':'no longer in the library'):''}</div></div>
   <select class="eq-unit" title="Rent by">${units.map(u=>`<option value="${u}" ${u===unit?'selected':''}>${SF_EQ_UNIT_TEXT[u][3]} · SAR ${Number(chk&&u===unit?price:rates[u]||0).toLocaleString()}</option>`).join('')}</select>
   <input class="qty-inp eq-days-input" type="number" min="1" step="1" value="${qty}" title="Number of ${SF_EQ_UNIT_TEXT[unit][1]}">
   <div class="eq-total" style="color:${chk?'var(--navy-mid)':'var(--gray-200)'}">${chk?'SAR '+(price*qty).toLocaleString():'—'}</div>
   <div class="eq-manage-actions"></div>`;
  const checkbox=row.querySelector('input[type=checkbox]'),qtyInput=row.querySelector('.eq-days-input'),unitSelect=row.querySelector('.eq-unit');
  const toggle=on=>toggleEq(key,kit,mfr,rates[unit]??price,on,{unit});
  checkbox.onclick=event=>event.stopPropagation();checkbox.onchange=event=>toggle(event.target.checked);
  qtyInput.onclick=event=>event.stopPropagation();qtyInput.oninput=event=>setEqQty(key,event.target.value);
  unitSelect.onclick=event=>event.stopPropagation();unitSelect.onchange=event=>setEqUnit(key,event.target.value,rates);
  row.onclick=()=>{checkbox.checked=!checkbox.checked;toggle(checkbox.checked)};
  el.appendChild(row);
 });
}
function toggleEq(i,kit,mfr,daily,on,extra={}){
 if(on){selEq[i]={kit,mfr,daily,unit:'day',...extra};if(!eqQty[i])eqQty[i]=1;}else delete selEq[i];
 buildEq();recalc();renderQuot();
}
function setEqQty(i,val){eqQty[i]=Math.max(1,parseInt(val)||1);buildEq();recalc();renderQuot();}
function setEqUnit(key,unit,rates){
 if(!SF_EQ_UNITS.includes(unit))return;
 if(selEq[key]){if(!(rates[unit]>0))return;selEq[key]={...selEq[key],unit,daily:rates[unit]};}
 else sfEqUnitChoice[key]=unit;
 buildEq();recalc();renderQuot();
}

// Equipment Library page.
function sfEquipmentWrite(record){
 localStorage.setItem(SF_EQUIPMENT_KEY_PREFIX+record.id,JSON.stringify({...record,updatedAt:new Date().toISOString(),updatedBy:(typeof sfCurrentUser!=='undefined'&&sfCurrentUser?.email)||''}));
}
function sfEquipmentAfterChange(){
 renderCostLibrary();
 if(typeof renderCostPlan==='function')renderCostPlan();
 if(document.getElementById('eq-list'))buildEq();
}
const sfEqField=id=>document.getElementById(id);
function resetCostEquipmentForm(){
 sfEquipmentEditingId='';
 ['cost-eq-id','cost-eq-name','cost-eq-mfr','cost-eq-category','cost-eq-daily','cost-eq-weekly','cost-eq-monthly'].forEach(id=>{const e=sfEqField(id);if(e)e.value=''});
 const t=sfEqField('cost-eq-form-title');if(t)t.textContent='Add Equipment';
 const b=sfEqField('cost-eq-save-btn');if(b)b.textContent='Save Equipment';
}
function editCostEquipmentRecord(id){
 const x=sfEquipmentLibrary().find(e=>e.id===String(id));if(!x)return;
 sfEquipmentEditingId=x.id;
 const set=(k,v)=>{const e=sfEqField(k);if(e)e.value=v??''};
 set('cost-eq-id',x.id);set('cost-eq-name',x.name);set('cost-eq-mfr',x.mfr);set('cost-eq-category',x.category);
 set('cost-eq-daily',x.day||'');set('cost-eq-weekly',x.week||'');set('cost-eq-monthly',x.month||'');
 sfEqField('cost-eq-form-title').textContent='Edit Equipment';sfEqField('cost-eq-save-btn').textContent='Update Equipment';
 sfEqField('cost-eq-name')?.scrollIntoView({behavior:'smooth',block:'center'});sfEqField('cost-eq-name')?.focus();
}
async function saveCostEquipmentRecord(){
 const name=(sfEqField('cost-eq-name')?.value||'').trim();
 if(!name){alert('Equipment name is required.');sfEqField('cost-eq-name')?.focus();return}
 const read=id=>{const t=(sfEqField(id)?.value||'').trim();if(!t)return 0;const n=parseFloat(t);return Number.isFinite(n)&&n>=0?n:NaN};
 const day=read('cost-eq-daily'),week=read('cost-eq-weekly'),month=read('cost-eq-monthly');
 if([day,week,month].some(Number.isNaN)){alert('Prices must be numbers of 0 or more.');return}
 if(!(day>0||week>0||month>0)){alert('Enter at least one price: per day, per week or per month.');sfEqField('cost-eq-daily')?.focus();return}
 const id=sfEquipmentEditingId||('eq_'+Date.now()+'_'+Math.floor(Math.random()*100000));
 if(sfEquipmentLibrary().some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase())&&!(await sfConfirm({title:sfLang(`"${name}" is already in the library. Save another device with the same name?`,`«${name}» موجود بالفعل في المكتبة. حفظ جهاز آخر بنفس الاسم؟`),ok:sfLang('Save anyway','حفظ على أي حال')})))return;
 sfEquipmentWrite({v:2,id,kit:name,mfr:(sfEqField('cost-eq-mfr')?.value||'').trim(),category:(sfEqField('cost-eq-category')?.value||'').trim(),daily:day,weekly:week,monthly:month});
 resetCostEquipmentForm();sfEquipmentAfterChange();
}
async function deleteCostEquipmentRecord(id){
 const x=sfEquipmentLibrary().find(e=>e.id===String(id));if(!x)return;
 if(!(await sfConfirm({title:sfLang(`Delete "${x.name}" from the equipment library?`,`حذف «${x.name}» من مكتبة المعدات؟`),
   message:sfLang('It will no longer appear in new quotations. Saved quotations keep it.','لن يظهر في عروض الأسعار الجديدة، والعروض المحفوظة تحتفظ به.'),ok:sfLang('Delete','حذف'),danger:true})))return;
 sfEquipmentWrite({id:x.id,deleted:true});if(sfEquipmentEditingId===x.id)resetCostEquipmentForm();sfEquipmentAfterChange();
}
function sfRenderEquipmentLibrary(){
 const body=sfEqField('cost-equipment-table-body');if(!body)return;
 const term=(sfEqField('cost-eq-search')?.value||'').trim().toLowerCase(),all=sfEquipmentLibrary();
 const list=all.filter(x=>!term||[x.name,x.mfr,x.category].join(' ').toLowerCase().includes(term));
 const count=sfEqField('cost-eq-count');if(count)count.textContent=`${list.length} of ${all.length}`;
 const money=n=>n>0?fmtSAR(n):'—';
 body.innerHTML=list.length?list.map(x=>`<tr${sfEqHasPrice(x)?'':' class="eq-internal-only"'}><td><strong>${escHtml(x.name)}</strong>${x.mfr?`<small class="eq-lib-mfr">${escHtml(x.mfr)}</small>`:''}${sfEqHasPrice(x)?'':'<small class="eq-lib-off">No price — not shown in quotations</small>'}</td><td>${escHtml(x.category||'')}</td>
  <td>${money(x.day)}</td><td>${money(x.week)}</td><td>${money(x.month)}</td>
  <td style="white-space:nowrap"><button class="btn-sm" type="button" onclick="editCostEquipmentRecord('${escHtml(x.id)}')">Edit</button> <button class="btn-sm" type="button" onclick="deleteCostEquipmentRecord('${escHtml(x.id)}')">Delete</button></td></tr>`).join('')
  :`<tr><td colspan="6"><div class="empty-resource">${all.length?'No equipment matches this search.':'No equipment yet. Add the first device with the form.'}</div></td></tr>`;
}
function sfOpenEquipmentLibrary(){
 showTab('costsettings',document.querySelector('.side-nav-btn[data-module="costsettings"]'));
 setTimeout(()=>sfEqField('cost-eq-name')?.focus(),200);
}

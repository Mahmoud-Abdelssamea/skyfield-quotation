// Administrative absence / leave: preview, explicit replacement, then an atomic audited save.
(function(){
'use strict';
const E=id=>document.getElementById(id),T=(ar,en)=>language==='en'?en:ar;
let preview=null,busy=false,request=0;
const allowed=()=>me?.role==='admin';
const say=(text,error=false)=>{E('aaMessage').textContent=text;E('aaMessage').classList.toggle('error',error)};
function invalidate(){preview=null;++request;E('aaPreviewPanel').hidden=true;E('aaSave').disabled=true;E('aaReplace').checked=false}
function values(){return {p_user_id:E('aaEngineer').value,p_from:E('aaFrom').value,p_to:E('aaTo').value,p_status:E('aaStatus').value,p_leave_type:E('aaStatus').value==='leave'?E('aaLeave').value:null,p_include_friday:E('aaFriday').checked,p_note:E('aaNote').value.trim()}}
function dates(v){
 if(!v.p_user_id||!v.p_from||!v.p_to||v.p_from>v.p_to||v.p_from.slice(0,7)!==v.p_to.slice(0,7)||v.p_to>allowedUntil()||v.p_from<'2000-01-01')throw Error(T('اختر المهندس وفترة صحيحة داخل شهر واحد وحتى التاريخ المسموح.','Choose an engineer and valid dates within one month and the allowed date limit.'));
 const days=[],end=new Date(v.p_to+'T00:00:00Z');for(let d=new Date(v.p_from+'T00:00:00Z');d<=end;d.setUTCDate(d.getUTCDate()+1))if(v.p_include_friday||d.getUTCDay()!==5)days.push(d.toISOString().slice(0,10));
 if(!days.length)throw Error(T('لا توجد أيام بعد استبعاد الجمعة.','No days remain after excluding Friday.'));return days;
}
function statusText(r){return r?tr(labels[r.status]||r.status)+(r.status==='leave'?' · '+tr({annual:'سنوية',sick:'مرضية',emergency:'طارئة',unpaid:'بدون راتب'}[r.leave_type]||'إجازة'):''):T('غير مسجل','Not recorded')}
async function loadPreview(){
 if(!allowed()||busy)return;invalidate();const token=request,user=me.user_id;busy=true;E('aaFields').disabled=true;say(T('جاري تحميل الأيام…','Loading days…'));
 try{
  const v=values(),days=dates(v),start=v.p_from.slice(0,7)+'-01',next=new Date(start+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
  const rows=await checked(db.from('sf_daily_records').select('id,user_id,day,status,leave_type,review,period_revision,period_id').eq('user_id',v.p_user_id).gte('day',start).lt('day',next.toISOString().slice(0,10)).order('day'));
  if(token!==request||me?.user_id!==user||!allowed())return;
  const existing=new Map(rows.map(r=>[r.day,r])),replaced=days.filter(d=>existing.has(d)).length;
  preview={v,rows,days,replaced};E('aaRows').innerHTML=days.map(d=>`<tr><td>${esc(d)}</td><td>${esc(statusText(existing.get(d)))}</td><td>${esc(statusText({status:v.p_status,leave_type:v.p_leave_type}))}</td></tr>`).join('');
  E('aaSummary').textContent=T(`${days.length} يوم · ${replaced} يوم مسجل سيتم استبداله`,`${days.length} days · ${replaced} recorded days will be replaced`);
  E('aaReplaceLabel').hidden=!replaced;E('aaSave').disabled=!!replaced;E('aaPreviewPanel').hidden=false;say('');
 }catch(e){say(e.message,true)}finally{busy=false;E('aaFields').disabled=false}
}
function errorText(e){const m=String(e.message||e);if(/ATTENDANCE_CHANGED/.test(m))return T('تغيّر سجل المهندس. اضغط معاينة الأيام وراجع التغييرات من جديد.','The engineer’s records changed. Preview and review the days again.');if(/ADMIN_REQUIRED|ENGINEER_UNAVAILABLE/.test(m))return T('صلاحية الإدارة أو حساب المهندس غير متاح.','Administrator access or engineer account is unavailable.');return m}
async function save(e){
 e.preventDefault();if(!allowed()||busy||!preview)return;
 const v=values();if(JSON.stringify(v)!==JSON.stringify(preview.v)){invalidate();say(T('أعد معاينة الأيام بعد تغيير البيانات.','Preview again after changing the details.'),true);return}
 if(!v.p_note||v.p_note.length>500){say(T('اكتب سبب التسجيل، بحد أقصى 500 حرف.','Enter a reason, up to 500 characters.'),true);return}
 if(preview.replaced&&!E('aaReplace').checked)return;
 const name=members.find(m=>m.user_id===v.p_user_id)?.name||'',count=preview.days.length;
 if(!confirm(T(`حفظ واعتماد ${count} يوم للمهندس ${name}؟ ستُستبدل الحالات المعروضة في المعاينة.`,`Save and approve ${count} days for ${name}? Existing statuses shown in the preview will be replaced.`)))return;
 const user=me.user_id,snapshot=preview.rows.map(r=>({id:r.id,revision:r.period_revision}));busy=true;E('aaFields').disabled=true;E('aaSave').disabled=true;
 try{await checked(db.rpc('sf_admin_set_absence',{...v,p_existing:snapshot}));if(me?.user_id!==user)return;invalidate();say(T('تم حفظ الغياب / الإجازة واعتماده.','Absence / leave saved and approved.'));window.sfEmbeddedReviewChanged?.();try{await refresh({quiet:true})}catch{say(T('تم الحفظ. اضغط تحديث لإعادة تحميل القائمة.','Saved. Refresh to reload the list.'))}}
 catch(e){invalidate();say(errorText(e),true)}finally{busy=false;E('aaFields').disabled=false}
}
Object.assign(translations,{'تسجيل غياب أو إجازة لمهندس':'Record engineer absence or leave','سبب التسجيل / التعديل':'Reason for entry / change','التسجيل الإداري يُعتمد مباشرة. راجع الأيام المسجلة قبل الحفظ.':'Administrative entries are approved immediately. Review existing days before saving.','معاينة الأيام':'Preview days','الحالة الحالية':'Current status','الحالة الجديدة':'New status','أوافق على استبدال الحالات المسجلة للأيام المعروضة':'I agree to replace existing statuses for the displayed days','حفظ واعتماد الغياب / الإجازة':'Save and approve absence / leave','تشمل الجمعة':'Include Friday'});
window.sfAdminAttendanceInit=()=>{invalidate();E('adminAttendancePanel').hidden=!allowed();if(!allowed())return;E('aaEngineer').innerHTML='<option value="">'+esc(T('اختر المهندس','Select engineer'))+'</option>'+members.filter(m=>m.role==='engineer'&&m.is_active!==false).sort((a,b)=>String(a.engineer_id).localeCompare(String(b.engineer_id),undefined,{numeric:true})).map(m=>`<option value="${esc(m.user_id)}">${esc(m.engineer_id)} · ${esc(m.name)}</option>`).join('');for(const id of ['aaFrom','aaTo']){E(id).value=today();E(id).max=allowedUntil()}translateUI()};
E('aaPreview').onclick=()=>void loadPreview();E('adminAttendanceForm').onsubmit=save;
E('aaFields').oninput=invalidate;E('aaFields').onchange=invalidate;
E('aaStatus').onchange=()=>{E('aaLeaveLabel').hidden=E('aaStatus').value!=='leave';E('aaFriday').checked=E('aaStatus').value==='leave';invalidate()};
E('aaReplace').onchange=()=>{E('aaSave').disabled=!preview||(preview.replaced&&!E('aaReplace').checked)||busy};
if(typeof me!=='undefined'&&me)window.sfAdminAttendanceInit();
})();

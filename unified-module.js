'use strict';
const sfHost=window.parent;let sfExtraTarget='',sfExtraLoading=false,sfExtraRequest=0;
function sfEmbeddedLoaded(){
 if(window===window.top)return;
 // The host supplies the actual route through sfSetEmbeddedView after identity verification.
 sfHost.sfUnifiedModuleReady(window,me.user_id);sfMeasureModule();
 if(window.sfApprovalSalaryReady)void window.sfApprovalSalaryReady();
}
window.sfSetEmbeddedView=function(panel,lang,userId){
 if(window===window.top||!me||userId!==me.user_id)return;
 if(panel==='engineersSection'&&!sfHost.sfUnifiedCanManage())panel='dailySection';
 setAttendanceView(panel,false);document.body.dataset.embeddedView=panel==='engineersSection'?'engineers':panel;
 if(language!==lang)changeLanguage(lang);
 if(panel==='monthlySection'){$('timesheetExportPanel').open=typeof me==='undefined'||me?.role!=='admin';}
 sfMeasureModule();
};
function sfEmbeddedNavigate(panel){sfHost.sfUnifiedNavigateFromModule(window,panel)}
function sfEmbeddedRosterChanged(){sfHost.sfUnifiedRosterChanged(window)}
async function sfEmbeddedSalaryInfo(){try{return await sfHost.sfUnifiedSalaryPackages(window)}catch(error){console.warn('Salary data unavailable for approvals',error);return null}}
function sfEmbeddedReviewChanged(){try{sfHost.sfUnifiedReviewChanged(window)}catch(error){console.warn('Project cost refresh skipped',error)}}
function sfMeasureModule(){requestAnimationFrame(()=>{const h=document.querySelector('main')?.getBoundingClientRect().height||300;sfHost.sfUnifiedResize(window,h)})}
new ResizeObserver(sfMeasureModule).observe(document.querySelector('main'));
window.addEventListener('error',()=>sfMeasureModule());
async function sfLoadSupplemental(member){
 const request=++sfExtraRequest;let loaded=false;sfExtraTarget='';sfExtraLoading=true;$('supplementalEngineer').hidden=true;
 const button=$('memberForm').querySelector('button');button.disabled=true;
 try{
  const values=await sfHost.sfUnifiedGetDetails(window,member.user_id);
  if(request!==sfExtraRequest||$('memberForm').elements.user_id.value!==member.user_id)return;
  loaded=true;
  if(!values){for(const input of $('supplementalEngineer').querySelectorAll('[name]'))$('memberForm').querySelector('.grid').appendChild(input.closest('label'));}
  if(values){for(const [key,value] of Object.entries(values))$('extra-'+key).value=value;sfExtraTarget=member.user_id;$('supplementalEngineer').hidden=false;}
 }finally{if(request===sfExtraRequest){sfExtraLoading=false;button.disabled=!loaded;}sfMeasureModule()}
}
async function sfSaveSupplemental(userId,identity){
 if(sfExtraLoading)throw Error('انتظر اكتمال تحميل بيانات المهندس.');
 if($('supplementalEngineer').hidden)return;
 if(sfExtraTarget!==userId)throw Error('أعد فتح بيانات المهندس قبل الحفظ.');
 const values={};for(const input of $('supplementalEngineer').querySelectorAll('[id^="extra-"]'))values[input.id.replace('extra-','')]=input.value;
 try{await sfHost.sfUnifiedSaveDetails(window,userId,values,identity)}
 catch(error){throw Error('تم حفظ الاسم والبدلات، لكن تعذر حفظ بيانات الوظيفة والراتب. أبقِ النموذج مفتوحًا وأعد المحاولة. '+error.message)}
}
// The original async load may finish before this script arrives from the server.
if(me&&!$('app').hidden)sfEmbeddedLoaded();

'use strict';
// Equipment & Custody section: the equipment page (equipment-module.html) in its own frame, sharing this sign-in.
// Shown to every account with an active eq_roles row (eq_can_read_documents), including the accounting account's
// documents role, which the main site treats as attendance-only. Engineer code accounts have no role and never see it.
let sfEquipmentAccess=false,sfEquipmentChecked=false;
let sfEquipmentWanted=location.hash.slice(1)==='devices'||(!location.hash&&localStorage.getItem('sfLastModule')==='devices');
const sfEquipmentBaseShow=showTab,sfEquipmentBaseAllowed=sfUnifiedAllowed,sfEquipmentBaseUnlock=sfUnlockApp,sfEquipmentBaseLock=sfLockApp,sfEquipmentBaseLanguage=sfSetInterfaceLanguage;
const SF_EQUIPMENT_TITLE={en:['Equipment & Custody','Test equipment, custody movements, calibration, and Iqama / SEC-ID tracking.'],
  ar:['الأجهزة والعُهد','أجهزة الاختبار وحركات العهد والمعايرة ومتابعة الإقامة وبطاقة SEC-ID.']};

sfUnifiedAllowed=function(route){return route==='devices'?sfEquipmentAccess:sfEquipmentBaseAllowed(route)};

async function sfEquipmentCheckAccess(){
  sfEquipmentAccess=false;
  try{const {data,error}=await sfDb.rpc('eq_can_read_documents');sfEquipmentAccess=!error&&data===true}catch(error){console.warn('Equipment access check skipped',error)}
  sfEquipmentChecked=true;sfUnifiedApplyAccess();
  if(sfEquipmentWanted&&sfEquipmentAccess)showTab('devices');
  sfEquipmentWanted=false;
}
function sfEquipmentHide(){const panel=document.getElementById('sf-equipment-panel');if(panel)panel.hidden=true}
function sfEquipmentClear(){sfEquipmentHide();const frame=document.getElementById('sf-equipment-frame');if(frame)frame.removeAttribute('src')}

showTab=function(name,button){
  if(name!=='devices'){sfEquipmentHide();return sfEquipmentBaseShow(name,button)}
  if(!sfAuthReady||!sfEquipmentChecked){sfEquipmentWanted=true;return}
  if(!sfUnifiedAllowed('devices'))return sfEquipmentBaseShow('dashboard');
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  document.getElementById('sf-unified-panel').hidden=true;document.getElementById('command-primary-action').hidden=true;
  document.getElementById('sf-equipment-panel').hidden=false;
  sfUnifiedRoute='devices';sfUnifiedDesired='devices';document.body.dataset.module='devices';
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module==='devices'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  const title=SF_EQUIPMENT_TITLE[sfUiLanguage==='ar'?'ar':'en'];
  document.getElementById('app-page-title').textContent=title[0];document.getElementById('app-page-subtitle').textContent=title[1];
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame.getAttribute('src'))frame.src='equipment-module.html?v=20261026-docs&lang='+(sfUiLanguage==='ar'?'ar':'en');
  history.replaceState(null,'','#devices');localStorage.setItem('sfLastModule','devices');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});sfUnifiedApplyAccess();
};
sfUnlockApp=function(user){sfEquipmentChecked=false;sfEquipmentBaseUnlock(user);void sfEquipmentCheckAccess()};
sfLockApp=function(clear){sfEquipmentAccess=false;sfEquipmentChecked=false;sfEquipmentClear();sfEquipmentBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){
  sfEquipmentBaseLanguage(lang,persist);
  document.getElementById('sf-equipment-frame')?.contentWindow?.eqSetLanguage?.(lang==='ar'?'ar':'en');
  if(sfUnifiedRoute==='devices'&&!document.getElementById('sf-equipment-panel').hidden){
    const title=SF_EQUIPMENT_TITLE[lang==='ar'?'ar':'en'];
    document.getElementById('app-page-title').textContent=title[0];document.getElementById('app-page-subtitle').textContent=title[1];
  }
};

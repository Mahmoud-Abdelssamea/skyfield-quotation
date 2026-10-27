'use strict';
// Equipment & Custody: the equipment page (equipment-module.html) in a frame, sharing this sign-in. Its seven sections
// are items of the main sidebar with their own address (#devices, #devices-log, …); the frame has no header or tabs of
// its own, grows to its content so the main page is the only scroll, and opens its windows where the user is looking.
// Shown to equipment members (admin, storekeeper, viewer: eq_is_member); recording a movement to admin and storekeeper.
// The accounting account's documents role opens the separate Iqama & SEC-ID page instead (documents-page.js).
let sfEquipmentAccess=false,sfEquipmentChecked=false,sfEquipmentFrameReady=false,sfEquipmentTab='dashboard';
const SF_EQUIPMENT_SECTIONS={devices:'dashboard','devices-form':'form','devices-log':'log','devices-inv':'inv','devices-calibration':'calibration','devices-manage':'devices','devices-settings':'settings'};
const SF_EQUIPMENT_ROUTE=Object.fromEntries(Object.entries(SF_EQUIPMENT_SECTIONS).map(([route,tab])=>[tab,route]));
const sfEquipmentIsRoute=name=>Object.prototype.hasOwnProperty.call(SF_EQUIPMENT_SECTIONS,name);
let sfEquipmentWanted=(()=>{const h=location.hash.slice(1),last=localStorage.getItem('sfLastModule');return sfEquipmentIsRoute(h)?h:!location.hash&&sfEquipmentIsRoute(last)?last:''})();
const sfEquipmentBaseShow=showTab,sfEquipmentBaseAllowed=sfUnifiedAllowed,sfEquipmentBaseUnlock=sfUnlockApp,sfEquipmentBaseLock=sfLockApp,sfEquipmentBaseLanguage=sfSetInterfaceLanguage;
const SF_EQUIPMENT_TITLE={
  dashboard:[['Equipment dashboard','Inventory, calibration and custody at a glance.'],['لوحة الأجهزة','صورة سريعة للمخزون والمعايرة والعُهد.']],
  form:[['Record a movement','Hand out, receive, or send a device for calibration or maintenance.'],['تسجيل حركة','تسليم جهاز أو استلامه أو إرساله للمعايرة أو الصيانة.']],
  log:[['Movement log','Every hand-out and return, with print and Excel.'],['سجل الحركات','كل حركات التسليم والاستلام، مع الطباعة وExcel.']],
  inv:[['Inventory','Where each device is now and its status.'],['المخزون','مكان كل جهاز الآن وحالته.']],
  calibration:[['Calibration','Certificates and due dates, with alerts at 60, 30 and 7 days.'],['المعايرة','الشهادات ومواعيد المعايرة، مع تنبيه قبل 60 و30 و7 أيام.']],
  devices:[['Manage devices','Add and edit devices, types and certificates.'],['إدارة الأجهزة','إضافة الأجهزة وتعديلها وأنواعها وشهاداتها.']],
  settings:[['Recipients & sites','Engineers and staff who receive devices, and work sites.'],['المستلمون والمواقع','المهندسون والموظفون المستلمون للأجهزة ومواقع العمل.']]
};
const sfEquipmentT=(en,ar)=>sfUiLanguage==='ar'?ar:en;
const sfEquipmentCanRecord=()=>['admin','storekeeper'].includes(sfUnifiedAccess?.equipment);

sfUnifiedAllowed=function(route){
  if(!sfEquipmentIsRoute(route))return sfEquipmentBaseAllowed(route);
  return sfEquipmentAccess&&(route!=='devices-form'||sfEquipmentCanRecord());
};

async function sfEquipmentCheckAccess(){
  sfEquipmentAccess=false;
  try{const {data,error}=await sfDb.rpc('eq_is_member');sfEquipmentAccess=!error&&data===true}catch(error){console.warn('Equipment access check skipped',error)}
  sfEquipmentChecked=true;sfUnifiedApplyAccess();
  if(sfEquipmentWanted&&sfUnifiedAllowed(sfEquipmentWanted))showTab(sfEquipmentWanted);
  sfEquipmentWanted='';
}
function sfEquipmentStyles(){
  if(document.getElementById('sf-equipment-style'))return;
  const s=document.createElement('style');s.id='sf-equipment-style';
  s.textContent=`#sf-equipment-frame{width:100%;height:600px;border:0;display:block;background:transparent}
.sf-eq-tools{display:flex;align-items:center;gap:8px}
.sf-eq-tools[hidden],body:not([data-module^="devices"]) .sf-eq-tools{display:none!important}
.sf-eq-chip{font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;background:#EEF1F7;color:var(--sf-navy);white-space:nowrap}
.sf-eq-chip.warn{background:#FFF3CD;color:#856404}.sf-eq-chip.bad{background:#FDECEC;color:var(--sf-alert-text)}
.sf-eq-refresh{font-family:inherit;font-size:13px;font-weight:600;padding:8px 12px;border-radius:10px;border:1px solid var(--sf-line);background:#fff;color:var(--sf-navy);cursor:pointer;white-space:nowrap}
.sf-eq-refresh:hover{border-color:var(--sf-navy)}
html.sf-eq-modal,html.sf-eq-modal body{overflow:hidden}
html.sf-eq-modal body::before{content:'';position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000}
html.sf-eq-modal #sf-equipment-frame{position:relative;z-index:1001}
@media(max-width:1180px){.sf-eq-chip{display:none!important}}
@media(max-width:760px){.sf-eq-refresh span{display:none}.sf-eq-refresh{padding:8px 11px}}`;
  document.head.appendChild(s);
}
// Refresh button and the sync / record-count badges of the equipment page, next to the page title.
function sfEquipmentTools(show){
  let box=document.getElementById('sf-eq-tools');
  if(!box&&show){
    const actions=document.querySelector('.command-actions');if(!actions)return;
    box=document.createElement('div');box.id='sf-eq-tools';box.className='sf-eq-tools';
    box.innerHTML='<span class="sf-eq-chip" id="sf-eq-sync"></span><span class="sf-eq-chip count" id="sf-eq-count"></span><button type="button" class="sf-eq-refresh" id="sf-eq-refresh"></button>';
    actions.prepend(box);
    document.getElementById('sf-eq-refresh').onclick=()=>{const d=document.getElementById('sf-equipment-frame')?.contentDocument;d?.querySelector('.hdr-actions button[onclick^="syncAllData"]')?.click()};
  }
  if(box)box.hidden=!show;
  if(show)sfEquipmentCopyStatus();
}
function sfEquipmentCopyStatus(){
  const d=document.getElementById('sf-equipment-frame')?.contentDocument,sync=d?.getElementById('sync-badge'),count=d?.getElementById('total-lbl');
  const syncEl=document.getElementById('sf-eq-sync'),countEl=document.getElementById('sf-eq-count'),refresh=document.getElementById('sf-eq-refresh');
  if(refresh){refresh.innerHTML='↻ <span>'+sfEquipmentT('Refresh','تحديث')+'</span>';refresh.title=sfEquipmentT('Refresh the equipment data','تحديث بيانات الأجهزة')}
  if(syncEl){const text=sync?.textContent?.trim()||'';syncEl.textContent=text;syncEl.hidden=!text;
    const bg=sync?String(sync.style.background||''):'';syncEl.className='sf-eq-chip'+(/F8D7DA|248, 215, 218/i.test(bg)?' bad':/FFF3CD|255, 243, 205/i.test(bg)?' warn':'')}
  if(countEl){const text=count?.textContent?.trim()||'';countEl.textContent=text;countEl.hidden=!text}
}
let sfEquipmentObserver=null;
function sfEquipmentWatchStatus(){
  sfEquipmentObserver?.disconnect();
  const d=document.getElementById('sf-equipment-frame')?.contentDocument;if(!d||typeof MutationObserver!=='function')return;
  sfEquipmentObserver=new MutationObserver(sfEquipmentCopyStatus);
  for(const id of ['sync-badge','total-lbl']){const el=d.getElementById(id);if(el)sfEquipmentObserver.observe(el,{childList:true,characterData:true,subtree:true,attributes:true})}
}
// The frame tells us its content height; the main page scrolls, never the frame.
function sfEquipmentResize(frameWindow,height){
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame||frameWindow!==frame.contentWindow||!Number.isFinite(height))return;
  frame.style.height=Math.max(420,Math.min(20000,Math.ceil(height)))+'px';
  sfEquipmentViewport();
}
// The part of the frame on screen (below the sticky page header), so windows and messages open there.
function sfEquipmentViewport(){
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame||document.getElementById('sf-equipment-panel')?.hidden||!frame.contentWindow?.eqViewport)return;
  // While a window is open the frame sits above the whole page, so the window centres on the full screen.
  const rect=frame.getBoundingClientRect(),modal=document.documentElement.classList.contains('sf-eq-modal'),bar=modal?null:document.querySelector('.page-command-bar')?.getBoundingClientRect?.();
  const top=Math.max(0,Math.min(window.innerHeight,bar&&getComputedStyle(document.querySelector('.page-command-bar')).position==='sticky'?bar.bottom:0));
  const from=Math.max(rect.top,top),to=Math.min(rect.bottom,window.innerHeight);
  frame.contentWindow.eqViewport(from-rect.top,Math.max(0,to-from));
}
// A window inside the equipment page opened or closed: dim the whole screen, keep the page still, centre the window.
function sfEquipmentModal(frameWindow,open){
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame||frameWindow!==frame.contentWindow)return;
  document.documentElement.classList.toggle('sf-eq-modal',!!open&&!document.getElementById('sf-equipment-panel')?.hidden);
  sfEquipmentViewport();
}
window.addEventListener('scroll',sfEquipmentViewport,{passive:true});window.addEventListener('resize',sfEquipmentViewport);
// A link inside the equipment page moved to another section (e.g. a dashboard card): follow it in the menu and address.
function sfEquipmentTabChanged(frameWindow,tab){
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame||frameWindow!==frame.contentWindow||!SF_EQUIPMENT_ROUTE[tab]||sfEquipmentTab===tab)return;
  sfEquipmentTab=tab;sfEquipmentMark(SF_EQUIPMENT_ROUTE[tab]);window.scrollTo({top:0,behavior:'smooth'});
}
function sfEquipmentTitle(){
  const title=SF_EQUIPMENT_TITLE[sfEquipmentTab][sfUiLanguage==='ar'?1:0];
  document.getElementById('app-page-title').textContent=title[0];document.getElementById('app-page-subtitle').textContent=title[1];
}
function sfEquipmentMark(route){
  sfUnifiedRoute=route;sfUnifiedDesired=route;document.body.dataset.module=route;
  document.querySelectorAll('.side-nav-btn[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===route));
  sfEquipmentTitle();sfEquipmentPrimary();
  history.replaceState(null,'','#'+route);localStorage.setItem('sfLastModule',route);sfUnifiedApplyAccess();
}
// Main button of the page header: record a movement (for those who may), from every other equipment section.
function sfEquipmentPrimary(){
  const primary=document.getElementById('command-primary-action');if(!primary)return;
  if(!sfEquipmentCanRecord()||sfEquipmentTab==='form'){primary.hidden=true;return}
  primary.hidden=false;primary.textContent='+ '+sfEquipmentT('Record movement','تسجيل حركة');primary.onclick=()=>showTab('devices-form');
}
function sfEquipmentOpenTab(){
  const frame=document.getElementById('sf-equipment-frame');
  if(sfEquipmentFrameReady&&typeof frame?.contentWindow?.goTab==='function'){
    if(frame.contentWindow.eqActiveTab?.()!==sfEquipmentTab)frame.contentWindow.goTab(sfEquipmentTab);
  }
}
function sfEquipmentHide(){const panel=document.getElementById('sf-equipment-panel');if(panel)panel.hidden=true;sfEquipmentTools(false);document.documentElement.classList?.remove('sf-eq-modal')}
function sfEquipmentClear(){sfEquipmentHide();sfEquipmentObserver?.disconnect();sfEquipmentFrameReady=false;const frame=document.getElementById('sf-equipment-frame');if(frame)frame.removeAttribute('src')}

showTab=function(name,button){
  if(!sfEquipmentIsRoute(name)){sfEquipmentHide();return sfEquipmentBaseShow(name,button)}
  if(!sfAuthReady||!sfEquipmentChecked){sfEquipmentWanted=name;return}
  if(!sfUnifiedAllowed(name))return sfEquipmentAccess?showTab('devices'):sfEquipmentBaseShow(sfUnifiedHome());
  sfEquipmentStyles();
  for(const tab of sfUnifiedNativeTabs){const el=document.getElementById('tab-'+tab);if(el)el.style.display='none'}
  for(const id of ['sf-unified-panel','sf-documents-panel','sf-users-panel']){const el=document.getElementById(id);if(el)el.hidden=true}
  document.getElementById('sf-equipment-panel').hidden=false;
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  sfEquipmentTab=SF_EQUIPMENT_SECTIONS[name];sfEquipmentMark(name);sfEquipmentTools(true);
  const frame=document.getElementById('sf-equipment-frame');
  if(!frame.getAttribute('src')){
    sfEquipmentFrameReady=false;
    frame.onload=()=>{sfEquipmentFrameReady=true;sfEquipmentOpenTab();sfEquipmentWatchStatus();sfEquipmentCopyStatus();sfEquipmentViewport()};
    frame.src='equipment-module.html?v=20261027-sidebar5&lang='+(sfUiLanguage==='ar'?'ar':'en');
  }else sfEquipmentOpenTab();
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});
};
sfUnlockApp=function(user){sfEquipmentChecked=false;sfEquipmentBaseUnlock(user);void sfEquipmentCheckAccess()};
sfLockApp=function(clear){sfEquipmentAccess=false;sfEquipmentChecked=false;sfEquipmentClear();sfEquipmentBaseLock(clear)};
sfSetInterfaceLanguage=function(lang,persist=true){
  sfEquipmentBaseLanguage(lang,persist);
  document.getElementById('sf-equipment-frame')?.contentWindow?.eqSetLanguage?.(lang==='ar'?'ar':'en');
  if(sfEquipmentIsRoute(sfUnifiedRoute)&&!document.getElementById('sf-equipment-panel').hidden){sfEquipmentTitle();sfEquipmentPrimary();sfEquipmentCopyStatus()}
};

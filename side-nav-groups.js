'use strict';
// Sidebar groups. When an account sees a long menu (the administrator, a commercial account with equipment), each
// heading opens and closes its group; going to a page opens its group, and the open groups are remembered.
// Accounts with a short menu (engineers, the accountant, an equipment-only storekeeper) keep the plain list.
const SF_NAV_FOLD_FROM=11; // visible menu items from which the groups fold
let sfNavOpen=(()=>{try{const v=JSON.parse(localStorage.getItem('sfNavOpenGroups')||'[]');return Array.isArray(v)?v:[]}catch{return []}})();
let sfNavActiveGroup='';
const sfNavVisible=b=>b.style.display!=='none'&&!b.hidden;
function sfNavGroups(){
  const groups=[];
  for(const label of document.querySelectorAll('.side-nav .side-nav-label[data-group]')){
    const buttons=[];let el=label.nextElementSibling;
    while(el&&!el.classList.contains('side-nav-label')){if(el.classList.contains('side-nav-btn'))buttons.push(el);el=el.nextElementSibling}
    groups.push({key:label.dataset.group,label,buttons});
  }
  return groups;
}
function sfNavSave(){try{localStorage.setItem('sfNavOpenGroups',JSON.stringify(sfNavOpen))}catch{}}
function sfNavStyles(){
  if(document.getElementById('sf-nav-groups-style'))return;
  const s=document.createElement('style');s.id='sf-nav-groups-style';
  s.textContent=`.side-nav-btn[data-folded]{display:none!important}
.side-nav-folding .side-nav-label{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding:10px 10px 8px;border-radius:8px;font-size:10.5px;color:rgba(255,255,255,.62);user-select:none;transition:background .15s,color .15s}
.side-nav-folding .side-nav-label:hover,.side-nav-folding .side-nav-label:focus-visible{background:rgba(255,255,255,.06);color:#fff;outline:none}
.side-nav-folding .side-nav-label::after{content:'▾';font-size:12px;line-height:1;transition:transform .2s;opacity:.8}
.side-nav-folding .side-nav-label[aria-expanded="false"]::after{transform:rotate(-90deg)}
html[dir="rtl"] .side-nav-folding .side-nav-label[aria-expanded="false"]::after{transform:rotate(90deg)}
.side-nav-folding .side-nav-label.has-active{color:#fdba74}`;
  document.head.appendChild(s);
}
function sfNavApply(){
  const nav=document.querySelector('.side-nav');if(!nav)return;
  sfNavStyles();
  const groups=sfNavGroups(),count=groups.reduce((n,g)=>n+g.buttons.filter(sfNavVisible).length,0),fold=count>=SF_NAV_FOLD_FROM;
  nav.classList.toggle('side-nav-folding',fold);
  // Arriving on a page of another group opens that group (it can still be closed by hand).
  // (Only the page really open: before sign-in finishes, the Dashboard item is marked by default.)
  const route=typeof sfUnifiedRoute==='string'&&sfUnifiedRoute?sfUnifiedRoute:document.body?.dataset?.module||'';
  const active=groups.find(g=>g.buttons.some(b=>b.classList.contains('active')&&sfNavVisible(b)&&b.dataset.module===route));
  if(active&&active.key!==sfNavActiveGroup){sfNavActiveGroup=active.key;if(!sfNavOpen.includes(active.key)){sfNavOpen=[...sfNavOpen,active.key];sfNavSave()}}
  for(const g of groups){
    const open=!fold||sfNavOpen.includes(g.key);
    if(fold){g.label.setAttribute('role','button');g.label.tabIndex=0;g.label.setAttribute('aria-expanded',String(open))}
    else{g.label.removeAttribute('role');g.label.removeAttribute('tabindex');g.label.removeAttribute('aria-expanded')}
    g.label.classList.toggle('has-active',fold&&!open&&g===active);
    for(const b of g.buttons)b.toggleAttribute('data-folded',fold&&!open);
  }
}
function sfNavToggle(label){
  const key=label.dataset.group;
  sfNavOpen=sfNavOpen.includes(key)?sfNavOpen.filter(k=>k!==key):[...sfNavOpen,key];sfNavSave();sfNavApply();
}
// Runs whenever the menu is redrawn for the account or the page changes (after the group headings are updated).
const sfNavBaseRefresh=sfUnifiedRefreshNavGroups;
sfUnifiedRefreshNavGroups=function(){sfNavBaseRefresh();sfNavApply()};
document.addEventListener('click',e=>{const label=e.target.closest?.('.side-nav-folding .side-nav-label[data-group]');if(label)sfNavToggle(label)});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const label=e.target.closest?.('.side-nav-folding .side-nav-label[data-group]');if(label){e.preventDefault();sfNavToggle(label)}});

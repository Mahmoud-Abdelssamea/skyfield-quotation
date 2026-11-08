// Show / hide password (8 Nov 2026): every password box on the page gets an eye button at its end. It shows the typed
// characters while pressed, hides them again on a second press, and always hides them before the form is sent so the
// browser's password manager sees a password field. Works for boxes added later (dialogs, account forms) too.
(function(){
  if(window.sfPasswordEye)return;
  const ar=()=>{const l=String(window.sfUiLanguage||document.documentElement.lang||'').toLowerCase();return l.startsWith('ar')};
  const label=shown=>shown?(ar()?'إخفاء كلمة المرور':'Hide password'):(ar()?'إظهار كلمة المرور':'Show password');
  const eye='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const shut='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
  const css=`.sf-pw-wrap{position:relative;display:block}.sf-pw-wrap>input{width:100%;box-sizing:border-box;padding-inline-end:42px!important}
.sf-pw-eye{position:absolute;inset-inline-end:4px;top:50%;transform:translateY(-50%);width:34px;height:34px;display:grid;place-items:center;border:0;background:transparent;color:#667085;cursor:pointer;border-radius:8px;padding:0;margin:0;transition:color .15s ease,background-color .15s ease}
.sf-pw-eye:hover{color:#1A1A2E;background:rgba(16,24,40,.06)}.sf-pw-eye:focus-visible{outline:2px solid #E8650A;outline-offset:1px}.sf-pw-eye:active{transform:translateY(-50%) scale(.94)}
@media (prefers-reduced-motion:reduce){.sf-pw-eye{transition:none}.sf-pw-eye:active{transform:translateY(-50%)}}`;
  function style(){if(document.getElementById('sf-pw-style'))return;const s=document.createElement('style');s.id='sf-pw-style';s.textContent=css;(document.head||document.documentElement).appendChild(s)}
  function set(btn,input,shown){input.type=shown?'text':'password';btn.innerHTML=shown?shut:eye;btn.setAttribute('aria-pressed',shown?'true':'false');btn.setAttribute('aria-label',label(shown));btn.title=label(shown)}
  function add(input){
    if(!input||input.dataset.sfPwEye||input.type!=='password'||!input.parentNode)return;
    input.dataset.sfPwEye='1';style();
    const wrap=document.createElement('span');wrap.className='sf-pw-wrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const btn=document.createElement('button');btn.type='button';btn.className='sf-pw-eye';btn.setAttribute('translate','no');set(btn,input,false);
    // Keep the cursor in the box when the button is pressed.
    btn.addEventListener('mousedown',e=>e.preventDefault());
    btn.addEventListener('click',()=>{set(btn,input,input.type==='password');input.focus({preventScroll:true})});
    // The page language can change after the button is made: refresh its name when it is reached.
    const relabel=()=>{const n=label(input.type==='text');btn.setAttribute('aria-label',n);btn.title=n};
    btn.addEventListener('pointerenter',relabel);btn.addEventListener('focus',relabel);
    wrap.appendChild(btn);
    const form=input.form;if(form&&!form.dataset.sfPwHide){form.dataset.sfPwHide='1';form.addEventListener('submit',()=>{for(const b of form.querySelectorAll('.sf-pw-eye')){const i=b.previousElementSibling;if(i&&i.type==='text')set(b,i,false)}},true)}
  }
  function scan(root){if(!root||!root.querySelectorAll)return;if(root.matches&&root.matches('input[type="password"]'))add(root);for(const i of root.querySelectorAll('input[type="password"]'))add(i)}
  window.sfPasswordEye={scan,add};
  const start=()=>{scan(document.body);new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)if(n.nodeType===1)scan(n)}).observe(document.body,{childList:true,subtree:true})};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();

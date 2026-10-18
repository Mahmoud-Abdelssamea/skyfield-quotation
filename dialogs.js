// SKY FIELD — in-page dialogs replacing the browser's text prompts.
// sfAskPayment: amount, date (date picker, checked), reference and method in one form.
// sfAskChoice:  pick one item from a list (a project, a quotation) instead of typing its number.
// Both return a Promise: the entered values, or null when cancelled.
(function(){
const ar=()=>typeof sfUiLanguage!=='undefined'&&sfUiLanguage==='ar';
const L=(en,a)=>ar()?a:en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
function openDialog(html,onReady){
 return new Promise(resolve=>{
  const dlg=document.createElement('dialog');dlg.className='sf-dialog';dlg.dir=ar()?'rtl':'ltr';dlg.innerHTML=html;document.body.appendChild(dlg);
  let done=false;const finish=v=>{if(done)return;done=true;try{dlg.close()}catch(_){}dlg.remove();resolve(v)};
  dlg.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
  dlg.querySelectorAll('[data-dlg-cancel]').forEach(b=>b.onclick=()=>finish(null));
  onReady(dlg,finish);
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
 });
}
window.sfAskPayment=function({remaining,title,defaultMethod='Bank Transfer'}={}){
 const max=Math.max(0,Number(remaining)||0),money=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const methods=[['Bank Transfer',L('Bank Transfer','تحويل بنكي')],['Cash',L('Cash','نقدًا')],['Cheque',L('Cheque','شيك')],['Card',L('Card','بطاقة')],['Other',L('Other','أخرى')]];
 return openDialog(`<form method="dialog" class="sf-dialog-form" novalidate>
  <h3>${esc(title||L('Record payment received','تسجيل دفعة مستلمة'))}</h3>
  <p class="sf-dialog-note">${esc(L(`Remaining on this invoice: SAR ${money(max)}`,`المتبقي على هذه الفاتورة: ${money(max)} ريال`))}</p>
  <label>${esc(L('Amount received (SAR)','المبلغ المستلم (ريال)'))}<input name="amount" type="number" min="0.01" step="0.01" max="${max.toFixed(2)}" value="${max.toFixed(2)}" required></label>
  <label>${esc(L('Date received','تاريخ الاستلام'))}<input name="date" type="date" max="${todayISO()}" value="${todayISO()}" required></label>
  <label>${esc(L('Transfer / receipt reference (optional)','مرجع التحويل أو الإيصال (اختياري)'))}<input name="reference" type="text" maxlength="120" autocomplete="off"></label>
  <label>${esc(L('Payment method','طريقة الدفع'))}<select name="method">${methods.map(([v,t])=>`<option value="${esc(v)}" ${v===defaultMethod?'selected':''}>${esc(t)}</option>`).join('')}</select></label>
  <p class="sf-dialog-error" role="alert" hidden></p>
  <div class="sf-dialog-actions"><button type="button" class="btn-outline" data-dlg-cancel>${esc(L('Cancel','إلغاء'))}</button><button type="submit" class="btn-primary">${esc(L('Save payment','حفظ الدفعة'))}</button></div>
 </form>`,(dlg,finish)=>{
  const f=dlg.querySelector('form'),err=dlg.querySelector('.sf-dialog-error');
  const fail=(msg,field)=>{err.textContent=msg;err.hidden=false;f.elements[field]?.focus()};
  f.onsubmit=e=>{
   e.preventDefault();
   const amount=Math.round((parseFloat(f.elements.amount.value)||0)*100)/100,date=f.elements.date.value;
   if(!(amount>0))return fail(L('Enter an amount greater than zero.','أدخل مبلغًا أكبر من صفر.'),'amount');
   if(amount>max+0.005)return fail(L(`The amount cannot exceed the remaining SAR ${money(max)}.`,`لا يمكن أن يتجاوز المبلغ المتبقي ${money(max)} ريال.`),'amount');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00')))return fail(L('Choose the date the payment was received.','اختر تاريخ استلام الدفعة.'),'date');
   if(date>todayISO())return fail(L('The date received cannot be in the future.','لا يمكن أن يكون تاريخ الاستلام في المستقبل.'),'date');
   finish({amount,date,reference:f.elements.reference.value.trim(),method:f.elements.method.value});
  };
  setTimeout(()=>{f.elements.amount.focus();f.elements.amount.select()},30);
 });
};
window.sfAskChoice=function({title,items,hint}={}){
 return openDialog(`<div class="sf-dialog-form">
  <h3>${esc(title||L('Choose','اختر'))}</h3>${hint?`<p class="sf-dialog-note">${esc(hint)}</p>`:''}
  ${(items||[]).length>6?`<input type="search" class="sf-dialog-search" placeholder="${esc(L('Search…','بحث…'))}">`:''}
  <div class="sf-dialog-list">${(items||[]).map((it,i)=>`<button type="button" class="sf-dialog-item" data-i="${i}"><strong>${esc(it.label)}</strong>${it.sub?`<small>${esc(it.sub)}</small>`:''}</button>`).join('')}</div>
  <div class="sf-dialog-actions"><button type="button" class="btn-outline" data-dlg-cancel>${esc(L('Cancel','إلغاء'))}</button></div>
 </div>`,(dlg,finish)=>{
  dlg.querySelectorAll('.sf-dialog-item').forEach(b=>b.onclick=()=>finish(Number(b.dataset.i)));
  const s=dlg.querySelector('.sf-dialog-search');
  if(s){s.oninput=()=>{const t=s.value.trim().toLowerCase();dlg.querySelectorAll('.sf-dialog-item').forEach(b=>b.hidden=!!t&&!b.textContent.toLowerCase().includes(t))};setTimeout(()=>s.focus(),30)}
 });
};
})();

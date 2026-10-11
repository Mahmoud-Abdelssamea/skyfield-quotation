async function sfSyncDailyModule(){
 if(!sfHasAccess('payroll')){alert('هذه العملية للإدارة فقط');return;}
 try{
  const {data:member,error:memberError}=await sfDb.from('sf_daily_members').select('role').eq('user_id',sfCurrentUser.id).maybeSingle();
  if(memberError)throw memberError;if(member?.role!=='admin')throw Error('يجب تفعيل صلاحية إدارة الحضور لهذا الحساب');
  if(projects.length){const {error}=await sfDb.from('sf_daily_projects').upsert(projects.map(p=>({id:String(p.id),name:p.name||String(p.id)})));if(error)throw error;}
  let expenses=[];
  for(let offset=0;;offset+=500){const {data,error}=await sfDb.from('sf_daily_expenses').select('*').eq('review','approved').order('id').range(offset,offset+499);if(error)throw error;expenses.push(...data);if(data.length<500)break;}
  projects.forEach(p=>{p.actualExpenses=(p.actualExpenses||[]).filter(e=>e.source!=='daily_expense');expenses.filter(e=>String(e.project_id)===String(p.id)).forEach(e=>p.actualExpenses.push({id:'daily_'+e.id,source:'daily_expense',sourceId:e.id,category:e.category,description:e.description,amount:Number(e.amount),date:e.day}));});
  saveProjects();alert('تم تحديث قائمة المشاريع وترحيل المصروفات المعتمدة دون تكرار. البدلات اليومية والأوفر تايم تظهر في تقرير الحضور؛ تُنقل للرواتب مرة واحدة بعد المراجعة، ولا تُرحّل هنا لتجنب تكرارها مع الرواتب. المصروفات العامة تظهر في تقرير الحضور فقط.');
 }catch(e){alert('لم تكتمل المزامنة: '+e.message)}
}

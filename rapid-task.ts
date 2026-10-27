import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
Deno.serve(async req=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user)return reply({error:'Unauthorized'},401);
 const {data:member,error:memberError}=await admin.from('sf_daily_members').select('role,is_active').eq('user_id',user.id).single();
 if(memberError)return reply({error:'تعذر التحقق من الصلاحيات. تأكد من تشغيل attendance-engineers-v7.sql.'},403);
 if(member?.role!=='admin'||member.is_active!==true)return reply({error:'Administrator access required'},403);
 try{
  const body=await req.json(),{engineer_id,name,password}=body;
  if(['create-account','create-staff','staff-password','set-suspended'].includes(body.action)){
   // Users & Permissions page: the system administrator only (full commercial access as well as attendance admin).
   const {data:own}=await admin.from('sf_commercial_access').select('level,active').eq('user_id',user.id).maybeSingle();
   if(own?.level!=='full'||own.active!==true)return reply({error:'Administrator access required'},403);
   const log=(target,area,old_value,new_value)=>admin.from('sf_access_log').insert({actor:user.id,target,area,old_value,new_value});
   const strong=p=>typeof p==='string'&&p.length>=8&&p.length<=128;
   // One account with any of the four roles: employee (attendance), accountant, hr (Iqama & SEC-ID), storekeeper.
   // Signs in with an employee code (employee role required, digits-only password) or with an e-mail.
   if(body.action==='create-account'){
    const roles=Array.isArray(body.roles)?[...new Set(body.roles)]:[];
    if(!roles.length||roles.some(r=>!['employee','accountant','hr','storekeeper'].includes(r)))return reply({error:'اختر دورًا واحدًا على الأقل.'},400);
    if(typeof name!=='string'||!name.trim()||name.trim().length>150)return reply({error:'الاسم مطلوب.'},400);
    let email,login;
    if(body.login==='code'){
     if(!roles.includes('employee'))return reply({error:'الدخول بالكود للموظفين فقط.'},400);
     if(typeof engineer_id!=='string'||! /^[0-9]{6,40}$/.test(engineer_id))return reply({error:'كود الموظف يجب أن يكون من 6 إلى 40 رقمًا.'},400);
     if(typeof password!=='string'||! /^[0-9]{6,}$/.test(password))return reply({error:'كلمة المرور يجب أن تكون 6 أرقام على الأقل (0–9).'},400);
     login=engineer_id;email=engineer_id+'@engineers.skyfield.invalid';
    }else{
     email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
     if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||email.endsWith('@engineers.skyfield.invalid'))return reply({error:'اكتب بريدًا إلكترونيًا صحيحًا.'},400);
     if(!strong(password))return reply({error:'كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.'},400);
     login=email;
    }
    const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(creationError)return reply({error:creationError.message},400);
    const id=created.user.id,employee=roles.includes('employee'),accountant=roles.includes('accountant'),hr=roles.includes('hr'),store=roles.includes('storekeeper');
    let failed=null,member=false;
    if(employee||accountant){
     const {error:e1}=await admin.from('sf_daily_members').insert({user_id:id,engineer_id:login,name:name.trim(),role:employee?'engineer':'accountant',can_accounting:employee&&accountant,is_active:true});
     if(e1)failed=e1;else member=true;
    }
    if(!failed&&(hr||store)){
     const {error:e2}=await admin.from('eq_roles').insert({id,full_name:name.trim(),role:store?'storekeeper':'documents',documents:hr,active:true});
     if(e2)failed=e2;
    }
    if(failed){
     if(member)await admin.from('sf_daily_members').delete().eq('user_id',id);
     await admin.auth.admin.deleteUser(id);return reply({error:failed.message},400);
    }
    await log(id,'account',null,'created:'+roles.sort().join('+'));
    return reply({user_id:id,login,roles});
   }
   if(body.action==='create-staff'){
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'',role=body.equipment_role;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||email.endsWith('@engineers.skyfield.invalid')||typeof name!=='string'||!name.trim()||name.trim().length>150)
     return reply({error:'الاسم وبريد إلكتروني صالح مطلوبان.'},400);
    if(!['storekeeper','viewer','documents'].includes(role))return reply({error:'اختر صلاحية الأجهزة.'},400);
    if(!strong(password))return reply({error:'كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.'},400);
    const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(creationError)return reply({error:creationError.message},400);
    const {error:linkError}=await admin.from('eq_roles').insert({id:created.user.id,full_name:name.trim(),role,active:true});
    if(linkError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:linkError.message},400)}
    await log(created.user.id,'account',null,'created:'+role);
    return reply({user_id:created.user.id,email,equipment_role:role});
   }
   if(typeof body.user_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id))return reply({error:'Invalid account'},400);
   if(body.user_id===user.id)return reply({error:'لا يمكن تغيير حسابك من هنا.'},400);
   const {data:target}=await admin.from('sf_commercial_access').select('level,active').eq('user_id',body.user_id).maybeSingle();
   if(target?.level==='full'&&target.active===true)return reply({error:'حساب مدير النظام محمي.'},400);
   const {data:found,error:findError}=await admin.auth.admin.getUserById(body.user_id);
   if(findError||!found?.user)return reply({error:'الحساب غير موجود.'},400);
   if(body.action==='staff-password'){
    // Engineer code accounts keep their digits-only password (action 'password').
    if(String(found.user.email||'').toLowerCase().endsWith('@engineers.skyfield.invalid'))return reply({error:'استخدم تغيير كلمة مرور المهندس.'},400);
    if(!strong(password))return reply({error:'كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا.'},400);
    const {error:updateError}=await admin.auth.admin.updateUserById(body.user_id,{password});
    if(updateError)return reply({error:updateError.message},400);
    await log(body.user_id,'password',null,null);
    return reply({updated:true});
   }
   // Suspension blocks sign-in and session renewal; roles and data stay as they are, so lifting it restores the account.
   if(typeof body.suspended!=='boolean')return reply({error:'Invalid request'},400);
   const {error:banError}=await admin.auth.admin.updateUserById(body.user_id,{ban_duration:body.suspended?'876000h':'none'});
   if(banError)return reply({error:banError.message},400);
   await log(body.user_id,'suspended',String(!body.suspended),String(body.suspended));
   return reply({suspended:body.suspended});
  }
  if(body.action==='disable-accountant'){
   if(typeof body.user_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id))return reply({error:'Invalid accountant account'},400);
   const {data:disabled,error:disableError}=await admin.from('sf_daily_members').update({is_active:false,archived_at:new Date().toISOString(),archived_by:user.id})
    .eq('user_id',body.user_id).eq('role','accountant').eq('is_active',true).select('user_id').maybeSingle();
   if(disableError||!disabled)return reply({error:disableError?.message||'Active accountant not found'},400);
   return reply({disabled:true});
  }
  if(body.action==='create-accountant'){
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof name!=='string'||!name.trim()||name.trim().length>150)
    return reply({error:'اسم المحاسب وبريد إلكتروني صالح مطلوبان.'},400);
   if(typeof password!=='string'||password.length<8||password.length>128)return reply({error:'كلمة مرور المحاسب يجب أن تكون من 8 إلى 128 حرفًا.'},400);
   const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
   if(creationError)return reply({error:creationError.message},400);
   const {error:linkError}=await admin.from('sf_daily_members').insert({user_id:created.user.id,engineer_id:email,name:name.trim(),role:'accountant',is_active:true});
   if(linkError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:linkError.message},400)}
   return reply({user_id:created.user.id,email,role:'accountant'});
  }
  if(typeof password!=='string'||! /^[0-9]{6,}$/.test(password))return reply({error:'كلمة المرور يجب أن تكون 6 أرقام على الأقل (0–9).'},400);
  if(body.action==='password'){
   if(typeof body.user_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id))return reply({error:'Invalid engineer account'},400);
   const {data:target,error:targetError}=await admin.from('sf_daily_members').select('role,is_active').eq('user_id',body.user_id).single();
   if(targetError||target?.role!=='engineer'||target.is_active!==true)return reply({error:'اختر مهندسًا نشطًا.'},400);
   const {error:updateError}=await admin.auth.admin.updateUserById(body.user_id,{password});
   if(updateError)return reply({error:updateError.message},400);
   return reply({updated:true});
  }
  if(body.action&&body.action!=='create')return reply({error:'Unknown action'},400);
  if(typeof engineer_id!=='string'||! /^[0-9]{6,40}$/.test(engineer_id)||typeof name!=='string'||!name.trim())return reply({error:'كود الموظف يجب أن يكون من 6 إلى 40 رقمًا والاسم مطلوب'},400);
  const code=engineer_id.toLowerCase();
  const {data:created,error:creationError}=await admin.auth.admin.createUser({email:code+'@engineers.skyfield.invalid',password,email_confirm:true});
  if(creationError)return reply({error:creationError.message},400);
  const {error:linkError}=await admin.from('sf_daily_members').insert({user_id:created.user.id,engineer_id:code,name:name.trim(),role:'engineer',is_active:true});
  if(linkError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:linkError.message},400)}
  return reply({user_id:created.user.id,engineer_id:code});
 }catch{return reply({error:'Unable to process engineer account'},400)}
});

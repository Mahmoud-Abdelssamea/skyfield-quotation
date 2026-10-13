import {createClient} from 'npm:@supabase/supabase-js@2';
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
  if(typeof password!=='string'||! /^[0-9]{10}$/.test(password))return reply({error:'كلمة المرور يجب أن تكون 10 أرقام بالضبط (0–9).'},400);
  if(body.action==='password'){
   if(typeof body.user_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id))return reply({error:'Invalid engineer account'},400);
   const {data:target,error:targetError}=await admin.from('sf_daily_members').select('role,is_active').eq('user_id',body.user_id).single();
   if(targetError||target?.role!=='engineer'||target.is_active!==true)return reply({error:'اختر مهندسًا نشطًا.'},400);
   const {error:updateError}=await admin.auth.admin.updateUserById(body.user_id,{password});
   if(updateError)return reply({error:updateError.message},400);
   return reply({updated:true});
  }
  if(body.action&&body.action!=='create')return reply({error:'Unknown action'},400);
  if(typeof engineer_id!=='string'||! /^[A-Za-z0-9_-]{1,40}$/.test(engineer_id)||typeof name!=='string'||!name.trim())return reply({error:'Invalid employee code or name'},400);
  const code=engineer_id.toLowerCase();
  const {data:created,error:creationError}=await admin.auth.admin.createUser({email:code+'@engineers.skyfield.invalid',password,email_confirm:true});
  if(creationError)return reply({error:creationError.message},400);
  const {error:linkError}=await admin.from('sf_daily_members').insert({user_id:created.user.id,engineer_id:code,name:name.trim(),role:'engineer',is_active:true});
  if(linkError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:linkError.message},400)}
  return reply({user_id:created.user.id,engineer_id:code});
 }catch{return reply({error:'Unable to process engineer account'},400)}
});

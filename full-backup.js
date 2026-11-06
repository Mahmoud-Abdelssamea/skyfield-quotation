'use strict';
// Full backup (administrator): every database table, the SQL that rebuilds the database, and every uploaded file, in
// one ZIP (supabase/2026-11-06-admin-backup.sql). tools/backup-restore.cjs turns the ZIP into restore.sql.
async function sfFullBackup(button){
  const T=(en,ar)=>typeof sfUiLanguage!=='undefined'&&sfUiLanguage==='ar'?ar:en;
  if(!sfDb||!sfCurrentUser)return sfNotice(T('Sign in first.','سجّل الدخول أولًا.'));
  const status=document.getElementById('full-backup-status'),say=t=>{if(status)status.textContent=t};
  const rpc=async(name,args)=>{const {data,error}=await sfDb.rpc(name,args);if(error)throw error;return data};
  if(button)button.disabled=true;
  try{
    say(T('Reading the list of tables…','جاري قراءة قائمة الجداول…'));
    const manifest=await rpc('sf_admin_backup_manifest'),schema=await rpc('sf_admin_backup_schema');
    const enc=v=>fflate.strToU8(JSON.stringify(v)),files={};
    let i=0;for(const t of manifest.tables){say(T(`Tables ${++i} of ${manifest.tables.length}…`,`الجداول ${i} من ${manifest.tables.length}…`));
      files[`tables/${t.schema}.${t.table}.json`]=enc(await rpc('sf_admin_backup_table',{p_schema:t.schema,p_table:t.table}))}
    // Uploaded files: documents, receipts, payment proofs, equipment certificates. One that cannot be read is listed.
    const missing=[];i=0;
    for(const f of manifest.files){say(T(`Files ${++i} of ${manifest.files.length}…`,`الملفات ${i} من ${manifest.files.length}…`));
      try{const {data,error}=await sfDb.storage.from(f.bucket).download(f.name);if(error)throw error;files[`files/${f.bucket}/${f.name}`]=new Uint8Array(await data.arrayBuffer())}
      catch(e){missing.push({...f,error:String(e?.message||e)})}}
    manifest.missing_files=missing;
    files['manifest.json']=enc(manifest);files['schema.json']=enc(schema);
    files['README.txt']=fflate.strToU8(['SkyField full backup — '+manifest.exported_at,'',
      'tables/   every database table (JSON rows); manifest.json has the row count and fingerprint of each',
      'schema.json  the SQL that rebuilds the tables, functions, triggers, policies and grants',
      'files/    every uploaded file, by bucket','',
      'Restore into an empty Supabase project:',' 1. node tools/backup-restore.cjs <this zip> > restore.sql   (in the SkyField_Accounting folder)',
      ' 2. run restore.sql in the new project (SQL editor or psql)',' 3. create the buckets and upload files/<bucket>/… to them',
      ' 4. deploy the edge functions and scheduled jobs from the repository (supabase/)',' 5. people set a new password with "Forgot password"'].join('\r\n'));
    say(T('Compressing…','جاري الضغط…'));
    const zip=await new Promise((ok,fail)=>fflate.zip(files,{level:6},(e,out)=>e?fail(e):ok(out)));
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));
    a.href=url;a.download=`SkyField_FullBackup_${new Date().toISOString().slice(0,10)}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
    const rows=manifest.tables.reduce((s,t)=>s+Number(t.rows),0),mb=(zip.length/1048576).toFixed(1);
    say(T(`Done: ${manifest.tables.length} tables, ${rows} rows, ${manifest.files.length-missing.length} files, ${mb} MB.`,`تم: ${manifest.tables.length} جدول، ${rows} سطر، ${manifest.files.length-missing.length} ملف، ${mb} ميجابايت.`));
    if(missing.length)sfNotice(T(`${missing.length} file(s) could not be read and are listed in manifest.json (missing_files).`,`تعذرت قراءة ${missing.length} ملف، وهي مذكورة في manifest.json (missing_files).`));
  }catch(error){say('');sfNotice(String(error?.message||error).includes('ACCESS_DENIED')?T('Only the administrator can take a full backup.','النسخة الكاملة للأدمن فقط.'):T('The backup failed: ','تعذر أخذ النسخة: ')+(error?.message||error))}
  finally{if(button)button.disabled=false}
}
// Shown to the attendance administrator only (the database checks again).
function sfFullBackupAccess(){const b=document.getElementById('full-backup-btn');if(b)b.hidden=!(typeof sfUnifiedProfile!=='undefined'&&sfUnifiedProfile?.role==='admin')}
const sfFullBackupBaseToggle=toggleBackupTools;
toggleBackupTools=function(){sfFullBackupAccess();return sfFullBackupBaseToggle.apply(this,arguments)};

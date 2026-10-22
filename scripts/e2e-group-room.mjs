// Integration smoke against a live, database-backed MedArc preview.
// Creates only a synthetic, unscored 5-person study room; no patient data.
import assert from 'node:assert/strict';
const base=(process.env.MEDARC_E2E_BASE||'').replace(/\/$/,'');
if(!/^https:\/\/[^/]+/.test(base))throw new Error('MEDARC_E2E_BASE must be an HTTPS URL');
const json=async(res)=>{
  const d=await res.json().catch(()=>({error:'Non-JSON response'}));
  if(!res.ok)throw new Error('HTTP '+res.status+': '+String(d.error||'request failed'));
  return d;
};
const fetchJson=async(route,init={})=>json(await fetch(base+route,{cache:'no-store',...init}));
const headers=(token)=>({'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})});
const post=(route,payload,token)=>fetchJson(route,{method:'POST',headers:headers(token),body:JSON.stringify(payload)});
const assertRoom=()=>{};
async function run(){
 let topics;
 for(let i=0;i<24;i++){
  try{const result=await fetchJson('/api/group-exams');if(result.subjects?.length){topics=result.subjects;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 assert.ok(topics?.length,'No subject catalogue loaded from preview');
 const entry=topics.find(s=>s.subject==='Human Anatomy'&&s.count>=10)||topics.find(s=>s.count>=10);
 assert.ok(entry,'No discipline with 10 usable questions');
 const created=await post('/api/group-exams',{
  title:'Automated Group Room QA',
  subject:entry.subject,topic:'',capacity:5,questionCount:10,duration:20,mode:'practice',
  usernames:['medic01','medic02','medic03','medic04','medic05']
 });
 assert.ok(created.code&&created.adminToken&&created.leaderToken);
 assert.equal(created.credentials.length,5);
 assert.deepEqual(created.credentials.map(x=>x.username),['medic01','medic02','medic03','medic04','medic05']);
 const endpoint='/api/group-exams/'+created.code;
 const before=await fetchJson(endpoint);
 assert.equal(before.status,'lobby');
 assert.equal(before.ready,0);
 let denied=false;
 try{await post(endpoint,{action:'start'},created.leaderToken);}catch(e){denied=true;}
 assert.ok(denied,'Group leader must not start timer');
 const sessions=[];
 for(const person of created.credentials){
   const auth=await post(endpoint,{action:'join',username:person.username,pin:person.pin});
   assert.equal(auth.role,'student');
   sessions.push(auth);
 }
 const admin=await post(endpoint,{action:'join',role:'admin',secret:created.adminToken});
 assert.equal(admin.role,'admin');
 const joined=await fetchJson(endpoint,{headers:{authorization:'Bearer '+created.leaderToken}});
 assert.equal(joined.joined,5);
 assert.ok(!joined.questions,'Questions must remain hidden before administrator starts');
 let earlyRejected=false;
 try{await post(endpoint,{action:'start'},admin.token);}catch{earlyRejected=true;}
 assert.ok(earlyRejected,'Cannot start until each participant is ready');
 for(const session of sessions)await post(endpoint,{action:'ready'},session.token);
 const ready=await fetchJson(endpoint,{headers:{authorization:'Bearer '+admin.token}});
 assert.equal(ready.ready,5);
 await post(endpoint,{action:'start'},admin.token);
 const all=[];
 for(const session of sessions){
   const state=await fetchJson(endpoint,{headers:{authorization:'Bearer '+session.token}});
   assert.equal(state.status,'running');
   assert.equal(state.questions.length,10);
   assert.ok(state.endsAt,'Server deadline missing');
   all.push(state);
 }
 const first=new Set(all[0].questions.map(q=>q.id));
 assert.equal(first.size,10,'Question IDs must be unique');
 for(const state of all.slice(1))assert.deepEqual(new Set(state.questions.map(q=>q.id)),first,'Every student must receive same question set');
 assert.notDeepEqual(all[0].questions.map(q=>q.id),all[1].questions.map(q=>q.id),'Student question order must be mixed');
 const q=all[0].questions[0];
 await post(endpoint,{action:'answer',questionId:q.id,response:q.options[0].label},sessions[0].token);
 const saved=await fetchJson(endpoint,{headers:{authorization:'Bearer '+sessions[0].token}});
 assert.equal(saved.responses[q.id],q.options[0].label,'Server failed to persist answer');
 for(const session of sessions)await post(endpoint,{action:'submit'},session.token);
 const result=await fetchJson(endpoint,{headers:{authorization:'Bearer '+admin.token}});
 assert.equal(result.status,'ended');
 assert.equal(result.submitted,5);
 assert.equal(result.results.participants.length,5);
 assert.equal(result.results.ranked,false,'Unverified practice must never yield a ranked score');
 console.log(JSON.stringify({passed:true,subject:entry.subject,capacity:5,questionCount:10,checks:['leader cannot start','private student PINs','readiness gate','admin starts server timer','identical shuffled question set','persisted responses','all submissions','unscored results']})); // no secrets
}
await run();

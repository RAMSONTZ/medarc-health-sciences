import 'server-only';
import {neon} from '@neondatabase/serverless';
import {createHash, randomBytes, randomInt, timingSafeEqual} from 'node:crypto';
import {getBank,getQuestionQualityReport} from './bank';
import {assessQuestionQuality} from './question-quality.mjs';

const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const code=()=>randomBytes(5).toString('hex').toUpperCase();
const pin=()=>randomBytes(7).toString('base64url');
const db=()=>{
  if(!process.env.MEDARC_DATABASE_URL)throw new Error('Group-examination database not configured');
  return neon(process.env.MEDARC_DATABASE_URL);
};
const query=(statement,params=[])=>db().query(statement,params);
const clean=(value,max=140)=>String(value||'').trim().slice(0,max);
const shuffle=source=>{
 const list=source.slice();
 for(let i=list.length-1;i>0;i--){const j=randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}
 return list;
};
const reviewed=question=>{
 const answer=getBank().answers?.[question.id];
 return question.keyVerified===true&&answer?.reviewStatus==='clinically_verified'&&
   Array.isArray(answer.correct)&&answer.correct.length>0;
};
function availableQuestions(subject,topic,mode){
 const bank=getBank(),excluded=getQuestionQualityReport().excluded;
 const uniqueStems=new Set();
 return bank.questions.filter(q=>{
  const d=bank.departmentById.get(q.id);
  if(excluded.has(q.id)||assessQuestionQuality(q).status!=='usable'||d.review||
     d.subject!==subject||d.subject==='Unclassified Health Sciences'||
     !d.topic||/^(Unassigned topic|Department review required)$/i.test(d.topic)||
     (topic&&d.topic!==topic)||q.options?.length<2||(mode==='scored'&&!reviewed(q)))return false;
  const normalized=String(q.stem||'').replace(/\s+/g,' ').trim().toLowerCase();
  if(uniqueStems.has(normalized))return false;
  uniqueStems.add(normalized);
  return true;
 });
}
export function groupExamSubjects(){
 const bank=getBank(),excluded=getQuestionQualityReport().excluded;
 const groups=new Map();
 for(const q of bank.questions){
  if(excluded.has(q.id)||assessQuestionQuality(q).status!=='usable'||q.options?.length<2)continue;
  const d=bank.departmentById.get(q.id);
  if(d.review||d.subject==='Unclassified Health Sciences'||!d.topic||/^(Unassigned topic|Department review required)$/i.test(d.topic))continue;
  if(!groups.has(d.subject))groups.set(d.subject,{subject:d.subject,count:0,topics:new Set()});
  const g=groups.get(d.subject);g.count++;if(d.topic)g.topics.add(d.topic);
 }
 return [...groups.values()].sort((a,b)=>a.subject.localeCompare(b.subject))
  .map(g=>({subject:g.subject,count:g.count,topics:[...g.topics].sort()}));
}
async function checkRoomCreationLimit(source){
 // Never persist the source IP or user-agent; store only a keyed one-way digest.
 const hash=digest(process.env.MEDARC_DATABASE_URL+':'+clean(source,140));
 const rows=await query(
  "INSERT INTO medarc_group_throttle(client_hash,window_started,attempts) VALUES($1,now(),1) "+
  "ON CONFLICT(client_hash) DO UPDATE SET "+
  "attempts=CASE WHEN medarc_group_throttle.window_started<now()-interval '1 hour' THEN 1 ELSE medarc_group_throttle.attempts+1 END, "+
  "window_started=CASE WHEN medarc_group_throttle.window_started<now()-interval '1 hour' THEN now() ELSE medarc_group_throttle.window_started END RETURNING attempts",
  [hash]);
 if(rows[0]?.attempts>10)throw new Error('Too many rooms created from this connection. Please try again later.');
}
export async function createGroup(input,source='unknown'){
 const title=clean(input?.title,120),subject=clean(input?.subject,120),topic=clean(input?.topic,160);
 const capacity=Number(input?.capacity),questionCount=Number(input?.questionCount),duration=Number(input?.duration);
 const mode=input?.mode==='scored'?'scored':'practice';
 if(!title||!subject||!Number.isInteger(capacity)||capacity<5||capacity>10||
 ![10,20].includes(questionCount)||!Number.isInteger(duration)||duration<10||duration>90)
 throw new Error('A title, 5–10 participants, 10 or 20 questions, and 10–90 minutes are required.');
 const approved=groupExamSubjects();
 if(!approved.some(s=>s.subject===subject&&(!topic||s.topics.includes(topic))))
 throw new Error('Unknown subject or topic.');
 const available=availableQuestions(subject,topic,mode);
 if(available.length<questionCount)throw new Error(mode==='scored'?
 'Not enough independently reviewed answer keys for a scored exam. Select group practice instead.':
 'Not enough valid questions in this subject and topic. Select a broader topic.');
 await checkRoomCreationLimit(source);
 const chosen=shuffle(available).slice(0,questionCount);
 const requested=Array.isArray(input?.usernames)?input.usernames.map(name=>clean(name,48).toLowerCase()):[];
 if(requested.length&&(requested.length!==capacity||requested.some(name=>!/^[a-z][a-z0-9_-]{2,23}$/.test(name))||new Set(requested).size!==capacity))
   throw new Error('Provide exactly one unique username per student, using 3–24 letters, numbers, underscores or hyphens.');
 const leaderToken=secret(),adminToken=secret(),examCode=code();
 const credentials=Array.from({length:capacity},(_,i)=>{
   const username=requested[i]||'student'+String(i+1).padStart(2,'0'),password=pin(),salt=randomBytes(16).toString('hex');
   return {username,pin:password,salt,pin_hash:digest(salt+':'+password)};
 });
 // One atomic PostgreSQL query creates the room, roster and frozen shared question set.
 const result=await query(
 "WITH room AS (INSERT INTO medarc_group_rooms(code,title,subject,topic,question_count,duration_minutes,capacity,mode,leader_hash,admin_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id), "+
 "students AS (INSERT INTO medarc_group_participants(room_id,username,pin_salt,pin_hash) SELECT room.id,p.username,p.salt,p.pin_hash FROM room, jsonb_to_recordset($11::jsonb) AS p(username text,salt text,pin_hash text) RETURNING id), "+
 "questions AS (INSERT INTO medarc_group_questions(room_id,question_id,ordinal) SELECT room.id,q.question_id,q.ordinal FROM room, jsonb_to_recordset($12::jsonb) AS q(question_id text,ordinal integer) RETURNING question_id) "+
 "SELECT id FROM room",
 [examCode,title,subject,topic||null,questionCount,duration,capacity,mode,digest(leaderToken),digest(adminToken),
  JSON.stringify(credentials.map(({username,salt,pin_hash})=>({username,salt,pin_hash}))),
  JSON.stringify(chosen.map((q,i)=>({question_id:q.id,ordinal:i+1})))]
 );
 if(!result.length)throw new Error('Exam creation failed.');
 return {code:examCode,title,subject,topic,capacity,questionCount,duration,mode,
  leaderToken,adminToken,credentials:credentials.map(({username,pin})=>({username,pin}))};
}
export async function loadGroup(codeValue){
 const [room]=await query(
  "SELECT id,code,title,subject,topic,question_count,duration_minutes,capacity,mode,status,leader_hash,admin_hash,starts_at,ends_at,now() AS server_now FROM medarc_group_rooms WHERE code=$1",
  [clean(codeValue,12).toUpperCase()]);
 return room||null;
}
export async function authenticate(room,request){
 const token=clean((request.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),100);
 if(!/^[a-f0-9]{64}$/i.test(token))return {role:'guest'};
 const hash=digest(token);
 if(hash===room.leader_hash)return {role:'leader'};
 if(hash===room.admin_hash)return {role:'admin'};
 const [person]=await query("SELECT id,username,ready,submitted_at FROM medarc_group_participants WHERE room_id=$1 AND session_hash=$2",[room.id,hash]);
 return person?{role:'student',participant:person}:{role:'guest'};
}
const safeEquals=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
export async function loginGroup(room,input){
 if(room.status==='ended')throw new Error('Examination already ended.');
 if(input?.role==='admin'){
  const token=clean(input?.secret,100);
  if(!/^[a-f0-9]{64}$/i.test(token)||!safeEquals(digest(token),room.admin_hash))
    throw new Error('Administrator access code invalid.');
  return {role:'admin',token};
 }
 const username=clean(input?.username,48).toLowerCase(),accessPin=clean(input?.pin,60);
 const [person]=await query("SELECT id,username,pin_salt,pin_hash FROM medarc_group_participants WHERE room_id=$1 AND lower(username)=$2",[room.id,username]);
 if(!person||!safeEquals(digest(person.pin_salt+':'+accessPin),person.pin_hash))throw new Error('Incorrect username or individual access PIN.');
 const token=secret();
 const updated=await query("UPDATE medarc_group_participants SET session_hash=$1,joined_at=COALESCE(joined_at,now()) WHERE id=$2 AND submitted_at IS NULL AND (SELECT status FROM medarc_group_rooms WHERE id=$3)<>'ended' RETURNING id",[digest(token),person.id,room.id]);
 if(!updated.length)throw new Error('This attempt has already been submitted.');
 return {role:'student',token,username:person.username};
}
async function results(room,members){
 const answers=await query("SELECT participant_id,question_id,response FROM medarc_group_answers WHERE room_id=$1",[room.id]);
 const rows=members.map(p=>{
  const mine=answers.filter(a=>a.participant_id===p.id);
  let score=null;
  if(room.mode==='scored'){
   score=0;
   for(const a of mine){
    const q=getBank().questionById.get(a.question_id);if(!q||!reviewed(q))continue;
    const key=getBank().answers[q.id].correct.map(String).sort();
    const answer=(Array.isArray(a.response)?a.response:[a.response]).map(String).sort();
    if(key.length===answer.length&&key.every((val,i)=>val===answer[i]))score++;
   }
  }
  return {username:p.username,answered:new Set(mine.map(x=>x.question_id)).size,submitted:!!p.submitted_at,score};
 });
 if(room.mode==='scored')rows.sort((a,b)=>b.score-a.score||a.username.localeCompare(b.username));
 else rows.sort((a,b)=>a.username.localeCompare(b.username));
 return {mode:room.mode,ranked:room.mode==='scored',participants:rows};
}
export async function groupState(room,identity){
 const members=await query("SELECT id,username,ready,joined_at,submitted_at FROM medarc_group_participants WHERE room_id=$1 ORDER BY username",[room.id]);
 const expired=!!room.ends_at&&new Date(room.server_now).getTime()>=new Date(room.ends_at).getTime();
 const done=members.length===room.capacity&&members.every(p=>p.submitted_at);
 const closed=room.status==='ended'||(room.status==='running'&&(expired||done));
 const data={code:room.code,title:room.title,subject:room.subject,topic:room.topic,questionCount:room.question_count,
  duration:room.duration_minutes,capacity:room.capacity,mode:room.mode,
  status:closed?'ended':room.status,startsAt:room.starts_at,endsAt:room.ends_at,
  serverNow:room.server_now,role:identity.role,username:identity.participant?.username||null,
  joined:members.filter(p=>p.joined_at).length,ready:members.filter(p=>p.ready).length,
  submitted:members.filter(p=>p.submitted_at).length,
  members:members.map(p=>({username:p.username,ready:p.ready,joined:!!p.joined_at,submitted:!!p.submitted_at}))};
 if(identity.role==='student'&&room.status==='running'&&!closed){
  const member=members.find(m=>m.id===identity.participant.id);
  if(member&&!member.submitted_at){
   const questions=await query("SELECT question_id FROM medarc_group_questions WHERE room_id=$1",[room.id]);
   const ordered=questions.sort((a,b)=>digest(member.id+':'+a.question_id).localeCompare(digest(member.id+':'+b.question_id)));
   const bank=getBank();
   data.questions=ordered.map((entry,i)=>{
    const q=bank.questionById.get(entry.question_id);
    return {id:q.id,number:i+1,stem:q.stem,type:q.type,options:q.options||[]};
   });
   const answers=await query("SELECT question_id,response FROM medarc_group_answers WHERE participant_id=$1",[member.id]);
   data.responses=Object.fromEntries(answers.map(a=>[a.question_id,a.response]));
  }
 }
 if(closed&&identity.role!=='guest')data.results=await results(room,members);
 return data;
}
export async function groupAction(room,identity,input){
 const action=clean(input?.action,24);
 if(action==='ready'){
  if(identity.role!=='student')throw new Error('Only students can mark Ready.');
  const rows=await query("UPDATE medarc_group_participants SET ready=true WHERE id=$1 AND submitted_at IS NULL AND (SELECT status FROM medarc_group_rooms WHERE id=$2)='lobby' RETURNING id",[identity.participant.id,room.id]);
  if(!rows.length)throw new Error('The lobby is no longer accepting readiness updates.');
  return {ok:true};
 }
 if(action==='start'){
  if(identity.role!=='admin')throw new Error('Only the administrator can start the exam and timer.');
  const rows=await query(
   "UPDATE medarc_group_rooms r SET status='running',starts_at=now(),ends_at=now()+(r.duration_minutes*interval '1 minute') "+
   "WHERE r.id=$1 AND r.status='lobby' AND (SELECT count(*) FROM medarc_group_participants p WHERE p.room_id=r.id AND p.ready AND p.joined_at IS NOT NULL)=r.capacity RETURNING starts_at,ends_at",
   [room.id]);
  if(!rows.length)throw new Error('All assigned students must join and mark Ready before the administrator can start.');
  return {ok:true,startsAt:rows[0].starts_at,endsAt:rows[0].ends_at};
 }
 if(action==='answer'){
  if(identity.role!=='student')throw new Error('Only students can answer.');
  const questionId=clean(input?.questionId,60),response=input?.response;
  if(!Array.isArray(response)&&typeof response!=='string')throw new Error('Invalid answer.');
  const encoded=JSON.stringify(response);
  if(encoded.length>2500)throw new Error('Answer is too long.');
  const rows=await query(
   "INSERT INTO medarc_group_answers(room_id,participant_id,question_id,response) "+
   "SELECT r.id,p.id,q.question_id,$3::jsonb FROM medarc_group_rooms r "+
   "JOIN medarc_group_participants p ON p.room_id=r.id "+
   "JOIN medarc_group_questions q ON q.room_id=r.id AND q.question_id=$2 "+
   "WHERE r.id=$1 AND p.id=$4 AND p.ready AND p.submitted_at IS NULL AND r.status='running' AND now()<r.ends_at "+
   "ON CONFLICT(participant_id,question_id) DO UPDATE SET response=EXCLUDED.response,updated_at=now() RETURNING question_id",
   [room.id,questionId,encoded,identity.participant.id]);
  if(!rows.length)throw new Error('The exam has ended or this question is invalid.');
  return {ok:true};
 }
 if(action==='submit'){
  if(identity.role!=='student')throw new Error('Only students can submit.');
  const rows=await query("UPDATE medarc_group_participants SET submitted_at=now() WHERE id=$1 AND submitted_at IS NULL AND (SELECT status FROM medarc_group_rooms WHERE id=$2)='running' RETURNING id",[identity.participant.id,room.id]);
  if(!rows.length)throw new Error('Attempt was already submitted.');
  return {ok:true};
 }
 if(action==='end'){
  if(identity.role!=='admin')throw new Error('Only the administrator can end the exam.');
  await query("UPDATE medarc_group_rooms SET status='ended',ends_at=LEAST(now(),ends_at) WHERE id=$1 AND status='running'",[room.id]);
  return {ok:true};
 }
 throw new Error('Unknown examination action.');
}

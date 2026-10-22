'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';

const defaults={title:'Medical Revision Group',subject:'',topic:'',capacity:5,questionCount:10,duration:30,mode:'practice'};
const url=code=>'/api/group-exams/'+encodeURIComponent(code);
const parse=async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;};
function Copy({value,label='Copy'}){return <button type="button" className="medarc-quiz-small" onClick={()=>navigator.clipboard.writeText(value)}>{label}</button>}
export default function GroupExamStudio(){
 const [subjects,setSubjects]=useState([]);
 const [config,setConfig]=useState(defaults);
 const [code,setCode]=useState('');
 const [codeInput,setCodeInput]=useState('');
 const [token,setToken]=useState('');
 const [role,setRole]=useState('guest');
 const [lobby,setLobby]=useState(null);
 const [created,setCreated]=useState(null);
 const [username,setUsername]=useState('');
 const [pin,setPin]=useState('');
 const [adminSecret,setAdminSecret]=useState('');
 const [joinMode,setJoinMode]=useState('student');
 const [tab,setTab]=useState('create');
 const [current,setCurrent]=useState(0);
 const [responses,setResponses]=useState({});
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');
 const [now,setNow]=useState(Date.now());
 const [clockOffset,setClockOffset]=useState(0);
 const [loading,setLoading]=useState(false);
 const selectedSubject=subjects.find(s=>s.subject===config.subject);
 useEffect(()=>{
  fetch('/api/group-exams',{cache:'no-store'}).then(parse).then(data=>{
   setSubjects(data.subjects||[]);
   setConfig(p=>({...p,subject:p.subject||data.subjects?.find(x=>x.subject==='Human Anatomy')?.subject||data.subjects?.[0]?.subject||''}));
  }).catch(()=>setError('Subject catalogue unavailable. Refresh this page.'));
  const queryCode=new URLSearchParams(window.location.search).get('code');
  if(queryCode){
   const normalized=queryCode.toUpperCase().slice(0,12);
   setCode(normalized);setCodeInput(normalized);setTab('join');
   try{const session=JSON.parse(sessionStorage.getItem('medarc-room-'+normalized)||'{}');if(session.token){setToken(session.token);setRole(session.role||'guest');}}catch{}
  }
 },[]);
 useEffect(()=>{
  const id=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(id);
 },[]);
 const load=useCallback(async (roomCode,authToken)=>{
  const res=await fetch(url(roomCode),{cache:'no-store',headers:authToken?{Authorization:'Bearer '+authToken}:{}});
  const data=await parse(res);
  setClockOffset(new Date(data.serverNow).getTime()-Date.now());
  setLobby(data);if(data.responses)setResponses(data.responses);
  if(data.role&&data.role!=='guest')setRole(data.role);
  return data;
 },[]);
 useEffect(()=>{
  if(!code)return;
  let active=true;
  const refresh=async()=>{try{if(active)await load(code,token);}catch(e){if(active)setError(e.message);}};
  refresh();const id=setInterval(refresh,4500);
  return()=>{active=false;clearInterval(id);};
 },[code,token,load]);
 const act=async(body,auth=token,room=code)=>{
  const res=await fetch(url(room),{method:'POST',headers:{'content-type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)});
  return parse(res);
 };
 const create=async e=>{
  e.preventDefault();setLoading(true);setError('');setInfo('');
  try{
   const data=await parse(await fetch('/api/group-exams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(config)}));
   setCreated(data);setCode(data.code);setCodeInput(data.code);
   setToken(data.leaderToken);setRole('leader');setTab('room');
   sessionStorage.setItem('medarc-room-'+data.code,JSON.stringify({token:data.leaderToken,role:'leader'}));
   window.history.replaceState(null,'','/group-exams?code='+data.code);
   await load(data.code,data.leaderToken);
  }catch(ex){setError(ex.message)}finally{setLoading(false)}
 };
 const join=async e=>{
  e.preventDefault();setLoading(true);setError('');
  try{
   const room=codeInput.trim().toUpperCase();
   const credentials=joinMode==='student'?{username,pin,role:'student'}:{secret:adminSecret,role:'admin'};
   const data=await act({action:'join',...credentials},'',room);
   setCode(room);setToken(data.token);setRole(data.role);setCreated(null);setTab('room');
   sessionStorage.setItem('medarc-room-'+room,JSON.stringify({token:data.token,role:data.role}));
   window.history.replaceState(null,'','/group-exams?code='+room);
   await load(room,data.token);
  }catch(ex){setError(ex.message)}finally{setLoading(false)}
 };
 const action=async type=>{
  setSaving(true);setError('');setInfo('');
  try{await act({action:type});await load(code,token);setInfo(type==='start'?'Timer started for every student.':type==='submit'?'Answers submitted.':'Saved successfully.');}
  catch(ex){setError(ex.message)}finally{setSaving(false)}
 };
 const save=async(questionId,response)=>{
  setResponses(old=>({...old,[questionId]:response}));
  setSaving(true);setError('');
  try{await act({action:'answer',questionId,response});setInfo('Response saved securely.');}
  catch(ex){setError(ex.message)}finally{setSaving(false)}
 };
 const questions=lobby?.questions||[];
 const question=questions[current];
 const remaining=lobby?.endsAt?Math.max(0,Math.floor((new Date(lobby.endsAt).getTime()-(now+clockOffset))/1000)):0;
 const hhmm=remaining?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):'00:00';
 const answered=questions.filter(q=>{
   const v=responses[q.id];return typeof v==='string'?v.trim().length>0:Array.isArray(v)&&v.length>0;
 }).length;
 const anyRoom=Boolean(lobby&&code);
 const valid=(config.topic||'')==='' ? (selectedSubject?.count||0)>=config.questionCount : Boolean(config.topic);
 return <main className="medarc-exam-room-page">
  <header className="medarc-exam-room-hero">
   <div><span className="eyebrow">MEDARC · COLLABORATIVE LEARNING</span><h1>Study together. Test your understanding.</h1>
    <p>Create a private study group, invite 5–10 participants and let a designated administrator start the synchronized examination timer. Everyone receives the same questions in a different order.</p>
    <div className="medarc-exam-pillrow"><span>Subject-specific questions</span><span>Individual access codes</span><span>Saved responses</span></div>
   </div>
   <img src="/medarc/visuals/02_collaborative_study.webp" alt="African medical students in a discussion group" width="270" height="245"/>
  </header>
  <div className="medarc-exam-tabs">
   <button className={tab==='create'?'selected':''} onClick={()=>setTab('create')}>Create a group</button>
   <button className={tab==='join'?'selected':''} onClick={()=>setTab('join')}>Join with code</button>
   <button className={tab==='room'?'selected':''} onClick={()=>setTab('room')} disabled={!anyRoom}>Examination room</button>
  </div>
  {error&&<div role="alert" className="medarc-exam-notice error">{error}</div>}
  {info&&<div role="status" className="medarc-exam-notice">{info}</div>}
  {tab==='create'&&<form onSubmit={create} className="medarc-exam-panel medarc-exam-form">
   <div><h2>Group leader · Create examination</h2><p>Select the department and topic before inviting participants.</p></div>
   <label>Exam title<input required maxLength="120" value={config.title} onChange={e=>setConfig({...config,title:e.target.value})}/></label>
   <div className="medarc-exam-grid2">
    <label>Subject / Department<select value={config.subject} onChange={e=>setConfig({...config,subject:e.target.value,topic:''})}>
     {subjects.map(item=><option key={item.subject} value={item.subject}>{item.subject}</option>)}</select></label>
    <label>Topic<select value={config.topic} onChange={e=>setConfig({...config,topic:e.target.value})}><option value="">All topics in subject</option>
     {(selectedSubject?.topics||[]).map(t=><option value={t} key={t}>{t}</option>)}</select></label>
    <label>Students<select value={config.capacity} onChange={e=>setConfig({...config,capacity:Number(e.target.value)})}>
     {[5,6,7,8,9,10].map(x=><option key={x} value={x}>{x} students</option>)}</select></label>
    <label>Questions<select value={config.questionCount} onChange={e=>setConfig({...config,questionCount:Number(e.target.value)})}>
     {[10,20].map(x=><option key={x} value={x}>{x} questions</option>)}</select></label>
    <label>Time limit<select value={config.duration} onChange={e=>setConfig({...config,duration:Number(e.target.value)})}>
     {[20,30,40,45,60].map(x=><option key={x} value={x}>{x} minutes</option>)}</select></label>
    <label>Assessment type<select value={config.mode} onChange={e=>setConfig({...config,mode:e.target.value})}>
     <option value="practice">Learning practice · unscored</option><option value="scored">Clinically verified scoring only</option></select></label>
   </div>
   <div className="medarc-exam-hint"><strong>{selectedSubject?.count?.toLocaleString()||0} indexed choice questions</strong> in the selected department before topic and review filters. These records are not automatically clinically verified. Scored rooms will only start when reviewed answer keys exist.</div>
   <button className="button button-primary" type="submit" disabled={loading||!valid}>{loading?'Creating room…':'Create exam and generate credentials →'}</button>
  </form>}
  {tab==='join'&&<form onSubmit={join} className="medarc-exam-panel medarc-exam-form">
   <h2>Enter the examination room</h2><p>Ask the group leader for your exam code and your personal access credentials.</p>
   <div className="medarc-exam-grid2"><label>Group examination code<input required value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())} placeholder="A1B2C3D4E5" maxLength="12"/></label>
   <label>Joining as<select value={joinMode} onChange={e=>setJoinMode(e.target.value)}><option value="student">Student</option><option value="admin">Examination administrator</option></select></label></div>
   {joinMode==='student'?<div className="medarc-exam-grid2"><label>Username<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="student01"/></label><label>Individual PIN<input required value={pin} onChange={e=>setPin(e.target.value)} autoComplete="off" placeholder="Your private PIN"/></label></div>:
    <label>Administrator access key<input required value={adminSecret} onChange={e=>setAdminSecret(e.target.value)} type="password" autoComplete="off" placeholder="Key supplied by group leader"/></label>}
   <button className="button button-primary" disabled={loading} type="submit">{loading?'Joining…':'Enter examination lobby →'}</button>
  </form>}
  {tab==='room'&&anyRoom&&<div className="medarc-exam-panel medarc-exam-workspace">
   <div className="medarc-room-head">
    <div><span className="eyebrow">{lobby.subject}{lobby.topic?' · '+lobby.topic:''}</span><h2>{lobby.title}</h2><p>{lobby.questionCount} questions · {lobby.duration} minutes · {lobby.capacity} students</p></div>
    <div className="medarc-exam-room-code"><small>ROOM CODE</small><strong>{lobby.code}</strong><Copy value={lobby.code}/></div>
   </div>
   <div className="medarc-room-status">
    <span>Status: <strong>{lobby.status==='lobby'?'Waiting for administrator':lobby.status==='running'?'Examination in progress':'Examination completed'}</strong></span>
    <span>{lobby.joined}/{lobby.capacity} joined</span><span>{lobby.ready}/{lobby.capacity} ready</span><span>{lobby.submitted}/{lobby.capacity} submitted</span>
   </div>
   {created?.credentials&&<section className="medarc-room-secret">
    <h3>Group leader · Student usernames and private PINs</h3>
    <p>These credentials appear only when the room is created. Copy them now and distribute each PIN privately to the corresponding student.</p>
    <div className="medarc-room-roster">
     {created.credentials.map(p=><div key={p.username}><strong>{p.username}</strong><code>{p.pin}</code><Copy value={p.username+' · '+p.pin}/></div>)}
    </div>
    <div className="medarc-room-admin-key"><span><b>Administrator-only access key</b><small>Share privately with the designated exam administrator. Only this role can start or end the timer.</small></span><Copy value={created.adminToken} label="Copy admin key"/></div>
    <Copy label="Copy full student roster" value={'MedArc '+lobby.code+'\n'+created.credentials.map(p=>p.username+'  '+p.pin).join('\n')}/>
   </section>}
   <section className="medarc-exam-participants"><h3>Participants</h3>
    <div className="medarc-exam-participant-grid">{lobby.members.map((p,i)=><div key={p.username} className="medarc-exam-participant"><span>{i+1}</span><strong>{p.username}</strong><small>{p.submitted?'Submitted':p.ready?'Ready':p.joined?'Joined · not ready':'Not joined'}</small></div>)}</div>
   </section>
   {lobby.status==='lobby'&&<div className="medarc-exam-control">
    {role==='student'?<><p>Check the subject and number of questions above, then mark yourself ready. The administrator will start the examination for everyone simultaneously.</p>
     <button className="button button-primary" disabled={saving||lobby.members.find(m=>m.username===lobby.username)?.ready} onClick={()=>action('ready')}>{lobby.members.find(m=>m.username===lobby.username)?.ready?'Ready · waiting for start':'I am ready'}</button></>:
    role==='admin'?<><p>As the administrator, verify every participant has joined and marked Ready. Starting will lock the examination room and set one shared server deadline.</p>
     <button className="button button-primary" disabled={saving||lobby.ready!==lobby.capacity||lobby.joined!==lobby.capacity} onClick={()=>action('start')}>Start examination & synchronized timer →</button></>:
    <p>Share the examination code and personal PINs with your students. Give the administrator their private key. Only the administrator can start the timer.</p>}
   </div>}
   {lobby.status==='running'&&<section className="medarc-group-active">
    <div className="medarc-group-timer"><span>Server-controlled time remaining</span><strong>{hhmm}</strong></div>
    {role==='student'&&questions.length>0&&<>
      <div className="medarc-group-question-top"><b>Question {current+1} of {questions.length}</b><span>{answered} answered</span></div>
      <div className="medarc-group-question"><p>{question?.stem}</p>
       {question?.options?.length>0?<div className="medarc-group-options">{question.options.map((opt,i)=>{
         const key=opt.label||String.fromCharCode(65+i);
         return <label key={key} className={responses[question.id]===key?'is-chosen':''}><input type="radio" name={'answer-'+question.id} checked={responses[question.id]===key} onChange={()=>save(question.id,key)} disabled={saving}/><span>{key}. {opt.text}</span></label>
       })}</div>:<textarea value={responses[question?.id]||''} onChange={e=>setResponses(p=>({...p,[question.id]:e.target.value}))} placeholder="Type your response" rows={5}/>}
       {question?.options?.length===0&&<button disabled={saving} className="button button-outline" onClick={()=>save(question.id,responses[question.id]||'')}>Save response</button>}
      </div>
      <div className="medarc-group-question-actions">
       <button disabled={current===0} className="button button-outline" onClick={()=>setCurrent(c=>Math.max(0,c-1))}>Previous</button>
       <button disabled={current===questions.length-1} className="button button-outline" onClick={()=>setCurrent(c=>Math.min(questions.length-1,c+1))}>Next</button>
       <button disabled={saving} className="button button-primary" onClick={()=>{if(window.confirm('Submit and lock your attempt?'))action('submit')}}>Submit examination</button>
      </div>
     </>}
    {role==='student'&&questions.length===0&&<p>Your attempt has been submitted, or the examination deadline has passed.</p>}
    {role==='admin'&&<div className="medarc-exam-control"><p>The official timer is running. Answers are saved to the database for each student. You may close the examination early.</p><button className="button button-outline" disabled={saving} onClick={()=>{if(window.confirm('End examination for every student immediately?'))action('end')}}>End examination for everyone</button></div>}
    {role==='leader'&&<p>Students are completing their examination. The administrator controls the exam timer.</p>}
   </section>}
   {lobby.status==='ended'&&<section className="medarc-exam-results"><h3>{lobby.mode==='scored'?'Results & leaderboard':'Group practice summary'}</h3>
    <p>{lobby.mode==='scored'?'Scores are calculated from clinically verified answer keys only.':'This is unscored practice. Completion counts are shown without claiming medical grading or ranking.'}</p>
    {lobby.results?.participants?.length>0?<div className="medarc-results-table">{lobby.results.participants.map((p,i)=><div key={p.username}><span>{lobby.mode==='scored'?'#'+(i+1):'—'}</span><strong>{p.username}</strong><span>{p.answered}/{lobby.questionCount} answered</span><b>{p.score===null?'Unscored':p.score+'/'+lobby.questionCount}</b></div>)}</div>:<p>Results available after server reconciliation.</p>}
   </section>}
  </div>}
  {!anyRoom&&tab==='room'&&<div className="medarc-exam-panel"><h2>No room selected</h2><p>Create a room or enter an examination code.</p></div>}
  <p className="medarc-exam-footer">Private study-group exam rooms are designed for learning. The imported MedArc answer bank is provisional; no unverified answer is used to award competitive marks.</p>
 </main>;
}

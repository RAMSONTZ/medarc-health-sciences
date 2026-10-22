"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {alphabeticMarker,clamp,normalizeMarker,getOptions,hasQuestion,markResponse,gradeSummary,validateDraftManifest,closestMarker} from '../lib/anatomy-practical.mjs';

const safeFile=(file)=>file && ['image/png','image/jpeg','image/webp'].includes(file.type) && file.size<=20*1024*1024;
const localKey='medarc:anatomy-v2-5:attempts';
const makeId=()=>`local-${Date.now().toString(36)}`;
function safeDraft(item){return {id:item.id,title:item.title,topic:item.topic,markers:item.markers.map(({id,x,y,labelX,labelY,name,location,functionText,hint,explanation,nameDistractors,locationDistractors})=>({id,x,y,labelX,labelY,name,location,functionText,hint,explanation,nameDistractors,locationDistractors}))};}
const MarkerSvg=({markers,active,mode,changeMarker,feedback})=><>
 <svg className="ap-arrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <defs><marker id="ap-tip" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L4 2 L0 4" fill="none" stroke="currentColor" strokeWidth=".5"/></marker></defs>
  {markers.map((m,i)=><g key={m.id||i} className={active===i?'ap-arrow-active':''}><line x1={m.labelX} y1={m.labelY} x2={m.x} y2={m.y} markerEnd="url(#ap-tip)"/><circle cx={m.x} cy={m.y} r=".68" /></g>)}
 </svg>
 {markers.map((m,i)=><button key={m.id||i} type="button" style={{left:`${m.labelX}%`,top:`${m.labelY}%`}} className={`ap-marker ${active===i?'ap-marker-current':''}`} onClick={(e)=>{e.stopPropagation();changeMarker(i)}} aria-label={`Marker ${alphabeticMarker(i)}: ${mode==='educator'?'edit anatomical structure':'identify anatomical structure'}`}>{alphabeticMarker(i)}{active===i && (feedback==='correct'||feedback==='incorrect') && <span className={`ap-marker-feedback ${feedback==='correct'?'good':'bad'}`} aria-label={feedback==='correct'?'Correct':'Incorrect'}>{feedback==='correct'?'✓':'×'}</span>}</button>)}
 </>;

export function AnatomyPractical({images=[]}){
 const [mode,setMode]=useState('student');
 const [asset,setAsset]=useState(null);
 const [localAsset,setLocalAsset]=useState(null);
 const [markers,setMarkers]=useState([]);
 const [selected,setSelected]=useState(0);
 const [questionType,setQuestionType]=useState('name');
 const [answerInput,setAnswerInput]=useState('');
 const [revealed,setRevealed]=useState(false);
 const [checked,setChecked]=useState(false);
 const [responses,setResponses]=useState({});
 const [stageSurface,setStageSurface]=useState('auto');
 const [imageError,setImageError]=useState('');
 const [draftNotice,setDraftNotice]=useState('');
 const fileInput=useRef(null), jsonInput=useRef(null), stage=useRef(null);
 const localUrl=useRef(null);
 const available=useMemo(()=>images.filter(item=>item?.src?.startsWith('/anatomy/')),[images]);
 const current=asset || localAsset;
 const normalized=useMemo(()=>markers.map(normalizeMarker),[markers]);
 const marker=normalized[selected];
 const progress=gradeSummary(responses);
 const responseKey=current&&marker?`${current.id}:${marker.letter}:${questionType}`:'';
 const checkResult=responses[responseKey];
 const options=marker?getOptions(marker,questionType):[];
 const statusText=marker && hasQuestion(marker,questionType);
 const canEdit=mode==='educator';

 useEffect(()=>{try{setResponses(JSON.parse(localStorage.getItem(localKey)||'{}')||{});}catch{}},[]);
 useEffect(()=>{if(available.length && !asset && !localAsset) chooseAsset(available[0]);},[available]);
 useEffect(()=>()=>{if(localUrl.current)URL.revokeObjectURL(localUrl.current)},[]);
 useEffect(()=>{const receive=e=>{if(e.detail instanceof File)onLocalFile(e.detail)};window.addEventListener('medarc:anatomy-open-file',receive);return()=>window.removeEventListener('medarc:anatomy-open-file',receive)},[]);
 useEffect(()=>{const handler=e=>{if(e.key==='Escape' && document.activeElement?.tagName!=='INPUT')setSelected(-1)};window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler)},[]);
 const resetQuestion=()=>{setAnswerInput('');setRevealed(false);setChecked(false);};
 function chooseAsset(item){setAsset(item);setLocalAsset(null);setMarkers(item.markers||[]);setSelected(0);setQuestionType('name');resetQuestion();setImageError('');setDraftNotice('');}
 function onLocalFile(file){
  if(!safeFile(file))return setImageError('Select a PNG, JPG or WebP under 20 MB. Files stay in your browser.');
  if(localUrl.current) URL.revokeObjectURL(localUrl.current);
  localUrl.current=URL.createObjectURL(file);
  setImageError('');setAsset(null);setMarkers([]);setSelected(-1);resetQuestion();setMode('educator');setDraftNotice('Local image loaded into this browser session only. Add markers and export your annotations. No file has been uploaded to a server.');
  setLocalAsset({id:makeId(),src:localUrl.current,title:file.name.replace(/\.[^.]+$/,''),alt:'User-selected local anatomy image',credit:'Local private image',license:'Not cleared for public distribution',topic:'Local preview',markers:[]});
 }
 function updateMarker(field,value){setMarkers(prev=>prev.map((x,i)=>i===selected?{...x,[field]:value}:x));resetQuestion();}
 function onStageClick(event){
  if(!current || !stage.current || !event.target.closest('.ap-stage-clickzone')) return;
  const rect=stage.current.getBoundingClientRect();
  const x=Math.round(clamp((event.clientX-rect.left)/rect.width*100,1,99)*10)/10;
  const y=Math.round(clamp((event.clientY-rect.top)/rect.height*100,1,99)*10)/10;
  if(mode==='student'){
   const match=closestMarker(normalized,x,y,11);
   if(match>=0)selectMarker(match);
   return;
  }
  setMarkers(p=>[...p,{id:`marker-${p.length+1}-${Date.now().toString(36)}`,x,y,labelX:clamp(x>82?x-12:x+12),labelY:clamp(y<18?y+12:y-12),name:'',location:'',explanation:'',nameDistractors:[],locationDistractors:[]}]);
  setSelected(markers.length);setQuestionType('name');resetQuestion();setDraftNotice(`Target ${alphabeticMarker(markers.length)} added. Enter its reviewed anatomical name and location.`);
 }
 function removeMarker(){setMarkers(p=>p.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));resetQuestion()}
 function selectMarker(i){setSelected(i);setQuestionType('name');resetQuestion()}
 function setQType(kind){setQuestionType(kind);resetQuestion()}
 function submitAnswer(value=answerInput){
  if(!marker || !statusText)return;
  const result=markResponse(marker,questionType,value);
  if(result.status==='no-selection')return setImageError('Choose one of the listed options before checking.');
  if(result.status==='self-assessment'){setRevealed(true);setChecked(true);setImageError('');return;}
  const updated={...responses,[responseKey]:{...result,selected:value}};
  setResponses(updated);try{localStorage.setItem(localKey,JSON.stringify(updated))}catch{}
  setChecked(true);setImageError('');
 }
 function downloadDraft(){
  if(!current)return;
  const payload={schemaVersion:2,status:'EDUCATOR_DRAFT_NOT_PUBLISHED',generatedAt:new Date().toISOString(),images:[safeDraft({...current,markers:normalized})],notes:'Local teaching annotations only. Source image is not included. Rights validation and medical review required before release.'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${current.id}-anatomy-markers.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setDraftNotice('Annotation JSON exported. Keep it alongside your original image. It is not automatically approved or published.');
 }
 async function loadDraft(file){try{
  if(!file || file.size>1024*1024)throw Error('Manifest exceeds 1 MB');
  const parsed=JSON.parse(await file.text());const validity=validateDraftManifest(parsed);if(!validity.valid)throw Error(validity.error);
  if(!parsed.images.length)throw Error('The manifest contains no images');
  const target=parsed.images.find(x=>x.id===current?.id)||parsed.images[0];
  setMarkers(target.markers);setSelected(target.markers.length?0:-1);resetQuestion();setMode('educator');
  setDraftNotice(`Imported ${target.markers.length} annotations for review. Image pixels are not contained in the JSON.`);
 }catch(err){setImageError(`Could not import annotations: ${err.message}`)}}
 const imagePanel=<div className="ap-stage-wrap">
  {current?<>
   <div className="ap-stage-toolbar"><span className="ap-original">{localAsset?'LOCAL • PRIVATE IMAGE':'RIGHTS-APPROVED ORIGINAL'}</span><div className="ap-stage-actions"><label htmlFor="ap-surface">Background</label><select id="ap-surface" value={stageSurface} onChange={e=>setStageSurface(e.target.value)}><option value="auto">Follow theme</option><option value="light">Light</option><option value="dark">Dark</option><option value="neutral">Neutral</option></select></div></div>
   <div className={`ap-stage ap-stage-${stageSurface}`} ref={stage}>
    <div className="ap-stage-clickzone" onClick={onStageClick} aria-label={canEdit?'Click anatomy image to add an arrow target':'Tap an arrow or anatomical target to select a question'}>
     <img className="ap-photo" src={current.src} alt={current.alt||current.title} draggable={false}/>
     <MarkerSvg markers={normalized} active={selected} mode={mode} changeMarker={selectMarker} feedback={checkResult?.status}/>
    </div>
    {canEdit&&<span className="ap-stage-tip">Click an anatomical landmark to place a new lettered arrow.</span>}
   </div>
   <div className="ap-image-caption"><strong>{current.title}</strong><span>{current.credit||'Local preview'} · {current.license||'Permission required'}</span></div>
  </>:<div className="ap-stage-empty"><div className="ap-empty-symbol">A →</div><h3>Your anatomy practical starts here</h3><p>Select a reviewed image from the library or load your own image privately. The student then identifies A, B, C… without seeing the labels.</p><button type="button" className="ap-btn ap-primary" onClick={()=>fileInput.current?.click()}>Choose local anatomy image</button></div>}
 </div>;
 return <section className="ap-practical" aria-label="Interactive anatomy practical">
  <header className="ap-header"><div><span className="eyebrow">IDENTIFY • LOCATE • UNDERSTAND</span><h2>Interactive anatomy practical</h2><p>Lettered arrows, selectable structures, verified answer choices and direct marking—designed for actual anatomy images, not cartoons.</p></div><div className="ap-mode-switch" role="group" aria-label="Practical mode"><button type="button" className={mode==='student'?'selected':''} onClick={()=>setMode('student')}>Student practice</button><button type="button" className={mode==='educator'?'selected':''} onClick={()=>setMode('educator')}>Educator studio</button></div></header>
  <div className="ap-library-toolbar"><div className="ap-image-picker"><label htmlFor="ap-image-pick">Anatomical image</label><select id="ap-image-pick" value={asset?.id || ''} onChange={e=>{const found=available.find(x=>x.id===e.target.value);if(found)chooseAsset(found);}}><option value="">{localAsset?'Private local image':'Select reviewed image'}</option>{available.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></div><button className="ap-btn ap-outline" type="button" onClick={()=>fileInput.current?.click()}>Use local image</button><input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>onLocalFile(e.target.files?.[0])}/><span className="ap-review-count">{available.length} public-ready images · private upload available</span></div>
  <div className="ap-workspace">{imagePanel}<aside className="ap-questions" aria-label={mode==='student'?'Anatomy quiz questions':'Anatomy annotation editor'}>
  {mode==='student'?<>
   <div className="ap-panel-head"><span className="eyebrow">PRACTICAL QUESTIONS</span><span className="ap-small-progress">{progress.correct}/{progress.answered} correct</span></div>
   <h3>{marker?`Structure ${marker.letter}`:'Choose a lettered marker'}</h3>
   <p className="ap-help">{marker?`Study the arrow labeled ${marker.letter} in the image. Tap the letter or nearby anatomical landmark. The image letter is not an answer choice.`:'The lecturer first needs to label this image. Choose Educator studio to create targets.'}</p>
   {marker?<>
    <div className="ap-question-tabs" role="group" aria-label="Question type"><button className={questionType==='name'?'selected':''} onClick={()=>setQType('name')}>Name</button><button className={questionType==='location'?'selected':''} onClick={()=>setQType('location')}>Location</button></div>
    <p className="ap-question-prompt">{questionType==='name'?`What anatomical structure does arrow ${marker.letter} indicate?`:`Where is the structure indicated by arrow ${marker.letter} anatomically located?`}</p>
    {!statusText?<p role="status" className="ap-unavailable">No reviewed {questionType==='name'?'name':'location'} key has been provided for this marker. It cannot be graded yet.</p>:
    options.length>=3?<fieldset className="ap-options" disabled={!!checkResult}><legend className="sr-only">Select the correct answer</legend>{options.map((choice,i)=>{const isRight=(checked || !!checkResult) && choice===(questionType==='name'?marker.name:marker.location);const isWrong=(checked || !!checkResult) && (checkResult?.selected??answerInput)===choice && !isRight;return <label key={choice} className={`ap-choice ${isRight?'ap-choice-right':''} ${isWrong?'ap-choice-wrong':''}`}><input type="radio" name={`anatomy-choice-${responseKey}`} checked={(checkResult?.selected??answerInput)===choice} onChange={()=>setAnswerInput(choice)} disabled={!!checkResult}/><b>{alphabeticMarker(i)}</b><span>{choice}</span>{isRight&&<strong aria-label="Correct choice">✓</strong>}{isWrong&&<strong aria-label="Incorrect choice">×</strong>}</label>})}</fieldset>
    :<div className="ap-written"><label htmlFor="ap-written-answer">Your answer</label><textarea id="ap-written-answer" value={answerInput} onChange={e=>setAnswerInput(e.target.value)} placeholder="Write your anatomical identification or location here" rows={3}/><p>Written responses are self-assessed. No automatic matching or false mark is applied.</p></div>}
    <div className="ap-quiz-actions">{options.length>=3?<button className="ap-btn ap-primary" type="button" disabled={!!checkResult || !answerInput} onClick={()=>submitAnswer()}>Check answer</button>:<button className="ap-btn ap-primary" type="button" onClick={()=>submitAnswer()}>Reveal model answer</button>}{marker.hint&&<button className="ap-btn ap-outline" onClick={()=>setRevealed('hint')}>Hint</button>}</div>
    {(checkResult || (revealed===true && options.length<3))&&<div className={`ap-feedback ${checkResult?.status==='correct'?'ap-feedback-good':checkResult?.status==='incorrect'?'ap-feedback-bad':''}`} role="status"><strong>{checkResult?.status==='correct'?'✓ Correct':checkResult?.status==='incorrect'?'× Not correct':'Model answer for self-assessment'}</strong><p><b>Correct anatomical {questionType==='name'?'name':'location'}:</b> {questionType==='name'?marker.name:marker.location}</p>{marker.explanation&&<p>{marker.explanation}</p>}{marker.functionText&&<p><b>Function:</b> {marker.functionText}</p>}</div>}
    {revealed==='hint'&&<div className="ap-hint" role="status"><b>Hint:</b> {marker.hint}</div>}
    <div className="ap-next"><button className="ap-btn ap-outline" onClick={()=>{const i=selected-1;selectMarker(i<0?normalized.length-1:i)}} disabled={normalized.length<2}>← Previous</button><span>{selected+1} of {normalized.length}</span><button className="ap-btn ap-outline" onClick={()=>selectMarker((selected+1)%normalized.length)} disabled={normalized.length<2}>Next →</button></div>
    </> :<p className="ap-unavailable">There are no arrow targets yet. They can be created in Educator studio.</p>}
  </>:<>
   <div className="ap-panel-head"><span className="eyebrow">PRIVATE ANNOTATION WORKSPACE</span><span className="ap-review-count">Not published</span></div>
   <h3>Build a practical question</h3><p className="ap-help">Click a structure in the image. MedArc draws an arrow and assigns the next letter. Record the verified name, location, and plausible distractors.</p>
   {marker?<div className="ap-form">
    <div className="ap-selected-letter">Editing image marker <strong>{marker.letter}</strong></div>
    <label>Verified anatomical name <input value={marker.name} onChange={e=>updateMarker('name',e.target.value)} placeholder="e.g. educator-verified structure"/></label>
    <label>Anatomical location <textarea value={marker.location} onChange={e=>updateMarker('location',e.target.value)} rows={2} placeholder="Surface, region, compartment, adjacent structures"/></label>
    <label>Explanation / relations <textarea value={marker.explanation} onChange={e=>updateMarker('explanation',e.target.value)} rows={2} placeholder="Reason the arrow points to this structure"/></label>
    <label>Function / clinical note (optional) <input value={marker.functionText} onChange={e=>updateMarker('functionText',e.target.value)}/></label>
    <label>Hint (optional) <input value={marker.hint} onChange={e=>updateMarker('hint',e.target.value)}/></label>
    <label>Other plausible structure names <textarea rows={3} value={marker.nameDistractors.join('\n')} onChange={e=>updateMarker('nameDistractors',e.target.value.split(/\r?\n/))} placeholder="One alternative per line; at least 2 for MCQ"/></label>
    <label>Other plausible anatomical locations <textarea rows={3} value={marker.locationDistractors.join('\n')} onChange={e=>updateMarker('locationDistractors',e.target.value.split(/\r?\n/))} placeholder="One alternative per line; at least 2 for MCQ"/></label>
    <div className="ap-coordinates"><label>Arrow tip X (%)<input type="number" min="0" max="100" step="0.1" value={marker.x} onChange={e=>updateMarker('x',clamp(e.target.value,0,100))}/></label><label>Arrow tip Y (%)<input type="number" min="0" max="100" step="0.1" value={marker.y} onChange={e=>updateMarker('y',clamp(e.target.value,0,100))}/></label></div>
    <div className="ap-coordinates"><label>Letter position X (%)<input type="number" min="0" max="100" step="0.1" value={marker.labelX} onChange={e=>updateMarker('labelX',clamp(e.target.value,0,100))}/></label><label>Letter position Y (%)<input type="number" min="0" max="100" step="0.1" value={marker.labelY} onChange={e=>updateMarker('labelY',clamp(e.target.value,0,100))}/></label></div>
    <button type="button" className="ap-btn ap-danger" onClick={removeMarker}>Remove this marker</button>
   </div>:<p className="ap-unavailable">Click the anatomical image to add marker A.</p>}
   <div className="ap-publish-actions"><button className="ap-btn ap-primary" disabled={!current} onClick={downloadDraft}>Export annotations JSON</button><button className="ap-btn ap-outline" onClick={()=>jsonInput.current?.click()}>Import annotations</button><input hidden ref={jsonInput} accept="application/json,.json" type="file" onChange={e=>loadDraft(e.target.files?.[0])}/></div>
   <p className="ap-help">A downloaded annotation manifest does not publish the image. Copyright approval, clinical validation, and checked option keys remain mandatory before public release.</p>
  </>}
  </aside></div>
  {imageError&&<p className="ap-banner-error" role="alert">{imageError}</p>}
  {draftNotice&&<p className="ap-banner-info" role="status">{draftNotice}</p>}
  <div className="ap-modes-explained"><div><b>Student view</b><p>Original image with lettered arrows, multiple-choice or written questions, instant ticking and rationale.</p></div><div><b>Educator view</b><p>Place and reposition arrow tips, write names and locations, add distractors, and export reviewable annotations.</p></div><div><b>Background compatibility</b><p>Transparent PNG/WebP specimens adapt to light and dark surfaces. Opaque photographs retain their natural pixels without destructive inversion.</p></div></div>
 </section>;
}

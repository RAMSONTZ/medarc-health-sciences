'use client';
import {useCallback, useEffect, useState} from 'react';
import {Icon} from './Icons';
import {evaluateAnswer} from '@/lib/scoring';

// Deliberately separate learner attempts from the original source answer keys.
// The saved response is never evidence that an answer is correct.
const ATTEMPT_KEY='medarc:v2:attempts:v3';
function readAttempt(id) {
  try {
    const records=JSON.parse(localStorage.getItem(ATTEMPT_KEY)||'{}');
    return records[id]||null;
  } catch { return null; }
}
function persistAttempt(id, state) {
  try {
    const records=JSON.parse(localStorage.getItem(ATTEMPT_KEY)||'{}');
    records[id]={...state, savedAt:new Date().toISOString()};
    localStorage.setItem(ATTEMPT_KEY,JSON.stringify(records));
    window.dispatchEvent(new Event('medarc:progress'));
  } catch { /* Private browsing may disable storage; practice still works. */ }
}
function clearAttempt(id) {
  try {
    const records=JSON.parse(localStorage.getItem(ATTEMPT_KEY)||'{}');
    delete records[id];
    localStorage.setItem(ATTEMPT_KEY,JSON.stringify(records));
    window.dispatchEvent(new Event('medarc:progress'));
  } catch {}
}
function Explanation({answer}) {
  const optionReasons=answer.optionReasons||answer.optionRationales||{};
  return <div className="explanation">
    <b className="explanation-label">PREPARED ANSWER & EXPLANATION</b>
    <div className="explanation-body">
      {answer.answerText&&<p className="answer-text">{answer.answerText}</p>}
      <p>{answer.explanation||'No explanatory rationale has been supplied for this draft.'}</p>
      {Object.keys(optionReasons).length>0&&<div className="option-reasons">{Object.entries(optionReasons).map(([key,value])=><p key={key}><b>{key}.</b> {value}</p>)}</div>}
    </div>
    <p className="answer-quality-note">Educational draft: independent clinical verification is pending. Imported source keys are not used for scoring.</p>
  </div>;
}
export function QuestionCard({question,index=1,compact=false}) {
  const {id,options=[],answer}=question;
  const [choice,setChoice]=useState('');
  const [checked,setChecked]=useState(false);
  const [reveal,setReveal]=useState(false);
  const [written,setWritten]=useState('');
  const [storageReady,setStorageReady]=useState(false);
  const isWritten=options.length===0;
  const isMultiple=question.type==='Multiple Response';
  const key=answer?.correct;
  const hasKey=Boolean(answer)&&(!isWritten?(Array.isArray(key)?key.length>0:Boolean(key)):true);

  useEffect(()=>{
    const stored=readAttempt(id);
    setChoice(stored?.choice??(isMultiple?[]:''));
    setChecked(Boolean(stored?.checked));
    setReveal(Boolean(stored?.reveal));
    setWritten(stored?.written??'');
    setStorageReady(true);
  },[id,isMultiple]);
  const save=useCallback((patch)=>{
    persistAttempt(id,patch);
  },[id]);
  const choose=(letter)=>{
    setChoice(letter);
    setChecked(true);
    save({choice:letter,checked:true,reveal:false,written});
  };
  const toggle=(letter)=>{
    const current=Array.isArray(choice)?choice:[];
    const next=current.includes(letter)?current.filter(x=>x!==letter):[...current,letter];
    setChoice(next);
    setChecked(false); // Multi-response questions are graded only after explicit submission.
    save({choice:next,checked:false,reveal:false,written});
  };
  const submitMultiple=()=>{
    const next=Array.isArray(choice)?choice:[];
    if(next.length===0)return;
    setChecked(true);
    save({choice:next,checked:true,reveal:false,written});
  };
  const showWritten=()=>{
    setReveal(true);
    save({choice:'',checked:false,reveal:true,written});
  };
  const reset=()=>{
    setChoice(isMultiple?[]:'');setChecked(false);setReveal(false);setWritten('');clearAttempt(id);
  };
  const isRight=evaluateAnswer(answer,choice,{written:isWritten,multiple:isMultiple}).matches===true;
  const optionMap=Object.fromEntries(options.map(o=>[o.label,o.text]));
  const presentedCorrect=Array.isArray(key)?key.join(', '):key;

  return <article className={`question-card ${compact?'question-compact':''}`} aria-labelledby={`stem-${id}`}>
    <div className="question-heading">
      <div className="question-index">Q{index}</div>
      <div className="question-tags"><span>{question.subject}</span>{question.topic&&<span>{question.topic}</span>}<span>{question.type||'Question'}</span></div>
      <span className={`question-state ${hasKey?'ready':'pending'}`}>{hasKey?'Provisional answer':'Answer pending'}</span>
    </div>
    <h3 id={`stem-${id}`} className="question-stem">{question.stem}</h3>
    {isWritten?<>
      <p className="written-instruction">Free-response question. Compare your own reasoning with the provisional model answer; written text is not auto-graded.</p>
      <textarea rows={4} className="written-input" aria-label="Your written response" value={written} onChange={e=>setWritten(e.target.value)} placeholder="Write your response here"/>
      <div className="question-controls"><button className="button button-outline" onClick={showWritten} type="button"><Icon name="book" size={16}/> Reveal model answer</button><button className="question-reset" onClick={reset} type="button">Clear attempt</button></div>
    </>:<>
      <div className="answer-options" role="group" aria-label={`Answer options for question ${index}`}>{options.map(o=>{
        const selected=Array.isArray(choice)?choice.includes(o.label):choice===o.label;
        return <label key={`${id}-${o.label}`} className={`answer-option ${selected?'chosen':''} ${checked&&hasKey&&o.label===key&&!isMultiple?'option-correct':''}`}>
          <input type={isMultiple?'checkbox':'radio'} name={id} value={o.label} checked={selected} onChange={()=>isMultiple?toggle(o.label):choose(o.label)}/>
          <span className="option-letter">{o.label}</span><span className="option-content">{o.text}</span>
        </label>;
      })}</div>
      {isMultiple&&<div className="question-controls"><button className="button button-primary" type="button" disabled={!Array.isArray(choice)||choice.length===0} onClick={submitMultiple}>Check selected answers</button><button className="question-reset" type="button" onClick={reset}>Clear attempt</button></div>}
      {!isMultiple&&choice&&<div className="question-controls"><button className="question-reset" type="button" onClick={reset}>Try again</button></div>}
    </>}
    {storageReady&&checked&&!isWritten&&<div role="status" aria-live="polite" className={`answer-feedback medarc-illustrated-feedback ${hasKey?(isRight?'is-correct':'is-incorrect'):'is-pending'}`}>
      <div className="medarc-feedback-illustration" aria-hidden="true"/><div className="feedback-intro"><Icon name={hasKey&&isRight?'check':'shield'} size={17}/><b>{hasKey?(isRight?'Matches the prepared answer':'Different from the prepared answer'):'Response saved — not graded'}</b></div>
      {hasKey?<><p>Provisional answer: <strong>{presentedCorrect}</strong>{!Array.isArray(key)&&optionMap[key]?` — ${optionMap[key]}`:''}</p><Explanation answer={answer}/></>:<p>This question does not yet have a usable answer key and is not scored.</p>}
    </div>}
    {isWritten&&reveal&&<div className="answer-feedback is-pending" role="status">{answer?<Explanation answer={answer}/>:<p>A model answer has not yet been prepared for this question.</p>}</div>}
    {hasKey&&!isWritten&&!checked&&<p className="question-hint">{isMultiple?'Choose every applicable option, then press “Check selected answers”.':'Choose an option to view immediate feedback and a provisional explanation.'}</p>}
    <div className="question-bottom"><span>Record ID · {id}</span><span>Education only · Answer verification pending</span></div>
  </article>;
}

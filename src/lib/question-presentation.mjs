/** Separate imported answer material from the learner prompt. Never promote it to a key. */
import {getReviewedEdit} from './reviewed-edits.mjs';
const marker=/(?:View\s+Answer(?:\s+Explanation)?|(?:\*\*)?\b(?:The\s+answer\s+is\s+[a-e]\b|(?:correct\s+)?answers?(?:\*\*)?\s*:|explanations?\s*:|rationale\s*:|solution\s*(?::|The\s+correct\s+answer)))/i;
const genuinePrompt=s=>s.length>=18&&/\b(?:what|which|why|how|where|when|who|list|outline|describe|define|explain|calculate|compare|contrast|regarding|with respect|all of|select|identify|name|indicate|choose|pick|tick)\b|\?/i.test(s);
const explicitInline={
 'q-9af901849b36': 'Describe the relationships of the subclavian vein with other neurovascular structures in the vicinity.',
 'q-abde8fa0d6d1': 'Hyperacusis is noted. What is this? What motor branch of the facial nerve is affected?',
 'q-0f23002bf1c4': 'Which nerve does not supply sensation to the dorsum of the foot?',
 'q-d12c32a33e93': 'Which nerve does not supply sensation to the dorsum of the foot?',
 'q-6f12dbc36cd6': 'Which bone is not a component of the medial longitudinal arch of the foot?',
 'q-8b34222112ab': 'Which bone is not a component of the medial longitudinal arch of the foot?',
 'q-ba18936bb0d4': 'Which movement is weakened by rupture of the calcaneal (Achilles) tendon?',
 'q-e585e7e027f9': 'Which movement is weakened by rupture of the calcaneal (Achilles) tendon?'
};
function parseInlineChoices(stem){
 const matches=[...stem.matchAll(/(?:\s*-\s*)?(?:\b([a-e])\.\s+|([a-e])\)\s*)/gi)];
 if(matches.length<3||matches.length>5||matches.some((m,i)=>(m[1]||m[2]).toUpperCase()!=='ABCDE'[i]))return null;
 const prompt=stem.slice(0,matches[0].index).trim().replace(/^\*\*|\*\*$/g,'');
 if(!genuinePrompt(prompt))return null;
 const options=matches.map((m,i)=>({label:(m[1]||m[2]).toUpperCase(),text:stem.slice(m.index+m[0].length,matches[i+1]?.index??stem.length).trim().replace(/\s+-\s*$/,'')}));
 if(options.some(o=>!o.text))return null;
 return {stem:prompt,options};
}
export function prepareLearningQuestion(source){
 const q={...source,options:(source.options||[]).map(o=>({...o}))};
 const changes=[],extracted=[],blocked=[];
 const edit=getReviewedEdit(source);
 if(edit){
  if(edit.type)q.type=edit.type;
  if(edit.stem!==undefined){extracted.push({field:'original_stem',text:q.stem});q.stem=edit.stem;changes.push('reviewed_stem_correction');}
  if(edit.options!==undefined){extracted.push({field:'original_options',text:JSON.stringify(q.options)});q.options=edit.options.map(o=>({...o}));changes.push('reviewed_choice_correction');}
  if(edit.subject)q.editorialReview={subject:edit.subject,topic:edit.topic};
  if(edit.blocked)blocked.push(...edit.blocked);
 }
 let stem=String(q.stem||'').trim();
 if(/^\s*(?:\d+[.)]?\s*)?(?:the\s+answer\s+is|answers?\s*:|[a-e][.)]\s+.+?\s+ANSWER\s*:)/i.test(stem))blocked.push('answer_only_import');
 if(/\bItem Number\s*:\s*\d+\s+correct answer\s*:/i.test(stem))blocked.push('answer_catalogue_without_question');
 if(explicitInline[q.id]&&!edit?.stem){
  extracted.push({field:'stem',text:stem});stem=explicitInline[q.id];changes.push('reviewed_inline_answer_removed');
  if(q.options.length)blocked.push('mixed_recall_notes_need_reconstruction');
 }
 // Some imports contain only the keyed choice after a complete question.
 const starred=/\s+([A-EАВСЕД])[.)]\s*\*\s*([^*]+)$/.exec(stem);
 if(starred&&genuinePrompt(stem.slice(0,starred.index))&&stem.slice(0,starred.index).includes('?')){
  extracted.push({field:'stem',text:stem.slice(starred.index)});
  const label=({А:'A',В:'B',С:'C',Е:'E',Д:'D'})[starred[1]]||starred[1];
  if(q.options.length&&!q.options.some(o=>o.label===label)){
   q.options.push({label,text:starred[2].trim()});q.options.sort((a,b)=>a.label.localeCompare(b.label));
   changes.push('starred_choice_restored_without_key');
  }
  stem=stem.slice(0,starred.index).trim();changes.push('starred_source_answer_removed');
 }
 const match=marker.exec(stem);
 if(match){
  const prefix=stem.slice(0,match.index).trim(),suffix=stem.slice(match.index);
  if(genuinePrompt(prefix)){
   // More subquestions after an answer need editorial reconstruction; don't silently erase them.
   if(/\?/.test(suffix)||/\b(?:List|Outline|Describe|Explain|How are you|What is)\b/i.test(suffix.replace(/^.*?:/,'')))blocked.push('interleaved_questions_and_answers');
   else {stem=prefix;extracted.push({field:'stem',text:suffix});changes.push('explicit_answer_suffix_removed');}
  }else blocked.push('answer_fragment_without_complete_prompt');
 }
 // Inline web MCQs often arrived as one free-response string.
 const inline=parseInlineChoices(stem);
 if(inline&&q.options.length===0){stem=inline.stem;q.options=inline.options;q.type='Single Best Answer MCQ';changes.push('inline_choices_separated');}
 // A solution can start in the last option and continue as duplicate option labels.
 let solutionStarted=false;
 const options=[];
 for(const o of q.options){
  if(solutionStarted){extracted.push({field:'option-'+o.label,text:o.text});continue;}
  if(options.some(p=>p.label===o.label)&&/^\s*is (?:the )?correct\b/i.test(o.text)){
   solutionStarted=true;extracted.push({field:'option-'+o.label,text:o.text});changes.push('repeated_keyed_choice_explanation_removed');continue;
  }
  const hit=marker.exec(String(o.text||''));
  if(hit){
   const before=o.text.slice(0,hit.index).trim();
   const tail=o.text.slice(hit.index);
   // An instruction to select an answer is not a supplied answer.
   if(/\b(?:select|choose|most appropriate)\s+(?:the\s+)?(?:correct\s+)?answer\s*:\s*$/i.test(o.text)){options.push(o);continue;}
   extracted.push({field:'option-'+o.label,text:tail});solutionStarted=true;changes.push('option_solution_removed');
   if(before)options.push({...o,text:before});
  }else options.push(o);
 }
 q.options=options;
 // Explicit correctness decorations must never give away a choice.
 q.options=q.options.map(o=>{
  const text=o.text.replace(/^\s*\*(?!\*)\s*/,'').replace(/\s*(?:[✓✔☑]|\(\s*(?:correct(?:\s+answer)?|answer)\s*\)|\[\s*correct\s*\])\s*/gi,' ').trim();
  if(text!==o.text){changes.push('choice_correctness_annotation_removed');extracted.push({field:'option-'+o.label,text:o.text});}
  return {...o,text};
 });
 if(/^\s*\d*\s*(?:UPPER\s*)?[a-e][.)]?\s*The statement is correct|^\s*\d+\s+[a-e]\s+The .+?jerk|\bExplanations\s*$/i.test(stem))blocked.push('explanation_page_import');
 if(!genuinePrompt(stem)&&changes.length&&!q.options.length)blocked.push('incomplete_prompt_after_cleanup');
 if(new Set(q.options.map(o=>o.label)).size!==q.options.length)blocked.push('interleaved_or_duplicate_option_labels');
 q.stem=stem;
 q.editorialBlockedReasons=[...new Set(blocked)];
 q.presentationChanges=[...new Set(changes)];
 return {question:q,changes:q.presentationChanges,extracted,blocked:q.editorialBlockedReasons,answer:edit?.answer||null};
}
export function prepareLearningBank(source){
 const answers={...(source.answers||{})};
 const questions=source.questions.map(q=>{
  const p=prepareLearningQuestion(q);
  if(p.answer)answers[q.id]=p.answer;
  if(p.blocked.length)delete answers[q.id];
  const a=answers[q.id],options=p.question.options;
  if(a&&options.length){
   const keys=Array.isArray(a.correct)?a.correct:[a.correct];
   if(!keys.length||keys.some(k=>!options.some(o=>o.label===k)))delete answers[q.id];
  }
  return p.question;
 });
 return {questions,answers};
}

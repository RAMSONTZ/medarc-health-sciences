/**
 * Evaluate against a prepared provisional answer, never an imported source key.
 * This is a user-interface comparison, not a claim of clinical verification.
 */
export function evaluateAnswer(answer, selection, {written=false, multiple=false}={}) {
  if (written) return {status: 'self_assess',matches:null};
  const key=answer?.correct;
  if (!answer || key===undefined || key===null || key==='' || (Array.isArray(key)&&key.length===0)) {
    return {status:'unscored',matches:null};
  }
  if (multiple || Array.isArray(key)) {
    if (!Array.isArray(selection) || !Array.isArray(key)) return {status:'unscored',matches:null};
    const chosen=new Set(selection), expected=new Set(key);
    const equal=chosen.size===selection.length && expected.size===key.length && chosen.size===expected.size && [...chosen].every(x=>expected.has(x));
    return {status:equal?'matches_prepared_key':'differs_from_prepared_key',matches:equal};
  }
  if (typeof selection!=='string' || selection==='') return {status:'not_selected',matches:null};
  const same=selection===key;
  return {status:same?'matches_prepared_key':'differs_from_prepared_key',matches:same};
}

/** Color only usable graded choices; unkeyed responses stay neutral. */
export function optionFeedback(answer,label,selection,{checked=false,multiple=false}={}){
  if(!checked)return '';
  const result=evaluateAnswer(answer,selection,{multiple});
  if(result.matches===null)return '';
  const expected=Array.isArray(answer.correct)?answer.correct:[answer.correct];
  if(expected.includes(label))return 'option-correct';
  const selected=Array.isArray(selection)?selection.includes(label):selection===label;
  return selected?'option-incorrect':'';
}

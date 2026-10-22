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

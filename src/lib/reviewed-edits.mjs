import {createHash} from 'node:crypto';
import {KEY_ONLY_EDITS} from './answer-key-edits.mjs';
import {REVIEWED_EDITS} from './reviewed-question-edits.mjs';
export function getReviewedEdit(question){
 const edit=REVIEWED_EDITS[question?.id];
 if(!edit){
  const keyEdit=KEY_ONLY_EDITS[question?.id];
  return keyEdit&&question.stem===keyEdit.sourceStem&&JSON.stringify(question.options||[])===JSON.stringify(keyEdit.sourceOptions)?keyEdit:null;
 }
 const hash=createHash('sha256').update(JSON.stringify([question.stem,question.options||[]])).digest('hex');
 return hash===edit.sourceHash?edit:null;
}

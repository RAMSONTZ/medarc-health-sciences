import {createHash} from 'node:crypto';
import {REVIEWED_EDITS} from './reviewed-question-edits.mjs';
export function getReviewedEdit(question){
 const edit=REVIEWED_EDITS[question?.id];
 if(!edit)return null;
 const hash=createHash('sha256').update(JSON.stringify([question.stem,question.options||[]])).digest('hex');
 return hash===edit.sourceHash?edit:null;
}

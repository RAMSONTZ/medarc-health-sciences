import fs from 'node:fs';
import path from 'node:path';
const bank=JSON.parse(fs.readFileSync(path.join(process.cwd(),'data/bank.json'),'utf8'));
const byId=new Map(bank.questions.map(q=>[q.id,q]));
const summary={totalQuestions:bank.questions.length,exams:bank.exams.length,answerRecords:0,writtenModelAnswers:0,mcqAnswerRecords:0,invalidChoiceMappings:0,missingExplanations:0,incompleteOptionRationales:0};
for(const [id,answer] of Object.entries(bank.answers||{})){
  const q=byId.get(id);summary.answerRecords++;
  if(!q)throw new Error(`Answer ${id} has no source record`);
  if(!answer.explanation?.trim())summary.missingExplanations++;
  if(!(q.options||[]).length){summary.writtenModelAnswers++;continue;}
  summary.mcqAnswerRecords++;
  const labels=new Set(q.options.map(o=>o.label));
  const correct=Array.isArray(answer.correct)?answer.correct:[answer.correct];
  if(correct.some(x=>!labels.has(x)))summary.invalidChoiceMappings++;
  const reasons=answer.optionReasons||answer.optionRationales||{};
  if([...labels].some(x=>!reasons[x]))summary.incompleteOptionRationales++;
}
summary.unanswered=summary.totalQuestions-summary.answerRecords;
summary.clinicallyVerified=0; // No clinician sign-off is documented in this release.
summary.releaseStatus='Source-code QA only; production build and clinical review pending';
console.log(JSON.stringify(summary,null,2));
if(summary.invalidChoiceMappings||summary.missingExplanations)process.exit(1);

import fs from 'node:fs';
import path from 'node:path';
import {assessQuestionQuality} from '../src/lib/question-quality.mjs';
const root=path.resolve(import.meta.dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const reasons={},examples={},statuses={usable:0,review:0,quarantined:0};
const quarantinedIds=[],needsReviewIds=[];
for(const q of data.questions){
  const finding=assessQuestionQuality(q);
  statuses[finding.status]++;
  if(finding.status==='quarantined')quarantinedIds.push(q.id);
  if(finding.status==='review')needsReviewIds.push(q.id);
  for(const k of [...finding.reasons,...finding.review]){
    reasons[k]=(reasons[k]||0)+1;
    if(!examples[k])examples[k]=[];
    if(examples[k].length<8)examples[k].push(q.id);
  }
}
const audit={
  date:new Date().toISOString(),
  source:{questions:data.questions.length,exams:data.exams.length,provisionalAnswers:Object.keys(data.answers||{}).length},
  statuses,reasons,exampleIdsByReason:examples,
  quarantineIds:quarantinedIds,
  manualReviewIds:needsReviewIds,
  policy:'Source preserved; only rule-detected corruption hidden from learner practice. This does not certify medical correctness.'
};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports/question-bank-quality.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({source:audit.source,statuses,reasons,exampleIdsByReason:examples,output:'reports/question-bank-quality.json'},null,2));
if(!statuses.usable&&!statuses.review)process.exitCode=1;

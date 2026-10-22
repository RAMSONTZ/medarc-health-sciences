import fs from 'node:fs';
import path from 'node:path';
import {resolveQuestionDepartment,isClinicalManagementQuestion} from '../src/lib/department-routing.mjs';
const root=path.resolve(import.meta.dirname,'..');
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const originalCounts={},resolvedCounts={},reasons={},originToDestination={},examples=[],review=[];
let reassigned=0,anatomyTherapeuticLeaks=0;
for(const q of bank.questions){
 const original=q.subject||'Unclassified Health Sciences';
 originalCounts[original]=(originalCounts[original]||0)+1;
 const routed=resolveQuestionDepartment(q);
 resolvedCounts[routed.subject]=(resolvedCounts[routed.subject]||0)+1;
 if(routed.reassigned){
  reassigned++;
  reasons[routed.reason]=(reasons[routed.reason]||0)+1;
  const key=original+' → '+routed.subject;
  originToDestination[key]=(originToDestination[key]||0)+1;
  if(examples.length<100)examples.push({id:q.id,original,routed:routed.subject,reason:routed.reason,stem:String(q.stem||'').slice(0,260)});
 }
 if(routed.review)review.push({id:q.id,original,routed:routed.subject,stem:String(q.stem||'').slice(0,230)});
 if(routed.subject==='Human Anatomy' && isClinicalManagementQuestion(q))anatomyTherapeuticLeaks++;
}
const report={
 source:{questions:bank.questions.length,exams:bank.exams.length,provisionalAnswers:Object.keys(bank.answers||{}).length},
 departmentCount:Object.keys(originalCounts).length,reassigned,needsDepartmentReview:review.length,
 anatomyTherapeuticLeaks,originalCounts,resolvedCounts,reasons,
 topCrossDepartmentMovements:Object.entries(originToDestination).sort((a,b)=>b[1]-a[1]).slice(0,45),
 examples:examples.slice(0,80),manualReview:review
};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports/department-routing.json'),JSON.stringify(report,null,2));
console.log('SUBJECT_INTEGRITY_AUDIT='+JSON.stringify({
 departmentCount:report.departmentCount,reassigned,needsDepartmentReview:review.length,anatomyTherapeuticLeaks,
 reasons,topCrossDepartmentMovements:report.topCrossDepartmentMovements,
 anatomyExamples:examples.filter(x=>x.original==='Human Anatomy').slice(0,30),
 reviewExamples:review.slice(0,15),
 report:'reports/department-routing.json'
}));
if(anatomyTherapeuticLeaks)process.exit(1);

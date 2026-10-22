import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
test('group exams are available in homepage and work on an independent app route',()=>{
  assert.match(source('src/app/page.jsx'),/href:'\/group-exams'/);
  assert.match(source('src/app/group-exams/page.jsx'),/GroupExamStudio/);
  assert.match(source('src/components/GroupExamStudio.jsx'),/Create exam and generate credentials/);
});
test('leader alone cannot start the timer; administrator-only action is protected on server',()=>{
  const src=source('src/lib/group-exams.js');
  assert.match(src,/identity.role!=='admin'/);
  assert.match(src,/Only the administrator can start the exam/);
  assert.match(src,/p.ready AND p.joined_at IS NOT NULL/);
  assert.match(src,/SET status='running',starts_at=now\(\),ends_at=now\(\)/);
});
test('all group responses use persistent database constraints and server time',()=>{
  const src=source('src/lib/group-exams.js');
  assert.match(src,/medarc_group_rooms/);
  assert.match(src,/medarc_group_questions/);
  assert.match(src,/medarc_group_participants/);
  assert.match(src,/medarc_group_answers/);
  assert.match(src,/ON CONFLICT\(participant_id,question_id\)/);
  assert.match(src,/now\(\)<r.ends_at/);
});
test('competitive ranking requires independently clinically verified answer keys',()=>{
  const src=source('src/lib/group-exams.js');
  assert.match(src,/keyVerified===true/);
  assert.match(src,/reviewStatus==='clinically_verified'/);
  assert.match(src,/mode==='scored'/);
  assert.match(src,/ranked:room.mode==='scored'/);
});
test('participants receive same shared question IDs shuffled by identity',()=>{
 const src=source('src/lib/group-exams.js');
 assert.match(src,/chosen\.map\(\(q,i\)/);
 assert.match(src,/digest\(member.id\+':'\+a.question_id\)/);
 assert.match(src,/session_hash/);
});
test('exam POST and GET handlers do not cache authentication or results',()=>{
 const files=['src/app/api/group-exams/route.js','src/app/api/group-exams/[code]/route.js'];
 files.forEach(file=>assert.match(source(file),/Cache-Control.*no-store/));
 assert.match(source(files[1]),/authenticate\(room,request\)/);
});

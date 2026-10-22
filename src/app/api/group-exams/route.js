import {NextResponse} from 'next/server';
import {createGroup,groupExamSubjects} from '@/lib/group-exams';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
export async function GET(){
 try{return NextResponse.json({subjects:groupExamSubjects()},{headers:noStore});}
 catch{ return NextResponse.json({error:'Group exams temporarily unavailable'}, {status:503,headers:noStore});}
}
export async function POST(request){
 try{
  const input=await request.json();
  const origin=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unidentified';
  const result=await createGroup(input,origin);
  return NextResponse.json(result,{status:201,headers:noStore});
 }catch(error){
  const msg=String(error.message||'Could not create exam.');
  const bad=/required|not enough|unknown|choose|too many rooms/i.test(msg);
  return NextResponse.json({error:bad?msg:'Exam room could not be created.'},{status:bad?422:503,headers:noStore});
 }
}

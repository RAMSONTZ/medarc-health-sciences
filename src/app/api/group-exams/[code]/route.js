import {NextResponse} from 'next/server';
import {loadGroup,authenticate,loginGroup,groupState,groupAction} from '@/lib/group-exams';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const error=(message,status=400)=>NextResponse.json({error:message},{status,headers:noStore});
export async function GET(request,{params}){
 try{
  const {code}=await params,room=await loadGroup(code);
  if(!room)return error('Exam code not found.',404);
  const identity=await authenticate(room,request);
  const state=await groupState(room,identity);
  return NextResponse.json(state,{headers:noStore});
 }catch{return error('Could not load examination room.',503);}
}
export async function POST(request,{params}){
 try{
  const {code}=await params,room=await loadGroup(code);
  if(!room)return error('Exam code not found.',404);
  const input=await request.json();
  if(input.action==='join'){
   const result=await loginGroup(room,input);
   return NextResponse.json(result,{headers:noStore});
  }
  const identity=await authenticate(room,request);
  if(identity.role==='guest')return error('Unauthorized examination session.',401);
  const result=await groupAction(room,identity,input);
  return NextResponse.json(result,{headers:noStore});
 }catch(err){
  const message=String(err.message||'Examination action failed.');
  if(/Only|Invalid|Incorrect|ready|start|submitted|ended|exam|room|access|lobby|unknown|attempt|participant|question|response|long|timer/i.test(message))
   return error(message,400);
  return error('Examination action unavailable.',503);
 }
}

import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getExam} from '@/lib/bank';
import {QuestionCard} from '@/components/QuestionCard';
import {Icon} from '@/components/Icons';
export default async function Page({params,searchParams}){
 const {id}=await params;const p=await searchParams;const data=getExam(id,p?.question);if(!data)notFound();
 const {exam,question,pos}=data;
 return <div><Link href="/exams" className="back-link">← All exam collections</Link><div className="section-title-row"><div><span className="eyebrow">ORIGINAL EXAM SET</span><h1 className="page-title">{exam.title}</h1><p className="page-lead">{exam.subject} · Question {pos} of {exam.total}{exam.archivedTotal>exam.total&&<> · {exam.archivedTotal-exam.total} unrelated or unreadable source questions excluded from this subject-specific practice set</>}</p></div><span className="count-chip">{Math.round(100*pos/Math.max(1,exam.total))}% browsed</span></div><div className="exam-progress"><div style={{width:`${Math.round(100*pos/Math.max(1,exam.total))}%`}}/></div><div className="exam-detail">{question?<QuestionCard key={question.id} question={question} index={pos}/>:<div className="empty-state">This exam record is currently unreadable.</div>}<div className="pagination exam-pagination">{pos>1?<Link className="page-button" href={`/exams/${encodeURIComponent(exam.id)}?question=${pos-1}`}>← Previous question</Link>:<span className="page-button is-disabled">Previous question</span>}<span>Question {pos} / {exam.total}</span>{pos<exam.total?<Link className="page-button" href={`/exams/${encodeURIComponent(exam.id)}?question=${pos+1}`}>Next question <Icon name="arrow" size={16}/></Link>:<Link className="page-button" href="/exams">Finish collection <Icon name="check" size={16}/></Link>}</div></div></div>;
}

import Link from 'next/link';
import {getExams,getBank} from '@/lib/bank';
import {Pagination} from '@/components/Pagination';
import {Icon} from '@/components/Icons';
export const metadata={title:'Exam collections'};
export default async function Page({searchParams}){const p=await searchParams;const data=getExams(p);const b=getBank();return <div><div className="section-title-row"><div><span className="eyebrow">EXAM ARCHIVE</span><h1 className="page-title">Original exam collections.</h1><p className="page-lead">The complete source examination structure, easier to find, browse, and practice.</p></div><div className="count-chip">{b.exams.length.toLocaleString()} sets retained</div></div>
  <form action="/exams" className="exam-searchbar"><div><Icon name="search" size={20}/><input type="search" aria-label="Search examinations" name="q" placeholder="Search examination title..." defaultValue={p?.q||''}/></div><select name="subject" defaultValue={p?.subject||''} aria-label="Filter exam subject"><option value="">All subjects</option>{b.examSubjects.map(s=><option key={s} value={s}>{s}</option>)}</select><button type="submit" className="button button-primary">Search <Icon name="arrow" size={16}/></button></form>
  <div className="list-summary"><span><b>{data.count.toLocaleString()}</b> matching examination sets</span><Link href="/practice">Question practice <Icon name="arrow" size={17}/></Link></div>
  <div className="exam-grid">{data.exams.map((e,i)=><Link key={e.id} href={`/exams/${encodeURIComponent(e.id)}`} className="exam-card"><div className="exam-card-head"><span>COLLECTION {String((data.page-1)*16+i+1).padStart(3,'0')}</span><Icon name="arrow" size={17}/></div><div className="exam-subject">{e.subject||'Medical sciences'}</div><h3>{e.title}</h3><div className="exam-card-bottom"><span><Icon name="book" size={16}/> {e.count} questions</span><span>Open exam <Icon name="chevron" size={15}/></span></div></Link>)}</div>
  <Pagination basePath="/exams" page={data.page} pages={data.pages} count={data.count} query={{q:p?.q||'',subject:p?.subject||''}}/>
 </div>}

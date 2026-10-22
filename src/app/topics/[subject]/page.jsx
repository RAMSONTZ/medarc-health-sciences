import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getSubjectTopics} from '@/lib/bank';
import {Icon} from '@/components/Icons';
export const dynamic='force-dynamic';
export default async function SubjectTopicsPage({params}){
 const {subject:raw}=await params;
 const data=getSubjectTopics(decodeURIComponent(raw));
 if(!data)notFound();
 return <main className="medarc-topic-explorer">
  <Link className="back-link" href="/topics">← All departments</Link>
  <div className="section-title-row">
    <div><span className="eyebrow">MEDARC · ACADEMIC SUBJECTS</span>
      <h1 className="page-title">{data.subject}</h1>
      <p className="page-lead">Choose an academic topic, then practise only questions classified within this department. Uncertain imports are marked for editorial review.</p></div>
    <div className="count-chip">{data.count.toLocaleString()} unique readable questions</div>
  </div>
  <section className="topic-section">
   <div className="section-heading"><div><span className="eyebrow">CURATED TOPIC LIBRARY</span><h2>Learn by topic</h2><p>{data.topics.length} categorized areas · {data.review.toLocaleString()} questions still need placement or academic review</p></div>
    <Link className="text-action" href={'/practice?subject='+encodeURIComponent(data.subject)}>Practise entire subject <Icon name="arrow" size={16}/></Link></div>
   <div className="topic-card-grid">
    {data.topics.map(item=><Link key={item.name} className="topic-card" href={'/practice?subject='+encodeURIComponent(data.subject)+'&topic='+encodeURIComponent(item.name)}>
      <span className="topic-card-top"><Icon name={item.name==='Topic review required'?'shield':'book'} size={19}/><Icon name="arrow" size={17}/></span>
      <strong>{item.name==='Topic review required'?'Awaiting academic classification':item.name}</strong>
      <small>{item.count.toLocaleString()} questions{item.review?' · '+item.review+' for review':''}</small>
    </Link>)}
   </div>
  </section>
 </main>;
}

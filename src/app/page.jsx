import Link from 'next/link';
import {getStats,getTopicGroups,getBank} from '@/lib/bank';
import {Icon} from '@/components/Icons';
import {StudyFocus} from '@/components/StudyFocus';
import {LearningGallery,LearningMoment,moments} from '@/components/MedArcVisual';
export const metadata={title:'Overview'};
const features=[
 {name:'Question practice',description:'Review clinical questions in a distraction-free studio.',icon:'book',href:'/practice',action:'Start learning'},
 {name:'Explore subjects',description:'Anatomy, physiology, pharmacology and clinical sciences.',icon:'grid',href:'/topics',action:'Browse subjects'},
 {name:'Exam collections',description:'Practice the original examination sets with source IDs intact.',icon:'clipboard',href:'/exams',action:'Open exams'},
 {name:'Anatomy lab',description:'Explore visual anatomy and interactive specimen practice.',icon:'layers',href:'/anatomy',action:'Open anatomy'},
 {name:'Answers & explanations',description:'Study provisional reasoning with clear verification labels.',icon:'check',href:'/answers',action:'Review answers'},
 {name:'Quality audit',description:'Check source completeness, pending keys and review status.',icon:'chart',href:'/review',action:'See data quality'}
];
export default function Home(){
 const s=getStats(),b=getBank(),topSubjects=b.subjectCounts.slice(0,8);
 return <div className="medarc-home">
  <div className="dashboard-eyebrow"><span className="live-dot"/> MADE FOR MEDICAL STUDENTS <span className="dot-sep">/</span> MEDARC HEALTH SCIENCES</div>
  <section className="medarc-welcome" aria-label="Welcome to MedArc">
    <div className="medarc-welcome-copy"><span className="eyebrow">LEARN TOGETHER. THINK CLINICALLY.</span>
      <h1>Medical learning,<br/><em>made clearer.</em></h1>
      <p>Build your confidence in foundational sciences, clinical practice and exams — at your own pace.</p>
      <div className="medarc-hero-actions"><Link className="button button-primary" href="/practice">Start question practice <Icon name="arrow" size={17}/></Link><Link className="button button-outline" href="/topics">Browse subjects</Link></div>
      <span className="medarc-welcome-note">Real study progress. Thoughtful feedback. No false scoring.</span>
    </div>
    <img className="medarc-welcome-people" src="/medarc/hero-students.png" alt="A smiling, diverse group of African medical students with textbooks, stethoscopes and anatomy models" width="1448" height="1086" fetchPriority="high"/>
  </section>
  <div className="medarc-statline" aria-label="MedArc library statistics">
    <div><strong>{s.questions.toLocaleString()}</strong><span>Original question records</span></div>
    <div><strong>{s.exams.toLocaleString()}</strong><span>Exam collections</span></div>
    <div><strong>{s.answered.toLocaleString()}</strong><span>Provisional answer mappings</span></div>
    <p>Some imported records require cleaning. Unverified answers are never presented as clinically approved.</p>
  </div>
  <StudyFocus/>
  <div className="section-heading medarc-quick-heading"><div><span className="eyebrow">EVERYTHING IN ONE PLACE</span><h2>Where would you like to begin?</h2><p>Choose an area below — all sections open directly.</p></div></div>
  <div className="feature-grid medarc-feature-grid">{features.map((f,i)=><Link href={f.href} className={'feature-card feature-'+(i+1)} key={f.name}><span className="medarc-feature-thumb"><LearningMoment moment={moments[[0,1,7,6,8,12][i]]}/></span><div className="feature-lower"><h3>{f.name}</h3><p>{f.description}</p><span className="feature-cta">{f.action} <Icon name="arrow" size={15}/></span></div></Link>)}</div>
  <section className="medarc-study-band"><div className="medarc-study-copy"><span className="eyebrow">COLLABORATIVE STUDY</span><h2>Better learning happens <em>together.</em></h2><p>Practice individual questions, compare your clinical reasoning and discover challenging topics with friends.</p><Link className="button button-primary" href="/practice">Open question studio <Icon name="arrow" size={16}/></Link></div><img src="/medarc/hero-discussion.png" width="1448" height="1086" alt="African medical students in a collaborative anatomy and medicine group discussion" loading="lazy"/></section>
  <div className="bottom-dashboard medarc-subjects"><section className="editorial-panel"><div className="section-heading"><div><span className="eyebrow">FIND YOUR DISCIPLINE</span><h2>Popular subjects</h2></div><Link href="/topics" className="text-action">All subjects <Icon name="arrow" size={16}/></Link></div><div className="subject-rows">{topSubjects.map(([name,count],i)=><Link href={'/practice?subject='+encodeURIComponent(name)} key={name} className="subject-row"><span className="subject-rank">{String(i+1).padStart(2,'0')}</span><span className="subject-name">{name}</span><span className="subject-count">{count.toLocaleString()} questions</span><Icon name="arrow" size={16}/></Link>)}</div></section>
  <section className="medarc-discovery"><span className="eyebrow">YOUR LEARNING JOURNEY</span><LearningMoment moment={moments[14]}/><h3>Learn something new today.</h3><p>Every question is a chance to improve your reasoning. Keep going — progress is built over time.</p><Link href="/anatomy" className="text-action">Explore the anatomy lab <Icon name="arrow" size={16}/></Link></section></div>
  <LearningGallery/>
 </div>;
}

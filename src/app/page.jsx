import Link from 'next/link';
import {getStats,getTopicGroups,getBank} from '@/lib/bank';
import {Icon} from '@/components/Icons';
import {StudyFocus} from '@/components/StudyFocus';
import {LEARNING_VISUALS} from '@/lib/learningVisuals';
export const metadata={title:'Overview'};
const primaryDestinations=[
 {href:'/practice',title:'Practice questions',desc:'Build clinical recall',image:'/medarc/visuals/01_welcome_medical_student.webp',alt:'African medical student holding textbooks'},
 {href:'/topics',title:'Explore subjects',desc:'Learn across disciplines',image:'/medarc/visuals/02_collaborative_study.webp',alt:'Medical students discussing a topic'},
 {href:'/answers',title:'Review explanations',desc:'Reflect on your answers',image:'/medarc/visuals/08_pharmacology_revision.webp',alt:'Medical student reviewing textbooks'},
 {href:'/exams',title:'Exam collections',desc:'Prepare at your own pace',image:'/medarc/visuals/19_study_milestone_success.webp',alt:'Student celebrating study progress'},
 {href:'/anatomy',title:'Anatomy lab',desc:'Understand human structure',image:'/medarc/visuals/07_skeleton_anatomy_student.webp',alt:'Student studying the human skeleton'},
 {href:'/visual-learning',title:'Visual learning',desc:'Explore all 20 illustrations',image:'/medarc/visuals/03_microscope_learning.webp',alt:'Student working with a microscope'}
];
const studyScenes=LEARNING_VISUALS.slice(3,15).filter(v=>!['05_clinical_simulation','08_pharmacology_revision','07_skeleton_anatomy_student'].some(id=>v.id.startsWith(id))).slice(0,7);
const features=[
 {name:'Question practice',description:'Practice by specialty, topic, and examination format.',icon:'book',href:'/practice',action:'Start practice'},
 {name:'Explore subjects',description:'A cleaner hierarchy of foundational and clinical sciences.',icon:'grid',href:'/topics',action:'Browse library'},
 {name:'Exam collections',description:'All original examinations, preserved and searchable.',icon:'clipboard',href:'/exams',action:'View collections'},
];
export default function Home(){
 const s=getStats(),groups=getTopicGroups(),b=getBank();
 const topSubjects=b.subjectCounts.slice(0,8);
 return <div>
  <div className="dashboard-eyebrow"><span className="live-dot"/>YOUR LEARNING DESK <span className="dot-sep">/</span> MEDARC V2</div>
  <div className="dashboard-welcome"><div><h1>Study with <em>clarity.</em></h1><p>A thoughtful, focused space for medical science — built around the material you already have.</p></div><Link href="/practice" className="button button-outline welcome-link">Go to question studio <Icon name="arrow" size={17}/></Link></div>
  <section className="hero-banner medarc-hero" aria-label="Medical learning home"><div className="hero-photo" role="img" aria-label="A group of African medical students standing together with learning materials"/><div className="hero-shade"/><div className="hero-copy"><span className="hero-kicker">MEDICAL LEARNING. REIMAGINED.</span><h2>Knowledge that<br/><em>moves you forward.</em></h2><p>From basic sciences to clinical practice, everything you need to study is organized with purpose.</p><div className="hero-actions"><Link href="/practice" className="button button-light">Continue studying <Icon name="arrow" size={17}/></Link><Link href="/topics" className="hero-text-link">Explore topics <Icon name="arrow" size={15}/></Link></div></div><div className="hero-number"><strong>MEDARC</strong><span>LEARN TOGETHER</span></div></section>
  <nav className="medarc-home-links medarc-home-visual-links" aria-label="Choose a MedArc learning activity">{primaryDestinations.map(item=><Link key={item.href} href={item.href} className="medarc-home-link medarc-learning-route"><span className="medarc-route-image"><img src={item.image} alt={item.alt} width="160" height="150" loading="lazy"/></span><span className="medarc-route-copy"><strong>{item.title}</strong><small>{item.desc}</small></span><Icon name="arrow" size={17}/></Link>)}</nav>
  <div className="stat-strip"><div><span>TOTAL QUESTION RECORDS</span><strong>{s.questions.toLocaleString()}</strong><small>Full question library</small></div><div><span>PREPARED EXPLANATIONS</span><strong>{s.answered.toLocaleString()}</strong><small>Provisional academic answers</small></div><div><span>ORIGINAL EXAM SETS</span><strong>{s.exams.toLocaleString()}</strong><small>Exam collections retained</small></div><div className="stat-aside"><span>CONTENT QUALITY</span><b>Accuracy first.</b><small>Unanswered questions are visible, but never falsely graded.</small></div></div>
  <StudyFocus/>
  <section className="medarc-home-scenes" aria-label="Study illustrated clinical skills">
    <div className="section-heading"><div><span className="eyebrow">VISUAL LEARNING</span><h2>Learn it. See it. Practise it.</h2><p>Choose a clinical scene to open related questions and topics.</p></div><Link className="text-action" href="/visual-learning">See all 20 visuals <Icon name="arrow" size={16}/></Link></div>
    <div className="medarc-scene-scroll">{studyScenes.map(visual=><Link key={visual.id} href={visual.href} className="medarc-study-scene" aria-label={visual.title+' – open related learning'}><span className="medarc-study-scene-art"><img src={visual.src} alt={visual.alt} loading="lazy" width="220" height="185"/></span><strong>{visual.title}</strong><span>Explore <Icon name="arrow" size={13}/></span></Link>)}</div>
  </section>
  <div className="section-heading"><div><span className="eyebrow">YOUR LIBRARY</span><h2>Find your starting point.</h2></div><Link href="/topics" className="text-action">View all subjects <Icon name="arrow" size={17}/></Link></div>
  <div className="feature-grid">{features.map((f,i)=><Link href={f.href} className={`feature-card feature-${i+1}`} key={f.name}><div className="feature-top"><span className="feature-icon"><Icon name={f.icon} size={23}/></span><Icon name="arrow" size={19}/></div><div className="feature-lower"><h3>{f.name}</h3><p>{f.description}</p><span className="feature-cta">{f.action}<Icon name="arrow" size={15}/></span></div></Link>)}</div>
  <div className="bottom-dashboard"><section className="editorial-panel"><div className="section-heading"><div><span className="eyebrow">BROWSE BY SPECIALTY</span><h2>Most studied subjects</h2></div></div><div className="subject-rows">{topSubjects.map(([name,count],i)=><Link href={`/practice?subject=${encodeURIComponent(name)}`} key={name} className="subject-row"><span className="subject-rank">{String(i+1).padStart(2,'0')}</span><span className="subject-name">{name}</span><span className="subject-count">{count.toLocaleString()} questions</span><Icon name="arrow" size={16}/></Link>)}</div></section>
   <section className="photo-editorial"><div className="photo-editorial-image" role="img" aria-label="African medical students collaborating around anatomy models and textbooks"/><div className="photo-editorial-inner"><span>CURATED FOR HEALTH PROFESSIONALS</span><h3>One library.<br/><em>Every discipline.</em></h3><Link href="/topics">See the complete index <Icon name="arrow" size={17}/></Link></div></section></div>
 </div>;
}

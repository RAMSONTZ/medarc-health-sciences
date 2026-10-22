import Link from 'next/link';
import {LEARNING_VISUALS} from '@/lib/learningVisuals';
export const metadata={
 title:'Visual learning',
 description:'Medical-student learning scenes and motivation, with links to MedArc question practice.'
};
export default function VisualLearning(){
 return <div className="visual-learning-page">
  <header className="visual-learning-header">
   <div className="visual-learning-header-copy">
    <span className="eyebrow">MEDARC STUDY COMPANION</span>
    <h1>See it. Understand it. <em>Remember it.</em></h1>
    <p>Explore the medical sciences through welcoming learning scenes, then move into real questions from the MedArc library. These AI-generated illustrations are for learning atmosphere, not clinical diagnosis.</p>
    <div className="visual-head-actions"><Link href="/practice" className="button button-primary">Start practicing</Link><Link href="/topics" className="button button-outline">Browse subjects</Link></div>
   </div>
   <img src="/medarc/hero-discussion-group.png" alt="AI-generated African medical students discussing anatomy together" className="visual-learning-header-image" width="580" height="435"/>
  </header>
  <div className="section-heading"><div><span className="eyebrow">THE LEARNING GALLERY</span><h2>Twenty ways to keep learning.</h2><p>Choose a scene to open related questions or a learning workspace.</p></div><span className="topic-count">{LEARNING_VISUALS.length} illustrations</span></div>
  <div className="visual-lesson-grid">{LEARNING_VISUALS.map((visual,index)=>
   <Link key={visual.id} href={visual.href} className="visual-lesson-card" aria-label={visual.title+', open related MedArc learning'}>
    <div className="visual-lesson-art"><img src={visual.src} alt={visual.alt} loading={index<4?'eager':'lazy'} width="340" height="300"/></div>
    <div className="visual-lesson-description"><span>{visual.category}</span><h3>{visual.title}</h3><p>{visual.description}</p><strong>Open learning →</strong></div>
   </Link>
  )}</div>
  <p className="visual-disclaimer">Educational illustrations are AI-generated. They are not patient photographs, histology specimens, diagnostic imaging evidence, or clinically reviewed treatment material. Assessment explanations remain provisional until independently verified.</p>
 </div>;
}

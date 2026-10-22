import {getQuestions,getStats,getBank} from '@/lib/bank';
import {PracticeView} from '@/components/PracticeView';
import {AnatomyPractical} from '@/components/AnatomyPractical';
import {AnatomyVisualAtlas} from '@/components/AnatomyVisualAtlas';
import {PrivateAnatomyLibrary} from '@/components/PrivateAnatomyLibrary';
import anatomyCollection from '../../../data/anatomy-images.json';

export const metadata={title:'Visual anatomy atlas | MedArc',description:'Explore anatomy by body region, topic, and real specimens. Practice structure identification with annotated images.'};

export default async function Page({searchParams}){
 const params=await searchParams;
 const b=getBank(), stats=getStats();
 return <main className="mva-page">
   <AnatomyVisualAtlas/>
   <PrivateAnatomyLibrary/>
   <div className="mva-extras">
     <details id="anatomy-practical" className="mva-supplement"><summary><span>02 · Advanced practical</span><b>Create A/B/C marker questions on an image</b><small>Place precise arrows, record answers, and test anatomical identification.</small></summary><div className="mva-supplement-body"><AnatomyPractical images={anatomyCollection.images}/></div></details>
     <details className="mva-supplement"><summary><span>03 · Exam questions</span><b>Practice the original anatomy question bank</b><small>Search anatomy questions, review explanations, and continue your exam preparation.</small></summary><div className="mva-supplement-body"><PracticeView data={getQuestions(params,false,'Human Anatomy')} stats={stats} subjects={b.subjects} types={b.types} basePath="/anatomy" lockedSubject="Human Anatomy"/></div></details>
   </div>
 </main>
}
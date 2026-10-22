import {getQuestions,getStats,getBank} from '@/lib/bank';
import {PracticeView} from '@/components/PracticeView';
import {AnatomyPractical} from '@/components/AnatomyPractical';
import {AnatomySourceExplorer} from '@/components/AnatomySourceExplorer';
import anatomyCollection from '../../../data/anatomy-images.json';
import anatomySources from '../../../data/anatomy-collections.json';
export const metadata={title:'Anatomy image lab | MedArc'};
export default async function Page({searchParams}){
 const params=await searchParams; const b=getBank(); const stats=getStats();
 return <div><div className="anatomy-strip"><div><span className="eyebrow">ANATOMY STUDIO</span><h2>Learn structure.<br/><em>Understand function.</em></h2><p>Interactive identification and localization with lettered arrows. Original licensed anatomy images only; local private image practice is available before publication.</p></div><div className="anatomy-photo" role="img" aria-label="Real medical photography"/></div><AnatomySourceExplorer collections={anatomySources.collections}/><div id="anatomy-practical"><AnatomyPractical images={anatomyCollection.images}/></div><div className="anatomy-practice-heading"><span className="eyebrow">QUESTION PRACTICE</span><h2>Test your anatomy knowledge</h2><p>Original exam records remain distinct from the licensed image collection. Prepared answer keys are provisional pending academic review.</p></div><PracticeView data={getQuestions(params,false,'Human Anatomy')} stats={stats} subjects={b.subjects} types={b.types} basePath="/anatomy" lockedSubject="Human Anatomy"/></div>
}

import Link from 'next/link';
import {LEARNING_VISUALS} from '@/lib/learningVisuals';
export const moments=LEARNING_VISUALS.map(v=>[v.title,v.src,v.href]);
export function LearningMoment({moment,className=''}) {
 const [label,src]=moment||moments[0];
 return <img src={src} className={'medarc-scene '+className} alt={label} loading="lazy" width="350" height="300"/>;
}
export function LearningGallery(){
 return <details className="medarc-gallery"><summary><span><span className="eyebrow">VISUAL LEARNING LIBRARY</span><b>Explore 20 medical-learning scenes</b><small>Medical students, laboratories, clinical skills and positive study feedback</small></span><span className="medarc-gallery-action">Explore artwork +</span></summary>
 <div className="medarc-gallery-list">{moments.map((m,i)=><Link key={i} href={m[2]} className="medarc-gallery-tile"><LearningMoment moment={m}/><span>{m[0]}</span></Link>)}</div>
 <p className="medarc-gallery-disclaimer">AI-generated learning visuals are decorative and are not validated anatomical, diagnostic or clinical reference images.</p><p className="medarc-gallery-disclaimer"><Link className="text-action" href="/visual-learning">Open the full visual learning gallery →</Link></p></details>;
}
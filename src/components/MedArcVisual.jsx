import Link from 'next/link';
export const moments=[
 ['Your learning starts here','home',0],['Group study','home',1],['Microscopy','home',2],['Laboratory practice','home',3],['Clinical examination skills','home',4],
 ['Cardiac anatomy','home',5],['Skeletal anatomy','home',6],['Independent revision','home',7],['Skin anatomy','home',8],['Dermatology learning','home',9],
 ['Radiology study','home',10],['Resuscitation training','home',11],['Blood pressure skills','home',12],['Suturing practice','home',13],['Pediatrics learning','home',14],
 ['Keep learning','feedback',7],['Progress matters','feedback',8],['Try again','feedback',9],['Great effort','feedback',19],['You can do it','feedback',14]
];
export function LearningMoment({moment,className=''}) {
 const [label,sheet,cell]=moment||moments[0];const col=cell%5,row=Math.floor(cell/5);
 const url=sheet==='feedback'?'/medarc/education-feedback-sheet.png':'/medarc/clinical-students-sheet.png';
 return <span className={'medarc-scene '+className} role="img" aria-label={label} style={{backgroundImage:'url('+url+')',backgroundPosition:(col*25)+'% '+(row*100/3)+'%',backgroundSize:'500% 400%'}}/>;
}
export function LearningGallery(){
 return <details className="medarc-gallery"><summary><span><span className="eyebrow">VISUAL LEARNING LIBRARY</span><b>Explore 20 medical-learning scenes</b><small>African medical students, laboratory work, clinical skills and motivational moments</small></span><span className="medarc-gallery-action">Explore artwork +</span></summary>
 <div className="medarc-gallery-list">{moments.map((m,i)=><Link key={i} href={i===6||i===5?'/anatomy':i===15||i===16||i===17||i===18||i===19?'/answers':'/practice'} className="medarc-gallery-tile"><LearningMoment moment={m}/><span>{m[0]}</span></Link>)}</div>
 <p className="medarc-gallery-disclaimer">These scenes are AI-generated educational decoration, not diagnostic photographs or verified representations of medical procedures. Clinical images and answer keys are governed separately.</p></details>;
}

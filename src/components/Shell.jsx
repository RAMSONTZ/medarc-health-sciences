'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Icon} from './Icons';
import {SmartSearch} from './SmartSearch';

const sections=[
 {href:'/',label:'Overview',icon:'home'},
 {href:'/topics',label:'Explore subjects',icon:'grid'},
 {href:'/practice',label:'Question practice',icon:'book'},
 {href:'/answers',label:'Answers + explanations',icon:'check'},
 {href:'/exams',label:'Exam collections',icon:'clipboard'},
 {href:'/anatomy',label:'Anatomy lab',icon:'layers'},
 {href:'/review',label:'Quality audit',icon:'chart'}
];
const localKey='medarc:v2:profile';
function isActive(path,href){return href==='/'?path==='/':path.startsWith(href)}
function Logo(){return <Link href="/" className="brand" aria-label="MedArc home"><span className="brand-symbol" aria-hidden="true"><span className="brand-stroke"/></span><span className="brand-word"><b>medarc</b><small>HEALTH SCIENCES</small></span></Link>}
export function Shell({children}){
 const path=usePathname();
 const [drawer,setDrawer]=useState(false);const [profile,setProfile]=useState(null);const [mobileSearch,setMobileSearch]=useState(false);const [theme,setTheme]=useState('light');
 useEffect(()=>{const refresh=()=>{try{setProfile(JSON.parse(localStorage.getItem(localKey)||'null'));}catch{}};refresh();window.addEventListener('medarc:profile-updated',refresh);return()=>window.removeEventListener('medarc:profile-updated',refresh)},[]);
 useEffect(()=>setDrawer(false),[path]);
 useEffect(()=>{const setting=localStorage.getItem('medarc:display-theme');const chosen=setting==='dark'?'dark':setting==='light'?'light':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');setTheme(chosen);document.documentElement.dataset.theme=chosen;},[]);
 const toggleTheme=()=>{const chosen=theme==='dark'?'light':'dark';setTheme(chosen);document.documentElement.dataset.theme=chosen;try{localStorage.setItem('medarc:display-theme',chosen)}catch{}};

 const nav=<nav className="nav-list" aria-label="Main navigation">{sections.map(item=><Link key={item.href} className={`nav-link ${isActive(path,item.href)?'is-active':''}`} href={item.href} onClick={()=>setDrawer(false)}><Icon name={item.icon} size={19}/><span>{item.label}</span>{isActive(path,item.href)&&<span className="nav-indicator"/>}</Link>)}</nav>;
 return <div className="app-shell">
  <aside className={`sidebar ${drawer?'sidebar-open':''}`} aria-label="Site menu">
   <div className="sidebar-header"><Logo/><button className="icon-only close-side" onClick={()=>setDrawer(false)} aria-label="Close menu"><Icon name="x"/></button></div>
   <div className="sidebar-section-caption">YOUR WORKSPACE</div>{nav}
   <div className="sidebar-lower"><div className="sidebar-photo" role="img" aria-label="Healthcare professional in a hospital"><div><span className="tiny-overline">BUILT FOR THE CLINICAL MIND</span><b>Learn deeply.<br/>Think clearly.</b><Link href="/topics">Explore subjects <Icon name="arrow" size={15}/></Link></div></div><div className="sidebar-note"><Icon name="shield" size={17}/> Prepared answers are provisional until reviewed.</div></div>
  </aside>
  {drawer&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setDrawer(false)}/>}
  <div className="main-column"><header className="topbar"><div className="topbar-left"><button className="icon-only menu-toggle" onClick={()=>setDrawer(true)} aria-label="Open navigation"><Icon name="menu"/></button><span className="topbar-location">MedArc <Icon name="chevron" size={14}/> <span>{sections.find(item=>isActive(path,item.href))?.label||'Learning'}</span></span></div>
   <SmartSearch onNavigate={()=>setDrawer(false)}/>
   <div className="topbar-actions"><button type="button" className="theme-switch" onClick={toggleTheme} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`} title={`${theme==='dark'?'Light':'Dark'} theme`}>{theme==='dark'?'☼':'☾'}</button><button className="icon-only mobile-search-button" onClick={()=>setMobileSearch(x=>!x)} aria-label="Search MedArc"><Icon name="search" size={19}/></button><Link className="topbar-link" href="/topics">All topics <Icon name="chevron" size={16}/></Link><button className="profile-chip" onClick={()=>window.dispatchEvent(new Event('medarc:open-profile'))} title="Personalize your learning"><span>{(profile?.name||'M').slice(0,1).toUpperCase()}</span><span className="profile-label">{profile?.name||'Your profile'}</span></button></div>
  {mobileSearch&&<div className="mobile-search-popover"><SmartSearch onNavigate={()=>setMobileSearch(false)}/></div>}
  </header><main className="page-container">{children}</main><footer className="site-footer"><span>© MedArc Health Sciences · Version 2</span><span>Educational reference · Content verification in progress</span></footer></div>
  <nav className="mobile-tabs" aria-label="Mobile navigation">{[sections[0],sections[2],sections[1],sections[4]].map(item=><Link key={item.href} className={isActive(path,item.href)?'selected':''} href={item.href}><Icon name={item.icon} size={20}/><small>{item.label.replace('Question ','').replace('Exam collections','Exams').replace('Explore subjects','Topics')}</small></Link>)}</nav>
  <ProfileWizard/>
 </div>;
}
const suggestions=['Heart Failure','Shock','Anemia','Diabetes','Asthma','ECG','Pharmacology','Human Anatomy','General Surgery','Pediatrics and Child Health','Microbiology','Internal Medicine'];
function ProfileWizard(){
 const [open,setOpen]=useState(false),[step,setStep]=useState(1),[role,setRole]=useState('Student'),[name,setName]=useState(''),[focus,setFocus]=useState([]),[term,setTerm]=useState('');
 useEffect(()=>{const listener=()=>{try{let p=JSON.parse(localStorage.getItem(localKey)||'{}');setRole(p.role||'Student');setName(p.name||'');setFocus(p.focus||[])}catch{}setOpen(true);setStep(1)};window.addEventListener('medarc:open-profile',listener);return()=>window.removeEventListener('medarc:open-profile',listener)},[]);
 const choose=x=>setFocus(prev=>prev.includes(x)?prev.filter(v=>v!==x):prev.length<3?[...prev,x]:prev);
 const finish=()=>{try{localStorage.setItem(localKey,JSON.stringify({name:name.trim().slice(0,50),role,focus}))}catch{}setOpen(false);window.dispatchEvent(new Event('medarc:profile-updated'))};
 if(!open)return null;
 return <div className="dialog-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="profile-dialog" role="dialog" aria-modal="true" aria-label="Personalize your experience"><header className="wizard-head"><span className="wizard-step">STEP {step} / 2</span><button className="icon-only" aria-label="Close personalization" onClick={()=>setOpen(false)}><Icon name="x"/></button></header>{step===1?<><p className="eyebrow">WELCOME TO MEDARC</p><h2>Make learning feel<br/><em>personal.</em></h2><p className="wizard-desc">Choose how you use MedArc. Your preference stays on this device.</p><div className="role-options">{['Student','Professional','Educator','Other learner'].map(x=><button key={x} className={`role-option ${role===x?'chosen':''}`} onClick={()=>setRole(x)}><Icon name={x==='Student'?'book':x==='Professional'?'user':x==='Educator'?'layers':'grid'}/><b>{x}</b>{role===x&&<Icon name="check" size={17}/>}</button>)}</div><label className="field-label" htmlFor="person-name">Display name (optional)</label><input id="person-name" className="field-input" value={name} onChange={e=>setName(e.target.value)} placeholder="What should MedArc call you?"/></>:<><p className="eyebrow">PERSONALIZED LEARNING</p><h2>What will you<br/><em>study next?</em></h2><p className="wizard-desc">Select up to three areas. You can change them at any time.</p><input className="field-input" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search subjects and concepts" aria-label="Search learning interests"/><div className="focus-options">{suggestions.filter(x=>x.toLowerCase().includes(term.toLowerCase())).map(x=><button className={`focus-option ${focus.includes(x)?'chosen':''}`} key={x} onClick={()=>choose(x)}>{x}{focus.includes(x)&&<Icon name="check" size={14}/>}</button>)}</div><p className="wizard-desc">{focus.length}/3 concepts selected</p></>}
 <div className="wizard-foot">{step===2&&<button className="button button-outline" onClick={()=>setStep(1)}>Back</button>}<button className="button button-primary" onClick={()=>step===1?setStep(2):finish()}>{step===1?'Continue':'Save preferences'} <Icon name="arrow" size={17}/></button></div></section></div>;
}

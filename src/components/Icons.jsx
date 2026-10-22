export function Icon({name,size=20,strokeWidth=1.8,className=''}) {
 const paths={
  home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/></>,
  book:<><path d="M4 4.8C7 3.6 10 3.8 12 5c2-1.2 5-1.4 8-.2v15c-3-1.2-6-1-8 .2-2-1.2-5-1.4-8-.2z"/><path d="M12 5v15"/></>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  clipboard:<><path d="M9 4h6"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  arrow:<><path d="M4 12h16m-7-7 7 7-7 7"/></>,
  check:<><path d="m4 12 5 5L20 6"/></>,
  menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
  x:<><path d="M5 5l14 14M19 5 5 19"/></>,
  chart:<><path d="M4 20V11M10 20V7M16 20v-4M22 20V3"/></>,
  layers:<><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  shield:<><path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5zM9 12l2 2 4-4"/></>,
  filter:<><path d="M3 5h18M6 12h12M10 19h4"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>,
  chevron:<><path d="m9 6 6 6-6 6"/></>,
  external:<><path d="M14 4h6v6M20 4 10 14M20 14v6H4V4h6"/></>
 };
 return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.layers}</svg>;
}

import Link from 'next/link';
import {Icon} from './Icons';
export function Pagination({basePath,query={},page,pages,count}){
 function url(n){const p=new URLSearchParams();Object.entries(query).forEach(([key,v])=>{if(v!==undefined&&v!==null&&v!=='')p.set(key,String(v))});p.set('page',String(n));return `${basePath}?${p.toString()}`}
 return <nav className="pagination" aria-label="Result pages"><div><b>{count.toLocaleString()}</b> results <span className="pagination-muted">· Page {page} of {pages}</span></div><div className="pagination-controls">{page>1?<Link href={url(page-1)} className="page-button"><Icon name="chevron" size={17} className="rotate-180"/> Previous</Link>:<span className="page-button is-disabled">Previous</span>}{page<pages?<Link href={url(page+1)} className="page-button">Next <Icon name="chevron" size={17}/></Link>:<span className="page-button is-disabled">Next</span>}</div></nav>
}

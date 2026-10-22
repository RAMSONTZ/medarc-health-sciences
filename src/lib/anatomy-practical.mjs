/** Offline-safe, deterministic anatomy assessment functions. No source-key inference. */
export const alphabeticMarker = index => {
  if (!Number.isInteger(index) || index < 0) throw new Error('Marker index must be nonnegative');
  let n=index, result='';
  do { result=String.fromCharCode(65 + n % 26) + result; n=Math.floor(n / 26)-1; } while(n >= 0);
  return result;
};
export const clamp = (n,lo=2,hi=98) => Math.max(lo,Math.min(hi,Number(n)||0));
export function normalizeMarker(marker,index) {
 const x=clamp(marker.x,0,100), y=clamp(marker.y,0,100);
 return {
  id: marker.id || `mark-${index+1}`,
  letter: alphabeticMarker(index),
  x,y,
  labelX: clamp(marker.labelX ?? (x>77 ? x-11 : x+11),4,96),
  labelY: clamp(marker.labelY ?? (y<18 ? y+11 : y-11),4,96),
  name: String(marker.name || marker.label || '').trim(),
  location: String(marker.location || '').trim(),
  functionText: String(marker.functionText||'').trim(),
  hint: String(marker.hint || '').trim(),
  explanation: String(marker.explanation||'').trim(),
  nameDistractors: toChoices(marker.nameDistractors || marker.distractors || []),
  locationDistractors: toChoices(marker.locationDistractors || []),
 };
}
export function toChoices(value){
 const items=Array.isArray(value)?value:String(value||'').split(/\r?\n/);
 return [...new Set(items.map(x=>String(x).trim()).filter(Boolean))].slice(0,8);
}
export function hasQuestion(marker,kind){return !!(kind==='location'?marker.location:marker.name)}
export function getOptions(marker,kind='name'){
 const correct=kind==='location'?marker.location:marker.name;
 const distractors=(kind==='location'?marker.locationDistractors:marker.nameDistractors)||[];
 const values=[correct,...toChoices(distractors).filter(v=>v.toLocaleLowerCase()!==correct.toLocaleLowerCase())];
 if(!correct || values.length < 3) return [];
 // Stable ordering; no randomness changing options while a student is taking a test.
 const rotate=(marker.letter.charCodeAt(0)-65)%values.length;
 return values.slice(rotate).concat(values.slice(0,rotate));
}
export function markResponse(marker,kind,response) {
 if(!hasQuestion(marker,kind)) return {status:'unavailable'};
 const options=getOptions(marker,kind);
 if(!options.length) return {status:'self-assessment'};
 const correct=kind==='location'?marker.location:marker.name;
 if(!options.includes(response)) return {status:'no-selection'};
 return {status:response===correct?'correct':'incorrect',answer:correct,correctIndex:options.indexOf(correct)};
}
export function gradeSummary(records){
 const values=Object.values(records||{});
 return {correct:values.filter(v=>v.status==='correct').length,answered:values.filter(v=>v.status==='correct'||v.status==='incorrect').length};
}
export function validateDraftManifest(payload){
 if(!payload || !Array.isArray(payload.images)) return {valid:false,error:'An images array is required'};
 if(payload.images.length > 100) return {valid:false,error:'Too many images in one manifest'};
 for(const item of payload.images){
  if(!item || typeof item.id!=='string' || !Array.isArray(item.markers)) return {valid:false,error:'Each image needs an id and markers'};
  if(item.markers.length>100) return {valid:false,error:'Too many markers on one image'};
  for(const m of item.markers){
   if(!(Number.isFinite(m.x)&&Number.isFinite(m.y)&&m.x>=0&&m.x<=100&&m.y>=0&&m.y<=100)) return {valid:false,error:'Marker positions must be between 0 and 100'};
   if(String(m.name||m.label||'').length>250 || String(m.explanation||'').length>4000) return {valid:false,error:'Annotation text is too long'};
  }
 }
 return {valid:true};
}

export function closestMarker(markers, x, y, maxDistance=11){
 if(!Array.isArray(markers)||!markers.length)return -1;
 const distances=markers.map(m=>Math.hypot(Number(m.x)-x,Number(m.y)-y));
 const min=Math.min(...distances);
 return min<=maxDistance?distances.indexOf(min):-1;
}

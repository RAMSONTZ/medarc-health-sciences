/**
 * Conservative, deterministic import-quality triage.
 * This module does not judge medical correctness or whether an answer is right.
 * An excluded source remains in data/bank.json with the same ID and exam linkage.
 */
const FIELD_CODE = /(?:\bINCLUDEPICTURE\b|\bMERGEFORMAT(?:INET)?\b|\bHYPERLINK\s*["']|javascript:\s*WP(?:Show|Hide)|\bWPCOMMENT\b|\bschemas-microsoft-com:office\b)/i;
const MARKUP = /(?:<\?xml\b|xmlns:|<\/?(?:html|body|div|font|table|style|script)\b|\b(?:w:|o:|v:)\w+\s*=)/i;
const MOJIBAKE = /(?:\uFFFD|Ã[\w\u0080-\u00bf]|Â[\u0080-\u00bf]|â€[\u0080-\u00bf]|ðŸ[\u0080-\u00bf]|Ãƒ|Ã¯Â¿Â½)/;
const COLLECTION_RESIDUE = /(?:\bTotal Points\s*:|\bMultiple Choice Points\s*:|\bMatching Points\s*:|\bEssay Points\s*:|\bQuestion\s+\d+\s+of\s+\d+)/i;

export function assessQuestionQuality(question) {
  const q=question||{};
  const stem=typeof q.stem==='string'?q.stem.trim():'';
  const options=Array.isArray(q.options)?q.options:[];
  const fields=[stem,...options.map(o=>typeof o?.text==='string'?o.text:'')];
  const reasons=[];
  reasons.push(...(q.editorialBlockedReasons||[]));
  const review=[];
  if(!stem || stem.length<12 || !/[a-z]{3}/i.test(stem)) reasons.push('missing_or_unreadable_question');
  if(fields.some(text=>FIELD_CODE.test(text))) reasons.push('imported_word_field_codes');
  if(fields.some(text=>MARKUP.test(text))) reasons.push('raw_document_markup');
  if(fields.some(text=>MOJIBAKE.test(text))) reasons.push('broken_character_encoding');
  if(COLLECTION_RESIDUE.test(stem)) reasons.push('merged_exam_document_text');
  if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(stem)) reasons.push('control_characters');
  const mcq=/\b(?:MCQ|Multiple Choice|Multiple Response|True\/False)\b/i.test(String(q.type||''));
  if(mcq && options.length<2) reasons.push('missing_choice_options');
  if(options.some(o=>typeof o?.text!=='string'||!o.text.trim())) reasons.push('blank_choice_option');
  if(!options.length&&!stem.includes('?')&&/^(?:which|where)\s+(?:is|are|it|lies|extends|supply|supplies|drain|drains|form|forms|empty|run|splits)\b/.test(stem))reasons.push('orphaned_explanatory_fragment');
  const texts=options.map(o=>(o?.text||'').trim().toLowerCase().replace(/\s+/g,' '));
  if(texts.length>1 && new Set(texts).size<texts.length) reasons.push('duplicate_choice_options');
  if(stem.length>2200) review.push('unusually_long_stem');
  if(stem.length>370 && (stem.match(/\?/g)||[]).length>=4) review.push('possible_merged_questions');
  if(stem.length>650 && /\b(?:Define|Describe|Discuss|Explain)\b.*\b(?:Define|Describe|Discuss|Explain)\b/is.test(stem)) review.push('possible_multiple_stems');
  const status=reasons.length?'quarantined':review.length?'review':'usable';
  return {status,reasons,review};
}
export function isStudentReady(question){return assessQuestionQuality(question).status!=='quarantined';}

/**
 * Conservative academic subject routing for mixed-source MedArc imports.
 * The preserved source bank is never edited, and no clinical answer is verified here.
 * Decisions use the question stem (not distractor options, source exam title, or
 * often-wrong inherited topic headings).
 */
export const UNRESOLVED_SUBJECT='Unclassified Health Sciences';
const PHYSIO='Human Physiology';
const ANATOMY='Human Anatomy';
const PHARMA='Pharmacology';
const RX={
 clinicalRequest:/\b(?:best|most appropriate|preferred|initial|first.line|next)\s+(?:\w+\s+){0,5}(?:treatment|management|therapy|drug|medication|intervention|procedure|step)\b|\b(?:treatment|management)\s+(?:of|for|include(?:s)?|in)\b|\b(?:how|what|which)\b[^.!?]{0,130}\b(?:treat|manage|prescribe|administer|therapy|therapies|drug(?:s)?|medication|antibiotic)\b|\b(?:would|should)\s+(?:you|a physician|the clinician|the patient)?\s*(?:treat|manage|prescribe|receive|administer)\b|\b(?:ideal|optimal)\s+management\b/i,
 pharmacology:/\b(?:which|what|name|identify)\s+(?:one\s+of\s+the\s+following\s+)?(?:drug|drugs|medication|medications|antibiotic|antihypertensive|antiviral|antifungal|agent|agents)\b|\b(?:drugs?|medications?)\s+(?:of\s+choice|when\s+used|associated\s+with|caus(?:es?|ing)|inhibit(?:s)?|block(?:s)?)\b|\b(?:mechanism\s+of\s+action|pharmacokinetics?|pharmacodynamics?|adverse\s+(?:drug\s+)?(?:effect|reaction)|drug\s+interaction|half.life|bioavailability)\b/i,
 anatomicalQuestion:/\b(?:which|what|name|identify|locate|describe|where)\b[^?.]{0,150}\b(?:anatom(?:y|ical)|arter(?:y|ies)|vein(?:s)?|nerves?|muscles?|bones?|joints?|ligaments?|foramen|origin|insertion|innervat(?:e|ion)|blood supply|drainage|branches?|anatomical structures?|lymph nodes?|located)\b|\b(?:course|relations|attachments|arterial supply|venous drainage|nerve supply)\s+of\b/i,
 gyn:/\b(?:pregnan(?:cy|t)|gestation(?:al)?|fetal|foetal|placenta|obstetri(?:c|cal)|preeclampsia|pre.eclampsia|eclampsia|postpartum|antenatal|intrapartum|labou?r|cervical\s+cancer|pelvic\s+inflammatory\s+disease|ectopic pregnancy|uterine|ovarian|endometriosis|breech|g[1-9]p[0-9]+|gynecolo(?:gy|gical))\b/i,
 hematology:/\b(?:leukemia|leukaemia|lymphoma|myeloma|sickle.cell|thrombocytopenia|coagulopath(?:y|ies)|aplastic anemia|haemophilia|hemophilia)\b/i,
 neurology:/\b(?:stroke|TIA\b|transient ischemic attack|transient ischaemic attack|cerebrovascular|cerebral infarct|intracranial hemorrhage|intracerebral haemorrhage|meningitis|encephalitis|seizure|epilep(?:sy|tic)|parkinson|multiple sclerosis|myasthenia gravis)\b/i,
 psychiatry:/\b(?:depression|schizophrenia|psychosis|mania\b|bipolar|anxiety disorder|suicidal|antipsychotic|antidepressant)\b/i,
 ophthalmology:/\b(?:glaucoma|cataract|retinal detachment|uveitis|ophthalmic|macular degeneration|diabetic retinopathy)\b/i,
 ent:/\b(?:otitis media|tonsillitis|rhinosinusitis|mastoiditis|chronic otitis|ear infection|hearing loss|nasal polyp|peritonsillar abscess)\b/i,
 dermatology:/\b(?:eczema|psoriasis|urticaria|acne vulgaris|dermatitis|pemphigus|bullous pemphigoid)\b/i,
 surgery:/\b(?:appendicitis|cholecystitis|peritonitis|intestinal obstruction|hernia repair|strangulated hernia|surgical exploration|laparotomy|bowel perforation|testicular torsion)\b/i,
 emergency:/\b(?:cardiac arrest|cardiopulmonary resuscitation|CPR\b|anaphylaxis|shock\s+(?:management|resuscitation)|severe trauma|major trauma|emergency airway)\b/i,
 renal:/\b(?:renal failure|kidney failure|glomerulonephritis|nephrotic syndrome|acute kidney injury|AKI\b|dialysis|proteinuria|oliguric|uremia|uraemia)\b/i,
 cardiovascular:/\b(?:heart failure|myocardial infarction|angina|hypertensi(?:on|ve)|coronary artery disease|atrial fibrillation|pulmonary edema|pulmonary oedema|orthopnea|orthopnoea|valvular heart disease|carotid stenosis)\b/i,
 endocrine:/\b(?:diabetes mellitus|diabetic ketoacidosis|hypercalcemia|hypercalcaemia|thyrotoxicosis|hypothyroidism|hyperthyroidism|adrenal insufficiency)\b/i,
 immunology:/\b(?:which type of hypersensitivity|type [iIvVxX0-9]+ hypersensitivity|hypersensitivity reaction|immune response|antigen.presentation|immunoglobulin class)\b/i,
 physiology:/\b(?:action potential|cardiac output|glomerular filtration rate|GFR\b|feedback mechanism|membrane potential|lung compliance|respiratory quotient)\b/i,
 microscopy:/\b(?:histological features|microscopic structure|histologic appearance|light microscopy|electron micrograph|histopathology of)\b/i
};
const foundational=new Set(['Human Anatomy','Human Physiology','Medical Biochemistry','Histology','Embryology']);
const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
function clinicalTarget(stem){
 const s=stem;
 if(RX.gyn.test(s))return 'Obstetrics and Gynecology';
 if(RX.hematology.test(s))return 'Hematology';
 if(RX.psychiatry.test(s))return 'Psychiatry';
 if(RX.neurology.test(s))return 'Neurology';
 if(RX.ophthalmology.test(s))return 'Ophthalmology';
 if(RX.ent.test(s))return 'ENT';
 if(RX.dermatology.test(s))return 'Dermatology';
 if(RX.surgery.test(s))return 'General Surgery';
 if(RX.emergency.test(s))return 'Emergency Medicine';
 if(RX.renal.test(s)||RX.cardiovascular.test(s)||RX.endocrine.test(s))return 'Internal Medicine';
 return null;
}
function sensibleTopic(subject,stem){
 if(subject==='Internal Medicine'){
  if(RX.renal.test(stem))return 'Renal medicine';
  if(RX.cardiovascular.test(stem))return 'Cardiovascular medicine';
  if(RX.endocrine.test(stem))return 'Endocrinology';
 }
 if(subject==='Pharmacology')return 'Drug action and therapeutics';
 if(subject==='Neurology')return 'Neurological disorders';
 if(subject==='Obstetrics and Gynecology')return 'Obstetric and gynecological care';
 if(subject==='Hematology')return 'Blood disorders';
 if(subject==='Human Anatomy')return 'Anatomical structures';
 if(subject===UNRESOLVED_SUBJECT)return 'Department review required';
 return 'Clinical cases and management';
}
export function isClinicalManagementQuestion(q){
 const stem=normalize(typeof q==='string'?q:q?.stem);
 return RX.clinicalRequest.test(stem);
}
export function resolveQuestionDepartment(question){
 const stem=normalize(question?.stem);
 const source=normalize(question?.subject)||UNRESOLVED_SUBJECT;
 const originalTopic=normalize(question?.topic);
 const clinical=isClinicalManagementQuestion(stem);
 const anatomical=RX.anatomicalQuestion.test(stem);
 const pharm=RX.pharmacology.test(stem);
 const target=clinicalTarget(stem);
 let subject=source;
 let reason='source_subject_retained';
 let review=false;
 if(source===ANATOMY && clinical){
  // Absolute safety boundary: therapeutic decisions never render in the Anatomy bank.
  if(pharm && !RX.gyn.test(stem)){subject=PHARMA;reason='drug_focused_question_in_anatomy';}
  else if(target){subject=target;reason='clinical_management_mislabelled_anatomy';}
  else{subject=UNRESOLVED_SUBJECT;reason='unresolved_management_mislabelled_anatomy';review=true;}
 } else if(source===ANATOMY && !anatomical && pharm){
  subject=PHARMA;reason='pharmacology_content_mislabelled_anatomy';
 } else if(source===ANATOMY && !anatomical && RX.immunology.test(stem)){
  subject='Immunology';reason='immunology_content_mislabelled_anatomy';
 } else if(foundational.has(source) && clinical && source!==ANATOMY){
  if(pharm && source!==PHYSIO){subject=PHARMA;reason='pharmacology_mislabelled_foundational';}
  else if(target){subject=target;reason='clinical_management_mislabelled_foundational';}
  else{subject=UNRESOLVED_SUBJECT;review=true;reason='unresolved_management_mislabelled_foundational';}
 } else if((source===UNRESOLVED_SUBJECT || source==='Clinical Medicine') && clinical && (target||pharm)){
  subject=pharm?PHARMA:target;reason='classified_unassigned_clinical';
 } else if(source===UNRESOLVED_SUBJECT && anatomical && !clinical && !pharm && !target){
  subject=ANATOMY;reason='anatomy_identified_in_unclassified';
 } else if(source===PHARMA && anatomical && !clinical && !pharm && !target){
  // Pharmacological receptor-location questions remain pharmacology.
  if(/\b(?:which|what|name|identify)\s+(?:nerve|artery|vein|muscle|bone)\b/i.test(stem)){
    subject=ANATOMY;reason='anatomy_identified_in_pharmacology';
  }
 }
 // Require stronger evidence before changing other assigned departments.
 // Anatomy is a hard boundary even for future rule additions.
 if(subject===ANATOMY && clinical){
   subject=UNRESOLVED_SUBJECT;review=true;reason='anatomy_clinical_boundary';
 }
 const reassigned=subject!==source;
 return {
  subject, sourceSubject:source,
  topic:reassigned?sensibleTopic(subject,stem):originalTopic,
  sourceTopic:originalTopic,
  reassigned,review,reason
 };
}

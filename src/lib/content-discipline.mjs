/** Content evidence only: inherited headings and distractors never determine a discipline. */
const clean=s=>String(s||'').normalize('NFKC').replace(/([a-z])-\s+([a-z])/gi,'$1$2').replace(/\s+/g,' ').trim();
const drug=/\b(?:drugs?|medications?|medicinal|pharmac\w*|agonists?|antagonists?|blockers?|antibiotics?|antimicrobials?|an[ae]sthetics?|analgesics?|adrenoreceptors?|cholinomimetics?|cholinesterase inhibitor|atropine|scopolamine|carbamazepine|nicotine|epinephrine|ritodrine|salmeterol|salbutamol|meperidine|fentanyl|penicillin|oxytocin|ergometrine|warfarin|neostigmine|pilocarpine|bromocriptine|side effects?|adverse effects?|insulin therapy|dose|dosage|bioavailability|clearance|volume of distribution)\b/i;
const clinical=/\b(?:patients?|men|women|man|woman|male|female|boy|girl|child|old|years?|hospital|noted|pain|ECG|blood test|diagnos\w*|treat\w*|manage\w*|therapy|syndrome|disease|cancer|carcinoma|tumou?r|injur\w*|fractures?|infection|poison\w*|intoxicat\w*|examin\w*|signs|symptoms|investigation|operation|postoperative)\b/i;
const morphology=/\b(?:anatom\w*|innervat\w*|nerve supply|blood supply|arterial supply|venous drainage|lymphatic drainage|origin|insertion|inserts?|attaches?|attachment|relations?|located|location|contains?|contained|contents|passes?|pierce\w*|branches?|boundar\w*|surface markings?|ligaments?|foram\w*|fossa|compartment|mesentery|cusps?|leaflets?|valves of the heart|heart valves?|conducting system of the heart|gubernaculum|perineum|tensor tympani|pronation|supination)\b/i;
const physiology=/\b(?:physiology|physiological mechanisms|cardiac output|action potential|membrane potential|gas exchange|homeostasis|osmosis|osmotic pressure|osmoreceptor\w*|passive diffusion|active transport|positive feedback|negative feedback|feedback mechanism|baroreceptor\w*|lung compliance|glomerular filtration|hormone secretion|hormonal regulation)\b/i;
const anatomyTopics=[
 ['Upper Limb',/\b(?:upper limb|forearm|hand|wrist|scapula|shoulder|biceps|triceps|deltoid|brachial|axilla\w*|humer\w*|ulna\w*|radius|radial nerve|carpal|cubital|pectoral|palmar|rotator cuff|clavipectoral)\b/i],
 ['Lower Limb',/\b(?:lower limb|thigh|foot|ankle|fem\w*|tibia\w*|fibul\w*|glute\w*|sciatic|popliteal|adductor canal|tendocalc\w*|plantar|genu valgum|genu varum)\b/i],
 ['Head and Neck',/\b(?:head and neck|larynx|pharynx|middle ear|inner ear|tensor tympani|tympan\w*|carotid|facial|mandib\w*|maxill\w*|parotid|scalp|thyroid|neck|vocal|eustachian|auditory ossicles)\b/i],
 ['Thorax',/\b(?:thorax|thoracic|mediastin\w*|trachea|bronch\w*|oesophag\w*|esophag\w*|heart|coronary|pericardi\w*|pleur\w*|lung|aorta|vena cava|diaphragm|breast|mammary|intercostal|thoracic duct)\b/i],
 ['Pelvis and Perineum',/\b(?:pelvi\w*|perine\w*|uterus|uterine|ovary|ovarian|fallopian|prostate|scrot\w*|vagina\w*|pudendal|rectum|anal canal|gubernaculum|tunica vaginalis)\b/i],
 ['Abdomen',/\b(?:abdomin\w*|peritone\w*|pancreas|duodenum|jejunum|ileum|mesenter\w*|liver|hepati\w*|spleen|splenic|stomach|inguinal|ureter|kidney|renal artery|epiploic|porta hepatis|psoas)\b/i],
 ['Back and Vertebral Column',/\b(?:vertebr\w*|spinal column|back muscles|nucleus pulposus)\b/i],
 ['Neuroanatomy',/\b(?:brainstem|cerebell\w*|cranial nerve|spinal cord|meninges|cerebral cortex|brain ventricles|basal ganglia)\b/i]
];
const embryology=/\b(?:embryolog\w*|embryogenesis|gastrulation|neurulation|primitive streak|ureteric bud|germ layers?|organogenesis|neural crest|neural tube|pharyngeal arches|somites?|trophoblast|blastocyst|stages of cleavage|heart is derived from|development of the heart|first week of development|second week of development|paramesonephric ducts?)\b/i;
const histology=/\b(?:histolog\w*|histoarchitecture|microscopic structure|epithel\w* lining|type of tissue lines|tunica (?:intima|media|adventitia)|internal elastic membrane|external elastic membrane|lymphatic nodules?|lymphoid follicles?|splenic (?:cords|nodule|parenchyma)|hassall|lymph node.*(?:cortex|medulla|nodules)|medulla of the thymus|goblet cells?|simple columnar|stratified squamous|reticular fibers?|reticular fibres?)\b/i;
const biochem=/\b(?:protein synthesis|where.*translation occur|glycolysis|gluconeogenesis|glycogenolysis|urea cycle|krebs cycle|citric acid cycle|oxidative phosphorylation|electron transport chain|beta oxidation|enzyme kinetics|michaelis.menten|dna replication|rna transcription)\b/i;
const stats=/\b(?:central tendency|mean,?\s*median|mean,?\s*mode|standard deviation|standard error|confidence interval|p.value|chi.square|t.test|anova|logistic regression|linear regression|normal distribution|sample size|sampling (?:method|technique|error)|null hypothesis|statistical (?:test|significance)|type [12i]+ error)\b/i;
const epi=/\b(?:cohort study|case.control|cross.sectional study|incidence rate|prevalence ratio|relative risk|odds ratio|attack rate|outbreak investigation|screening sensitivity|screening specificity|positive predictive value|negative predictive value|attributable risk)\b/i;
const gyn=/\b(?:pregnan\w*|gestation\w*|labou?r\b|postpartum|antenatal|obstetric\w*|preeclampsia|pre.eclampsia|eclampsia|fetal|foetal|placenta\w*|ectopic|gyna?ecolog\w*|gynecolog\w*|endometriosis|uterine fibroid|ovarian torsion|pelvic inflammatory disease|cervical cancer)\b/i;
const clinicalTopics=[
 ['Hematology','Red Cell Disorders',/\b(?:hemolysis|haemolysis|thalassemia|thalassaemia|sickle.cell|reticulocytosis|hemolytic an[ae]mia)\b/i],
 ['Hematology','White Cell and Lymphoid Disorders',/\b(?:leuk[ae]mia|leukemia|lymphoma|myeloma|leukaemia)\b/i],
 ['Hematology','Hemostasis and Thrombosis',/\b(?:ha?emophilia|thrombocytopenia|coagulopathy)\b/i],
 ['Internal Medicine','Nephrology',/\b(?:chronic kidney disease|acute kidney injury|renal failure|kidney failure|glomerulonephritis|nephrotic syndrome|pyelonephritis)\b/i],
 ['Internal Medicine','Endocrinology',/\b(?:hypothyroidism|hyperthyroidism|thyrotoxicosis|diabetic ketoacidosis|DKA|adrenal insufficiency|cushing.s|pheochromocytoma|phaeochromocytoma)\b/i],
 ['Internal Medicine','Cardiology',/\b(?:heart failure|myocardial infarction|mitral stenosis|aortic stenosis|rheumatic fever|infective endocarditis|aortic dissection|atrial fibrillation|acute coronary)\b/i],
 ['Internal Medicine','Respiratory Medicine',/\b(?:bronchiectasis|COPD|chronic obstructive|pneumonia|tuberculosis|pleural effusion|asthma)\b/i],
 ['Internal Medicine','Gastroenterology and Hepatology',/\b(?:acute liver failure|cirrhosis|hepatic encephalopathy|gastrointestinal bleeding|hepatitis|peptic ulcer)\b/i],
 ['Internal Medicine','Rheumatology',/\b(?:rheumatoid arthritis|systemic lupus|gout|scleroderma)\b/i],
 ['Psychiatry','Mood Disorders',/\b(?:bipolar|manic episode|racing thoughts and pressured speech|major depression)\b/i],
 ['Psychiatry','Psychotic Disorders',/\b(?:schizophrenia|psychosis|delusions|hallucinations)\b/i],
 ['Neurology','Seizure Disorders',/\b(?:epilepsy|seizure disorders?|convulsions)\b/i],
 ['Neurology','Cerebrovascular Disease',/\b(?:stroke|cerebral infarction|transient isch[ae]mic attack)\b/i],
 ['General Surgery','Acute Abdomen',/\b(?:perforated peptic ulcer|appendicitis|intestinal obstruction|bowel obstruction|peritonitis)\b/i],
 ['Dermatology','Inflammatory Skin Disorders',/\b(?:eczema|psoriasis|atopic dermatitis|contact dermatitis|urticaria)\b/i],
 ['ENT','Otology',/\b(?:otitis|mastoiditis|hearing loss|otorrh[oe]a)\b/i],
 ['ENT','Rhinology',/\b(?:sinusitis|epistaxis|nasal polyps?)\b/i],
 ['ENT','Laryngology',/\b(?:tonsillitis|laryngitis|peritonsillar abscess)\b/i],
 ['Ophthalmology','Ophthalmic Disorders',/\b(?:glaucoma|cataract|retinal detachment|uveitis|keratitis)\b/i]
];
function result(subject,topic,reason){return {subject,topic,reason,confidence:'high'};}
export function inferContentDiscipline(q){
 const s=clean(q?.stem);
 if(!s || /<\?xml|\\insrsid|\\charrsid/i.test(s))return null;
 // Full paragraphs with multiple exam prompts require reconstruction, not keyword voting.
 if(s.length>650)return null;
 if(q?.editorialBlockedReasons?.length)return null;
 if(!drug.test(s)&&/\b(?:autopsy|post.mortem|microscop\w*|histolog\w*|necrosis|gangrene|pathological process|which process was diagnosed|gross inspection)\b/i.test(s)&&
    /\b(?:which|what|name|identify)\b/i.test(s)){
  return result('General Pathology',/tumou?r|neoplasm|carcinoma|sarcoma/i.test(s)?'Neoplasia':/inflammat|granuloma/i.test(s)?'Inflammation and Repair':'Cell Injury and Adaptation','explicit_pathological_process');
 }
 if(/\b(?:The answer is|explanation|says|Contact the team|feedback\? contact|post.mortem|biopsy|ultrasound|radiograph|X.ray)\b/i.test(s))return null;
 if(['Parasitology','Microbiology'].includes(q?.subject))return null;
 if(/\b(?:autopsy|macroscop\w*|microscop\w*|histological|histopatholog\w*|cellular processes|type of (?:an )?inflammation)\b/i.test(s)&&clinical.test(s))return null;
 if(/\b(?:plasmodium|schizont|protozoan|parasites?|helminth|schistosom\w*|insect|arthropod)\b/i.test(s)&&!/(?:drug|pharmac|dose|treatment)/i.test(s))return null;
 if(/\b(?:infectious agent|causative (?:agent|organism)|microaerophilic|stool culture|physician statement|communicat\w*|hypothesis|study design|cohort|case.control|research)\b/i.test(s))return null;
 if((s.match(/\bwhich\b/gi)||[]).length>1||(s.match(/\?/g)||[]).length>2)return null;
 if(!/\?|\b(?:what|which|why|how|where|list|outline|describe|define|explain|calculate|compare|contrast|regarding|select|identify|indicate|all (?:of |are |but ))\b/i.test(s))return null;
 if(stats.test(s)&&!drug.test(s))return result('Biostatistics and Research','Statistical Inference','explicit_statistical_question');
 if(epi.test(s)&&!drug.test(s))return result('Epidemiology','Study Designs and Measures','explicit_epidemiology_question');
 if(embryology.test(s)&&!drug.test(s)&&!clinical.test(s))return result('Embryology',/primitive streak|cleavage|gastrulation|blastocyst|trophoblast/i.test(s)?'Early Development':'Organogenesis','explicit_development_question');
 if(histology.test(s)&&!drug.test(s)&&!clinical.test(s))return result('Histology',/lymph|splen|thymus/i.test(s)?'Lymphoid Tissue Histology':/vessel|tunica|elastic/i.test(s)?'Vascular Histology':'Organ Histology','explicit_tissue_structure');
 if(biochem.test(s)&&!drug.test(s)&&!clinical.test(s))return result('Medical Biochemistry',/protein|translation|enzyme/i.test(s)?'Proteins and Enzymes':'Metabolic Pathways','explicit_biochemical_question');
 const anatomical=anatomyTopics.filter(([,rx])=>rx.test(s));
 const plainStructure=/^(?:\d+\s*)?(?:regarding|with respect to|according to|which (?:statement|of these statements|of the following statements).*(?:about|concerning)|the following statements? concerning)/i.test(s);
 if(anatomical.length&&!drug.test(s)&&!physiology.test(s)&&!clinical.test(s)&&(morphology.test(s)||plainStructure)){
  // Prefer a named limb/neck to generic terms such as artery and vein.
  return result('Human Anatomy',anatomical[0][0],'structural_content_across_departments');
 }
 if(drug.test(s)&&!clinical.test(s)&&/\b(?:which|what|indicate|select|pick|tick|pharmacokinetics|pharmacodynamics|bioavailability|dose|all of the following)\b/i.test(s))return result('Pharmacology','', 'explicit_drug_science_across_departments');
 if(physiology.test(s)&&!drug.test(s)&&!clinical.test(s))return result('Human Physiology','', 'explicit_normal_function');
 // Pregnancy treatment belongs in the clinical specialty; normal structure above does not.
 if(gyn.test(s)&&!drug.test(s)&&clinical.test(s)&&q?.subject!=='Pediatrics and Child Health'&&/(?:gestation|postpartum|antenatal|labou?r|OB visit|preeclampsia|pre.eclampsia|eclampsia|obstetric|placenta|G\d+P\d+)/i.test(s)&&!/(?:pregnancy test is negative|negative pregnancy test|child.pugh|congenital|embryo|development|failed to develop|newborn|inclusion criteria|exclusion criteria)/i.test(s))return result('Obstetrics and Gynecology','', 'explicit_obstetric_gynecological_case');
 if(s.length<220&&!gyn.test(s)&&!drug.test(s)&&!/(?:bipolar diathermy|cerebral energy metabolism|research study|cohort|case.control)/i.test(s)){
  const focus=[...s.matchAll(/(?:which|what|describe|outline|list)\b[^?]*\??/gi)].at(-1)?.[0]||s;
  const hits=clinicalTopics.filter(([, ,rx])=>rx.test(focus));
  const departments=new Set(hits.map(x=>x[0]));
  if(departments.size===1 && hits.length){
   // An explicit pediatric patient keeps age-specific clinical care in Pediatrics.
   if(/\b(?:infant|newborn|neonat\w*|toddler|child(?![ .-]+pugh)|\d+[- ]year[- ]old (?:boy|girl))\b/i.test(s))return result('Pediatrics and Child Health','', 'explicit_pediatric_case');
   // Pathogenesis/morphology stays Pathology; mere diagnosis does not.
   if(/\b(?:pathogenesis|pathophysiology|histopatholog\w*|microscopic|necrosis)\b/i.test(s))return null;
   if(clinical.test(s)||/^\s*(?:\d+\s*)?which of the following laboratory findings/i.test(s))return result(hits[0][0],hits[0][1],'explicit_clinical_specialty');
  }
 }
 return null;
}

/**
 * MedArc 2026 question-level curation.
 * Deterministic academic taxonomy, conservative overrides and REVIEW QUEUE.
 * All decisions are separate from the untouched source question/answer records.
 * A routing decision is NOT medical validation or copyright clearance.
 */
import {resolveQuestionDepartment,isClinicalManagementQuestion,UNRESOLVED_SUBJECT} from './department-routing.mjs';
const S={
 ANATOMY:'Human Anatomy',PHARMA:'Pharmacology',PHYS:'Human Physiology',BIO:'Medical Biochemistry',
 PATH:'General Pathology',MICRO:'Microbiology',PARA:'Parasitology',HIST:'Histology',EMBRYO:'Embryology',
 IMM:'Immunology',HEM:'Hematology',INT:'Internal Medicine',SURG:'General Surgery',
 OG:'Obstetrics and Gynecology',PEDS:'Pediatrics and Child Health',NEURO:'Neurology',
 ENT:'ENT',PSY:'Psychiatry',OPH:'Ophthalmology',DERM:'Dermatology',
 EPID:'Epidemiology',BIOSTATS:'Biostatistics and Research',EMERG:'Emergency Medicine',
 RAD:'Radiography and Medical Imaging',NUT:'Nutrition and Dietetics',GEN:'Medical Genetics'
};
const RX={
 pharm:/\b(?:pharmacokin(?:etic|etics)|pharmacodynam(?:ic|ics)|drug\s+(?:action|interaction|metabolism|clearance|distribution|efficacy|half.life)|mechanism\s+of\s+action|adverse\s+drug\s+(?:reaction|effect)|receptor\s+(?:agonist|antagonist|blockade)|bioavailability|therapeutic\s+index|LD50|ED50)\b/i,
 pharmRequest:/\b(?:which|what|identify|select|choose)\b[^?.]{0,85}\b(?:drugs?|antibiotics?|antihypertensives?|antifungals?|antivirals?|agents?|medications?|receptor\s+agonists?|receptor\s+antagonists?)\b|\b(?:dose|dosage|prescription|contraindications?|side.effects?|drug.of.choice)\b/i,
 anat:/\b(?:anatomical relations?|anatom(?:y|ical)|nerve\s+supply|innervat(?:ion|es?)|origin\s+and\s+insertion|muscle attachments|blood\s+supply|arterial\s+supply|venous\s+drainage|lymphatic\s+drainage|brachial plexus|nerve\s+root|bony\s+landmarks?|foramina?|fossae|anatomical\s+structures?)\b/i,
 anatAsk:/\b(?:which|what|name|identify|locate|describe|where|list)\b[^.?]{0,100}\b(?:nerves?|arter(?:y|ies)|veins?|muscles?|bones?|ligaments?|joints?|foramina?|vascular\s+supply|anatomical\s+structures?|branches|innervat(?:ion|es?)|blood\s+supply|drainage)\b/i,
 physiology:/\b(?:physiolog(?:y|ical)|cardiac\s+output|lung\s+compliance|alveolar\s+ventilation|action\s+potential|membrane\s+potential|transport\s+across|osmosis|diffusion\s+gradient|negative\s+feedback|renal\s+clearance|glomerular\s+filtration|acid.base\s+balance)\b/i,
 biochemistry:/\b(?:glycolysis|glycogenolysis|glycogenesis|gluconeogenesis|citric\s+acid\s+cycle|krebs\s+cycle|oxidative\s+phosphorylation|electron\s+transport\s+chain|beta.oxidation|urea\s+cycle|enzyme\s+kinetics|enzyme\s+inhibitors?|Km\s+(?:value|of)|Michaelis.Menten|amino.acid\s+metabolism|transaminat(?:ion|e)|nucleotide\s+synthesis|lipoprotein\s+metabolism|DNA\s+replication|RNA\s+transcription|ATP\s+synth(?:ase|esis))\b/i,
 micro:/\b(?:gram.(?:positive|negative)|bacterial\s+culture|culture\s+medium|acid.fast\s+bacilli|Koch.s\s+postulates|bacterio(?:logy|logical)|virus\s+replication|viral\s+genome|microbial\s+(?:identification|growth)|capsid|bacterial\s+toxin|microorganism\s+causing|causative\s+organism|which\s+(?:bacterium|virus|organism))\b/i,
 parasite:/\b(?:plasmodium|anopheles|schistosom(?:a|iasis)|trypanosom(?:a|iasis)|leishmaniasis|giardia|entamoeba|ascaris|hookworm|helminth|protozoa|parasite\s+(?:life\s+cycle|egg|larva|species)|taenia|cestode|nematode|fluke|trematode|onchocerca|filaria|trichuris|echinococcus)\b/i,
 pathology:/\b(?:pathogenesis|pathophysiology|pathological\s+features|necrosis|neoplas(?:ia|m)|metaplasia|dysplasia|inflammation|granuloma|reversible\s+cell\s+injury|irreversible\s+cell\s+injury|hyperplasia|apoptosis|coagulative\s+necrosis|liquefactive\s+necrosis|infarction|thromboembolism)\b/i,
 histology:/\b(?:histolog(?:y|ical)|microscopic\s+structure|microscopic\s+appearance|light\s+microscop(?:y|ic)|electron\s+micrograph|staining\s+pattern|epithelium\s+lining|connective\s+tissue|goblet\s+cells|stratified\s+squamous|simple\s+columnar|histoarchitecture)\b/i,
 embryo:/\b(?:embryo(?:logy|nic)|embryogenesis|fetal\s+development|gastrulation|neurulation|neural\s+crest|germ\s+layer|organogenesis|somites|primitive\s+streak|pharyngeal\s+arches|neural\s+tube|implantation)\b/i,
 immunology:/\b(?:immunoglobulin|T\s+helper|B\s+lymphocyte|T\s+lymphocyte|hypersensitivity|complement\s+(?:cascade|pathway)|major\s+histocompatibility|MHC\s+(?:class|I|II)|antigen\s+presenting|immune\s+response|cytokines?|autoantibod(?:y|ies))\b/i,
 epi:/\b(?:incidence\s+rate|prevalence\s+ratio|relative\s+risk|odds\s+ratio|case.control|cohort\s+study|cross.sectional|surveillance|epidemiolog(?:y|ical)|attack\s+rate|outbreak\s+investigation|screening\s+(?:sensitivity|specificity))\b/i,
 stats:/\b(?:p.value|confidence\s+interval|chi.square|linear\s+regression|logistic\s+regression|sample\s+size|standard\s+deviation|null\s+hypothesis|t.test|ANOVA|probability\s+distribution|statistical\s+significance|correlation\s+coefficient)\b/i,
 pediatrics:/\b(?:neonatal|newborn|infant|premature\s+baby|paediatric|pediatric|under.five|childhood\s+immuni[sz]ation)\b/i,
 og:/\b(?:antenatal|postpartum|intrapartum|preeclampsia|pre.eclampsia|eclampsia|labou?r|ectopic\s+pregnancy|placental\s+abruption|placenta\s+previa|obstetric|cervical\s+cancer|pelvic\s+inflammatory\s+disease|ovarian\s+torsion|uterine\s+fibroids?|g\d+p\d+)\b/i,
 cv:/\b(?:heart\s+failure|myocardial\s+infarction|angina|ECG|electrocardiogram|arrhythmia|hypertension|heart\s+valve|cardiomyopathy|cardiac\s+arrest|pericarditis)\b/i,
 renal:/\b(?:acute\s+kidney\s+injury|chronic\s+kidney\s+disease|renal\s+failure|glomerulonephritis|nephrotic\s+syndrome|hemodialysis|haemodialysis|proteinuria)\b/i,
 respiratory:/\b(?:asthma|COPD|emphysema|pneumonia|bronchiectasis|tuberculosis|pleural\s+effusion|pulmonary\s+embolism|bronchitis|interstitial\s+lung\s+disease)\b/i,
 gastro:/\b(?:hepatitis|cirrhosis|peptic\s+ulcer|gastroesophageal|gastro.oesophageal|gastritis|pancreatitis|inflammatory\s+bowel\s+disease|gastrointestinal\s+bleeding|liver\s+failure)\b/i,
 endocrine:/\b(?:diabetes\s+mellitus|DKA\b|thyrotoxicosis|hypothyroidism|hyperthyroidism|cushing.s|adrenal\s+insufficiency|acromegaly|hypercalcemia|hypercalcaemia)\b/i,
 hematology:/\b(?:sickle.cell|anemia|anaemia|leukemia|leukaemia|lymphoma|myeloma|coagulopathy|thrombocytopenia|transfusion|hemophilia|haemophilia)\b/i,
 neuro:/\b(?:stroke|seizure|epilepsy|parkinson|multiple\s+sclerosis|meningitis|encephalitis|myasthenia|Guillain.Barr[eé]|TIA\b|neuroanatomy)\b/i,
 ent:/\b(?:otitis|sinusitis|tonsillitis|hearing\s+loss|mastoiditis|epistaxis|ear\s+canal|tympanic\s+membrane|laryngitis)\b/i,
 skin:/\b(?:acne|eczema|psoriasis|urticaria|dermatitis|melanoma|pemphigus|impetigo)\b/i,
 psy:/\b(?:schizophrenia|psychosis|bipolar|depression|suicidal|manic\s+episode|obsessive.compulsive|PTSD\b|psychiatric)\b/i,
 ophthalmic:/\b(?:glaucoma|cataract|retinopathy|retinal\s+detachment|uveitis|keratitis|visual\s+acuity)\b/i,
 surgery:/\b(?:laparotomy|appendectomy|appendicectomy|cholecystectomy|hernia\s+repair|surgical\s+management|bowel\s+obstruction|peritonitis|wound\s+dehiscence|postoperative|surgical\s+site\s+infection)\b/i,
 radiology:/\b(?:chest\s+x.ray|CT\s+scan|MRI\b|ultrasound\s+image|radiographic\s+appearance|sonograph|computed\s+tomography|imaging\s+study|contrast\s+enhancement)\b/i,
 genetic:/\b(?:Mendelian|pedigree|chromosomal\s+abnormalit|karyotype|autosomal\s+(?:dominant|recessive)|X.linked\s+(?:inheritance|disease)|genetic\s+counselling)\b/i
};
const tidy=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const seriousTopic=/^(?:unassigned(?:\s+topic)?|unknown|n\/a|others?|other topics?|miscellaneous|none|department review required)$/i;
const has=(rx,s)=>rx.test(s);
const leadingFocus=raw=>{
 const s=tidy(raw);
 const questions=[...s.matchAll(/(?:which|what|identify|select|choose|how|why|name|describe|explain|list|define|calculate|diagnose)\b[^?!]{7,250}[?!]/gi)];
 const last=questions.at(-1)?.[0];
 return last||s.slice(-Math.min(250,s.length));
};
/** Domain terms should match the tested question, not merely an incidental history line. */
function strongMatch(rx,full,focus){return has(rx,focus)|| (focus===full&&has(rx,full));}
const TOPICS={
 [S.ANATOMY]:[
  ['Neuroanatomy',/\b(?:brainstem|cerebellum|cranial\s+nerves?|spinal\s+cord|ventricular\s+system|meninges|cerebr(?:um|al)\s+cortex|neuroanatomy)\b/i],
  ['Head and Neck',/\b(?:head\s+and\s+neck|carotid|facial\s+nerve|pharynx|larynx|scalp|parotid|neck\s+triangles?|thyroid\s+gland)\b/i],
  ['Upper Limb',/\b(?:upper\s+limb|brachial|axillary|radial\s+nerve|median\s+nerve|ulnar\s+nerve|humerus|forearm|wrist|hand\s+muscles?)\b/i],
  ['Lower Limb',/\b(?:lower\s+limb|femoral|sciatic|fibular|popliteal|tibia|fibula|foot|ankle|thigh)\b/i],
  ['Thorax',/\b(?:thorax|thoracic|intercostal|mediastinum|sternum|pleura|pericardium|coronary\s+artery)\b/i],
  ['Abdomen',/\b(?:abdomen|abdominal|peritoneal|hepatic\s+portal|celiac\s+trunk|coeliac\s+trunk|mesentery|spleen|kidney\s+relations)\b/i],
  ['Pelvis and Perineum',/\b(?:pelvis|pelvic|perineum|perineal|prostate|uterus|rectum|anal\s+canal)\b/i],
  ['Back and Vertebral Column',/\b(?:vertebral\s+column|vertebrae|intervertebral|back\s+muscles?)\b/i]
 ],
 [S.PHARMA]:[
  ['General Pharmacology',/\b(?:pharmacokinetics|pharmacodynamics|bioavailability|half.life|receptor|agonist|antagonist|dose.response|therapeutic\s+index)\b/i],
  ['Antimicrobial Pharmacology',/\b(?:antibiotics?|antibacterials?|antivirals?|antifungals?|antimalarials?|penicillin|cephalosporin|quinolone|aminoglycoside|artemether|ceftriaxone|amoxicillin|metronidazole)\b/i],
  ['Cardiovascular Pharmacology',/\b(?:ACE\s+inhibitor|beta.blocker|calcium.channel\s+blocker|diuretics?|antihypertensive|antiarrhythmic|statins?|warfarin|heparin)\b/i],
  ['Autonomic Pharmacology',/\b(?:sympathetic|parasympathetic|adrenergic|cholinergic|muscarinic|acetylcholine|atropine)\b/i],
  ['CNS Pharmacology',/\b(?:anticonvulsant|antiepileptic|benzodiazepine|antipsychotic|antidepressant|opioid|anesthetic|anaesthetic|dopamine)\b/i],
  ['Endocrine Pharmacology',/\b(?:insulin|glucocorticoid|thyroxine|antithyroid|metformin|oral\s+hypoglycemic)\b/i],
  ['Toxicology and Adverse Effects',/\b(?:poisoning|overdose|toxicity|toxicology|adverse\s+drug|drug\s+interaction|contraindication)\b/i]
 ],
 [S.INT]:[['Cardiology',RX.cv],['Nephrology',RX.renal],['Respiratory Medicine',RX.respiratory],['Gastroenterology and Hepatology',RX.gastro],['Endocrinology',RX.endocrine],['Infectious Diseases',/\b(?:malaria|tuberculosis|HIV|sepsis|meningitis|typhoid|infection)\b/i],['Rheumatology',/\b(?:arthritis|lupus|rheumatoid|gout|vasculitis)\b/i]],
 [S.PHYS]:[['Cardiovascular Physiology',/\b(?:cardiac\s+output|heart\s+rate|stroke\s+volume|blood\s+pressure|baroreceptor)\b/i],['Renal Physiology',/\b(?:nephron|glomerular|renal\s+clearance|GFR\b|countercurrent|urine\s+concentration)\b/i],['Respiratory Physiology',/\b(?:ventilation|gas\s+exchange|lung\s+compliance|tidal\s+volume|respiratory\s+quotient)\b/i],['Neurophysiology',/\b(?:action\s+potential|synap(?:se|tic)|nerve\s+conduction|reflex\s+arc)\b/i],['Endocrine Physiology',/\b(?:thyroid\s+hormone|pituitary|insulin|glucagon|hormonal\s+regulation)\b/i],['Transport and Homeostasis',/\b(?:osmosis|diffusion|homeostasis|acid.base|membrane\s+transport)\b/i]],
 [S.BIO]:[['Carbohydrate Metabolism',/\b(?:glycolysis|gluconeogenesis|glycogen|glucose\s+metabolism|TCA|Krebs)\b/i],['Lipid Metabolism',/\b(?:fatty\s+acid|lipid|cholesterol|lipoprotein|beta.oxidation|ketogenesis)\b/i],['Proteins and Enzymes',/\b(?:amino.acid|proteins?|enzyme|transamination|peptide)\b/i],['Nucleic Acids and Molecular Biology',/\b(?:DNA|RNA|nucleotide|replication|transcription|translation)\b/i],['Vitamins and Minerals',/\b(?:vitamin|cofactor|mineral\s+deficiency)\b/i]],
 [S.PATH]:[['Cell Injury and Adaptation',/\b(?:apoptosis|necrosis|metaplasia|atrophy|dysplasia|hyperplasia|cell\s+injury)\b/i],['Inflammation and Repair',/\b(?:inflammation|granuloma|wound\s+healing|fibrosis)\b/i],['Neoplasia',/\b(?:neoplasm|tumor|tumour|carcinoma|sarcoma|metastasis|malignancy|oncogen)\b/i],['Hemodynamic Disorders',/\b(?:thrombosis|embolism|infarction|edema|oedema|shock)\b/i],['Systemic Pathology',/\b(?:glomerular|pulmonary|cardiac|hepatic|histopathological)\b/i]],
 [S.PARA]:[['Protozoology',/\b(?:plasmodium|giardia|entamoeba|trypanosoma|leishmania|toxoplasma|protozoa)\b/i],['Helminthology',/\b(?:schistosoma|ascaris|hookworm|taenia|onchocerca|helminth|nematode|cestode|trematode)\b/i],['Medical Entomology',/\b(?:mosquito|anopheles|aedes|tsetse|vector|arthropod)\b/i],['Parasite Life Cycles',/\b(?:life\s+cycle|intermediate\s+host|definitive\s+host|larval\s+stages)\b/i]],
 [S.MICRO]:[['Bacteriology',/\b(?:bacterial|gram.positive|gram.negative|mycobacter|staphylococcus|streptococcus|culture\s+medium)\b/i],['Virology',/\b(?:virus|viral|HIV|hepatitis\s+[a-e]|influenza|DNA\s+virus|RNA\s+virus)\b/i],['Mycology',/\b(?:fung(?:al|us|i)|candida|aspergillus|cryptococcus)\b/i],['Diagnostic Microbiology',/\b(?:gram\s+stain|culture|sensitivity\s+testing|microbiological\s+diagnosis)\b/i]],
 [S.HEM]:[['Red Cell Disorders',/\b(?:anemia|anaemia|thalassemia|hemolysis|sickle.cell|iron\s+deficiency)\b/i],['White Cell and Lymphoid Disorders',/\b(?:leukemia|leukaemia|lymphoma|myeloma|leukocytosis)\b/i],['Hemostasis and Thrombosis',/\b(?:coagul(?:ation|opathy)|hemophilia|haemophilia|thrombocytopenia|platelet|DIC\b)\b/i],['Transfusion Medicine',/\b(?:transfusion|blood\s+group|cross.match)\b/i]],
 [S.OG]:[['Antenatal Care',/\b(?:antenatal|prenatal|routine\s+OB\s+visit|pregnancy)\b/i],['Obstetric Emergencies',/\b(?:eclampsia|postpartum\s+hemorrhage|placenta\s+previa|placental\s+abruption|ectopic\s+pregnancy)\b/i],['Labour and Delivery',/\b(?:labou?r|delivery|breech|partograph|fetal\s+presentation)\b/i],['Gynecological Disorders',/\b(?:gynecolog|gynaecolog|ovarian|uterine|cervical|endometriosis|pelvic\s+inflammatory)\b/i]],
 [S.PEDS]:[['Neonatology',/\b(?:newborn|neonat(?:al|e)|prematurity|birth\s+asphyxia)\b/i],['Growth and Development',/\b(?:growth|development|milestones|puberty|failure\s+to\s+thrive)\b/i],['Pediatric Infectious Diseases',/\b(?:measles|pneumonia|malaria|diarrhea|diarrhoea|febrile)\b/i],['Pediatric Emergencies',/\b(?:convulsion|seizure|shock|resuscitation|dehydration)\b/i]],
 [S.NEURO]:[['Cerebrovascular Disease',/\b(?:stroke|TIA\b|ischemi(?:c|a)|carotid\s+stenosis)\b/i],['Seizure Disorders',/\b(?:seizure|epilep)\b/i],['Infections and Inflammation',/\b(?:meningitis|encephalitis)\b/i],['Movement and Neuromuscular',/\b(?:parkinson|tremor|myasthenia|neuropathy|Guillain)\b/i]],
 [S.SURG]:[['Acute Abdomen',/\b(?:appendicitis|peritonitis|cholecystitis|perforation|intestinal\s+obstruction)\b/i],['Trauma and Emergency Surgery',/\b(?:trauma|fracture|hemorrhage|haemorrhage|motor\s+vehicle)\b/i],['Perioperative Care',/\b(?:anesthesia|anaesthesia|preoperative|postoperative|surgical\s+site\s+infection|wound)\b/i],['Breast and Endocrine Surgery',/\b(?:breast|thyroid|parathyroid)\b/i]],
 [S.EMERG]:[['Resuscitation and Shock',/\b(?:CPR|cardiac\s+arrest|shock|resuscitation|anaphylaxis)\b/i],['Acute Emergencies',/\b(?:emergency|airway|acute|poisoning|overdose|trauma)\b/i]],
 [S.EPI]:[['Study Designs',RX.epi],['Screening and Surveillance',/\b(?:screening|surveillance|outbreak|epidemic)\b/i]],
 [S.BIOSTATS]:[['Statistical Inference',RX.stats],['Sample Size and Study Planning',/\b(?:sample\s+size|power|hypothesis)\b/i]],
 [S.IMM]:[['Adaptive Immunity',/\b(?:B\s+cell|T\s+cell|immunoglobulin|antigen|antibody)\b/i],['Innate Immunity',/\b(?:complement|macrophage|innate|natural\s+killer)\b/i],['Hypersensitivity and Autoimmunity',/\b(?:hypersensitivity|autoimmune|autoantibody)\b/i]],
 [S.EMBRYO]:[['Early Development',/\b(?:blastocyst|implantation|gastrulation|neurulation|embryonic)\b/i],['Organogenesis',/\b(?:organogenesis|pharyngeal\s+arches|neural\s+tube|limb\s+buds?)\b/i]],
 [S.HIST]:[['Epithelium',/\b(?:epithel|goblet|columnar|squamous)\b/i],['Connective and Muscle Tissues',/\b(?:connective|cartilage|muscle|collagen)\b/i],['Organ Histology',/\b(?:liver|kidney|spleen|lung|histological|micrograph)\b/i]],
 [S.RAD]:[['Radiographic Interpretation',RX.radiology],['Ultrasonography',/\b(?:ultrasound|sonograph)\b/i],['CT and MRI',/\b(?:CT\b|MRI\b|tomography)\b/i]],
 [S.GEN]:[['Mendelian Inheritance',RX.genetic],['Chromosomal Disorders',/\b(?:chromosomal|trisomy|karyotype)\b/i]],
 [S.NUT]:[['Clinical Nutrition',/\b(?:nutrition|malnutrition|feeding|BMI\b|diet|obesity|protein.energy)\b/i]],
 [S.ENT]:[['Otology',/\b(?:ear|hearing|otitis|tympanic|mastoiditis)\b/i],['Rhinology',/\b(?:nose|sinus|rhino|epistaxis)\b/i],['Laryngology',/\b(?:larynx|laryngitis|voice|vocal\s+cord|pharynx)\b/i]],
 [S.OPH]:[['Ophthalmic Disorders',RX.ophthalmic]],
 [S.PSY]:[['Mood Disorders',/\b(?:depression|bipolar|mania)\b/i],['Psychotic Disorders',/\b(?:psychosis|schizophrenia|delusions|hallucinations)\b/i],['Anxiety and Trauma-related Disorders',/\b(?:anxiety|PTSD|panic|OCD)\b/i]],
 [S.DERM]:[['Inflammatory Skin Disorders',/\b(?:eczema|psoriasis|dermatitis|urticaria)\b/i],['Skin Infections',/\b(?:impetigo|cellulitis|fungal\s+skin)\b/i],['Skin Neoplasms',/\b(?:melanoma|skin\s+cancer)\b/i]]
};
const badTopic=/^(?:Unassigned topic|Department review required|Unclassified|unknown|Miscellaneous|None|N\/A|Other)$/i;
const TOPIC_ALIASES={
 [S.ANATOMY]:{'Head & Neck':'Head and Neck','Histology and Tissues':null},
 [S.PHARMA]:{'CNS Pharmacology · Suggested':'CNS Pharmacology','General Pharmacology · Suggested':'General Pharmacology'},
 [S.PARA]:{'Medical Parasitology':null}
};
const CONTAMINATED=/\b(?:HYPERLINK|INCLUDEPICTURE|MERGEFORMAT|\\insrsid|\\charrsid|[{}]\\f\d+)\b/i;
/**
 * For a source with demonstrably wrong disciplinary context, require
 * an explicit exam focus before moving it. Anything unclear stays review-only.
 */
export function curateQuestion(question){
 const baseline=resolveQuestionDepartment(question);
 const full=tidy(question?.stem);
 const focus=leadingFocus(full);
 const source=baseline.sourceSubject;
 let subject=baseline.subject,reason=baseline.reason,review=baseline.review;
 let confidence=baseline.reassigned&&!baseline.review?'medium':'source';
 if(subject===S.ANATOMY && isClinicalManagementQuestion(question)){subject=UNRESOLVED_SUBJECT;reason='treatment_in_anatomy';review=true;}
 const explicitClinical=isClinicalManagementQuestion(question);
 const drugFocus=strongMatch(RX.pharm,full,focus)||strongMatch(RX.pharmRequest,full,focus);
 const clearAnatomy=strongMatch(RX.anat,full,focus)||strongMatch(RX.anatAsk,full,focus);
 const safeToMoveBasic=new Set([S.ANATOMY,S.PHYS,S.BIO,S.HIST,S.EMBRYO]);
 // Drug effects and mechanisms are Pharmacology even if the source file
 // was accidentally imported under physiology, histology or anatomy.
 if(safeToMoveBasic.has(subject) && drugFocus && !clearAnatomy && !RX.biochemistry.test(focus)){
    subject=S.PHARMA;reason='explicit_drug_focus';confidence='high';review=false;
 }
 // Opposite correction: true structural identification under non-Anatomy.
 if([S.PHARMA,S.BIO,UNRESOLVED_SUBJECT].includes(subject) && clearAnatomy &&
    !explicitClinical&&!drugFocus&&!RX.physiology.test(focus)){
    subject=S.ANATOMY;reason='explicit_structural_anatomy';confidence='high';review=false;
 }
 const actualQuestion=focus.length>40?focus:full;
 if(subject===UNRESOLVED_SUBJECT && !explicitClinical) {
  const signal=[
    [S.PARA,RX.parasite],[S.MICRO,RX.micro],[S.BIO,RX.biochemistry],
    [S.IMM,RX.immunology],[S.EMBRYO,RX.embryo],[S.HIST,RX.histology],
    [S.EPID,RX.epi],[S.BIOSTATS,RX.stats],[S.GEN,RX.genetic]
  ].filter(([,rx])=>rx.test(actualQuestion));
  if(signal.length===1 && typeof signal[0][0]==='string' && (actualQuestion.length<220 || rxMatches(full,signal[0][1])>=2)){
    subject=signal[0][0];reason='explicit_unclassified_discipline';confidence='medium';review=true;
  }
 }
 if(subject===S.ANATOMY && !clearAnatomy && !explicitClinical && !drugFocus &&
    RX.parasite.test(focus) && !RX.anatAsk.test(full)){
    subject=S.PARA;reason='parasite_outside_anatomy';confidence='medium';review=true;
 }
 if(subject===S.PHARMA&&!drugFocus && !explicitClinical &&
    strongMatch(RX.biochemistry,full,focus) && !RX.pharm.test(full) && !RX.pharmRequest.test(full)){
    subject=S.BIO;reason='biochemistry_outside_pharmacology';confidence='medium';review=true;
 }
 // Histology of healthy tissues is distinct from pathological treatment.
 if(subject===S.HIST && explicitClinical){
    subject=UNRESOLVED_SUBJECT;reason='clinical_management_in_histology';review=true;
 }
 if(subject===S.ANATOMY && explicitClinical){
   subject=UNRESOLVED_SUBJECT;reason='anatomy_management_hard_boundary';review=true;
 }
 if(subject===UNRESOLVED_SUBJECT)review=true;
 if(CONTAMINATED.test(full))review=true;
 // Never inherit a clearly foreign topic after changing departments.
 const same=subject===source;
 const original=tidy(question?.topic);
 let topic='';
 let topicReason='academic_taxonomy';
 const matches=TOPICS[subject]||[];
 const hits=matches.filter(([,pattern])=>pattern.test(actualQuestion));
 if(hits.length===1){topic=hits[0][0];}
 else if(hits.length>1){const mapped=matches.find(([label])=>label===original);if(mapped)topic=original;else{topic=hits[0][0];review=true;topicReason='multiple_matching_topics';}}
 if(!topic && same && !badTopic.test(original) && original){
    topic=(TOPIC_ALIASES[subject]||{})[original]===undefined?original:(TOPIC_ALIASES[subject]||{})[original];
    if(topic)topicReason='preserved_source_topic';
 }
 if(!topic){
  topic='Topic review required';review=true;topicReason='unresolved_topic';
 }
 if(subject===S.ANATOMY && explicitClinical){subject=UNRESOLVED_SUBJECT;topic='Topic review required';review=true;}
 if(subject!==source && reason==='source_subject_retained')reason='cross_subject_content';
 return {subject,topic,sourceSubject:source,sourceTopic:original,
   reassigned:subject!==source,review,reason,topicReason,confidence};
}
function rxMatches(s,rx){
 let count=0;for(const line of s.split(/[.?!;]+/)){if(rx.test(line))count++;}return count;
}
export function duplicateKey(q){
 const stem=tidy(q?.stem).toLocaleLowerCase('en').replace(/^[\s]*(?:question\s*)?\d+\s*[-.):]\s*/,'')
   .replace(/[“”‘’]/g,"'").replace(/\s*([,:;?!])\s*/g,'$1');
 if(stem.length<35)return '';
 const opts=Array.isArray(q?.options)?q.options.map(o=>tidy(o?.text).toLowerCase()):[];
 // Stem-only deduplication for written questions; require exact same
 // normalized choice text and choice counts for MCQs.
 return JSON.stringify([stem,opts]);
}
export function similarStemKey(q){
 return tidy(q?.stem).toLowerCase().replace(/^[\s]*(?:question\s*)?\d+\s*[-.):]\s*/,'')
   .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

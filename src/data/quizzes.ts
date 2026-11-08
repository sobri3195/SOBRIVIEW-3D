export type Question = {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  topic: string;
  difficulty: "Foundation" | "Intermediate";
};
const facts: [string, string, string, string, string[]][] = [
  [
    "Which organ produces bile?",
    "Liver",
    "Hepatobiliary",
    "Hepatocytes produce bile, which travels through the biliary tree.",
    ["Gallbladder", "Spleen", "Pancreas"],
  ],
  [
    "Where is bile stored and concentrated?",
    "Gallbladder",
    "Hepatobiliary",
    "The gallbladder stores and concentrates bile between meals.",
    ["Liver", "Stomach", "Appendix"],
  ],
  [
    "Which Couinaud segment is the caudate lobe?",
    "I",
    "Liver segments",
    "Segment I is the caudate segment and has distinct venous drainage.",
    ["II", "IV", "VIII"],
  ],
  [
    "Which segment is left lateral superior?",
    "II",
    "Liver segments",
    "Segment II is superior within the left lateral section.",
    ["III", "V", "VI"],
  ],
  [
    "Which segment is left lateral inferior?",
    "III",
    "Liver segments",
    "Segment III is inferior within the left lateral section.",
    ["II", "VII", "VIII"],
  ],
  [
    "Which segment is left medial?",
    "IV",
    "Liver segments",
    "Segment IV forms the left medial section; it may be divided into IVa and IVb.",
    ["I", "VI", "VII"],
  ],
  [
    "Which segment is right anterior inferior?",
    "V",
    "Liver segments",
    "Segment V lies in the inferior right anterior section.",
    ["VI", "VII", "II"],
  ],
  [
    "Which segment is right posterior inferior?",
    "VI",
    "Liver segments",
    "Segment VI is the inferior right posterior segment.",
    ["V", "VIII", "IV"],
  ],
  [
    "Which segment is right posterior superior?",
    "VII",
    "Liver segments",
    "Segment VII is the superior right posterior segment.",
    ["VI", "III", "V"],
  ],
  [
    "Which segment is right anterior superior?",
    "VIII",
    "Liver segments",
    "Segment VIII is the superior right anterior segment.",
    ["V", "II", "VI"],
  ],
  [
    "Which vessels define major intersegmental planes in the liver?",
    "Hepatic veins",
    "Liver segments",
    "Hepatic veins course along major intersegmental planes.",
    ["Portal branches", "Renal veins", "Cystic arteries"],
  ],
  [
    "Which vessel provides most hepatic blood flow by volume?",
    "Portal vein",
    "Hepatobiliary",
    "The portal vein supplies most hepatic inflow by volume.",
    ["Hepatic artery", "Aorta", "Hepatic vein"],
  ],
  [
    "Where do hepatic veins normally drain?",
    "Inferior vena cava",
    "Hepatobiliary",
    "Hepatic veins return blood directly to the inferior vena cava.",
    ["Portal vein", "Splenic vein", "Superior vena cava"],
  ],
  [
    "What plane divides the body into superior and inferior portions?",
    "Axial",
    "Orientation",
    "An axial or transverse plane separates superior and inferior portions.",
    ["Sagittal", "Coronal", "Oblique sagittal"],
  ],
  [
    "What plane divides anterior and posterior portions?",
    "Coronal",
    "Orientation",
    "The coronal plane separates anterior from posterior.",
    ["Axial", "Sagittal", "Transverse"],
  ],
  [
    "What plane divides left and right portions?",
    "Sagittal",
    "Orientation",
    "Sagittal planes separate left and right portions.",
    ["Coronal", "Axial", "Transverse"],
  ],
  [
    "In standard axial radiological display, patient right is usually on which side?",
    "Display left",
    "Orientation",
    "Axial images are conventionally viewed from the feet; always confirm orientation metadata.",
    ["Display right", "Display top", "Display bottom"],
  ],
  [
    "Which metadata specifies physical pixel dimensions?",
    "PixelSpacing",
    "Imaging",
    "PixelSpacing provides row and column spacing, commonly in millimeters.",
    ["PatientName", "WindowWidth", "SeriesDescription"],
  ],
  [
    "Which metadata specifies the spatial origin of an image?",
    "ImagePositionPatient",
    "Imaging",
    "ImagePositionPatient locates the first voxel center in patient coordinates.",
    ["InstanceNumber", "PatientAge", "WindowCenter"],
  ],
  [
    "Which metadata provides row and column direction cosines?",
    "ImageOrientationPatient",
    "Imaging",
    "These six values define image-plane orientation.",
    ["PixelRepresentation", "Rows", "RescaleSlope"],
  ],
  [
    "How are CT stored values converted when valid rescale metadata is present?",
    "Value × slope + intercept",
    "Imaging",
    "A linear rescale uses RescaleSlope and RescaleIntercept.",
    ["Value + slope × intercept", "Value ÷ intercept", "Value × window width"],
  ],
  [
    "What does increasing window width generally do?",
    "Reduces displayed contrast",
    "Imaging",
    "A wider intensity range is mapped to the same display range.",
    [
      "Increases spatial resolution",
      "Changes voxel spacing",
      "Increases slice thickness",
    ],
  ],
  [
    "What does window level control?",
    "Center of displayed intensity range",
    "Imaging",
    "Window level sets the center of the intensity window.",
    ["Number of slices", "Pixel size", "Image orientation"],
  ],
  [
    "What is required for valid multiplanar reconstruction?",
    "A spatially coherent volume",
    "Imaging",
    "MPR resamples a volume using orientation and voxel spacing.",
    ["One screenshot", "A filename list alone", "A patient name"],
  ],
  [
    "Which ordering method is preferred for a spatial DICOM stack?",
    "Position projected onto slice normal",
    "Imaging",
    "The slice normal is derived from orientation direction cosines.",
    ["Alphabetical filename", "File size", "Upload time"],
  ],
  [
    "Which DICOM UID identifies a series?",
    "SeriesInstanceUID",
    "Imaging",
    "A series groups related instances within a study.",
    ["StudyInstanceUID", "SOPClassUID", "TransferSyntaxUID"],
  ],
  [
    "Which UID identifies an individual DICOM instance?",
    "SOPInstanceUID",
    "Imaging",
    "SOPInstanceUID uniquely identifies an instance.",
    ["SeriesInstanceUID", "FrameOfReferenceUID", "ImplementationClassUID"],
  ],
  [
    "Which organ filters blood to form urine?",
    "Kidney",
    "Urinary",
    "Nephrons filter plasma and modify filtrate to produce urine.",
    ["Spleen", "Liver", "Gallbladder"],
  ],
  [
    "Which structure carries urine from kidney to bladder?",
    "Ureter",
    "Urinary",
    "Each ureter connects a renal pelvis to the bladder.",
    ["Urethra", "Renal artery", "Renal vein"],
  ],
  [
    "Which structure carries urine out of the bladder?",
    "Urethra",
    "Urinary",
    "The urethra conveys urine from the bladder to the exterior.",
    ["Ureter", "Collecting duct", "Renal pelvis"],
  ],
  [
    "Where are the kidneys located?",
    "Retroperitoneum",
    "Urinary",
    "The kidneys lie posterior to the peritoneum.",
    ["Pleural cavity", "Pericardial cavity", "Cranial cavity"],
  ],
  [
    "Which kidney is usually slightly lower?",
    "Right kidney",
    "Urinary",
    "The liver contributes to the lower position of the right kidney.",
    ["Left kidney", "Both always equal", "Neither has a position"],
  ],
  [
    "How many chambers does the heart have?",
    "Four",
    "Cardiovascular",
    "Two atria and two ventricles form the four chambers.",
    ["Two", "Three", "Six"],
  ],
  [
    "Which chamber pumps into the aorta?",
    "Left ventricle",
    "Cardiovascular",
    "The left ventricle ejects into the systemic circulation.",
    ["Right ventricle", "Left atrium", "Right atrium"],
  ],
  [
    "Which chamber pumps into the pulmonary trunk?",
    "Right ventricle",
    "Cardiovascular",
    "The right ventricle supplies the pulmonary circulation.",
    ["Left ventricle", "Right atrium", "Left atrium"],
  ],
  [
    "Which vessels return oxygenated blood from lungs?",
    "Pulmonary veins",
    "Cardiovascular",
    "Pulmonary veins deliver oxygenated blood to the left atrium.",
    ["Pulmonary arteries", "Venae cavae", "Coronary arteries"],
  ],
  [
    "Which artery is the main systemic outflow vessel?",
    "Aorta",
    "Cardiovascular",
    "The aorta arises from the left ventricle.",
    ["Pulmonary trunk", "Portal vein", "Superior vena cava"],
  ],
  [
    "How many lobes does the right lung usually have?",
    "Three",
    "Respiratory",
    "The right lung has upper, middle and lower lobes.",
    ["Two", "Four", "One"],
  ],
  [
    "How many lobes does the left lung usually have?",
    "Two",
    "Respiratory",
    "The left lung has upper and lower lobes.",
    ["Three", "Four", "One"],
  ],
  [
    "Where does pulmonary gas exchange occur?",
    "Alveoli",
    "Respiratory",
    "Gas diffuses across the alveolar-capillary membrane.",
    ["Trachea", "Main bronchi", "Pleural cavity"],
  ],
  [
    "Which muscle is the primary muscle of inspiration?",
    "Diaphragm",
    "Respiratory",
    "Diaphragm contraction expands thoracic volume.",
    ["Biceps brachii", "Masseter", "Rectus femoris"],
  ],
  [
    "Which structure separates thorax and abdomen?",
    "Diaphragm",
    "Anatomy",
    "The diaphragm forms the muscular boundary between these cavities.",
    ["Peritoneum alone", "Sternum", "Pelvic floor"],
  ],
  [
    "Which organ is the main site of nutrient absorption?",
    "Small intestine",
    "Digestive",
    "Most nutrient absorption occurs in the small intestine.",
    ["Stomach", "Esophagus", "Gallbladder"],
  ],
  [
    "Which organ primarily absorbs water from intestinal contents?",
    "Large intestine",
    "Digestive",
    "The colon absorbs water and electrolytes and forms stool.",
    ["Esophagus", "Pancreas", "Spleen"],
  ],
  [
    "Which organ has endocrine and exocrine functions?",
    "Pancreas",
    "Digestive",
    "The pancreas releases hormones into blood and digestive enzymes into ducts.",
    ["Gallbladder", "Esophagus", "Appendix"],
  ],
  [
    "Which structure protects the spinal cord?",
    "Vertebral column",
    "Nervous",
    "The vertebral canal surrounds the spinal cord.",
    ["Sternum", "Clavicle", "Patella"],
  ],
  [
    "Which cavity houses the brain?",
    "Cranial cavity",
    "Nervous",
    "The cranial cavity encloses the brain.",
    ["Pleural cavity", "Abdominal cavity", "Pelvic cavity"],
  ],
  [
    "Which term means closer to the midline?",
    "Medial",
    "Orientation",
    "Medial describes a position toward the median plane.",
    ["Lateral", "Distal", "Superficial"],
  ],
  [
    "Which term means farther from the trunk along a limb?",
    "Distal",
    "Orientation",
    "Distal indicates farther from the origin or attachment.",
    ["Proximal", "Medial", "Superior"],
  ],
  [
    "When pixel spacing is absent, what units should distance use?",
    "Pixels",
    "Measurements",
    "Physical length cannot be reliably inferred without calibration.",
    ["Millimeters by assumption", "Centimeters always", "HU"],
  ],
  [
    "What is needed to display patient segmentation accurately?",
    "A registered segmentation matching the source volume",
    "Imaging",
    "Segmentation must align with the source frame of reference and geometry.",
    ["A generic organ drawing", "Patient age", "A window preset"],
  ],
  [
    "Can local DICOM files contain identifiers in pixels?",
    "Yes, burned-in text may identify patients",
    "Privacy",
    "Removing header fields alone does not guarantee anonymization.",
    [
      "No, only headers contain identifiers",
      "Only ZIP files can",
      "Only MRI can",
    ],
  ],
];
export const questions: Question[] = facts.map(
  ([question, correct, topic, explanation, wrong], id) => {
    const answer = id % 4;
    const options = [...wrong];
    options.splice(answer, 0, correct);
    return {
      id,
      question,
      options,
      answer,
      explanation,
      topic,
      difficulty: id < 20 ? "Foundation" : "Intermediate",
    };
  },
);
export function score(answers: Record<number, number>, quiz: Question[]) {
  return quiz.reduce((n, q) => n + (answers[q.id] === q.answer ? 1 : 0), 0);
}
export function shuffle<T>(items: T[], random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

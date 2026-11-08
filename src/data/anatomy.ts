export type Structure = {
  id: string;
  en: string;
  idName: string;
  latin: string;
  system: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
  description: string;
  location: string;
};
export const organs: Structure[] = [
  {
    id: "brain",
    en: "Brain",
    idName: "Otak",
    latin: "Encephalon",
    system: "Nervous",
    color: "#e8b4be",
    position: [0, 3.2, 0],
    scale: [0.65, 0.55, 0.55],
    description:
      "Coordinates sensory processing, movement and higher cognitive functions.",
    location: "Cranial cavity",
  },
  {
    id: "lung-left",
    en: "Left lung",
    idName: "Paru kiri",
    latin: "Pulmo sinister",
    system: "Respiratory",
    color: "#66bcd0",
    position: [0.68, 1.55, 0],
    scale: [0.55, 1, 0.4],
    description:
      "Gas exchange across the alveolar-capillary membrane. The left lung has two lobes.",
    location: "Left hemithorax",
  },
  {
    id: "lung-right",
    en: "Right lung",
    idName: "Paru kanan",
    latin: "Pulmo dexter",
    system: "Respiratory",
    color: "#66bcd0",
    position: [-0.68, 1.55, 0],
    scale: [0.6, 1.05, 0.4],
    description:
      "The right lung has three lobes and receives deoxygenated blood through the pulmonary arteries.",
    location: "Right hemithorax",
  },
  {
    id: "heart",
    en: "Heart",
    idName: "Jantung",
    latin: "Cor",
    system: "Cardiovascular",
    color: "#ed6c82",
    position: [0.12, 1.25, 0.4],
    scale: [0.4, 0.55, 0.35],
    description:
      "Four-chambered muscular pump supporting pulmonary and systemic circulation.",
    location: "Middle mediastinum",
  },
  {
    id: "liver",
    en: "Liver",
    idName: "Hati",
    latin: "Hepar",
    system: "Hepatobiliary",
    color: "#ba7868",
    position: [-0.45, 0.05, 0.25],
    scale: [0.9, 0.48, 0.6],
    description:
      "Supports metabolism, detoxification and bile production. Couinaud segments are defined by portal inflow and hepatic venous boundaries.",
    location: "Predominantly right upper abdomen, beneath the diaphragm",
  },
  {
    id: "stomach",
    en: "Stomach",
    idName: "Lambung",
    latin: "Gaster",
    system: "Digestive",
    color: "#d8a082",
    position: [0.65, -0.15, 0.2],
    scale: [0.5, 0.6, 0.35],
    description:
      "Stores ingested food and initiates mechanical and chemical digestion.",
    location: "Left upper abdomen",
  },
  {
    id: "kidney-left",
    en: "Left kidney",
    idName: "Ginjal kiri",
    latin: "Ren sinister",
    system: "Urinary",
    color: "#b46f9c",
    position: [0.65, -0.65, -0.35],
    scale: [0.3, 0.5, 0.25],
    description:
      "Filters blood and regulates fluid, electrolyte and acid-base balance.",
    location: "Left retroperitoneum",
  },
  {
    id: "kidney-right",
    en: "Right kidney",
    idName: "Ginjal kanan",
    latin: "Ren dexter",
    system: "Urinary",
    color: "#b46f9c",
    position: [-0.65, -0.8, -0.35],
    scale: [0.3, 0.5, 0.25],
    description:
      "Receives blood from the renal artery; urine drains to the renal pelvis and ureter.",
    location: "Right retroperitoneum",
  },
  {
    id: "intestine",
    en: "Intestinal tract",
    idName: "Usus",
    latin: "Intestinum",
    system: "Digestive",
    color: "#dcb58c",
    position: [0, -1.3, 0.15],
    scale: [0.75, 0.55, 0.4],
    description:
      "The small intestine absorbs nutrients. The large intestine absorbs water and forms stool.",
    location: "Abdominal cavity",
  },
  {
    id: "bladder",
    en: "Urinary bladder",
    idName: "Kandung kemih",
    latin: "Vesica urinaria",
    system: "Pelvic",
    color: "#e6c77d",
    position: [0, -2.1, 0.2],
    scale: [0.4, 0.35, 0.3],
    description: "Stores urine before voiding through the urethra.",
    location: "Pelvis, posterior to the pubic symphysis",
  },
  {
    id: "spine",
    en: "Vertebral column",
    idName: "Tulang belakang",
    latin: "Columna vertebralis",
    system: "Skeletal",
    color: "#dbd4bc",
    position: [0, 0.1, -0.65],
    scale: [0.16, 2.8, 0.18],
    description: "Supports the axial skeleton and protects the spinal cord.",
    location: "Posterior midline",
  },
  {
    id: "aorta",
    en: "Aorta",
    idName: "Aorta",
    latin: "Aorta",
    system: "Major vessels",
    color: "#e25b70",
    position: [-0.2, 0.1, -0.35],
    scale: [0.08, 2.5, 0.08],
    description: "Main systemic artery arising from the left ventricle.",
    location: "Thorax and abdomen",
  },
  {
    id: "muscle",
    en: "Abdominal wall",
    idName: "Dinding perut",
    latin: "Musculus rectus abdominis",
    system: "Muscular",
    color: "#a85459",
    position: [0, -0.8, 0.7],
    scale: [0.2, 1.2, 0.08],
    description:
      "Schematic representation of the anterior abdominal musculature.",
    location: "Anterior abdominal wall",
  },
];
export const segmentNames = [
  "Caudate segment",
  "Left lateral superior",
  "Left lateral inferior",
  "Left medial",
  "Right anterior inferior",
  "Right posterior inferior",
  "Right posterior superior",
  "Right anterior superior",
];
const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const segments: Structure[] = segmentNames.map((en, i) => ({
  id: `segment-${i + 1}`,
  en: `${roman[i]} · ${en}`,
  idName: `Segmen ${roman[i]}`,
  latin: `Segmentum ${roman[i]}`,
  system: "Couinaud",
  color: [
    "#f6b95c",
    "#54d5c7",
    "#45a7e9",
    "#a18ced",
    "#ed819f",
    "#dd8c61",
    "#6c91d9",
    "#b3cb68",
  ][i],
  position: [
    ((i % 4) - 1.5) * 0.85,
    Math.floor(i / 4) * 0.85 - 0.4,
    i === 0 ? -0.5 : 0,
  ],
  scale: [0.48, 0.48, 0.55],
  description:
    i === 0
      ? "Segment I has distinct portal inflow and direct venous drainage into the inferior vena cava."
      : `${en}. Portal branches supply individual segments; hepatic veins define major intersegmental planes. This schematic does not represent patient anatomy.`,
  location: "Liver — schematic segment arrangement, not anatomical boundaries",
}));
export function filterAnatomy(
  list: Structure[],
  query: string,
  system = "All",
) {
  return list.filter(
    (s) =>
      (system === "All" || s.system === system) &&
      `${s.en} ${s.idName} ${s.latin}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
}

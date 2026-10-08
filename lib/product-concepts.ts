export type ProductConcept = {
  id: string;
  name: string;
  description: string;
  family: string;
  src: string;
  alt: string;
  memberExclusive: boolean;
};

/** Concept imagery only. Not live catalog, inventory, or prices. */
export const productConcepts: readonly ProductConcept[] = [
  {
    id: "vitalis",
    name: "Obsidian Noir",
    description: "Signature hair & beard oil · Previous packaging concept",
    family: "GROOMING",
    src: "/images/cinematic/vitalis-cutout.webp",
    alt: "Legacy Reserve previous Vitalis packaging concept for the renamed Obsidian Noir hair and beard oil",
    memberExclusive: false,
  },
  {
    id: "obsidian-wash",
    name: "Obsidian Wash",
    description: "Body wash · Cedar Smoke",
    family: "GROOMING",
    src: "/images/cinematic/obsidian-wash-cutout.webp",
    alt: "Legacy Reserve Obsidian Wash concept package",
    memberExclusive: false,
  },
  {
    id: "obsidian-creme",
    name: "Obsidian Crème",
    description: "Face moisturizer · Midnight Orchid",
    family: "GROOMING",
    src: "/images/cinematic/obsidian-creme-cutout.webp",
    alt: "Legacy Reserve Obsidian Crème concept package",
    memberExclusive: false,
  },
  {
    id: "hydros",
    name: "HYDROS",
    description: "Hydration + electrolytes · Citrus Reserve",
    family: "BEYOND THE VISIT",
    src: "/images/cinematic/hydros-cutout.webp",
    alt: "Legacy Reserve HYDROS concept package",
    memberExclusive: false,
  },
  {
    id: "ascend",
    name: "ASCEND",
    description: "Pre-workout · Georgia Peach Rings",
    family: "BEYOND THE VISIT",
    src: "/images/cinematic/ascend-cutout.webp",
    alt: "Legacy Reserve ASCEND concept package",
    memberExclusive: true,
  },
];

export function getProductConcept(id: string) {
  return productConcepts.find((item) => item.id === id) ?? null;
}

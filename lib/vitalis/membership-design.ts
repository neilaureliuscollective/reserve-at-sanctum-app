/** Proposed positioning only. Never used to create a payment or entitlement. */
export const vitalisMembershipDesign = [
  {
    name: "Essential",
    price: 49,
    discount: 10,
    position: "A considered daily foundation.",
    benefits: [
      "Personal wellness goals and lifestyle guidance",
      "Performance, recovery and nutrition education",
      "Appearance and grooming connections",
    ],
    exclusions:
      "No medical care, medications, labs or concierge services included.",
  },
  {
    name: "Optimize",
    price: 149,
    discount: 15,
    position: "The connected health relationship.",
    benefits: [
      "Everything planned for Essential",
      "Coordinated access to licensed partner care",
      "Hormone-health navigation and partner-supported follow-up",
    ],
    exclusions:
      "Medication inclusion, clinical visits and lab pricing are unconfirmed. No treatment is included or available today.",
  },
  {
    name: "Sovereign",
    price: 249,
    discount: 20,
    position: "More personal attention. Greater continuity.",
    benefits: [
      "Everything planned for Optimize",
      "Higher-touch, non-diagnostic care coordination",
      "A quarterly curated Legacy Reserve product package",
    ],
    exclusions:
      "Concierge capacity, package contents and treatment inclusion require verification. Specialty medication would be separately priced.",
  },
] as const;
export const billingBoundary = {
  mode: "planning-only",
  canEnroll: false,
  canCharge: false,
  canGrantDiscount: false,
  clinicalConnected: false,
} as const;

export type FounderWorldId = "legacy" | "technology";
export type FounderPath = {
  id: string; label: string; title: string; copy: string; status: string;
  href: string; action: string; symbol: string;
};
export const founderWorlds = {
  legacy: {
    name: "Legacy Reserve", route: "/founder/legacy-reserve",
    title: "A higher standard. A longer legacy.",
    description: "Neil Stutes, founder of Legacy Reserve. A personal ecosystem for presence, performance, wellbeing, products and a longer view of life.",
    headline: ["A higher standard.", "A longer legacy."],
    intro: "I’m building Legacy Reserve around the man you become—and the standard you choose to carry every day.",
    originTitle: "It began with a bottle. It became a bigger vision.",
    origin: "My work began with grooming products. The vision grew beyond what sits on a shelf: how a man shows up, how he prepares, how he cares for himself, and what he builds over time. Legacy Reserve brings those parts of life into one considered environment.",
    originNote: "Louisiana roots. A Reserve that travels with you.",
    principles: [
      { title: "Presence", copy: "Take care of how you show up. Let your daily choices reflect your own standard." },
      { title: "Discipline", copy: "Build a rhythm you can repeat. Progress needs a place in ordinary days." },
      { title: "Legacy", copy: "Think beyond the moment. Build something worth carrying forward." },
    ],
    invitation: "Make the standard your own.",
    invitationCopy: "Begin with your personal direction. Explore the products, practices and experiences taking shape inside Legacy Reserve.",
    primary: { href: "/enter", label: "Open your Reserve" },
    secondary: { href: "/discover/membership", label: "Explore membership" },
    availability: "Personal tools and the free Vitalis wellness pilot are available. Paid membership is in preparation.",
    bridgeTitle: "The vision. The intelligence behind it.",
    bridgeCopy: "Aethelios is already part of the Reserve concierge experience. My broader technology vision has its own world: Aethelios Technologies.",
    paths: [
      { id: "presence", label: "Presence", title: "Carry your own standard.", copy: "Choose an appearance priority and build a personal grooming rhythm you can keep.", status: "PERSONAL ROUTINE AVAILABLE", href: "/pathways?priority=presence#routine", action: "Build your Presence routine", symbol: "P" },
      { id: "performance", label: "Performance", title: "Prepare for the life you lead.", copy: "Give movement, preparation and recovery a practical place in your week.", status: "PERSONAL ROUTINE AVAILABLE", href: "/pathways?priority=performance#routine", action: "Build your Performance routine", symbol: "↗" },
      { id: "vitalis", label: "Vitalis", title: "Keep a longer horizon.", copy: "Begin with sleep consistency, everyday movement or meal preparation. Advanced health intelligence remains the next horizon.", status: "FREE WELLNESS PILOT AVAILABLE", href: "/vitalis", action: "Explore Legacy Reserve Vitalis", symbol: "V" },
      { id: "collection", label: "Collection", title: "Purpose in the daily ritual.", copy: "Explore the Legacy Reserve collection direction, including Virelis, the signature hair and beard oil. Earlier packaging remains a concept preview.", status: "PRODUCT DIRECTION / AVAILABILITY IN COLLECTION", href: "/shop", action: "Explore the collection", symbol: "LR" },
      { id: "sanctum", label: "Sanctum", title: "A human connection. In person.", copy: "Discover the physical destinations and the people within Reserve. Your digital experience begins wherever you are.", status: "VISIT AVAILABILITY IN SANCTUM", href: "/visit", action: "Explore Sanctum", symbol: "S" },
    ] satisfies FounderPath[],
  },
  technology: {
    name: "Aethelios Technologies", route: "/founder/aethelios-technologies",
    title: "Intelligence with purpose. Creation with direction.",
    description: "Neil Stutes, founder of Aethelios Technologies. Explore the vision for useful intelligence, creation and systems, and its connection to Legacy Reserve.",
    headline: ["Intelligence with purpose.", "Creation with direction."],
    intro: "I’m building Aethelios Technologies to bring intelligence, creation and useful systems closer to the people who need them.",
    originTitle: "Build the systems. Open the possibilities.",
    origin: "Building Legacy Reserve brought a second vision into focus: technology that helps turn an idea into something useful. Aethelios Technologies is the company direction behind that ambition—intelligence, creation and systems with a practical purpose.",
    originNote: "A distinct technology vision. Connected to the Reserve.",
    principles: [
      { title: "Clarity", copy: "Make the next useful step easier to see. Intelligence should reduce friction." },
      { title: "Creation", copy: "Bring ideas closer to tangible work. Give imagination a structure it can move through." },
      { title: "Systems", copy: "Build foundations that can grow. Keep purpose visible as the technology develops." },
    ],
    invitation: "Begin with what’s here.",
    invitationCopy: "Meet the Aethelios concierge inside Legacy Reserve. Explore the current experience while the broader technology platform takes shape.",
    primary: { href: "/concierge", label: "Meet Aethelios in Reserve" },
    secondary: { href: "/founder/legacy-reserve", label: "Explore the Legacy Reserve vision" },
    availability: "The Reserve concierge has a public preview and customer account experience. Broader creation and systems capabilities are in development.",
    bridgeTitle: "A personal ecosystem. A practical beginning.",
    bridgeCopy: "Legacy Reserve gives this intelligence vision a focused setting: personal direction, routines and the next useful action.",
    paths: [
      { id: "intelligence", label: "Intelligence", title: "A clearer next step.", copy: "The Reserve concierge connects personal routines, verified membership benefits and useful destinations. Start with the curated public preview.", status: "RESERVE CONCIERGE AVAILABLE", href: "/discover/aethelios", action: "Explore the concierge preview", symbol: "A" },
      { id: "creation", label: "Creation", title: "Move an idea toward reality.", copy: "The broader vision brings creative tools and guided work into an intelligent environment. These company-wide capabilities are planned; this page is not a working creation studio.", status: "BROADER PLATFORM / PLANNED", href: "/founder/aethelios-technologies#philosophy", action: "Read the creation philosophy", symbol: "+" },
      { id: "systems", label: "Systems", title: "Build for what comes next.", copy: "A longer-term direction for connected tools and business infrastructure. Reserve is the current example; wider customer infrastructure remains planned.", status: "BROADER PLATFORM / PLANNED", href: "/founder/legacy-reserve", action: "Explore the connected Reserve", symbol: "∞" },
    ] satisfies FounderPath[],
  },
} as const;

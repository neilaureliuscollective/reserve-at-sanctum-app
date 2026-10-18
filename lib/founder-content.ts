import { fixItPublicBooking } from "./fix-it-public-booking";

export type FounderAsset = { src: string; alt: string; width: number; height: number; position?: string };
// Only install approved Katie photographs. Null intentionally renders a labeled
// editorial reservation, never a synthetic likeness or a substitute person.
export const founderContent = {
  name: "Katie Guidry",
  title: "Founder & Owner — Fix It Shop",
  service: "United States Marine Corps Veteran",
  location: "Eunice, Louisiana",
  biography: "Straightforward, warm, and attentive to the details. Katie brings technical care and a personal connection to an experience made for men.",
  portrait: { src: "/images/founder/katie-guidry.webp", alt: "Katie Guidry in blue, with the complete black-and-gold interior and Fix It Shop emblem in her approved founder image", width: 1280, height: 720 } as FounderAsset | null,
  alternativePortraits: [] as FounderAsset[],
  bookPhotograph: null as FounderAsset | null, // /images/founder/katies-family-book.webp — actual family copy only
  militaryPhotograph: null as FounderAsset | null,
  personalQuote: null as { text: string; attribution: string } | null, // Katie-approved words only
  storyHref: "/fix-it-shop/app/founder",
  bookingHref: fixItPublicBooking.href,
  book: { title: "Mr. Bell’s Fixit Shop", author: "Ronne Peltzman", year: "1981" },
  chapters: [
    { id: "katie", label: "The founder", headline: "The woman behind the standard.", paragraphs: ["A higher standard begins with the person behind it.", "Katie Guidry founded Fix It Shop with a clear purpose: a better grooming experience for men. Professional attention, a straightforward conversation, and room to feel at ease."] },
    { id: "the-name", label: "The name", displayLines: ["Some things carry", "more meaning."], subtitle: "Than they appear to.", headline: "Some things carry more meaning than they appear to.", paragraphs: ["Before it was the name of her business, it was the title of a treasured family book. An old, worn copy of Mr. Bell’s Fixit Shop was passed down to Katie through her family. She continues to preserve it.", "In the story, Mr. Bell repairs broken things but believes he cannot repair broken hearts. When a child brings him a treasured doll damaged by a puppy, caring for that doll means more than a repair. It brings comfort to the child who loves it.", "The meaning is simple: the care we give something important to a person can reach beyond the thing itself."] },
    { id: "the-standard", label: "The standard", headline: "Care in the details. Confidence beyond the chair.", paragraphs: ["A haircut can look like an ordinary appointment. Yet the way you are heard, the attention given to your hair, and the feeling you take into your day can mean much more.", "That is the connection behind Fix It Shop’s name. Care on the outside can make a difference to how someone feels on the inside. The purpose is to help you feel like yourself, with confidence."] },
    { id: "service", label: "Service", headline: "Service. Standards. Purpose.", paragraphs: ["Katie is a United States Marine Corps veteran. Her service is a meaningful part of who she is, alongside her role as the founder and owner of Fix It Shop.", "At Fix It Shop, respect, precision, and pride in the work have a place in every visit. It is a personal standard: give people your attention, and give the work your care."] },
    { id: "invitation", label: "Your invitation", headline: "Come as you are. Leave with confidence.", paragraphs: ["Bring an idea, a question, or simply yourself. There is room for conversation, a little humor, or a quiet moment. Katie’s purpose is a better grooming experience for the man in her chair."] },
  ],
  seo: { canonicalOrigin: "https://www.reserveatsanctum.app", title: "Katie Guidry — The Story Behind Fix It Shop", description: "Meet Katie Guidry, Fix It Shop founder and United States Marine Corps veteran in Eunice, Louisiana. Discover the family book and the care behind the name.", socialImage: "/images/founder/katie-guidry.webp" },
};

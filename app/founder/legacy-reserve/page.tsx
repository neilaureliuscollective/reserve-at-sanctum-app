import { FounderWorld } from "@/components/founder-world";
import { founderWorlds } from "@/lib/experience/founder-worlds";
export const metadata = { title: "Neil Stutes · Founder of Legacy Reserve", description: founderWorlds.legacy.description };
export default function Page() { return <FounderWorld world="legacy"/>; }

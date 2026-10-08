import { FounderWorld } from "@/components/founder-world";
import { founderWorlds } from "@/lib/experience/founder-worlds";
export const metadata = { title: "Neil Stutes · Founder of Aethelios Technologies", description: founderWorlds.technology.description };
export default function Page() { return <FounderWorld world="technology"/>; }

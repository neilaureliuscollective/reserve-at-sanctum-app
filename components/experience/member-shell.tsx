import Image from "next/image";
import { brand } from "@/lib/brand";
export function MemberShell({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="member-environment">
      <header className="member-opening">
        <div>
          <p className="experience-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="member-intro">{intro}</p>
        </div>
        <Image
          src={brand.mark}
          width={148}
          height={148}
          alt="Legacy Reserve crest"
          priority
        />
      </header>
      {children}
    </main>
  );
}

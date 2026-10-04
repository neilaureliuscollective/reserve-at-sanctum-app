"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
export function ApplicationShell({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: boolean;
}) {
  const path = usePathname();
  const operations = path.startsWith("/studio");
  return (
    <>
      {!operations && <Header />}
      {children}
      {!operations && <Footer />}
      {preview && !operations && (
        <aside className="preview-ribbon" aria-label="Reserve status">
          SYNTHETIC PREVIEW · No real appointments or payment processing
        </aside>
      )}
    </>
  );
}

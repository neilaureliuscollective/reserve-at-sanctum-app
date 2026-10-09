import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./flagship.module.css";
export function Action({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <Link prefetch={false} href={href} className={secondary ? styles.secondary : styles.action}>{children}<ArrowUpRight size={18} aria-hidden="true" /></Link>;
}

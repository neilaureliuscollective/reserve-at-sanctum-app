import type { HTMLAttributes } from "react";

export type SurfaceLevel = "architecture" | "glass" | "hero";
/** Shared materials, without event handlers or an additional client runtime. */
export function surfaceClass(level: SurfaceLevel = "architecture", className = "") {
  return `imperial-surface imperial-${level} ${className}`.trim();
}
export function ImperialSurface({ level = "architecture", className = "", ...props }: HTMLAttributes<HTMLElement> & { level?: SurfaceLevel }) {
  return <section {...props} className={surfaceClass(level, className)} />;
}

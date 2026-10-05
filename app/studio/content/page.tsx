import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { commandCenter, workspaceItem } from "@/lib/command-center";
import { ContentStudio } from "@/components/content-studio";
import { notFound } from "next/navigation";
import { BookingError } from "@/lib/booking";
export default async function Content({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const actor = await studioActor(),
    db = await database();
  const { id } = await searchParams;
  let selected = null;
  if (id) {
    try {
      selected = await workspaceItem(db, actor, id);
    } catch (e) {
      if (e instanceof BookingError && e.status === 404) notFound();
      throw e;
    }
    if (selected.kind !== "content") notFound();
  }
  const data = await commandCenter(db, actor, 0, "content");
  return <ContentStudio key={id || "new"} data={data} selected={selected} />;
}

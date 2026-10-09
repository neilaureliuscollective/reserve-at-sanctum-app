import { redirect } from "next/navigation";
import { fixItDestination } from "@/lib/fix-it-booking";
export default async function Signin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  redirect("/fix-it-shop/app/signin?next=" + encodeURIComponent(fixItDestination((await searchParams).next)));
}

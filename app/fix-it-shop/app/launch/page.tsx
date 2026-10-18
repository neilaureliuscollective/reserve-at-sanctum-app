import { fixItCustomerAppHref } from "@/lib/fix-it-customer-app";
import { redirect } from "next/navigation";
import { publicUser } from "@/lib/auth";
import { entryDestination } from "@/lib/experience/entry";
export const dynamic = "force-dynamic";
export default async function Launch() {
  const destination = entryDestination(await publicUser());
  redirect(destination === "/fix-it-shop/app" ? fixItCustomerAppHref + "#home" : destination);
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readCollection } from "@/lib/collection";
import { MemberShell } from "@/components/experience/member-shell";
import { ProductCheckout } from "@/components/experience/product-checkout";
export const dynamic = "force-dynamic";
export const metadata = { title: "Collection product" };
export default async function Product({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const handle = (await params).handle;
  if (!/^[a-z0-9][a-z0-9_-]{0,199}$/.test(handle)) notFound();
  const [catalog, actor] = await Promise.all([readCollection(), currentUser()]);
  if (catalog.state === "unavailable")
    return (
      <MemberShell
        kicker="THE COLLECTION"
        title="Product information could not refresh."
        intro="Please check again before purchasing. No purchase has been prepared."
      >
        <Link href="/shop" className="button button-gold">
          Return to the Collection ↗
        </Link>
      </MemberShell>
    );
  const product = catalog.items.find((item) => item.handle === handle);
  if (!product) notFound();
  return (
    <MemberShell
      kicker="PUBLISHED LEGACY RESERVE PRODUCT"
      title={product.name}
      intro={
        product.description ||
        "Review current options and Shopify pricing before purchasing."
      }
    >
      <div className="collection-product-detail">
        {product.image && (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            width={700}
            height={700}
            unoptimized
            sizes="(max-width:700px) 100vw, 45vw"
          />
        )}
        <ProductCheckout
          key={JSON.stringify(product.variants)}
          variants={product.variants}
          enabled={catalog.checkout && (!actor || actor.role === "client")}
          signedIn={actor?.role === "client"}
        />
      </div>
      <footer className="member-foot">
        <Link href="/shop">Return to the Collection ↗</Link>
        <Link href="/membership">Your membership desk ↗</Link>
      </footer>
    </MemberShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db/prisma";
import { publicListingWhere } from "@/lib/products/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Product details" };

const stockLabels: Record<string, string> = {
  IN_STOCK: "In stock",
  LIMITED_STOCK: "Limited stock",
  OUT_OF_STOCK: "Out of stock",
  CONTACT_SUPPLIER: "Contact supplier",
};

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const product = await prisma.productListing.findFirst({
    where: { id, ...publicListingWhere() },
    select: {
      name: true,
      brand: true,
      specification: true,
      description: true,
      unit: true,
      price: true,
      stockStatus: true,
      priceUpdatedAt: true,
      stockUpdatedAt: true,
      category: { select: { name: true } },
      providerProfile: {
        select: {
          displayName: true,
          description: true,
          phone: true,
          publicEmail: true,
          address: true,
          province: true,
          district: true,
          townOrArea: true,
          websiteUrl: true,
          pickupAvailable: true,
          deliveryAvailable: true,
          verificationLevel: true,
        },
      },
    },
  });

  if (!product) notFound();

  const location = [
    product.providerProfile.townOrArea,
    product.providerProfile.district,
    product.providerProfile.province,
  ]
    .filter(Boolean)
    .join(", ");

  const formattedPrice = new Intl.NumberFormat("en-PG", {
    style: "currency",
    currency: "PGK",
  }).format(Number(product.price));

  return (
    <AppShell>
      <p>
        <Link href="/products">← Back to products</Link>
      </p>

      <div className="detail-layout">
        <section>
          <p className="eyebrow">{product.category.name}</p>
          <h1>{product.name}</h1>
          {product.brand ? <p>{product.brand}</p> : null}

          <p className="detail-price">
            {formattedPrice} / {product.unit}
          </p>
          <span className="badge">{stockLabels[product.stockStatus] || product.stockStatus}</span>

          {product.specification ? (
            <section className="panel detail-section">
              <h2>Specifications</h2>
              <p>{product.specification}</p>
            </section>
          ) : null}

          {product.description ? (
            <section className="panel detail-section">
              <h2>Description</h2>
              <p>{product.description}</p>
            </section>
          ) : null}

          <section className="panel detail-section">
            <h2>Price and availability</h2>
            <p>Price updated: {product.priceUpdatedAt.toLocaleDateString("en-PG")}</p>
            <p>Stock updated: {product.stockUpdatedAt.toLocaleDateString("en-PG")}</p>
            <p>
              Supplier information can change. Confirm details before travelling or paying.
            </p>
          </section>
        </section>

        <aside className="panel supplier-panel">
          <p className="eyebrow">Supplier</p>
          <h2>{product.providerProfile.displayName}</h2>
          <p>{location || "Papua New Guinea"}</p>

          {product.providerProfile.verificationLevel === "DOCUMENTS_CHECKED" ? (
            <span className="badge gold">Documents checked</span>
          ) : product.providerProfile.verificationLevel === "CONTACT_CONFIRMED" ? (
            <span className="badge gold">Contact confirmed</span>
          ) : (
            <p className="muted">Supplier details have not been verified by the platform.</p>
          )}

          {product.providerProfile.description ? <p>{product.providerProfile.description}</p> : null}

          <dl className="facts">
            {product.providerProfile.phone ? (
              <>
                <dt>Phone</dt>
                <dd>
                  <a href={"tel:" + product.providerProfile.phone}>
                    {product.providerProfile.phone}
                  </a>
                </dd>
              </>
            ) : null}
            {product.providerProfile.publicEmail ? (
              <>
                <dt>Email</dt>
                <dd>
                  <a href={"mailto:" + product.providerProfile.publicEmail}>
                    {product.providerProfile.publicEmail}
                  </a>
                </dd>
              </>
            ) : null}
            {product.providerProfile.address ? (
              <>
                <dt>Address</dt>
                <dd>{product.providerProfile.address}</dd>
              </>
            ) : null}
            <dt>Pickup</dt>
            <dd>
              {product.providerProfile.pickupAvailable ? "Available" : "Confirm with supplier"}
            </dd>
            <dt>Delivery</dt>
            <dd>{product.providerProfile.deliveryAvailable ? "Available" : "Not listed"}</dd>
          </dl>

          {product.providerProfile.websiteUrl ? (
            <p>
              <a href={product.providerProfile.websiteUrl} target="_blank" rel="noreferrer">
                Supplier website
              </a>
            </p>
          ) : null}

          <p className="muted supplier-note">
            Contact supplier to confirm price, stock, delivery and payment. This phase does not
            process payments.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}

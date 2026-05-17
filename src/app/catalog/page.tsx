import { Suspense } from "react";
import UShell from "@/components/shell/UShell";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import { getOverview } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const { total } = await getOverview();
  return (
    <UShell total={total}>
      <Suspense fallback={<div className="strap" style={{ padding: 28 }}>loading catalogue…</div>}>
        <CatalogBrowser />
      </Suspense>
    </UShell>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { lookupBarcode } from "@/lib/openfoodfacts";
import { lookupBarcodeUSDA } from "@/lib/usda";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }
  // OpenFoodFacts is the original source — best coverage for many brands.
  // USDA's Branded dataset catches some big retail brands OFF misses.
  // Race them in parallel; first non-null wins, with OFF preferred when both
  // have it (since OFF more reliably populates serving info).
  const [off, usda] = await Promise.all([
    lookupBarcode(code),
    lookupBarcodeUSDA(code),
  ]);
  const product = off ?? usda;
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

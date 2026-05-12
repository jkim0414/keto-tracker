import { NextRequest, NextResponse } from "next/server";
import { lookupBarcode } from "@/lib/openfoodfacts";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }
  const product = await lookupBarcode(code);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

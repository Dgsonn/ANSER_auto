import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createPurchaseLedgerEntry, listPurchaseLedger } from "@/server/store/purchaseLedger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const entries = await listPurchaseLedger({
      search: url.searchParams.get("search") ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return NextResponse.json({ entries });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    const partnerName = typeof body.partnerName === "string" ? body.partnerName.trim() : "";
    const postingDateRaw = typeof body.postingDate === "string" ? body.postingDate : "";
    const postingDate = postingDateRaw ? new Date(postingDateRaw) : null;
    if (!partnerName || !postingDate || Number.isNaN(postingDate.getTime())) {
      return badRequest("Thiếu ngày hạch toán hoặc tên nhà cung cấp.");
    }

    const voucherDateRaw = typeof body.voucherDate === "string" ? body.voucherDate : "";
    const voucherDate = voucherDateRaw ? new Date(voucherDateRaw) : null;

    const invoiceStatus =
      body.invoiceStatus === "received" || body.invoiceStatus === "none"
        ? body.invoiceStatus
        : "not_received";

    const entry = await createPurchaseLedgerEntry({
      postingDate,
      voucherDate: voucherDate && !Number.isNaN(voucherDate.getTime()) ? voucherDate : null,
      voucherNo: body.voucherNo?.trim() || null,
      invoiceNo: body.invoiceNo?.trim() || null,
      partnerName,
      description: body.description?.trim() || null,
      amountBeforeTax: Number(body.amountBeforeTax) || 0,
      discountAmount: Number(body.discountAmount) || 0,
      vatAmount: Number(body.vatAmount) || 0,
      totalAmount: Number(body.totalAmount) || 0,
      purchaseCost: Number(body.purchaseCost) || 0,
      inventoryValue: Number(body.inventoryValue) || 0,
      invoiceStatus,
      isPurchaseCost: body.isPurchaseCost === true,
      documentType: body.documentType?.trim() || null,
      note: body.note?.trim() || null,
    });
    return NextResponse.json({ entry }, { status: 201 });
  });
}

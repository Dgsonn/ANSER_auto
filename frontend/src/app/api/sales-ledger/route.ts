import { NextResponse } from "next/server";
import { badRequest, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import { createSalesLedgerEntry, listSalesLedger } from "@/server/store/salesLedger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const entries = await listSalesLedger({
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
    const voucherDateRaw = typeof body.voucherDate === "string" ? body.voucherDate : "";
    const voucherDate = voucherDateRaw ? new Date(voucherDateRaw) : null;
    if (!partnerName || !voucherDate || Number.isNaN(voucherDate.getTime())) {
      return badRequest("Thiếu ngày chứng từ hoặc tên khách hàng.");
    }

    const entry = await createSalesLedgerEntry({
      voucherDate,
      voucherNo: body.voucherNo?.trim() || null,
      invoiceNo: body.invoiceNo?.trim() || null,
      partnerName,
      amountBeforeTax: Number(body.amountBeforeTax) || 0,
      vatAmount: Number(body.vatAmount) || 0,
      totalAmount: Number(body.totalAmount) || 0,
      invoiceIssued: body.invoiceIssued === true,
      goodsDelivered: body.goodsDelivered === true,
      note: body.note?.trim() || null,
    });
    return NextResponse.json({ entry }, { status: 201 });
  });
}

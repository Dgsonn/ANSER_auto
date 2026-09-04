import { NextResponse } from "next/server";
import { badRequest, conflict, handle, unauthorized } from "@/server/api";
import { requireUser } from "@/server/session";
import {
  createInvoice,
  InvoiceExistsError,
  listInvoiceableOrders,
  listInvoices,
  OrderNotReadyError,
} from "@/server/store/invoices";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const url = new URL(request.url);
    return NextResponse.json({
      invoices: await listInvoices({
        search: url.searchParams.get("search") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
      }),
      invoiceableOrders: await listInvoiceableOrders(),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    if (!(await requireUser())) return unauthorized();
    const body = await request.json().catch(() => ({}));

    if (!body.serviceOrderId) return badRequest("Thiếu lệnh sửa chữa.");

    const taxRate = body.taxRate !== undefined ? Number(body.taxRate) : undefined;
    if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)) {
      return badRequest("Thuế suất phải trong khoảng 0–100.");
    }

    try {
      const invoice = await createInvoice({
        serviceOrderId: body.serviceOrderId,
        taxRate,
        paidAmount: body.paidAmount ? Number(body.paidAmount) : 0,
        paymentMethod: body.paymentMethod || null,
        insuranceAmount: body.insuranceAmount ? Number(body.insuranceAmount) : 0,
        insuranceProvider: body.insuranceProvider?.trim() || null,
        note: body.note?.trim() || null,
      });
      return NextResponse.json({ invoice }, { status: 201 });
    } catch (error) {
      if (error instanceof InvoiceExistsError) return conflict(error.message);
      if (error instanceof OrderNotReadyError) return conflict(error.message);
      throw error;
    }
  });
}

import { NextResponse } from "next/server";
import { badRequest, handle } from "@/server/api";
import { checkInternalToken } from "@/server/internalAuth";
import { getRevenueReport, REPORT_PERIODS, type ReportPeriod } from "@/server/reports";
import { getCompanySettings } from "@/server/store/settings";

export const dynamic = "force-dynamic";

// GET /api/n8n/internal/revenue?period=day|week|month
export async function GET(request: Request) {
  return handle(async () => {
    const denied = checkInternalToken(request);
    if (denied) return denied;

    const url = new URL(request.url);
    const period = (url.searchParams.get("period") ?? "day") as ReportPeriod;
    if (!REPORT_PERIODS.includes(period)) {
      return badRequest(`period phải là một trong: ${REPORT_PERIODS.join(", ")}.`);
    }

    const [report, company] = await Promise.all([getRevenueReport(period), getCompanySettings()]);

    return NextResponse.json({
      company_name: company.name,
      company_email: company.email ?? process.env.N8N_NOTIFY_EMAIL ?? null,
      currency: company.currency,
      period: report.period,
      period_label: report.periodLabel,
      from: report.from,
      to: report.to,
      summary: {
        invoice_count: report.invoiceCount,
        revenue: report.revenue,
        collected: report.collected,
        outstanding: report.outstanding,
        labor_revenue: report.laborRevenue,
        parts_revenue: report.partsRevenue,
        orders_delivered: report.ordersDelivered,
      },
      top_services: report.topServices,
      top_parts: report.topParts,
    });
  });
}

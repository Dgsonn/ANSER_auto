CREATE TABLE "purchase_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posting_date" timestamp with time zone NOT NULL,
	"voucher_date" timestamp with time zone,
	"voucher_no" text,
	"invoice_no" text,
	"partner_name" text NOT NULL,
	"description" text,
	"amount_before_tax" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"vat_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"purchase_cost" integer DEFAULT 0 NOT NULL,
	"inventory_value" integer DEFAULT 0 NOT NULL,
	"invoice_status" text DEFAULT 'not_received' NOT NULL,
	"is_purchase_cost" boolean DEFAULT false NOT NULL,
	"document_type" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_date" timestamp with time zone NOT NULL,
	"voucher_no" text,
	"invoice_no" text,
	"partner_name" text NOT NULL,
	"amount_before_tax" integer DEFAULT 0 NOT NULL,
	"vat_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"invoice_issued" boolean DEFAULT false NOT NULL,
	"goods_delivered" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "service_order_special_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"supplier" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimated_cost" integer,
	"actual_cost" integer,
	"sell_price" integer,
	"status" text DEFAULT 'ordered' NOT NULL,
	"note" text,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"arrived_at" timestamp with time zone,
	"billed_line_id" uuid
);
--> statement-breakpoint
ALTER TABLE "service_order_labors" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "service_order_special_orders" ADD CONSTRAINT "service_order_special_orders_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_special_orders" ADD CONSTRAINT "service_order_special_orders_billed_line_id_service_order_parts_id_fk" FOREIGN KEY ("billed_line_id") REFERENCES "public"."service_order_parts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_labors" ADD CONSTRAINT "service_order_labors_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
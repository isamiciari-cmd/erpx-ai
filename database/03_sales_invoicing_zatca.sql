BEGIN;

-- ============================================================
-- ERPX-AI
-- CANONICAL SALES / POS / PAYMENTS / ZATCA FOUNDATION
-- Based on CURRENT LIVE Supabase schema
-- ============================================================


-- ============================================================
-- 1. SHIFTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE RESTRICT,

    branch_id UUID
        REFERENCES public.branches(id)
        ON DELETE RESTRICT,

    cashier_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    shift_number VARCHAR(50) NOT NULL,

    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,

    opening_cash NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_cash NUMERIC(18,2),

    expected_cash NUMERIC(18,2),
    cash_difference NUMERIC(18,2),

    total_sales NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_refunds NUMERIC(18,2) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'cancelled')),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_shifts_company_number
        UNIQUE (company_id, shift_number)
);


CREATE INDEX IF NOT EXISTS idx_shifts_company
    ON public.shifts(company_id);

CREATE INDEX IF NOT EXISTS idx_shifts_branch
    ON public.shifts(branch_id);

CREATE INDEX IF NOT EXISTS idx_shifts_cashier
    ON public.shifts(cashier_id);

CREATE INDEX IF NOT EXISTS idx_shifts_status
    ON public.shifts(status);


-- ============================================================
-- 2. POS SALES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE RESTRICT,

    branch_id UUID
        REFERENCES public.branches(id)
        ON DELETE RESTRICT,

    cashier_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    shift_id UUID
        REFERENCES public.shifts(id)
        ON DELETE RESTRICT,

    customer_id UUID
        REFERENCES public.customers(id)
        ON DELETE RESTRICT,

    invoice_id UUID,

    sale_number VARCHAR(50) NOT NULL,

    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    payment_method VARCHAR(30) NOT NULL
        CHECK (
            payment_method IN (
                'cash',
                'card',
                'mada',
                'apple_pay',
                'bank_transfer',
                'split',
                'credit'
            )
        ),

    subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,

    amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(18,2) NOT NULL DEFAULT 0,

    items JSONB NOT NULL DEFAULT '[]'::jsonb,

    status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (
            status IN (
                'draft',
                'completed',
                'cancelled',
                'refunded',
                'on_hold'
            )
        ),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_sales_company_number
        UNIQUE (company_id, sale_number),

    CONSTRAINT chk_sales_amounts
        CHECK (
            subtotal >= 0
            AND discount_amount >= 0
            AND vat_amount >= 0
            AND total_amount >= 0
            AND amount_paid >= 0
            AND change_amount >= 0
        )
);


CREATE INDEX IF NOT EXISTS idx_sales_company
    ON public.sales(company_id);

CREATE INDEX IF NOT EXISTS idx_sales_branch
    ON public.sales(branch_id);

CREATE INDEX IF NOT EXISTS idx_sales_cashier
    ON public.sales(cashier_id);

CREATE INDEX IF NOT EXISTS idx_sales_shift
    ON public.sales(shift_id);

CREATE INDEX IF NOT EXISTS idx_sales_customer
    ON public.sales(customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_invoice
    ON public.sales(invoice_id);

CREATE INDEX IF NOT EXISTS idx_sales_date
    ON public.sales(sale_date);


-- ============================================================
-- 3. SALES → INVOICE FK
-- ============================================================

ALTER TABLE public.sales
    DROP CONSTRAINT IF EXISTS fk_sales_invoice;

ALTER TABLE public.sales
    ADD CONSTRAINT fk_sales_invoice
    FOREIGN KEY (invoice_id)
    REFERENCES public.invoices(id)
    ON DELETE RESTRICT;


-- ============================================================
-- 4. PAYMENTS LEDGER
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id)
        ON DELETE RESTRICT,

    branch_id UUID
        REFERENCES public.branches(id)
        ON DELETE RESTRICT,

    customer_id UUID
        REFERENCES public.customers(id)
        ON DELETE RESTRICT,

    invoice_id UUID
        REFERENCES public.invoices(id)
        ON DELETE RESTRICT,

    sales_order_id UUID
        REFERENCES public.sales_orders(id)
        ON DELETE RESTRICT,

    sale_id UUID
        REFERENCES public.sales(id)
        ON DELETE RESTRICT,

    payment_number VARCHAR(50) NOT NULL,

    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    payment_method VARCHAR(30) NOT NULL
        CHECK (
            payment_method IN (
                'cash',
                'card',
                'mada',
                'apple_pay',
                'bank_transfer',
                'credit'
            )
        ),

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount > 0),

    currency_code CHAR(3) NOT NULL DEFAULT 'SAR',

    reference_number VARCHAR(100),

    gateway VARCHAR(50),

    gateway_transaction_id VARCHAR(150),

    status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (
            status IN (
                'pending',
                'completed',
                'failed',
                'cancelled',
                'refunded'
            )
        ),

    notes TEXT,

    created_by UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_payments_company_number
        UNIQUE (company_id, payment_number)
);


CREATE INDEX IF NOT EXISTS idx_payments_company
    ON public.payments(company_id);

CREATE INDEX IF NOT EXISTS idx_payments_branch
    ON public.payments(branch_id);

CREATE INDEX IF NOT EXISTS idx_payments_customer
    ON public.payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
    ON public.payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_sales_order
    ON public.payments(sales_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_sale
    ON public.payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_payments_date
    ON public.payments(payment_date);


-- ============================================================
-- 5. INVOICE ZATCA EXTENSIONS
-- ============================================================

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS issue_time TIME;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS supply_date DATE;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS currency_code CHAR(3) DEFAULT 'SAR';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS tax_currency_code CHAR(3);

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_type_code VARCHAR(10) DEFAULT '388';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_subtype VARCHAR(2) DEFAULT '01';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS previous_invoice_hash TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_hash TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS cryptographic_stamp TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS clearance_status VARCHAR(20)
        DEFAULT 'not_required';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS reporting_status VARCHAR(20)
        DEFAULT 'not_required';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS submission_id VARCHAR(150);

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS zatca_environment VARCHAR(20);

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(100);

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS last_error_message TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS xml_content TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS document_hash TEXT;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS tax_exclusive_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS tax_inclusive_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS payable_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS allowance_total_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS charge_total_amount NUMERIC(18,2) DEFAULT 0;


-- ============================================================
-- 6. INVOICE CONSTRAINTS
-- ============================================================

ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS uq_invoices_uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_uuid
    ON public.invoices(uuid)
    WHERE uuid IS NOT NULL;


ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS chk_invoices_clearance_status;

ALTER TABLE public.invoices
    ADD CONSTRAINT chk_invoices_clearance_status
    CHECK (
        clearance_status IN (
            'not_required',
            'pending',
            'cleared',
            'rejected'
        )
    );


ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS chk_invoices_reporting_status;

ALTER TABLE public.invoices
    ADD CONSTRAINT chk_invoices_reporting_status
    CHECK (
        reporting_status IN (
            'not_required',
            'pending',
            'reported',
            'rejected'
        )
    );


ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS chk_invoices_amounts;

ALTER TABLE public.invoices
    ADD CONSTRAINT chk_invoices_amounts
    CHECK (
        subtotal >= 0
        AND discount_amount >= 0
        AND vat_amount >= 0
        AND total_amount >= 0
        AND amount_paid >= 0
        AND amount_due >= 0
    );


-- ============================================================
-- 7. INVOICE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_customer
    ON public.invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_sales_order
    ON public.invoices(sales_order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date
    ON public.invoices(issue_date);

CREATE INDEX IF NOT EXISTS idx_invoices_clearance_status
    ON public.invoices(clearance_status);

CREATE INDEX IF NOT EXISTS idx_invoices_reporting_status
    ON public.invoices(reporting_status);


-- ============================================================
-- 8. PAYMENT → INVOICE RECALCULATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_invoice_payment_state(
    p_invoice_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total NUMERIC(18,2);
    v_paid NUMERIC(18,2);
    v_due NUMERIC(18,2);
BEGIN

    SELECT total_amount
    INTO v_total
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
    END IF;

    SELECT COALESCE(
        SUM(
            CASE
                WHEN status = 'completed'
                THEN amount
                ELSE 0
            END
        ),
        0
    )
    INTO v_paid
    FROM public.payments
    WHERE invoice_id = p_invoice_id;

    v_due := GREATEST(v_total - v_paid, 0);

    UPDATE public.invoices
    SET
        amount_paid = v_paid,
        amount_due = v_due,

        payment_status =
            CASE
                WHEN v_paid <= 0 THEN 'unpaid'
                WHEN v_due <= 0 THEN 'paid'
                ELSE 'partial'
            END,

        status =
            CASE
                WHEN status = 'draft' THEN status
                WHEN v_paid <= 0 AND status = 'paid' THEN 'issued'
                WHEN v_due <= 0 THEN 'paid'
                WHEN v_paid > 0 THEN 'partial'
                ELSE status
            END,

        updated_at = NOW()

    WHERE id = p_invoice_id;

END;
$$;


CREATE OR REPLACE FUNCTION public.trg_payment_recalculate_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF TG_OP = 'DELETE' THEN

        IF OLD.invoice_id IS NOT NULL THEN
            PERFORM public.recalculate_invoice_payment_state(
                OLD.invoice_id
            );
        END IF;

        RETURN OLD;
    END IF;


    IF NEW.invoice_id IS NOT NULL THEN
        PERFORM public.recalculate_invoice_payment_state(
            NEW.invoice_id
        );
    END IF;


    IF TG_OP = 'UPDATE'
       AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id
       AND OLD.invoice_id IS NOT NULL THEN

        PERFORM public.recalculate_invoice_payment_state(
            OLD.invoice_id
        );

    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS payment_recalculate_invoice
ON public.payments;

CREATE TRIGGER payment_recalculate_invoice
AFTER INSERT OR UPDATE OR DELETE
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_payment_recalculate_invoice();


-- ============================================================
-- 9. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS shifts_set_updated_at
ON public.shifts;

CREATE TRIGGER shifts_set_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS sales_set_updated_at
ON public.sales;

CREATE TRIGGER sales_set_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 10. RLS
-- ============================================================

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 11. SALES POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Sales users can manage sales"
ON public.sales;

CREATE POLICY "Sales users can manage sales"
ON public.sales
FOR ALL
TO public
USING (
    company_id = get_user_company_id()
    AND user_has_permission('sales')
)
WITH CHECK (
    company_id = get_user_company_id()
    AND user_has_permission('sales')
);


DROP POLICY IF EXISTS "Users can view sales"
ON public.sales;

CREATE POLICY "Users can view sales"
ON public.sales
FOR SELECT
TO public
USING (
    company_id = get_user_company_id()
);


-- ============================================================
-- 12. SHIFT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Sales users can manage shifts"
ON public.shifts;

CREATE POLICY "Sales users can manage shifts"
ON public.shifts
FOR ALL
TO public
USING (
    company_id = get_user_company_id()
    AND user_has_permission('sales')
)
WITH CHECK (
    company_id = get_user_company_id()
    AND user_has_permission('sales')
);


DROP POLICY IF EXISTS "Users can view shifts"
ON public.shifts;

CREATE POLICY "Users can view shifts"
ON public.shifts
FOR SELECT
TO public
USING (
    company_id = get_user_company_id()
);


-- ============================================================
-- 13. PAYMENT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Finance users can manage payments"
ON public.payments;

CREATE POLICY "Finance users can manage payments"
ON public.payments
FOR ALL
TO public
USING (
    company_id = get_user_company_id()
    AND user_has_permission('finance')
)
WITH CHECK (
    company_id = get_user_company_id()
    AND user_has_permission('finance')
);


DROP POLICY IF EXISTS "Users can view payments"
ON public.payments;

CREATE POLICY "Users can view payments"
ON public.payments
FOR SELECT
TO public
USING (
    company_id = get_user_company_id()
);


-- ============================================================
-- 14. COMMENTS
-- ============================================================

COMMENT ON TABLE public.sales
IS 'Canonical ERPX-AI POS sales transactions';

COMMENT ON TABLE public.shifts
IS 'Canonical ERPX-AI cashier shift management';

COMMENT ON TABLE public.payments
IS 'Canonical ERPX-AI payment ledger';

COMMENT ON COLUMN public.invoices.uuid
IS 'Unique electronic invoice UUID';

COMMENT ON COLUMN public.invoices.previous_invoice_hash
IS 'Hash reference to the previous invoice in the invoice chain';

COMMENT ON COLUMN public.invoices.invoice_hash
IS 'Hash of the electronic invoice';

COMMENT ON COLUMN public.invoices.cryptographic_stamp
IS 'Cryptographic stamp associated with the electronic invoice';

COMMENT ON COLUMN public.invoices.qr_code_base64
IS 'Base64 encoded electronic invoice QR payload';

COMMENT ON COLUMN public.invoices.xml_content
IS 'Generated electronic invoice XML snapshot';


COMMIT;
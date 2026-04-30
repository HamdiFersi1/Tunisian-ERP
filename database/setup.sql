-- Tunisian ERP Database Setup
-- Run this after creating your PostgreSQL database

-- The schema is managed by Prisma, but here are some useful queries:

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON invoices(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_company_date ON purchases(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_period ON payrolls(employee_id, period);

-- View for account balances
CREATE OR REPLACE VIEW account_balances AS
SELECT 
    a.id,
    a.code,
    a.name_fr,
    a.class,
    a.type,
    COALESCE(SUM(le.debit), 0) as total_debit,
    COALESCE(SUM(le.credit), 0) as total_credit,
    COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) as balance
FROM accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
GROUP BY a.id, a.code, a.name_fr, a.class, a.type;

-- View for client balances
CREATE OR REPLACE VIEW client_balances AS
SELECT 
    c.id,
    c.code,
    c.name,
    c.matricule_fiscal,
    c.balance,
    COUNT(i.id) as invoice_count,
    SUM(CASE WHEN i.status IN ('SENT', 'PARTIAL', 'OVERDUE') THEN i.total - i.paid_amount ELSE 0 END) as pending_amount
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
GROUP BY c.id, c.code, c.name, c.matricule_fiscal, c.balance;

-- View for monthly sales summary
CREATE OR REPLACE VIEW monthly_sales AS
SELECT 
    company_id,
    DATE_TRUNC('month', date) as month,
    COUNT(*) as invoice_count,
    SUM(sub_total) as total_ht,
    SUM(vat_total) as total_tva,
    SUM(total) as total_ttc
FROM invoices
WHERE status != 'CANCELLED'
GROUP BY company_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

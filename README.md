# Tunisian ERP System 🇹🇳

A complete mini-ERP system tailored for the Tunisian market, built with Node.js, React, and PostgreSQL.

## Features

### 🏢 Multi-company Support
- Each company has isolated data
- Tunisian fiscal identification (Matricule Fiscal)

### 📊 Accounting (Plan Comptable Tunisien)
- Full PCT (Plan Comptable Tunisien) implementation
- Classes 1-7 with standard accounts
- Automatic journal entries for invoices and purchases
- General ledger with balance tracking
- VAT handling (19%, 13%, 7%, 0%)

### 👥 CRM
- Client management with credit limits
- Supplier management
- Contact information and balance tracking

### 📦 Inventory
- Product catalog with bilingual names (FR/AR)
- Stock management with minimum stock alerts
- Automatic stock updates on sales/purchases
- VAT rates per product

### 💰 Sales & Purchasing
- Invoice generation with auto-numbering (FAC-YYYY-XXXX)
- Purchase orders with auto-numbering (ACH-YYYY-XXXX)
- Payment tracking
- Status management (Draft, Sent, Paid, Partial, Overdue)

### 👷 Payroll (Paie Tunisienne)
- CNSS calculations (Employee 9.68%, Employer 17.07%)
- Unemployment insurance (0.5% each)
- Work accident insurance (0.4% - 4%)
- IRPP calculation with progressive brackets
- CSS (Contribution Sociale de Solidarité) 0.5%
- Employer taxes (TFP, FOPROLOS)
- Net salary calculation
- Payslip generation workflow (Draft → Confirmed → Paid)

### 📈 Dashboard
- Real-time statistics
- Sales/Purchases charts
- Low stock alerts
- Pending invoices tracking

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** with PostgreSQL
- **JWT** authentication
- **Zod** validation
- **Winston** logging

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** patterns
- **TanStack Query** (React Query) for data fetching
- **Zustand** for state management
- **Recharts** for charts
- **React Hook Form** for forms

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Initialize PCT accounts
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Default Login
After registration, the first user becomes ADMIN for the company.

## Tunisian-specific Features

### Tax Configuration (2025)
- **VAT Rates**: Standard 19%, Reduced 13%, Tourism 7%, Export 0%
- **CNSS**: Employee 9.68%, Employer 17.07%, Unemployment 0.5% each
- **IRPP Brackets**: Progressive from 0% to 35%
- **Employer Costs**: TFP (1%/2%), FOPROLOS 1%, Work Accident (0.4%-4%)
- **CSS**: 0.5% on income > 5000 TND/year
- **SMIG 2025**: 459.264 TND/month (48h), 390.692 TND/month (40h)

### Document Numbering
- Invoices: `FAC-YYYY-XXXX`
- Purchases: `ACH-YYYY-XXXX`
- Payslips: `PAIE-YYYY-MM-MATRICULE`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new company
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Company
- `GET /api/companies` - Get company info
- `PUT /api/companies` - Update company

### Accounts (PCT)
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `POST /api/accounts/init-pct` - Initialize default PCT accounts

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/payment` - Record payment

### Purchases
- `GET /api/purchases` - List purchases
- `POST /api/purchases` - Create purchase

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee

### Payroll
- `GET /api/payrolls` - List payrolls
- `POST /api/payrolls/calculate` - Calculate payroll
- `POST /api/payrolls/:id/confirm` - Confirm payroll
- `POST /api/payrolls/:id/pay` - Mark as paid

### Journal
- `GET /api/journal` - List journal entries
- `POST /api/journal` - Create manual entry
- `GET /api/journal/ledger/:accountId` - Account ledger

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/chart-data` - Chart data

## License

MIT License - Built for the Tunisian market 🇹🇳

## Author

**Hamdi Fersi**

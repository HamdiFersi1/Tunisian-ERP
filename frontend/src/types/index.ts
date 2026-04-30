export interface Company {
  id: string
  name: string
  matriculeFiscal: string
  registreCommerce?: string
  codeTva?: string
  address: string
  city: string
  postalCode: string
  phone: string
  email: string
  website?: string
  currency: string
  fiscalYearStart: number
}

export interface Client {
  id: string
  code: string
  name: string
  matriculeFiscal?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  creditLimit?: number
  balance: number
  _count?: { invoices: number }
}

export interface Supplier {
  id: string
  code: string
  name: string
  matriculeFiscal?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  balance: number
}

export interface Product {
  id: string
  code: string
  nameFr: string
  nameAr?: string
  description?: string
  category?: string
  unit: string
  purchasePrice: number
  salePrice: number
  vatRate: number
  stock: number
  minStock: number
  accountCode: string
}

export interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  clientId: string
  client: Client
  items: InvoiceItem[]
  subTotal: number
  vatTotal: number
  total: number
  paidAmount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  paymentMethod?: string
  notes?: string
}

export interface InvoiceItem {
  id: string
  productId: string
  product: Product
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount: number
  total: number
}

export interface Purchase {
  id: string
  number: string
  date: string
  supplierId: string
  supplier: Supplier
  items: PurchaseItem[]
  subTotal: number
  vatTotal: number
  total: number
  paidAmount: number
  status: string
  notes?: string
}

export interface PurchaseItem {
  id: string
  productId: string
  product: Product
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  total: number
}

export interface Employee {
  id: string
  matricule: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  birthDate?: string
  hireDate: string
  contractType: string
  department?: string
  position?: string
  baseSalary: number
  cnssNumber?: string
  isActive: boolean
}

export interface Payroll {
  id: string
  employeeId: string
  employee: Employee
  period: string
  baseSalary: number
  bonuses: number
  overtime: number
  grossSalary: number
  cnssEmployee: number
  cnssEmployer: number
  unemploymentEmployee: number
  unemploymentEmployer: number
  workAccident: number
  irpp: number
  css: number
  advances: number
  otherDeductions: number
  netSalary: number
  tfp: number
  foprolos: number
  totalEmployerCost: number
  status: string
}

export interface Account {
  id: string
  code: string
  nameFr: string
  nameAr?: string
  class: number
  type: string
  isActive: boolean
  parentId?: string
  parent?: Account
  children?: Account[]
}

export interface JournalEntry {
  id: string
  date: string
  reference: string
  description: string
  entries: LedgerEntry[]
}

export interface LedgerEntry {
  id: string
  accountId: string
  account: Account
  debit: number
  credit: number
  description?: string
}

export interface DashboardStats {
  counts: {
    clients: number
    suppliers: number
    products: number
    employees: number
  }
  financials: {
    monthlySales: number
    yearlySales: number
    monthlyPurchases: number
    pendingInvoices: number
  }
  alerts: {
    lowStock: number
  }
  recent: {
    invoices: Invoice[]
    purchases: Purchase[]
  }
}
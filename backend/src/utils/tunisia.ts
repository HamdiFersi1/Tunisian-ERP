// Tunisian Business Constants - Updated 2025

// VAT Rates (TVA)
export const VAT_RATES = {
  STANDARD: 19,    // Standard rate
  REDUCED_13: 13,  // Reinsurance, transport
  REDUCED_7: 7,    // Medical, tourism, press
  ZERO: 0,         // Exports
  EXEMPT: null     // Basic food, agriculture
} as const;

// CNSS Contributions (2025 Finance Law)
export const CNSS_RATES = {
  EMPLOYEE: 9.68,           // Employee share (%)
  EMPLOYER: 17.07,          // Employer share (%)
  UNEMPLOYMENT_EMPLOYEE: 0.5, // New 2025: Unemployment insurance
  UNEMPLOYMENT_EMPLOYER: 0.5,
  WORK_ACCIDENT_MIN: 0.4,   // Min work accident (%)
  WORK_ACCIDENT_MAX: 4.0,   // Max work accident (%)
} as const;

// Employer Taxes
export const EMPLOYER_TAXES = {
  TFP_STANDARD: 2.0,    // Taxe Formation Professionnelle (%)
  TFP_INDUSTRIAL: 1.0,  // Reduced for industrial companies
  FOPROLOS: 1.0,        // Fonds de Promotion du Logement Social (%)
} as const;

// IRPP Tax Brackets 2025 (Annual)
export const IRPP_BRACKETS = [
  { min: 0, max: 5000, rate: 0, deduction: 0 },
  { min: 5000.001, max: 10000, rate: 0.26, deduction: 1300 },
  { min: 10000.001, max: 20000, rate: 0.28, deduction: 1500 },
  { min: 20000.001, max: 30000, rate: 0.28, deduction: 1500 },
  { min: 30000.001, max: 40000, rate: 0.32, deduction: 2700 },
  { min: 40000.001, max: 50000, rate: 0.32, deduction: 2700 },
  { min: 50000.001, max: Infinity, rate: 0.35, deduction: 4200 }
];

// CSS (Contribution Sociale de Solidarité)
export const CSS_RATE = 0.005; // 0.5% on taxable income > 5000 TND/year

// Minimum Wage (SMIG) 2025
export const MINIMUM_WAGE = {
  MONTHLY_48H: 459.264,    // 48 hours/week
  MONTHLY_40H: 390.692,    // 40 hours/week
  HOURLY_48H: 2.208,
  HOURLY_40H: 2.254,
  DAILY_AGRICULTURAL: 17.664
} as const;

// Plan Comptable Tunisien (PCT) - Essential Accounts
export const PCT_ACCOUNTS = {
  // Class 1: Capitaux propres et passifs non courants
  CAPITAL: { code: '101', name: 'Capital social' },
  RESERVES: { code: '11', name: 'Réserves' },
  RESULT: { code: '13', name: "Résultat de l'exercice" },

  // Class 2: Actifs non courants
  LAND: { code: '221', name: 'Terrains' },
  BUILDINGS: { code: '222', name: 'Constructions' },
  EQUIPMENT: { code: '223', name: 'Installations techniques' },
  FURNITURE: { code: '224', name: 'Matériel de bureau' },

  // Class 3: Stocks
  RAW_MATERIALS: { code: '311', name: 'Matières premières' },
  SUPPLIES: { code: '313', name: 'Fournitures liées' },
  FINISHED_GOODS: { code: '355', name: 'Produits finis' },
  MERCHANDISE: { code: '37', name: 'Stocks de marchandises' },

  // Class 4: Comptes de tiers
  SUPPLIERS: { code: '40', name: 'Fournisseurs' },
  CLIENTS: { code: '41', name: 'Clients' },
  PERSONNEL: { code: '42', name: 'Personnel' },
  STATE: { code: '43', name: 'État et collectivités publiques' },

  // Class 5: Comptes financiers
  BANK: { code: '532', name: 'Banques' },
  CASH: { code: '54', name: 'Caisse' },

  // Class 6: Charges
  PURCHASES: { code: '60', name: 'Achats' },
  EXTERNAL_SERVICES: { code: '61', name: 'Services extérieurs' },
  PERSONNEL_COSTS: { code: '64', name: 'Charges de personnel' },
  TAXES: { code: '66', name: 'Impôts et taxes' },
  FINANCIAL_CHARGES: { code: '65', name: 'Charges financières' },
  DEPRECIATION: { code: '68', name: 'Dotations aux amortissements' },
  INCOME_TAX: { code: '69', name: 'Impôts sur les bénéfices' },

  // Class 7: Produits
  SALES: { code: '70', name: 'Ventes' },
  STOCKED_PRODUCTION: { code: '71', name: 'Production stockée' },
  OTHER_INCOME: { code: '73', name: 'Autres produits' },
  FINANCIAL_INCOME: { code: '75', name: 'Produits financiers' }
} as const;

// Document Number Generators
export const generateInvoiceNumber = (year: number, sequence: number): string => {
  return `FAC-${year}-${String(sequence).padStart(4, '0')}`;
};

export const generatePurchaseNumber = (year: number, sequence: number): string => {
  return `ACH-${year}-${String(sequence).padStart(4, '0')}`;
};

export const generateJournalReference = (type: string, date: Date, sequence: number): string => {
  return `${type}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
};

// IRPP Calculation
export const calculateIRPP = (annualTaxableIncome: number): number => {
  if (annualTaxableIncome <= 5000) return 0;

  const bracket = IRPP_BRACKETS.find(b => 
    annualTaxableIncome > b.min && annualTaxableIncome <= b.max
  );

  if (!bracket) return 0;

  const baseTax = (annualTaxableIncome * bracket.rate) - bracket.deduction;

  // CSS (0.5% if taxable income > 5000)
  const css = annualTaxableIncome > 5000 ? annualTaxableIncome * CSS_RATE : 0;

  return Math.max(0, baseTax + css);
};

// CNSS Calculation
export const calculateCNSS = (grossSalary: number) => {
  const employeeShare = grossSalary * (CNSS_RATES.EMPLOYEE / 100);
  const employerShare = grossSalary * (CNSS_RATES.EMPLOYER / 100);
  const unemploymentEmployee = grossSalary * (CNSS_RATES.UNEMPLOYMENT_EMPLOYEE / 100);
  const unemploymentEmployer = grossSalary * (CNSS_RATES.UNEMPLOYMENT_EMPLOYER / 100);

  return {
    employee: employeeShare,
    employer: employerShare,
    unemploymentEmployee,
    unemploymentEmployer,
    totalEmployee: employeeShare + unemploymentEmployee,
    totalEmployer: employerShare + unemploymentEmployer
  };
};

// Employer Costs Calculation
export const calculateEmployerCosts = (
  grossSalary: number, 
  isIndustrial: boolean = false,
  workAccidentRate: number = 0.5
) => {
  const cnss = calculateCNSS(grossSalary);
  const workAccident = grossSalary * (workAccidentRate / 100);
  const tfp = grossSalary * ((isIndustrial ? EMPLOYER_TAXES.TFP_INDUSTRIAL : EMPLOYER_TAXES.TFP_STANDARD) / 100);
  const foprolos = grossSalary * (EMPLOYER_TAXES.FOPROLOS / 100);

  return {
    cnssEmployer: cnss.employer,
    unemploymentEmployer: cnss.unemploymentEmployer,
    workAccident,
    tfp,
    foprolos,
    total: cnss.employer + cnss.unemploymentEmployer + workAccident + tfp + foprolos
  };
};

// Net Salary Calculation
export const calculateNetSalary = (
  grossSalary: number,
  bonuses: number = 0,
  overtime: number = 0,
  advances: number = 0,
  otherDeductions: number = 0
) => {
  const totalGross = grossSalary + bonuses + overtime;
  const cnss = calculateCNSS(totalGross);

  // Monthly taxable income (simplified - actual calculation may vary)
  const monthlyTaxable = totalGross - cnss.totalEmployee;
  const annualTaxable = monthlyTaxable * 12;
  const annualIRPP = calculateIRPP(annualTaxable);
  const monthlyIRPP = annualIRPP / 12;

  const netSalary = totalGross - cnss.totalEmployee - monthlyIRPP - advances - otherDeductions;

  return {
    grossSalary,
    bonuses,
    overtime,
    totalGross,
    cnssEmployee: cnss.totalEmployee,
    irpp: monthlyIRPP,
    advances,
    otherDeductions,
    netSalary: Math.max(0, netSalary),
    employerCosts: calculateEmployerCosts(totalGross)
  };
};

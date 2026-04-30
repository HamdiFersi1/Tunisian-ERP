import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateNetSalary, calculateCNSS, calculateEmployerCosts, calculateIRPP, CSS_RATE } from '../utils/tunisia';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { period, employeeId, status } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (period) where.period = period;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: { matricule: true, firstName: true, lastName: true, department: true }
        }
      },
      orderBy: { period: 'desc' }
    });

    res.json(payrolls);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const payroll = await prisma.payroll.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: { employee: true }
    });

    if (!payroll) throw new AppError('Payroll not found', 404);
    res.json(payroll);
  } catch (error) {
    next(error);
  }
});

router.post('/calculate', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      employeeId: z.string(),
      period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
      bonuses: z.number().min(0).default(0),
      overtime: z.number().min(0).default(0),
      advances: z.number().min(0).default(0),
      otherDeductions: z.number().min(0).default(0),
      workAccidentRate: z.number().min(0.4).max(4).default(0.5),
      isIndustrial: z.boolean().default(false)
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, companyId, isActive: true }
    });

    if (!employee) throw new AppError('Employee not found or inactive', 404);

    // Check if payroll already exists for this period
    const existing = await prisma.payroll.findUnique({
      where: { employeeId_period: { employeeId: data.employeeId, period: data.period } }
    });

    if (existing) throw new AppError('Payroll already exists for this period', 400);

    const grossSalary = Number(employee.baseSalary);
    const totalGross = grossSalary + data.bonuses + data.overtime;

    // Calculate CNSS
    const cnss = calculateCNSS(totalGross);

    // Calculate IRPP
    const monthlyTaxable = totalGross - cnss.totalEmployee;
    const annualTaxable = monthlyTaxable * 12;
    const annualIRPP = calculateIRPP(annualTaxable);
    const monthlyIRPP = annualIRPP / 12;

    // Calculate CSS
    const css = annualTaxable > 5000 ? (annualTaxable * CSS_RATE) / 12 : 0;

    // Calculate employer costs
    const employerCosts = calculateEmployerCosts(totalGross, data.isIndustrial, data.workAccidentRate);

    const netSalary = totalGross - cnss.totalEmployee - monthlyIRPP - css - data.advances - data.otherDeductions;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        period: data.period,
        baseSalary: grossSalary,
        bonuses: data.bonuses,
        overtime: data.overtime,
        grossSalary: totalGross,
        cnssEmployee: cnss.employee,
        cnssEmployer: cnss.employer,
        unemploymentEmployee: cnss.unemploymentEmployee,
        unemploymentEmployer: cnss.unemploymentEmployer,
        workAccident: employerCosts.workAccident,
        irpp: monthlyIRPP,
        css,
        advances: data.advances,
        otherDeductions: data.otherDeductions,
        netSalary: Math.max(0, netSalary),
        tfp: employerCosts.tfp,
        foprolos: employerCosts.foprolos,
        totalEmployerCost: totalGross + employerCosts.total,
        status: 'DRAFT',
        companyId
      }
    });

    res.status(201).json(payroll);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirm', async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;

    const payroll = await prisma.payroll.findFirst({
      where: { id: req.params.id, companyId },
      include: { employee: true }
    });

    if (!payroll) throw new AppError('Payroll not found', 404);
    if (payroll.status !== 'DRAFT') throw new AppError('Payroll already processed', 400);

    await prisma.$transaction(async (tx) => {
      await tx.payroll.update({
        where: { id: req.params.id },
        data: { status: 'CONFIRMED' }
      });

      // Create journal entry for payroll
      const personnelAccount = await tx.account.findUnique({
        where: { companyId_code: { companyId, code: '421' } }
      });

      const chargesAccount = await tx.account.findUnique({
        where: { companyId_code: { companyId, code: '645' } }
      });

      if (personnelAccount && chargesAccount) {
        await tx.journalEntry.create({
          data: {
            date: new Date(),
            reference: `PAIE-${payroll.period}-${payroll.employee.matricule}`,
            description: `Paie ${payroll.period} - ${payroll.employee.firstName} ${payroll.employee.lastName}`,
            companyId,
            entries: {
              create: [
                {
                  accountId: personnelAccount.id,
                  debit: Number(payroll.netSalary),
                  credit: 0,
                  description: 'Salaire net à payer'
                },
                {
                  accountId: chargesAccount.id,
                  debit: Number(payroll.cnssEmployer) + Number(payroll.unemploymentEmployer) + 
                         Number(payroll.workAccident) + Number(payroll.tfp) + Number(payroll.foprolos),
                  credit: 0,
                  description: 'Charges sociales employeur'
                },
                {
                  accountId: (await tx.account.findUnique({
                    where: { companyId_code: { companyId, code: '641' } }
                  }))!.id,
                  debit: 0,
                  credit: Number(payroll.grossSalary),
                  description: 'Salaires bruts'
                }
              ]
            }
          }
        });
      }
    });

    res.json({ message: 'Payroll confirmed', payroll });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pay', async (req: AuthRequest, res, next) => {
  try {
    const payroll = await prisma.payroll.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId, status: 'CONFIRMED' },
      data: { status: 'PAID' }
    });

    if (payroll.count === 0) throw new AppError('Payroll not found or not confirmed', 400);

    res.json({ message: 'Payroll marked as paid' });
  } catch (error) {
    next(error);
  }
});

export { router as payrollRouter };

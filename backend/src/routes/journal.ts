import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        entries: {
          include: { account: { select: { code: true, nameFr: true } } }
        },
        invoice: { select: { number: true } },
        purchase: { select: { number: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const entrySchema = z.object({
      accountId: z.string(),
      debit: z.number().min(0).default(0),
      credit: z.number().min(0).default(0),
      description: z.string().optional()
    });

    const schema = z.object({
      date: z.string().datetime(),
      reference: z.string(),
      description: z.string(),
      entries: z.array(entrySchema).min(2)
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    // Verify balance
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new AppError('Journal entry must be balanced (Total Debit = Total Credit)', 400);
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        date: new Date(data.date),
        reference: data.reference,
        description: data.description,
        companyId,
        entries: {
          create: data.entries
        }
      },
      include: {
        entries: { include: { account: true } }
      }
    });

    res.status(201).json(journalEntry);
  } catch (error) {
    next(error);
  }
});

router.get('/ledger/:accountId', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { accountId } = req.params;
    const companyId = req.user!.companyId;

    const where: any = {
      accountId,
      journalEntry: { companyId }
    };

    if (startDate || endDate) {
      where.journalEntry = {
        ...where.journalEntry,
        date: {}
      };
      if (startDate) where.journalEntry.date.gte = new Date(startDate as string);
      if (endDate) where.journalEntry.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        journalEntry: {
          select: { date: true, reference: true, description: true }
        }
      },
      orderBy: { journalEntry: { date: 'asc' } }
    });

    // Calculate running balance
    let balance = 0;
    const ledgerWithBalance = entries.map(entry => {
      balance += Number(entry.debit) - Number(entry.credit);
      return {
        ...entry,
        balance
      };
    });

    res.json(ledgerWithBalance);
  } catch (error) {
    next(error);
  }
});

export { router as journalRouter };

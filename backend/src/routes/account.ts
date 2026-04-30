import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get all accounts
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { class: accountClass, type } = req.query;

    const where: any = { companyId: req.user!.companyId };
    if (accountClass) where.class = parseInt(accountClass as string);
    if (type) where.type = type;

    const accounts = await prisma.account.findMany({
      where,
      include: { parent: true, children: true },
      orderBy: { code: 'asc' }
    });

    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Create account
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res, next) => {
  try {
    const createSchema = z.object({
      code: z.string().min(2),
      nameFr: z.string().min(2),
      nameAr: z.string().optional(),
      class: z.number().min(1).max(7),
      type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
      parentId: z.string().optional()
    });

    const data = createSchema.parse(req.body);

    const existing = await prisma.account.findUnique({
      where: { companyId_code: { companyId: req.user!.companyId, code: data.code } }
    });

    if (existing) {
      throw new AppError('Account code already exists', 400);
    }

    const account = await prisma.account.create({
      data: {
        ...data,
        companyId: req.user!.companyId
      }
    });

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// Get account balance
router.get('/:id/balance', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId: id,
        journalEntry: { companyId: req.user!.companyId }
      }
    });

    const debit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const credit = entries.reduce((sum, e) => sum + Number(e.credit), 0);
    const balance = debit - credit;

    res.json({ debit, credit, balance });
  } catch (error) {
    next(error);
  }
});

// Initialize default PCT accounts
router.post('/init-pct', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const defaultAccounts = [
      // Class 1: Capitaux propres
      { code: '10', nameFr: 'Capital', class: 1, type: 'EQUITY' as const },
      { code: '101', nameFr: 'Capital social', class: 1, type: 'EQUITY' as const, parentCode: '10' },
      { code: '11', nameFr: 'Réserves', class: 1, type: 'EQUITY' as const },
      { code: '12', nameFr: 'Résultats reportés', class: 1, type: 'EQUITY' as const },
  { code: '13', nameFr: "Résultat de l'exercice", class: 1, type: 'EQUITY' as const },
      { code: '16', nameFr: 'Emprunts', class: 1, type: 'LIABILITY' as const },

      // Class 2: Actifs non courants
      { code: '22', nameFr: 'Immobilisations corporelles', class: 2, type: 'ASSET' as const },
      { code: '221', nameFr: 'Terrains', class: 2, type: 'ASSET' as const, parentCode: '22' },
      { code: '222', nameFr: 'Constructions', class: 2, type: 'ASSET' as const, parentCode: '22' },
      { code: '223', nameFr: 'Installations techniques', class: 2, type: 'ASSET' as const, parentCode: '22' },
      { code: '224', nameFr: 'Matériel de bureau', class: 2, type: 'ASSET' as const, parentCode: '22' },

      // Class 3: Stocks
      { code: '31', nameFr: 'Matières premières', class: 3, type: 'ASSET' as const },
      { code: '311', nameFr: 'Matières premières A', class: 3, type: 'ASSET' as const, parentCode: '31' },
      { code: '355', nameFr: 'Produits finis', class: 3, type: 'ASSET' as const },
      { code: '37', nameFr: 'Marchandises', class: 3, type: 'ASSET' as const },

      // Class 4: Tiers
      { code: '40', nameFr: 'Fournisseurs', class: 4, type: 'LIABILITY' as const },
      { code: '401', nameFr: 'Fournisseurs - Factures non parvenues', class: 4, type: 'LIABILITY' as const, parentCode: '40' },
      { code: '41', nameFr: 'Clients', class: 4, type: 'ASSET' as const },
      { code: '411', nameFr: 'Clients - Factures à établir', class: 4, type: 'ASSET' as const, parentCode: '41' },
      { code: '42', nameFr: 'Personnel', class: 4, type: 'LIABILITY' as const },
      { code: '421', nameFr: 'Personnel - Avances', class: 4, type: 'ASSET' as const, parentCode: '42' },
      { code: '43', nameFr: 'État et collectivités', class: 4, type: 'LIABILITY' as const },
      { code: '432', nameFr: 'État - TVA facturée', class: 4, type: 'LIABILITY' as const, parentCode: '43' },
      { code: '436', nameFr: 'État - TVA deductible', class: 4, type: 'ASSET' as const, parentCode: '43' },
      { code: '438', nameFr: 'État - IRPP à payer', class: 4, type: 'LIABILITY' as const, parentCode: '43' },
      { code: '44', nameFr: 'Sociétés du groupe', class: 4, type: 'LIABILITY' as const },

      // Class 5: Financiers
      { code: '53', nameFr: 'Banques', class: 5, type: 'ASSET' as const },
      { code: '532', nameFr: 'Comptes bancaires', class: 5, type: 'ASSET' as const, parentCode: '53' },
      { code: '54', nameFr: 'Caisse', class: 5, type: 'ASSET' as const },
      { code: '541', nameFr: 'Caisse siège social', class: 5, type: 'ASSET' as const, parentCode: '54' },

      // Class 6: Charges
      { code: '60', nameFr: 'Achats', class: 6, type: 'EXPENSE' as const },
      { code: '601', nameFr: 'Achats stockés', class: 6, type: 'EXPENSE' as const, parentCode: '60' },
      { code: '607', nameFr: 'Achats de marchandises', class: 6, type: 'EXPENSE' as const, parentCode: '60' },
      { code: '61', nameFr: 'Services extérieurs', class: 6, type: 'EXPENSE' as const },
      { code: '64', nameFr: 'Charges de personnel', class: 6, type: 'EXPENSE' as const },
      { code: '641', nameFr: 'Salaires bruts', class: 6, type: 'EXPENSE' as const, parentCode: '64' },
      { code: '645', nameFr: 'Charges sociales', class: 6, type: 'EXPENSE' as const, parentCode: '64' },
      { code: '66', nameFr: 'Impôts et taxes', class: 6, type: 'EXPENSE' as const },
      { code: '68', nameFr: 'Dotations aux amortissements', class: 6, type: 'EXPENSE' as const },

      // Class 7: Produits
      { code: '70', nameFr: 'Ventes', class: 7, type: 'REVENUE' as const },
      { code: '701', nameFr: 'Ventes de produits finis', class: 7, type: 'REVENUE' as const, parentCode: '70' },
      { code: '707', nameFr: 'Ventes de marchandises', class: 7, type: 'REVENUE' as const, parentCode: '70' },
      { code: '71', nameFr: 'Production stockée', class: 7, type: 'REVENUE' as const },
      { code: '75', nameFr: 'Produits financiers', class: 7, type: 'REVENUE' as const }
    ];

    const created = [];
    const companyId = req.user!.companyId;

    // Create parent accounts first
    for (const acc of defaultAccounts.filter(a => !a.parentCode)) {
      const existing = await prisma.account.findUnique({
        where: { companyId_code: { companyId, code: acc.code } }
      });

      if (!existing) {
        const created_acc = await prisma.account.create({
          data: {
            code: acc.code,
            nameFr: acc.nameFr,
            class: acc.class,
            type: acc.type,
            companyId
          }
        });
        created.push(created_acc);
      }
    }

    // Create child accounts
    for (const acc of defaultAccounts.filter(a => a.parentCode)) {
      const parent = await prisma.account.findUnique({
        where: { companyId_code: { companyId, code: acc.parentCode! } }
      });

      if (parent) {
        const existing = await prisma.account.findUnique({
          where: { companyId_code: { companyId, code: acc.code } }
        });

        if (!existing) {
          const created_acc = await prisma.account.create({
            data: {
              code: acc.code,
              nameFr: acc.nameFr,
              class: acc.class,
              type: acc.type,
              parentId: parent.id,
              companyId
            }
          });
          created.push(created_acc);
        }
      }
    }

    res.json({ message: 'PCT accounts initialized', count: created.length, accounts: created });
  } catch (error) {
    next(error);
  }
});

export { router as accountRouter };

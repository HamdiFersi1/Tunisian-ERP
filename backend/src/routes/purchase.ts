import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generatePurchaseNumber } from '../utils/tunisia';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, supplierId } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, matriculeFiscal: true } },
        items: { include: { product: { select: { code: true, nameFr: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(purchases);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const itemSchema = z.object({
      productId: z.string(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      vatRate: z.number().min(0).max(100)
    });

    const schema = z.object({
      date: z.string().datetime(),
      supplierId: z.string(),
      items: z.array(itemSchema).min(1),
      notes: z.string().optional()
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, companyId }
    });
    if (!supplier) throw new AppError('Supplier not found', 404);

    let subTotal = 0;
    let vatTotal = 0;

    const itemsData = await Promise.all(data.items.map(async (item) => {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, companyId }
      });
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404);

      const itemTotal = item.quantity * item.unitPrice;
      const itemVat = itemTotal * (item.vatRate / 100);

      subTotal += itemTotal;
      vatTotal += itemVat;

      return { ...item, total: itemTotal + itemVat };
    }));

    const total = subTotal + vatTotal;
    const year = new Date(data.date).getFullYear();
    const lastPurchase = await prisma.purchase.findFirst({
      where: { companyId, number: { startsWith: `ACH-${year}` } },
      orderBy: { number: 'desc' }
    });

    const sequence = lastPurchase ? parseInt(lastPurchase.number.split('-')[2]) + 1 : 1;
    const number = generatePurchaseNumber(year, sequence);

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          number,
          date: new Date(data.date),
          supplierId: data.supplierId,
          subTotal,
          vatTotal,
          total,
          status: 'RECEIVED',
          notes: data.notes,
          companyId,
          items: { create: itemsData }
        }
      });

      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { balance: { increment: total } }
      });

      // Journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          date: new Date(data.date),
          reference: number,
          description: `Achat ${number} - ${supplier.name}`,
          companyId,
          purchaseId: purchase.id,
          entries: {
            create: [
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '607' } }
                }))!.id,
                debit: subTotal,
                credit: 0,
                description: 'Achats'
              },
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '436' } }
                }))!.id,
                debit: vatTotal,
                credit: 0,
                description: 'TVA déductible'
              },
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '401' } }
                }))!.id,
                debit: 0,
                credit: total,
                description: `Fournisseur - ${supplier.name}`
              }
            ]
          }
        }
      });

      // Update stock
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }

      return { purchase, journalEntry };
    });

    res.status(201).json(result.purchase);
  } catch (error) {
    next(error);
  }
});

export { router as purchaseRouter };

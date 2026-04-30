import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateInvoiceNumber } from '../utils/tunisia';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, clientId, startDate, endDate } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, matriculeFiscal: true } },
        items: { include: { product: { select: { code: true, nameFr: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        client: true,
        items: { include: { product: true } },
        journalEntries: { include: { entries: { include: { account: true } } } }
      }
    });

    if (!invoice) throw new AppError('Invoice not found', 404);
    res.json(invoice);
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
      vatRate: z.number().min(0).max(100),
      discount: z.number().min(0).default(0)
    });

    const schema = z.object({
      date: z.string().datetime(),
      dueDate: z.string().datetime(),
      clientId: z.string(),
      items: z.array(itemSchema).min(1),
      notes: z.string().optional(),
      paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DIRECT_DEBIT']).optional()
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    // Verify client exists
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId }
    });
    if (!client) throw new AppError('Client not found', 404);

    // Calculate totals
    let subTotal = 0;
    let vatTotal = 0;

    const itemsData = await Promise.all(data.items.map(async (item) => {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, companyId }
      });
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404);

      const itemSubtotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
      const itemVat = itemSubtotal * (item.vatRate / 100);

      subTotal += itemSubtotal;
      vatTotal += itemVat;

      return {
        ...item,
        total: itemSubtotal + itemVat
      };
    }));

    const total = subTotal + vatTotal;

    // Get next invoice number
    const year = new Date(data.date).getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { companyId, number: { startsWith: `FAC-${year}` } },
      orderBy: { number: 'desc' }
    });

    const sequence = lastInvoice 
      ? parseInt(lastInvoice.number.split('-')[2]) + 1 
      : 1;
    const number = generateInvoiceNumber(year, sequence);

    const result = await prisma.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          number,
          date: new Date(data.date),
          dueDate: new Date(data.dueDate),
          clientId: data.clientId,
          subTotal,
          vatTotal,
          total,
          status: 'SENT',
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          companyId,
          items: {
            create: itemsData
          }
        },
        include: { items: true }
      });

      // Update client balance
      await tx.client.update({
        where: { id: data.clientId },
        data: { balance: { increment: total } }
      });

      // Create journal entry for accounting
      const journalEntry = await tx.journalEntry.create({
        data: {
          date: new Date(data.date),
          reference: number,
          description: `Facture ${number} - ${client.name}`,
          companyId,
          invoiceId: invoice.id,
          entries: {
            create: [
              // Debit: Client account (411)
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '411' } }
                }))!.id,
                debit: total,
                credit: 0,
                description: `Client - ${client.name}`
              },
              // Credit: Sales account (701 or 707)
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '707' } }
                }))!.id,
                debit: 0,
                credit: subTotal,
                description: 'Ventes'
              },
              // Credit: VAT collected (432)
              {
                accountId: (await tx.account.findUnique({
                  where: { companyId_code: { companyId, code: '432' } }
                }))!.id,
                debit: 0,
                credit: vatTotal,
                description: 'TVA collectée'
              }
            ]
          }
        }
      });

      // Update product stock
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      return { invoice, journalEntry };
    });

    res.status(201).json(result.invoice);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/payment', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      amount: z.number().positive(),
      paymentMethod: z.enum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD']),
      date: z.string().datetime().optional()
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId },
      include: { client: true }
    });

    if (!invoice) throw new AppError('Invoice not found', 404);

    const newPaidAmount = Number(invoice.paidAmount) + data.amount;
    const status = newPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL';

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: req.params.id },
        data: {
          paidAmount: newPaidAmount,
          status,
          paymentMethod: data.paymentMethod
        }
      });

      await tx.client.update({
        where: { id: invoice.clientId },
        data: { balance: { decrement: data.amount } }
      });

      // Journal entry for payment
      const bankAccount = await tx.account.findUnique({
        where: { companyId_code: { companyId, code: '532' } }
      });

      if (bankAccount) {
        await tx.journalEntry.create({
          data: {
            date: data.date ? new Date(data.date) : new Date(),
            reference: `PAY-${invoice.number}`,
            description: `Paiement facture ${invoice.number}`,
            companyId,
            entries: {
              create: [
                {
                  accountId: bankAccount.id,
                  debit: data.amount,
                  credit: 0,
                  description: 'Banque'
                },
                {
                  accountId: (await tx.account.findUnique({
                    where: { companyId_code: { companyId, code: '411' } }
                  }))!.id,
                  debit: 0,
                  credit: data.amount,
                  description: `Client - ${invoice.client.name}`
                }
              ]
            }
          }
        });
      }
    });

    res.json({ message: 'Payment recorded', status });
  } catch (error) {
    next(error);
  }
});

export { router as invoiceRouter };

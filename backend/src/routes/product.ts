import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, category, lowStock } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (search) {
      where.OR = [
        { nameFr: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;
    if (lowStock === 'true') {
      where.stock = { lte: prisma.product.fields.minStock };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { nameFr: 'asc' }
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId }
    });

    if (!product) throw new AppError('Product not found', 404);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      code: z.string().min(2),
      nameFr: z.string().min(2),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().default('PIECE'),
      purchasePrice: z.number().min(0),
      salePrice: z.number().min(0),
      vatRate: z.number().min(0).max(100).default(19),
      stock: z.number().min(0).default(0),
      minStock: z.number().min(0).default(0),
      accountCode: z.string().default('355')
    });

    const data = schema.parse(req.body);

    const existing = await prisma.product.findUnique({
      where: { companyId_code: { companyId: req.user!.companyId, code: data.code } }
    });

    if (existing) throw new AppError('Product code already exists', 400);

    const product = await prisma.product.create({
      data: { ...data, companyId: req.user!.companyId }
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      nameFr: z.string().min(2).optional(),
      nameAr: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      purchasePrice: z.number().min(0).optional(),
      salePrice: z.number().min(0).optional(),
      vatRate: z.number().min(0).max(100).optional(),
      stock: z.number().min(0).optional(),
      minStock: z.number().min(0).optional(),
      accountCode: z.string().optional()
    });

    const data = schema.parse(req.body);

    const product = await prisma.product.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId },
      data
    });

    if (product.count === 0) throw new AppError('Product not found', 404);

    const updated = await prisma.product.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        _count: { select: { invoiceItems: true, purchaseItems: true } }
      }
    });

    if (!product) throw new AppError('Product not found', 404);
    if (product._count.invoiceItems > 0 || product._count.purchaseItems > 0) {
      throw new AppError('Cannot delete product with transactions', 400);
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as productRouter };

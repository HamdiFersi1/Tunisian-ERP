import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchases: true } } }
    });

    res.json(suppliers);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      matriculeFiscal: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional()
    });

    const data = schema.parse(req.body);

    const existing = await prisma.supplier.findUnique({
      where: { companyId_code: { companyId: req.user!.companyId, code: data.code } }
    });

    if (existing) throw new AppError('Supplier code already exists', 400);

    const supplier = await prisma.supplier.create({
      data: { ...data, companyId: req.user!.companyId }
    });

    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      matriculeFiscal: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional()
    });

    const data = schema.parse(req.body);

    const supplier = await prisma.supplier.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId },
      data
    });

    if (supplier.count === 0) throw new AppError('Supplier not found', 404);

    const updated = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export { router as supplierRouter };

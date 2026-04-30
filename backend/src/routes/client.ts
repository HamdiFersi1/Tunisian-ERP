import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, city } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { matriculeFiscal: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (city) where.city = { contains: city as string, mode: 'insensitive' };

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { invoices: true } }
      }
    });

    res.json(clients);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        invoices: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });

    if (!client) throw new AppError('Client not found', 404);
    res.json(client);
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
      email: z.string().email().optional(),
      creditLimit: z.number().optional()
    });

    const data = schema.parse(req.body);

    const existing = await prisma.client.findUnique({
      where: { companyId_code: { companyId: req.user!.companyId, code: data.code } }
    });

    if (existing) throw new AppError('Client code already exists', 400);

    const client = await prisma.client.create({
      data: { ...data, companyId: req.user!.companyId }
    });

    res.status(201).json(client);
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
      email: z.string().email().optional(),
      creditLimit: z.number().optional()
    });

    const data = schema.parse(req.body);

    const client = await prisma.client.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId },
      data
    });

    if (client.count === 0) throw new AppError('Client not found', 404);

    const updated = await prisma.client.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: { _count: { select: { invoices: true } } }
    });

    if (!client) throw new AppError('Client not found', 404);
    if (client._count.invoices > 0) throw new AppError('Cannot delete client with invoices', 400);

    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as clientRouter };

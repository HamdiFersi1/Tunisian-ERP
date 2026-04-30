import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
});

router.put('/', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      address: z.string().min(5).optional(),
      city: z.string().min(2).optional(),
      postalCode: z.string().min(4).optional(),
      phone: z.string().min(8).optional(),
      email: z.string().email().optional(),
      website: z.string().optional(),
      fiscalYearStart: z.number().min(1).max(12).optional()
    });

    const data = updateSchema.parse(req.body);

    const company = await prisma.company.update({
      where: { id: req.user!.companyId },
      data
    });

    res.json(company);
  } catch (error) {
    next(error);
  }
});

export { router as companyRouter };

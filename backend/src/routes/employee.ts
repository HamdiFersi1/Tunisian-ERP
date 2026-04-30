import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, department, isActive } = req.query;
    const where: any = { companyId: req.user!.companyId };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { matricule: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (department) where.department = department;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { lastName: 'asc' }
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      include: {
        payrolls: { orderBy: { period: 'desc' }, take: 12 }
      }
    });

    if (!employee) throw new AppError('Employee not found', 404);
    res.json(employee);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      matricule: z.string().min(2),
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      birthDate: z.string().datetime().optional(),
      hireDate: z.string().datetime(),
      contractType: z.enum(['CDI', 'CDD', 'CDD_SAISONNIER', 'STAGE']).default('CDI'),
      department: z.string().optional(),
      position: z.string().optional(),
      baseSalary: z.number().positive(),
      cnssNumber: z.string().optional()
    });

    const data = schema.parse(req.body);
    const companyId = req.user!.companyId;

    const existing = await prisma.employee.findUnique({
      where: { companyId_matricule: { companyId, matricule: data.matricule } }
    });

    if (existing) throw new AppError('Employee matricule already exists', 400);

    const employee = await prisma.employee.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        hireDate: new Date(data.hireDate),
        companyId
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(2).optional(),
      lastName: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      baseSalary: z.number().positive().optional(),
      cnssNumber: z.string().optional(),
      isActive: z.boolean().optional()
    });

    const data = schema.parse(req.body);

    const employee = await prisma.employee.updateMany({
      where: { id: req.params.id, companyId: req.user!.companyId },
      data
    });

    if (employee.count === 0) throw new AppError('Employee not found', 404);

    const updated = await prisma.employee.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export { router as employeeRouter };

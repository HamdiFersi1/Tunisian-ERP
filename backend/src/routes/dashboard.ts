import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalClients,
      totalSuppliers,
      totalProducts,
      totalEmployees,
      monthlySales,
      yearlySales,
      monthlyPurchases,
      pendingInvoices,
      lowStockProducts,
      recentInvoices,
      recentPurchases
    ] = await Promise.all([
      prisma.client.count({ where: { companyId } }),
      prisma.supplier.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, isActive: true } }),

      prisma.invoice.aggregate({
        where: { companyId, date: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { total: true }
      }),

      prisma.invoice.aggregate({
        where: { companyId, date: { gte: startOfYear }, status: { not: 'CANCELLED' } },
        _sum: { total: true }
      }),

      prisma.purchase.aggregate({
        where: { companyId, date: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { total: true }
      }),

      prisma.invoice.count({
        where: { companyId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } }
      }),

      prisma.product.count({
        where: {
          companyId,
          stock: { lte: prisma.product.fields.minStock },
          minStock: { gt: 0 }
        }
      }),

      prisma.invoice.findMany({
        where: { companyId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } }
      }),

      prisma.purchase.findMany({
        where: { companyId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { name: true } } }
      })
    ]);

    res.json({
      counts: {
        clients: totalClients,
        suppliers: totalSuppliers,
        products: totalProducts,
        employees: totalEmployees
      },
      financials: {
        monthlySales: monthlySales._sum.total || 0,
        yearlySales: yearlySales._sum.total || 0,
        monthlyPurchases: monthlyPurchases._sum.total || 0,
        pendingInvoices
      },
      alerts: {
        lowStock: lowStockProducts
      },
      recent: {
        invoices: recentInvoices,
        purchases: recentPurchases
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/chart-data', async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;
    const now = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        start: d,
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      });
    }

    const salesData = await Promise.all(
      months.map(async (m) => {
        const result = await prisma.invoice.aggregate({
          where: {
            companyId,
            date: { gte: m.start, lte: m.end },
            status: { not: 'CANCELLED' }
          },
          _sum: { total: true }
        });
        return { month: m.label, amount: result._sum.total || 0 };
      })
    );

    const purchaseData = await Promise.all(
      months.map(async (m) => {
        const result = await prisma.purchase.aggregate({
          where: {
            companyId,
            date: { gte: m.start, lte: m.end },
            status: { not: 'CANCELLED' }
          },
          _sum: { total: true }
        });
        return { month: m.label, amount: result._sum.total || 0 };
      })
    );

    res.json({ sales: salesData, purchases: purchaseData });
  } catch (error) {
    next(error);
  }
});

export { router as dashboardRouter };

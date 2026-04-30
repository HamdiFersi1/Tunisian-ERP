import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';
import { companyRouter } from './routes/company';
import { accountRouter } from './routes/account';
import { clientRouter } from './routes/client';
import { supplierRouter } from './routes/supplier';
import { productRouter } from './routes/product';
import { invoiceRouter } from './routes/invoice';
import { purchaseRouter } from './routes/purchase';
import { employeeRouter } from './routes/employee';
import { payrollRouter } from './routes/payroll';
import { journalRouter } from './routes/journal';
import { dashboardRouter } from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/clients', clientRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/products', productRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/purchases', purchaseRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/payrolls', payrollRouter);
app.use('/api/journal', journalRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Tunisian ERP Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

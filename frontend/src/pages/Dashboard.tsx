import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { DashboardStats } from '../types'
import {
  Users,
  Truck,
  Package,
  Briefcase,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  ShoppingCart
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    }
  })

  const { data: chartData } = useQuery({
    queryKey: ['chart-data'],
    queryFn: async () => {
      const response = await api.get('/dashboard/chart-data')
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const statCards = [
    { name: 'Clients', value: stats?.counts.clients || 0, icon: Users, href: '/clients', color: 'bg-blue-500' },
    { name: 'Fournisseurs', value: stats?.counts.suppliers || 0, icon: Truck, href: '/suppliers', color: 'bg-green-500' },
    { name: 'Produits', value: stats?.counts.products || 0, icon: Package, href: '/products', color: 'bg-purple-500' },
    { name: 'Employés', value: stats?.counts.employees || 0, icon: Briefcase, href: '/employees', color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600">Vue d'ensemble de votre entreprise</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.name} to={card.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventes et Achats (12 derniers mois)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData?.sales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toFixed(3)} TND`} />
              <Legend />
              <Bar dataKey="amount" name="Ventes" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Ventes ce mois</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.financials.monthlySales.toFixed(3)} TND
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <TrendingDown className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Achats ce mois</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.financials.monthlyPurchases.toFixed(3)} TND
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Factures en attente</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.financials.pendingInvoices}
                </p>
              </div>
            </div>
          </div>

          {stats && stats.alerts.lowStock > 0 && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-red-700">Stock faible</p>
                  <p className="text-lg font-bold text-red-900">
                    {stats.alerts.lowStock} produits
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières factures</h3>
          <div className="space-y-3">
            {stats?.recent.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{invoice.number}</p>
                  <p className="text-sm text-gray-600">{invoice.client.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{Number(invoice.total).toFixed(3)} TND</p>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recent.invoices.length) && (
              <p className="text-gray-500 text-center py-4">Aucune facture récente</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Derniers achats</h3>
          <div className="space-y-3">
            {stats?.recent.purchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{purchase.number}</p>
                  <p className="text-sm text-gray-600">{purchase.supplier.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{Number(purchase.total).toFixed(3)} TND</p>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    purchase.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {purchase.status}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recent.purchases.length) && (
              <p className="text-gray-500 text-center py-4">Aucun achat récent</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
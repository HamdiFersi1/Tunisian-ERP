import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Invoice, Client, Product } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, X, Trash2 } from 'lucide-react'

interface InvoiceItemForm {
  productId: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount: number
}

export default function Invoices() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Invoice | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [items, setItems] = useState<InvoiceItemForm[]>([])
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const queryClient = useQueryClient()

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', search],
    queryFn: async () => {
      const response = await api.get(`/invoices?search=${search}`)
      return response.data
    }
  })

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await api.get('/clients')
      return response.data
    }
  })

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products')
      return response.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Facture créée avec succès')
      setShowModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    }
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post(`/invoices/${id}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Paiement enregistré')
    }
  })

  const resetForm = () => {
    setSelectedClient('')
    setItems([])
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setDueDate('')
    setNotes('')
  }

  const addItem = () => {
    setItems([...items, { productId: '', description: '', quantity: 1, unitPrice: 0, vatRate: 19, discount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItemForm, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'productId' && products) {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].description = product.nameFr
        newItems[index].unitPrice = Number(product.salePrice)
        newItems[index].vatRate = Number(product.vatRate)
      }
    }

    setItems(newItems)
  }

  const calculateTotals = () => {
    let subTotal = 0
    let vatTotal = 0

    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
      const itemVat = itemSubtotal * (item.vatRate / 100)
      subTotal += itemSubtotal
      vatTotal += itemVat
    })

    return { subTotal, vatTotal, total: subTotal + vatTotal }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    if (items.length === 0) {
      toast.error('Veuillez ajouter au moins un article')
      return
    }

    const data = {
      date: new Date(invoiceDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      clientId: selectedClient,
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
        discount: Number(item.discount)
      })),
      notes
    }

    createMutation.mutate(data)
  }

  const { subTotal, vatTotal, total } = calculateTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-600">Gérer vos factures clients</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle facture
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">N°</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Client</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>
              ) : invoices?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucune facture trouvée</td></tr>
              ) : (
                invoices?.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{inv.number}</td>
                    <td className="py-3 px-4 text-sm">{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">{inv.client.name}</td>
                    <td className="py-3 px-4 text-right font-medium">{Number(inv.total).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        inv.status === 'PARTIAL' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setShowDetail(inv)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                        {(inv.status === 'SENT' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE') && (
                          <button onClick={() => {
                            const amount = prompt('Montant du paiement (TND):')
                            if (amount) {
                              paymentMutation.mutate({
                                id: inv.id,
                                data: { amount: parseFloat(amount), paymentMethod: 'BANK_TRANSFER' }
                              })
                            }
                          }} className="p-1 text-green-600 hover:bg-green-50 rounded text-xs font-medium">Payer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Nouvelle Facture</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="input-field" required>
                    <option value="">Sélectionner un client</option>
                    {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" required />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Articles</h3>
                  <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Ajouter un article</button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                      <div className="col-span-3">
                        <label className="text-xs text-gray-600">Produit</label>
                        <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className="input-field text-sm" required>
                          <option value="">Sélectionner</option>
                          {products?.map(p => <option key={p.id} value={p.id}>{p.nameFr}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-600">Description</label>
                        <input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className="input-field text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">Qté</label>
                        <input type="number" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="input-field text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">Prix unit.</label>
                        <input type="number" step="0.001" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input-field text-sm" />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs text-gray-600">TVA%</label>
                        <input type="number" value={item.vatRate} onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)} className="input-field text-sm" />
                      </div>
                      <div className="col-span-1">
                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} />
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <div className="space-y-1 text-right">
                  <p className="text-sm text-gray-600">Sous-total: <span className="font-medium">{subTotal.toFixed(3)} TND</span></p>
                  <p className="text-sm text-gray-600">TVA: <span className="font-medium">{vatTotal.toFixed(3)} TND</span></p>
                  <p className="text-lg font-bold text-gray-900">Total: {total.toFixed(3)} TND</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary">Créer la facture</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Facture {showDetail.number}</h2>
              <button onClick={() => setShowDetail(null)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Client:</span> <span className="font-medium">{showDetail.client.name}</span></div>
                <div><span className="text-gray-600">Date:</span> <span className="font-medium">{new Date(showDetail.date).toLocaleDateString('fr-FR')}</span></div>
                <div><span className="text-gray-600">Échéance:</span> <span className="font-medium">{new Date(showDetail.dueDate).toLocaleDateString('fr-FR')}</span></div>
                <div><span className="text-gray-600">Statut:</span> <span className="font-medium">{showDetail.status}</span></div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-right py-2 px-3">Qté</th>
                    <th className="text-right py-2 px-3">Prix</th>
                    <th className="text-right py-2 px-3">TVA</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="text-right py-2 px-3">{item.quantity}</td>
                      <td className="text-right py-2 px-3">{Number(item.unitPrice).toFixed(3)}</td>
                      <td className="text-right py-2 px-3">{item.vatRate}%</td>
                      <td className="text-right py-2 px-3">{Number(item.total).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right space-y-1">
                <p>Sous-total: {Number(showDetail.subTotal).toFixed(3)} TND</p>
                <p>TVA: {Number(showDetail.vatTotal).toFixed(3)} TND</p>
                <p className="text-lg font-bold">Total: {Number(showDetail.total).toFixed(3)} TND</p>
                <p className="text-sm text-gray-600">Payé: {Number(showDetail.paidAmount).toFixed(3)} TND</p>
                <p className="text-sm font-medium">Reste: {(Number(showDetail.total) - Number(showDetail.paidAmount)).toFixed(3)} TND</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
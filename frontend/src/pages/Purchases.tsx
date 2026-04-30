import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Purchase, Supplier, Product } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, Eye, X, Trash2 } from 'lucide-react'

interface PurchaseItemForm {
  productId: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export default function Purchases() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Purchase | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [items, setItems] = useState<PurchaseItemForm[]>([])
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const queryClient = useQueryClient()

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ['purchases', search],
    queryFn: async () => {
      const response = await api.get(`/purchases?search=${search}`)
      return response.data
    }
  })

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers')
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
    mutationFn: (data: any) => api.post('/purchases', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Achat enregistré avec succès')
      setShowModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    }
  })

  const resetForm = () => {
    setSelectedSupplier('')
    setItems([])
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  const addItem = () => {
    setItems([...items, { productId: '', description: '', quantity: 1, unitPrice: 0, vatRate: 19 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PurchaseItemForm, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'productId' && products) {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].description = product.nameFr
        newItems[index].unitPrice = Number(product.purchasePrice)
        newItems[index].vatRate = Number(product.vatRate)
      }
    }

    setItems(newItems)
  }

  const calculateTotals = () => {
    let subTotal = 0
    let vatTotal = 0

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice
      const itemVat = itemTotal * (item.vatRate / 100)
      subTotal += itemTotal
      vatTotal += itemVat
    })

    return { subTotal, vatTotal, total: subTotal + vatTotal }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier) {
      toast.error('Veuillez sélectionner un fournisseur')
      return
    }
    if (items.length === 0) {
      toast.error('Veuillez ajouter au moins un article')
      return
    }

    const data = {
      date: new Date(purchaseDate).toISOString(),
      supplierId: selectedSupplier,
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate)
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
          <h1 className="text-2xl font-bold text-gray-900">Achats</h1>
          <p className="text-gray-600">Gérer vos achats fournisseurs</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel achat
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fournisseur</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>
              ) : purchases?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucun achat trouvé</td></tr>
              ) : (
                purchases?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.number}</td>
                    <td className="py-3 px-4 text-sm">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">{p.supplier.name}</td>
                    <td className="py-3 px-4 text-right font-medium">{Number(p.total).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        p.status === 'RECEIVED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setShowDetail(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Nouvel Achat</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
                  <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="input-field" required>
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="input-field" required />
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
                      <div className="col-span-4">
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
                  <button type="submit" className="btn-primary">Enregistrer l'achat</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Achat {showDetail.number}</h2>
              <button onClick={() => setShowDetail(null)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Fournisseur:</span> <span className="font-medium">{showDetail.supplier.name}</span></div>
                <div><span className="text-gray-600">Date:</span> <span className="font-medium">{new Date(showDetail.date).toLocaleDateString('fr-FR')}</span></div>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-right py-2 px-3">Qté</th>
                    <th className="text-right py-2 px-3">Prix</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="text-right py-2 px-3">{item.quantity}</td>
                      <td className="text-right py-2 px-3">{Number(item.unitPrice).toFixed(3)}</td>
                      <td className="text-right py-2 px-3">{Number(item.total).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right space-y-1">
                <p>Sous-total: {Number(showDetail.subTotal).toFixed(3)} TND</p>
                <p>TVA: {Number(showDetail.vatTotal).toFixed(3)} TND</p>
                <p className="text-lg font-bold">Total: {Number(showDetail.total).toFixed(3)} TND</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
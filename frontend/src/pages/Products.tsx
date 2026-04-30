import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Product } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, X, AlertTriangle } from 'lucide-react'

export default function Products() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    code: '', nameFr: '', nameAr: '', description: '', category: '', unit: 'PIECE',
    purchasePrice: '', salePrice: '', vatRate: '19', stock: '0', minStock: '0', accountCode: '355'
  })

  const queryClient = useQueryClient()

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: async () => {
      const response = await api.get(`/products?search=${search}`)
      return response.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit créé avec succès')
      setShowModal(false)
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit mis à jour')
      setShowModal(false)
      setEditingProduct(null)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit supprimé')
    }
  })

  const resetForm = () => setFormData({
    code: '', nameFr: '', nameAr: '', description: '', category: '', unit: 'PIECE',
    purchasePrice: '', salePrice: '', vatRate: '19', stock: '0', minStock: '0', accountCode: '355'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice),
      salePrice: parseFloat(formData.salePrice),
      vatRate: parseFloat(formData.vatRate),
      stock: parseFloat(formData.stock),
      minStock: parseFloat(formData.minStock)
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      code: product.code, nameFr: product.nameFr, nameAr: product.nameAr || '',
      description: product.description || '', category: product.category || '', unit: product.unit,
      purchasePrice: product.purchasePrice.toString(), salePrice: product.salePrice.toString(),
      vatRate: product.vatRate.toString(), stock: product.stock.toString(),
      minStock: product.minStock.toString(), accountCode: product.accountCode
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-600">Gérer votre catalogue produits</p>
        </div>
        <button onClick={() => { setEditingProduct(null); resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau produit
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Code</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Catégorie</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Prix vente</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Stock</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>
              ) : products?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucun produit trouvé</td></tr>
              ) : (
                products?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.code}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {p.stock <= p.minStock && p.minStock > 0 && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {p.nameFr}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{p.category || '-'}</td>
                    <td className="py-3 px-4 text-right">{Number(p.salePrice).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`${p.stock <= p.minStock && p.minStock > 0 ? 'text-red-600 font-medium' : ''}`}>
                        {Number(p.stock).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('Supprimer?')) deleteMutation.mutate(p.id) }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editingProduct ? 'Modifier' : 'Nouveau produit'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} className="input-field" required disabled={!!editingProduct} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label><input value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom (FR)</label><input value={formData.nameFr} onChange={(e) => setFormData(prev => ({ ...prev, nameFr: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom (AR)</label><input value={formData.nameAr} onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))} className="input-field" dir="rtl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <select value={formData.unit} onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))} className="input-field">
                    <option value="PIECE">Pièce</option>
                    <option value="KG">Kg</option>
                    <option value="LITRE">Litre</option>
                    <option value="METER">Mètre</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                  <select value={formData.vatRate} onChange={(e) => setFormData(prev => ({ ...prev, vatRate: e.target.value }))} className="input-field">
                    <option value="19">19% (Standard)</option>
                    <option value="13">13% (Réduit)</option>
                    <option value="7">7% (Tourisme)</option>
                    <option value="0">0% (Export)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat</label><input type="number" step="0.001" value={formData.purchasePrice} onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente</label><input type="number" step="0.001" value={formData.salePrice} onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock initial</label><input type="number" step="0.001" value={formData.stock} onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock min</label><input type="number" step="0.001" value={formData.minStock} onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">{editingProduct ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
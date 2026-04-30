import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Supplier } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'

export default function Suppliers() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    code: '', name: '', matriculeFiscal: '', address: '', city: '', phone: '', email: ''
  })

  const queryClient = useQueryClient()

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      const response = await api.get(`/suppliers?search=${search}`)
      return response.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Fournisseur créé avec succès')
      setShowModal(false)
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Fournisseur mis à jour')
      setShowModal(false)
      setEditingSupplier(null)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Fournisseur supprimé')
    }
  })

  const resetForm = () => setFormData({ code: '', name: '', matriculeFiscal: '', address: '', city: '', phone: '', email: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      code: supplier.code, name: supplier.name, matriculeFiscal: supplier.matriculeFiscal || '',
      address: supplier.address || '', city: supplier.city || '', phone: supplier.phone || '', email: supplier.email || ''
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600">Gérer vos fournisseurs</p>
        </div>
        <button onClick={() => { setEditingSupplier(null); resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau fournisseur
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">MF</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Ville</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Solde</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>
              ) : suppliers?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucun fournisseur trouvé</td></tr>
              ) : (
                suppliers?.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.code}</td>
                    <td className="py-3 px-4">{s.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{s.matriculeFiscal || '-'}</td>
                    <td className="py-3 px-4 text-sm">{s.city || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">{Number(s.balance).toFixed(3)} TND</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('Supprimer?')) deleteMutation.mutate(s.id) }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editingSupplier ? 'Modifier' : 'Nouveau fournisseur'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} className="input-field" required disabled={!!editingSupplier} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">MF</label><input value={formData.matriculeFiscal} onChange={(e) => setFormData(prev => ({ ...prev, matriculeFiscal: e.target.value }))} className="input-field" placeholder="XXX/T/A/P/XXX" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input-field" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">{editingSupplier ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
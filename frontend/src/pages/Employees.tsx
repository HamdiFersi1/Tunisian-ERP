import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Employee } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, X, UserCheck, UserX } from 'lucide-react'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    matricule: '', firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', birthDate: '', hireDate: '', contractType: 'CDI',
    department: '', position: '', baseSalary: '', cnssNumber: ''
  })

  const queryClient = useQueryClient()

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', search],
    queryFn: async () => {
      const response = await api.get(`/employees?search=${search}`)
      return response.data
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employé créé avec succès')
      setShowModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employé mis à jour')
      setShowModal(false)
      setEditingEmployee(null)
      resetForm()
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      api.put(`/employees/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Statut mis à jour')
    }
  })

  const resetForm = () => setFormData({
    matricule: '', firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', birthDate: '', hireDate: '', contractType: 'CDI',
    department: '', position: '', baseSalary: '', cnssNumber: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      baseSalary: parseFloat(formData.baseSalary),
      birthDate: formData.birthDate || undefined,
      hireDate: new Date(formData.hireDate).toISOString()
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      matricule: emp.matricule, firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email || '', phone: emp.phone || '', address: emp.address || '',
      city: emp.city || '', birthDate: emp.birthDate ? emp.birthDate.split('T')[0] : '',
      hireDate: emp.hireDate.split('T')[0], contractType: emp.contractType,
      department: emp.department || '', position: emp.position || '',
      baseSalary: emp.baseSalary.toString(), cnssNumber: emp.cnssNumber || ''
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employés</h1>
          <p className="text-gray-600">Gérer vos employés</p>
        </div>
        <button onClick={() => { setEditingEmployee(null); resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel employé
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Matricule</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Département</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Poste</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Salaire base</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8">Chargement...</td></tr>
              ) : employees?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucun employé trouvé</td></tr>
              ) : (
                employees?.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{emp.matricule}</td>
                    <td className="py-3 px-4">{emp.firstName} {emp.lastName}</td>
                    <td className="py-3 px-4 text-sm">{emp.department || '-'}</td>
                    <td className="py-3 px-4 text-sm">{emp.position || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">{Number(emp.baseSalary).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {emp.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(emp)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleStatusMutation.mutate({ id: emp.id, isActive: !emp.isActive })} 
                          className={`p-1 rounded ${emp.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {emp.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editingEmployee ? 'Modifier' : 'Nouvel employé'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                  <input value={formData.matricule} onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))} className="input-field" required disabled={!!editingEmployee} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">CNSS</label>
                  <input value={formData.cnssNumber} onChange={(e) => setFormData(prev => ({ ...prev, cnssNumber: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date naissance</label>
                  <input type="date" value={formData.birthDate} onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date embauche</label>
                  <input type="date" value={formData.hireDate} onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type contrat</label>
                  <select value={formData.contractType} onChange={(e) => setFormData(prev => ({ ...prev, contractType: e.target.value }))} className="input-field">
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="CDD_SAISONNIER">CDD Saisonnier</option>
                    <option value="STAGE">Stage</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base</label>
                  <input type="number" step="0.001" value={formData.baseSalary} onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                  <input value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
                  <input value={formData.position} onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">{editingEmployee ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
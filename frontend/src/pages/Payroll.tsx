import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Payroll, Employee } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, X, Check, DollarSign, Calculator } from 'lucide-react'

export default function PayrollPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [bonuses, setBonuses] = useState('0')
  const [overtime, setOvertime] = useState('0')
  const [advances, setAdvances] = useState('0')
  const [otherDeductions, setOtherDeductions] = useState('0')
  const [workAccidentRate, setWorkAccidentRate] = useState('0.5')
  const [isIndustrial, setIsIndustrial] = useState(false)

  const queryClient = useQueryClient()

  const { data: payrolls, isLoading } = useQuery<Payroll[]>({
    queryKey: ['payrolls', search],
    queryFn: async () => {
      const response = await api.get(`/payrolls?search=${search}`)
      return response.data
    }
  })

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const response = await api.get('/employees?isActive=true')
      return response.data
    }
  })

  const calculateMutation = useMutation({
    mutationFn: (data: any) => api.post('/payrolls/calculate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      toast.success('Fiche de paie calculée avec succès')
      setShowModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors du calcul')
    }
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payrolls/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      toast.success('Fiche de paie confirmée')
    }
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payrolls/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] })
      toast.success('Paiement effectué')
    }
  })

  const resetForm = () => {
    setSelectedEmployee('')
    setPeriod(new Date().toISOString().slice(0, 7))
    setBonuses('0')
    setOvertime('0')
    setAdvances('0')
    setOtherDeductions('0')
    setWorkAccidentRate('0.5')
    setIsIndustrial(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) {
      toast.error('Veuillez sélectionner un employé')
      return
    }

    calculateMutation.mutate({
      employeeId: selectedEmployee,
      period,
      bonuses: parseFloat(bonuses) || 0,
      overtime: parseFloat(overtime) || 0,
      advances: parseFloat(advances) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      workAccidentRate: parseFloat(workAccidentRate) || 0.5,
      isIndustrial
    })
  }

  const selectedEmp = employees?.find(e => e.id === selectedEmployee)
  const estimatedGross = selectedEmp ? selectedEmp.baseSalary + (parseFloat(bonuses) || 0) + (parseFloat(overtime) || 0) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paie</h1>
          <p className="text-gray-600">Gérer les fiches de paie (CNSS, IRPP, CSS)</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle fiche de paie
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Rechercher par période ou employé..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Période</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employé</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Salaire brut</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CNSS</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">IRPP</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Net</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8">Chargement...</td></tr>
              ) : payrolls?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Aucune fiche de paie trouvée</td></tr>
              ) : (
                payrolls?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.period}</td>
                    <td className="py-3 px-4">{p.employee.firstName} {p.employee.lastName}</td>
                    <td className="py-3 px-4 text-right">{Number(p.grossSalary).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-right text-sm">{Number(p.cnssEmployee).toFixed(3)}</td>
                    <td className="py-3 px-4 text-right text-sm">{Number(p.irpp).toFixed(3)}</td>
                    <td className="py-3 px-4 text-right font-medium text-green-700">{Number(p.netSalary).toFixed(3)} TND</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        p.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.status === 'DRAFT' && (
                          <button onClick={() => confirmMutation.mutate(p.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Confirmer">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'CONFIRMED' && (
                          <button onClick={() => payMutation.mutate(p.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Payer">
                            <DollarSign className="w-4 h-4" />
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculer la paie
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
                  <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="input-field" required>
                    <option value="">Sélectionner</option>
                    {employees?.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Période (AAAA-MM)</label>
                  <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field" required />
                </div>
              </div>

              {selectedEmp && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Salaire de base: <span className="font-medium">{Number(selectedEmp.baseSalary).toFixed(3)} TND</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Primes (TND)</label>
                  <input type="number" step="0.001" value={bonuses} onChange={(e) => setBonuses(e.target.value)} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Heures supp. (TND)</label>
                  <input type="number" step="0.001" value={overtime} onChange={(e) => setOvertime(e.target.value)} className="input-field" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Avances (TND)</label>
                  <input type="number" step="0.001" value={advances} onChange={(e) => setAdvances(e.target.value)} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Autres déductions (TND)</label>
                  <input type="number" step="0.001" value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} className="input-field" /></div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Paramètres employeur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Taux accident travail (%)</label>
                    <input type="number" step="0.1" min="0.4" max="4" value={workAccidentRate} onChange={(e) => setWorkAccidentRate(e.target.value)} className="input-field" /></div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="industrial" checked={isIndustrial} onChange={(e) => setIsIndustrial(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                    <label htmlFor="industrial" className="text-sm text-gray-700">Entreprise industrielle (TFP 1%)</label>
                  </div>
                </div>
              </div>

              {selectedEmp && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Estimation</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Salaire brut estimé:</div>
                    <div className="text-right font-medium">{estimatedGross.toFixed(3)} TND</div>
                    <div className="text-gray-600">CNSS employé (9.68%):</div>
                    <div className="text-right">{(estimatedGross * 0.0968).toFixed(3)} TND</div>
                    <div className="text-gray-600">Assurance chômage (0.5%):</div>
                    <div className="text-right">{(estimatedGross * 0.005).toFixed(3)} TND</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">Calculer la paie</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
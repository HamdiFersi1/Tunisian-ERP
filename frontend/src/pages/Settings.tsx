import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Company } from '../types'
import toast from 'react-hot-toast'
import { Building2, Save } from 'lucide-react'

export default function Settings() {
  const [formData, setFormData] = useState<Partial<Company>>({})

  const queryClient = useQueryClient()

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['company'],
    queryFn: async () => {
      const response = await api.get('/companies')
      return response.data
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      toast.success('Paramètres mis à jour')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Configuration de l'entreprise</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-lg font-semibold">Informations entreprise</h2>
            <p className="text-sm text-gray-600">Modifier les informations de votre entreprise</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
              <input 
                defaultValue={company?.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matricule Fiscal</label>
              <input 
                defaultValue={company?.matriculeFiscal} 
                className="input-field bg-gray-100" 
                disabled 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input 
              defaultValue={company?.address} 
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input-field" 
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input 
                defaultValue={company?.city} 
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input 
                defaultValue={company?.postalCode} 
                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input 
                defaultValue={company?.phone} 
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email"
                defaultValue={company?.email} 
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
              <input 
                defaultValue={company?.website || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="input-field" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
              <input 
                defaultValue={company?.currency} 
                className="input-field bg-gray-100" 
                disabled 
              />
              <p className="text-xs text-gray-500 mt-1">Devise par défaut (TND)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début exercice fiscal (mois)</label>
              <input 
                type="number"
                min="1"
                max="12"
                defaultValue={company?.fiscalYearStart} 
                onChange={(e) => setFormData(prev => ({ ...prev, fiscalYearStart: parseInt(e.target.value) }))}
                className="input-field" 
              />
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Informations légales - Tunisie</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">TVA</h3>
            <ul className="space-y-1 text-gray-600">
              <li>Standard: 19%</li>
              <li>Réduit: 13% (réassurance, transport)</li>
              <li>Tourisme: 7% (médical, tourisme, presse)</li>
              <li>Export: 0%</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">CNSS (2025)</h3>
            <ul className="space-y-1 text-gray-600">
              <li>Employé: 9.68%</li>
              <li>Employeur: 17.07%</li>
              <li>Chômage: 0.5% (chacun)</li>
              <li>Accident travail: 0.4% - 4%</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Employeur</h3>
            <ul className="space-y-1 text-gray-600">
              <li>TFP: 1% (industriel) / 2% (autres)</li>
              <li>FOPROLOS: 1%</li>
              <li>IRPP: Barème progressif</li>
              <li>CSS: 0.5% (si revenu &gt; 5000 TND/an)</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">SMIG 2025</h3>
            <ul className="space-y-1 text-gray-600">
              <li>48h/semaine: 459.264 TND/mois</li>
              <li>40h/semaine: 390.692 TND/mois</li>
              <li>Heure 48h: 2.208 TND</li>
              <li>Heure 40h: 2.254 TND</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
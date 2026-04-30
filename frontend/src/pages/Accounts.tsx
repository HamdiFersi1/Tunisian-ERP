import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Account } from '../types'
import toast from 'react-hot-toast'
import { Plus, Search, BookOpen, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react'

export default function Accounts() {
  const [search, setSearch] = useState('')
  const [expandedClasses, setExpandedClasses] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])

  const queryClient = useQueryClient()

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts', search],
    queryFn: async () => {
      const response = await api.get(`/accounts?search=${search}`)
      return response.data
    }
  })

  const initMutation = useMutation({
    mutationFn: () => api.post('/accounts/init-pct'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Plan Comptable Tunisien initialisé')
    }
  })

  const toggleClass = (cls: number) => {
    setExpandedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    )
  }

  const classes = [
    { num: 1, name: 'Capitaux propres et passifs non courants', type: 'EQUITY' },
    { num: 2, name: 'Actifs non courants', type: 'ASSET' },
    { num: 3, name: 'Stocks', type: 'ASSET' },
    { num: 4, name: 'Comptes de tiers', type: 'LIABILITY' },
    { num: 5, name: 'Comptes financiers', type: 'ASSET' },
    { num: 6, name: 'Charges', type: 'EXPENSE' },
    { num: 7, name: 'Produits', type: 'REVENUE' }
  ]

  const getAccountsByClass = (classNum: number) => {
    return accounts?.filter(a => a.class === classNum && !a.parentId) || []
  }

  const getChildAccounts = (parentId: string) => {
    return accounts?.filter(a => a.parentId === parentId) || []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Comptable</h1>
          <p className="text-gray-600">Plan Comptable Tunisien (PCT)</p>
        </div>
        <button onClick={() => initMutation.mutate()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Initialiser PCT
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Rechercher un compte..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="space-y-4">
        {classes.map((cls) => (
          <div key={cls.num} className="card">
            <button 
              onClick={() => toggleClass(cls.num)}
              className="flex items-center gap-2 w-full text-left"
            >
              {expandedClasses.includes(cls.num) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <span className="text-lg font-semibold">Classe {cls.num}</span>
              <span className="text-gray-500">- {cls.name}</span>
              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                cls.type === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                cls.type === 'LIABILITY' ? 'bg-red-100 text-red-800' :
                cls.type === 'EQUITY' ? 'bg-purple-100 text-purple-800' :
                cls.type === 'REVENUE' ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {cls.type}
              </span>
            </button>

            {expandedClasses.includes(cls.num) && (
              <div className="mt-4 space-y-2">
                {getAccountsByClass(cls.num).map((account) => (
                  <div key={account.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="font-mono font-medium text-gray-900">{account.code}</span>
                        <span className="text-gray-700">{account.nameFr}</span>
                        {account.nameAr && <span className="text-gray-500 text-sm" dir="rtl">{account.nameAr}</span>}
                      </div>
                    </div>
                    {getChildAccounts(account.id).length > 0 && (
                      <div className="p-2 space-y-1">
                        {getChildAccounts(account.id).map(child => (
                          <div key={child.id} className="flex items-center gap-3 p-2 pl-8 hover:bg-gray-50 rounded">
                            <span className="font-mono text-sm text-gray-600">{child.code}</span>
                            <span className="text-sm text-gray-700">{child.nameFr}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {getAccountsByClass(cls.num).length === 0 && (
                  <p className="text-gray-500 text-center py-4">Aucun compte dans cette classe</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
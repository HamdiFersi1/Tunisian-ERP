import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { JournalEntry } from '../types'
import { Search, BookOpen, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function Journal() {
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal', search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const response = await api.get(`/journal?${params}`)
      return response.data
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal Général</h1>
        <p className="text-gray-600">Consultez les écritures comptables</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" placeholder="Date début" />
        </div>
        <div>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" placeholder="Date fin" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Référence</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Compte</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Débit</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Crédit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Chargement...</td></tr>
              ) : entries?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucune écriture trouvée</td></tr>
              ) : (
                entries?.map((entry) => (
                  <>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={6} className="py-2 px-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          {new Date(entry.date).toLocaleDateString('fr-FR')} - {entry.reference}
                          <span className="text-gray-500 font-normal">{entry.description}</span>
                        </div>
                      </td>
                    </tr>
                    {entry.entries.map((line, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4"></td>
                        <td className="py-2 px-4"></td>
                        <td className="py-2 px-4 text-sm text-gray-600">{line.description || ''}</td>
                        <td className="py-2 px-4">
                          <span className="font-mono text-sm text-gray-700">{line.account.code}</span>
                          <span className="text-sm text-gray-600 ml-2">{line.account.nameFr}</span>
                        </td>
                        <td className="py-2 px-4 text-right">
                          {Number(line.debit) > 0 && (
                            <span className="text-green-700 font-medium flex items-center justify-end gap-1">
                              <ArrowDownLeft className="w-3 h-3" />
                              {Number(line.debit).toFixed(3)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {Number(line.credit) > 0 && (
                            <span className="text-red-700 font-medium flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-3 h-3" />
                              {Number(line.credit).toFixed(3)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import type { PromoCode } from '../../lib/types';

interface PromoCodeFormData {
  code: string;
  direction: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  start_date: string;
  end_date: string;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  user_id?: string | null;
}

const DIRECTIONS = [
  { value: 'FRANCE_TO_GABON', label: 'France → Gabon' },
  { value: 'GABON_TO_FRANCE', label: 'Gabon → France' },
  { value: 'GABON_TO_CHINA', label: 'Gabon → Chine' },
  { value: 'USA_TO_GABON', label: 'États-Unis → Gabon' },
  { value: 'GABON_TO_USA', label: 'Gabon → États-Unis' },
  { value: 'CANADA_TO_GABON', label: 'Canada → Gabon' },
  { value: 'GABON_TO_CANADA', label: 'Gabon → Canada' },
  { value: 'BELGIUM_TO_GABON', label: 'Belgique → Gabon' },
  { value: 'GABON_TO_BELGIUM', label: 'Gabon → Belgique' },
  { value: 'GERMANY_TO_GABON', label: 'Allemagne → Gabon' },
  { value: 'GABON_TO_GERMANY', label: 'Gabon → Allemagne' },
  { value: 'SWITZERLAND_TO_GABON', label: 'Suisse → Gabon' },
  { value: 'GABON_TO_SWITZERLAND', label: 'Gabon → Suisse' },
  { value: 'UK_TO_GABON', label: 'Royaume-Uni → Gabon' },
  { value: 'GABON_TO_UK', label: 'Gabon → Royaume-Uni' },
  { value: 'SPAIN_TO_GABON', label: 'Espagne → Gabon' },
  { value: 'GABON_TO_SPAIN', label: 'Gabon → Espagne' },
  { value: 'ITALY_TO_GABON', label: 'Italie → Gabon' },
  { value: 'GABON_TO_ITALY', label: 'Gabon → Italie' },
  { value: 'NETHERLANDS_TO_GABON', label: 'Pays-Bas → Gabon' },
  { value: 'GABON_TO_NETHERLANDS', label: 'Gabon → Pays-Bas' },
  { value: 'FRANCE_TO_MOROCCO', label: 'France → Maroc' },
  { value: 'MOROCCO_TO_FRANCE', label: 'Maroc → France' },
  { value: 'FRANCE_TO_SENEGAL', label: 'France → Sénégal' },
  { value: 'SENEGAL_TO_FRANCE', label: 'Sénégal → France' },
  { value: 'GABON_TO_MOROCCO', label: 'Gabon → Maroc' },
  { value: 'MOROCCO_TO_GABON', label: 'Maroc → Gabon' },
  { value: 'MOROCCO_TO_SENEGAL', label: 'Maroc → Sénégal' },
  { value: 'SENEGAL_TO_MOROCCO', label: 'Sénégal → Maroc' }
];

const PromoCodesManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    direction: 'FRANCE_TO_GABON',
    discount_type: 'PERCENTAGE',
    discount_value: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_uses: null,
    current_uses: 0,
    active: true,
    user_id: null
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError('Erreur lors du chargement des codes promo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Validation
      if (!formData.code.trim()) {
        setError('Le code promo est requis');
        return;
      }
      
      if (formData.discount_value <= 0) {
        setError('La valeur de la réduction doit être supérieure à 0');
        return;
      }
      
      if (formData.discount_type === 'PERCENTAGE' && formData.discount_value > 100) {
        setError('Le pourcentage de réduction ne peut pas dépasser 100%');
        return;
      }
      
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        setError('La date de fin doit être postérieure à la date de début');
        return;
      }
      
      // Préparer les données
      const promoData = {
        ...formData,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        // Convertir les valeurs vides en null
        max_uses: formData.max_uses || null,
        user_id: formData.user_id || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoData]);

        if (error) throw error;
      }

      await fetchPromoCodes();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: '',
        direction: 'FRANCE_TO_GABON',
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_uses: null,
        current_uses: 0,
        active: true,
        user_id: null
      });
    } catch (err: any) {
      console.error('Error saving promo code:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement du code promo');
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setFormData({
      code: promoCode.code,
      direction: promoCode.direction,
      discount_type: promoCode.discount_type as 'PERCENTAGE' | 'FIXED',
      discount_value: promoCode.discount_value,
      start_date: new Date(promoCode.start_date).toISOString().split('T')[0],
      end_date: new Date(promoCode.end_date).toISOString().split('T')[0],
      max_uses: promoCode.max_uses,
      current_uses: promoCode.current_uses || 0,
      active: promoCode.active,
      user_id: promoCode.user_id
    });
    setEditingId(promoCode.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPromoCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError('Erreur lors de la suppression du code promo');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      await fetchPromoCodes();
    } catch (err) {
      console.error('Error toggling promo code:', err);
      setError('Erreur lors de la modification du code promo');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Codes Promo</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau code promo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
              >
                {DIRECTIONS.map((direction) => (
                  <option key={direction.value} value={direction.value}>
                    {direction.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type de réduction</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
              >
                <option value="PERCENTAGE">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Valeur de la réduction</label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
                min="0"
                step={formData.discount_type === 'PERCENTAGE' ? "0.01" : "1"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date de début</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date de fin</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre maximum d'utilisations</label>
              <input
                type="number"
                value={formData.max_uses || ''}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                min="1"
                placeholder="Illimité"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-gray-300 text-yellow-600 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-500 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Actif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direction
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Réduction
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Période
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisations
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {promoCodes.map((promoCode) => (
              <tr key={promoCode.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {promoCode.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {DIRECTIONS.find(d => d.value === promoCode.direction)?.label || promoCode.direction}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {promoCode.discount_type === 'PERCENTAGE' 
                    ? `${promoCode.discount_value}%`
                    : `${promoCode.discount_value.toLocaleString('fr-FR')} EUR`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(promoCode.start_date).toLocaleDateString('fr-FR')} - {new Date(promoCode.end_date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {promoCode.current_uses}/{promoCode.max_uses || '∞'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    promoCode.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {promoCode.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleToggleActive(promoCode.id, promoCode.active)}
                      className={`p-1 rounded-full ${
                        promoCode.active 
                          ? 'text-green-600 hover:text-green-900' 
                          : 'text-red-600 hover:text-red-900'
                      }`}
                      title={promoCode.active ? "Désactiver" : "Activer"}
                    >
                      {promoCode.active ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(promoCode)}
                      className="p-1 text-yellow-600 hover:text-yellow-900 rounded-full"
                      title="Modifier"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(promoCode.id)}
                      className="p-1 text-red-600 hover:text-red-900 rounded-full"
                      title="Supprimer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PromoCodesManager;
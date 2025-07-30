import React, { useState, useEffect } from 'react';
import { getWeeklyTransferLimit, updateWeeklyTransferLimit } from '../../lib/supabase';
import { Edit, Check, X, DollarSign } from 'lucide-react';

const WeeklyLimitManager = () => {
  const [currentLimit, setCurrentLimit] = useState<number>(300);
  const [editingLimit, setEditingLimit] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentLimit();
  }, []);

  const fetchCurrentLimit = async () => {
    try {
      setLoading(true);
      setError(null);
      const limit = await getWeeklyTransferLimit();
      setCurrentLimit(limit);
      setEditingLimit(limit.toString());
    } catch (err) {
      console.error('Error fetching weekly limit:', err);
      setError('Erreur lors du chargement du plafond actuel');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditingLimit(currentLimit.toString());
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingLimit(currentLimit.toString());
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    const newLimit = parseFloat(editingLimit);
    
    if (isNaN(newLimit) || newLimit <= 0) {
      setError('Le plafond doit être un nombre positif');
      return;
    }

    if (newLimit > 10000) {
      setError('Le plafond ne peut pas dépasser 10 000€');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      
      const result = await updateWeeklyTransferLimit(newLimit);
      
      if (result.success) {
        setCurrentLimit(newLimit);
        setIsEditing(false);
        setSuccess('Plafond mis à jour avec succès');
        
        // Effacer le message de succès après 3 secondes
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Error updating weekly limit:', err);
      setError('Erreur lors de la mise à jour du plafond');
    } finally {
      setUpdating(false);
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
      <h2 className="text-2xl font-bold text-gray-900">Plafond de transfert hebdomadaire</h2>

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

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Plafond actuel pour les envois depuis le Gabon
            </h3>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
              Plafond hebdomadaire :
            </label>
            {isEditing ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="number"
                  value={editingLimit}
                  onChange={(e) => setEditingLimit(e.target.value)}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
                  step="0.01"
                  min="0"
                  max="10000"
                  disabled={updating}
                />
                <span className="text-sm text-gray-500">€</span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={updating}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {updating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-lg font-semibold text-gray-900">
                {currentLimit.toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} €
              </span>
            )}
          </div>

          <div className="bg-blue-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Comment fonctionne le plafond pour les envois depuis le Gabon ?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Le plafond s'applique du lundi au dimanche</li>
              <li>• Il s'applique uniquement aux transferts depuis le Gabon (GABON_TO_*)</li>
              <li>• L'identification de l'expéditeur se fait par nom, prénom, email et téléphone</li>
              <li>• Tous les montants sont convertis en EUR pour le calcul</li>
              <li>• Les transferts en attente et terminés sont comptabilisés</li>
              <li>• Les transferts vers le Gabon ne sont pas soumis à ce plafond</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyLimitManager;
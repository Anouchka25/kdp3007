import React, { useState, useEffect } from 'react';
import { Star, Gift, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserLoyaltyPoints, calculateLoyaltyDiscount, isEligibleForLoyaltyDiscount } from '../lib/utils';
import { LOYALTY_POINTS } from '../lib/constants';

interface LoyaltyPointsDisplayProps {
  userId?: string;
  direction?: string;
  transferAmount?: number;
  senderCurrency?: string;
  onPointsToUseChange?: (points: number) => void;
  className?: string;
}

const LoyaltyPointsDisplay: React.FC<LoyaltyPointsDisplayProps> = ({
  userId,
  direction,
  transferAmount,
  senderCurrency,
  onPointsToUseChange,
  className = ''
}) => {
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [showPointsInput, setShowPointsInput] = useState<boolean>(false);
  const [discountPreview, setDiscountPreview] = useState<{
    discountAmount: number;
    discountPercentage: number;
    pointsUsed: number;
    remainingPoints: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch user's loyalty points
  useEffect(() => {
    if (userId) {
      fetchLoyaltyPoints();
    }
  }, [userId]);

  // Calculate discount preview when points to use changes
  useEffect(() => {
    if (pointsToUse > 0 && userId && transferAmount && senderCurrency && direction) {
      calculateDiscountPreview();
    } else {
      setDiscountPreview(null);
    }
  }, [pointsToUse, userId, transferAmount, senderCurrency, direction]);

  // Notify parent component when points to use changes
  useEffect(() => {
    if (onPointsToUseChange) {
      onPointsToUseChange(pointsToUse);
    }
  }, [pointsToUse, onPointsToUseChange]);

  const fetchLoyaltyPoints = async () => {
    if (!userId) return;
    
    try {
      const points = await getUserLoyaltyPoints(userId);
      setLoyaltyPoints(points);
    } catch (error) {
      console.error('Error fetching loyalty points:', error);
    }
  };

  const calculateDiscountPreview = async () => {
    if (!userId || !transferAmount || !senderCurrency || !direction) return;
    
    setLoading(true);
    try {
      const result = await calculateLoyaltyDiscount(
        userId,
        pointsToUse,
        transferAmount,
        senderCurrency
      );
      setDiscountPreview(result);
    } catch (error) {
      console.error('Error calculating discount preview:', error);
      setDiscountPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePointsInputChange = (value: string) => {
    const points = parseInt(value) || 0;
    const maxUsablePoints = Math.min(loyaltyPoints, LOYALTY_POINTS.MAX_POINTS_PER_TRANSACTION);
    const validPoints = Math.max(0, Math.min(points, maxUsablePoints));
    setPointsToUse(validPoints);
  };

  const handleUseMaxPoints = () => {
    const maxUsablePoints = Math.min(loyaltyPoints, LOYALTY_POINTS.MAX_POINTS_PER_TRANSACTION);
    setPointsToUse(maxUsablePoints);
  };

  const handleClearPoints = () => {
    setPointsToUse(0);
    setShowPointsInput(false);
  };

  // Check if loyalty discount is available for this transfer
  const isEligible = direction ? isEligibleForLoyaltyDiscount(direction) : false;
  const hasEnoughPoints = loyaltyPoints >= LOYALTY_POINTS.MIN_POINTS_TO_USE;

  if (!userId || !isEligible || !hasEnoughPoints) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Star className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">Points de fidélité</h3>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Gift className="h-4 w-4 mr-1" />
          <span className="font-medium">{loyaltyPoints.toLocaleString('fr-FR')} points</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Points balance and info */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Disponible pour réduction</span>
          <span>{Math.min(loyaltyPoints, LOYALTY_POINTS.MAX_POINTS_PER_TRANSACTION).toLocaleString('fr-FR')} points max</span>
        </div>

        {/* Apply points section */}
        {!showPointsInput ? (
          <button
            onClick={() => setShowPointsInput(true)}
            className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium"
          >
            Utiliser mes points pour une réduction
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={pointsToUse || ''}
                  onChange={(e) => handlePointsInputChange(e.target.value)}
                  placeholder="Nombre de points"
                  min="0"
                  max={Math.min(loyaltyPoints, LOYALTY_POINTS.MAX_POINTS_PER_TRANSACTION)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                onClick={handleUseMaxPoints}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs font-medium whitespace-nowrap"
              >
                Max
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleClearPoints}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                Annuler
              </button>
              {pointsToUse > 0 && (
                <button
                  onClick={() => setShowPointsInput(false)}
                  className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium"
                >
                  Appliquer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Discount preview */}
        {discountPreview && pointsToUse > 0 && (
          <div className="bg-white border border-yellow-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Réduction obtenue :</span>
              <span className="font-medium text-green-600">
                -{discountPreview.discountAmount.toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} {senderCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Points utilisés :</span>
              <span className="font-medium text-yellow-600">
                {discountPreview.pointsUsed.toLocaleString('fr-FR')} points
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Points restants :</span>
              <span className="text-gray-600">
                {discountPreview.remainingPoints.toLocaleString('fr-FR')} points
              </span>
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="flex items-start space-x-2 text-xs text-gray-500">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <p>100 points = 1% de réduction sur les frais KundaPay</p>
            <p>Réduction maximale : 50% (5000 points)</p>
            <p>Gagnez 1 point par EUR envoyé vers le Gabon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPointsDisplay;
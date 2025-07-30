import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const TransferAlertPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 w-[90%] md:w-[500px] shadow-lg relative">
        {/* Bouton de fermeture */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 text-gray-700 hover:bg-yellow-100 p-1 rounded-full"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>

        {/* Titre */}
        <h2 className="text-yellow-800 font-bold text-xl text-center mb-2">
          🛠️ Transferts vers le Gabon momentanément indisponibles
        </h2>

        {/* Message */}
        <p className="text-gray-800 text-center leading-relaxed">
          En raison d’une petite panne technique, les <strong>transferts vers le Gabon</strong> sont temporairement suspendus. <br />
          <strong>Les transferts depuis le Gabon vers la France fonctionnent normalement.</strong>
        </p>

        <p className="text-center text-sm text-gray-600 mt-4">
          L’équipe technique est déjà à l’œuvre – tout sera rétabli dans la journée. <br />
          Merci pour votre compréhension 💛
        </p>

        {/* Bouton */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsVisible(false)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition"
          >
            Compris 👍
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TransferAlertPopup;

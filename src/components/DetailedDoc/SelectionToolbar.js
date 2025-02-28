import React from 'react';

const STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  PROFESSIONAL: 'professional',
  CONCISE: 'concise'
};

const SelectionToolbar = ({ onRewrite, position, loading }) => {
  if (!position) return null;

  return (
    <div 
      className="fixed bg-white shadow-xl rounded-lg p-4 z-[9999] border border-gray-200 left-4"
      style={{ 
        top: `${position.top}px`,
      }}
    >
      <div className="space-y-3">
        <span className="block text-sm font-medium text-gray-700">Rewrite Selection As:</span>
        <div className="space-y-2">
          {Object.entries(STYLES).map(([key, value]) => (
            <button
              key={value}
              onClick={() => onRewrite(value)}
              disabled={loading}
              className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white text-left"
            >
              <span className="font-medium text-gray-800">{key.charAt(0) + key.slice(1).toLowerCase()}</span>
              <span className="text-xs text-gray-500">
                {key === 'FORMAL' && 'Professional and polished'}
                {key === 'CASUAL' && 'Friendly and relaxed'}
                {key === 'PROFESSIONAL' && 'Clear and business-appropriate'}
                {key === 'CONCISE' && 'Brief and to the point'}
              </span>
            </button>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent" />
              <span className="text-sm">Rewriting...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionToolbar;

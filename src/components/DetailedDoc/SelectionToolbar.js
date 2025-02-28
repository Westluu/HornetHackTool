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
      className="fixed bg-blue-600 shadow-xl rounded-lg p-3 z-[9999] border-2 border-blue-400"
      style={{ 
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -120%)'
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">AI Rewrite:</span>
        <select 
          className="border-2 border-blue-400 rounded-md px-3 py-1.5 text-sm bg-white hover:border-blue-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer"
          onChange={(e) => onRewrite(e.target.value)}
          disabled={loading}
        >
          <option value="">Choose style...</option>
          {Object.entries(STYLES).map(([key, value]) => (
            <option key={value} value={value}>
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-white">Rewriting...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectionToolbar;

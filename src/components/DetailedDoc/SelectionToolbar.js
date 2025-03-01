import React, { useState } from 'react';

const MODES = {
  TEXT: 'text',
  EQUATION: 'equation'
};




const STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  PROFESSIONAL: 'professional',
  CONCISE: 'concise'
};

const SelectionToolbar = ({ onRewrite, position, loading, error, onGraph, onGenerateImage }) => {
  const [mode, setMode] = useState(MODES.TEXT);

  if (!position) return null;

  return (
    <div 
      className="fixed bg-white shadow-xl rounded-lg p-4 z-[9999] border border-gray-200 left-4"
      style={{ 
        top: `${position.top}px`,
      }}
    >
      {/* Mode Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode(MODES.TEXT)}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${mode === MODES.TEXT ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Text
        </button>
        <button
          onClick={() => setMode(MODES.EQUATION)}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${mode === MODES.EQUATION ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Equation
        </button>

      </div>

      {/* Content based on mode */}
      {mode === MODES.TEXT && (
        /* Text Mode UI */
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
            {error && (
              <div className="flex items-center gap-2 text-red-600 mt-2 p-2 bg-red-50 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === MODES.EQUATION && (
        /* Equation Mode UI */
        <div className="space-y-3">
          <span className="block text-sm font-medium text-gray-700">Convert Equation To:</span>
          <div className="space-y-2">
            <button
              onClick={onGraph}
              className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
            >
              <span className="font-medium text-gray-800">Graph</span>
              <span className="text-xs text-gray-500">Visualize as an interactive graph</span>
            </button>
            <button
              onClick={onGenerateImage}
              className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
            >
              <span className="font-medium text-gray-800">Image</span>
              <span className="text-xs text-gray-500">Generate an image from equation</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SelectionToolbar;

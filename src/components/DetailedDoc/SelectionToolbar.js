import React, { useState, forwardRef } from 'react';

const MODES = {
  TEXT: 'text',
  EQUATION: 'equation',
  SCIENCE: 'science'
};

const SCIENCE_FIELDS = {
  CHEMISTRY: 'chemistry',
  PHYSICS: 'physics'
};


const STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  PROFESSIONAL: 'professional',
  CONCISE: 'concise'
};

const SelectionToolbar = forwardRef(({ onRewrite, position, loading, error, onGraph, onScienceDiagram, setDiagramRequestedFromToolbar }, ref) => {
  const [mode, setMode] = useState(MODES.TEXT);
  const [scienceField, setScienceField] = useState(SCIENCE_FIELDS.CHEMISTRY);
  
  // Debug the current state
  console.log('Current mode:', mode, 'Current science field:', scienceField);

  // Prevent toolbar from disappearing when clicked
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toolbar mousedown prevented');
  };

  if (!position) return null;

  return (
    <div 
      ref={ref}
      className="fixed bg-white shadow-xl rounded-lg p-4 z-[9999] border border-gray-200 left-4"
      style={{ 
        top: `${position.top}px`,
      }}
      onMouseDown={handleMouseDown}
      data-toolbar="true"
    >
      {/* Mode Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMode(MODES.TEXT);
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${mode === MODES.TEXT ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Text
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMode(MODES.EQUATION);
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${mode === MODES.EQUATION ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Equation
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMode(MODES.SCIENCE);
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${mode === MODES.SCIENCE ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Science
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

          </div>
        </div>
      )}

      {mode === MODES.SCIENCE && (
        /* Science Mode UI */
        <div className="space-y-3">
          <span className="block text-sm font-medium text-gray-700">Select Field:</span>
          <div className="flex gap-2 mb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Chemistry field selected');
                setScienceField(SCIENCE_FIELDS.CHEMISTRY);
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${scienceField === SCIENCE_FIELDS.CHEMISTRY ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Chemistry
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Physics field selected');
                setScienceField(SCIENCE_FIELDS.PHYSICS);
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${scienceField === SCIENCE_FIELDS.PHYSICS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Physics
            </button>
          </div>

          {scienceField === SCIENCE_FIELDS.CHEMISTRY && (
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('2D Structure button clicked');
                  
                  // Clear any flags that might prevent diagram generation
                  window.lastClickFromBelowDiagramArea = false;
                  window.typingBelowDiagram = false;
                  
                  // Set the flag and immediately call the diagram generation function
                  if (setDiagramRequestedFromToolbar) {
                    setDiagramRequestedFromToolbar(true);
                  }
                  
                  // Add data attributes to the event to mark it as coming from the toolbar
                  e.diagramRequest = true;
                  e.diagramType = '2d';
                  e.fromToolbarButton = true; // Add this flag to explicitly mark it as a toolbar button click
                  
                  // Call the diagram generation function immediately and pass the event
                  onScienceDiagram('chemistry', '2d', e);
                }}
                className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
                data-toolbar-button="true"
                data-diagram-type="2d"
              >
                <span className="font-medium text-gray-800">2D Structure</span>
                <span className="text-xs text-gray-500">Generate a 2D molecular structure</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('3D Structure button clicked');
                  
                  // Clear any flags that might prevent diagram generation
                  window.lastClickFromBelowDiagramArea = false;
                  window.typingBelowDiagram = false;
                  
                  // Set the flag and immediately call the diagram generation function
                  if (setDiagramRequestedFromToolbar) {
                    setDiagramRequestedFromToolbar(true);
                  }
                  
                  // Add data attributes to the event to mark it as coming from the toolbar
                  e.diagramRequest = true;
                  e.diagramType = '3d';
                  e.fromToolbarButton = true; // Add this flag to explicitly mark it as a toolbar button click
                  
                  // Call the diagram generation function immediately and pass the event
                  onScienceDiagram('chemistry', '3d', e);
                }}
                className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
                data-toolbar-button="true"
                data-diagram-type="3d"
              >
                <span className="font-medium text-gray-800">3D Structure</span>
                <span className="text-xs text-gray-500">Generate a 3D molecular structure</span>
              </button>
            </div>
          )}

          {scienceField === SCIENCE_FIELDS.PHYSICS && (
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Force diagram button clicked');
                  
                  // Clear any flags that might prevent diagram generation
                  window.lastClickFromBelowDiagramArea = false;
                  window.typingBelowDiagram = false;
                  
                  // Set the flag and immediately call the diagram generation function
                  if (setDiagramRequestedFromToolbar) {
                    setDiagramRequestedFromToolbar(true);
                  }
                  
                  // Add data attributes to the event to mark it as coming from the toolbar
                  e.diagramRequest = true;
                  e.diagramType = 'force';
                  e.fromToolbarButton = true; // Add this flag to explicitly mark it as a toolbar button click
                  
                  // Call the diagram generation function immediately and pass the event
                  onScienceDiagram('physics', 'force', e);
                }}
                className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
                data-toolbar-button="true"
                data-diagram-type="force"
              >
                <span className="font-medium text-gray-800">Force Diagram</span>
                <span className="text-xs text-gray-500">Create a force diagram</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Circuit diagram button clicked');
                  
                  // Clear any flags that might prevent diagram generation
                  window.lastClickFromBelowDiagramArea = false;
                  window.typingBelowDiagram = false;
                  
                  // Set the flag and immediately call the diagram generation function
                  if (setDiagramRequestedFromToolbar) {
                    setDiagramRequestedFromToolbar(true);
                  }
                  
                  // Add data attributes to the event to mark it as coming from the toolbar
                  e.diagramRequest = true;
                  e.diagramType = 'circuit';
                  e.fromToolbarButton = true; // Add this flag to explicitly mark it as a toolbar button click
                  
                  // Call the diagram generation function immediately and pass the event
                  onScienceDiagram('physics', 'circuit', e);
                }}
                className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
                data-toolbar-button="true"
                data-diagram-type="circuit"
              >
                <span className="font-medium text-gray-800">Circuit Diagram</span>
                <span className="text-xs text-gray-500">Create a circuit diagram</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Kinematics diagram button clicked');
                  
                  // Clear any flags that might prevent diagram generation
                  window.lastClickFromBelowDiagramArea = false;
                  window.typingBelowDiagram = false;
                  
                  // Set the flag and immediately call the diagram generation function
                  if (setDiagramRequestedFromToolbar) {
                    setDiagramRequestedFromToolbar(true);
                  }
                  
                  // Add data attributes to the event to mark it as coming from the toolbar
                  e.diagramRequest = true;
                  e.diagramType = 'kinematics';
                  e.fromToolbarButton = true; // Add this flag to explicitly mark it as a toolbar button click
                  
                  // Call the diagram generation function immediately and pass the event
                  onScienceDiagram('physics', 'kinematics', e);
                }}
                className="w-full flex flex-col items-start p-3 border-2 border-blue-100 rounded-lg hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-colors cursor-pointer bg-white text-left"
                data-toolbar-button="true"
                data-diagram-type="kinematics"
              >
                <span className="font-medium text-gray-800">Kinematics Diagram</span>
                <span className="text-xs text-gray-500">Create a kinematics diagram</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
});

export default SelectionToolbar;

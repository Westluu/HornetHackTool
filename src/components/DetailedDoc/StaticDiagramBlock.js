import React, { useState } from 'react';

const StaticDiagramBlock = ({ blockProps }) => {
  console.log('StaticDiagramBlock rendering with props:', blockProps);
  const [showDetails, setShowDetails] = useState(false);
  
  // Determine if this is a fallback diagram
  const isFallback = blockProps?.fallback === true;
  
  // Get the first 100 characters of the script for preview
  const scriptPreview = blockProps?.rawScript ? 
    blockProps.rawScript.substring(0, 100) + '...' : 'No script available';
  
  return (
    <div className='w-full my-4 relative'>
      <div className='w-full mx-auto bg-white rounded-lg shadow-lg p-4'>
        <div 
          className={`text-center mb-2 p-2 rounded ${isFallback ? 'bg-orange-100 border border-orange-300' : 'bg-green-100 border border-green-300'}`}
        >
          <strong>Physics Diagram:</strong> {blockProps?.diagramType || 'Unknown'} Type
          {isFallback && <span className="ml-2 bg-orange-200 px-2 py-1 rounded text-sm">FALLBACK</span>}
        </div>
        
        <div 
          className="mx-auto border-2 border-blue-500 rounded p-4"
          style={{ 
            width: '600px', 
            height: '400px', 
            background: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
            {blockProps?.diagramType?.toUpperCase() || 'UNKNOWN'} DIAGRAM
          </div>
          
          <div style={{ 
            width: '200px', 
            height: '200px', 
            background: isFallback ? '#ffe0e0' : '#e0f0ff', 
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px',
            border: isFallback ? '3px solid #ff9999' : '3px solid #99ccff'
          }}>
            <div style={{ fontSize: '16px', textAlign: 'center' }}>
              {isFallback ? 'Fallback' : 'AI-Generated'}<br/>Diagram
            </div>
          </div>
          
          <div style={{ fontSize: '14px', color: '#333', textAlign: 'center' }}>
            {isFallback ? 
              'AI-generated diagram unavailable - using fallback' : 
              'AI-generated diagram'}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded">
          <div className="flex justify-between items-center">
            <p className="font-bold">Diagram Information</p>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          <div className="mt-2">
            <p><strong>Type:</strong> {blockProps?.diagramType || 'Unknown'}</p>
            <p><strong>Mode:</strong> {isFallback ? 'Fallback (AI generation failed)' : 'AI-Generated'}</p>
            <p><strong>Script Length:</strong> {blockProps?.rawScript?.length || 0} characters</p>
            
            {showDetails && (
              <div className="mt-3 p-3 bg-gray-200 rounded overflow-auto max-h-40">
                <p className="font-bold mb-1">Script Preview:</p>
                <pre className="text-xs">{scriptPreview}</pre>
                
                <p className="font-bold mt-3 mb-1">Debugging Info:</p>
                <pre className="text-xs">
                  {JSON.stringify({
                    diagramType: blockProps?.diagramType,
                    fallback: blockProps?.fallback,
                    hasRawScript: !!blockProps?.rawScript,
                    scriptLength: blockProps?.rawScript?.length || 0
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        {blockProps?.onRemove && (
          <button
            onClick={blockProps.onRemove}
            className='absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full hover:bg-red-600 flex items-center justify-center'
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default StaticDiagramBlock;

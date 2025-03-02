import React, { useEffect, useRef, useState } from 'react';

const CanvasBlock = ({ blockProps }) => {
  console.log('CanvasBlock component rendering with props:', blockProps);
  const canvasRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1); // Default zoom level
  const [showControls, setShowControls] = useState(false);
  
  useEffect(() => {
    console.log('CanvasBlock: Rendering with props:', blockProps);
    
    if (!blockProps || !blockProps.rawScript || !blockProps.diagramType) {
      console.warn('CanvasBlock: Missing required props', { blockProps });
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('CanvasBlock: Canvas ref is null');
      return;
    }
    
    // Set canvas dimensions - larger size
    const containerWidth = canvas.parentElement.clientWidth || 1200;
    const aspectRatio = 16/9;
    const calculatedHeight = Math.min(600, containerWidth / aspectRatio);
    
    canvas.width = containerWidth;
    canvas.height = calculatedHeight;
    console.log('CanvasBlock: Canvas dimensions set to', canvas.width, 'x', canvas.height);
    
    // Make sure dimensions are properly applied
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.minHeight = '500px';
    canvas.style.maxWidth = '100%';
    
    // Draw a test pattern to verify canvas is working
    const testCtx = canvas.getContext('2d');
    testCtx.fillStyle = '#eeeeee';
    testCtx.fillRect(0, 0, canvas.width, canvas.height);
    testCtx.fillStyle = '#ff0000';
    testCtx.fillRect(10, 10, 50, 50);
    testCtx.fillStyle = '#0000ff';
    testCtx.fillRect(canvas.width - 60, 10, 50, 50);
    console.log('CanvasBlock: Drew test pattern on canvas');
    
    try {
      // Create a function to execute the drawing script
      const executeScript = (canvas) => {
        try {
          const diagramType = blockProps.diagramType;
          const rawScript = blockProps.rawScript;
          
          // Validate the script starts with a function declaration
          if (!rawScript.trim().startsWith('function')) {
            console.error('CanvasBlock: Script does not start with a function declaration');
            throw new Error('Invalid script format - must start with a function declaration');
          }
          
          // Create a function from the script string
          // Handle both regular diagrams and test diagrams
          const functionName = diagramType === 'test' ? 'drawTestDiagram' : `draw${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)}Diagram`;
          
          // Create a safe execution environment
          const scriptToExecute = `
            // Ensure we have a clean execution environment
            'use strict';
            
            // The actual drawing script
            ${rawScript}
            
            // Execute the drawing function
            if (typeof ${functionName} === 'function') {
              ${functionName}(canvas);
              return true;
            } else {
              console.error('Drawing function not found in script');
              return false;
            }
          `;
          
          // Execute the script - using Function constructor is necessary here for dynamic code execution
          console.log('CanvasBlock: Creating function with script');
          // eslint-disable-next-line no-new-func
          const drawingFunction = new Function('canvas', scriptToExecute);
          console.log('CanvasBlock: Function created successfully');
          
          console.log('CanvasBlock: Executing drawing function');
          const result = drawingFunction(canvas);
          console.log('CanvasBlock: Function execution completed with result:', result);
          return result;
        } catch (error) {
          console.error('Error executing drawing script:', error);
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
          
          // Draw error message on canvas
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = '16px Arial';
          ctx.fillStyle = '#d32f2f';
          ctx.textAlign = 'center';
          ctx.fillText(`Error: ${error.message}`, canvas.width / 2, canvas.height / 2 - 20);
          ctx.fillText('Please try again or use a different diagram type', canvas.width / 2, canvas.height / 2 + 20);
          
          return false;
        }
      };
      
      // Execute the drawing script
      console.log('CanvasBlock: Executing script for diagram type:', blockProps.diagramType);
      console.log('CanvasBlock: Script length:', blockProps.rawScript.length);
      console.log('CanvasBlock: Script preview:', blockProps.rawScript.substring(0, 100) + '...');
      
      const success = executeScript(canvas);
      console.log('CanvasBlock: Script execution result:', success);
      
      if (!success) {
        // If script execution failed, draw error message
        console.error('CanvasBlock: Failed to render diagram');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#f00';
        ctx.textAlign = 'center';
        ctx.fillText('Error: Failed to render diagram', canvas.width / 2, canvas.height / 2);
      } else {
        console.log('CanvasBlock: Diagram rendered successfully');
      }
    } catch (error) {
      console.error('Error executing canvas drawing script:', error);
      
      // Draw error message
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#f00';
      ctx.textAlign = 'center';
      ctx.fillText('Error: ' + error.message, canvas.width / 2, canvas.height / 2);
    }
  }, [blockProps]);
  
  const { onRemove } = blockProps || {};
  
  // Function to handle zoom in/out
  const handleZoom = (direction) => {
    if (direction === 'in' && zoomLevel < 2) {
      setZoomLevel(prev => prev + 0.1);
    } else if (direction === 'out' && zoomLevel > 0.5) {
      setZoomLevel(prev => prev - 0.1);
    } else if (direction === 'reset') {
      setZoomLevel(1); // Reset to default zoom level
    }
  };
  
  // Function to center the diagram content
  const centerDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Recalculate dimensions to ensure proper fit
    const containerWidth = canvas.parentElement.clientWidth || 1200;
    const aspectRatio = 16/9;
    const calculatedHeight = Math.min(600, containerWidth / aspectRatio);
    
    canvas.width = containerWidth;
    canvas.height = calculatedHeight;
    
    const ctx = canvas.getContext('2d');
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Re-execute the script to redraw centered
    if (blockProps?.rawScript) {
      try {
        // eslint-disable-next-line no-new-func
        const executeScript = new Function('canvas', blockProps.rawScript);
        executeScript(canvas);
        console.log('CanvasBlock: Diagram centered and redrawn');
      } catch (error) {
        console.error('CanvasBlock: Error centering diagram:', error);
      }
    }
  };

  return (
    <div className='w-full my-8 relative' style={{ pageBreakInside: 'avoid', overflow: 'visible' }}>
      <div className='w-full mx-auto bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200' style={{ overflow: 'visible', minHeight: '550px' }}>
        <div className="text-center mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-center">
          <div>
            <strong>Physics Diagram:</strong> {blockProps?.diagramType || 'Unknown'} Type
            {blockProps?.fallback && (
              <span className="ml-2 text-xs text-orange-600">(Fallback)</span>
            )}
          </div>
          <button 
            onClick={() => setShowControls(!showControls)}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            {showControls ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>
        
        {showControls && (
          <div className="flex justify-center space-x-2 mb-2">
            <button 
              onClick={() => handleZoom('out')}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              title="Zoom Out"
            >
              -
            </button>
            <div className="px-2 py-1 bg-gray-100 rounded">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button 
              onClick={() => handleZoom('in')}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={() => handleZoom('reset')}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-xs"
              title="Reset Zoom"
            >
              Reset
            </button>
            <button 
              onClick={centerDiagram}
              className="bg-blue-200 hover:bg-blue-300 px-3 py-1 rounded text-xs"
              title="Center Diagram"
            >
              Center
            </button>
          </div>
        )}
        
        <div style={{ margin: '20px 0' }}>
          {/* Canvas container - full width */}
          <div className="w-full" style={{ overflow: 'visible' }}>
            <canvas 
              ref={canvasRef} 
              className="mx-auto border-2 border-blue-500 rounded"
              style={{ 
                background: '#f8f8f8', // Consistent with the server-side background
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-in-out',
                margin: '0 auto',
                display: 'block',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-2">
          <button
            onClick={onRemove}
            className='bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center justify-center text-sm'
          >
            Delete Diagram
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasBlock;

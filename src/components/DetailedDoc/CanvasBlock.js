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
          
          // Log if the script doesn't start with a function declaration (but don't throw an error)
          if (!rawScript.trim().startsWith('function')) {
            console.warn('CanvasBlock: Script does not start with a function declaration, but will try to execute anyway');
          }
          
          // Create a function from the script string
          // Handle both regular diagrams and test diagrams
          const expectedFunctionName = diagramType === 'test' ? 'drawTestDiagram' : `draw${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)}Diagram`;
          
          // Log the function name we're looking for
          console.log('CanvasBlock: Looking for function:', expectedFunctionName);
          
          // Check if the expected function name is in the script
          const hasFunctionName = rawScript.includes(expectedFunctionName);
          console.log('CanvasBlock: Script contains expected function name:', hasFunctionName);
          
          // Try to extract any function name from the script as a fallback
          let fallbackFunctionName = null;
          const functionMatch = rawScript.match(/function\s+([\w]+)\s*\(/i);
          if (functionMatch && functionMatch[1]) {
            fallbackFunctionName = functionMatch[1];
            console.log('CanvasBlock: Found fallback function name in script:', fallbackFunctionName);
          }
          
          // Use the expected function name if it exists in the script, otherwise use the fallback
          const functionName = hasFunctionName ? expectedFunctionName : fallbackFunctionName;
          
          // Create a safe execution environment
          let scriptToExecute;
          
          if (functionName) {
            // If we found a specific function name to call
            scriptToExecute = `
              // Ensure we have a clean execution environment
              'use strict';
              
              // The actual drawing script
              ${rawScript}
              
              // Execute the drawing function
              if (typeof ${functionName} === 'function') {
                console.log('Executing function: ${functionName}');
                ${functionName}(canvas);
                return true;
              } else {
                console.error('Drawing function ${functionName} not found in script');
                return false;
              }
            `;
          } else {
            // If we couldn't find any function name, try to execute the first function we find
            scriptToExecute = `
              // Ensure we have a clean execution environment
              'use strict';
              
              // The actual drawing script
              ${rawScript}
              
              // Try to find and execute any drawing function
              const functionNames = Object.keys(window).filter(key => 
                typeof window[key] === 'function' && 
                (key.startsWith('draw') || key.includes('Diagram'))
              );
              
              if (functionNames.length > 0) {
                console.log('Found functions:', functionNames);
                window[functionNames[0]](canvas);
                return true;
              } else {
                // Last resort - try to execute the script directly with the canvas
                try {
                  // Create a function with the raw script and canvas as parameter
                  // eslint-disable-next-line no-new-func
                  const directExecute = new Function('canvas', rawScript);
                  directExecute(canvas);
                  return true;
                } catch (directError) {
                  console.error('Direct execution failed:', directError);
                  return false;
                }
              }
            `;
          }
          
          // Execute the script - using Function constructor is necessary here for dynamic code execution
          console.log('CanvasBlock: Creating function with script');
          console.log('CanvasBlock: Script to execute (first 200 chars):', scriptToExecute.substring(0, 200) + '...');
          
          // Log the raw script for debugging
          console.log('CanvasBlock: Raw script (first 200 chars):', rawScript.substring(0, 200) + '...');
          console.log('CanvasBlock: Raw script contains function declaration:', rawScript.includes('function') ? 'Yes' : 'No');
          
          // Extract all function names from the raw script for debugging
          const functionNameMatches = rawScript.match(/function\s+([\w]+)\s*\(/g) || [];
          console.log('CanvasBlock: Function declarations found in raw script:', functionNameMatches);
          
          // eslint-disable-next-line no-new-func
          const drawingFunction = new Function('canvas', scriptToExecute);
          console.log('CanvasBlock: Function created successfully');
          
          console.log('CanvasBlock: Executing drawing function');
          let result;
          try {
            result = drawingFunction(canvas);
            console.log('CanvasBlock: Function execution completed with result:', result);
          } catch (execError) {
            console.error('CanvasBlock: Error executing drawing function:', execError);
            console.error('CanvasBlock: Error message:', execError.message);
            console.error('CanvasBlock: Error stack:', execError.stack);
            
            // Try a direct approach as a last resort
            console.log('CanvasBlock: Attempting direct script execution as last resort');
            try {
              // Create a simple wrapper that just evaluates the script
              // eslint-disable-next-line no-new-func
              const directExecute = new Function('canvas', `
                try {
                  ${rawScript}
                  return true;
                } catch (e) {
                  console.error('Direct execution error:', e);
                  return false;
                }
              `);
              
              result = directExecute(canvas);
              console.log('CanvasBlock: Direct execution result:', result);
            } catch (directError) {
              console.error('CanvasBlock: Direct execution also failed:', directError);
              result = false;
            }
          }
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

  // Handle all events on the canvas container to prevent them from propagating to the editor
  const handleContainerEvent = (e) => {
    // Mark this event as coming from a canvas container
    e.fromCanvasContainer = true;
    
    // Check if this event originated from a toolbar button
    // If it did, don't interfere with it
    let element = e.target;
    let isToolbarButton = false;
    
    while (element) {
      if (element.getAttribute && (
          element.getAttribute('data-toolbar-button') === 'true' ||
          element.getAttribute('data-toolbar') === 'true'
        )) {
        isToolbarButton = true;
        break;
      }
      element = element.parentElement;
    }
    
    if (isToolbarButton) {
      console.log('CanvasBlock: Event from toolbar button, not intercepting');
      return true; // Allow the event to continue
    }
    
    // Stop propagation to prevent the editor from handling this event
    e.stopPropagation();
    console.log(`CanvasBlock: ${e.type} event intercepted by container`);
    
    // Reset the diagram request flag to prevent unwanted diagram generation
    if (window.resetDiagramRequestFlag) {
      window.resetDiagramRequestFlag();
    }
    
    return false; // Ensure the event is completely stopped
  };
  
  // Special handling for 3D chemical diagrams
  useEffect(() => {
    if (blockProps?.diagramType === 'chemical3d') {
      console.log('CanvasBlock: Setting up special event handling for 3D chemical diagram');
      
      // Add a special class to the canvas element to identify it
      if (canvasRef.current) {
        canvasRef.current.classList.add('chemical-3d-diagram');
        canvasRef.current.classList.add('chemical-3d-viewer-element');
        canvasRef.current.setAttribute('data-diagram-type', 'chemical3d');
        canvasRef.current.setAttribute('data-3d-viewer-element', 'true');
        
        // Mark the parent containers
        let parent = canvasRef.current.parentElement;
        while (parent) {
          parent.setAttribute('data-contains-3d-diagram', 'true');
          parent = parent.parentElement;
          if (parent && parent.tagName === 'BODY') break;
        }
        
        // Create a special area below the diagram for text editing
        const belowDiagramArea = document.createElement('div');
        belowDiagramArea.className = 'below-3d-diagram-area';
        belowDiagramArea.style.height = '50px'; // Increased height for better clickability
        belowDiagramArea.style.width = '100%';
        belowDiagramArea.style.cursor = 'text';
        belowDiagramArea.style.padding = '10px';
        belowDiagramArea.style.marginTop = '10px';
        belowDiagramArea.style.border = '1px dashed #ccc';
        belowDiagramArea.style.borderRadius = '4px';
        belowDiagramArea.style.backgroundColor = '#f9f9f9';
        belowDiagramArea.setAttribute('data-below-3d-diagram', 'true');
        belowDiagramArea.innerHTML = '<span class="text-gray-400">Click here to continue typing...</span>';
        
        // Add click handler to focus the editor when clicking below the diagram
        belowDiagramArea.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('Click on below-diagram area, focusing editor');
          
          // Set global flags to prevent diagram generation
          window.lastClickFromBelowDiagramArea = true;
          window.typingBelowDiagram = true;
          
          // Mark this event to prevent diagram generation
          e.fromBelowDiagramArea = true;
          
          // Focus the editor and insert content
          if (window.focusEditor) {
            window.focusEditor();
            
            // Clear the helper text after click
            setTimeout(() => {
              belowDiagramArea.innerHTML = '';
            }, 100);
          }
        });
        
        // Add all mouse events to ensure proper handling
        ['mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup', 'keypress'].forEach(eventType => {
          belowDiagramArea.addEventListener(eventType, (e) => {
            // Mark this event to prevent diagram generation
            e.fromBelowDiagramArea = true;
            
            // Set global flags to prevent diagram generation
            window.lastClickFromBelowDiagramArea = true;
            window.typingBelowDiagram = true;
            
            // Allow the event to continue for key events (to enable typing)
            if (eventType.startsWith('key')) {
              // Just stop propagation to prevent other handlers
              e.stopPropagation();
            } else {
              // For mouse events, we need to be more aggressive
              e.stopPropagation();
              e.preventDefault();
            }
          }, true); // Use capture phase to ensure we get the event first
        });
        
        // Insert the area below the diagram
        const container = canvasRef.current.closest('.chemical-3d-container');
        if (container) {
          container.appendChild(belowDiagramArea);
        }
      }
      
      // Find all div elements that might be created by the 3D viewer
      const parentDiv = canvasRef.current?.parentElement;
      if (parentDiv) {
        // Add a data attribute to the parent div to identify it
        parentDiv.setAttribute('data-contains-3d-diagram', 'true');
        
        // Create a boundary div that will be used to detect clicks outside the diagram
        const boundaryDiv = document.createElement('div');
        boundaryDiv.className = 'diagram-boundary';
        boundaryDiv.style.position = 'absolute';
        boundaryDiv.style.top = '0';
        boundaryDiv.style.left = '0';
        boundaryDiv.style.width = '100%';
        boundaryDiv.style.height = '100%';
        boundaryDiv.style.pointerEvents = 'none';
        boundaryDiv.setAttribute('data-diagram-boundary', 'true');
        parentDiv.appendChild(boundaryDiv);
        
        // Add a mutation observer to catch dynamically added elements
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              // For each added node, add event handlers
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                  // Skip the boundary div
                  if (node.getAttribute && node.getAttribute('data-diagram-boundary') === 'true') {
                    return;
                  }
                  
                  console.log('CanvasBlock: Adding event handlers to dynamically added element', node);
                  
                  // Add a class to identify this as a 3D viewer element
                  node.classList.add('chemical-3d-viewer-element');
                  node.setAttribute('data-3d-viewer-element', 'true');
                  
                  // Add event handlers to the node
                  ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup'].forEach(eventType => {
                    node.addEventListener(eventType, (e) => {
                      // Always stop propagation to prevent unwanted diagram generation
                      e.stopPropagation();
                      
                      // Check if this event originated from a toolbar button
                      let element = e.target;
                      let isToolbarButton = false;
                      
                      while (element) {
                        if (element.getAttribute && (
                            element.getAttribute('data-toolbar-button') === 'true' ||
                            element.getAttribute('data-toolbar') === 'true'
                          )) {
                          isToolbarButton = true;
                          break;
                        }
                        element = element.parentElement;
                      }
                      
                      if (!isToolbarButton) {
                        // Only prevent default for non-toolbar events
                        e.preventDefault();
                        console.log(`3D viewer element: ${eventType} event intercepted and prevented`);
                      } else {
                        console.log(`3D viewer element: ${eventType} event from toolbar, only stopping propagation`);
                      }
                    }, true); // Use capture phase to ensure we get the event first
                  });
                  
                  // Also add to all children
                  node.querySelectorAll('*').forEach(child => {
                    // Add a class to identify this as a 3D viewer child element
                    child.classList.add('chemical-3d-viewer-child');
                    child.setAttribute('data-3d-viewer-child', 'true');
                    
                    ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup'].forEach(eventType => {
                      child.addEventListener(eventType, (e) => {
                        // Always stop propagation to prevent unwanted diagram generation
                        e.stopPropagation();
                        
                        // Check if this event originated from a toolbar button
                        let element = e.target;
                        let isToolbarButton = false;
                        
                        while (element) {
                          if (element.getAttribute && (
                              element.getAttribute('data-toolbar-button') === 'true' ||
                              element.getAttribute('data-toolbar') === 'true'
                            )) {
                            isToolbarButton = true;
                            break;
                          }
                          element = element.parentElement;
                        }
                        
                        if (!isToolbarButton) {
                          // Only prevent default for non-toolbar events
                          e.preventDefault();
                          console.log(`3D viewer child element: ${eventType} event intercepted and prevented`);
                        } else {
                          console.log(`3D viewer child element: ${eventType} event from toolbar, only stopping propagation`);
                        }
                      }, true); // Use capture phase to ensure we get the event first
                    });
                  });
                }
              });
            }
          });
        });
        
        // Start observing
        observer.observe(parentDiv, { childList: true, subtree: true });
        
        // Cleanup function
        return () => {
          observer.disconnect();
        };
      }
    }
  }, [blockProps?.diagramType]);

  return (
    <div 
      className={`w-full my-8 relative ${blockProps?.diagramType === 'chemical3d' ? 'chemical-3d-container' : ''}`}
      style={{ pageBreakInside: 'avoid', overflow: 'visible' }}
      onClick={handleContainerEvent}
      onMouseDown={handleContainerEvent}
      onMouseUp={handleContainerEvent}
      onMouseMove={handleContainerEvent}
      onKeyDown={handleContainerEvent}
      onKeyUp={handleContainerEvent}
      data-diagram-type={blockProps?.diagramType || 'unknown'}
      data-contains-3d-diagram={blockProps?.diagramType === 'chemical3d' ? 'true' : 'false'}
      data-prevent-diagram-generation="true"
    >
      <div 
        className='w-full mx-auto bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200' 
        style={{ overflow: 'visible', minHeight: '550px' }}
        onClick={handleContainerEvent}
        onMouseDown={handleContainerEvent}
        onMouseUp={handleContainerEvent}
        onMouseMove={handleContainerEvent}
        onKeyDown={handleContainerEvent}
        onKeyUp={handleContainerEvent}
      >
        <div className="text-center mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-center">
          <div>
            <strong>{blockProps?.diagramType?.toLowerCase().includes('chemical') ? 'Chemical Structure' : 'Physics Diagram'}:</strong> {blockProps?.diagramType || 'Unknown'} Type
            {blockProps?.fallback && (
              <span className="ml-2 text-xs text-orange-600">(Fallback)</span>
            )}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowControls(!showControls);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            {showControls ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>
        
        {showControls && (
          <div className="flex justify-center space-x-2 mb-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleZoom('out');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              title="Zoom Out"
            >
              -
            </button>
            <div className="px-2 py-1 bg-gray-100 rounded">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleZoom('in');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleZoom('reset');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-xs"
              title="Reset Zoom"
            >
              Reset
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                centerDiagram();
              }}
              onMouseDown={(e) => e.stopPropagation()}
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
              onClick={handleContainerEvent}
              onMouseDown={handleContainerEvent}
              onMouseUp={handleContainerEvent}
              onMouseMove={handleContainerEvent}
              onKeyDown={handleContainerEvent}
              onKeyUp={handleContainerEvent}
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-2">
          <button
            onClick={(e) => {
              // Stop propagation before calling onRemove
              e.stopPropagation();
              if (onRemove) onRemove();
            }}
            onMouseDown={(e) => e.stopPropagation()}
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

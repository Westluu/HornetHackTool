/**
 * PubChem Service - Provides functions to fetch and render chemical structures
 */

/**
 * Fetch chemical structure from PubChem by compound name
 */
export const fetchPubChemStructure = async (compoundName, is3D = false) => {
  try {
    console.log(`Fetching PubChem structure for: ${compoundName} (3D: ${is3D})`);
    
    // Step 1: Search for the compound to get its CID
    const searchUrl = `http://localhost:3001/api/pubchem/compound/name/${encodeURIComponent(compoundName)}/cids/JSON`;
    console.log('PubChem search URL:', searchUrl);
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      throw new Error(`PubChem search failed: ${searchResponse.statusText}`);
    }
    
    const searchData = await searchResponse.json();
    console.log('PubChem search result:', searchData);
    
    if (!searchData.IdentifierList || !searchData.IdentifierList.CID || searchData.IdentifierList.CID.length === 0) {
      throw new Error(`Compound '${compoundName}' not found in PubChem`);
    }
    
    const cid = searchData.IdentifierList.CID[0];
    console.log(`Found CID for ${compoundName}: ${cid}`);
    
    // Step 2: Get structure information
    const result = {
      success: true,
      cid,
      name: compoundName,
      imageUrl: `http://localhost:3001/api/pubchem/compound/cid/${cid}/PNG?record_type=2d&image_size=large`,
      svgUrl: `http://localhost:3001/api/pubchem/compound/cid/${cid}/display/svg`,
      infoUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
    };
    
    // Add 3D specific data if requested
    if (is3D) {
      // Update the imageUrl to use the correct 3D format
      result.imageUrl = `http://localhost:3001/api/pubchem/compound/cid/${cid}/record/PNG?record_type=3d&image_size=large`;
      
      // Get 3D SDF data URL
      result.sdfUrl = `http://localhost:3001/api/pubchem/compound/cid/${cid}/SDF?record_type=3d`;
      
      // Fetch the actual 3D SDF data
      try {
        console.log('Fetching 3D SDF data from:', result.sdfUrl);
        const sdfResponse = await fetch(result.sdfUrl);
        console.log('SDF response status:', sdfResponse.status);
        console.log('SDF response headers:', [...sdfResponse.headers.entries()]);
        
        if (sdfResponse.ok) {
          const sdfText = await sdfResponse.text();
          console.log('SDF data length:', sdfText.length);
          console.log('SDF data preview:', sdfText.substring(0, 100) + '...');
          result.sdfData = sdfText;
          console.log('Successfully fetched 3D SDF data');
        } else {
          console.warn('Failed to fetch 3D SDF data, status:', sdfResponse.status);
          try {
            const errorText = await sdfResponse.text();
            console.warn('Error response text:', errorText);
          } catch (e) {
            console.warn('Could not read error response text:', e);
          }
        }
      } catch (sdfError) {
        console.warn('Error fetching 3D SDF data:', sdfError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching from PubChem:', error);
    return {
      success: false,
      error: error.message,
      name: compoundName
    };
  }
};

/**
 * Generate a canvas script for a chemical structure using PubChem
 */
export const generateChemicalStructureScript = async (compoundName, is3D = false) => {
  try {
    console.log(`Generating chemical structure script for: ${compoundName} (3D: ${is3D})`);
    
    // Fetch structure from PubChem
    const structureInfo = await fetchPubChemStructure(compoundName, is3D);
    
    if (!structureInfo.success) {
      console.error('Failed to fetch structure from PubChem:', structureInfo.error);
      // Return a fallback script
      return {
        success: false,
        script: generateFallbackScript(compoundName),
        diagramType: is3D ? 'chemical3d' : 'chemical',
        fallback: true
      };
    }
    
    let script;
    
    if (is3D && structureInfo.sdfData) {
      // Create a script that will use 3Dmol.js to display the 3D structure
      script = `function drawChemical3dDiagram(canvas) {
        // For 3D rendering, we need to create a div element instead of using canvas directly
        const width = canvas.width;
        const height = canvas.height;
        const canvasParent = canvas.parentElement;
        
        // Hide the canvas since we'll use a div for 3Dmol
        canvas.style.display = 'none';
        
        // Create a div for 3Dmol viewer
        const viewerDiv = document.createElement('div');
        viewerDiv.style.width = width + 'px';
        viewerDiv.style.height = height + 'px';
        viewerDiv.style.position = 'relative';
        viewerDiv.style.backgroundColor = '#f8f8f8';
        viewerDiv.setAttribute('data-diagram-type', 'chemical3d'); // Add data attribute for identification
        canvasParent.appendChild(viewerDiv);
        
        // Add event handlers to prevent event propagation
        // This is crucial to prevent unwanted diagram generation when clicking on the 3D viewer
        const stopPropagation = (e) => {
          // Mark this event as coming from a 3D viewer
          e.from3DViewer = true;
          
          // Always stop propagation for events inside the 3D viewer
          // This prevents any unwanted diagram generation
          e.stopPropagation();
          
          // Check if this event originated from a toolbar button
          // If it did, don't interfere with it further
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
            console.log('3D viewer: Event from toolbar button, not preventing default');
            return true; // Don't prevent default for toolbar buttons
          }
          
          // For all other events inside the 3D viewer, prevent default
          e.preventDefault();
          console.log('3D viewer: ' + e.type + ' event intercepted and prevented');
          
          // Reset the diagram request flag to prevent unwanted diagram generation
          if (window.resetDiagramRequestFlag) {
            window.resetDiagramRequestFlag();
          }
          
          return false; // Prevent default and stop propagation
        };
        
        // Add all relevant event handlers with capture phase
        viewerDiv.addEventListener('click', stopPropagation, true);
        viewerDiv.addEventListener('mousedown', stopPropagation, true);
        viewerDiv.addEventListener('mouseup', stopPropagation, true);
        viewerDiv.addEventListener('mousemove', stopPropagation, true);
        viewerDiv.addEventListener('keydown', stopPropagation, true);
        viewerDiv.addEventListener('keyup', stopPropagation, true);
        viewerDiv.addEventListener('pointerdown', stopPropagation, true);
        viewerDiv.addEventListener('pointerup', stopPropagation, true);
        
        // Create title div
        const titleDiv = document.createElement('div');
        titleDiv.style.width = '100%';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.padding = '10px';
        titleDiv.style.fontFamily = 'Arial';
        titleDiv.style.fontSize = '24px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.color = '#333';
        titleDiv.textContent = '${compoundName} (3D)';
        viewerDiv.appendChild(titleDiv);
        
        // Create container for the 3D viewer
        const container3D = document.createElement('div');
        container3D.style.width = '100%';
        container3D.style.height = (height - 70) + 'px'; // Adjust for title
        container3D.style.position = 'relative';
        viewerDiv.appendChild(container3D);
        
        // Add event handlers to the container3D as well
        container3D.addEventListener('click', stopPropagation);
        container3D.addEventListener('mousedown', stopPropagation);
        container3D.addEventListener('mouseup', stopPropagation);
        container3D.addEventListener('mousemove', stopPropagation);
        container3D.addEventListener('keydown', stopPropagation);
        container3D.addEventListener('keyup', stopPropagation);
        
        // Create attribution
        const attribution = document.createElement('div');
        attribution.style.width = '100%';
        attribution.style.textAlign = 'center';
        attribution.style.padding = '5px';
        attribution.style.fontFamily = 'Arial';
        attribution.style.fontSize = '12px';
        attribution.style.color = '#666';
        attribution.textContent = 'Source: PubChem (CID: ${structureInfo.cid})';
        viewerDiv.appendChild(attribution);
        
        // First, add jQuery if it's not already available
        const loadJQuery = new Promise((resolve, reject) => {
          if (window.jQuery) {
            resolve();
          } else {
            const jqueryScript = document.createElement('script');
            jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
            jqueryScript.onload = resolve;
            jqueryScript.onerror = reject;
            document.head.appendChild(jqueryScript);
          }
        });
        
        // Then load 3Dmol.js
        loadJQuery.then(() => {
          const script = document.createElement('script');
          script.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js';
          script.onload = function() {
            try {
              // Initialize the 3Dmol viewer
              const viewer = $3Dmol.createViewer($(container3D), {
                backgroundColor: 'white',
                antialias: true
              });
              
              // Add the molecule from SDF data
              const sdfData = ${JSON.stringify(structureInfo.sdfData)};
              viewer.addModel(sdfData, 'sdf');
              
              // Set up the visualization
              viewer.setStyle({}, {stick: {radius: 0.15, colorscheme: 'jmol'}}); // Default style
              viewer.addSurface($3Dmol.SurfaceType.VDW, {
                opacity: 0.7,
                colorscheme: 'whiteCarbon'
              });
              
              // Zoom to fit the molecule
              viewer.zoomTo();
              
              // Render the scene
              viewer.render();
              
              // Add animation - slowly rotate the molecule
              function animate() {
                viewer.rotate(1, {x: 0, y: 1, z: 0});
                viewer.render();
                requestAnimationFrame(animate);
              }
              animate();
              
              // Add controls info
              const controls = document.createElement('div');
              controls.style.position = 'absolute';
              controls.style.bottom = '30px';
              controls.style.left = '10px';
              controls.style.backgroundColor = 'rgba(255,255,255,0.7)';
              controls.style.padding = '5px';
              controls.style.borderRadius = '5px';
              controls.style.fontSize = '12px';
              controls.textContent = 'Mouse: Rotate | Scroll: Zoom | Shift+Mouse: Translate';
              container3D.appendChild(controls);
              
              // Add event handlers to controls div too
              controls.addEventListener('click', stopPropagation);
              controls.addEventListener('mousedown', stopPropagation);
              controls.addEventListener('mouseup', stopPropagation);
            } catch (e) {
              console.error('Error initializing 3D viewer:', e);
              container3D.innerHTML = '<div style="color: #d32f2f; text-align: center; padding-top: 50px;">Error loading 3D structure viewer: ' + e.message + '</div>';
            }
          };
          
          script.onerror = function() {
            container3D.innerHTML = '<div style="color: #d32f2f; text-align: center; padding-top: 50px;">Failed to load 3D molecule viewer library</div>';
          };
          
          document.head.appendChild(script);
        }).catch(() => {
          container3D.innerHTML = '<div style="color: #d32f2f; text-align: center; padding-top: 50px;">Failed to load jQuery library required for 3D viewer</div>';
        });
      }`;
    } else {
      // Create a script that will load and display the PubChem structure image (2D)
      script = `function drawChemicalDiagram(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, width, height);
        
        // Draw title
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('${compoundName}', width/2, 40);
        
        // Create an image object
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = '${structureInfo.imageUrl}';
        
        // Draw the image when it loads
        img.onload = function() {
          // Calculate dimensions to maintain aspect ratio
          const imgAspect = img.width / img.height;
          let drawWidth = width * 0.8;
          let drawHeight = drawWidth / imgAspect;
          
          // Ensure it fits in the canvas
          if (drawHeight > height * 0.7) {
            drawHeight = height * 0.7;
            drawWidth = drawHeight * imgAspect;
          }
          
          // Center the image
          const x = (width - drawWidth) / 2;
          const y = (height - drawHeight) / 2 + 20; // Offset for title
          
          // Draw the image
          ctx.drawImage(img, x, y, drawWidth, drawHeight);
          
          // Add PubChem attribution
          ctx.font = '12px Arial';
          ctx.fillStyle = '#666';
          ctx.textAlign = 'center';
          ctx.fillText('Source: PubChem (CID: ${structureInfo.cid})', width/2, height - 20);
        };
        
        // Handle image loading error
        img.onerror = function() {
          ctx.font = '16px Arial';
          ctx.fillStyle = '#d32f2f';
          ctx.textAlign = 'center';
          ctx.fillText('Error loading chemical structure image', width/2, height/2);
          ctx.font = '14px Arial';
          ctx.fillText('Please check your internet connection or try a different compound', width/2, height/2 + 30);
        };
      }`;
    }
    
    return {
      success: true,
      script,
      diagramType: is3D ? 'chemical3d' : 'chemical',
      structureInfo
    };
  } catch (error) {
    console.error('Error generating chemical structure script:', error);
    return {
      success: false,
      script: generateFallbackScript(compoundName, error.message),
      diagramType: 'chemical',
      fallback: true
    };
  }
};

/**
 * Generate a fallback script for when PubChem lookup fails
 */
function generateFallbackScript(compoundName, errorMessage = '') {
  return `function drawChemicalDiagram(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, width, height);
    
    // Draw title
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('${compoundName}', width/2, 40);
    
    // Draw error message
    ctx.font = '16px Arial';
    ctx.fillStyle = '#d32f2f';
    ctx.textAlign = 'center';
    ctx.fillText('Could not load chemical structure', width/2, height/2 - 20);
    
    ${errorMessage ? `ctx.fillText('${errorMessage}', width/2, height/2 + 10);` : ''}
    
    // Draw a simple molecule representation
    const centerX = width / 2;
    const centerY = height / 2 + 50;
    const radius = 30;
    const spacing = 80;
    
    // Draw atoms
    ctx.beginPath();
    ctx.arc(centerX - spacing, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e91e63';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2196f3';
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX + spacing, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4caf50';
    ctx.fill();
    ctx.stroke();
    
    // Draw bonds
    ctx.beginPath();
    ctx.moveTo(centerX - spacing + radius, centerY);
    ctx.lineTo(centerX - radius, centerY);
    ctx.moveTo(centerX + radius, centerY);
    ctx.lineTo(centerX + spacing - radius, centerY);
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Draw atom labels
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', centerX - spacing, centerY);
    ctx.fillText('O', centerX, centerY);
    ctx.fillText('H', centerX + spacing, centerY);
  }`;
}

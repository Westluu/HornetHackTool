import SmilesDrawer from 'smiles-drawer';
import { generateChemicalStructureScript } from './pubchemService';

/**
 * Generate a 3D chemical structure using PubChem
 */
export const generate3DChemicalStructure = async (compound) => {
  try {
    console.log(`Generating 3D chemical structure for: ${compound}`);
    
    // Use the imported function from pubchemService
    const result = await generateChemicalStructureScript(compound, true);
    
    if (result.success) {
      console.log('Successfully generated 3D chemical structure script');
      return { 
        type: 'canvas', 
        rawScript: result.script, 
        diagramType: 'chemical3d',
        structureInfo: result.structureInfo
      };
    } else {
      console.warn('Failed to generate 3D structure, falling back to 2D');
      // Try to generate a 2D structure instead
      try {
        const fallbackResult = await generateChemicalStructure(compound, '2D');
        console.log('Successfully generated 2D fallback');
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Error generating 2D fallback:', fallbackError);
        // If 2D also fails, return the original fallback
        return { 
          type: 'canvas', 
          rawScript: result.script, 
          diagramType: 'chemical2d',
          fallback: true
        };
      }
    }
  } catch (error) {
    console.error('Error generating 3D chemical structure:', error);
    // Try to generate a 2D structure as a fallback
    try {
      console.log('Attempting to generate 2D structure as fallback');
      return await generateChemicalStructure(compound, '2D');
    } catch (fallbackError) {
      console.error('Fallback to 2D also failed:', fallbackError);
      throw error; // Throw the original error if fallback also fails
    }
  }
};

/**
 * Generate a JavaScript drawing script using AI
 */
async function generateDrawingScript(text, diagramType) {
  try {
    console.log(`Generating ${diagramType} drawing script with AI for:`, text);
    
    const response = await fetch('http://localhost:3001/api/generate-drawing-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        diagramType,
        options: { scale: 4 } // Request 4x larger diagram content
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data.script) throw new Error('Invalid response from drawing script generation service');

    console.log('AI-generated script received, length:', data.script.length);
    
    // Extract JavaScript code from the response
    // The AI might return explanatory text and code blocks, so we need to extract just the code
    let cleanScript = data.script;
    
    // Check if the script contains markdown code blocks
    if (data.script.includes('```javascript')) {
      const codeBlockRegex = /```javascript\n([\s\S]*?)```/;
      const match = data.script.match(codeBlockRegex);
      
      if (match && match[1]) {
        cleanScript = match[1].trim();
        console.log('Extracted JavaScript code from markdown code block');
      } else {
        console.warn('Could not extract code from markdown block, using full response');
      }
    } else if (data.script.includes('```js')) {
      // Alternative format some models might use
      const codeBlockRegex = /```js\n([\s\S]*?)```/;
      const match = data.script.match(codeBlockRegex);
      
      if (match && match[1]) {
        cleanScript = match[1].trim();
        console.log('Extracted JavaScript code from js markdown code block');
      }
    } else if (data.script.includes('```')) {
      // Generic code block
      const codeBlockRegex = /```\n([\s\S]*?)```/;
      const match = data.script.match(codeBlockRegex);
      
      if (match && match[1]) {
        cleanScript = match[1].trim();
        console.log('Extracted JavaScript code from generic code block');
      }
    }
    
    // If we couldn't extract from code blocks but can identify a function declaration
    if (cleanScript === data.script && data.script.includes('function draw')) {
      const functionRegex = /(function\s+draw[\w]*\s*\([^)]*\)[\s\S]*)/;
      const match = data.script.match(functionRegex);
      
      if (match && match[1]) {
        cleanScript = match[1].trim();
        console.log('Extracted JavaScript code by function declaration');
      }
    }
    
    // Final validation - ensure script starts with a function declaration
    if (!cleanScript.trim().startsWith('function')) {
      console.warn('Script does not start with a function declaration, attempting to fix');
      const functionRegex = /(function\s+draw[\w]*\s*\([^)]*\)[\s\S]*)/;
      const match = cleanScript.match(functionRegex);
      
      if (match && match[1]) {
        cleanScript = match[1].trim();
        console.log('Fixed script to start with function declaration');
      } else {
        console.warn('Could not find function declaration, wrapping script in a function');
        // No function declaration found, wrap the entire script in a function
        const functionName = diagramType.charAt(0).toUpperCase() + diagramType.slice(1);
        cleanScript = `function draw${functionName}Diagram(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas and set background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, width, height);
  
  // Add title
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText('${functionName} Diagram', width/2, 40);
  
  // Set up coordinate system
  const centerX = width/2;
  const centerY = height/2;
  
  try {
    // Original AI-generated code
    ${cleanScript}
  } catch (error) {
    console.error('Error in AI-generated code:', error);
    // Fallback drawing
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#d32f2f';
    ctx.textAlign = 'center';
    ctx.fillText('Error rendering diagram', width/2, height/2);
  }
}`;
        console.log('Created wrapper function for script');
      }
    }
    
    console.log('Cleaned script length:', cleanScript.length);
    console.log('Cleaned script preview:', cleanScript.substring(0, 100) + '...');
    
    return cleanScript;
  } catch (error) {
    console.error('Error generating drawing script with AI:', error);
    throw error;
  }
}

// PubChem API base URL - use a CORS proxy for direct browser access
const PUBCHEM_API_DIRECT = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_API = 'https://cors-anywhere.herokuapp.com/https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// Alternative: Use our own proxy server
const proxyPubChemRequest = async (url) => {
  try {
    // Use our local proxy server instead of direct PubChem access
    const proxyResponse = await fetch('http://localhost:3001/api/pubchem-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!proxyResponse.ok) {
      throw new Error(`Proxy server error: ${proxyResponse.status}`);
    }
    
    return proxyResponse;
  } catch (error) {
    console.error('Error using PubChem proxy:', error);
    throw error;
  }
};

// Cache for storing generated structures
const structureCache = new Map();

// Common chemical compounds
const VALID_COMPOUNDS = {
  'H2O': { cid: '962', smiles: 'O', name: 'water' },
  'CO2': { cid: '280', smiles: 'O=C=O', name: 'carbon dioxide' },
  'NH3': { cid: '222', smiles: 'N', name: 'ammonia' },
  'CH4': { cid: '297', smiles: 'C', name: 'methane' },
  'NaOH': { cid: '14798', smiles: '[Na+].[OH-]', name: 'sodium hydroxide' },
};

// Initialize SmilesDrawer
const drawer = new SmilesDrawer.Drawer({ width: 300, height: 300 });

/**
 * Helper function to validate and format chemical formulas
 */
const validateAndFormatFormula = (compound) => {
  return compound.trim()
    .replace(/([a-z])0/gi, '$1O')
    .replace(/h2o/i, 'H2O')
    .replace(/([a-z])([0-9])/gi, '$1$2')
    .replace(/^[a-z]/i, (c) => c.toUpperCase());
};

/**
 * Generate chemical structure using PubChem with SmilesDrawer fallback
 */
export const generateChemicalStructure = async (compound, type = '2D') => {
  try {
    console.log(`Generating ${type} structure for ${compound}...`);

    const cacheKey = `${compound}_${type}`;
    if (structureCache.has(cacheKey)) return structureCache.get(cacheKey);

    const formattedCompound = validateAndFormatFormula(compound);
    
    // First try direct PubChem API lookup without using our predefined list
    try {
      console.log('Trying PubChem direct lookup for:', formattedCompound);
      const pubchemPath = `/compound/name/${encodeURIComponent(formattedCompound)}/cids/JSON`;
      const searchUrl = `${PUBCHEM_API_DIRECT}${pubchemPath}`;
      console.log('PubChem search URL:', searchUrl);
      
      // Use our proxy server to avoid CORS issues
      console.log('Fetching from PubChem API via proxy...');
      const searchResponse = await proxyPubChemRequest(searchUrl);
      
      console.log('PubChem API response status:', searchResponse.status);
      
      if (searchResponse.ok) {
        console.log('PubChem response OK, parsing JSON...');
        const searchData = await searchResponse.json();
        console.log('PubChem search data:', searchData);
        
        if (searchData.IdentifierList && searchData.IdentifierList.CID && searchData.IdentifierList.CID.length > 0) {
          const cid = searchData.IdentifierList.CID[0];
          console.log(`Found CID for ${formattedCompound}: ${cid}`);
          
          const imagePath = `/compound/cid/${cid}/PNG?record_type=2d&image_size=large`;
          const imageUrl = `${PUBCHEM_API_DIRECT}${imagePath}`;
          console.log('Generated image URL:', imageUrl);
          
          // Use our proxy server to fetch the image
          console.log('Fetching image via proxy...');
          const response = await proxyPubChemRequest(imageUrl);
          
          console.log('PubChem image response status:', response.status);
          
          if (response.ok) {
            console.log('PubChem image response OK, converting to blob...');
            const blob = await response.blob();
            console.log('PubChem image blob size:', blob.size, 'bytes');
            console.log('PubChem image blob type:', blob.type);
            
            const url = URL.createObjectURL(blob);
            console.log('Created object URL for image:', url);
            
            const result = { 
              type: 'image', 
              url, 
              alt: `${type} structure of ${compound}`, 
              source: 'pubchem',
              cid
            };
            console.log('Caching and returning PubChem result:', result);
            structureCache.set(cacheKey, result);
            return result;
          }
        }
      }
      console.log('PubChem direct lookup failed, trying fallback methods');
    } catch (pubchemError) {
      console.error('PubChem direct lookup error:', pubchemError);
    }
    
    // Try our predefined compounds list
    const compoundData = VALID_COMPOUNDS[formattedCompound];
    if (compoundData) {
      try {
        const imageUrl = `${PUBCHEM_API}/compound/cid/${compoundData.cid}/PNG?record_type=2d&image_size=300`;
        const response = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const result = { type: 'image', url, alt: `${type} structure of ${compound} (${compoundData.name})`, source: 'pubchem' };
          structureCache.set(cacheKey, result);
          return result;
        }
      } catch (predefinedError) {
        console.error('Predefined compound lookup error:', predefinedError);
      }
    }
    
    // Final fallback to SmilesDrawer if we have the compound data
    if (compoundData && compoundData.smiles) {
      console.log('Fallback to SmilesDrawer');
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;

      await new Promise((resolve, reject) => {
        try {
          SmilesDrawer.parse(compoundData.smiles, function (tree) {
            drawer.draw(tree, canvas, 'light', false);
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });

      const url = await new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), 'image/png');
      });

      const result = { type: 'image', url, alt: `${type} structure of ${compound} (${compoundData.name})`, source: 'smilesdrawer' };
      structureCache.set(cacheKey, result);
      return result;
    }
    
    throw new Error(`Compound not found: ${formattedCompound}`);
  } catch (error) {
    console.error('Error generating chemical structure:', error);
    throw error;
  }
};

/**
 * Generate physics diagrams using AI or fallback
 */
export const generatePhysicsDiagram = async (text, type) => {
  try {
    console.log(`Generating physics diagram for: ${text}, type: ${type}`);

    const diagramType = type.toLowerCase().replace('_diagram', '');
    console.log('Using diagram type:', diagramType);
    
    try {
      console.log('Attempting to generate AI drawing script...');
      const drawingScript = await generateDrawingScript(text, diagramType);
      console.log('AI drawing script generated successfully, length:', drawingScript.length);
      console.log('Script preview:', drawingScript.substring(0, 100) + '...');
      
      const result = { type: 'canvas', rawScript: drawingScript, diagramType };
      console.log('Returning canvas result:', result);
      return result;
    } catch (error) {
      console.error('AI script failed, using fallback:', error);
      console.log('Generating fallback script...');
      const fallbackScript = generateFallbackScript(diagramType, text);
      console.log('Fallback script generated, length:', fallbackScript.length);
      console.log('Fallback script preview:', fallbackScript.substring(0, 100) + '...');
      
      const result = { type: 'canvas', rawScript: fallbackScript, diagramType, fallback: true };
      console.log('Returning fallback canvas result:', result);
      return result;
    }
  } catch (error) {
    console.error('Error generating physics diagram:', error);
    throw error;
  }
};

/**
 * Generate fallback script for physics diagrams
 */
function generateFallbackScript(diagramType, text) {
  const capitalizedType = diagramType ? (diagramType.charAt(0).toUpperCase() + diagramType.slice(1)) : 'Diagram';
  
  // Use string concatenation to avoid template string nesting issues
  return (
    '\nfunction draw' + capitalizedType + 'Diagram(canvas) {\n' +
    '  const ctx = canvas.getContext(\'2d\');\n' +
    '  const width = canvas.width;\n' +
    '  const height = canvas.height;\n\n' +
    '  // Clear canvas and set background\n' +
    '  ctx.clearRect(0, 0, width, height);\n' +
    '  ctx.fillStyle = \'#f8f8f8\';\n' +
    '  ctx.fillRect(0, 0, width, height);\n\n' +
    '  // Set up coordinate system\n' +
    '  // Make diagram content 3x bigger while keeping canvas the same size\n' +
    '  const scaleFactor = 3; // Fixed scale factor to make content 3x bigger\n' +
    '  const diagramWidth = width;\n' +
    '  const diagramCenterX = width / 2;\n' +
    '  const centerY = height/2;\n\n' +
    '  // No title as requested\n\n' +
    '  // Draw main diagram element - make it much bigger\n' +
    '  const radius = Math.min(diagramWidth, height) * 0.45; // Larger base radius to fill more of the canvas\n' +
    '  ctx.beginPath();\n' +
    '  ctx.arc(diagramCenterX, centerY, radius, 0, Math.PI * 2);\n' +
    '  ctx.fillStyle = \'#d0d0d0\'; // Slightly darker fill\n' +
    '  ctx.fill();\n' +
    '  ctx.strokeStyle = \'#222\'; // Darker border\n' +
    '  ctx.lineWidth = Math.max(2, 6 * scaleFactor); // Scale line width with canvas size\n' +
    '  ctx.stroke();\n\n' +
    '  // Add diagram elements based on type\n' +
    '  if (\'' + capitalizedType + '\' === \'Force\') {\n' +
    '    // Draw force arrows - longer and more apparent\n' +
    '    // Main horizontal arrow\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX - radius * 1.1, centerY);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 1.1, centerY);\n' +
    '    ctx.strokeStyle = \'#d32f2f\'; // Red arrow\n' +
    '    ctx.lineWidth = Math.max(4, 9 * scaleFactor); // Thicker line\n' +
    '    ctx.stroke();\n' +
    '    // Larger arrow head\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX + radius * 1.1, centerY);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 0.85, centerY - 30);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 0.85, centerY + 30);\n' +
    '    ctx.fillStyle = \'#d32f2f\';\n' +
    '    ctx.fill();\n' +
    '    // Add a second vertical force vector\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX, centerY + radius * 0.9);\n' +
    '    ctx.lineTo(diagramCenterX, centerY - radius * 0.9);\n' +
    '    ctx.strokeStyle = \'#2196F3\'; // Blue arrow for contrast\n' +
    '    ctx.lineWidth = Math.max(4, 9 * scaleFactor);\n' +
    '    ctx.stroke();\n' +
    '    // Arrow head for vertical vector\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX, centerY - radius * 0.9);\n' +
    '    ctx.lineTo(diagramCenterX - 25, centerY - radius * 0.65);\n' +
    '    ctx.lineTo(diagramCenterX + 25, centerY - radius * 0.65);\n' +
    '    ctx.fillStyle = \'#2196F3\';\n' +
    '    ctx.fill();\n' +
    '  } else if (\'' + capitalizedType + '\' === \'Circuit\') {\n' +
    '    // Draw enhanced circuit elements\n' +
    '    const boxSize = radius * 0.8;\n' +
    '    // Main component box\n' +
    '    ctx.strokeStyle = \'#1976d2\'; // Blue circuit\n' +
    '    ctx.lineWidth = Math.max(3, 8 * scaleFactor);\n' +
    '    ctx.strokeRect(diagramCenterX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);\n' +
    '    // Add component label\n' +
    '    ctx.font = \'bold \' + Math.max(16, Math.round(22 * scaleFactor)) + \'px Arial\';\n' +
    '    ctx.fillStyle = \'#1976d2\';\n' +
    '    ctx.textAlign = \'center\';\n' +
    '    ctx.fillText(\'R\', diagramCenterX, centerY + 8);\n' +
    '    // Draw connection lines with endpoints\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX - radius * 1.1, centerY);\n' +
    '    ctx.lineTo(diagramCenterX - boxSize/2, centerY);\n' +
    '    ctx.moveTo(diagramCenterX + boxSize/2, centerY);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 1.1, centerY);\n' +
    '    ctx.stroke();\n' +
    '    // Add connection points\n' +
    '    ctx.beginPath();\n' +
    '    ctx.arc(diagramCenterX - radius * 1.1, centerY, Math.max(5, 10 * scaleFactor), 0, Math.PI * 2);\n' +
    '    ctx.arc(diagramCenterX + radius * 1.1, centerY, Math.max(5, 10 * scaleFactor), 0, Math.PI * 2);\n' +
    '    ctx.fillStyle = \'#1976d2\';\n' +
    '    ctx.fill();\n' +
    '    // Add voltage source\n' +
    '    ctx.beginPath();\n' +
    '    ctx.arc(diagramCenterX - radius * 0.6, centerY + radius * 0.6, radius * 0.25, 0, Math.PI * 2);\n' +
    '    ctx.strokeStyle = \'#e91e63\';\n' +
    '    ctx.lineWidth = Math.max(2, 5 * scaleFactor);\n' +
    '    ctx.stroke();\n' +
    '    // Add + and - symbols\n' +
    '    ctx.font = \'bold \' + Math.max(16, Math.round(24 * scaleFactor)) + \'px Arial\';\n' +
    '    ctx.fillStyle = \'#e91e63\';\n' +
    '    ctx.fillText(\'+\', diagramCenterX - radius * 0.6, centerY + radius * 0.55);\n' +
    '  } else if (\'' + capitalizedType + '\' === \'Kinematics\') {\n' +
    '    // Draw enhanced kinematics path and object with motion indicators\n' +
    '    // Main trajectory path\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX - radius * 1.1, centerY);\n' +
    '    ctx.quadraticCurveTo(diagramCenterX, centerY - radius * 0.8, diagramCenterX + radius * 1.1, centerY);\n' +
    '    ctx.strokeStyle = \'#388e3c\'; // Green path\n' +
    '    ctx.lineWidth = Math.max(3, 7 * scaleFactor);\n' +
    '    ctx.stroke();\n' +
    '    // Add direction arrows along path\n' +
    '    const drawArrow = (x, y, angle) => {\n' +
    '      const arrowSize = Math.max(10, 20 * scaleFactor);\n' +
    '      ctx.save();\n' +
    '      ctx.translate(x, y);\n' +
    '      ctx.rotate(angle);\n' +
    '      ctx.beginPath();\n' +
    '      ctx.moveTo(0, 0);\n' +
    '      ctx.lineTo(-arrowSize, -arrowSize/2);\n' +
    '      ctx.lineTo(-arrowSize, arrowSize/2);\n' +
    '      ctx.closePath();\n' +
    '      ctx.fillStyle = \'#388e3c\';\n' +
    '      ctx.fill();\n' +
    '      ctx.restore();\n' +
    '    };\n' +
    '    // Add multiple arrows to show direction\n' +
    '    drawArrow(diagramCenterX - radius * 0.6, centerY - radius * 0.3, Math.PI / 4);\n' +
    '    drawArrow(diagramCenterX, centerY - radius * 0.6, Math.PI / 2);\n' +
    '    drawArrow(diagramCenterX + radius * 0.6, centerY - radius * 0.3, Math.PI * 3/4);\n' +
    '    // Draw main object\n' +
    '    ctx.beginPath();\n' +
    '    ctx.arc(diagramCenterX + radius * 0.6, centerY - radius * 0.4, radius * 0.25, 0, Math.PI * 2);\n' +
    '    ctx.fillStyle = \'#388e3c\';\n' +
    '    ctx.fill();\n' +
    '    // Add velocity vector\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX + radius * 0.6, centerY - radius * 0.4);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 1.0, centerY - radius * 0.1);\n' +
    '    ctx.strokeStyle = \'#ff9800\'; // Orange for velocity\n' +
    '    ctx.lineWidth = Math.max(3, 6 * scaleFactor);\n' +
    '    ctx.stroke();\n' +
    '    // Arrow head for velocity\n' +
    '    ctx.beginPath();\n' +
    '    ctx.moveTo(diagramCenterX + radius * 1.0, centerY - radius * 0.1);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 0.85, centerY - radius * 0.25);\n' +
    '    ctx.lineTo(diagramCenterX + radius * 1.05, centerY - radius * 0.3);\n' +
    '    ctx.fillStyle = \'#ff9800\';\n' +
    '    ctx.fill();\n' +
    '    // Add v label\n' +
    '    ctx.font = \'italic bold \' + Math.max(16, Math.round(24 * scaleFactor)) + \'px Arial\';\n' +
    '    ctx.fillStyle = \'#ff9800\';\n' +
    '    ctx.fillText(\'v\', diagramCenterX + radius * 0.9, centerY - radius * 0.05);\n' +
    '  }\n\n' +
    '  // Add small label at bottom\n' +
    '  ctx.font = \'bold \' + Math.max(14, Math.round(24 * scaleFactor)) + \'px Arial\';\n' +
    '  ctx.fillStyle = \'#111\'; // Very dark text\n' +
    '  ctx.textAlign = \'center\';\n' +
    '  ctx.fillText(\'' + capitalizedType + '\', diagramCenterX, height - Math.max(10, 20 * scaleFactor));\n\n' +
    '  // Draw border around main diagram area\n' +
    '  ctx.strokeStyle = \'#444\';\n' +
    '  ctx.lineWidth = Math.max(1, 3 * scaleFactor); // Scale border with canvas size\n' +
    '  // Make the diagram area larger and centered - scale padding with canvas size\n' +
    '  const padding = Math.max(5, 10 * scaleFactor);\n' +
    '  const mainAreaWidth = width - (padding * 2);\n' +
    '  const mainAreaHeight = height - (padding * 2);\n' +
    '  ctx.strokeRect(padding, padding, mainAreaWidth, mainAreaHeight);\n' +
    '}'  
  );
}

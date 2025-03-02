/**
 * PubChem Service - Provides functions to fetch and render chemical structures
 */

/**
 * Fetch chemical structure from PubChem by compound name
 */
export const fetchPubChemStructure = async (compoundName) => {
  try {
    console.log(`Fetching PubChem structure for: ${compoundName}`);
    
    // Step 1: Search for the compound to get its CID
    const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(compoundName)}/cids/JSON`;
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
    return {
      success: true,
      cid,
      name: compoundName,
      imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d&image_size=large`,
      svgUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/display/svg`,
      infoUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
    };
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
export const generateChemicalStructureScript = async (compoundName) => {
  try {
    console.log(`Generating chemical structure script for: ${compoundName}`);
    
    // Fetch structure from PubChem
    const structureInfo = await fetchPubChemStructure(compoundName);
    
    if (!structureInfo.success) {
      console.error('Failed to fetch structure from PubChem:', structureInfo.error);
      // Return a fallback script
      return {
        success: false,
        script: generateFallbackScript(compoundName),
        diagramType: 'chemical',
        fallback: true
      };
    }
    
    // Create a script that will load and display the PubChem structure image
    const script = `function drawChemicalDiagram(canvas) {
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
    
    return {
      success: true,
      script,
      diagramType: 'chemical',
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

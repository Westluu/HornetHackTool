import SmilesDrawer from 'smiles-drawer';

// PubChem API base URL
const PUBCHEM_API = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// Cache for storing generated structures
const structureCache = new Map();

// Common compounds mapped to their PubChem CIDs and SMILES (for fallback)
const VALID_COMPOUNDS = {
  'H2O': { cid: '962', smiles: 'O', name: 'water' },
  'CO2': { cid: '280', smiles: 'O=C=O', name: 'carbon dioxide' },
  'NH3': { cid: '222', smiles: 'N', name: 'ammonia' },
  'CH4': { cid: '297', smiles: 'C', name: 'methane' },
  'NaOH': { cid: '14798', smiles: '[Na+].[OH-]', name: 'sodium hydroxide' },
  'H2SO4': { cid: '1118', smiles: 'O=S(=O)(O)O', name: 'sulfuric acid' },
  'HCl': { cid: '313', smiles: 'Cl', name: 'hydrochloric acid' },
  'NaCl': { cid: '5234', smiles: '[Na+].[Cl-]', name: 'sodium chloride' },
  'C6H12O6': { cid: '5793', smiles: 'C([C@@H]1[C@H]([C@@H]([C@H](C(O1)O)O)O)O)O', name: 'glucose' },
  'O2': { cid: '977', smiles: 'O=O', name: 'oxygen' },
  'N2': { cid: '947', smiles: 'N#N', name: 'nitrogen' }
};

// Initialize SmilesDrawer for fallback
const drawer = new SmilesDrawer.Drawer({ width: 300, height: 300 });


/**
 * Helper function to validate and format chemical formulas
 */
const validateAndFormatFormula = (compound) => {
  const formatted = compound.trim()
    .replace(/([a-z])0/gi, '$1O')  // Replace zero with capital O
    .replace(/h2o/i, 'H2O')        // Common water format
    .replace(/([a-z])([0-9])/gi, '$1$2')  // Preserve numbers
    .replace(/^[a-z]/i, c => c.toUpperCase())  // Capitalize first letter
    .replace(/[0-9][a-z]/gi, c => c.toUpperCase());  // Capitalize letters after numbers

  return formatted;
};

/**
 * Generate chemical structure diagram using PubChem with SmilesDrawer fallback
 */
export const generateChemicalStructure = async (compound, type = '2D') => {
  try {
    console.log('Generating chemical structure for:', compound, 'type:', type);
    
    // Return loading state immediately
    const loadingResult = {
      type: 'loading',
      content: `Generating ${type} structure for ${compound}...`
    };
    
    // Check cache first
    const cacheKey = `${compound}_${type}`;
    if (structureCache.has(cacheKey)) {
      console.log('Using cached structure');
      return structureCache.get(cacheKey);
    }
    
    // Start the generation process
    const formattedCompound = validateAndFormatFormula(compound);
    const compoundData = VALID_COMPOUNDS[formattedCompound];
    
    if (!compoundData) {
      throw new Error(`Compound not found in database: ${formattedCompound}. Currently only supporting common compounds.`);
    }

    try {
      // Try PubChem first with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const imageUrl = `${PUBCHEM_API}/compound/cid/${compoundData.cid}/PNG?record_type=2d&image_size=300`;
      const response = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Get the image blob directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create the result
        const result = {
          type: 'image',
          url: url,
          alt: `${type} structure of ${compound} (${compoundData.name})`,
          source: 'pubchem'
        };
        
        // Cache the result
        structureCache.set(cacheKey, result);
        return result;
      }
      throw new Error('PubChem request failed');
    } catch (pubchemError) {
      console.log('PubChem failed, falling back to SmilesDrawer:', pubchemError);
      
      // Fallback to SmilesDrawer
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      
      // Draw the structure
      await new Promise((resolve, reject) => {
        try {
          SmilesDrawer.parse(compoundData.smiles, function(tree) {
            drawer.draw(tree, canvas, 'light', false);
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
      
      // Convert canvas to blob URL
      const url = await new Promise(resolve => {
        canvas.toBlob(blob => {
          resolve(URL.createObjectURL(blob));
        }, 'image/png');
      });
      
      // Create the result
      const result = {
        type: 'image',
        url: url,
        alt: `${type} structure of ${compound} (${compoundData.name})`,
        source: 'smilesdrawer'
      };
      
      // Cache the result
      structureCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('Error generating chemical structure:', error);
    throw error;
  }
};

/**
 * Generate physics diagrams using Mermaid
 */
export const generatePhysicsDiagram = async (text, type) => {
  try {
    let diagram = '';
    
    switch (type) {
      case 'FORCE_DIAGRAM':
        diagram = generateForceDiagram(text);
        break;
      case 'CIRCUIT_DIAGRAM':
        diagram = generateCircuitDiagram(text);
        break;
      default:
        throw new Error('Unsupported diagram type');
    }

    return {
      type: 'mermaid',
      diagram
    };
  } catch (error) {
    console.error('Error generating physics diagram:', error);
    throw error;
  }
};

/**
 * Generate force diagram using Mermaid
 */
const generateForceDiagram = (text) => {
  // Example: "Block on inclined plane with friction"
  return `
graph TD
    Block[Block]
    
    Block -->|Weight| W((mg))
    Block -->|Normal Force| N((N))
    Block -->|Friction| f((f))
    
    style Block fill:#f9f,stroke:#333,stroke-width:4px
  `;
};

/**
 * Generate circuit diagram using Mermaid
 */
const generateCircuitDiagram = (text) => {
  // Example: "Circuit with resistor and battery"
  return `
graph LR
    Battery((+/-)) --> R1[Resistor]
    R1 --> Battery
    
    style Battery fill:#ff9,stroke:#333,stroke-width:4px
    style R1 fill:#9ff,stroke:#333,stroke-width:4px
  `;
};

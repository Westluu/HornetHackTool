// PubChem API for chemical structures
const PUBCHEM_API = {
  SEARCH: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name',
  STRUCTURE: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid'
};

/**
 * Get compound ID from PubChem
 */
const getCompoundId = async (compound) => {
  try {
    const response = await fetch(`${PUBCHEM_API.SEARCH}/${encodeURIComponent(compound)}/cids/JSON`);
    const data = await response.json();
    return data.IdentifierList.CID[0];
  } catch (error) {
    console.error('Error getting compound ID:', error);
    throw new Error('Could not find compound. Please check the chemical formula.');
  }
};

/**
 * Generate chemical structure diagram
 */
export const generateChemicalStructure = async (compound, type = '2D') => {
  try {
    // First get the compound ID
    const cid = await getCompoundId(compound);
    
    // Generate URL for structure diagram
    const structureUrl = `${PUBCHEM_API.STRUCTURE}/${cid}/PNG${type === '3D' ? '?record_type=3d' : ''}`;
    
    return {
      type: 'image',
      url: structureUrl,
      alt: `${type} structure of ${compound}`
    };
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

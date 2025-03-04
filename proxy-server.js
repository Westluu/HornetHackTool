require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fetch = require('node-fetch');
const FormData = require('form-data');

// PubChem API base URL
const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// Helper function to handle PubChem requests with retries
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Helper function to forward PubChem requests
async function forwardPubChemRequest(url) {
  try {
    console.log('Requesting:', url);
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocsClone/1.0; +http://localhost)',
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`PubChem API error: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Unable to connect to PubChem API. Please check your internet connection.');
    }
    throw error;
  }
}

const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(cors());
app.use(express.json());

// Configure OpenAI client for Scaleway
const client = new OpenAI({
  baseURL: 'https://api.scaleway.ai/87c82d26-417f-4584-85f1-511bff4e45b0/v1',
  apiKey: process.env.SCALEWAY_API_KEY
});

console.log('Scaleway API Key:', process.env.SCALEWAY_API_KEY ? 'Present' : 'Missing');



// General PubChem API proxy endpoint
app.post('/api/pubchem-proxy', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('pubchem.ncbi.nlm.nih.gov')) {
      return res.status(400).json({ error: 'Invalid PubChem URL' });
    }
    
    console.log('Proxying PubChem request:', url);
    
    console.log('Sending request to PubChem...');
    const response = await forwardPubChemRequest(url);
    
    const contentType = response.headers.get('content-type');
    console.log('PubChem response content type:', contentType);
    console.log('PubChem response status:', response.status);
    
    // Log all headers for debugging
    console.log('PubChem response headers:');
    response.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });
    
    // Forward the response with the appropriate content type
    res.set('Content-Type', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      console.log('Processing JSON response from PubChem');
      const data = await response.json();
      console.log('PubChem JSON data:', JSON.stringify(data).substring(0, 500) + '...');
      return res.json(data);
    } else if (contentType && contentType.includes('image')) {
      console.log('Processing image response from PubChem');
      const buffer = await response.buffer();
      console.log('PubChem image received, size:', buffer.length, 'bytes');
      return res.send(buffer);
    } else {
      console.log('Processing text response from PubChem');
      const text = await response.text();
      console.log('PubChem text response:', text.substring(0, 500) + '...');
      return res.send(text);
    }
  } catch (error) {
    console.error('PubChem proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy PubChem request', details: error.message });
  }
});

// Specific PubChem PNG endpoint (legacy)
app.get('/api/pubchem/compound/cid/:cid/record/PNG', async (req, res) => {
  try {
    const { cid } = req.params;
    const { record_type, image_size } = req.query;
    
    // Use the correct URL format for 3D structures
    let url;
    const params = new URLSearchParams();
    
    if (record_type === '3d') {
      url = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/record/PNG`;
      params.append('record_type', '3d');
    } else {
      url = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/PNG`;
      params.append('record_type', '2d');
    }
    
    if (image_size) {
      params.append('image_size', image_size);
    }
    
    // Always set these for better quality
    params.append('image_size', 'large');
    params.append('width', '800');
    params.append('height', '800');
    
    url += `?${params.toString()}`;
    
    console.log('Proxying PubChem request:', url);
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'image/png',
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocsClone/1.0; +http://localhost)',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`PubChem API error: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    console.error('PubChem API error:', error);
    res.status(500).json({
      error: 'Failed to fetch structure from PubChem API',
      details: error.message
    });
  }
});

// We're now handling SDF data in the general PubChem endpoint
// Proxy PubChem API requests - fallback for other endpoints
app.get('/api/pubchem/*', async (req, res) => {
  try {
    const pubchemPath = req.url.replace('/api/pubchem/', '');
    const url = `${PUBCHEM_BASE_URL}/${pubchemPath}`;
    console.log('Fetching from PubChem:', url);

    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocsClone/1.0; +http://localhost)',
        'Cache-Control': 'no-cache'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`PubChem API error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Handle SDF files (chemical structure data)
    if (url.includes('/SDF') || contentType?.includes('chemical/x-mdl-sdfile')) {
      const text = await response.text();
      res.type('chemical/x-mdl-sdfile').send(text);
      return;
    }
    
    // Handle plain text responses
    if (contentType?.includes('text/plain')) {
      const text = await response.text();
      res.type('text').send(text);
      return;
    }

    // For everything else, try to parse as JSON
    try {
      const data = await response.json();
      res.json(data);
    } catch (jsonError) {
      // If JSON parsing fails, return as text
      console.warn('Failed to parse response as JSON, returning as text:', jsonError.message);
      const text = await response.text();
      res.type('text').send(text);
    }
  } catch (error) {
    console.error('PubChem API error:', error);
    res.status(500).json({
      error: 'Failed to fetch from PubChem API',
      details: error.message
    });
  }
});

// Endpoint to generate drawing scripts for physics diagrams
app.post('/api/generate-drawing-script', async (req, res) => {
  try {
    console.log('\n=== Drawing Script Generation Request ===');
    console.log('Request body:', req.body);
    
    const { text, diagramType } = req.body;
    if (!text) {
      console.log('Error: No text provided');
      return res.status(400).json({ error: 'Text is required' });
    }
    if (!diagramType) {
      console.log('Error: No diagram type provided');
      return res.status(400).json({ error: 'Diagram type is required' });
    }

    console.log(`Generating ${diagramType} drawing script for:`, text);
    console.log('API Key present:', process.env.SCALEWAY_API_KEY ? 'Yes' : 'No');

    try {
      // Prepare a prompt based on the diagram type
      let systemPrompt = '';
      
      const basePrompt = `
You are an expert at creating JavaScript canvas drawing code for physics diagrams. 
Given a description of a physics problem or scenario, generate clean JavaScript code that uses the HTML5 Canvas API to draw a clear, accurate diagram.

Your code will be executed in a browser environment where a canvas element is already available.

CRITICAL REQUIREMENTS:
1. ONLY return valid JavaScript code with NO markdown formatting, NO explanation text, and NO code blocks. Your response MUST start with a function declaration.
2. Your code must be clean, efficient, and properly handle the canvas context.
3. Use appropriate colors that CONTRAST WELL with the background - avoid light colors on light backgrounds.
4. CRITICAL: Always place any necessary physics formulas or equations on the LEFT SIDE of the canvas.
5. Do not use external libraries or images.
6. Your code should be self-contained and draw the complete diagram.
7. Do not include any HTML, only JavaScript.
8. Your code will be executed directly, so make sure it's error-free.
9. IMPORTANT: Center all diagram elements properly within the canvas.
10. Use proper scaling to ensure all elements fit within the canvas boundaries.
11. Use clear, readable fonts and appropriate font sizes.
12. Add a title at the top of the diagram describing what is being shown.
13. Use consistent styling for similar elements.
14. Include a coordinate system or reference points when appropriate.
15. CRITICAL: Position any explanatory text, legends, or labels DIRECTLY ON the diagram in a way that doesn't obstruct the main elements. ALWAYS place equations on the LEFT SIDE of the diagram.
16. Use the FULL canvas width for the diagram - no side panel is needed.
17. IMPORTANT: Use a color palette with strong contrast - dark colors (like #222, #333, #444) for elements on light backgrounds.
18. For vectors and important elements, use vibrant colors like #d32f2f (red), #1976d2 (blue), #388e3c (green), #7b1fa2 (purple).
19. For text elements, use bold fonts for headers and ensure all text has sufficient contrast with its background.
20. CRITICAL: Make the diagram VERY LARGE and CENTERED in the main diagram area - use at least 90% of the available height and width.
21. Use thicker lines (4-8px) for important elements to ensure visibility.
22. IMPORTANT: Scale all drawing elements much larger than normal - vectors, shapes, and components should be at least 2-3x larger than standard size.
23. Text labels should be larger (18-24px font size) and bold for better visibility.

Your response MUST start with this exact function declaration format:

function draw[DiagramType]Diagram(canvas) {
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
  ctx.fillText('[Title of Physics Diagram]', width/2, 40);
  
  // Set up coordinate system
  const centerX = width/2;
  const centerY = height/2;
  
  // Draw diagram elements centered in canvas
  // Your drawing code here
}

// DO NOT include this line in your response:
// draw[DiagramType]Diagram(canvas);
`;      
      
      if (diagramType === 'force') {
        systemPrompt = basePrompt.replace(/\[DiagramType\]/g, 'Force').replace('[Title of Physics Diagram]', 'Force Diagram Analysis') + 
        '\n\nFor force diagrams, make sure to:\n1. Draw each force as a vector with proper direction and magnitude\n2. Use different colors for different forces\n3. Label each force with its name and value if provided\n4. Include a legend explaining the forces\n5. Show the resultant force if applicable\n6. Ensure all objects are clearly drawn and labeled\n7. CRITICAL: Place all equations and formulas on the LEFT SIDE of the diagram';
      } else if (diagramType === 'circuit') {
        systemPrompt = basePrompt.replace(/\[DiagramType\]/g, 'Circuit').replace('[Title of Physics Diagram]', 'Circuit Diagram Analysis') + 
        '\n\nFor circuit diagrams, make sure to:\n1. Use standard electrical symbols for components\n2. Draw wires as straight lines with 90-degree turns\n3. Label each component with its name and value\n4. Include a legend explaining the components\n5. Show voltage sources, current directions, and resistances\n6. Use different colors for different circuit paths\n7. CRITICAL: Place all equations and formulas on the LEFT SIDE of the diagram';
      } else {
        systemPrompt = basePrompt.replace(/\[DiagramType\]/g, diagramType.charAt(0).toUpperCase() + diagramType.slice(1)).replace('[Title of Physics Diagram]', `${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagram Analysis`) + 
        `\n\nFor ${diagramType} diagrams, make sure to:\n1. Include all relevant physical elements\n2. Use appropriate symbols and notations\n3. Label all important parts\n4. Show relationships between different elements\n5. Include a legend if necessary\n6. Use different colors to distinguish different aspects\n7. CRITICAL: Place all equations and formulas on the LEFT SIDE of the diagram`;
      }
      
      const completion = await client.chat.completions.create({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      console.log('Completion received');
      const scriptContent = completion.choices[0].message.content.trim();
      
      // Log the full raw response for debugging
      console.log('\n=== FULL RAW LLM RESPONSE ===');
      console.log(completion);
      console.log(completion.choices[0].message);
      console.log(completion.choices[0].message.content);
      console.log("----scriptCONTENT-------");
      console.log(scriptContent);
      console.log('\n=== END OF RAW LLM RESPONSE ===');
      
      // Clean up the script (remove markdown code blocks if present)
      let cleanScript = scriptContent;
      
      // Check for markdown code blocks
      if (scriptContent.includes('```javascript')) {
        const codeBlockRegex = /```javascript\n([\s\S]*?)```/;
        const match = scriptContent.match(codeBlockRegex);
        
        if (match && match[1]) {
          cleanScript = match[1].trim();
          console.log('Extracted JavaScript code from markdown code block');
        }
      } else if (scriptContent.includes('```js')) {
        const codeBlockRegex = /```js\n([\s\S]*?)```/;
        const match = scriptContent.match(codeBlockRegex);
        
        if (match && match[1]) {
          cleanScript = match[1].trim();
          console.log('Extracted JavaScript code from js markdown code block');
        }
      } else if (scriptContent.includes('```')) {
        const codeBlockRegex = /```\n([\s\S]*?)```/;
        const match = scriptContent.match(codeBlockRegex);
        
        if (match && match[1]) {
          cleanScript = match[1].trim();
          console.log('Extracted JavaScript code from generic markdown code block');
        }
      }
      
      // If we couldn't extract from code blocks but can identify a function declaration
      if (cleanScript === scriptContent && scriptContent.includes('function draw')) {
        const functionRegex = /(function\s+draw[\w]*\s*\([^)]*\)[\s\S]*)/;
        const match = scriptContent.match(functionRegex);
        
        if (match && match[1]) {
          cleanScript = match[1].trim();
          console.log('Extracted JavaScript code by function declaration');
        }
      }
      
      // Additional safety check - ensure the script starts with a function declaration
      if (!cleanScript.trim().startsWith('function')) {
        console.log('Script does not start with a function declaration, attempting to fix');
        const functionRegex = /(function\s+draw[\w]*\s*\([^)]*\)[\s\S]*)/;
        const match = cleanScript.match(functionRegex);
        
        if (match && match[1]) {
          cleanScript = match[1].trim();
          console.log('Fixed script to start with function declaration');
        } else {
          // If we can't find a function declaration, use the fallback script
          console.log('Could not find function declaration, using fallback script');
          throw new Error('Invalid script format - no function declaration found');
        }
      }
      
      console.log('Generated script length:', cleanScript.length);
      
      // Log the first 200 characters of the script for debugging
      console.log('Script preview:', cleanScript.substring(0, 200) + '...');
      
      res.json({ script: cleanScript });
      console.log('Response sent successfully');
    } catch (aiError) {
      console.error('AI API error:', aiError);
      
      // Generate a simple fallback script
      try {
        console.log('Generating fallback script due to AI error');
        
        // Create a very basic script based on the diagram type
        let fallbackScript = '';
                if (diagramType === 'force') {
          fallbackScript = `
          function drawForceDiagram(canvas) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas and set background
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, width, height);
            
            // Define diagram area (80% of width) and info area (20% of width)
            const diagramWidth = width * 0.8;
            const infoWidth = width * 0.2;
            const diagramCenterX = diagramWidth / 2;
            const centerY = height / 2;
            
            // Draw title
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.fillText('Force Diagram', diagramCenterX, 40);
            
            // Draw object
            ctx.fillStyle = '#1976d2'; // Darker blue for better contrast
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(diagramCenterX - 40, centerY - 40, 80, 80);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('Block', diagramCenterX, centerY + 5);
            
            // Draw force arrow
            const arrowLength = 100;
            const angle = 30; // Default angle in degrees
            const radians = angle * Math.PI / 180;
            
            const arrowX = diagramCenterX + Math.cos(radians) * arrowLength;
            const arrowY = centerY - Math.sin(radians) * arrowLength;
            
            // Draw arrow
            ctx.beginPath();
            ctx.moveTo(diagramCenterX, centerY);
            ctx.lineTo(arrowX, arrowY);
            ctx.strokeStyle = '#d32f2f'; // Darker red
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw arrowhead
            const headLength = 15;
            const angle1 = radians + Math.PI * 0.8;
            const angle2 = radians - Math.PI * 0.8;
            
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - headLength * Math.cos(angle1), arrowY + headLength * Math.sin(angle1));
            ctx.lineTo(arrowX - headLength * Math.cos(angle2), arrowY + headLength * Math.sin(angle2));
            ctx.closePath();
            ctx.fillStyle = '#d32f2f';
            ctx.fill();
            
            // Add side panel background
            ctx.fillStyle = '#eaeaea';
            ctx.fillRect(diagramWidth, 0, infoWidth, height);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.strokeRect(diagramWidth, 0, infoWidth, height);
            
            // Add force label on diagram
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#d32f2f';
            ctx.textAlign = 'center';
            ctx.fillText('F = 20N', arrowX, arrowY - 15);
            
            // Draw angle indicator
            ctx.beginPath();
            ctx.arc(diagramCenterX, centerY, 30, -Math.PI/2, -radians, true);
            ctx.strokeStyle = '#388e3c'; // Darker green
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add angle label
            ctx.fillStyle = '#388e3c';
            ctx.fillText('30°', diagramCenterX + 15, centerY - 15);
            
            // Draw horizontal reference line
            ctx.beginPath();
            ctx.moveTo(diagramCenterX, centerY);
            ctx.lineTo(diagramCenterX + 50, centerY);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Add information text to side panel
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'left';
            ctx.fillText('Diagram Info:', diagramWidth + 10, 30);
            
            // Add detailed information in the side panel
            ctx.font = '16px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText('Type: Force Diagram', diagramWidth + 10, 60);
            ctx.fillText('Mode: Fallback', diagramWidth + 10, 85);
            
            // Add force details
            ctx.font = 'bold 16px Arial';
            ctx.fillText('Forces:', diagramWidth + 10, 120);
            
            // Force legend
            ctx.font = '14px Arial';
            
            // Draw force legend
            ctx.beginPath();
            ctx.moveTo(diagramWidth + 15, 140);
            ctx.lineTo(diagramWidth + 45, 140);
            ctx.strokeStyle = '#d32f2f';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.fillText('Applied Force: 20N', diagramWidth + 50, 145);
            
            // Add description
            ctx.font = 'bold 14px Arial';
            ctx.fillText('Description:', diagramWidth + 10, 180);
            ctx.font = '12px Arial';
            
            // Multi-line description
            const description = 'A 10kg block with a 20N force applied at a 30-degree angle on a frictionless surface.';
            const words = description.split(' ');
            let line = '';
            let y = 200;
            
            for (let i = 0; i < words.length; i++) {
              const testLine = line + words[i] + ' ';
              if (testLine.length * 6 > infoWidth - 20) {
                ctx.fillText(line, diagramWidth + 10, y);
                line = words[i] + ' ';
                y += 20;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, diagramWidth + 10, y);
          }`;
        } else if (diagramType === 'circuit') {
          fallbackScript = `
          function drawCircuitDiagram(canvas) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas and set background
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, width, height);
            
            // Define diagram area (80% of width) and info area (20% of width)
            const diagramWidth = width * 0.8;
            const infoWidth = width * 0.2;
            const diagramCenterX = diagramWidth / 2;
            const centerY = height / 2;
            
            // Draw title
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.fillText('Circuit Diagram', diagramCenterX, 40);
            
            // Draw circuit components
            const startX = diagramCenterX - 200;
            const endX = diagramCenterX + 200;
            const componentSpacing = (endX - startX) / 3;
            
            // Draw connecting wires
            ctx.beginPath();
            ctx.moveTo(startX, centerY);
            ctx.lineTo(endX, centerY);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw battery
            const batteryX = startX + componentSpacing;
            ctx.beginPath();
            ctx.moveTo(batteryX - 15, centerY - 20);
            ctx.lineTo(batteryX - 15, centerY + 20);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(batteryX + 15, centerY - 10);
            ctx.lineTo(batteryX + 15, centerY + 10);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw resistor
            const resistorX = startX + 2 * componentSpacing;
            ctx.beginPath();
            ctx.moveTo(resistorX - 20, centerY);
            ctx.lineTo(resistorX - 15, centerY - 10);
            ctx.lineTo(resistorX - 5, centerY + 10);
            ctx.lineTo(resistorX + 5, centerY - 10);
            ctx.lineTo(resistorX + 15, centerY + 10);
            ctx.lineTo(resistorX + 20, centerY);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add labels
            ctx.font = '14px Arial';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText('Battery (12V)', batteryX, centerY + 50);
            ctx.fillText('Resistor (10Ω)', resistorX, centerY + 50);
            
            // Add side panel background
            ctx.fillStyle = '#eaeaea';
            ctx.fillRect(width * 0.8, 0, width * 0.2, height);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.strokeRect(width * 0.8, 0, width * 0.2, height);
            
            // Draw border around main diagram area
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, width * 0.78, height - 20);
            
            // Draw legend in side panel
            const legendX = width * 0.82;
            const legendY = 80;
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.fillText('Legend:', legendX, legendY);
            
            // Battery legend
            ctx.beginPath();
            ctx.moveTo(legendX, legendY + 20);
            ctx.lineTo(legendX + 10, legendY + 20);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.fillText('Battery', legendX + 20, legendY + 25);
            
            // Resistor legend
            ctx.beginPath();
            ctx.moveTo(legendX, legendY + 40);
            ctx.lineTo(legendX + 10, legendY + 40);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.fillText('Resistor', legendX + 20, legendY + 45);
          }`;
        } else {
          fallbackScript = `
          function draw${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)}Diagram(canvas) {
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas and set background
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, width, height);
            
            // Define diagram area (80% of width) and info area (20% of width)
            const diagramWidth = width * 0.8;
            const infoWidth = width * 0.2;
            const diagramCenterX = diagramWidth / 2;
            const centerY = height / 2;
            
            // Draw title
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.fillText('${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagram', diagramCenterX, 40);
            
            // Draw a simple placeholder
            ctx.beginPath();
            ctx.arc(diagramCenterX, centerY, 150, 0, Math.PI * 2);
            ctx.fillStyle = '#e1e1e1'; // Darker gray for better contrast
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add text
            ctx.font = '20px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText('${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagram', diagramCenterX, centerY);
            
            // Draw explanation text
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('This is a fallback diagram.', diagramCenterX, centerY + 40);
            ctx.fillText('AI-generated diagram was not available.', diagramCenterX, centerY + 70);
            
            // Draw border around main diagram area
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, width * 0.78, height - 20);
            
            // Add side panel background
            ctx.fillStyle = '#eaeaea';
            ctx.fillRect(width * 0.8, 0, width * 0.2, height);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.strokeRect(width * 0.8, 0, width * 0.2, height);
          }`;
        }
        
        console.log('Fallback script generated, length:', fallbackScript.length);
        console.log('Fallback script preview:', fallbackScript.substring(0, 200) + '...');
        res.json({ script: fallbackScript, fallback: true });
      } catch (fallbackError) {
        console.error('Fallback script generation error:', fallbackError);
        res.status(500).json({ error: 'AI service error and fallback generation failed', details: aiError.message });
      }
    }
  } catch (error) {
    console.error('Error generating drawing script:', error);
    res.status(500).json({ error: 'Failed to generate drawing script', details: error.message });
  }
});

app.post('/api/analyze-physics', async (req, res) => {
  try {
    console.log('\n=== Physics Analysis Request ===');
    console.log('Request body:', req.body);
    
    const { text } = req.body;
    if (!text) {
      console.log('Error: No text provided');
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Analyzing physics problem:', text);
    console.log('API Key present:', process.env.SCALEWAY_API_KEY ? 'Yes' : 'No');

    try {
      const completion = await client.chat.completions.create({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          {
            role: 'system',
            content: 'You are a physics expert. Analyze the given physics problem and extract key information. Return ONLY a JSON object with the following fields: problemType (string), objects (array), forces (array), velocities (array), accelerations (array), components (array), and environment (object).'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      console.log('Completion received:', completion);
      const analysis = completion.choices[0].message.content;
      console.log('Analysis:', analysis);
      
      res.json({ analysis });
      console.log('Response sent successfully');
    } catch (aiError) {
      console.error('AI API error:', aiError);
      res.status(500).json({ error: 'AI service error', details: aiError.message });
    }
  } catch (error) {
    console.error('Error analyzing physics problem:', error);
    res.status(500).json({ error: 'Failed to analyze physics problem', details: error.message });
  }
});


app.post('/api/generate', async (req, res) => {
  console.log('\n=== New Request ===');
  console.log('Request body:', req.body);
  
  try {
    const { prompt } = req.body;
    if (!prompt) {
      console.log('Error: No prompt provided');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Setting up SSE response...');
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('Making request to Scaleway...');
    console.log('Prompt:', prompt);
    
    // Get style from prompt or default to formal
    let style = 'formal';
    if (prompt.includes('style=')) {
      style = prompt.split('style=')[1].split('\n')[0].trim().toLowerCase();
    }
    
    // Define system messages for different styles
    const styleMessages = {
      formal: 'You are a writing assistant. Rewrite the given text to be more polished and sophisticated, while keeping the same core meaning. Use refined language but stay true to the original topic. Only return the rewritten version.',
      casual: 'You are a writing assistant. Rewrite the given text in a relaxed, conversational way, while keeping the same core meaning. Make it sound natural but stay true to the original topic. Only return the rewritten version.',
      professional: 'You are a writing assistant. Rewrite the given text to be clear and professional, while keeping the same core meaning. Make it business-appropriate but stay true to the original topic. Only return the rewritten version.',
      concise: 'You are a writing assistant. Rewrite the given text to be brief and direct, while keeping the same core meaning. Remove unnecessary words but stay true to the original topic. Only return the rewritten version.'
    };

    const systemMessage = styleMessages[style] || styleMessages.formal;
    console.log('Using style:', style);
    console.log('System message:', systemMessage);

    const stream = await client.chat.completions.create({
      model: 'deepseek-r1-distill-llama-70b',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt.replace('TEXT:\n', '').replace(/style=\w+\n/, '').trim() }
      ],
      max_tokens: 512,
      temperature: style === 'casual' ? 0.7 : 0.6, // Slightly higher temperature for casual style
      top_p: 0.95,
      presence_penalty: 0,
      stream: true
    });

    console.log('Stream created, sending chunks...');
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        const data = `data: ${JSON.stringify({ text: content })}\n\n`;
        console.log(`Sending chunk ${++chunkCount}:`, data);
        res.write(data);
      }
    }

    console.log('Stream complete, ending response');
    res.end();
  } catch (error) {
    console.error('\n=== Error Details ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

// Podcast generation endpoint
app.post('/api/generate-podcast', async (req, res) => {
  try {
    console.log('\n=== Podcast Generation Request ===')
    console.log('Request body:', req.body);
    
    const { text, options } = req.body;
    
    if (!text) {
      console.log('Error: No text provided');
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Import Gradio client
    const { Client } = await import('@gradio/client');
    
    // Connect to the Hugging Face Space with token
    console.log('Connecting to Hugging Face Space...');
    console.log('Using Hugging Face token:', process.env.REACT_APP_HUGGING_FACE_TOKEN ? 'Present' : 'Missing');
    
    const client = await Client.connect("Bootcampwluu/Podcastfy.ai_demo", {
      hf_token: process.env.REACT_APP_HUGGING_FACE_TOKEN
    });
    console.log('Connected to Hugging Face Space');
    
    // Check if Gemini API key is available
    if (!process.env.REACT_APP_GEMINI_API_KEY) {
      console.error('Gemini API key is required');
      return res.status(400).json({
        error: 'Missing API Key',
        details: 'Gemini API key is required for podcast generation. Please add your Gemini API key to the .env file.'
      });
    }
    
    // Extract options with defaults
    const podcastName = options?.podcastName || 'Generated Podcast';
    const podcastTagline = options?.podcastTagline || 'An AI-generated podcast';
    const wordCount = options?.wordCount || 500;
    const conversationStyle = options?.conversationStyle || 'Casual';
    const roles = options?.roles || 'Host and Guest';
    const rolesParts = roles.split(' and ');
    const rolesPerson1 = rolesParts[0] || 'Host';
    const rolesPerson2 = rolesParts[1] || 'Guest';
    const dialogueStructure = options?.dialogueStructure || 'Conversational';
    // Force TTS model to 'edge' which only requires Gemini API key
    const ttsModel = 'edge';
    const creativityLevel = options?.creativityLevel || 0.7;
    const userInstructions = options?.userInstructions || '';
    
    // Log the options being used
    console.log('Generating podcast with options:', {
      podcastName,
      podcastTagline,
      wordCount,
      conversationStyle,
      rolesPerson1,
      rolesPerson2,
      dialogueStructure,
      ttsModel,
      creativityLevel,
      userInstructions
    });
    
    // Submit the job to the Gradio app using the predict method
    try {
      const result = await client.predict("/process_inputs", { 
        text_input: text, 
        urls_input: "", 
        pdf_files: null, 
        image_files: null, 
        gemini_key: process.env.REACT_APP_GEMINI_API_KEY, 
        openai_key: "", // Not using OpenAI TTS
        elevenlabs_key: "", // Not using ElevenLabs TTS
        word_count: wordCount, 
        conversation_style: conversationStyle, 
        roles_person1: rolesPerson1, 
        roles_person2: rolesPerson2, 
        dialogue_structure: dialogueStructure, 
        podcast_name: podcastName, 
        podcast_tagline: podcastTagline, 
        tts_model: ttsModel, // Already set to 'openai' above
        creativity_level: creativityLevel, 
        user_instructions: userInstructions
      });
      
      console.log('Podcast generation job submitted');
      console.log('Result:', result);
      
      // Check if the result contains an error message
      const resultStr = JSON.stringify(result);
      
      // Check for unusual activity error
      if (resultStr.includes('detected_unusual_activity') || resultStr.includes('Unusual activity detected')) {
        console.error('Hugging Face Space detected unusual activity');
        return res.status(403).json({
          error: 'Hugging Face Space Error',
          details: 'The Hugging Face Space has detected unusual activity and has disabled free tier usage. This may be due to high usage or IP restrictions. You may need to use a different Hugging Face account or wait before trying again.'
        });
      }
      
      // Check for API key errors
      if (resultStr.includes('API key is required') || resultStr.includes('API key')) {
        console.error('API key error detected in response:', resultStr);
        
        // Determine which API key is missing
        let errorMessage = 'Missing API key';
        if (resultStr.includes('OpenAI API key')) {
          errorMessage = 'OpenAI API key is required when using the OpenAI TTS model';
        } else if (resultStr.includes('ElevenLabs API key')) {
          errorMessage = 'ElevenLabs API key is required when using the ElevenLabs TTS model';
        }
        
        // Return error with specific message
        return res.status(400).json({
          error: 'Missing API Key',
          details: `${errorMessage}. Please add the required API key to your .env file.`
        });
      }
      
      // Check if the result already contains the audio URL
      let audioUrl = '';
      
      console.log('Checking for immediate audio URL in result:', JSON.stringify(result, null, 2));
      
      if (result && result.data && result.data.length > 0) {
        // Check if the URL is in the first item's url property
        if (result.data[0] && result.data[0].url) {
          audioUrl = result.data[0].url;
          console.log('Found immediate audio URL in result.data[0].url:', audioUrl);
        } else if (typeof result.data[0] === 'string' && result.data[0].includes('http')) {
          // Sometimes the URL might be directly in the data array as a string
          audioUrl = result.data[0];
          console.log('Found immediate audio URL in result.data[0] as string:', audioUrl);
        }
      }
      
      if (audioUrl) {
        // If we have an audio URL, return it immediately with COMPLETE status
        console.log('Returning immediate COMPLETE status with audio URL');
        res.json({
          taskId: result.task_id || result.id,
          status: 'COMPLETE',
          audioUrl: audioUrl,
          transcript: 'Podcast transcript will be available soon.',
          message: 'Podcast generation completed'
        });
      } else {
        // Otherwise return the job ID and initial status for polling
        console.log('No immediate audio URL found, returning PENDING status for polling');
        res.json({
          taskId: result.task_id || result.id,
          status: 'PENDING',
          message: 'Podcast generation started'
        });
      }
    } catch (predictionError) {
      console.error('Error during prediction:', predictionError);
      
      // Check if the error message contains information about unusual activity
      const errorStr = predictionError.toString();
      if (errorStr.includes('detected_unusual_activity') || errorStr.includes('Unusual activity detected')) {
        return res.status(403).json({
          error: 'Hugging Face Space Error',
          details: 'The Hugging Face Space has detected unusual activity and has disabled free tier usage. This may be due to high usage or IP restrictions. You may need to use a different Hugging Face account or wait before trying again.'
        });
      }
      
      throw predictionError; // Re-throw for the outer catch block to handle
    }
  } catch (error) {
    console.error('Error generating podcast:', error);
    res.status(500).json({ error: 'Failed to generate podcast', details: error.message });
  }
});

// Check podcast status endpoint
app.get('/api/podcast-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('\n=== Checking Podcast Status ===')
    console.log('Task ID:', taskId);
    
    // Import Gradio client
    const { Client } = await import('@gradio/client');
    
    // Connect to the Hugging Face Space with token
    console.log('Connecting to Hugging Face Space...');
    console.log('Using Hugging Face token:', process.env.REACT_APP_HUGGING_FACE_TOKEN ? 'Present' : 'Missing');
    
    const client = await Client.connect("Bootcampwluu/Podcastfy.ai_demo", {
      hf_token: process.env.REACT_APP_HUGGING_FACE_TOKEN
    });
    console.log('Connected to Hugging Face Space');
    
    // Get the status of the task
    const status = await client.status(taskId);
    console.log('Podcast status result:', status);
    
    // If the task is completed, get the outputs
    if (status.status === 'COMPLETED') {
      try {
        const outputs = await client.result(taskId);
        console.log('Podcast outputs:', outputs);
        
        // Extract the relevant data from outputs
        // The structure may vary based on the actual Gradio app output format
        let audioUrl = '';
        let transcript = '';
        
        console.log('Detailed outputs:', JSON.stringify(outputs, null, 2));
        
        if (outputs && outputs.data && outputs.data.length > 0) {
          // Based on the response we received, the audio file is in the first item's url property
          if (outputs.data[0] && outputs.data[0].url) {
            audioUrl = outputs.data[0].url;
            console.log('Extracted audio URL:', audioUrl);
          } else if (typeof outputs.data[0] === 'string' && outputs.data[0].includes('http')) {
            // Sometimes the URL might be directly in the data array as a string
            audioUrl = outputs.data[0];
            console.log('Extracted audio URL from string:', audioUrl);
          }
          
          // For now, we don't have a transcript in the response, so we'll generate a simple one
          transcript = 'Podcast transcript will be available soon.';
        }
        
        // If we still don't have an audio URL, check if the entire outputs object has a direct URL
        if (!audioUrl && outputs && outputs.url) {
          audioUrl = outputs.url;
          console.log('Extracted audio URL from outputs object:', audioUrl);
        }
        
        res.json({
          status: 'COMPLETE',
          audioUrl,
          transcript
        });
      } catch (outputError) {
        console.error('Error getting outputs:', outputError);
        res.json({
          status: 'COMPLETE',
          error: 'Could not retrieve podcast outputs'
        });
      }
    } else if (status.status === 'FAILED') {
      res.json({
        status: 'ERROR',
        error: status.error || 'Podcast generation failed'
      });
    } else {
      // Task is still in progress
      res.json({
        status: 'PROCESSING',
        progress: status.progress || 0
      });
    }
  } catch (error) {
    console.error('Error checking podcast status:', error);
    res.status(500).json({ error: 'Failed to check podcast status', details: error.message });
  }
});

// Add a new endpoint for handling AI questions about document content
app.post('/api/ask-question', async (req, res) => {
  try {
    console.log('\n=== AI Question Request ===');
    const { highlightedText, documentContext, question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // highlightedText can be empty - in that case, we'll just use the document context

    console.log('Question:', question);
    console.log('Highlighted text length:', highlightedText.length);
    console.log('Document context length:', documentContext ? documentContext.length : 0);

    // Create a system message for the AI model
    const systemMessage = 'You are an educational AI assistant that helps students understand their documents and provides helpful information. If the question relates to the provided context, focus your answer on that. If the question is general or the context is insufficient, provide a helpful general answer based on your knowledge.'
    
    // Create a user message based on available context
    let userMessage;
    
    if (highlightedText) {
      // If there's highlighted text, focus on that
      userMessage = `
I need help understanding the following text:

HIGHLIGHTED TEXT:
${highlightedText}

${documentContext ? `FULL DOCUMENT CONTEXT:
${documentContext}` : ''}

My question is: ${question}

If my question cannot be answered based on the provided context, please provide a helpful general answer.
`;
    } else if (documentContext && documentContext.trim().length > 0) {
      // If there's document context but no highlighted text
      userMessage = `
I have a question about the following document:

DOCUMENT CONTEXT:
${documentContext}

My question is: ${question}

If my question cannot be answered based on the provided context, please provide a helpful general answer.
`;
    } else {
      // If there's no context at all, just answer the question directly
      userMessage = `My question is: ${question}

Please provide a helpful and informative answer to this question based on your knowledge.
`;
    }

    // Call the AI API using the existing client
    const completion = await client.chat.completions.create({
      model: 'deepseek-r1-distill-llama-70b',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.95,
      presence_penalty: 0
    });

    const answer = completion.choices[0].message.content;
    console.log('Generated answer length:', answer.length);

    res.json({ answer });
  } catch (error) {
    console.error('Error processing AI question:', error);
    res.status(500).json({ 
      error: 'Failed to process question', 
      details: error.message 
    });
  }
});

app.listen(3001, () => {
  console.log('\n=== Server Started ===');
  console.log('Time:', new Date().toISOString());
  console.log('Port: 3001');
  console.log('Environment:', process.env.NODE_ENV);
});



require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fetch = require('node-fetch');

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



// Proxy PubChem API requests
app.get('/api/pubchem/compound/cid/:cid/record/PNG', async (req, res) => {
  try {
    const { cid } = req.params;
    const { record_type, image_size } = req.query;
    
    let url = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/PNG`;
    const params = new URLSearchParams();
    
    if (record_type === '3d') {
      params.append('record_type', '3d');
    }
    if (image_size) {
      params.append('image_size', image_size);
    }
    
    // Always set these for better quality
    params.append('image_size', 'large');
    params.append('width', '800');
    params.append('height', '800');
    
    url += `?${params.toString()}`;
    
    console.log('Fetching structure from PubChem:', url);
    
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
    if (contentType?.includes('text/plain')) {
      const text = await response.text();
      res.type('text').send(text);
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('PubChem API error:', error);
    res.status(500).json({
      error: 'Failed to fetch from PubChem API',
      details: error.message
    });
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

app.listen(3001, () => {
  console.log('\n=== Server Started ===');
  console.log('Time:', new Date().toISOString());
  console.log('Port: 3001');
  console.log('Environment:', process.env.NODE_ENV);
});

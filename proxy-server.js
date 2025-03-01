require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

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

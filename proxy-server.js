require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const HUGGING_FACE_TOKEN = process.env.REACT_APP_HUGGING_FACE_TOKEN;

if (!HUGGING_FACE_TOKEN) {
  console.error('ERROR: REACT_APP_HUGGING_FACE_TOKEN is not set');
  console.log('Please make sure your .env file contains REACT_APP_HUGGING_FACE_TOKEN=your_token_here');
}
const MODEL = 'google/flan-t5-large';

app.post('/api/generate', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Making request to Hugging Face API...');
    // Construct a better prompt for FLAN-T5
    const enhancedPrompt = `Improve and enhance the following text while maintaining its core meaning. Make it more clear, concise, and professional: ${prompt}`;
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            max_length: 150,
            temperature: 0.3,
            do_sample: true,
            top_p: 0.95
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Hugging Face API error:', response.status, await response.text());
      return res.status(response.status).json({ 
        error: `Hugging Face API error: ${response.status}` 
      });
    }

    const data = await response.json();
    console.log('Received response:', data);
    res.json({ generated_text: data[0].generated_text });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Failed to generate text',
      details: error.message 
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log('Using Hugging Face token:', HUGGING_FACE_TOKEN ? 'Present' : 'Missing');
});

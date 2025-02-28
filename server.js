const express = require('express');
const { HfInference } = require('@huggingface/inference');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Hugging Face client
const hf = new HfInference(process.env.REACT_APP_HUGGING_FACE_TOKEN);

app.post('/api/rewrite', async (req, res) => {
  try {
    const { text, style } = req.body;
    const prompt = `${style}\n${text}`;
    
    const response = await hf.textGeneration({
      model: 'google/flan-t5-base',
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1,
        return_full_text: false
      }
    });

    res.json({ generated_text: response.generated_text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

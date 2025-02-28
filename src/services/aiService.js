import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face with your API token
const hf = new HfInference(process.env.REACT_APP_HUGGING_FACE_TOKEN);

// Using a smaller, more suitable model for text generation
const MODEL = 'facebook/opt-350m';

export const generateAIResponse = async (prompt) => {
  try {
    const response = await hf.textGeneration({
      model: MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1
      }
    });

    return response.generated_text.trim();
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI response');
  }
};

export const rewriteText = async (text, style = 'formal') => {
  const stylePrompts = {
    formal: 'Rewrite this in a formal, professional manner:',
    casual: 'Rewrite this in a casual, friendly tone:',
    professional: 'Rewrite this in a business-appropriate style:',
    concise: 'Rewrite this more concisely:'
  };

  const prompt = `${stylePrompts[style] || stylePrompts.formal}
"${text}"

Rewritten version:"`;

  const response = await generateAIResponse(prompt);
  // Clean up the response by removing quotes and extra whitespace
  return response.replace(/^"|"$/g, '').trim();
};

export const improveWriting = async (text) => {
  const prompt = `
    Improve the following text to make it more professional and clear:
    "${text}"
    
    Improved version:
  `;
  return generateAIResponse(prompt);
};

export const suggestEdits = async (text) => {
  const prompt = `
    Analyze the following text and suggest improvements:
    "${text}"
    
    Suggestions:
  `;
  return generateAIResponse(prompt);
};

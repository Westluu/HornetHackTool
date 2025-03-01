export const generateAIResponse = async (prompt) => {
  try {
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.generated_text.trim();
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI response');
  }
};

export const rewriteText = async (text, style = 'formal') => {
  const stylePrompts = {
    formal: 'INSTRUCTION: Rewrite this text once in a formal style. Keep the exact same meaning.\nRULES:\n- Output only the rewritten version\n- No explanations or multiple versions\n- Keep all subjects (e.g. "the dog") exactly the same\n- Match the original length\n\nTEXT:',
    casual: 'INSTRUCTION: Rewrite this text once in a casual style. Keep the exact same meaning.\nRULES:\n- Output only the rewritten version\n- No explanations or multiple versions\n- Keep all subjects (e.g. "the dog") exactly the same\n- Match the original length\n\nTEXT:',
    professional: 'INSTRUCTION: Rewrite this text once in a professional style. Keep the exact same meaning.\nRULES:\n- Output only the rewritten version\n- No explanations or multiple versions\n- Keep all subjects (e.g. "the dog") exactly the same\n- Match the original length\n\nTEXT:',
    concise: 'INSTRUCTION: Rewrite this text once more concisely. Keep the exact same meaning.\nRULES:\n- Output only the rewritten version\n- No explanations or multiple versions\n- Keep all subjects (e.g. "the dog") exactly the same\n- Make it shorter while keeping meaning\n\nTEXT:'
  };

  const prompt = `${stylePrompts[style] || stylePrompts.formal}\n${text}\n\nOUTPUT ONE REWRITE:`;

  const response = await generateAIResponse(prompt);
  // Clean up the response by removing any potential prefixes
  const rewrittenText = response.replace(/^[^a-zA-Z0-9]*(Rewritten:|Output:|Here's|The)*/i, '').trim();
  return `Original: ${text}\nRewritten: ${rewrittenText}`;
};

export const improveWriting = async (text) => {
  const prompt = `
    Improve the following text to make it more professional and clear:
    "${text}"
    
    Improved version:`;
  
  const response = await generateAIResponse(prompt);
  return response.replace(/^"|"$/g, '').trim();
};

export const suggestEdits = async (text) => {
  const prompt = `
    Suggest improvements for the following text:
    "${text}"
    
    Suggestions:`;

  const response = await generateAIResponse(prompt);
  return response.replace(/^"|"$/g, '').trim();
};

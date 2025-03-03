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
      if (response.status === 503) {
        throw new Error('AI service is temporarily unavailable. Please try again later.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.generated_text) {
      throw new Error('Invalid response from AI service');
    }
    return data.generated_text.trim();
  } catch (error) {
    console.error('AI generation error:', error);
    throw error; // Preserve the specific error message
  }
};

export const rewriteText = async (text, style = 'formal') => {
  // Create style-specific instructions
  const styleInstructions = {
    'formal': 'Rewrite the following text in a formal, sophisticated tone. Use professional language, maintain proper etiquette, and ensure it is suitable for formal business or academic contexts.',
    'casual': 'Rewrite the following text in a casual, friendly tone. Make it conversational and relaxed, as if speaking to a friend. Use everyday language while keeping it clear and engaging.',
    'professional': 'Rewrite the following text in a clear, business-appropriate tone. Focus on clarity and professionalism. Use direct language that would be suitable for workplace communication.',
    'concise': 'Rewrite the following text to be brief and to the point. Remove any unnecessary words while preserving the key message. Make every word count.'
  };

  const instruction = styleInstructions[style] || styleInstructions['formal'];
  const promptWithStyle = `${instruction}\n\nText to rewrite:\n${text}\n\nRewritten version:`;
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: promptWithStyle })
    });

    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let rewrittenText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      // Process each SSE data line
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            rewrittenText += data.text;
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }

    return rewrittenText.trim();
  } catch (error) {
    console.error('Error rewriting text:', error);
    throw new Error(`Failed to rewrite text: ${error.message}`);
  }
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

export const analyzePhysicsProblem = async (text) => {
  try {
    console.log('Analyzing physics problem:', text);
    const response = await fetch('http://localhost:3001/api/analyze-physics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.analysis) {
      throw new Error('Invalid response from physics analysis service');
    }

    console.log('Physics analysis result:', data.analysis);
    return JSON.parse(data.analysis);
  } catch (error) {
    console.error('Error analyzing physics problem:', error);
    throw new Error('Failed to analyze physics problem');
  }
};

export const askQuestionAboutContent = async (highlightedText, documentContext, question) => {
  try {
    console.log('Asking AI about content:', question);
    console.log('Highlighted text length:', highlightedText ? highlightedText.length : 0);
    console.log('Document context length:', documentContext ? documentContext.length : 0);
    
    // Ensure parameters are at least empty strings, not undefined or null
    const safeHighlightedText = highlightedText || '';
    const safeDocumentContext = documentContext || '';
    
    const response = await fetch('http://localhost:3001/api/ask-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        highlightedText: safeHighlightedText, 
        documentContext: safeDocumentContext, 
        question 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.answer) {
      throw new Error('Invalid response from AI question service');
    }

    console.log('AI answer received');
    return data.answer;
  } catch (error) {
    console.error('Error asking question:', error);
    throw new Error(`Failed to get answer: ${error.message}`);
  }
};

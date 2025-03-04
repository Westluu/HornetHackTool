/**
 * Podcast Service - Handles podcast generation using the proxy server
 */

/**
 * Generate a podcast from text
 * @param {string} text - The text to convert to a podcast
 * @param {Object} options - Podcast generation options
 * @param {string} options.podcastName - The name of the podcast
 * @param {string} options.podcastTagline - The tagline of the podcast
 * @param {number} options.wordCount - The approximate word count for the podcast script
 * @param {string} options.conversationStyle - The style of conversation (Casual, Formal, Educational, etc.)
 * @param {string} options.rolesPerson1 - The role of the first speaker (Host, etc.)
 * @param {string} options.rolesPerson2 - The role of the second speaker (Guest, etc.)
 * @param {string} options.dialogueStructure - The structure of the dialogue (Conversational, Interview, etc.)
 * @param {string} options.ttsModel - The text-to-speech model to use (elevenlabs, openai, etc.)
 * @param {number} options.creativityLevel - The creativity level (0.0 to 1.0)
 * @param {string} options.userInstructions - Additional instructions for the podcast generation
 * @returns {Promise<Object>} - The response from the server
 */
export const generatePodcast = async (text, options = {}) => {
  try {
    console.log('Generating podcast with options:', options);
    
    const response = await fetch('/api/generate-podcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        options,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Special handling for Hugging Face unusual activity error
      if (response.status === 403 && errorData.error === 'Hugging Face Space Error') {
        return {
          status: 'ERROR',
          error: 'Hugging Face Space Error',
          message: errorData.details
        };
      }
      
      throw new Error(errorData.error || 'Failed to generate podcast');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in generatePodcast:', error);
    throw error;
  }
};

/**
 * Check the status of a podcast generation task
 * @param {string} taskId - The ID of the task to check
 * @returns {Promise<Object>} - The status of the task
 */
export const checkPodcastStatus = async (taskId) => {
  try {
    const response = await fetch(`/api/podcast-status/${taskId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check podcast status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in checkPodcastStatus:', error);
    throw error;
  }
};

/**
 * Poll for podcast status until it's complete or an error occurs
 * @param {string} taskId - The ID of the task to poll
 * @param {Function} onStatusUpdate - Callback function to handle status updates
 * @param {number} interval - Polling interval in milliseconds
 * @param {number} timeout - Maximum time to poll in milliseconds
 * @returns {Promise<void>}
 */
export const pollPodcastStatus = async (taskId, onStatusUpdate, interval = 2000, timeout = 300000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let timeoutId;
    
    const checkStatus = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          clearTimeout(timeoutId);
          reject(new Error('Podcast generation timed out'));
          return;
        }
        
        // Check the status
        const status = await checkPodcastStatus(taskId);
        console.log('Podcast status check result:', status);
        
        // Call the callback with the status
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }
        
        // If the status is complete or error, resolve or reject
        if (status.status === 'COMPLETE') {
          console.log('Podcast generation complete with audio URL:', status.audioUrl);
          resolve(status);
          return;
        } else if (status.status === 'ERROR') {
          console.error('Podcast generation error:', status.error);
          reject(new Error(status.error || 'An error occurred during podcast generation'));
          return;
        }
        
        // Otherwise, schedule another check
        timeoutId = setTimeout(checkStatus, interval);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    };
    
    // Start checking
    checkStatus();
  });
};

// Map Hugging Face status to our status
export const mapPodcastStatus = (hfStatus) => {
  switch (hfStatus) {
    case 'PENDING':
    case 'PROCESSING':
      return 'generating';
    case 'COMPLETE':
      return 'complete';
    case 'ERROR':
      return 'error';
    default:
      return 'idle';
  }
};

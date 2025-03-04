import React from 'react';

/**
 * Modal component for podcast generation
 */
const PodcastModal = ({
  isOpen,
  onClose,
  status,
  progress,
  audioUrl,
  transcript,
  onGeneratePodcast,
  options,
  onOptionsChange
}) => {
  if (!isOpen) return null;

  const handlePodcastNameChange = (e) => {
    onOptionsChange({ ...options, podcastName: e.target.value });
  };

  const handlePodcastTaglineChange = (e) => {
    onOptionsChange({ ...options, podcastTagline: e.target.value });
  };

  const handleWordCountChange = (e) => {
    onOptionsChange({ ...options, wordCount: parseInt(e.target.value) });
  };

  const handleConversationStyleChange = (e) => {
    onOptionsChange({ ...options, conversationStyle: e.target.value });
  };

  // Removed handleRolesChange as we now have direct rolesPerson1 and rolesPerson2 inputs

  const handleDialogueStructureChange = (e) => {
    onOptionsChange({ ...options, dialogueStructure: e.target.value });
  };

  // TTS model is fixed to 'openai'

  const handleCreativityLevelChange = (e) => {
    onOptionsChange({ ...options, creativityLevel: parseFloat(e.target.value) });
  };

  const handleUserInstructionsChange = (e) => {
    onOptionsChange({ ...options, userInstructions: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Generate Podcast</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Generate a podcast from your document content. Choose your preferences below:
            </p>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Podcast Name</label>
              <input
                type="text"
                value={options.podcastName || ''}
                onChange={handlePodcastNameChange}
                placeholder="My Generated Podcast"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Podcast Tagline</label>
              <input
                type="text"
                value={options.podcastTagline || ''}
                onChange={handlePodcastTaglineChange}
                placeholder="A podcast about interesting topics"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Word Count</label>
              <select
                value={options.wordCount || 500}
                onChange={handleWordCountChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="300">Short (~300 words)</option>
                <option value="500">Medium (~500 words)</option>
                <option value="800">Long (~800 words)</option>
                <option value="1200">Very Long (~1200 words)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Conversation Style</label>
              <select
                value={options.conversationStyle || 'Casual'}
                onChange={handleConversationStyleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Educational">Educational</option>
                <option value="Entertaining">Entertaining</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Speaker 1 Role</label>
              <input
                type="text"
                value={options.rolesPerson1 || 'Host'}
                onChange={(e) => onOptionsChange({ ...options, rolesPerson1: e.target.value })}
                placeholder="Host"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Speaker 2 Role</label>
              <input
                type="text"
                value={options.rolesPerson2 || 'Guest'}
                onChange={(e) => onOptionsChange({ ...options, rolesPerson2: e.target.value })}
                placeholder="Guest"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Dialogue Structure</label>
              <select
                value={options.dialogueStructure || 'Conversational'}
                onChange={handleDialogueStructureChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="Conversational">Conversational</option>
                <option value="Interview">Interview</option>
                <option value="Debate">Debate</option>
                <option value="Storytelling">Storytelling</option>
                <option value="Educational">Educational</option>
              </select>
            </div>
            
            {/* TTS Model is fixed to OpenAI */}
            <input type="hidden" value="openai" name="ttsModel" />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Creativity Level: {options.creativityLevel || 0.7}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.creativityLevel || 0.7}
                onChange={handleCreativityLevelChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Additional Instructions (optional)</label>
              <textarea
                value={options.userInstructions || ''}
                onChange={handleUserInstructionsChange}
                placeholder="Any specific instructions for the podcast generation"
                className="w-full p-2 border border-gray-300 rounded-md h-24"
              />
            </div>
            
            <button
              onClick={onGeneratePodcast}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Generate Podcast
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Generating your podcast. This may take a few minutes...
            </p>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-500 text-center">
              {Math.round(progress)}% complete
            </p>
            
            <div className="text-sm text-gray-500 mt-4">
              <p>Note: This process requires a Gemini API key to work properly:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Gemini API Key - for content generation and text-to-speech</li>
              </ul>
              <p className="mt-2">If you haven't set the Gemini API key in your .env file, the podcast generation will fail.</p>
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-4">
            <p className="text-green-600 font-medium">
              Your podcast has been generated successfully!
            </p>
            
            {audioUrl && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Listen to your podcast:</h3>
                <audio
                  controls
                  className="w-full"
                  src={audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
                
                <a
                  href={audioUrl}
                  download="podcast.mp3"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Audio
                </a>
              </div>
            )}
            
            {transcript && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Transcript:</h3>
                <div className="p-3 bg-gray-100 rounded-md max-h-60 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-line">{transcript}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={onGeneratePodcast}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Generate New Podcast
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-red-600 font-medium">
              An error occurred while generating your podcast.
            </p>
            
            <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
              {transcript && transcript.includes('Hugging Face Space Error') ? (
                <div>
                  <p className="text-sm text-red-700 font-semibold">Hugging Face Space Error:</p>
                  <p className="text-sm text-red-700 mt-2">
                    The Hugging Face Space has detected unusual activity and has disabled free tier usage. 
                    This may be due to high usage or IP restrictions.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Possible solutions:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
                    <li>Try again later when usage is lower</li>
                    <li>Use a different Hugging Face account</li>
                    <li>Consider upgrading to a paid Hugging Face account</li>
                  </ul>
                </div>
              ) : transcript && transcript.includes('Missing API Key') ? (
                <div>
                  <p className="text-sm text-red-700 font-semibold">Missing API Key:</p>
                  <p className="text-sm text-red-700 mt-2">
                    ElevenLabs API key is required when using the ElevenLabs TTS model.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    Possible solutions:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
                    <li>Add your ElevenLabs API key to the .env file</li>
                    <li>Switch to the OpenAI TTS model in the options above</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-red-700">This may be due to missing API keys. Please ensure the following API keys are set in your server environment:</p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
                    <li>OpenAI API Key</li>
                    <li>ElevenLabs API Key</li>
                    <li>Gemini API Key</li>
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={onGeneratePodcast}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastModal;

import React, { useState, useEffect, useRef } from 'react';

const AskAIModal = ({ highlightedText, documentContext, onSubmit, onClose }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  // Focus the textarea when the modal opens
  useEffect(() => {
    // Small delay to ensure the DOM is fully rendered
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        console.log('Focused textarea');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Prevent clicks inside the modal from closing it or affecting the editor
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(question);
      setQuestion('');
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose} // Close when clicking the backdrop
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full"
        onClick={handleModalClick} // Prevent clicks from propagating
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Ask AI About Selected Text</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <div className="bg-blue-50 p-3 rounded-lg mb-4 max-h-40 overflow-y-auto">
            <h3 className="font-medium text-blue-800 mb-1">Selected Text:</h3>
            <p className="text-sm text-gray-700">{highlightedText || "No text selected"}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <label htmlFor="ai-question-textarea" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question:
            </label>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => {
                e.stopPropagation();
                setQuestion(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              placeholder="What does this text mean? How does this relate to...?"
              rows={3}
              autoFocus
              required
            />
            
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Ask Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AskAIModal;

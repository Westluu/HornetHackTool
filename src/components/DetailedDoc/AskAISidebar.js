import React, { useState, useEffect, useRef } from 'react';

const AskAISidebar = ({ 
  isOpen, 
  onClose, 
  highlightedText, 
  documentContext, 
  onSubmitQuestion,
  onInsertAnswer 
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Focus the textarea when the sidebar opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!question.trim()) return;
    
    // Add user question to chat history
    setChatHistory(prev => [
      ...prev, 
      { role: 'user', content: question }
    ]);
    
    const currentQuestion = question;
    setQuestion('');
    setLoading(true);
    
    try {
      // Call the API to get an answer
      const answer = await onSubmitQuestion(currentQuestion);
      
      // Add AI response to chat history
      setChatHistory(prev => [
        ...prev, 
        { role: 'ai', content: answer }
      ]);
    } catch (error) {
      console.error('Error submitting question:', error);
      
      // Add error message to chat history
      setChatHistory(prev => [
        ...prev, 
        { role: 'ai', content: `Error: ${error.message || 'Something went wrong'}`, isError: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-[9000] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-blue-600 text-white">
        <h2 className="text-xl font-bold">Ask AI</h2>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200"
          aria-label="Close sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Selected Text (only shown if text is selected) */}
      {highlightedText && (
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <h3 className="font-medium text-blue-800 mb-1">Selected Text:</h3>
          <p className="text-sm text-gray-700 max-h-32 overflow-y-auto">{highlightedText}</p>
        </div>
      )}
      
      {/* Chat History */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>{highlightedText ? 'Ask a question about the selected text' : 'Ask a question about your document'}</p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-100 ml-8' 
                  : message.isError 
                    ? 'bg-red-100 mr-8' 
                    : 'bg-gray-100 mr-8'
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </p>
              <div className="text-sm whitespace-pre-wrap">
                {message.content.split('\n').map((paragraph, i) => (
                  paragraph ? <p key={i} className="mb-2">{paragraph}</p> : <br key={i} />
                ))}
              </div>
              {message.role === 'ai' && !message.isError && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => onInsertAnswer(message.content)}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Insert into Document
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        
        {loading && (
          <div className="bg-gray-100 p-3 rounded-lg mr-8 animate-pulse">
            <p className="text-sm font-medium mb-1">AI Assistant</p>
            <p className="text-sm text-gray-500">Thinking...</p>
          </div>
        )}
      </div>
      
      {/* Question Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              // Submit on Enter (without Shift)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 resize-none"
            placeholder="Ask a question about the selected text..."
            rows={3}
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Ask Question'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskAISidebar;

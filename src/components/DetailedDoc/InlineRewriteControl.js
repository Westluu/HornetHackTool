import React, { useState, useEffect } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const InlineRewriteControl = ({ originalText, rewrittenText, onAccept, onReject }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Add entrance animation after component mounts
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      className={`flex flex-col p-4 bg-white rounded-lg shadow-lg transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } max-w-2xl w-full`}
    >
      <div className="flex items-center mb-3">
        <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
        <span className="text-gray-700 font-medium">AI Rewrite Suggestion</span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Original</div>
          <div className="text-gray-700">{originalText}</div>
        </div>
        
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-sm text-blue-500 mb-1">Rewritten</div>
          <div className="text-gray-700">{rewrittenText}</div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={onReject}
          className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center"
        >
          <FiX className="mr-1" />
          <span>Reject</span>
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors flex items-center"
        >
          <FiCheck className="mr-1" />
          <span>Accept</span>
        </button>
      </div>
    </div>
  );
};

export default InlineRewriteControl;

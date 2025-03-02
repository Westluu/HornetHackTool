import React from 'react';

const LoadingBlock = ({ contentState, block }) => {
  const entity = contentState.getEntity(block.getEntityAt(0));
  const { content } = entity.getData();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px',
      margin: '10px 0',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ marginRight: '10px' }}>
        <div className="loading-spinner" style={{
          width: '20px',
          height: '20px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
      <div style={{ color: '#666' }}>
        {content}
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingBlock;

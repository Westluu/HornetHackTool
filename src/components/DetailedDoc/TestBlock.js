import React from 'react';

const TestBlock = (props) => {
  console.log('TestBlock component rendering with props:', props);
  
  return (
    <div style={{ 
      padding: '20px', 
      margin: '10px 0', 
      backgroundColor: '#f0f8ff', 
      border: '2px solid #4682b4',
      borderRadius: '5px',
      textAlign: 'center'
    }}>
      <h3>Test Atomic Block</h3>
      <p>{props.text || 'This is a test atomic block'}</p>
    </div>
  );
};

export default TestBlock;

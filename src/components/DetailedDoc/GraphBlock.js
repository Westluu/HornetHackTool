import React from 'react';
import DesmosGraph from './DesmosGraph';

const GraphBlock = ({ blockProps }) => {
  if (!blockProps || !blockProps.equation) {
    console.warn('GraphBlock: Missing required props', { blockProps });
    return null;
  }

  const { equation, onRemove } = blockProps;
  
  // No need for additional equation check since we already validated blockProps
  
  return (
    <div className='w-full my-4 relative'>
      <div className='w-3/4 mx-auto bg-white rounded-lg shadow-lg' style={{ height: '300px' }}>
        <DesmosGraph equation={equation} />
        <button
          onClick={onRemove}
          className='absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full hover:bg-red-600 flex items-center justify-center'
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default GraphBlock;

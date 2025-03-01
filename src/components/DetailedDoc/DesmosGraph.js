import React, { useEffect, useRef } from 'react';

const DesmosGraph = ({ equation }) => {
  const graphRef = useRef(null);
  const calculatorRef = useRef(null);

  useEffect(() => {
    if (!equation) {
      console.warn('DesmosGraph received undefined equation');
      return;
    }
    console.log('DesmosGraph mounting with equation:', equation);
    
    const initCalculator = () => {
      if (!graphRef.current || !equation) {
        console.log('Missing ref or equation');
        return;
      }

      try {
        // Clean up previous calculator
        if (calculatorRef.current) {
          calculatorRef.current.destroy();
        }

        // Create new calculator
        const calculator = window.Desmos.GraphingCalculator(graphRef.current, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: false,
          border: false
        });

        // Set equation
        calculator.setExpression({
          id: 'graph1',
          latex: equation,
          color: '#2d70b3'
        });

        calculatorRef.current = calculator;
        console.log('Graph initialized with equation:', equation);
      } catch (error) {
        console.error('Failed to initialize graph:', error);
      }
    };

    // Load Desmos if needed
    if (!window.Desmos) {
      console.log('Loading Desmos script...');
      const script = document.createElement('script');
      script.src = 'https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
      script.onload = () => {
        console.log('Desmos script loaded');
        initCalculator();
      };
      document.head.appendChild(script);
    } else {
      initCalculator();
    }

    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
      }
    };
  }, [equation]);

  return (
    <div 
      ref={graphRef} 
      style={{ 
        width: '100%', 
        height: '300px',
        margin: '10px 0',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    />
  );

};

export default DesmosGraph;

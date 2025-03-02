import { convertFromRaw, convertToRaw, EditorState, Modifier, ContentState, ContentBlock, genKey } from 'draft-js';
import { generateChemicalStructure, generatePhysicsDiagram } from '../../services/scienceService';
import GraphBlock from './GraphBlock';
import CanvasBlock from './CanvasBlock';
import TestBlock from './TestBlock';
import LoadingBlock from './LoadingBlock';
import { useEffect, useState } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { useParams } from 'react-router-dom';
import { getDocument, saveDocument } from '../../services/localStorageService';
import { rewriteText } from '../../services/aiService';

import SelectionToolbar from './SelectionToolbar';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [toolbarPosition, setToolbarPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [graphBlocks, setGraphBlocks] = useState({});

  const customBlockRenderer = (block) => {
    console.log('TextEditor: customBlockRenderer called for block:', block.getKey(), 'type:', block.getType());
    
    if (block.getType() === 'atomic') {
      console.log('TextEditor: Rendering atomic block:', block.getKey());
      const contentState = editorState.getCurrentContent();
      const entityKey = block.getEntityAt(0);
      
      console.log('TextEditor: Entity key for block:', entityKey);
      
      if (!entityKey) {
        console.warn('TextEditor: No entity key found for atomic block');
        return null;
      }
      
      const entity = contentState.getEntity(entityKey);
      const entityData = entity.getData();
      console.log('TextEditor: Entity data:', entityData);
      console.log('TextEditor: Entity type:', entity.getType());
      
      if (entityData.type === 'loading') {
        return {
          component: LoadingBlock,
          editable: false,
          props: {
            contentState,
            block
          }
        };
      } else if (entity.getType() === 'IMAGE_BLOCK' || entityData.type === 'image') {
        return {
          component: GraphBlock,
          editable: false,
          props: {
            src: entityData.url,
            alt: entityData.alt
          }
        };
      } else if (entity.getType() === 'TEST_BLOCK') {
        console.log('TextEditor: Rendering TEST_BLOCK entity with data:', entityData);
        return {
          component: TestBlock,
          editable: false,
          props: {
            text: entityData.text
          }
        };
      } else if (entityData.type === 'test') {
        console.log('TextEditor: Rendering test block with text:', entityData.text);
        return {
          component: TestBlock,
          editable: false,
          props: {
            text: entityData.text
          }
        };
      } else if (entity.getType() === 'CANVAS_BLOCK' || entityData.type === 'canvas') {
        console.log('TextEditor: Rendering canvas block with rawScript:', entityData.rawScript);
        return {
          component: CanvasBlock,  // Use CanvasBlock for rendering actual canvas diagrams
          editable: false,
          props: {
            executeScript: entityData.executeScript,
            rawScript: entityData.rawScript,
            fallback: entityData.fallback,
            diagramType: entityData.diagramType || 'unknown',
            onRemove: () => handleRemoveCanvasBlock(block.getKey())
          }
        };
      }
    } else if (block.getType() === 'graph') {
      const graphData = graphBlocks[block.getKey()];
      if (!graphData) return null;
      
      return {
        component: GraphBlock,
        editable: false,
        props: {
          blockKey: block.getKey(),
          ...graphData,
          onRemove: () => handleRemoveGraph(block.getKey())
        }
      };
    }
    return null;
  };

  const { id } = useParams();

  useEffect(() => {
    const loadContent = async () => {
      try {
        const doc = await getDocument(id);
        if (doc?.content) {
          setEditorState(
            EditorState.createWithContent(convertFromRaw(doc.content))
          );
        }
      } catch (error) {
        console.error('Error loading document content:', error);
      }
    };

    if (id) {
      loadContent();
    }
  }, [id]);

  const handleScienceDiagram = async (field, type) => {
    try {
      console.log('handleScienceDiagram called with:', field, type);
      setError(null);
      setLoading(true);
      
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      let selectedText = getSelectedText(contentState, selection);
      console.log('Selected text:', selectedText);

      // If no text is selected, prompt the user for input
      if (!selectedText) {
        // For physics diagrams, we can prompt for a description
        if (field.toLowerCase() === 'physics') {
          const promptText = prompt('Enter a description of the physics problem:', 
            'A 10kg block being pulled with a 20N force at a 30-degree angle on a frictionless surface');
          
          if (promptText) {
            selectedText = promptText;
            console.log('User provided text:', selectedText);
          } else {
            throw new Error('Please provide a description of the physics problem');
          }
        } else {
          throw new Error('Please select a chemical formula or diagram description');
        }
      }

      // Start generating the actual diagram
      let result;
      console.log('Generating diagram for field:', field, 'type:', type);
      
      if (field.toLowerCase() === 'chemistry') {
        console.log('Generating chemical structure');
        result = await generateChemicalStructure(selectedText, type.toUpperCase());
      } else if (field.toLowerCase() === 'physics') {
        console.log('Generating physics diagram');
        result = await generatePhysicsDiagram(selectedText, `${type.toUpperCase()}_DIAGRAM`);
        
        // Handle canvas-based diagrams differently
        if (result.type === 'canvas') {
          console.log('TextEditor: Handling canvas diagram with result:', result);
          
          const contentStateWithEntity = contentState.createEntity(
            'CANVAS_BLOCK',
            'IMMUTABLE',
            { type: 'canvas', ...result }
          );
          
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
          console.log('TextEditor: Created entity with key:', entityKey);
          
          // First, preserve the selected text by not replacing it
          // Move the selection to the end of the selected text
          const selectionAtEnd = selection.merge({
            anchorOffset: selection.getEndOffset(),
            focusOffset: selection.getEndOffset(),
            isBackward: false
          });
          
          // Insert a new line after the selected text
          const contentStateWithNewLine = Modifier.splitBlock(
            contentStateWithEntity,
            selectionAtEnd
          );
          
          // Insert atomic block with the entity
          const contentStateWithBlock = Modifier.setBlockType(
            contentStateWithNewLine,
            contentStateWithNewLine.getSelectionAfter(),
            'atomic'
          );
          
          // Set the entity for the atomic block
          const contentStateWithEntity2 = Modifier.replaceText(
            contentStateWithBlock,
            contentStateWithBlock.getSelectionAfter(),
            ' ',
            null,
            entityKey
          );
          
          const newEditorState = EditorState.push(
            editorState,
            contentStateWithEntity2,
            'insert-fragment'
          );

          handleEditorStateChange(newEditorState);
          setToolbarPosition(null);
          setLoading(false);
          return; // Exit early since we've handled the canvas diagram
        }
      } else {
        throw new Error(`Unsupported science field: ${field}`);
      }

      // Create loading block
      const contentStateWithEntity = contentState.createEntity(
        'IMAGE_BLOCK',
        'IMMUTABLE',
        { type: 'image', ...result }
      );
      
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      
      // First, preserve the selected text by not replacing it
      // Move the selection to the end of the selected text
      const selectionAtEnd = selection.merge({
        anchorOffset: selection.getEndOffset(),
        focusOffset: selection.getEndOffset(),
        isBackward: false
      });
      
      // Insert a new line after the selected text
      const contentStateWithNewLine = Modifier.splitBlock(
        contentStateWithEntity,
        selectionAtEnd
      );
      
      // Insert atomic block with the entity
      const contentStateWithBlock = Modifier.setBlockType(
        contentStateWithNewLine,
        contentStateWithNewLine.getSelectionAfter(),
        'atomic'
      );
      
      // Set the entity for the atomic block
      const contentStateWithEntity2 = Modifier.replaceText(
        contentStateWithBlock,
        contentStateWithBlock.getSelectionAfter(),
        ' ',
        null,
        entityKey
      );
      
      const newEditorState = EditorState.push(
        editorState,
        contentStateWithEntity2,
        'insert-fragment'
      );

      handleEditorStateChange(newEditorState);
      setToolbarPosition(null);
    } catch (error) {
      console.error('Science diagram error:', error);
      setError(error.message || 'Failed to generate diagram');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorStateChange = async (newEditorState) => {
    setEditorState(newEditorState);
    
    // Debug: Log all blocks in the editor state
    const contentState = newEditorState.getCurrentContent();
    const blocks = contentState.getBlocksAsArray();
    console.log('TextEditor: Current blocks in editor state:', blocks.map(block => ({
      key: block.getKey(),
      type: block.getType(),
      text: block.getText().substring(0, 20) + (block.getText().length > 20 ? '...' : ''),
      hasEntity: block.getEntityAt(0) !== null
    })));
    
    // Check for text selection
    const selection = newEditorState.getSelection();
    const selectedText = getSelectedText(contentState, selection);

    if (selectedText && !selection.isCollapsed()) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const toolbarHeight = 300; // Approximate height of toolbar

        // If selection is in bottom half of screen, show toolbar above selection
        const isNearBottom = selectionRect.top > windowHeight - toolbarHeight - 100;
        
        setToolbarPosition({
          top: isNearBottom ? selectionRect.top - toolbarHeight - 10 : selectionRect.top + window.scrollY
        });
      }
    } else {
      setToolbarPosition(null);
    }

    // Save document
    try {
      if (id) {
        const existingDoc = await getDocument(id);
        await saveDocument({
          ...existingDoc,
          id,
          content: convertToRaw(newEditorState.getCurrentContent()),
          lastModified: Date.now()
        });
      }
    } catch (error) {
      console.error('Error saving document content:', error);
    }
  };

  

  const getSelectedText = (contentState, selection) => {
    console.log('getSelectedText called with selection:', selection.toJS());
    if (selection.isCollapsed()) {
      console.log('Selection is collapsed, returning empty string');
      return '';
    }

    const startKey = selection.getStartKey();
    const endKey = selection.getEndKey();
    const startBlock = contentState.getBlockForKey(startKey);
    const isStartAndEndBlocksEqual = startKey === endKey;
    const startBlockText = startBlock.getText();
    const startSelectedText = startBlockText.slice(selection.getStartOffset());

    console.log('Start key:', startKey);
    console.log('End key:', endKey);
    console.log('Start block text:', startBlockText);
    console.log('Start offset:', selection.getStartOffset());
    console.log('End offset:', selection.getEndOffset());

    if (isStartAndEndBlocksEqual) {
      const result = startBlockText.slice(
        selection.getStartOffset(),
        selection.getEndOffset()
      );
      console.log('Single block selection, returning:', result);
      return result;
    }

    const endBlock = contentState.getBlockForKey(endKey);
    const endSelectedText = endBlock.getText().slice(0, selection.getEndOffset());

    if (startKey === endKey) {
      console.log('Start and end keys are equal, returning:', startSelectedText);
      return startSelectedText;
    }

    let selectedText = startSelectedText + '\n';
    let blockKey = contentState.getKeyAfter(startKey);

    while (blockKey && blockKey !== endKey) {
      const currentBlock = contentState.getBlockForKey(blockKey);
      selectedText += currentBlock.getText() + '\n';
      blockKey = contentState.getKeyAfter(blockKey);
    }

    selectedText += endSelectedText;
    console.log('Multi-block selection, returning:', selectedText);
    return selectedText;
  };


  const handleRewrite = async (style) => {
    try {
      setError(null);
      setLoading(true);
      
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      const selectedText = getSelectedText(contentState, selection);

      if (!selectedText) return;


      const rewrittenText = await rewriteText(selectedText, style);
      
      if (rewrittenText && rewrittenText !== selectedText) {
        const newContentState = Modifier.replaceText(
          contentState,
          selection,
          rewrittenText
        );

      const newEditorState = EditorState.push(
        editorState,
        newContentState,
        'insert-characters'
      );
      
        handleEditorStateChange(newEditorState);
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      setError(error.message || 'Failed to rewrite text');
    } finally {
      setLoading(false);
      // Only hide toolbar if no error
      if (!error) {
        setToolbarPosition(null);
      }
    }
  };

  //AI Button Component
  const AIButton = () => (
    <button
    style={{
      padding: '5px 10px',
      margin: '5px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
    onClick={() => alert('AI Button!')}
  >
      AI
    </button>
  );
  
  // Physics Diagram Button Component
  // Test function to create a simple atomic block
  const createTestBlock = () => {
    console.log('Creating test atomic block');
    try {
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      
      // Create entity with simple data
      const contentStateWithEntity = contentState.createEntity(
        'TEST_BLOCK',  // Entity type
        'IMMUTABLE',
        { type: 'test', text: 'This is a test atomic block' }
      );
      
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      console.log('Test entity created with key:', entityKey);
      
      // First, preserve the selected text by not replacing it
      // Move the selection to the end of the selected text
      const selectionAtEnd = selection.merge({
        anchorOffset: selection.getEndOffset(),
        focusOffset: selection.getEndOffset(),
        isBackward: false
      });
      
      // Insert a new line after the selected text
      const contentStateWithNewLine = Modifier.splitBlock(
        contentStateWithEntity,
        selectionAtEnd
      );
      
      // Insert atomic block with the entity
      const contentStateWithBlock = Modifier.setBlockType(
        contentStateWithNewLine,
        contentStateWithNewLine.getSelectionAfter(),
        'atomic'
      );
      
      // Set the entity for the atomic block
      const contentStateWithEntity2 = Modifier.replaceText(
        contentStateWithBlock,
        contentStateWithBlock.getSelectionAfter(),
        ' ',
        null,
        entityKey
      );
      
      const newEditorState = EditorState.push(
        editorState,
        contentStateWithEntity2,
        'insert-fragment'
      );
      
      handleEditorStateChange(newEditorState);
      console.log('Test atomic block created successfully');
      alert('Test atomic block created. Check console for logs.');
    } catch (error) {
      console.error('Error creating test block:', error);
      alert('Error creating test block: ' + error.message);
    }
  };
  
  // Test function to create a canvas block directly
  const createTestCanvasBlock = () => {
    console.log('Creating test canvas block');
    try {
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      
      // Create a test script
      const testScript = `function drawTestDiagram(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'lightblue';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Test Diagram', canvas.width/2, canvas.height/2);
      }`;
      
      // Create entity
      const contentStateWithEntity = contentState.createEntity(
        'CANVAS_BLOCK',
        'IMMUTABLE',
        { type: 'canvas', rawScript: testScript, diagramType: 'test' }
      );
      
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      console.log('Test canvas entity created with key:', entityKey);
      
      // First, preserve the selected text by not replacing it
      // Move the selection to the end of the selected text
      const selectionAtEnd = selection.merge({
        anchorOffset: selection.getEndOffset(),
        focusOffset: selection.getEndOffset(),
        isBackward: false
      });
      
      // Insert a new line after the selected text
      const contentStateWithNewLine = Modifier.splitBlock(
        contentStateWithEntity,
        selectionAtEnd
      );
      
      // Insert atomic block with the entity
      const contentStateWithBlock = Modifier.setBlockType(
        contentStateWithNewLine,
        contentStateWithNewLine.getSelectionAfter(),
        'atomic'
      );
      
      // Set the entity for the atomic block
      const contentStateWithEntity2 = Modifier.replaceText(
        contentStateWithBlock,
        contentStateWithBlock.getSelectionAfter(),
        ' ',
        null,
        entityKey
      );
      
      const newEditorState = EditorState.push(
        editorState,
        contentStateWithEntity2,
        'insert-fragment'
      );
      
      handleEditorStateChange(newEditorState);
      console.log('Test canvas block created successfully');
    } catch (error) {
      console.error('Error creating test canvas block:', error);
      alert('Error creating test canvas block: ' + error.message);
    }
  };
  
  const PhysicsDiagramButton = () => (
    <div>
      <button
        style={{
          padding: '5px 10px',
          margin: '5px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => {
          console.log('PhysicsDiagramButton clicked');
          try {
            handleScienceDiagram('physics', 'force');
          } catch (error) {
            console.error('Error in PhysicsDiagramButton click handler:', error);
            alert('Error creating physics diagram: ' + error.message);
          }
        }}
      >
        Physics Diagram
      </button>
      <button
        style={{
          padding: '5px 10px',
          margin: '5px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={createTestCanvasBlock}
      >
        Test Canvas
      </button>
      <button
        style={{
          padding: '5px 10px',
          margin: '5px',
          backgroundColor: '#9b59b6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={createTestBlock}
      >
        Test Block
      </button>
    </div>
  );

  const handleRemoveGraph = (blockKey) => {
    // Remove the graph block from state
    const newGraphBlocks = { ...graphBlocks };
    delete newGraphBlocks[blockKey];
    setGraphBlocks(newGraphBlocks);
  };

  const handleRemoveCanvasBlock = (blockKey) => {
    // Remove the canvas block from the editor state
    const contentState = editorState.getCurrentContent();
    const blocks = contentState.getBlocksAsArray();
    
    // Find the block with the given key
    const blockIndex = blocks.findIndex(block => block.getKey() === blockKey);
    
    if (blockIndex !== -1) {
      // Create a new array without the block to be removed
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex, 1);
      
      // Create a new content state with the updated blocks
      const newContentState = ContentState.createFromBlockArray(newBlocks);
      
      // Push the new content state to the editor
      const newEditorState = EditorState.push(
        editorState,
        newContentState,
        'remove-range'
      );
      
      // Update the editor state
      handleEditorStateChange(newEditorState);
    }
  };

  const handleGraphClick = () => {
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const selectedText = getSelectedText(contentState, selection);
    
    if (selectedText) {
      // Format equation for LaTeX
      let equation = selectedText.trim().replace(/\s+/g, '');
      
      // Add y= if needed
      if (!equation.includes('=')) {
        equation = `y=${equation}`;
      }

      // Format trig functions
      const trigFunctions = ['sin', 'cos', 'tan'];
      trigFunctions.forEach(trig => {
        if (equation.includes(trig + '(')) {
          equation = equation.replace(
            new RegExp(trig + '\\(', 'g'),
            '\\' + trig + '('
          );
        }
      });

      // Create a new block key for the graph
      const graphBlockKey = genKey();
      
      // Store the graph data
      const graphData = { equation, type: 'graph' };
      setGraphBlocks(prev => ({
        ...prev,
        [graphBlockKey]: graphData
      }));
      
      // Split the block at cursor
      let contentStateWithSplit = Modifier.splitBlock(
        contentState,
        selection.merge({
          anchorOffset: selection.getEndOffset(),
          focusOffset: selection.getEndOffset(),
        })
      );

      // Create a new block for the graph
      const graphBlock = new ContentBlock({
        key: graphBlockKey,
        type: 'graph',
        text: ' '
      });

      // Get the block array and insert the graph block
      const blocks = contentStateWithSplit.getBlocksAsArray();
      const blockIndex = blocks.findIndex(block => block.getKey() === selection.getStartKey());
      
      if (blockIndex !== -1) {
        blocks.splice(blockIndex + 1, 0, graphBlock);
        
        // Create new content state with the inserted block
        const finalContentState = ContentState.createFromBlockArray(blocks);

        // Push the new content state
        const newEditorState = EditorState.push(
          editorState,
          finalContentState,
          'insert-fragment'
        );

        handleEditorStateChange(newEditorState);
      } else {
        alert('Could not find insertion point for graph');
      }
    } else {
      alert('Please select an equation to graph');
    }
  };

  return (
    <div className='bg-[#F8F9FA] min-h-screen pb-16 relative'>

      <div className='relative'>
        <Editor
          editorState={editorState}
          onEditorStateChange={handleEditorStateChange}
          toolbarClassName='sticky top-0 z-50 !justify-center'
          editorClassName='bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen'
          toolbarCustomButtons={[
            <AIButton key="ai-button" />, 
            <button key="diagram-button" onClick={handleGraphClick}>Graph</button>,
            <PhysicsDiagramButton key="physics-diagram-button" />
          ]}
          blockRendererFn={customBlockRenderer}
          onBlur={() => console.log('Editor blur event')}
          onFocus={() => console.log('Editor focus event')}
        />

        {/* Selection toolbar */}
        {toolbarPosition && (
          <SelectionToolbar
            position={toolbarPosition}
            onRewrite={handleRewrite}
            onGraph={handleGraphClick}
            onScienceDiagram={handleScienceDiagram}
            loading={loading}
            error={error}
          />
        )}

        {/* Graph handling */}
        {Object.entries(graphBlocks).map(([blockKey, graphData]) => (
          <GraphBlock
            key={blockKey}
            blockKey={blockKey}
            {...graphData}
            onRemove={() => handleRemoveGraph(blockKey)}
          />
        ))}
      </div>
    </div>
  );
};

export default TextEditor;

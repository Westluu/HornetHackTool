import { convertFromRaw, convertToRaw, EditorState, Modifier, ContentState, ContentBlock, genKey } from 'draft-js';
import GraphBlock from './GraphBlock';
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

  const handleEditorStateChange = async (newEditorState) => {
    setEditorState(newEditorState);
    
    // Check for text selection
    const selection = newEditorState.getSelection();
    const contentState = newEditorState.getCurrentContent();
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
    if (selection.isCollapsed()) return '';

    const startKey = selection.getStartKey();
    const endKey = selection.getEndKey();
    const startBlock = contentState.getBlockForKey(startKey);
    const isStartAndEndBlocksEqual = startKey === endKey;
    const startBlockText = startBlock.getText();
    const startSelectedText = startBlockText.slice(selection.getStartOffset());

    if (isStartAndEndBlocksEqual) {
      return startBlockText.slice(
        selection.getStartOffset(),
        selection.getEndOffset()
      );
    }

    const endBlock = contentState.getBlockForKey(endKey);
    const endSelectedText = endBlock.getText().slice(0, selection.getEndOffset());

    if (startKey === endKey) {
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

  const handleRemoveGraph = (blockKey) => {
    // Remove the graph block from state
    const newGraphBlocks = { ...graphBlocks };
    delete newGraphBlocks[blockKey];
    setGraphBlocks(newGraphBlocks);
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

      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorStateChange}
        toolbarClassName='sticky top-0 z-50 !justify-center'
        editorClassName='bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen relative'
        toolbarCustomButtons={[<AIButton key="ai-button" />, 
        <button key="diagram-button" onClick={handleGraphClick}>Graph</button>]}
        blockRendererFn={block => {
          if (block.getType() === 'graph') {
            const graphData = graphBlocks[block.getKey()];
            console.log('Rendering graph block:', block.getKey(), graphData);
            if (!graphData) return null;
            
            return {
              component: GraphBlock,
              editable: false,
              props: {
                blockKey: block.getKey(),
                ...graphData,
                onRemove: () => {
                  // Remove the block from graphBlocks state first
                  setGraphBlocks(prev => {
                    const newBlocks = { ...prev };
                    delete newBlocks[block.getKey()];
                    return newBlocks;
                  });

                  // Then remove the block from editor state
                  const contentState = editorState.getCurrentContent();
                  const selection = editorState.getSelection();
                  const blockMap = contentState.getBlockMap().delete(block.getKey());
                  const newContent = contentState.merge({
                    blockMap,
                    selectionAfter: selection
                  });

                  const newEditorState = EditorState.push(
                    editorState,
                    newContent,
                    'remove-range'
                  );

                  handleEditorStateChange(newEditorState);
                }
              }
            };
          }
          return null;
        }}
     />
      {toolbarPosition && (
        <SelectionToolbar
          position={toolbarPosition}
          onRewrite={handleRewrite}
          onGraph={handleGraphClick}
          loading={loading}
          error={error}
        />
      )}

      {/* Graph handling */}
      {Object.entries(graphBlocks).map(([blockKey, graphData]) => (
        <GraphBlock
          key={blockKey}
          data={graphData}
          onClose={() => handleRemoveGraph(blockKey)}
        />
      ))}
    </div>
  );
};

export default TextEditor;

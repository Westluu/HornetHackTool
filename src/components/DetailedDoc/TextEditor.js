import { convertFromRaw, convertToRaw, EditorState, Modifier, ContentState, ContentBlock, genKey, SelectionState } from 'draft-js';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { useParams } from 'react-router-dom';
import { getDocument, saveDocument } from '../../services/localStorageService';
import { rewriteText, askQuestionAboutContent } from '../../services/aiService';
import { generateChemicalStructure, generatePhysicsDiagram, generate3DChemicalStructure } from '../../services/scienceService';
import { generatePodcast, pollPodcastStatus } from '../../services/podcastService';
import GraphBlock from './GraphBlock';
import CanvasBlock from './CanvasBlock';
import TestBlock from './TestBlock';
import LoadingBlock from './LoadingBlock';
import SelectionToolbar from './SelectionToolbar';
import AIAnswerModal from './AIAnswerModal';
import AskAISidebar from './AskAISidebar';
import AskAIButton from './AskAIButton';
import InlineRewriteControl from './InlineRewriteControl';
import PodcastButton from './PodcastButton';
import PodcastModal from './PodcastModal';

// Simple component for displaying chemical structure images
const ImageBlock = (props) => {
  // Extract src and alt from blockProps or direct props
  const src = props.blockProps?.src || props.src;
  const alt = props.blockProps?.alt || props.alt;
  const onRemove = props.blockProps?.onRemove;
  
  if (!src) {
    console.warn('ImageBlock: Missing src prop', props);
    return null;
  }
  
  return (
    <div className='w-full my-4 flex justify-center relative'>
      <div className='bg-white rounded-lg shadow-lg p-4 text-center'>
        <img src={src} alt={alt || 'Chemical structure'} className='max-w-full' />
        {alt && <p className='mt-2 text-sm text-gray-600'>{alt}</p>}
        
        {/* Delete button */}
        {onRemove && (
          <button
            onClick={onRemove}
            className='absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full hover:bg-red-600 flex items-center justify-center'
            title='Delete chemical structure'
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [toolbarPosition, setToolbarPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [graphBlocks, setGraphBlocks] = useState({});
  const [aiAnswer, setAIAnswer] = useState(null);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [showAskAISidebar, setShowAskAISidebar] = useState(false);
  const [selectedTextForAI, setSelectedTextForAI] = useState('');
  const [inlineRewriteState, setInlineRewriteState] = useState(null);
  
  // Podcast state
  const [isPodcastModalOpen, setIsPodcastModalOpen] = useState(false);
  const [podcastStatus, setPodcastStatus] = useState('idle'); // idle, generating, complete, error
  const [podcastProgress, setPodcastProgress] = useState(0);
  const [podcastAudioUrl, setPodcastAudioUrl] = useState(null);
  const [podcastTranscript, setPodcastTranscript] = useState(null);
  const [podcastOptions, setPodcastOptions] = useState({
    podcastName: 'Generated Podcast',
    podcastTagline: 'An AI-generated podcast based on your document',
    wordCount: 500,
    conversationStyle: 'Casual',
    rolesPerson1: 'Host',
    rolesPerson2: 'Guest',
    dialogueStructure: 'Conversational',
    ttsModel: 'elevenlabs',
    creativityLevel: 0.7,
    userInstructions: ''
  });

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
      } else if ((entity.getType() === 'IMAGE_BLOCK' || entityData.type === 'image') && entityData.type !== 'canvas') {
        // Check if this is a chemical structure image from PubChem
        if (entityData.source === 'pubchem') {
          console.log('Rendering chemical structure from PubChem', entityData);
          const blockProps = {
            src: entityData.url,
            alt: entityData.alt,
            onRemove: () => {
              // Create a new editor state without this atomic block
              try {
                console.log('Removing chemical structure block with key:', block.getKey());
                const content = editorState.getCurrentContent();
                
                // Get the current selection
                const selection = editorState.getSelection();
                
                // Create a selection that targets only this block
                const targetRange = selection.merge({
                  anchorKey: block.getKey(),
                  anchorOffset: 0,
                  focusKey: block.getKey(),
                  focusOffset: block.getLength(),
                });
                
                // Create a new state with the selection targeting the block to remove
                const stateWithSelection = EditorState.forceSelection(editorState, targetRange);
                
                // Remove the selected content (the atomic block)
                const newContent = Modifier.removeRange(
                  content,
                  targetRange,
                  'backward'
                );
                
                // Create the new editor state with the block removed
                const newState = EditorState.push(
                  stateWithSelection,
                  newContent,
                  'remove-range'
                );
                
                // Set the new state
                setEditorState(newState);
                console.log('Chemical structure removed successfully');
              } catch (error) {
                console.error('Error removing chemical structure:', error);
              }
            }
          };
          console.log('ImageBlock props being passed:', blockProps);
          return {
            component: ImageBlock,
            editable: false,
            props: blockProps,
            blockProps: blockProps  // Try passing props both ways
          };
        } else {
          // Use GraphBlock for other types of images/graphs
          const graphProps = {
            src: entityData.url,
            alt: entityData.alt,
            equation: entityData.equation, // For compatibility with GraphBlock
            onRemove: () => {
              // Create a new editor state without this atomic block
              try {
                console.log('Removing graph block with key:', block.getKey());
                const content = editorState.getCurrentContent();
                
                // Get the current selection
                const selection = editorState.getSelection();
                
                // Create a selection that targets only this block
                const targetRange = selection.merge({
                  anchorKey: block.getKey(),
                  anchorOffset: 0,
                  focusKey: block.getKey(),
                  focusOffset: block.getLength(),
                });
                
                // Create a new state with the selection targeting the block to remove
                const stateWithSelection = EditorState.forceSelection(editorState, targetRange);
                
                // Remove the selected content (the atomic block)
                const newContent = Modifier.removeRange(
                  content,
                  targetRange,
                  'backward'
                );
                
                // Create the new editor state with the block removed
                const newState = EditorState.push(
                  stateWithSelection,
                  newContent,
                  'remove-range'
                );
                
                // Set the new state
                setEditorState(newState);
                console.log('Graph removed successfully');
              } catch (error) {
                console.error('Error removing graph:', error);
              }
            }
          };
          return {
            component: GraphBlock,
            editable: false,
            props: graphProps,
            blockProps: graphProps
          };
        }
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
  
  // Add a global event handler to detect clicks in the document
  useEffect(() => {
    // Function to check if an element is part of a 3D diagram or its container
    const isPartOf3DDiagram = (element) => {
      while (element) {
        if (element.getAttribute && (
            element.getAttribute('data-below-3d-diagram') === 'true' ||
            element.getAttribute('data-prevent-diagram-generation') === 'true' ||
            element.getAttribute('data-contains-3d-diagram') === 'true' ||
            element.getAttribute('data-3d-viewer-element') === 'true' ||
            element.getAttribute('data-3d-viewer-child') === 'true' ||
            element.classList.contains('chemical-3d-container') ||
            element.classList.contains('chemical-3d-diagram') ||
            element.classList.contains('chemical-3d-viewer-element') ||
            element.classList.contains('chemical-3d-viewer-child') ||
            element.classList.contains('below-3d-diagram-area')
        )) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };
    
    // Global click handler to detect clicks below 3D diagrams
    const handleGlobalClick = (e) => {
      // Check if the click is within a 3D diagram or its container
      if (isPartOf3DDiagram(e.target)) {
        console.log('Global handler: Click detected within 3D diagram or container');
        // Set global flags to prevent diagram generation
        window.lastClickFromBelowDiagramArea = true;
        window.typingBelowDiagram = true;
        // Mark the event to prevent diagram generation
        e.fromBelowDiagramArea = true;
      } else {
        // Reset the flags when clicking elsewhere
        window.lastClickFromBelowDiagramArea = false;
        window.typingBelowDiagram = false;
      }
    };
    
    // Add the global click handler
    document.addEventListener('click', handleGlobalClick, true);
    
    // Cleanup function
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  // Add a ref to track the last diagram generation time to prevent rapid consecutive generations
  const lastDiagramGenTime = useRef(0);
  
  // Create a ref to track if a diagram generation is in progress
  const isGeneratingDiagramRef = useRef(false);
  
  // Create a ref to store the timeout ID
  const resetTimeoutRef = useRef(null);
  
  const handleScienceDiagram = async (field, type, event) => {
    try {
      console.log('handleScienceDiagram called with:', field, type);
      
      // Check if this is a toolbar-initiated request (either through state or event attributes)
      // Also check for the explicit fromToolbarButton flag
      const isToolbarRequest = diagramRequestedFromToolbar || 
                              (event && event.diagramRequest === true) || 
                              (event && event.fromToolbarButton === true);
      
      // Check if the event has a fromBelowDiagramArea flag or if the global flag is set, which would indicate
      // this is from a click below a diagram - in that case, we should NOT generate a diagram
      if ((event && event.fromBelowDiagramArea) || window.lastClickFromBelowDiagramArea || window.typingBelowDiagram) {
        console.log('Ignoring diagram generation - click was below diagram area or typing below diagram');
        return;
      }
      
      // If this event has the fromToolbarButton flag, skip the element checks
      // This ensures that toolbar button clicks always generate diagrams
      if (!(event && event.fromToolbarButton === true)) {
        // Additional check for elements with data-below-3d-diagram attribute or data-prevent-diagram-generation attribute
        if (event && event.target) {
          let element = event.target;
          while (element) {
            if (element.getAttribute && 
                (element.getAttribute('data-below-3d-diagram') === 'true' || 
                 element.getAttribute('data-prevent-diagram-generation') === 'true' ||
                 element.getAttribute('data-contains-3d-diagram') === 'true' ||
                 element.getAttribute('data-3d-viewer-element') === 'true' ||
                 element.getAttribute('data-3d-viewer-child') === 'true' ||
                 element.classList.contains('chemical-3d-container') ||
                 element.classList.contains('chemical-3d-diagram') ||
                 element.classList.contains('chemical-3d-viewer-element') ||
                 element.classList.contains('chemical-3d-viewer-child') ||
                 element.classList.contains('below-3d-diagram-area'))) {
              console.log('Ignoring diagram generation - click was on or within a 3D diagram or its container');
              return;
            }
            element = element.parentElement;
          }
        }
      } else {
        console.log('Proceeding with diagram generation - explicit toolbar button click detected');
      }
      
      // Only proceed if the diagram was explicitly requested from the toolbar or a toolbar button
      // This prevents diagrams from being generated when clicking in the editor
      if (!isToolbarRequest) {
        console.log('Ignoring diagram generation - not requested from toolbar');
        return Promise.reject(new Error('Diagram generation ignored - not requested from toolbar'));
      }
      
      // Check if we're already generating a diagram to prevent multiple generations
      if (isGeneratingDiagramRef.current) {
        console.log('Diagram generation already in progress, ignoring this request');
        return Promise.reject(new Error('Diagram generation already in progress'));
      }
      
      // Set the flag to indicate we're generating a diagram
      isGeneratingDiagramRef.current = true;
      
      // Reset the diagram request flag immediately to prevent accidental triggering
      setDiagramRequestedFromToolbar(false);
      
      // Prevent rapid consecutive diagram generations (debounce)
      const now = Date.now();
      const timeSinceLastGeneration = now - lastDiagramGenTime.current;
      if (timeSinceLastGeneration < 2000) { // 2 seconds debounce
        console.log(`Ignoring diagram generation request - too soon (${timeSinceLastGeneration}ms since last generation)`);
        isGeneratingDiagramRef.current = false; // Reset the flag
        return Promise.reject(new Error(`Diagram generation ignored - too soon (${timeSinceLastGeneration}ms since last generation)`));
      }
      
      // Update the last generation time
      lastDiagramGenTime.current = now;
      
      setError(null);
      setLoading(true);
      
      // Set flag to prevent toolbar from disappearing
      setIsGeneratingDiagram(true);
      
      // Set a timeout to reset the isGeneratingDiagramRef flag in case of errors
      resetTimeoutRef.current = setTimeout(() => {
        if (isGeneratingDiagramRef.current) {
          console.log('Resetting diagram generation flag after timeout');
          isGeneratingDiagramRef.current = false;
        }
      }, 10000); // 10 second timeout
      
      // Preserve the toolbar position during diagram generation
      // We're setting the isGeneratingDiagram flag instead of using this variable directly
      // const currentToolbarPosition = toolbarPosition;
      
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
      
      // Set a flag to indicate diagram generation is complete at the end
      const completeGeneration = () => {
        console.log('Diagram generation completed, all flags reset');
        // Clear the timeout to prevent memory leaks
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
        
        setLoading(false);
        setIsGeneratingDiagram(false);
        isGeneratingDiagramRef.current = false;
      };
      
      if (field.toLowerCase() === 'chemistry') {
        console.log('Generating chemical structure using PubChem');
        // Check if we need 2D or 3D structure
        if (type.toUpperCase() === '3D') {
          console.log('Generating 3D chemical structure');
          result = await generate3DChemicalStructure(selectedText);
        } else {
          // Default to 2D structure
          console.log('Generating 2D chemical structure');
          result = await generateChemicalStructure(selectedText, '2D');
        }
      } else if (field.toLowerCase() === 'physics') {
        console.log('Generating physics diagram');
        console.log('Physics diagram type:', type);
        console.log('Selected text for physics diagram:', selectedText);
        console.log('Selected text length:', selectedText.length);
        
        try {
          result = await generatePhysicsDiagram(selectedText, `${type.toUpperCase()}_DIAGRAM`);
          console.log('Physics diagram generation result:', result);
          console.log('Result type:', result?.type);
          console.log('Raw script length:', result?.rawScript?.length || 0);
        } catch (physicsError) {
          console.error('Error in generatePhysicsDiagram:', physicsError);
          console.error('Error stack:', physicsError.stack);
          throw physicsError;
        }
        
        // Handle canvas-based diagrams differently
        if (result.type === 'canvas') {
          console.log('TextEditor: Handling canvas diagram with result:', result);
          console.log('Canvas diagram type:', result.diagramType);
          console.log('Raw script available:', !!result.rawScript);
          console.log('Script preview:', result.rawScript?.substring(0, 100) + '...');
          
          console.log('Creating entity for canvas block...');
          const contentStateWithEntity = contentState.createEntity(
            'CANVAS_BLOCK',
            'IMMUTABLE',
            { type: 'canvas', ...result }
          );
          console.log('Entity created successfully');
          
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
          console.log('TextEditor: Created entity with key:', entityKey);
          console.log('Entity data:', contentStateWithEntity.getEntity(entityKey).getData());
          
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
          
          // Create a new editor state with the diagram inserted
          let newEditorState = EditorState.push(
            editorState,
            contentStateWithEntity2,
            'insert-fragment'
          );
          
          // Move the selection to the end of the inserted content and collapse it
          // This ensures no text is selected after diagram insertion
          const finalSelection = newEditorState.getSelection().merge({
            anchorKey: contentStateWithEntity2.getSelectionAfter().getAnchorKey(),
            anchorOffset: contentStateWithEntity2.getSelectionAfter().getAnchorOffset(),
            focusKey: contentStateWithEntity2.getSelectionAfter().getFocusKey(),
            focusOffset: contentStateWithEntity2.getSelectionAfter().getFocusOffset(),
            isBackward: false,
            hasFocus: true
          });
          
          // Apply the collapsed selection
          newEditorState = EditorState.forceSelection(newEditorState, finalSelection);
          
          handleEditorStateChange(newEditorState);
          setToolbarPosition(null);
          completeGeneration();
          return true; // Return success for the promise
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
      
      // Create a new editor state with the diagram inserted
      let newEditorState = EditorState.push(
        editorState,
        contentStateWithEntity2,
        'insert-fragment'
      );
      
      // Move the selection to the end of the inserted content and collapse it
      // This ensures no text is selected after diagram insertion
      const finalSelection = newEditorState.getSelection().merge({
        anchorKey: contentStateWithEntity2.getSelectionAfter().getAnchorKey(),
        anchorOffset: contentStateWithEntity2.getSelectionAfter().getAnchorOffset(),
        focusKey: contentStateWithEntity2.getSelectionAfter().getFocusKey(),
        focusOffset: contentStateWithEntity2.getSelectionAfter().getFocusOffset(),
        isBackward: false,
        hasFocus: true
      });
      
      // Apply the collapsed selection
      newEditorState = EditorState.forceSelection(newEditorState, finalSelection);

      handleEditorStateChange(newEditorState);
      setToolbarPosition(null);
      completeGeneration();
      return true; // Return success for the promise
    } catch (error) {
      console.error('Science diagram error:', error);
      setError(error.message || 'Failed to generate diagram');
      return Promise.reject(error); // Propagate the error for the promise
    } finally {
      // We'll handle cleanup in the completeGeneration function for successful cases
      // Only clean up here for error cases
      if (error) {
        // Clear the timeout to prevent memory leaks
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
        
        setLoading(false);
        
        // Immediately reset the diagram generation flags
        // This prevents any potential issues with the flags staying active
        setIsGeneratingDiagram(false);
        isGeneratingDiagramRef.current = false;
      }
      
      // Log the completion of diagram generation
      console.log('Diagram generation completed, all flags reset');
    }
  };

  // Create a ref for the toolbar to prevent it from disappearing
  const toolbarRef = useRef(null);
  const editorRef = useRef(null);
  
  // Flag to prevent toolbar position reset during science diagram generation
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  
  // Flag to track if a diagram was requested through the toolbar
  const [diagramRequestedFromToolbar, setDiagramRequestedFromToolbar] = useState(false);
  
  // Function to ensure we can type below diagrams
  const ensureTypingBelowDiagrams = useCallback(() => {
    console.log('Ensuring typing below diagrams');
    
    // Get the current editor state
    const contentState = editorState.getCurrentContent();
    const blocks = contentState.getBlocksAsArray();
    
    // Find atomic blocks (diagrams)
    const diagramBlocks = blocks.filter(block => block.getType() === 'atomic');
    
    if (diagramBlocks.length > 0) {
      // Get the last diagram block
      const lastDiagramBlock = diagramBlocks[diagramBlocks.length - 1];
      const lastDiagramIndex = blocks.findIndex(block => block.getKey() === lastDiagramBlock.getKey());
      
      // Check if there's a block after the last diagram
      if (lastDiagramIndex === blocks.length - 1) {
        console.log('No block after the diagram, creating one');
        // No block after the diagram, create one
        const targetKey = lastDiagramBlock.getKey();
        
        // Create a selection at the end of the diagram block
        const newSelection = SelectionState.createEmpty(targetKey).merge({
          anchorOffset: lastDiagramBlock.getLength(),
          focusOffset: lastDiagramBlock.getLength(),
          hasFocus: true,
        });
        
        // Split the block to create a new empty block
        const contentWithSplit = Modifier.splitBlock(contentState, newSelection);
        let newEditorState = EditorState.push(editorState, contentWithSplit, 'split-block');
        
        // Get the new content state and blocks
        const newContentState = newEditorState.getCurrentContent();
        const newBlocks = newContentState.getBlocksAsArray();
        
        // Find the newly created block (it should be the last one)
        const newBlockKey = newBlocks[newBlocks.length - 1].getKey();
        
        // Create a selection at the beginning of the new block
        const finalSelection = SelectionState.createEmpty(newBlockKey).merge({
          anchorOffset: 0,
          focusOffset: 0,
          hasFocus: true,
        });
        
        // Force the selection to the new block
        newEditorState = EditorState.forceSelection(newEditorState, finalSelection);
        
        // Update the editor state
        setEditorState(newEditorState);
        
        // Focus the editor
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
          }
        }, 50);
        
        return true;
      } else {
        // There is a block after the diagram, just move the cursor there
        console.log('Block after diagram exists, moving cursor there');
        const nextBlockKey = blocks[lastDiagramIndex + 1].getKey();
        
        // Create a selection at the beginning of the next block
        const newSelection = SelectionState.createEmpty(nextBlockKey).merge({
          anchorOffset: 0,
          focusOffset: 0,
          hasFocus: true,
        });
        
        // Force the selection to the next block
        const newEditorState = EditorState.forceSelection(editorState, newSelection);
        
        // Update the editor state
        setEditorState(newEditorState);
        
        // Focus the editor
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
          }
        }, 50);
        
        return true;
      }
    }
    
    return false;
  }, [editorState, editorRef]);
  
  // Expose the reset function globally so the 3D viewer can access it
  useEffect(() => {
    // Initialize global flags
    window.typingBelowDiagram = false;
    window.lastClickFromBelowDiagramArea = false;
    
    // Create a global function to reset the diagram request flag
    window.resetDiagramRequestFlag = () => {
      console.log('Global resetDiagramRequestFlag called');
      setDiagramRequestedFromToolbar(false);
    };
    
    // Create a global function to focus the editor and ensure typing below diagrams
    window.focusEditor = () => {
      console.log('Global focusEditor called');
      // Set the global flags
      window.typingBelowDiagram = true;
      window.lastClickFromBelowDiagramArea = true;
      
      // Set a timeout to keep these flags active for a short period
      // This prevents diagram regeneration when clicking below a diagram
      if (window.focusEditorTimeout) {
        clearTimeout(window.focusEditorTimeout);
      }
      
      window.focusEditorTimeout = setTimeout(() => {
        // Don't reset the flags immediately - keep them active for a bit longer
        // This ensures that any click events that might be processed after this
        // still have the flags set
        console.log('Keeping diagram prevention flags active');
        
        // Set another timeout to eventually reset the flags
        setTimeout(() => {
          // Only reset if we're not currently typing below a diagram
          if (!document.querySelector('.below-3d-diagram-area:focus')) {
            console.log('Resetting diagram prevention flags');
            window.typingBelowDiagram = false;
            window.lastClickFromBelowDiagramArea = false;
          }
        }, 1000); // Keep flags active for 1 second after focusing
      }, 500);
      
      // Call our function to ensure we can type below diagrams
      ensureTypingBelowDiagrams();
      
      // Focus the editor
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 50);
    };
    
    // Cleanup
    return () => {
      // Clear any pending timeouts
      if (window.focusEditorTimeout) {
        clearTimeout(window.focusEditorTimeout);
      }
      
      // Remove global variables
      delete window.resetDiagramRequestFlag;
      delete window.focusEditor;
      delete window.focusEditorTimeout;
      delete window.typingBelowDiagram;
      delete window.lastClickFromBelowDiagramArea;
    };
  }, [ensureTypingBelowDiagrams, editorRef]);
  
  // Memoize the function to check if a click is inside the toolbar
  const isClickInsideToolbar = useCallback((event) => {
    return toolbarRef.current && toolbarRef.current.contains(event.target);
  }, []);
  
  // Handle clicks outside the toolbar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If click is outside toolbar and we're not generating a diagram, hide the toolbar
      if (!isClickInsideToolbar(event) && !isGeneratingDiagram) {
        setToolbarPosition(null);
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClickInsideToolbar, isGeneratingDiagram]);
  
  // Global handler to prevent unwanted diagram generation
  useEffect(() => {
    // Function to check if a click is near or on a 3D diagram
    const isClickNear3DDiagram = (event) => {
      // Don't interfere if the click is on a toolbar button
      // Check if the click target or any of its parents have the toolbar button class
      let element = event.target;
      while (element) {
        // Check if this is a toolbar button or inside the selection toolbar
        if (element.classList && (
            element.classList.contains('bg-blue-100') || // Toolbar buttons have this class
            element.getAttribute('data-toolbar-button') === 'true' ||
            (element.getAttribute && element.getAttribute('data-toolbar') === 'true')
          )) {
          console.log('Click detected on toolbar button, allowing diagram generation');
          return false;
        }
        element = element.parentElement;
      }
      
      // Find all 3D diagram containers
      const diagramContainers = document.querySelectorAll('[data-diagram-type="chemical3d"], [data-contains-3d-diagram="true"]');
      
      // Check if click is inside or near any 3D diagram (but not below it)
      for (const container of diagramContainers) {
        const rect = container.getBoundingClientRect();
        
        // Add a buffer zone around the sides and top of the diagram (30px)
        // But don't add buffer below the diagram to allow clicking there for text editing
        const sideBuffer = 30;
        const topBuffer = 30;
        
        if (
          event.clientX >= rect.left - sideBuffer &&
          event.clientX <= rect.right + sideBuffer &&
          event.clientY >= rect.top - topBuffer &&
          event.clientY <= rect.bottom
        ) {
          console.log('Click detected near 3D diagram, preventing diagram generation');
          return true;
        }
      }
      return false;
    };
    
    // Global click handler
    const handleGlobalClick = (event) => {
      // Check if this is a click below a 3D diagram
      let isClickBelowDiagram = false;
      
      // Find all 3D diagram containers
      const diagramContainers = document.querySelectorAll('[data-diagram-type="chemical3d"], [data-contains-3d-diagram="true"]');
      
      // Check if we're clicking in the editor below a 3D diagram
      let element = event.target;
      let isEditorElement = false;
      
      while (element) {
        if (element.classList && element.classList.contains('DraftEditor-root')) {
          isEditorElement = true;
          break;
        }
        element = element.parentElement;
      }
      
      if (isEditorElement) {
        for (const container of diagramContainers) {
          const rect = container.getBoundingClientRect();
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY > rect.bottom &&
            event.clientY < rect.bottom + 50 // Only consider clicks within 50px below the diagram
          ) {
            isClickBelowDiagram = true;
            break;
          }
        }
      }
      
      // If click is below a 3D diagram, handle it specially
      if (isClickBelowDiagram) {
        console.log('Global click handler: Click detected below 3D diagram, ensuring text editing');
        
        // Reset all diagram generation flags
        setDiagramRequestedFromToolbar(false);
        isGeneratingDiagramRef.current = false;
        setIsGeneratingDiagram(false);
        
        // Set a flag directly on the window object to indicate this is a click below a diagram
        // This will be used to prevent diagram generation when clicking below diagrams
        window.lastClickFromBelowDiagramArea = true;
        
        // Set a global flag to indicate we're typing below a diagram
        window.typingBelowDiagram = true;
        
        // Call our function to ensure we can type below diagrams
        ensureTypingBelowDiagrams();
        
        // Focus the editor
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
          }
        }, 50);
        
        return;
      }
      
      // Reset the global flags if we're not clicking below a diagram
      window.typingBelowDiagram = false;
      window.lastClickFromBelowDiagramArea = false;
      
      // If click is near a 3D diagram, ensure diagram flag is reset
      if (isClickNear3DDiagram(event)) {
        // Force reset the diagram request flag
        setDiagramRequestedFromToolbar(false);
      }
    };
    
    // Add global click handler
    document.addEventListener('click', handleGlobalClick, true); // Use capture phase
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [ensureTypingBelowDiagrams, isGeneratingDiagramRef, setDiagramRequestedFromToolbar, setIsGeneratingDiagram]);
  
  const handleEditorStateChange = async (newEditorState) => {
    // Check if we're typing below a diagram (using the global flag)
    if (window.typingBelowDiagram) {
      console.log('Typing below diagram detected, ensuring no diagram generation');
      // Forcefully reset all diagram generation flags
      setDiagramRequestedFromToolbar(false);
      isGeneratingDiagramRef.current = false;
      setIsGeneratingDiagram(false);
    } else {
      // Always reset the diagram request flag when typing or editing content
      // This prevents unwanted diagram generation when typing near diagrams
      setDiagramRequestedFromToolbar(false);
      isGeneratingDiagramRef.current = false;
      setIsGeneratingDiagram(false);
    }
    
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
    
    // Save the document content
    await saveDocumentContent(newEditorState);
    
    // Check if the active element is the toolbar input field
    const isToolbarInputActive = document.activeElement && 
      (document.activeElement.getAttribute('data-toolbar-input') === 'true' ||
       document.activeElement.closest('[data-toolbar-input="true"]'));
    
    // Only update toolbar position if we're not in the middle of generating a diagram
    // and not typing in the toolbar input field
    if (!isGeneratingDiagram && !isToolbarInputActive) {
      // Check for text selection
      const selection = newEditorState.getSelection();
      
      try {
        // Only show the toolbar when there's a selection, but don't automatically generate diagrams
        if (selection && !selection.isCollapsed()) {
          const selectedText = getSelectedText(contentState, selection);
          
          if (selectedText) {
            const domSelection = window.getSelection();
            if (domSelection && domSelection.rangeCount > 0) {
              const selectionRect = domSelection.getRangeAt(0).getBoundingClientRect();
              const windowHeight = window.innerHeight;
              const toolbarHeight = 300; // Approximate height of toolbar

              // If selection is in bottom half of screen, show toolbar above selection
              const isNearBottom = selectionRect.top > windowHeight - toolbarHeight - 100;
              
              setToolbarPosition({
                top: isNearBottom ? selectionRect.top - toolbarHeight - 10 : selectionRect.top + window.scrollY
              });
            }
          }
        } else if (!isToolbarInputActive) {
          // Only hide the toolbar if we're not typing in a toolbar input
          setToolbarPosition(null);
        }
      } catch (error) {
        console.error('Error handling selection:', error);
      }
    }
  };

  // Save document directly in the handleEditorStateChange function
  const saveDocumentContent = async (newEditorState) => {
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
        console.log('Preparing inline rewrite');
        
        // Save the selection information for later use when accepting/rejecting
        const inlineRewriteData = {
          originalText: selectedText,
          rewrittenText: rewrittenText,
          selectionStart: selection.getStartOffset(),
          selectionEnd: selection.getEndOffset(),
          blockKey: selection.getStartKey(),
          timestamp: Date.now()
        };
        
        console.log('Setting inline rewrite state:', inlineRewriteData);
        setInlineRewriteState(inlineRewriteData);
        
        // Hide the toolbar
        setToolbarPosition(null);
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      setError(error.message || 'Failed to rewrite text');
    } finally {
      setLoading(false);
    }
  };

  // Function to open the Ask AI sidebar
  const handleOpenAskAISidebar = () => {
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const highlightedText = getSelectedText(contentState, selection);
    
    // Always hide the selection toolbar when opening the sidebar
    setToolbarPosition(null);
    
    // Set a flag to prevent toolbar from reappearing due to selection changes
    // We'll use the isGeneratingDiagram flag since it already prevents toolbar updates
    setIsGeneratingDiagram(true);
    
    // Set a timeout to reset the flag after the sidebar is fully open
    setTimeout(() => {
      setIsGeneratingDiagram(false);
    }, 300);
    
    // Set the selected text if any, otherwise empty string
    setSelectedTextForAI(highlightedText || '');
    setShowAskAISidebar(true);
  };
  
  // Function to handle asking questions about the selected text
  const handleAskQuestion = async (question) => {
    try {
      setError(null);
      setAskingQuestion(true);
      
      // Get the full document text as additional context
      const contentState = editorState.getCurrentContent();
      const fullText = contentState.getBlockMap()
        .map(block => block.getText())
        .join('\n');
      
      // Call the AI service
      const answer = await askQuestionAboutContent(selectedTextForAI, fullText, question);
      return answer; // Return the answer for the sidebar to display
    } catch (error) {
      console.error('Error asking question:', error);
      throw error; // Throw the error for the sidebar to handle
    } finally {
      setAskingQuestion(false);
    }
  };

  // Function to insert AI answer into the document
  const handleInsertAnswer = (answer) => {
    try {
      // Get the current selection or create one at cursor position
      const selection = editorState.getSelection();
      const contentState = editorState.getCurrentContent();
      
      // If we have highlighted text, we'll place the answer after it
      // Otherwise, we'll insert at the current cursor position
      const selectionAtEnd = selection.merge({
        anchorOffset: selection.getEndOffset(),
        focusOffset: selection.getEndOffset(),
        isBackward: false
      });
      
      // Insert a new line after the selected text or cursor position
      const contentStateWithNewLine = Modifier.splitBlock(
        contentState,
        selectionAtEnd
      );
      
      // Insert the AI answer as regular text
      const contentStateWithAnswer = Modifier.insertText(
        contentStateWithNewLine,
        contentStateWithNewLine.getSelectionAfter(),
        answer
      );
      
      // Create a new editor state with the answer inserted
      let newEditorState = EditorState.push(
        editorState,
        contentStateWithAnswer,
        'insert-text'
      );
      
      // Move the selection to the end of the inserted content
      const finalSelection = newEditorState.getSelection().merge({
        anchorKey: contentStateWithAnswer.getSelectionAfter().getAnchorKey(),
        anchorOffset: contentStateWithAnswer.getSelectionAfter().getAnchorOffset(),
        focusKey: contentStateWithAnswer.getSelectionAfter().getFocusKey(),
        focusOffset: contentStateWithAnswer.getSelectionAfter().getFocusOffset(),
        isBackward: false
      });
      
      // Apply the final selection
      newEditorState = EditorState.forceSelection(newEditorState, finalSelection);
      
      // Update the editor state
      setEditorState(newEditorState);
      
      // Save the document with the inserted answer
      saveDocument(newEditorState);
      
      // Close the sidebar after inserting
      setShowAskAISidebar(false);
    } catch (error) {
      console.error('Error inserting AI answer:', error);
      setError('Failed to insert AI answer into document');
    }
  };


  // Function to handle accepting the inline rewrite
  const handleAcceptRewrite = () => {
    try {
      console.log('Accepting inline rewrite');
      if (!inlineRewriteState) return;
      
      const { blockKey, selectionStart, selectionEnd, rewrittenText } = inlineRewriteState;
      const contentState = editorState.getCurrentContent();
      
      // Create a selection that covers the original text
      const rewriteSelection = SelectionState.createEmpty(blockKey).merge({
        anchorOffset: selectionStart,
        focusOffset: selectionEnd,
        isBackward: false
      });
      
      // Replace the original text with the rewritten text
      const contentStateWithRewrite = Modifier.replaceText(
        contentState,
        rewriteSelection,
        rewrittenText
      );
      
      // Create a new editor state with the rewritten text
      const newEditorState = EditorState.push(
        editorState,
        contentStateWithRewrite,
        'insert-characters'
      );
      
      // Update the editor state
      handleEditorStateChange(newEditorState);
      
      // Clear the inline rewrite state
      setInlineRewriteState(null);
      
      // Save the document with the changes
      saveDocument(newEditorState);
    } catch (error) {
      console.error('Error accepting rewrite:', error);
      setError('Failed to apply rewrite');
      setInlineRewriteState(null);
    }
  };
  
  // Function to handle rejecting the inline rewrite
  const handleRejectRewrite = () => {
    try {
      console.log('Rejecting inline rewrite');
      if (!inlineRewriteState) return;
      
      // Simply clear the inline rewrite state to dismiss the suggestion
      setInlineRewriteState(null);
    } catch (error) {
      console.error('Error rejecting rewrite:', error);
      setError('Failed to reject rewrite');
      setInlineRewriteState(null);
    }
  };

  // Function to close the AI answer modal
  const handleCloseAIAnswer = () => {
    setAIAnswer(null);
  };

  // Handle podcast generation
  const handleGeneratePodcast = async () => {
    try {
      // Get the current content
      const contentState = editorState.getCurrentContent();
      const text = contentState.getPlainText();
      
      if (!text) {
        alert('Document is empty. Please add some content before generating a podcast.');
        return;
      }
      
      // Update status
      setPodcastStatus('generating');
      setPodcastProgress(0);
      
      // Generate podcast
      const result = await generatePodcast(text, podcastOptions);
      console.log('Podcast generation started:', result);
      
      // Check for immediate errors (like Hugging Face unusual activity)
      if (result.status === 'ERROR') {
        console.error('Immediate error in podcast generation:', result.error);
        setPodcastStatus('error');
        setPodcastTranscript(result.error + ': ' + result.message);
        return;
      }
      
      // Start polling for status
      if (result && result.taskId) {
        pollPodcastStatus(
          result.taskId,
          (status) => {
            console.log('Podcast status update:', status);
            
            // Update progress
            if (status.status === 'PROCESSING') {
              const progress = status.progress || 0;
              setPodcastProgress(progress * 100);
            } else if (status.status === 'COMPLETE') {
              setPodcastStatus('complete');
              setPodcastProgress(100);
              
              // Set audio URL and transcript
              if (status.audioUrl) {
                setPodcastAudioUrl(status.audioUrl);
              }
              
              if (status.transcript) {
                setPodcastTranscript(status.transcript);
              }
            } else if (status.status === 'ERROR') {
              setPodcastStatus('error');
              setError(status.error || 'An error occurred during podcast generation');
            }
          },
          5000, // Poll every 5 seconds
          600000 // Timeout after 10 minutes
        ).catch(error => {
          console.error('Podcast polling error:', error);
          setPodcastStatus('error');
          setError(error.message);
        });
      }
    } catch (error) {
      console.error('Error generating podcast:', error);
      setPodcastStatus('error');
      setError(error.message);
    }
  };
  
  // Toggle podcast modal
  const togglePodcastModal = () => {
    setIsPodcastModalOpen(!isPodcastModalOpen);
    
    // Reset state when closing
    if (isPodcastModalOpen) {
      setPodcastStatus('idle');
      setPodcastProgress(0);
      setPodcastAudioUrl(null);
      setPodcastTranscript(null);
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
            setDiagramRequestedFromToolbar(true);
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
          backgroundColor: '#e91e63',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => {
          console.log('3D Chemical Structure button clicked');
          try {
            setDiagramRequestedFromToolbar(true);
            handleScienceDiagram('chemistry', '3D');
          } catch (error) {
            console.error('Error in 3D Chemical Structure click handler:', error);
            alert('Error creating 3D chemical structure: ' + error.message);
          }
        }}
      >
        3D Chemical Structure
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
    console.log('Removing graph with key:', blockKey);
    try {
      // Get the current content state and selection
      const content = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      
      // Create a selection that targets only this block
      const targetRange = selection.merge({
        anchorKey: blockKey,
        anchorOffset: 0,
        focusKey: blockKey,
        focusOffset: content.getBlockForKey(blockKey).getLength(),
      });
      
      // Create a new state with the selection targeting the block to remove
      const stateWithSelection = EditorState.forceSelection(editorState, targetRange);
      
      // Remove the selected content (the atomic block)
      const newContent = Modifier.removeRange(
        content,
        targetRange,
        'backward'
      );
      
      // Create the new editor state with the block removed
      const newState = EditorState.push(
        stateWithSelection,
        newContent,
        'remove-range'
      );
      
      // Set the new state
      setEditorState(newState);
      
      // Also remove from graphBlocks state
      const updatedGraphBlocks = { ...graphBlocks };
      delete updatedGraphBlocks[blockKey];
      setGraphBlocks(updatedGraphBlocks);
      
      console.log('Graph removed successfully');
    } catch (error) {
      console.error('Error removing graph:', error);
      // Fallback to the old method if the new method fails
      try {
        // Remove the graph block from state only
        const newGraphBlocks = { ...graphBlocks };
        delete newGraphBlocks[blockKey];
        setGraphBlocks(newGraphBlocks);
        console.log('Graph removed using fallback method');
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
    }
  };

  const handleRemoveCanvasBlock = (blockKey) => {
    console.log('Removing canvas block with key:', blockKey);
    try {
      // Get the current content state and selection
      const content = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      
      // Create a selection that targets only this block
      const targetRange = selection.merge({
        anchorKey: blockKey,
        anchorOffset: 0,
        focusKey: blockKey,
        focusOffset: content.getBlockForKey(blockKey).getLength(),
      });
      
      // Create a new state with the selection targeting the block to remove
      const stateWithSelection = EditorState.forceSelection(editorState, targetRange);
      
      // Remove the selected content (the atomic block)
      const newContent = Modifier.removeRange(
        content,
        targetRange,
        'backward'
      );
      
      // Create the new editor state with the block removed
      const newState = EditorState.push(
        stateWithSelection,
        newContent,
        'remove-range'
      );
      
      // Set the new state
      setEditorState(newState);
      console.log('Canvas block removed successfully');
    } catch (error) {
      console.error('Error removing canvas block:', error);
      // Fallback to the old method if the new method fails
      try {
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
          setEditorState(newEditorState);
          console.log('Canvas block removed using fallback method');
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
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

  // Calculate the editor container class based on whether the sidebar is open
  const editorContainerClass = showAskAISidebar
    ? 'bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen transition-all duration-300 ease-in-out mr-96'
    : 'bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen transition-all duration-300 ease-in-out';

  return (
    <div className='bg-[#F8F9FA] min-h-screen pb-16 relative'>

      <div className='relative'>
        <Editor
          ref={editorRef}
          editorState={editorState}
          onEditorStateChange={handleEditorStateChange}
          toolbarClassName='sticky top-0 z-50 !justify-center'
          editorClassName={editorContainerClass}
          toolbarCustomButtons={[
            <AIButton key="ai-button" />, 
            <button key="diagram-button" onClick={handleGraphClick}>Graph</button>,
            <PhysicsDiagramButton key="physics-diagram-button" />
          ]}
          blockRendererFn={customBlockRenderer}
          customStyleMap={{
            'REWRITTEN': {
              backgroundColor: 'rgba(173, 216, 230, 0.2)',
              padding: '2px 0',
              borderBottom: '1px solid #add8e6'
            }
          }}
          onBlur={() => console.log('Editor blur event')}
          onFocus={() => console.log('Editor focus event')}
        />

        {/* Selection toolbar */}
        {toolbarPosition && editorState.getSelection() && !editorState.getSelection().isCollapsed() && (
          <SelectionToolbar
            ref={toolbarRef}
            position={toolbarPosition}
            onRewrite={handleRewrite}
            onGraph={handleGraphClick}
            onScienceDiagram={handleScienceDiagram}
            loading={loading || askingQuestion}
            error={error}
            setDiagramRequestedFromToolbar={setDiagramRequestedFromToolbar}
            onAskAI={handleOpenAskAISidebar}
          />
        )}

        {/* Fixed Ask AI Button - Always enabled even when no text is selected */}
        <AskAIButton 
          onClick={handleOpenAskAISidebar}
          disabled={false}
        />

        {/* AI Answer Modal */}
        <AIAnswerModal 
          answer={aiAnswer} 
          onClose={handleCloseAIAnswer} 
        />
        
        {/* Ask AI Sidebar */}
        <AskAISidebar
          isOpen={showAskAISidebar}
          onClose={() => setShowAskAISidebar(false)}
          highlightedText={selectedTextForAI}
          documentContext={editorState.getCurrentContent().getPlainText()}
          onSubmitQuestion={handleAskQuestion}
          onInsertAnswer={handleInsertAnswer}
        />

        {/* Inline Rewrite Control */}
        {inlineRewriteState && (
          <div className="inline-rewrite-container fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl">
            <InlineRewriteControl
              originalText={inlineRewriteState.originalText}
              rewrittenText={inlineRewriteState.rewrittenText}
              onAccept={handleAcceptRewrite}
              onReject={handleRejectRewrite}
            />
          </div>
        )}
        
        {/* Podcast Button */}
        <PodcastButton onClick={togglePodcastModal} />
        
        {/* Podcast Modal */}
        <PodcastModal
          isOpen={isPodcastModalOpen}
          onClose={togglePodcastModal}
          status={podcastStatus}
          progress={podcastProgress}
          audioUrl={podcastAudioUrl}
          transcript={podcastTranscript}
          onGeneratePodcast={handleGeneratePodcast}
          options={podcastOptions}
          onOptionsChange={setPodcastOptions}
        />

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

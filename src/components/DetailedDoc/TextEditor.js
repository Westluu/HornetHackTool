import { convertFromRaw, convertToRaw, EditorState, Modifier } from 'draft-js';
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
      const editorElement = document.querySelector('.rdw-editor-main');
      if (editorElement) {
        const rect = editorElement.getBoundingClientRect();
        setToolbarPosition({
          top: rect.top + window.scrollY + 5,
          left: rect.left + window.scrollX + 10
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
      setLoading(true);
      
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      const selectedText = contentState
        .getBlockForKey(selection.getStartKey())
        .getText()
        .slice(selection.getStartOffset(), selection.getEndOffset());

      if (!selectedText) return;

      const rewrittenText = await rewriteText(selectedText, style);
      
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
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setLoading(false);
      setToolbarPosition(null);
    }
  };



  return (
    <div className='bg-[#F8F9FA] min-h-screen pb-16 relative'>
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorStateChange}
        toolbarClassName='sticky top-0 z-50 !justify-center'
        editorClassName='bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen'
        toolbar={{
          options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'history'],
          inline: {
            options: ['bold', 'italic', 'underline', 'strikethrough'],
          },
        }}
      />
      {toolbarPosition && (
        <SelectionToolbar
          position={toolbarPosition}
          onRewrite={handleRewrite}
          loading={loading}
        />
      )}
    </div>
  );
};

export default TextEditor;

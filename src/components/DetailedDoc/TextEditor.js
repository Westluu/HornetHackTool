import { convertFromRaw, convertToRaw, EditorState } from 'draft-js';
import { useEffect, useState } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { useParams } from 'react-router-dom';
import { getDocument, saveDocument } from '../../services/localStorageService';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());


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

  const handleEditorStateChange = async (editorState) => {
    setEditorState(editorState);
    
    try {
      // Get existing document first
      const existingDoc = await getDocument(id);
      // Update document with new content
      await saveDocument({
        ...existingDoc,
        id,
        content: convertToRaw(editorState.getCurrentContent()),
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Error saving document content:', error);
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

  //Diagram Button Component
  const DiagramButton = () => (
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
    onClick={() => alert('Diagram Button!')}
  >
      Diagram

    </button>
  );

  return (
    <div className='bg-[#F8F9FA] min-h-screen pb-16'>
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorStateChange}
        toolbarClassName='sticky top-0 z-50 !justify-center'
        editorClassName='bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen'
        toolbarCustomButtons={[<AIButton key="custom-button" />, 
        <DiagramButton key="custom-button" />]}
     />
    </div>
  );
};

export default TextEditor;

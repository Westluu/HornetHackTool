import { convertFromRaw, convertToRaw, EditorState } from 'draft-js';
import { doc, updateDoc } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { useParams } from 'react-router-dom';
import { DocsContext } from '../../context/docs/DocsState';
import { db } from '../../firebase';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());

  const { singleDoc } = useContext(DocsContext);

  const { id } = useParams();

  useEffect(() => {
    if (singleDoc?.content) {
      setEditorState(
        EditorState.createWithContent(convertFromRaw(singleDoc.content))
      );
    }
  }, [singleDoc?.content]);

  const handleEditorStateChange = async (editorState) => {
    setEditorState(editorState);

    const docRef = doc(db, 'gdocs', id);

    await updateDoc(docRef, {
      content: convertToRaw(editorState.getCurrentContent()),
    });
  };

  return (
    <div className='bg-[#F8F9FA] min-h-screen pb-16'>
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorStateChange}
        toolbarClassName='sticky top-0 z-50 !justify-center'
        editorClassName='bg-white mt-6 shadow-lg w-3/4 lg:w-3/5 mx-auto p-10 border mb-10 min-h-screen'
      />
    </div>
  );
};

export default TextEditor;

import newDoc from '../../images/newDoc.png';
import { useNavigate } from 'react-router-dom';
import { useContext, useRef, useState } from 'react';
import { AuthContext } from '../../context/auth/AuthState';
import { DocsContext } from '../../context/docs/DocsState';
import { convertToRaw, EditorState } from 'draft-js';
import { generateId, saveDocument } from '../../services/localStorageService';
import mammoth from 'mammoth';

const NewDoc = () => {
  const { user } = useContext(AuthContext);
  const { dispatch } = useContext(DocsContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const uid = user?.uid ? user?.uid : '';
  const navigate = useNavigate();

  const handleNewDoc = async () => {
    try {
      const docId = generateId();
      const editorState = EditorState.createEmpty();
      const newDoc = {
        id: docId,
        userId: uid,
        timestamp: Date.now(),
        title: 'Untitled Document',
        content: convertToRaw(editorState.getCurrentContent()),
      };

      await saveDocument(newDoc);
      
      dispatch({
        type: 'STORE_SINGLE_DOC',
        payload: newDoc,
      });
      
      navigate(`/document/${docId}`);
    } catch (error) {
      console.error('Error creating document: ', error);
      setError('Failed to create new document');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a .docx, .pdf, or .txt file.');
      }

      let fileContent;
      
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Handle .docx files
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        fileContent = result.value;
      } else if (file.type === 'application/pdf') {
        // Handle PDF files
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          let text = '';
          // Get all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map(item => item.str).join(' ') + '\n';
          }
          
          fileContent = text;
        } catch (error) {
          console.error('Error parsing PDF:', error);
          throw new Error('Failed to parse PDF file. Please make sure it is a valid PDF document.');
        }
      } else if (file.type === 'text/plain') {
        // Handle text files
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file);
        });
      } else {
        throw new Error('Unsupported file type. Please upload a .docx, .pdf, or .txt file.');
      }

      // Convert to Draft.js content
      const editorState = EditorState.createWithText(fileContent);
      const rawContent = convertToRaw(editorState.getCurrentContent());

      const docId = generateId();
      const newDoc = {
        id: docId,
        userId: uid,
        timestamp: Date.now(),
        title: file.name,
        originalFileName: file.name,
        fileType: file.type,
        content: rawContent
      };

      // Save the document
      await saveDocument(newDoc);

      // Update local state
      dispatch({
        type: 'STORE_SINGLE_DOC',
        payload: newDoc
      });

      setLoading(false);
      navigate(`/document/${docId}`);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'Failed to upload file');
      setLoading(false);
    }
  };

  const handleExistingDocClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className='p-3 bg-gray-100 container md:px-48 mx-auto flex'>
      <div>
        <p>Start Blank Doc</p>
        <div className='mr-20'>
          <img
            src={newDoc}
            alt='new-doc'
            className='h-[185px] border border-gray-300 cursor-pointer hover:border-primary'
            onClick={handleNewDoc}
          />
        </div>
        <p className='my-3'>Blank</p>
      </div>

      <div>
        <p>Load Existing Doc</p>
        <div className='relative'>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".doc,.docx,.pdf,.txt,application/vnd.google-apps.document"
            className="hidden"
          />
          <img
            src={newDoc}
            alt='new-doc'
            className={`h-[185px] border border-gray-300 cursor-pointer hover:border-primary ${loading ? 'opacity-50' : ''}`}
            onClick={handleExistingDocClick}
          />
          {loading && (
            <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-20'>
              <span className='text-white'>Uploading...</span>
            </div>
          )}
        </div>
        <div className='my-3'>
          <p>{loading ? 'Uploading...' : 'Local Upload'}</p>
          {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
        </div>
      </div>
    </section>
  );
};

export default NewDoc;

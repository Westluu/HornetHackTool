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
        const result = await mammoth.convertToHtml({ arrayBuffer });
        // Convert HTML to plain text while preserving formatting
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.value;
        
        // Replace specific HTML elements with appropriate text formatting
        const paragraphs = tempDiv.getElementsByTagName('p');
        for (let p of paragraphs) {
          p.innerHTML = p.innerHTML.trim() + '\n';
        }
        
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (let h of headings) {
          h.innerHTML = '\n' + h.innerHTML.trim() + '\n';
        }
        
        const lists = tempDiv.querySelectorAll('ul, ol');
        for (let list of lists) {
          const items = list.getElementsByTagName('li');
          for (let item of items) {
            item.innerHTML = '• ' + item.innerHTML.trim() + '\n';
          }
        }
        
        fileContent = tempDiv.innerText.trim();
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
            
            // Process items with their positions
            let lastY, lastX, lastWidth;
            let currentLine = '';
            
            for (const item of textContent.items) {
              if (lastY !== undefined && lastY !== item.transform[5]) {
                // New line detected
                text += currentLine.trim() + '\n';
                currentLine = '';
              }
              
              // Add space if needed
              if (currentLine && item.str !== ' ') {
                const spaceWidth = 4; // Approximate space width
                const gap = Math.abs(item.transform[4] - (lastX + lastWidth));
                if (gap > spaceWidth) {
                  currentLine += ' ';
                }
              }
              
              currentLine += item.str;
              lastY = item.transform[5];
              lastX = item.transform[4];
              lastWidth = item.width;
            }
            
            // Add the last line of the page
            if (currentLine) {
              text += currentLine.trim() + '\n';
            }
            
            // Add extra newline between pages
            text += '\n';
          }
          
          fileContent = text.trim();
        } catch (error) {
          console.error('Error parsing PDF:', error);
          throw new Error('Failed to parse PDF file. Please make sure it is a valid PDF document.');
        }
      } else if (file.type === 'text/plain') {
        // Handle text files
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            // Normalize line endings and handle spacing
            const text = e.target.result
              .replace(/\r\n/g, '\n') // Normalize line endings
              .replace(/\r/g, '\n')
              .replace(/\n\s*\n/g, '\n\n') // Normalize multiple blank lines to just two
              .replace(/\t/g, '    ') // Convert tabs to spaces
              .trim();
            resolve(text);
          };
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

import { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthContext } from '../auth/AuthState';
import { initialState, reducer } from './DocsReducer';
import { getAllDocuments, deleteDocument, saveDocument, getDocument } from '../../services/localStorageService';

export const DocsContext = createContext();

const DocsState = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { user } = useContext(AuthContext);

  const uid = user?.uid ? user?.uid : '';

  // GET THE USER'S DOCS
  useEffect(() => {
    const loadDocuments = async () => {
      if (!uid) return;
      
      try {
        const docs = await getAllDocuments(uid);
        dispatch({ type: 'GET_INITIAL_DOCS', payload: docs });
      } catch (error) {
        console.error('Error loading documents:', error);
      }
    };

    loadDocuments();
  }, [uid]);

  const storeSingleDoc = (doc) => {
    dispatch({ type: 'STORE_SINGLE_DOC', payload: doc });
  };

  // UPDATE DOC!

  const updateDocumentTitle = async (title, id) => {
    try {
      const existingDoc = await getDocument(id);
      if (!existingDoc) throw new Error('Document not found');

      await saveDocument({
        ...existingDoc,
        title,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  // DELETE DOC
  const handleDeleteDocument = async (id) => {
    try {
      await deleteDocument(id);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  return (
    <DocsContext.Provider
      value={{
        ...state,
        deleteDocument: handleDeleteDocument,
        storeSingleDoc,
        updateDocument: updateDocumentTitle,
        dispatch,
      }}
    >
      {children}
    </DocsContext.Provider>
  );
};

export default DocsState;

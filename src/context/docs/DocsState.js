import {
  doc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useReducer } from 'react';
import { colRef, db } from '../../firebase';
import { AuthContext } from '../auth/AuthState';
import { initialState, reducer } from './DocsReducer';

export const DocsContext = createContext();

const DocsState = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { user } = useContext(AuthContext);

  const uid = user?.uid ? user?.uid : '';

  // GET THE USER'S DOCS!

  useEffect(() => {
    const q = query(
      colRef,
      where('authID', '==', uid),
      orderBy('timeStamp', 'desc')
    );
    onSnapshot(q, (snapshpt) => {
      const docList = snapshpt.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      dispatch({ type: 'GET_INITIAL_DOCS', payload: docList });
    });
  }, [uid]);

  const storeSingleDoc = (doc) => {
    dispatch({ type: 'STORE_SINGLE_DOC', payload: doc });
  };

  // UPDATE DOC!

  const updateDocument = async (title, id) => {
    try {
      const docRef = doc(db, 'gdocs', id);
      await updateDoc(docRef, {
        title,
      });
    } catch (error) {
      alert(error);
    }
  };

  // DELETE DOC!

  const deleteDocument = async (id) => {
    try {
      const docRef = doc(db, 'gdocs', id);
      await deleteDoc(docRef);
    } catch (error) {
      alert(error);
    }
  };

  return (
    <DocsContext.Provider
      value={{
        ...state,
        deleteDocument,
        storeSingleDoc,
        updateDocument,
        dispatch,
      }}
    >
      {children}
    </DocsContext.Provider>
  );
};

export default DocsState;

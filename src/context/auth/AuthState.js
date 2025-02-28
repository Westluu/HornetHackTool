import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInWithPopup } from 'firebase/auth';
import { onSnapshot, query, where } from 'firebase/firestore';
import { createContext, useEffect, useReducer } from 'react';
import { auth, colRef, provider } from '../../firebase';
import { initialState, reducer } from './AuthReducer';

export const AuthContext = createContext();

const AuthState = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const uid = state?.user?.uid ? state?.user?.uid : '';

  // USER PERSITENCE!
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch({
          type: 'USER_PERSISTENCE',
          payload: {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            uid: user.uid,
          },
        });
      } else {
        dispatch({ type: 'NO_USER' });
      }
    });
    return () => unsubAuth();
  }, []);

  // GET THE USER'S DOCS!

  useEffect(() => {
    const q = query(colRef, where('authID', '==', uid));
    onSnapshot(q, (snapshpt) => {
      const docList = snapshpt.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      dispatch({ type: 'GET_INITIAL_DOCS', payload: docList });
    });
  }, [uid]);

  // LOGIN!
  const login = async () => {
    try {
      const { user } = await signInWithPopup(auth, provider);
      dispatch({
        type: 'LOGIN',
        payload: {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          uid: user.uid,
        },
      });
    } catch (error) {
      alert(error);
    }
  };

  // LOGOUT!
  const logout = async () => {
    try {
      await signOut(auth);
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      alert(error);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthState;

import newDoc from '../../images/newDoc.png';
import { useNavigate } from 'react-router-dom';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { colRef } from '../../firebase';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/AuthState';
import { DocsContext } from '../../context/docs/DocsState';

const NewDoc = () => {
  const { user } = useContext(AuthContext);
  const { dispatch } = useContext(DocsContext);

  const uid = user?.uid ? user?.uid : '';
  const navigate = useNavigate();

  const handleNewDoc = async () => {
    try {
      const docRef = await addDoc(colRef, {
        authID: uid,
        timeStamp: serverTimestamp(),
        title: 'Untitled Document',
      });
      console.log('Document created with ID: ', docRef.id);
      dispatch({
        type: 'STORE_SINGLE_DOC',
        payload: { title: 'Untitled Document', authID: uid, id: docRef.id },
      });
      navigate(`/document/${docRef.id}`);
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <section className='p-3 bg-gray-100 container md:px-48 mx-auto'>
      <p className='my-4 ml-2'>Start a new document</p>
      <div>
        <img
          src={newDoc}
          alt='new-doc'
          className='h-[185px] border border-gray-300 cursor-pointer hover:border-primary'
          onClick={handleNewDoc}
        />
      </div>
      <p className='my-3'>Blank</p>
    </section>
  );
};

export default NewDoc;

import { useContext, useState, useEffect, useRef } from 'react';
import { DocsContext } from '../../context/docs/DocsState';
import logo from '../../images/logo.png';
import { AuthContext } from '../../context/auth/AuthState';
import { Link } from 'react-router-dom';
import { MdEdit } from 'react-icons/md';

const Header = () => {
  const { singleDoc, updateDocument } = useContext(DocsContext);
  const { user } = useContext(AuthContext);

  const [title, setTitle] = useState(singleDoc?.title);

  useEffect(() => {
    updateDocument(title, singleDoc.id);
    //eslint-disable-next-line
  }, [title, singleDoc.id]);

  const inputRef = useRef(null);

  return (
    <header className='flex justify-between items-center p-3 pb-1 border-b-2'>
      <Link to='/'>
        <img src={logo} alt='logo' className='h-10' />
      </Link>
      <div className='flex-grow px-2'>
        <div className='flex space-x-5'>
          <input
            ref={inputRef}
            type='text'
            className='text-lg font-semibold ml-1 hover:border'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <MdEdit
              className='h-6 w-6 mr-3 text-gray-600 cursor-pointer'
              onClick={() => inputRef.current.focus()}
            />
          </div>
        </div>
      </div>
      <div className='flex items-center'>
        <img
          src={user?.photo}
          alt='account'
          className='h-9 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
        />
      </div>
    </header>
  );
};

export default Header;

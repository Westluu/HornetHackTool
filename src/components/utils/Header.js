import React, { useContext, useState } from 'react';
import { MdApps, MdSearch, MdKeyboardBackspace } from 'react-icons/md';
import { Link } from 'react-router-dom';
import logo from '../../images/logo.png';
import { AuthContext } from '../../context/auth/AuthState';
import AccountModal from '../../components/utils/AccountModal';
import { DocsContext } from '../../context/docs/DocsState';
import AppsModal from './AppsModal';

const Header = ({ searchTerm, setSearchTerm, setResults }) => {
  const { user } = useContext(AuthContext);

  const { docs } = useContext(DocsContext);

  const [toggle, setToggle] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [toggle3, setToggle3] = useState(false);

  return (
    <>
      <nav className='p-3 bg-white shadow-md flex justify-between items-center'>
        {toggle2 ? (
          <div className='bg-gray-100 p-[0.7rem] rounded-md flex items-center w-[75%]'>
            <MdKeyboardBackspace
              className='h-6 w-6 mr-3 text-gray-600'
              onClick={() => {
                setResults(docs);
                setSearchTerm('');
                setToggle2(false);
              }}
            />
            <input
              type='text'
              placeholder='Search'
              className='w-full bg-transparent text-black placeholder:text-gray-600 outline-none'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        ) : (
          <div className='flex items-center ml-3'>
            <Link to='/' className='flex items-center md:ml-1'>
              <img src={logo} alt='logo' className='h-10 hidden md:block' />
              <h3 className='text-[1.4rem] md:ml-2 text-gray-600'>Docs</h3>
            </Link>
          </div>
        )}

        <div className='bg-gray-100 p-[0.7rem] rounded-md md:flex items-center w-[46%] hidden'>
          <MdSearch className='h-6 w-6 mr-3 text-gray-600' />
          <input
            type='text'
            placeholder='Search'
            className='w-full bg-transparent text-black placeholder:text-gray-600 outline-none'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.length > 0 && (
            <button
              onClick={() => {
                setResults(docs);
                setSearchTerm('');
              }}
            >
              cancel
            </button>
          )}
        </div>

        <div className='flex items-center mr-3'>
          {!toggle2 && (
            <MdSearch
              className='h-6 w-6 mr-3 text-gray-500 md:hidden block cursor-pointer'
              onClick={() => setToggle2(!toggle2)}
            />
          )}
          <MdApps
            className='h-6 w-6 mr-5 text-gray-500 cursor-pointer'
            onClick={() => {
              setToggle(false);
              setToggle3(!toggle3);
            }}
          />
          <div
            onClick={() => {
              setToggle(!toggle);
              setToggle3(false);
            }}
          >
            <img
              src={user?.photo}
              alt='account'
              className='h-9 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
            />
          </div>
        </div>
      </nav>
      {toggle && <AccountModal />}
      {toggle3 && <AppsModal />}
    </>
  );
};

export default Header;

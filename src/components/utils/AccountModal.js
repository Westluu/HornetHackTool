import React, { useContext } from 'react';
import { AuthContext } from '../../context/auth/AuthState';

const AccountModal = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className='p-3 text-center shadow-lg bg-white md:w-1/4 absolute border right-5 top-15 rounded-lg'>
      <div className='flex justify-center'>
        <img src={user?.photo} alt='profile' className='my-3 rounded-full' />
      </div>
      <p className='text-xl text-black'>{user?.name}</p>
      <p className='text-gray-500 mb-3 mt-1'>{user?.email}</p>
      <button
        className='bg-primary p-2 px-5 text-white rounded-xl'
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
};

export default AccountModal;

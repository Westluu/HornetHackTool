import React, { useContext } from 'react';
import { AuthContext } from '../../context/auth/AuthState';
import image from '../../images/main-logo.png';

const Login = () => {
  const { login } = useContext(AuthContext);

  return (
    <main className='flex justify-center items-center h-screen flex-col'>
      <img src={image} alt='logo' />
      <button
        className='bg-primary p-2 px-5 text-white rounded-2xl'
        onClick={login}
      >
        Login with Google
      </button>
    </main>
  );
};

export default Login;

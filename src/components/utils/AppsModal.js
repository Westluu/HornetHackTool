import React from 'react';
import gLogo from '../../images/google.png';
import gmLogo from '../../images/gmail.png';
import yLogo from '../../images/youtube.png';

const AppsModal = () => {
  return (
    <div className='p-3 text-center shadow-lg bg-white md:w-1/4 absolute border right-2 top-15 rounded-lg'>
      <h1 className='text-lg'>Other Google Clones</h1>
      <div className='flex items-center justify-center gap-5 my-2'>
        <a
          href='https://google-clone-one-ruddy.vercel.app'
          className='cursor-pointer'
          target='_blank'
          rel='noreferrer'
        >
          <img src={gLogo} alt='google' className='h-12' />
        </a>
        <a
          href='https://react-gmail-clone.netlify.app'
          className='cursor-pointer'
          target='_blank'
          rel='noreferrer'
        >
          <img src={gmLogo} alt='gmail' className='h-10' />
        </a>
        <a
          href='https://yt-dislike-viewer.netlify.app'
          className='cursor-pointer'
          target='_blank'
          rel='noreferrer'
        >
          <img src={yLogo} alt='youtube' className='h-10' />
        </a>
      </div>
    </div>
  );
};

export default AppsModal;

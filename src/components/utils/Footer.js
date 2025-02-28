import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { SiGmail } from 'react-icons/si';

const Footer = ({ id }) => {
  return (
    <footer
      className='bg-primary text-white my-3 p-3 md:p-5 text-center'
      onClick={() => console.log(id)}
    >
      <div className='flex justify-center gap-7'>
        <a href='https://github.com/siemen-subbaiah'>
          <FaGithub className='h-7 w-7' />
        </a>
        <a href='https://www.linkedin.com/in/siemen-subbaiah/'>
          <FaLinkedin className='h-7 w-7' />
        </a>
        <a href='mailto:siemensubbaiah1@gmail.com'>
          <SiGmail className='h-7 w-7' />
        </a>
      </div>
      <p className='text-sm mt-5'>
        {new Date().getFullYear()} Made by siemen subbaiah | {id}
      </p>
    </footer>
  );
};

export default Footer;

import React, { useContext } from 'react';
import { MdDelete, MdTextSnippet } from 'react-icons/md';
import moment from 'moment';
import { DocsContext } from '../../context/docs/DocsState';
import { Link } from 'react-router-dom';

const ListView = ({ doc }) => {
  const { deleteDocument, storeSingleDoc } = useContext(DocsContext);

  const handleDelete = (id) => {
    const prompt = window.confirm('Are you sure you want to delete this?');

    if (prompt) {
      deleteDocument(id);
    }
  };

  return (
    <section className='cursor-pointer' onClick={() => storeSingleDoc(doc)}>
      <div className='flex items-center justify-between my-5'>
        <Link to={`/document/${doc.id}`} className='flex items-center gap-3'>
          <MdTextSnippet className='h-6 w-6 mr-3 text-primary cursor-pointer' />
          <p className='text-md'>{doc?.title}</p>
        </Link>
        <div className='flex items-center gap-20'>
          <p className='text-md text-gray-600 md:block hidden'>
            {moment(doc?.timeStamp?.toDate()).format('DD MMM YYYY')}
          </p>
          <MdDelete
            className='h-6 w-6 mr-3 text-gray-600 cursor-pointer'
            onClick={() => handleDelete(doc.id)}
          />
        </div>
      </div>
      <hr />
    </section>
  );
};

export default ListView;

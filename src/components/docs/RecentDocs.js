import React from 'react';

import ListView from '../docs/ListView';

const RecentDocs = ({ docs }) => {
  return (
    <section className='p-5 container md:px-48 mx-auto'>
      <div className='flex items-center justify-between'>
        <p className='font-semibold mb-5'>Recent documents</p>
      </div>

      {docs?.length === 0 && (
        <p className='text-center text-md'>No recent docs found</p>
      )}

      {docs?.map((doc) => (
        <ListView doc={doc} key={doc.id} />
      ))}
    </section>
  );
};

export default RecentDocs;

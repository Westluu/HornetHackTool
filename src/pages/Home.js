import React, { useContext, useEffect, useState } from 'react';
import Header from '../components/utils/Header';
import Login from '../components/utils/Login';
import NewDoc from '../components/docs/NewDoc';
import RecentDocs from '../components/docs/RecentDocs';
import { AuthContext } from '../context/auth/AuthState';
import { DocsContext } from '../context/docs/DocsState';

const Home = () => {
  const { user } = useContext(AuthContext);
  const { docs } = useContext(DocsContext);

  const [searchTerm, setSearchTerm] = useState('');

  const [results, setResults] = useState([]);

  useEffect(() => {
    const resArr = docs?.filter((doc) =>
      doc.title.toUpperCase().includes(searchTerm.toUpperCase())
    );
    setResults(resArr);
  }, [searchTerm, docs]);

  return (
    <>
      {user ? (
        <>
          <Header
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setResults={setResults}
          />
          <NewDoc />
          <RecentDocs docs={results} />
        </>
      ) : (
        <Login />
      )}
    </>
  );
};

export default Home;

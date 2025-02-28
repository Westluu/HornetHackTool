import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import AuthState from './context/auth/AuthState';
import DocsState from './context/docs/DocsState';
import ModalState from './context/modal/ModalState';

ReactDOM.render(
  <React.StrictMode>
    <ModalState>
      <AuthState>
        <DocsState>
          <App />
        </DocsState>
      </AuthState>
    </ModalState>
  </React.StrictMode>,
  document.getElementById('root')
);

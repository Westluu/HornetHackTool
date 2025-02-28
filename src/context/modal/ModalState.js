import { createContext, useState } from 'react';

export const ModalContext = createContext();

const ModalState = ({ children }) => {
  const [open, setOpen] = useState(false);

  const onOpenModal = () => setOpen(true);
  const onCloseModal = () => setOpen(false);

  return (
    <ModalContext.Provider value={{ open, onOpenModal, onCloseModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export default ModalState;

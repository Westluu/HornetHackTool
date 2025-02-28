export const initialState = {
  docs: null,
  singleDoc: null,
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_INITIAL_DOCS':
      return {
        ...state,
        docs: action.payload,
      };

    case 'STORE_SINGLE_DOC':
      return {
        ...state,
        singleDoc: action.payload,
      };
    default:
      return state;
  }
};

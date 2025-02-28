export const initialState = {
  user: null,
  isLoggedIn: false,
  docs: null,
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isLoggedIn: true,
      };
    case 'USER_PERSISTENCE':
      return {
        ...state,
        user: action.payload,
        isLoggedIn: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isLoggedIn: false,
      };
    case 'NO_USER':
      return {
        ...state,
        user: null,
        isLoggedIn: false,
      };
    case 'GET_INITIAL_DOCS':
      return {
        ...state,
        docs: action.payload,
      };
    default:
      return state;
  }
};

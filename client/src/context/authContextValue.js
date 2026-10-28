import { createContext } from 'react';

/** The context object lives apart from the provider component so fast refresh keeps working. */
export const AuthContext = createContext(null);

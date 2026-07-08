import { createContext, useContext, useState, useEffect } from 'react';

const PrivacyModeContext = createContext(null);

export const usePrivacyMode = () => {
  const context = useContext(PrivacyModeContext);
  if (!context) {
    throw new Error('usePrivacyMode must be used within PrivacyModeProvider');
  }
  return context;
};

export const PrivacyModeProvider = ({ children }) => {
  const [hideBalances, setHideBalances] = useState(() => {
    return localStorage.getItem('hide_balances') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hide_balances', hideBalances.toString());
  }, [hideBalances]);

  const togglePrivacyMode = () => {
    setHideBalances(prev => !prev);
  };

  return (
    <PrivacyModeContext.Provider value={{ hideBalances, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext.Provider>
  );
};

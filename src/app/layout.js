"use client";

import { useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const [showPopup, setShowPopup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [language, setLanguage] = useState('EN'); // Default language is English

  const handleSaveApiKey = () => {
    localStorage.setItem('userApiKey', apiKey);
    setShowPopup(false);
    alert(language === 'EN' ? 'API key saved successfully!' : 'API-avain tallennettu onnistuneesti!');
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'FI' : 'EN'));
  };

  return (
    <html lang={language === 'EN' ? 'en' : 'fi'}>
      <head></head>
      <body className={inter.className}>
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <button onClick={toggleLanguage}>{language === 'EN' ? 'FI' : 'EN'}</button>
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button onClick={() => setShowPopup(true)}>
            {language === 'EN' ? 'Insert API key' : 'Lisää API-avain'}
          </button>
        </div>
        {showPopup && (
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3>{language === 'EN' ? 'Insert API Key' : 'Lisää API-avain'}</h3>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={language === 'EN' ? 'Enter your API key' : 'Syötä API-avain'}
              style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
            />
            <button onClick={handleSaveApiKey} style={{ marginRight: '0.5rem' }}>
              {language === 'EN' ? 'Save' : 'Tallenna'}
            </button>
            <button onClick={() => setShowPopup(false)}>
              {language === 'EN' ? 'Cancel' : 'Peruuta'}
            </button>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}

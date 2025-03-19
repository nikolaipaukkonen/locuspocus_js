"use client";

import { useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const [showPopup, setShowPopup] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleSaveApiKey = () => {
    localStorage.setItem('userApiKey', apiKey);
    setShowPopup(false);
    alert('API key saved successfully!');
  };

  return (
    <html lang="en">
      <head></head>
      <body className={inter.className}>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button onClick={() => setShowPopup(true)}>Insert API key</button>
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
            <h3>Insert API Key</h3>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
            />
            <button onClick={handleSaveApiKey} style={{ marginRight: '0.5rem' }}>
              Save
            </button>
            <button onClick={() => setShowPopup(false)}>Cancel</button>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}

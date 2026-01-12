import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('Initializing...');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const authUser = async () => {
      try {
        // Load FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const deviceId = result.visitorId;

        // Get Telegram User Data
        let user = null;
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          user = tg.initDataUnsafe?.user;
        }

        // Mock user for local dev if not in Telegram
        if (!user) {
          console.warn('Telegram WebApp not detected, using mock data');
          user = {
            id: 123456789,
            first_name: 'Test User'
          };
        }

        if (!user) {
          setStatus('Error: Could not identify user.');
          return;
        }

        setStatus('Authenticating...');

        // Send to Backend
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/secure-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: user.id,
            device_id: deviceId,
            name: user.first_name
          })
        });

        const data = await response.json();

        if (data.blocked) {
          setStatus('Blocked: Multi-account detected.');
          if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
          }
        } else {
          setStatus('Welcome, ' + user.first_name + '!');
          setUserInfo({ ...user, deviceId });
        }

      } catch (error) {
        console.error('Auth error:', error);
        setStatus('Authentication failed.');
      }
    };

    authUser();
  }, []);

  return (
    <div className="container">
      <h1>Triple-Lock Security</h1>
      <div className="card">
        <h2>Status: {status}</h2>
        {userInfo && (
          <div className="user-info">
            <p><strong>Telegram ID:</strong> {userInfo.id}</p>
            <p><strong>Device ID:</strong> {userInfo.deviceId}</p>
            <p><strong>Name:</strong> {userInfo.first_name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('Initializing...');
  const [userInfo, setUserInfo] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [balance, setBalance] = useState(95.47);
  const [isSpinning, setIsSpinning] = useState(false);
  const wheelRef = useRef(null);

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
          tg.expand(); // Expand to full height
          user = tg.initDataUnsafe?.user;
        }

        // Mock user for local dev ONLY
        if (!user && window.location.hostname === 'localhost') {
          console.warn('Telegram WebApp not detected, using mock data for localhost');
          user = {
            id: 123456789,
            first_name: 'Test User (Localhost)'
          };
        }

        if (!user) {
          setStatus('Error: Could not identify user. Please open in Telegram.');
          return;
        }

        setStatus('Authenticating...');

        // Send to Backend
        const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-backend-jet.vercel.app';
        // Debug: Show API URL
        console.log('Using API URL:', apiUrl);

        const response = await fetch(`${apiUrl}/secure-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: user.id,
            device_id: deviceId,
            name: user.first_name
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.blocked) {
          setIsBlocked(true);
          setStatus(data.reason || 'Blocked: Multi-account detected.');
          if (window.Telegram && window.Telegram.WebApp) {
            // Optional: Close app after delay
            // window.Telegram.WebApp.close();
          }
        } else {
          setStatus('Authenticated');
          setUserInfo({ ...user, deviceId });
        }

      } catch (error) {
        console.error('Auth error:', error);
        setStatus(`Auth Failed: ${error.message} (API: ${import.meta.env.VITE_API_URL})`);
      }
    };

    authUser();
  }, []);

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    // Random rotation between 720 and 1440 degrees
    const rotation = Math.floor(Math.random() * 720) + 720;

    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotation}deg)`;
    }

    setTimeout(() => {
      setIsSpinning(false);
      setBalance(prev => prev + 10); // Mock win
      // Reset rotation for next spin (optional logic needed for continuous spins)
    }, 3000);
  };

  // Render Blocked Screen
  if (isBlocked) {
    return (
      <div className="container">
        <div className="auth-card" style={{ borderColor: '#ff4444' }}>
          <h1 style={{ color: '#ff4444' }}>Access Denied</h1>
          <p>{status}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>ID: {userInfo?.id || 'Unknown'}</p>
        </div>
      </div>
    );
  }

  // Render Dashboard if Authenticated
  if (userInfo) {
    return (
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="user-profile">
            <div className="avatar">{userInfo.first_name[0]}</div>
            <span>{userInfo.first_name}</span>
          </div>
          <div className="settings-icon">⚙️</div>
        </div>

        {/* Balance */}
        <div className="balance-section">
          <div className="balance-amount">₹{balance.toFixed(2)}</div>
          <div className="cashout-progress">
            Only ₹{(100 - balance).toFixed(2)} to cash out ₹100!
          </div>
        </div>

        {/* Spin Wheel */}
        <div className="wheel-container">
          <div className="spin-arrow"></div>
          <div className="wheel" ref={wheelRef}></div>
          <div className="wheel-center">SPIN</div>
        </div>

        {/* Spin Button */}
        <button className="spin-btn" onClick={handleSpin} disabled={isSpinning}>
          {isSpinning ? 'Spinning...' : 'SPIN NOW'}
        </button>

        {/* Bottom Invite */}
        <div className="bottom-nav">
          Invite for Spins! 🚀
        </div>
      </div>
    );
  }

  // Loading / Error Screen
  return (
    <div className="container">
      <div className="auth-card">
        <h2>Triple-Lock Security</h2>
        <p>{status}</p>
        <div className="loader" style={{ marginTop: '20px' }}>🔒 Verifying...</div>
      </div>
    </div>
  );
}

export default App;

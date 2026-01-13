import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useEffect, useRef, useState } from 'react';
import AdminPanel from './AdminPanel';
import './App.css';

function App() {
  const [status, setStatus] = useState('Initializing...');
  const [userInfo, setUserInfo] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [balance, setBalance] = useState(95.47);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [missingChannels, setMissingChannels] = useState([]);
  const wheelRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-backend-jet.vercel.app';

  useEffect(() => {
    const authUser = async () => {
      try {
        // ... (Fingerprint & Telegram User logic) ...
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
        console.log('Using API URL:', apiUrl);

        const response = await fetch(`${apiUrl}/secure-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegram_id: user.id,
            device_id: deviceId,
            name: user.first_name,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: user.photo_url,
            auth_date: window.Telegram?.WebApp?.initDataUnsafe?.auth_date
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
        } else {
          // Set User Info immediately so we have it
          setUserInfo({ ...user, deviceId, role: data.role });

          // Check Channel Membership
          try {
            await verifyChannels(user.id);
            setStatus('Authenticated');
          } catch (vError) {
            console.error('Verification check failed:', vError);
            setStatus('Verification Check Failed: ' + vError.message);
            // If check failed, we don't want to show dashboard. 
            // But userInfo is set. We rely on missingChannels logic or status.
            // If network error, missingChannels is [], so dashboard shows.
            // We should probably reset userInfo if check fails hard.
            setUserInfo(null);
          }
        }

      } catch (error) {
        console.error('Auth error:', error);
        setStatus(`Auth Failed: ${error.message} (API: ${apiUrl})`);
      }
    };

    authUser();
  }, []);

  const verifyChannels = async (telegramId) => {
    try {
      const res = await fetch(`${apiUrl}/verify-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId })
      });

      if (!res.ok) {
        throw new Error(`Verification API Error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.verified) {
        setMissingChannels(data.missing_channels);
      } else {
        setMissingChannels([]);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      throw error; // Re-throw to be caught by authUser
    }
  };

  const handleSpin = () => {
    // ... (existing handleSpin) ...
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

  // Render Join Channels Screen
  if (missingChannels.length > 0) {
    return (
      <div className="container">
        <div className="auth-card">
          <h2>🔒 Verification Required</h2>
          <p>Please join the following channels to continue:</p>
          <div className="channels-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
            {missingChannels.map(ch => (
              <a key={ch.id} href={ch.channel_url} target="_blank" rel="noopener noreferrer" className="channel-btn" style={{
                padding: '12px', background: '#0088cc', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold'
              }}>
                Join {ch.channel_name}
              </a>
            ))}
          </div>
          <button onClick={() => verifyChannels(userInfo?.id)} className="spin-btn" style={{ fontSize: '1rem', padding: '10px 20px' }}>
            🔄 Verify Membership
          </button>
        </div>
      </div>
    );
  }

  // Render Dashboard if Authenticated
  if (userInfo) {
    return (
      <div className="container">
        {showAdmin && <AdminPanel adminId={userInfo.id} onClose={() => setShowAdmin(false)} />}

        {/* Header */}
        <div className="header">
          <div className="user-profile">
            <div className="avatar">{userInfo.first_name[0]}</div>
            <div>
              <span>{userInfo.first_name}</span>
              {userInfo.role === 'admin' && <span className="badge admin-badge">ADMIN</span>}
            </div>
          </div>
          <div className="header-actions">
            {userInfo.role === 'admin' && (
              <button className="admin-btn" onClick={() => setShowAdmin(true)}>Admin Panel</button>
            )}
            <div className="settings-icon">⚙️</div>
          </div>
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

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
  const [tempAuthData, setTempAuthData] = useState(null); // Store data for pre-login verification
  const wheelRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-backend-jet.vercel.app';

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Load Fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const deviceId = result.visitorId;

        // 2. Get Telegram User
        let user = null;
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();
          user = tg.initDataUnsafe?.user;
        }

        // Mock for localhost
        if (!user && window.location.hostname === 'localhost') {
          console.warn('Using mock user for localhost');
          user = { id: 123456789, first_name: 'Test User' };
        }

        if (!user) {
          setStatus('Error: No User Found. Open in Telegram.');
          return;
        }

        // Store auth data for later
        const authData = { user, deviceId };
        setTempAuthData(authData);

        // 3. Silent Verification Check
        setStatus('Verifying Membership...');
        const isVerified = await verifyChannels(user.id);

        if (isVerified) {
          // 4. Success: Auto-Login
          await performLogin(authData);
        } else {
          // 5. Failure: Stay on "Join Channels" screen (handled by missingChannels state)
          setStatus('Verification Required');
        }

      } catch (error) {
        console.error('Init Error:', error);
        setStatus('Initialization Failed: ' + error.message);
      }
    };

    initApp();
  }, []);

  const verifyChannels = async (telegramId) => {
    try {
      const res = await fetch(`${apiUrl}/verify-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId })
      });

      if (!res.ok) throw new Error(`Verification API Error: ${res.status}`);

      const data = await res.json();
      if (!data.verified) {
        setMissingChannels(data.missing_channels);
        return false;
      } else {
        setMissingChannels([]);
        return true;
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setStatus('Verification Check Failed: ' + error.message);
      return false;
    }
  };

  const performLogin = async ({ user, deviceId }) => {
    setStatus('Authenticating...');
    try {
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
        setStatus('Authenticated');
        setUserInfo({ ...user, deviceId, role: data.role });
      }
    } catch (error) {
      console.error('Login error:', error);
      setStatus(`Login Failed: ${error.message}`);
    }
  };

  const handleManualVerify = async () => {
    if (!tempAuthData) return;
    setStatus('Verifying...');
    const isVerified = await verifyChannels(tempAuthData.user.id);
    if (isVerified) {
      await performLogin(tempAuthData);
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
              <button
                key={ch.id}
                onClick={() => {
                  if (window.Telegram && window.Telegram.WebApp) {
                    window.Telegram.WebApp.openTgLink(ch.channel_url);
                  } else {
                    window.open(ch.channel_url, '_blank');
                  }
                }}
                className="channel-btn"
                style={{
                  padding: '12px',
                  background: '#0088cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Join {ch.channel_name}
              </button>
            ))}
          </div>
          <button onClick={handleManualVerify} className="spin-btn" style={{ fontSize: '1rem', padding: '10px 20px' }}>
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

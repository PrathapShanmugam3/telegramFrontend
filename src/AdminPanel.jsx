import { useEffect, useState } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ adminId, onClose }) => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [origins, setOrigins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newChannel, setNewChannel] = useState({ channel_name: '', channel_url: '' });
    const [newOrigin, setNewOrigin] = useState('');
    const [resolveUsername, setResolveUsername] = useState('');

    const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-backend-jet.vercel.app';

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'channels') fetchChannels();
        if (activeTab === 'origins') fetchOrigins();
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/users`, {
                headers: { 'x-admin-id': String(adminId) }
            });
            if (!res.ok) throw new Error(await res.text());
            setUsers(await res.json());
        } catch (error) {
            alert('Failed to fetch users: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/channels`, {
                headers: { 'x-admin-id': String(adminId) }
            });
            if (!res.ok) throw new Error(await res.text());
            setChannels(await res.json());
        } catch (error) {
            alert('Failed to fetch channels: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrigins = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/origins`, {
                headers: { 'x-admin-id': String(adminId) }
            });
            if (!res.ok) throw new Error(await res.text());
            setOrigins(await res.json());
        } catch (error) {
            alert('Failed to fetch origins: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChannel = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/admin/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': String(adminId) },
                body: JSON.stringify(newChannel)
            });
            if (!res.ok) throw new Error(await res.text());
            setNewChannel({ channel_name: '', channel_url: '' });
            fetchChannels();
        } catch (error) {
            alert('Failed to add channel: ' + error.message);
        }
    };

    const handleDeleteChannel = async (id) => {
        if (!confirm('Delete this channel?')) return;
        try {
            await fetch(`${apiUrl}/admin/channels/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-id': String(adminId) }
            });
            fetchChannels();
        } catch (error) {
            alert('Failed to delete channel');
        }
    };

    const handleAddOrigin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiUrl}/admin/origins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': String(adminId) },
                body: JSON.stringify({ origin_url: newOrigin })
            });
            if (!res.ok) throw new Error(await res.text());
            setNewOrigin('');
            fetchOrigins();
        } catch (error) {
            alert('Failed to add origin: ' + error.message);
        }
    };

    const handleDeleteOrigin = async (id) => {
        if (!confirm('Delete this origin?')) return;
        try {
            await fetch(`${apiUrl}/admin/origins/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-id': String(adminId) }
            });
            fetchOrigins();
        } catch (error) {
            alert('Failed to delete origin');
        }
    };

    const handleResolveId = async () => {
        if (!resolveUsername) return alert('Enter a username');
        try {
            const res = await fetch(`${apiUrl}/admin/resolve-channel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': String(adminId) },
                body: JSON.stringify({ username: resolveUsername })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert(`Channel Found!\nTitle: ${data.title}\nID: ${data.id}`);
            setNewChannel({ ...newChannel, channel_id: data.id, channel_name: data.title });
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // ... (handleDelete and handleUpdate for users remain same) ...
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetch(`${apiUrl}/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-id': adminId }
            });
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${apiUrl}/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify(editingUser)
            });
            setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
            setEditingUser(null);
        } catch (error) {
            alert('Update failed');
        }
    };

    return (
        <div className="admin-overlay">
            <div className="admin-container">
                <div className="admin-header">
                    <div className="tabs">
                        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Users</button>
                        <button className={activeTab === 'channels' ? 'active' : ''} onClick={() => setActiveTab('channels')}>Channels</button>
                        <button className={activeTab === 'origins' ? 'active' : ''} onClick={() => setActiveTab('origins')}>Origins</button>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="admin-content">
                    {loading && <div className="admin-loader">Loading...</div>}

                    {!loading && activeTab === 'users' && (
                        <div className="users-list">
                            {users.map(user => (
                                <div key={user.id} className="user-card">
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {user.photo_url ? <img src={user.photo_url} alt="pic" /> : (user.first_name?.[0] || '?')}
                                        </div>
                                        <div>
                                            <h3>{user.first_name} {user.last_name}</h3>
                                            <p className="sub-text">@{user.username || 'No Username'}</p>
                                            <p className="sub-text">ID: {user.telegram_id}</p>
                                            <span className={`badge ${user.role}`}>{user.role}</span>
                                            {user.is_blocked ? <span className="badge blocked">BLOCKED</span> : null}
                                        </div>
                                    </div>
                                    <div className="user-actions">
                                        <button onClick={() => setEditingUser(user)}>Edit</button>
                                        <button className="delete-btn" onClick={() => handleDelete(user.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && activeTab === 'channels' && (
                        <div className="channels-section">
                            <form onSubmit={handleAddChannel} className="add-channel-form">
                                <input
                                    placeholder="Channel Name"
                                    value={newChannel.channel_name}
                                    onChange={e => setNewChannel({ ...newChannel, channel_name: e.target.value })}
                                    required
                                />
                                <input
                                    placeholder="Channel Link (e.g. https://t.me/username)"
                                    value={newChannel.channel_url}
                                    onChange={e => setNewChannel({ ...newChannel, channel_url: e.target.value })}
                                    required
                                />
                                <button type="submit">Add Channel</button>
                            </form>
                            <div className="channels-list">
                                {channels.map(ch => (
                                    <div key={ch.id} className="channel-card">
                                        <div className="channel-info">
                                            <h4>{ch.channel_name}</h4>
                                            <p>{ch.channel_url}</p>
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteChannel(ch.id)}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'origins' && (
                        <div className="channels-section">
                            <form onSubmit={handleAddOrigin} className="add-channel-form">
                                <input placeholder="Origin URL (e.g. https://myapp.vercel.app)" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} required />
                                <button type="submit">Add Origin</button>
                            </form>
                            <div className="channels-list">
                                {origins.map(origin => (
                                    <div key={origin.id} className="channel-card">
                                        <div>
                                            <h4>{origin.origin_url}</h4>
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteOrigin(origin.id)}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {editingUser && (
                    <div className="edit-modal">
                        <form onSubmit={handleUpdate}>
                            <h3>Edit User</h3>
                            <label>Name: <input value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} /></label>
                            <label>Role:
                                <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                            <label>Blocked:
                                <input type="checkbox" checked={editingUser.is_blocked} onChange={e => setEditingUser({ ...editingUser, is_blocked: e.target.checked })} />
                            </label>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                                <button type="submit" className="save-btn">Save</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;

import { useEffect, useState } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ adminId, onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'https://telegram-backend-jet.vercel.app';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${apiUrl}/admin/users`, {
                headers: { 'x-admin-id': adminId }
            });
            const data = await res.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            alert('Failed to fetch users');
            setLoading(false);
        }
    };

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

    if (loading) return <div className="admin-loader">Loading Users...</div>;

    return (
        <div className="admin-overlay">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Admin Panel</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

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

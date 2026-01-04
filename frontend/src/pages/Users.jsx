import { useState, useEffect } from 'react';
import {
    Users as UsersIcon,
    Plus,
    Trash2,
    Edit2,
    Shield,
    Eye,
    UserCog,
    X,
    RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Users.css';

const ROLES = [
    { value: 'admin', label: 'Administrador', icon: Shield, description: 'Acesso total ao sistema' },
    { value: 'operator', label: 'Operador', icon: UserCog, description: 'Pode executar e agendar backups' },
    { value: 'viewer', label: 'Visualizador', icon: Eye, description: 'Apenas visualização' },
];

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        role: 'viewer',
    });
    const { user: currentUser, isAdmin } = useAuth();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/users');
            setUsers(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            name: '',
            password: '',
            role: 'viewer',
        });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            name: user.name,
            password: '',
            role: user.role,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const updateData = { name: formData.name, role: formData.role };
                if (formData.password) updateData.password = formData.password;
                await api.put(`/auth/users/${editingUser.id}`, updateData);
            } else {
                await api.post('/auth/users', formData);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
        try {
            await api.delete(`/auth/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[2];

    if (!isAdmin) {
        return (
            <div className="page">
                <div className="access-denied">
                    <Shield size={48} />
                    <h2>Acesso Restrito</h2>
                    <p>Apenas administradores podem acessar esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Usuários</h1>
                    <p className="page-description">Gerencie os usuários do sistema</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Novo Usuário
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Função</th>
                                <th>Criado em</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="table-loading">
                                            <div className="spinner"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="empty-state">
                                            <UsersIcon size={40} />
                                            <p>Nenhum usuário encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => {
                                    const roleInfo = getRoleInfo(user.role);
                                    const RoleIcon = roleInfo.icon;
                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="user-avatar">
                                                        {user.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="user-name">{user.name}</span>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>
                                                <div className={`role-badge role-${user.role}`}>
                                                    <RoleIcon size={14} />
                                                    <span>{roleInfo.label}</span>
                                                </div>
                                            </td>
                                            <td>{formatDate(user.created_at)}</td>
                                            <td>
                                                <div className="actions">
                                                    <button
                                                        className="btn btn-icon"
                                                        onClick={() => openEditModal(user)}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    {user.id !== currentUser?.id && (
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => deleteUser(user.id)}
                                                            title="Deletar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                            <button className="btn btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nome completo"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@exemplo.com"
                                    required
                                    disabled={editingUser}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Senha {editingUser && '(deixe em branco para manter)'}
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    required={!editingUser}
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Função</label>
                                <div className="role-options">
                                    {ROLES.map((role) => {
                                        const Icon = role.icon;
                                        return (
                                            <label
                                                key={role.value}
                                                className={`role-option ${formData.role === role.value ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={role.value}
                                                    checked={formData.role === role.value}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                />
                                                <Icon size={20} />
                                                <div className="role-option-info">
                                                    <span className="role-option-label">{role.label}</span>
                                                    <span className="role-option-desc">{role.description}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;

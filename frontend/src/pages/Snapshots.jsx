import { useState, useEffect } from 'react';
import {
    Archive,
    Search,
    Filter,
    Trash2,
    Eye,
    Calendar,
    HardDrive,
    RefreshCw,
    ChevronDown,
    X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Snapshots.css';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
}

function Snapshots() {
    const [snapshots, setSnapshots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const { isOperator } = useAuth();

    const fetchSnapshots = async () => {
        try {
            setLoading(true);
            const data = await api.get('/snapshots');
            setSnapshots(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja deletar este snapshot?')) return;

        try {
            setDeleting(id);
            await api.delete(`/snapshots/${id}?prune=true`);
            setSnapshots(snapshots.filter(s => s.short_id !== id && s.id !== id));
        } catch (err) {
            alert('Erro ao deletar: ' + err.message);
        } finally {
            setDeleting(null);
        }
    };

    // Get unique tags
    const allTags = [...new Set(snapshots.flatMap(s => s.tags || []))];

    // Filter snapshots
    const filteredSnapshots = snapshots.filter(s => {
        const matchesSearch = search === '' ||
            s.short_id?.toLowerCase().includes(search.toLowerCase()) ||
            s.hostname?.toLowerCase().includes(search.toLowerCase());
        const matchesTag = tagFilter === '' || (s.tags || []).includes(tagFilter);
        return matchesSearch && matchesTag;
    });

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Snapshots</h1>
                    <p className="page-description">Visualize e gerencie seus snapshots de backup</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchSnapshots} disabled={loading}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por ID ou hostname..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                    {search && (
                        <button className="btn btn-icon" onClick={() => setSearch('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="filter-select">
                    <Filter size={18} />
                    <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                        <option value="">Todas as tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} />
                </div>

                <span className="filter-count">
                    {filteredSnapshots.length} de {snapshots.length} snapshots
                </span>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {/* Snapshots Table */}
            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tags</th>
                                <th>Hostname</th>
                                <th>Data</th>
                                <th>Paths</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="table-loading">
                                            <div className="spinner"></div>
                                            <span>Carregando snapshots...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSnapshots.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <Archive size={40} />
                                            <p>Nenhum snapshot encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSnapshots.map((snapshot) => (
                                    <tr key={snapshot.id || snapshot.short_id}>
                                        <td>
                                            <code className="snapshot-id">{snapshot.short_id}</code>
                                        </td>
                                        <td>
                                            <div className="tags">
                                                {(snapshot.tags || []).map(tag => (
                                                    <span key={tag} className="badge badge-info">{tag}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{snapshot.hostname || '-'}</td>
                                        <td>
                                            <div className="date-cell">
                                                <Calendar size={14} />
                                                {formatDate(snapshot.time)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="paths-cell">
                                                {(snapshot.paths || []).slice(0, 2).map((path, i) => (
                                                    <span key={i} className="path-item">{path.split('/').pop()}</span>
                                                ))}
                                                {(snapshot.paths || []).length > 2 && (
                                                    <span className="path-more">+{snapshot.paths.length - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button
                                                    className="btn btn-icon"
                                                    title="Ver detalhes"
                                                    onClick={() => setSelectedSnapshot(snapshot)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {isOperator && (
                                                    <button
                                                        className="btn btn-icon"
                                                        title="Deletar"
                                                        onClick={() => handleDelete(snapshot.short_id || snapshot.id)}
                                                        disabled={deleting === (snapshot.short_id || snapshot.id)}
                                                    >
                                                        {deleting === (snapshot.short_id || snapshot.id) ? (
                                                            <div className="spinner" style={{ width: 18, height: 18 }} />
                                                        ) : (
                                                            <Trash2 size={18} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Snapshot Detail Modal */}
            {selectedSnapshot && (
                <div className="modal-overlay" onClick={() => setSelectedSnapshot(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalhes do Snapshot</h3>
                            <button className="btn btn-icon" onClick={() => setSelectedSnapshot(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">ID</span>
                                    <code>{selectedSnapshot.id}</code>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Short ID</span>
                                    <code>{selectedSnapshot.short_id}</code>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Hostname</span>
                                    <span>{selectedSnapshot.hostname}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Data</span>
                                    <span>{formatDate(selectedSnapshot.time)}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <span className="detail-label">Tags</span>
                                    <div className="tags">
                                        {(selectedSnapshot.tags || []).map(tag => (
                                            <span key={tag} className="badge badge-info">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="detail-item full-width">
                                    <span className="detail-label">Paths</span>
                                    <div className="paths-list">
                                        {(selectedSnapshot.paths || []).map((path, i) => (
                                            <code key={i}>{path}</code>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Snapshots;

import { useState, useEffect } from 'react';
import {
    Archive,
    PlayCircle,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    HardDrive,
    TrendingUp,
    RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../services/api';
import './Dashboard.css';

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
}

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await api.get('/stats/dashboard');
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Carregando estatísticas...</p>
                </div>
            </div>
        );
    }

    const history = stats?.history || {};
    const repository = stats?.repository || {};
    const trend = stats?.trend || [];

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-description">Visão geral dos seus backups Restic</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Archive size={24} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{repository.totalSnapshots || 0}</span>
                        <span className="stat-label">Total Snapshots</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{history.successful || 0}</span>
                        <span className="stat-label">Backups Sucesso (30d)</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                        <XCircle size={24} style={{ color: 'var(--error)' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{history.failed || 0}</span>
                        <span className="stat-label">Backups Falhos (30d)</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        <HardDrive size={24} style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{formatBytes(repository.totalSize || 0)}</span>
                        <span className="stat-label">Tamanho Repositório</span>
                    </div>
                </div>
            </div>

            {/* Disk Usage Card */}
            {stats?.diskUsage && !stats.diskUsage.error && (
                <div className="disk-usage-card">
                    <div className="disk-usage-header">
                        <HardDrive size={20} />
                        <span>Espaço em Disco - Destino de Backup</span>
                        <span className="disk-mount">{stats.diskUsage.mountPoint}</span>
                    </div>
                    <div className="disk-usage-bar-container">
                        <div className="disk-usage-bar">
                            <div
                                className={`disk-usage-fill ${stats.diskUsage.usedPercent > 90 ? 'critical' : stats.diskUsage.usedPercent > 75 ? 'warning' : ''}`}
                                style={{ width: `${stats.diskUsage.usedPercent}%` }}
                            />
                        </div>
                        <span className="disk-usage-percent">{stats.diskUsage.usedPercent}%</span>
                    </div>
                    <div className="disk-usage-details">
                        <div className="disk-detail">
                            <span className="disk-detail-label">Usado</span>
                            <span className="disk-detail-value">{formatBytes(stats.diskUsage.used)}</span>
                        </div>
                        <div className="disk-detail">
                            <span className="disk-detail-label">Livre</span>
                            <span className="disk-detail-value">{formatBytes(stats.diskUsage.available)}</span>
                        </div>
                        <div className="disk-detail">
                            <span className="disk-detail-label">Total</span>
                            <span className="disk-detail-value">{formatBytes(stats.diskUsage.total)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                {/* Trend Chart */}
                <div className="card chart-card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <TrendingUp size={20} />
                            Backups nos Últimos 7 Dias
                        </h3>
                    </div>
                    <div className="chart-container">
                        {trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={trend}>
                                    <defs>
                                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="successful"
                                        stroke="#10b981"
                                        fillOpacity={1}
                                        fill="url(#colorSuccess)"
                                        name="Sucesso"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="failed"
                                        stroke="#ef4444"
                                        fillOpacity={1}
                                        fill="url(#colorFailed)"
                                        name="Falha"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state">
                                <p>Nenhum dado de backup nos últimos 7 dias</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Backups */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Clock size={20} />
                            Próximos Agendados
                        </h3>
                    </div>
                    <div className="upcoming-list">
                        {stats?.upcomingBackups?.length > 0 ? (
                            stats.upcomingBackups.map((backup, index) => (
                                <div key={index} className="upcoming-item">
                                    <div className="upcoming-job">
                                        <PlayCircle size={18} />
                                        <span>{backup.job_name}</span>
                                    </div>
                                    <span className="upcoming-time">{formatDate(backup.next_run)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <Clock size={32} />
                                <p>Nenhum backup agendado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Jobs by Tag */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Archive size={20} />
                            Snapshots por Job
                        </h3>
                    </div>
                    <div className="tags-list">
                        {repository.snapshotsByTag && Object.keys(repository.snapshotsByTag).length > 0 ? (
                            Object.entries(repository.snapshotsByTag).map(([tag, snapshots]) => (
                                <div key={tag} className="tag-item">
                                    <span className="tag-name">{tag}</span>
                                    <span className="tag-count">{snapshots.length} snapshots</span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <Archive size={32} />
                                <p>Nenhum snapshot encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

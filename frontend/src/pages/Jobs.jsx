import { useState, useEffect } from 'react';
import {
    PlayCircle,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Play,
    History,
    Settings,
    Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Jobs.css';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Nunca executado';
    return new Date(dateString).toLocaleString('pt-BR');
}

function formatDuration(seconds) {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}

function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [runningJobs, setRunningJobs] = useState(new Set());
    const [selectedJob, setSelectedJob] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const { isOperator } = useAuth();

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const data = await api.get('/jobs');
            setJobs(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const runBackup = async (jobName) => {
        try {
            setRunningJobs(prev => new Set([...prev, jobName]));
            await api.post(`/jobs/${jobName}/run`);
            // In a real app, we would connect to WebSocket for updates
            setTimeout(() => {
                setRunningJobs(prev => {
                    const next = new Set(prev);
                    next.delete(jobName);
                    return next;
                });
                fetchJobs();
            }, 5000);
        } catch (err) {
            alert('Erro ao iniciar backup: ' + err.message);
            setRunningJobs(prev => {
                const next = new Set(prev);
                next.delete(jobName);
                return next;
            });
        }
    };

    const fetchHistory = async (jobName) => {
        setSelectedJob(jobName);
        setHistoryLoading(true);
        try {
            const data = await api.get(`/jobs/${jobName}/history`);
            setHistory(data);
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="status-icon success" size={20} />;
            case 'failed':
                return <XCircle className="status-icon error" size={20} />;
            case 'running':
                return <Loader2 className="status-icon running animate-spin" size={20} />;
            default:
                return <Clock className="status-icon muted" size={20} />;
        }
    };

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Jobs de Backup</h1>
                    <p className="page-description">Gerencie e execute seus jobs de backup</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchJobs} disabled={loading}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {loading && jobs.length === 0 ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Carregando jobs...</p>
                </div>
            ) : (
                <div className="jobs-grid">
                    {jobs.map((job) => (
                        <div key={job.id} className={`job-card ${!job.enabled ? 'disabled' : ''}`}>
                            <div className="job-header">
                                <div className="job-title-row">
                                    <h3 className="job-name">{job.name}</h3>
                                    {getStatusIcon(job.last_status)}
                                </div>
                                <p className="job-description">{job.description || 'Sem descrição'}</p>
                            </div>

                            <div className="job-stats">
                                <div className="job-stat">
                                    <span className="job-stat-label">Total de execuções</span>
                                    <span className="job-stat-value">{job.total_runs || 0}</span>
                                </div>
                                <div className="job-stat">
                                    <span className="job-stat-label">Última execução</span>
                                    <span className="job-stat-value">{formatDate(job.last_run)}</span>
                                </div>
                            </div>

                            <div className="job-tags">
                                {(job.tags || []).map(tag => (
                                    <span key={tag} className="badge badge-info">{tag}</span>
                                ))}
                            </div>

                            <div className="job-actions">
                                {isOperator && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => runBackup(job.name)}
                                        disabled={runningJobs.has(job.name) || !job.enabled}
                                    >
                                        {runningJobs.has(job.name) ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Executando...
                                            </>
                                        ) : (
                                            <>
                                                <Play size={18} />
                                                Executar
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => fetchHistory(job.name)}
                                >
                                    <History size={18} />
                                    Histórico
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* History Modal */}
            {selectedJob && (
                <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Histórico - {selectedJob}</h3>
                            <button className="btn btn-icon" onClick={() => setSelectedJob(null)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            {historyLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="empty-state">
                                    <History size={40} />
                                    <p>Nenhum histórico de execução</p>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {history.map((item) => (
                                        <div key={item.id} className="history-item">
                                            <div className="history-status">
                                                {getStatusIcon(item.status)}
                                            </div>
                                            <div className="history-info">
                                                <div className="history-date">{formatDate(item.started_at)}</div>
                                                <div className="history-details">
                                                    {item.status === 'success' && (
                                                        <>
                                                            <span>{item.files_new || 0} novos</span>
                                                            <span>{item.files_changed || 0} alterados</span>
                                                            <span>{formatBytes(item.bytes_added)}</span>
                                                        </>
                                                    )}
                                                    {item.status === 'failed' && (
                                                        <span className="error-message">{item.error_message || 'Erro desconhecido'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="history-duration">
                                                {item.finished_at && item.started_at &&
                                                    formatDuration((new Date(item.finished_at) - new Date(item.started_at)) / 1000)
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Jobs;

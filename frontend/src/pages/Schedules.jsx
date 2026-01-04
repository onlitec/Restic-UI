import { useState, useEffect } from 'react';
import {
    Clock,
    Plus,
    Trash2,
    Edit2,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Calendar,
    X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Schedules.css';

const CRON_PRESETS = [
    { label: 'A cada hora', expression: '0 * * * *' },
    { label: 'A cada 6 horas', expression: '0 */6 * * *' },
    { label: 'Diário às 00:00', expression: '0 0 * * *' },
    { label: 'Diário às 02:00', expression: '0 2 * * *' },
    { label: 'Diário às 03:00', expression: '0 3 * * *' },
    { label: 'Semanal (Dom 02:00)', expression: '0 2 * * 0' },
    { label: 'Semanal (Seg 03:00)', expression: '0 3 * * 1' },
    { label: 'Mensal (Dia 1 às 02:00)', expression: '0 2 1 * *' },
];

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
}

function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [formData, setFormData] = useState({
        job_id: '',
        cron_expression: '0 2 * * *',
        description: '',
    });
    const { isOperator, isAdmin } = useAuth();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [schedulesData, jobsData] = await Promise.all([
                api.get('/schedules'),
                api.get('/jobs'),
            ]);
            setSchedules(schedulesData);
            setJobs(jobsData);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        setEditingSchedule(null);
        setFormData({
            job_id: jobs[0]?.id || '',
            cron_expression: '0 2 * * *',
            description: '',
        });
        setShowModal(true);
    };

    const openEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            job_id: schedule.job_id,
            cron_expression: schedule.cron_expression,
            description: schedule.description || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSchedule) {
                await api.put(`/schedules/${editingSchedule.id}`, formData);
            } else {
                await api.post('/schedules', formData);
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    const toggleSchedule = async (schedule) => {
        try {
            await api.put(`/schedules/${schedule.id}`, { enabled: !schedule.enabled });
            fetchData();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    const deleteSchedule = async (id) => {
        if (!confirm('Tem certeza que deseja deletar este agendamento?')) return;
        try {
            await api.delete(`/schedules/${id}`);
            fetchData();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    };

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Agendamentos</h1>
                    <p className="page-description">Configure backups automáticos</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    {isOperator && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Novo Agendamento
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>{error}</span>
                </div>
            )}

            {loading && schedules.length === 0 ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Carregando agendamentos...</p>
                </div>
            ) : schedules.length === 0 ? (
                <div className="card empty-card">
                    <div className="empty-state">
                        <Calendar size={48} />
                        <h3>Nenhum agendamento configurado</h3>
                        <p>Crie um agendamento para automatizar seus backups</p>
                        {isOperator && (
                            <button className="btn btn-primary" onClick={openCreateModal}>
                                <Plus size={18} />
                                Criar Agendamento
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="schedules-list">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className={`schedule-card ${!schedule.enabled ? 'disabled' : ''}`}>
                            <div className="schedule-main">
                                <div className="schedule-toggle">
                                    <button
                                        className="btn btn-icon toggle-btn"
                                        onClick={() => toggleSchedule(schedule)}
                                        disabled={!isOperator}
                                    >
                                        {schedule.enabled ? (
                                            <ToggleRight size={28} className="toggle-on" />
                                        ) : (
                                            <ToggleLeft size={28} className="toggle-off" />
                                        )}
                                    </button>
                                </div>

                                <div className="schedule-info">
                                    <div className="schedule-header">
                                        <h3 className="schedule-job">{schedule.job_name}</h3>
                                        <code className="schedule-cron">{schedule.cron_expression}</code>
                                    </div>
                                    {schedule.description && (
                                        <p className="schedule-description">{schedule.description}</p>
                                    )}
                                    <div className="schedule-times">
                                        <div className="time-item">
                                            <span className="time-label">Última execução:</span>
                                            <span className="time-value">{formatDate(schedule.last_run)}</span>
                                        </div>
                                        <div className="time-item">
                                            <span className="time-label">Próxima execução:</span>
                                            <span className="time-value highlight">{formatDate(schedule.next_run)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="schedule-actions">
                                    {isOperator && (
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => openEditModal(schedule)}
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => deleteSchedule(schedule.id)}
                                            title="Deletar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                            <button className="btn btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Job de Backup</label>
                                <select
                                    className="form-input"
                                    value={formData.job_id}
                                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                                    required
                                    disabled={editingSchedule}
                                >
                                    <option value="">Selecione um job</option>
                                    {jobs.map(job => (
                                        <option key={job.id} value={job.id}>{job.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Expressão Cron</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.cron_expression}
                                    onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                                    placeholder="0 2 * * *"
                                    required
                                />
                                <div className="cron-presets">
                                    {CRON_PRESETS.map((preset) => (
                                        <button
                                            key={preset.expression}
                                            type="button"
                                            className={`preset-btn ${formData.cron_expression === preset.expression ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, cron_expression: preset.expression })}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descrição (opcional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ex: Backup noturno"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingSchedule ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Schedules;

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Archive,
    PlayCircle,
    Clock,
    Users,
    LogOut,
    Menu,
    X,
    HardDrive
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

function Layout() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/snapshots', icon: Archive, label: 'Snapshots' },
        { to: '/jobs', icon: PlayCircle, label: 'Jobs' },
        { to: '/schedules', icon: Clock, label: 'Agendamentos' },
    ];

    if (isAdmin) {
        navItems.push({ to: '/users', icon: Users, label: 'Usuários' });
    }

    return (
        <div className="layout">
            {/* Mobile header */}
            <header className="mobile-header">
                <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="mobile-logo">
                    <HardDrive size={24} />
                    <span>Restic UI</span>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <HardDrive size={28} />
                        <span>Restic UI</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name}</span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                    </div>
                    <button className="btn btn-icon" onClick={handleLogout} title="Sair">
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;

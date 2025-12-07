import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Users, Bell, LogOut, Building2, TrendingUp, FileText } from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { useAuth } from '../store/AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { overdueReminders, todayReminders, pipelineValue } = useCRM();
  const { signOut, getUserName, getUserInitials, isDemo } = useAuth();
  
  const urgentCount = overdueReminders.length + todayReminders.length;

  const formatPipelineValue = (value) => {
    if (!value) return '';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Building2 size={20} />
            </div>
            <span className="logo-text">ClosePro</span>
          </div>
          {isDemo && (
            <span className="demo-badge">Demo</span>
          )}
        </div>
        
        <nav className="sidebar-nav">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            <Home size={20} className="nav-icon" />
            Dashboard
          </NavLink>
          
          <NavLink 
            to="/contacts" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={20} className="nav-icon" />
            Contacts
          </NavLink>

          <NavLink 
            to="/pipeline" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <TrendingUp size={20} className="nav-icon" />
            Pipeline
            {pipelineValue > 0 && (
              <span className="nav-value">{formatPipelineValue(pipelineValue)}</span>
            )}
          </NavLink>
          
          <NavLink 
            to="/reminders" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Bell size={20} className="nav-icon" />
            Reminders
            {urgentCount > 0 && (
              <span className="nav-badge">{urgentCount}</span>
            )}
          </NavLink>

          <NavLink 
            to="/templates" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <FileText size={20} className="nav-icon" />
            Templates
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{getUserInitials()}</div>
            <div className="user-info">
              <div className="user-name">{getUserName()}</div>
              <div className="user-role">Real Estate Agent</div>
            </div>
            <button 
              className="btn btn-icon btn-ghost" 
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

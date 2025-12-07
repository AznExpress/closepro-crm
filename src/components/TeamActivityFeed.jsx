import { useState, useEffect } from 'react';
import { useTeam } from '../store/TeamContext';
import { getTeamActivity } from '../services/teamService';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Users, RefreshCw, AlertCircle } from 'lucide-react';

export default function TeamActivityFeed({ limit = 10 }) {
  const { team, isInTeam } = useTeam();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInTeam && team) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [isInTeam, team]);

  const loadActivities = async () => {
    if (!team) return;
    
    setLoading(true);
    try {
      const data = await getTeamActivity(team.id, limit);
      setActivities(data);
    } catch (err) {
      console.error('Error loading team activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isInTeam) {
    return null;
  }

  const getActivityIcon = (type) => {
    if (type === 'handoff') return <Users size={16} />;
    return <Activity size={16} />;
  };

  const getActivityText = (item) => {
    if (item.type === 'handoff') {
      const contactName = item.contact 
        ? `${item.contact.firstName} ${item.contact.lastName}`
        : 'a contact';
      
      if (item.handoff_type === 'assigned') {
        return `assigned ${contactName} to a teammate`;
      } else {
        return `requested ${contactName} from a teammate`;
      }
    } else {
      const contactName = item.contact 
        ? `${item.contact.firstName} ${item.contact.lastName}`
        : 'a contact';
      return `${item.type} with ${contactName}`;
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <h3 style={{ margin: 0 }}>Team Activity</h3>
        <button 
          className="btn btn-icon btn-ghost" 
          onClick={loadActivities}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'loading-spinner' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
          <RefreshCw size={20} className="loading-spinner" />
        </div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
          <AlertCircle size={24} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No recent team activity</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {activities.map((item, index) => (
            <div 
              key={`${item.type}-${item.id || index}`}
              style={{
                padding: 'var(--spacing-sm)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                <div style={{ 
                  color: item.type === 'handoff' ? 'var(--purple-400)' : 'var(--accent)',
                  marginTop: '2px'
                }}>
                  {getActivityIcon(item.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {getActivityText(item)}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    marginTop: 'var(--spacing-xs)' 
                  }}>
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


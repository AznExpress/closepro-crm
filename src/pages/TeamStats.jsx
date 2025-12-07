import { useState, useEffect } from 'react';
import { useTeam } from '../store/TeamContext';
import { useAuth } from '../store/AuthContext';
import { getAgentStats } from '../services/teamService';
import { BarChart3, TrendingUp, Users, DollarSign, Phone, Home, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

export default function TeamStats() {
  const { user } = useAuth();
  const { team, teamMembers, loading: teamLoading } = useTeam();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (team && user) {
      // Default to current user
      setSelectedUserId(user.id);
    }
  }, [team, user]);

  useEffect(() => {
    if (selectedUserId) {
      loadStats(selectedUserId);
    }
  }, [selectedUserId]);

  const loadStats = async (userId) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getAgentStats(userId, team?.id);
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  if (teamLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading team stats...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <>
        <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Team Stats</h1>
              <p className="page-subtitle">View individual agent performance metrics</p>
            </div>
          </div>
        </header>
        <div className="page-content">
          <div className="card animate-slide-up">
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
              <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Not in a Team</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Join or create a team to view team statistics
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Team Stats</h1>
            <p className="page-subtitle">
              Individual agent performance metrics
            </p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => selectedUserId && loadStats(selectedUserId)}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'loading-spinner' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="page-content">
        {error && (
          <div className="alert alert-error animate-slide-up">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Agent Selector */}
        <div className="card animate-slide-up stagger-1" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <label className="form-label" style={{ marginBottom: 'var(--spacing-sm)' }}>Select Agent</label>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {teamMembers.map(member => {
              const displayName = member.user_id === user?.id 
                ? 'You' 
                : (member.email || `Agent ${member.user_id.slice(0, 8)}`);
              return (
                <button
                  key={member.id}
                  className={`btn ${selectedUserId === member.user_id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedUserId(member.user_id)}
                >
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <RefreshCw size={24} className="loading-spinner" />
            <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>Loading stats...</p>
          </div>
        ) : stats ? (
          <>
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div className="card animate-slide-up stagger-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <Users size={20} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Contacts</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.totalContacts}
                </div>
              </div>

              <div className="card animate-slide-up stagger-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <TrendingUp size={20} style={{ color: 'var(--emerald-400)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Hotlist</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.hotlistCount}
                </div>
              </div>

              <div className="card animate-slide-up stagger-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <DollarSign size={20} style={{ color: 'var(--amber-400)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Pipeline Value</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(stats.pipelineValue)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                  {stats.pipelineCount} deals
                </div>
              </div>

              <div className="card animate-slide-up stagger-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <DollarSign size={20} style={{ color: 'var(--emerald-400)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Closed This Month</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(stats.closedValue)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                  {stats.closedCount} deals
                </div>
              </div>
            </div>

            {/* Activity Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div className="card animate-slide-up stagger-5">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <Phone size={20} style={{ color: 'var(--blue-400)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Activities This Month</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.activitiesCount}
                </div>
              </div>

              <div className="card animate-slide-up stagger-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <Home size={20} style={{ color: 'var(--purple-400)' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Showings This Month</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.showingsCount}
                </div>
              </div>
            </div>

            {/* Lead Source Breakdown */}
            {Object.keys(stats.leadSourceBreakdown).length > 0 && (
              <div className="card animate-slide-up stagger-7">
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Lead Sources</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {Object.entries(stats.leadSourceBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => {
                      const percentage = ((count / stats.totalContacts) * 100).toFixed(1);
                      return (
                        <div key={source}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                            <span style={{ fontWeight: 500 }}>{source}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div style={{ 
                            height: '8px', 
                            background: 'var(--bg-tertiary)', 
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'var(--accent)',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            <div className="card animate-slide-up stagger-8" style={{ marginTop: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Performance Insights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {stats.closedCount > 0 && (
                  <div style={{ 
                    padding: 'var(--spacing-md)', 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--emerald-400)' }}>
                      ✓ Strong Performance
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Closed {stats.closedCount} deal{stats.closedCount !== 1 ? 's' : ''} this month worth {formatCurrency(stats.closedValue)}
                    </div>
                  </div>
                )}

                {stats.pipelineValue > 0 && (
                  <div style={{ 
                    padding: 'var(--spacing-md)', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--amber-400)' }}>
                      📊 Active Pipeline
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {stats.pipelineCount} deal{stats.pipelineCount !== 1 ? 's' : ''} in pipeline worth {formatCurrency(stats.pipelineValue)}
                    </div>
                  </div>
                )}

                {stats.activitiesCount < 10 && (
                  <div style={{ 
                    padding: 'var(--spacing-md)', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--red-400)' }}>
                      ⚠️ Low Activity
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Only {stats.activitiesCount} activit{stats.activitiesCount !== 1 ? 'ies' : 'y'} this month. Consider increasing follow-ups.
                    </div>
                  </div>
                )}

                {stats.hotlistCount === 0 && stats.totalContacts > 0 && (
                  <div style={{ 
                    padding: 'var(--spacing-md)', 
                    background: 'rgba(100, 116, 139, 0.1)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(100, 116, 139, 0.2)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--text-secondary)' }}>
                      💡 Tip
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      No hot leads currently. Review your contacts and mark high-priority leads as hot.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No stats available</p>
          </div>
        )}
      </div>
    </>
  );
}


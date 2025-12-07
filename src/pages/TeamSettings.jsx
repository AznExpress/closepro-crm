import { useState, useEffect } from 'react';
import { useTeam } from '../store/TeamContext';
import { useAuth } from '../store/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Users, Plus, LogOut, ToggleLeft, ToggleRight, Check, X, AlertCircle } from 'lucide-react';

export default function TeamSettings() {
  const { user } = useAuth();
  const { 
    team, 
    teamMembers, 
    showTeamDeals, 
    loading, 
    isInTeam, 
    isTeamOwner,
    createTeam, 
    joinTeam, 
    leaveTeam, 
    toggleTeamDeals,
    refresh 
  } = useTeam();
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [memberEmails, setMemberEmails] = useState({});

  useEffect(() => {
    if (isInTeam) {
      loadMemberEmails();
    }
  }, [isInTeam, teamMembers]);

  const loadMemberEmails = async () => {
    if (!isSupabaseConfigured() || !team) return;

    const emails = {};
    
    // Get current user's email (this always works)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id && teamMembers.some(m => m.user_id === currentUser.id)) {
        emails[currentUser.id] = currentUser.email || 'Current User';
      }
    } catch (err) {
      console.error('Error loading current user email:', err);
    }

    // For other members, we'll need to use a database function or show a fallback
    // For now, we'll show a formatted user ID
    teamMembers.forEach(member => {
      if (!emails[member.user_id]) {
        // Format: user_abc123... -> abc123
        const shortId = member.user_id.split('_')[1]?.slice(0, 8) || member.user_id.slice(0, 8);
        emails[member.user_id] = `user_${shortId}@team.local`;
      }
    });

    setMemberEmails(emails);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      await createTeam(teamName.trim());
      setSuccess('Team created successfully!');
      setShowCreateTeam(false);
      setTeamName('');
    } catch (err) {
      setError(err.message || 'Failed to create team');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!teamCode.trim()) {
      setError('Team code is required');
      return;
    }

    try {
      // In a real app, you'd look up team by code
      // For now, we'll use team ID directly
      await joinTeam(teamCode.trim());
      setSuccess('Joined team successfully!');
      setShowJoinTeam(false);
      setTeamCode('');
    } catch (err) {
      setError(err.message || 'Failed to join team');
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team? You will lose access to team features.')) {
      return;
    }

    try {
      await leaveTeam();
      setSuccess('Left team successfully');
    } catch (err) {
      setError(err.message || 'Failed to leave team');
    }
  };

  const handleToggleTeamDeals = async (enabled) => {
    try {
      await toggleTeamDeals(enabled);
    } catch (err) {
      setError(err.message || 'Failed to update setting');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading team settings...</p>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Team Settings</h1>
            <p className="page-subtitle">
              {isInTeam ? `Manage your team: ${team?.name}` : 'Create or join a team to collaborate'}
            </p>
          </div>
        </div>
      </header>

      <div className="page-content">
        {error && (
          <div className="alert alert-error animate-slide-up">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success animate-slide-up">
            <Check size={18} />
            {success}
          </div>
        )}

        {!isInTeam ? (
          <div className="card animate-slide-up">
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }} />
              <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>No Team Yet</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
                Create a new team or join an existing one to collaborate with your colleagues
              </p>
              
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowCreateTeam(true);
                    setShowJoinTeam(false);
                  }}
                >
                  <Plus size={18} />
                  Create Team
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowJoinTeam(true);
                    setShowCreateTeam(false);
                  }}
                >
                  <Users size={18} />
                  Join Team
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Team Info */}
            <div className="card animate-slide-up stagger-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>{team?.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Team ID: {team?.id}
                  </p>
                </div>
                {isTeamOwner && (
                  <span className="badge" style={{ background: 'var(--accent)', color: 'white' }}>
                    Owner
                  </span>
                )}
              </div>

              {/* Team Members */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem' }}>Team Members</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {teamMembers.map(member => {
                    const email = member.email || memberEmails[member.user_id] || `user_${member.user_id.slice(0, 8)}`;
                    const isCurrentUser = member.user_id === user?.id;
                    const isOwner = member.user_id === team?.owner_id;
                    
                    return (
                      <div 
                        key={member.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--spacing-sm)',
                          background: isCurrentUser ? 'var(--bg-tertiary)' : 'transparent',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {email}
                            {isCurrentUser && ' (You)'}
                          </div>
                          {isOwner && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team Settings */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem' }}>Settings</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Show Team Deals</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Opt-in to see all team deals in your pipeline view
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleTeamDeals(!showTeamDeals)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: showTeamDeals ? 'var(--accent)' : 'var(--text-muted)'
                    }}
                  >
                    {showTeamDeals ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </div>

              {/* Leave Team */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>
                <button 
                  className="btn btn-danger" 
                  onClick={handleLeaveTeam}
                  style={{ width: '100%' }}
                >
                  <LogOut size={18} />
                  Leave Team
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="modal-overlay" onClick={() => setShowCreateTeam(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2>Create Team</h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowCreateTeam(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTeam}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label className="form-label">Team Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Smith Realty Team"
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTeam(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Team Modal */}
        {showJoinTeam && (
          <div className="modal-overlay" onClick={() => setShowJoinTeam(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2>Join Team</h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowJoinTeam(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleJoinTeam}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label className="form-label">Team ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="Enter team ID"
                    autoFocus
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                    Ask your team leader for the team ID
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowJoinTeam(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Join Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


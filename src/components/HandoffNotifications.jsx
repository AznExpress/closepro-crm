import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingHandoffs, respondToHandoff } from '../services/teamService';
import { Users, Check, X, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function HandoffNotifications() {
  const navigate = useNavigate();
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    loadHandoffs();
    // Refresh every 30 seconds
    const interval = setInterval(loadHandoffs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHandoffs = async () => {
    try {
      const data = await getPendingHandoffs();
      setHandoffs(data.filter(h => !dismissed.has(h.id)));
    } catch (err) {
      console.error('Error loading handoffs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (handoffId, accept) => {
    try {
      await respondToHandoff(handoffId, accept);
      setDismissed(prev => new Set([...prev, handoffId]));
      await loadHandoffs();
      
      if (accept) {
        // Navigate to the contact if accepted
        const handoff = handoffs.find(h => h.id === handoffId);
        if (handoff?.contact?.id) {
          navigate(`/contacts/${handoff.contact.id}`);
        }
      }
    } catch (err) {
      alert('Failed to respond: ' + err.message);
    }
  };

  const handleDismiss = (handoffId) => {
    setDismissed(prev => new Set([...prev, handoffId]));
    setHandoffs(prev => prev.filter(h => h.id !== handoffId));
  };

  if (loading || handoffs.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)',
      maxWidth: '400px'
    }}>
      {handoffs.map(handoff => {
        const contactName = handoff.contact 
          ? `${handoff.contact.firstName} ${handoff.contact.lastName}`
          : 'a contact';
        
        const isRequest = handoff.handoff_type === 'requested';
        const fromEmail = handoff.from_user?.email || 'teammate';

        return (
          <div
            key={handoff.id}
            className="card animate-slide-up"
            style={{
              border: '2px solid var(--purple-400)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
              <div style={{ 
                padding: 'var(--spacing-sm)', 
                background: 'var(--purple-400)', 
                borderRadius: 'var(--radius-md)',
                color: 'white',
                flexShrink: 0
              }}>
                <Users size={20} />
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--text-primary)' }}>
                  {isRequest ? 'Lead Request' : 'Lead Assigned'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                  {isRequest 
                    ? `${fromEmail} requested ${contactName}`
                    : `${fromEmail} assigned ${contactName} to you`}
                </div>
                {handoff.note && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    fontStyle: 'italic',
                    marginBottom: 'var(--spacing-xs)',
                    padding: 'var(--spacing-xs)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    "{handoff.note}"
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(handoff.created_at), { addSuffix: true })}
                </div>
              </div>

              <button
                className="btn btn-icon btn-ghost"
                onClick={() => handleDismiss(handoff.id)}
                style={{ flexShrink: 0 }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {isRequest && (
              <div style={{ 
                display: 'flex', 
                gap: 'var(--spacing-sm)', 
                marginTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--spacing-sm)'
              }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleRespond(handoff.id, true)}
                  style={{ flex: 1 }}
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRespond(handoff.id, false)}
                  style={{ flex: 1 }}
                >
                  <X size={14} />
                  Decline
                </button>
              </div>
            )}

            {!isRequest && (
              <div style={{ 
                marginTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--border)',
                paddingTop: 'var(--spacing-sm)'
              }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (handoff.contact?.id) {
                      navigate(`/contacts/${handoff.contact.id}`);
                    }
                    handleDismiss(handoff.id);
                  }}
                  style={{ width: '100%' }}
                >
                  View Contact
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


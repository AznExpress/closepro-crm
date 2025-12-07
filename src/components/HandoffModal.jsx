import { useState, useEffect } from 'react';
import { useTeam } from '../store/TeamContext';
import { assignLead, requestLead } from '../services/teamService';
import { Users, X, AlertCircle, Check } from 'lucide-react';

export default function HandoffModal({ contact, onClose, onHandoffComplete }) {
  const { teamMembers, team } = useTeam();
  const [handoffType, setHandoffType] = useState('assigned'); // 'assigned' or 'requested'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUserId) {
      setError('Please select a teammate');
      return;
    }

    setLoading(true);
    try {
      if (handoffType === 'assigned') {
        await assignLead(contact.id, selectedUserId, note);
        setSuccess('Lead assigned successfully!');
      } else {
        await requestLead(contact.id, selectedUserId, note);
        setSuccess('Lead request sent!');
      }
      
      setTimeout(() => {
        onHandoffComplete?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to hand off lead');
    } finally {
      setLoading(false);
    }
  };

  // Filter out current user from team members
  const availableMembers = teamMembers.filter(m => {
    // We'll need to get current user ID from auth context
    // For now, we'll show all members and let the backend handle it
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2>Hand Off Lead</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-md)' }}>
            <Check size={18} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Handoff Type Selection */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label className="form-label">Handoff Type</label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                type="button"
                className={`btn ${handoffType === 'assigned' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHandoffType('assigned')}
                style={{ flex: 1 }}
              >
                Assign (One-way)
              </button>
              <button
                type="button"
                className={`btn ${handoffType === 'requested' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHandoffType('requested')}
                style={{ flex: 1 }}
              >
                Request (Two-way)
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
              {handoffType === 'assigned' 
                ? 'Directly assign this lead to a teammate'
                : 'Request this lead from a teammate (requires their approval)'}
            </p>
          </div>

          {/* Contact Info */}
          <div style={{ 
            marginBottom: 'var(--spacing-md)', 
            padding: 'var(--spacing-md)', 
            background: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <div style={{ fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              {contact.firstName} {contact.lastName}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {contact.email} • {contact.phone}
            </div>
          </div>

          {/* Team Member Selection */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label className="form-label">
              {handoffType === 'assigned' ? 'Assign To' : 'Request From'}
            </label>
            <select
              className="form-input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="">Select teammate...</option>
              {availableMembers.map(member => {
                const displayName = member.email || `Team Member ${member.user_id.slice(0, 8)}`;
                return (
                  <option key={member.id} value={member.user_id}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Note (Optional)</label>
            <textarea
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this handoff..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : handoffType === 'assigned' ? 'Assign Lead' : 'Request Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


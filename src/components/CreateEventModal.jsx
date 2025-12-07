import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, User, FileText } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useCRM } from '../store/CRMContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { format, addHours } from 'date-fns';
import { createGoogleCalendarEvent, createOutlookCalendarEvent } from '../services/calendarService';

export default function CreateEventModal({ onClose, defaultDate = null, defaultContactId = null, onEventCreated }) {
  const { user } = useAuth();
  const { contacts, reminders } = useCRM();
  
  // Default to today at 2pm, or use provided date
  const defaultStart = defaultDate 
    ? new Date(defaultDate.setHours(14, 0, 0, 0))
    : addHours(new Date(), 1);
  const defaultEnd = addHours(defaultStart, 1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
    allDay: false,
    contactId: defaultContactId || '',
    reminderId: '',
    eventType: 'other',
    syncToCalendar: false,
    calendarAccountId: ''
  });

  const [calendarAccounts, setCalendarAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCalendarAccounts();
  }, []);

  const loadCalendarAccounts = async () => {
    if (!isSupabaseConfigured() || !user) return;

    try {
      const { data } = await supabase
        .from('calendar_accounts')
        .select('*')
        .eq('sync_enabled', true);

      setCalendarAccounts(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, calendarAccountId: data[0].id }));
      }
    } catch (err) {
      console.error('Error loading calendar accounts:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Event title is required');
      }

      const startTime = new Date(formData.startTime);
      const endTime = new Date(formData.endTime);

      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      // Create event in database
      const eventData = {
        user_id: user.id,
        contact_id: formData.contactId || null,
        reminder_id: formData.reminderId || null,
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: formData.allDay,
        event_type: formData.eventType,
        calendar_account_id: formData.syncToCalendar ? formData.calendarAccountId : null
      };

      let externalEventId = null;
      let htmlLink = null;

      // Sync to external calendar if enabled
      if (formData.syncToCalendar && formData.calendarAccountId) {
        const account = calendarAccounts.find(a => a.id === formData.calendarAccountId);
        if (account) {
          try {
            const calendarEvent = {
              title: formData.title,
              description: formData.description,
              location: formData.location,
              start: startTime.toISOString(),
              end: endTime.toISOString(),
              allDay: formData.allDay
            };

            if (account.provider === 'google') {
              const result = await createGoogleCalendarEvent(account.access_token, calendarEvent);
              externalEventId = result.externalEventId;
              htmlLink = result.htmlLink;
            } else if (account.provider === 'outlook') {
              const result = await createOutlookCalendarEvent(account.access_token, calendarEvent);
              externalEventId = result.externalEventId;
              htmlLink = result.htmlLink;
            }
          } catch (err) {
            console.error('Failed to sync to calendar:', err);
            // Continue creating local event even if sync fails
          }
        }
      }

      const { error: dbError } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          external_event_id: externalEventId,
          html_link: htmlLink
        });

      if (dbError) throw dbError;

      if (onEventCreated) {
        onEventCreated();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Event</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Property Showing"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="allDay"
                  checked={formData.allDay}
                  onChange={handleChange}
                />
                <span style={{ marginLeft: 'var(--spacing-sm)' }}>All day event</span>
              </label>
            </div>

            <div className="form-group">
              <label>Location</label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Property address or meeting location"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Event details, notes, or agenda..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact (optional)</label>
                <select
                  name="contactId"
                  value={formData.contactId}
                  onChange={handleChange}
                >
                  <option value="">No contact linked</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                >
                  <option value="showing">Showing</option>
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {calendarAccounts.length > 0 && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="syncToCalendar"
                    checked={formData.syncToCalendar}
                    onChange={handleChange}
                  />
                  <span style={{ marginLeft: 'var(--spacing-sm)' }}>Sync to calendar</span>
                </label>
                {formData.syncToCalendar && (
                  <select
                    name="calendarAccountId"
                    value={formData.calendarAccountId}
                    onChange={handleChange}
                    style={{ marginTop: 'var(--spacing-sm)' }}
                  >
                    {calendarAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.provider === 'google' ? '📅' : '📬'} {account.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


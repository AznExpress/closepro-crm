import { useState } from 'react';
import { X } from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { format, addHours, addDays } from 'date-fns';

export default function AddReminderModal({ onClose, defaultContactId = '' }) {
  const { addReminder, contacts } = useCRM();
  
  // Default to tomorrow at 9am
  const defaultDate = addDays(new Date(), 1);
  defaultDate.setHours(9, 0, 0, 0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: defaultContactId,
    dueDate: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    priority: 'medium'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    addReminder({
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString()
    });
    onClose();
  };

  const quickSetTime = (hours) => {
    const date = addHours(new Date(), hours);
    setFormData(prev => ({
      ...prev,
      dueDate: format(date, "yyyy-MM-dd'T'HH:mm")
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Reminder</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Follow up on showing"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Contact</label>
              <select
                name="contactId"
                value={formData.contactId}
                onChange={handleChange}
              >
                <option value="">No contact linked</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Due Date & Time</label>
              <input
                type="datetime-local"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickSetTime(1)}
                >
                  In 1 hour
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickSetTime(4)}
                >
                  In 4 hours
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickSetTime(24)}
                >
                  Tomorrow
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickSetTime(24 * 7)}
                >
                  Next week
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {[
                  { value: 'high', label: 'High', color: 'var(--rose-500)' },
                  { value: 'medium', label: 'Medium', color: 'var(--amber-500)' },
                  { value: 'low', label: 'Low', color: 'var(--slate-500)' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn ${formData.priority === value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData(prev => ({ ...prev, priority: value }))}
                    style={{ 
                      flex: 1,
                      borderLeft: `3px solid ${color}`
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


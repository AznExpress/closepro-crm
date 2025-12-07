import { useState } from 'react';
import { X, Flame, ThermometerSun, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { useCRM, LEAD_SOURCES, DEAL_STAGES } from '../store/CRMContext';
import { format } from 'date-fns';

export default function EditContactModal({ contact, onClose }) {
  const { updateContact } = useCRM();
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [formData, setFormData] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone || '',
    company: contact.company || '',
    temperature: contact.temperature,
    propertyInterest: contact.propertyInterest || 'Buying',
    budget: contact.budget || '',
    leadSource: contact.leadSource || '',
    birthday: contact.birthday ? format(new Date(contact.birthday), 'yyyy-MM-dd') : '',
    homeAnniversary: contact.homeAnniversary ? format(new Date(contact.homeAnniversary), 'yyyy-MM-dd') : '',
    notes: contact.notes || '',
    dealStage: contact.dealStage || '',
    dealValue: contact.dealValue ? contact.dealValue.toString() : '',
    commissionNotes: contact.commissionNotes || '',
    expectedCloseDate: contact.expectedCloseDate ? format(new Date(contact.expectedCloseDate), 'yyyy-MM-dd') : ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in required fields');
      return;
    }
    updateContact({ 
      ...contact, 
      ...formData,
      dealValue: formData.dealValue ? parseFloat(formData.dealValue.replace(/[^0-9.]/g, '')) : null,
      expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString() : null,
      birthday: formData.birthday || null,
      commissionNotes: formData.commissionNotes || null,
      homeAnniversary: formData.homeAnniversary || null
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Contact</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Lead Temperature</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {[
                  { value: 'hot', icon: Flame, label: 'Hot' },
                  { value: 'warm', icon: ThermometerSun, label: 'Warm' },
                  { value: 'cold', icon: Snowflake, label: 'Cold' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn ${formData.temperature === value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData(prev => ({ ...prev, temperature: value }))}
                    style={{ flex: 1 }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Interest</label>
                <select
                  name="propertyInterest"
                  value={formData.propertyInterest}
                  onChange={handleChange}
                >
                  <option value="Buying">Buying</option>
                  <option value="Selling">Selling</option>
                  <option value="Renting">Renting</option>
                  <option value="Investing">Investing</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lead Source</label>
                <select
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                >
                  <option value="">Select source...</option>
                  {LEAD_SOURCES.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Budget / Price Range</label>
                <input
                  type="text"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Advanced Section */}
            <button
              type="button"
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvanced ? 'Hide' : 'Show'} Deal & Personal Info
            </button>

            {showAdvanced && (
              <div className="advanced-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Deal Stage</label>
                    <select
                      name="dealStage"
                      value={formData.dealStage}
                      onChange={handleChange}
                    >
                      <option value="">No active deal</option>
                      {DEAL_STAGES.map(stage => (
                        <option key={stage.id} value={stage.id}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Deal Value</label>
                    <input
                      type="text"
                      name="dealValue"
                      value={formData.dealValue}
                      onChange={handleChange}
                      placeholder="$500,000"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ width: '100%' }}>
                    <label>Commission Notes</label>
                    <textarea
                      name="commissionNotes"
                      value={formData.commissionNotes}
                      onChange={handleChange}
                      placeholder="Commission split details, notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expected Close Date</label>
                    <input
                      type="date"
                      name="expectedCloseDate"
                      value={formData.expectedCloseDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Birthday</label>
                    <input
                      type="date"
                      name="birthday"
                      value={formData.birthday}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Home Anniversary (for past clients)</label>
                  <input
                    type="date"
                    name="homeAnniversary"
                    value={formData.homeAnniversary}
                    onChange={handleChange}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    The date they closed on their home purchase
                  </small>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

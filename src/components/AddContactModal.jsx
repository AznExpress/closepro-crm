import { useState } from 'react';
import { X, Flame, ThermometerSun, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { useCRM, LEAD_SOURCES, DEAL_STAGES } from '../store/CRMContext';

export default function AddContactModal({ onClose, defaultDealStage = null }) {
  const { addContact } = useCRM();
  const [showAdvanced, setShowAdvanced] = useState(!!defaultDealStage);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    temperature: 'warm',
    propertyInterest: 'Buying',
    budget: '',
    leadSource: '',
    birthday: '',
    notes: '',
    // Deal fields
    dealStage: defaultDealStage || '',
    dealValue: '',
    expectedCloseDate: ''
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
    addContact({
      ...formData,
      dealValue: formData.dealValue ? parseFloat(formData.dealValue.replace(/[^0-9.]/g, '')) : null,
      expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString() : null,
      birthday: formData.birthday || null
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Contact</h2>
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
                  placeholder="John"
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
                  placeholder="Smith"
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
                  placeholder="john@email.com"
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
                  placeholder="(555) 123-4567"
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
                  placeholder="$500,000 - $750,000"
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Optional"
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
                      {DEAL_STAGES.filter(s => s.id !== 'closed' && s.id !== 'lost').map(stage => (
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
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any important details about this contact..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

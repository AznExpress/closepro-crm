import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  Flame,
  ThermometerSun,
  Snowflake,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { formatDistanceToNow } from 'date-fns';
import AddContactModal from '../components/AddContactModal';

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    filteredContacts, 
    searchQuery, 
    filterTemperature,
    setSearch, 
    setFilter,
    deleteContact,
    contacts
  } = useCRM();
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  // Sync URL params with state
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter && ['hot', 'warm', 'cold'].includes(filter)) {
      setFilter(filter);
    }
  }, [searchParams, setFilter]);

  const handleFilterChange = (filter) => {
    setFilter(filter);
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const handleDelete = (e, contactId) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteContact(contactId);
    }
    setMenuOpen(null);
  };

  const temperatureIcons = {
    hot: <Flame size={14} />,
    warm: <ThermometerSun size={14} />,
    cold: <Snowflake size={14} />
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Contacts</h1>
            <p className="page-subtitle">
              {contacts.length} contacts • {filteredContacts.length} showing
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddContact(true)}>
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="search-filters animate-slide-up">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filter-tabs">
            {['all', 'hot', 'warm', 'cold'].map(filter => (
              <button
                key={filter}
                className={`filter-tab ${filterTemperature === filter ? 'active' : ''}`}
                onClick={() => handleFilterChange(filter)}
              >
                {filter === 'all' ? 'All' : (
                  <>
                    {temperatureIcons[filter]}
                    <span style={{ marginLeft: '4px', textTransform: 'capitalize' }}>{filter}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredContacts.length > 0 ? (
          <div className="contact-list animate-slide-up stagger-1">
            {filteredContacts.map((contact, index) => (
              <div 
                key={contact.id} 
                className="contact-card"
                onClick={() => navigate(`/contacts/${contact.id}`)}
                style={{ animationDelay: `${(index % 10) * 30}ms` }}
              >
                <div className="avatar">
                  {contact.firstName[0]}{contact.lastName[0]}
                </div>
                <div className="contact-info">
                  <div className="contact-name">
                    {contact.firstName} {contact.lastName}
                    <span className={`badge badge-${contact.temperature}`}>
                      {temperatureIcons[contact.temperature]}
                      <span style={{ marginLeft: '4px' }}>{contact.temperature}</span>
                    </span>
                  </div>
                  <div className="contact-details">
                    {contact.propertyInterest}
                    {contact.company && ` • ${contact.company}`}
                    {contact.budget && ` • ${contact.budget}`}
                  </div>
                </div>
                <div className="contact-meta">
                  <span title="Last contact">
                    {formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}
                  </span>
                </div>
                <div className="contact-actions">
                  <button 
                    className="btn btn-icon btn-ghost" 
                    title="Call"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${contact.phone}`;
                    }}
                  >
                    <Phone size={16} />
                  </button>
                  <button 
                    className="btn btn-icon btn-ghost" 
                    title="Email"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${contact.email}`;
                    }}
                  >
                    <Mail size={16} />
                  </button>
                  <button 
                    className="btn btn-icon btn-ghost" 
                    title="Schedule"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar size={16} />
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="btn btn-icon btn-ghost" 
                      title="More"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === contact.id ? null : contact.id);
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpen === contact.id && (
                      <div 
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--spacing-xs)',
                          minWidth: '120px',
                          zIndex: 10
                        }}
                      >
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ 
                            width: '100%', 
                            justifyContent: 'flex-start',
                            color: 'var(--rose-400)'
                          }}
                          onClick={(e) => handleDelete(e, contact.id)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state animate-slide-up">
            <div className="empty-state-icon">
              <Search size={28} />
            </div>
            <div className="empty-state-title">No contacts found</div>
            <p className="text-muted">
              {searchQuery ? 'Try a different search term' : 'Add your first contact to get started'}
            </p>
            {!searchQuery && (
              <button 
                className="btn btn-primary" 
                style={{ marginTop: 'var(--spacing-md)' }}
                onClick={() => setShowAddContact(true)}
              >
                <Plus size={18} />
                Add Contact
              </button>
            )}
          </div>
        )}
      </div>

      {showAddContact && (
        <AddContactModal onClose={() => setShowAddContact(false)} />
      )}
    </>
  );
}


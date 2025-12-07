import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Phone, 
  Mail, 
  Building2,
  Calendar,
  Flame,
  ThermometerSun,
  Snowflake,
  Clock,
  Edit2,
  Trash2,
  Plus,
  Bell,
  Check,
  MapPin,
  Home,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Gift,
  DollarSign,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import { useCRM, LEAD_SOURCES, DEAL_STAGES } from '../store/CRMContext';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import AddReminderModal from '../components/AddReminderModal';
import EditContactModal from '../components/EditContactModal';
import CreateEventModal from '../components/CreateEventModal';
import HandoffModal from '../components/HandoffModal';
import { useTeam } from '../store/TeamContext';
import { Users, MessageSquare, Plus, X } from 'lucide-react';
import { addTeamNote, getTeamNotes } from '../services/teamService';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getContactById, 
    getRemindersForContact, 
    addActivity, 
    addShowing,
    deleteShowing,
    deleteContact,
    completeReminder
  } = useCRM();
  
  const contact = getContactById(id);
  const reminders = getRemindersForContact(id);
  
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showAddShowing, setShowAddShowing] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [teamNotes, setTeamNotes] = useState([]);
  const [showAddTeamNote, setShowAddTeamNote] = useState(false);
  const [teamNoteText, setTeamNoteText] = useState('');
  
  const { isInTeam, team } = useTeam();

  useEffect(() => {
    if (isInTeam && team && contact) {
      loadTeamNotes();
    }
  }, [isInTeam, team, contact?.id]);

  const loadTeamNotes = async () => {
    if (!team || !contact) return;
    try {
      const notes = await getTeamNotes(contact.id, team.id);
      setTeamNotes(notes);
    } catch (err) {
      console.error('Error loading team notes:', err);
    }
  };

  const handleAddTeamNote = async () => {
    if (!teamNoteText.trim() || !team || !contact) return;
    
    try {
      await addTeamNote(contact.id, team.id, teamNoteText.trim(), true);
      setTeamNoteText('');
      setShowAddTeamNote(false);
      loadTeamNotes();
    } catch (err) {
      alert('Failed to add team note: ' + err.message);
    }
  };
  const [activityType, setActivityType] = useState('call');
  const [activityNote, setActivityNote] = useState('');
  
  // Showing form state
  const [showingData, setShowingData] = useState({
    address: '',
    reaction: 'maybe',
    notes: ''
  });

  if (!contact) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Contact not found</div>
          <button className="btn btn-primary" onClick={() => navigate('/contacts')}>
            <ArrowLeft size={18} />
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  const temperatureIcons = {
    hot: <Flame size={16} />,
    warm: <ThermometerSun size={16} />,
    cold: <Snowflake size={16} />
  };

  const reactionIcons = {
    loved: { icon: ThumbsUp, color: 'var(--emerald-400)', label: 'Loved it' },
    maybe: { icon: Minus, color: 'var(--amber-400)', label: 'Maybe' },
    pass: { icon: ThumbsDown, color: 'var(--rose-400)', label: 'Pass' }
  };

  const activityTypes = ['call', 'email', 'meeting', 'showing', 'note'];
  const leadSource = LEAD_SOURCES.find(s => s.value === contact.leadSource);
  const dealStage = DEAL_STAGES.find(s => s.id === contact.dealStage);

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!activityNote.trim()) return;
    
    addActivity(contact.id, {
      type: activityType,
      note: activityNote
    });
    setActivityNote('');
  };

  const handleAddShowing = (e) => {
    e.preventDefault();
    if (!showingData.address.trim()) return;
    
    addShowing(contact.id, showingData);
    setShowingData({ address: '', reaction: 'maybe', notes: '' });
    setShowAddShowing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      deleteContact(contact.id);
      navigate('/contacts');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <>
      <header className="page-header">
        <button 
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 'var(--spacing-md)' }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        
        <div className="contact-header">
          <div className="avatar avatar-lg">
            {contact.firstName[0]}{contact.lastName[0]}
          </div>
          <div className="contact-header-info">
            <h1 className="contact-header-name">
              {contact.firstName} {contact.lastName}
              <span className={`badge badge-${contact.temperature}`}>
                {temperatureIcons[contact.temperature]}
                <span style={{ marginLeft: '4px' }}>{contact.temperature}</span>
              </span>
              {dealStage && (
                <span 
                  className="badge" 
                  style={{ 
                    background: `${dealStage.color}20`, 
                    color: dealStage.color,
                    marginLeft: '8px'
                  }}
                >
                  {dealStage.label}
                </span>
              )}
            </h1>
            <div className="contact-header-details">
              <span>
                <Mail size={16} />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </span>
              <span>
                <Phone size={16} />
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </span>
              {contact.company && (
                <span>
                  <Building2 size={16} />
                  {contact.company}
                </span>
              )}
              {leadSource && (
                <span style={{ color: leadSource.color }}>
                  via {leadSource.label}
                </span>
              )}
            </div>
          </div>
          <div className="contact-header-actions">
            <button className="btn btn-secondary" onClick={() => setShowEditContact(true)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="contact-grid">
          {/* Main Content */}
          <div>
            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                <a href={`tel:${contact.phone}`} className="btn btn-secondary">
                  <Phone size={18} />
                  Call
                </a>
                <a href={`mailto:${contact.email}`} className="btn btn-secondary">
                  <Mail size={18} />
                  Email
                </a>
                <button className="btn btn-secondary" onClick={() => setShowAddReminder(true)}>
                  <Bell size={18} />
                  Set Reminder
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddShowing(true)}>
                  <Home size={18} />
                  Log Showing
                </button>
                <button className="btn btn-secondary" onClick={() => setShowCreateEvent(true)}>
                  <CalendarDays size={18} />
                  Calendar Event
                </button>
                {isInTeam && (
                  <button className="btn btn-secondary" onClick={() => setShowHandoff(true)}>
                    <Users size={18} />
                    Hand Off Lead
                  </button>
                )}
              </div>
            </div>

            {/* Property Showings */}
            {(contact.showings?.length > 0 || showAddShowing) && (
              <div className="card animate-slide-up" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                  <h3>Property Showings</h3>
                  {!showAddShowing && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowAddShowing(true)}>
                      <Plus size={16} /> Add
                    </button>
                  )}
                </div>
                
                {showAddShowing && (
                  <form onSubmit={handleAddShowing} className="showing-form">
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Property address"
                        value={showingData.address}
                        onChange={(e) => setShowingData({ ...showingData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Client's Reaction</label>
                      <div className="reaction-buttons">
                        {Object.entries(reactionIcons).map(([key, { icon: Icon, color, label }]) => (
                          <button
                            key={key}
                            type="button"
                            className={`reaction-btn ${showingData.reaction === key ? 'active' : ''}`}
                            onClick={() => setShowingData({ ...showingData, reaction: key })}
                            style={{ '--reaction-color': color }}
                          >
                            <Icon size={18} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={showingData.notes}
                        onChange={(e) => setShowingData({ ...showingData, notes: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <button type="submit" className="btn btn-primary btn-sm">
                        <Plus size={14} /> Add Showing
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowAddShowing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {contact.showings?.length > 0 && (
                  <div className="showings-list">
                    {contact.showings.map(showing => {
                      const reaction = reactionIcons[showing.reaction];
                      return (
                        <div key={showing.id} className="showing-item">
                          <div 
                            className="showing-reaction"
                            style={{ background: `${reaction.color}20`, color: reaction.color }}
                          >
                            <reaction.icon size={16} />
                          </div>
                          <div className="showing-content">
                            <div className="showing-address">{showing.address}</div>
                            {showing.notes && (
                              <div className="showing-notes">{showing.notes}</div>
                            )}
                            <div className="showing-date">
                              {format(new Date(showing.date), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <button 
                            className="btn btn-icon btn-ghost"
                            onClick={() => deleteShowing(contact.id, showing.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add Activity */}
            <div className="card animate-slide-up stagger-1" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Log Activity</h3>
              <form onSubmit={handleAddActivity} className="activity-form">
                <div className="activity-type-buttons">
                  {activityTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`activity-type-btn ${activityType === type ? 'active' : ''}`}
                      onClick={() => setActivityType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <input
                    type="text"
                    placeholder={`What happened during the ${activityType}?`}
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!activityNote.trim()}>
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Activity Timeline */}
            <div className="card animate-slide-up stagger-2">
              <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Activity History</h3>
              
              {contact.activities && contact.activities.length > 0 ? (
                <div className="activity-timeline">
                  {contact.activities.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-icon ${activity.type}`}>
                        {activity.type === 'call' && <Phone size={14} />}
                        {activity.type === 'email' && <Mail size={14} />}
                        {activity.type === 'meeting' && <Calendar size={14} />}
                        {activity.type === 'showing' && <MapPin size={14} />}
                        {activity.type === 'note' && <Edit2 size={14} />}
                      </div>
                      <div className="activity-content">
                        <div className="activity-type">{activity.type}</div>
                        <div className="activity-note">{activity.note}</div>
                        <div className="activity-date">
                          {format(new Date(activity.date), 'MMM d, yyyy')} at {format(new Date(activity.date), 'h:mm a')}
                          <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                            ({formatDistanceToNow(new Date(activity.date), { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Clock size={28} />
                  </div>
                  <div className="empty-state-title">No activity yet</div>
                  <p className="text-muted">Log your first interaction above</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Deal Info */}
            {(contact.dealStage || contact.dealValue) && (
              <div className="card animate-slide-up" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--amber-500)' }} />
                  Deal Info
                </h3>
                
                {contact.dealValue && (
                  <div className="deal-value-display">
                    <DollarSign size={20} />
                    {formatCurrency(contact.dealValue)}
                  </div>
                )}
                
                {contact.expectedCloseDate && (
                  <div className="info-section">
                    <div className="info-label">Expected Close</div>
                    <div className="info-value">
                      {format(new Date(contact.expectedCloseDate), 'MMMM d, yyyy')}
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                        ({formatDistanceToNow(new Date(contact.expectedCloseDate), { addSuffix: true })})
                      </span>
                    </div>
                  </div>
                )}

                {contact.commissionNotes && (
                  <div className="info-section">
                    <div className="info-label">Commission Notes</div>
                    <div className="info-value" style={{ whiteSpace: 'pre-wrap' }}>
                      {contact.commissionNotes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Important Dates */}
            {(contact.birthday || contact.homeAnniversary) && (
              <div className="card animate-slide-up stagger-1" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={18} style={{ color: 'var(--rose-400)' }} />
                  Important Dates
                </h3>
                
                {contact.birthday && (
                  <div className="date-item">
                    <div className="date-icon birthday">🎂</div>
                    <div className="date-content">
                      <div className="date-label">Birthday</div>
                      <div className="date-value">
                        {format(new Date(contact.birthday), 'MMMM d')}
                      </div>
                    </div>
                  </div>
                )}
                
                {contact.homeAnniversary && (
                  <div className="date-item">
                    <div className="date-icon anniversary">🏠</div>
                    <div className="date-content">
                      <div className="date-label">Home Anniversary</div>
                      <div className="date-value">
                        {format(new Date(contact.homeAnniversary), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Notes */}
            {isInTeam && team && (
              <div className="card animate-slide-up stagger-1" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: 'var(--purple-400)' }} />
                    Team Notes
                  </h3>
                  {!showAddTeamNote && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setShowAddTeamNote(true)}
                    >
                      <Plus size={16} />
                      Add Note
                    </button>
                  )}
                </div>

                {showAddTeamNote && (
                  <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <textarea
                      className="form-input"
                      value={teamNoteText}
                      onChange={(e) => setTeamNoteText(e.target.value)}
                      placeholder="Add an internal team note..."
                      rows={3}
                      style={{ marginBottom: 'var(--spacing-sm)' }}
                    />
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => {
                          setShowAddTeamNote(false);
                          setTeamNoteText('');
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={handleAddTeamNote}
                        disabled={!teamNoteText.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {teamNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--text-muted)' }}>
                    No team notes yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {teamNotes.map(note => (
                      <div 
                        key={note.id}
                        style={{
                          padding: 'var(--spacing-md)',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 'var(--spacing-xs)' }}>
                          {note.note}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Contact Info */}
            <div className="card animate-slide-up stagger-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Details</h3>
              
              <div className="info-section">
                <div className="info-label">Interest</div>
                <div className="info-value">{contact.propertyInterest || 'Not specified'}</div>
              </div>
              
              <div className="info-section">
                <div className="info-label">Budget</div>
                <div className="info-value">{contact.budget || 'Not specified'}</div>
              </div>
              
              {leadSource && (
                <div className="info-section">
                  <div className="info-label">Lead Source</div>
                  <div className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: leadSource.color 
                      }} 
                    />
                    {leadSource.label}
                  </div>
                </div>
              )}
              
              <div className="info-section">
                <div className="info-label">Added</div>
                <div className="info-value">
                  {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-label">Last Contact</div>
                <div className="info-value">
                  {formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}
                </div>
              </div>
              
              {contact.notes && (
                <div className="info-section">
                  <div className="info-label">Notes</div>
                  <div className="info-value" style={{ whiteSpace: 'pre-wrap' }}>
                    {contact.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Reminders */}
            <div className="card animate-slide-up stagger-3">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                <h3>Reminders</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddReminder(true)}>
                  <Plus size={16} />
                </button>
              </div>
              
              {reminders.length > 0 ? (
                <div className="reminder-list">
                  {reminders.map(reminder => {
                    const isOverdue = isPast(new Date(reminder.dueDate)) && !isToday(new Date(reminder.dueDate));
                    
                    return (
                      <div 
                        key={reminder.id} 
                        className={`reminder-card ${isOverdue ? 'overdue' : ''}`}
                        style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                      >
                        <button 
                          className="reminder-checkbox"
                          onClick={() => completeReminder(reminder.id)}
                          style={{ width: '18px', height: '18px' }}
                        >
                          <Check size={12} style={{ opacity: 0 }} />
                        </button>
                        <div className="reminder-content">
                          <div className="reminder-title" style={{ fontSize: '0.875rem' }}>
                            {reminder.title}
                          </div>
                          <div className={`reminder-time ${isOverdue ? 'overdue' : ''}`} style={{ fontSize: '0.75rem' }}>
                            <Clock size={12} />
                            {isOverdue 
                              ? 'Overdue' 
                              : format(new Date(reminder.dueDate), 'MMM d, h:mm a')
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  No active reminders
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddReminder && (
        <AddReminderModal 
          onClose={() => setShowAddReminder(false)} 
          defaultContactId={contact.id}
        />
      )}
      
      {showEditContact && (
        <EditContactModal 
          contact={contact}
          onClose={() => setShowEditContact(false)} 
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => setShowCreateEvent(false)}
          defaultContactId={contact.id}
          onEventCreated={() => setShowCreateEvent(false)}
        />
      )}

      {showHandoff && contact && (
        <HandoffModal
          contact={contact}
          onClose={() => setShowHandoff(false)}
          onHandoffComplete={() => {
            // Refresh contact data if needed
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

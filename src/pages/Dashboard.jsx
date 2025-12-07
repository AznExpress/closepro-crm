import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  ThermometerSun, 
  Snowflake, 
  Bell, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  ArrowRight,
  Clock,
  Check,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';
import AddContactModal from '../components/AddContactModal';
import AddReminderModal from '../components/AddReminderModal';
import TeamActivityFeed from '../components/TeamActivityFeed';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    hotLeads, 
    warmLeads, 
    coldLeads, 
    overdueReminders, 
    todayReminders, 
    upcomingReminders,
    contacts,
    completeReminder,
    getContactById,
    pipelineValue,
    leadsBySource
  } = useCRM();
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);

  const formatCurrency = (value) => {
    if (!value) return '$0';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const stats = [
    { 
      icon: Flame, 
      label: 'Hot Leads', 
      value: hotLeads.length, 
      className: 'hot',
      onClick: () => navigate('/contacts?filter=hot')
    },
    { 
      icon: TrendingUp, 
      label: 'Pipeline Value', 
      value: formatCurrency(pipelineValue), 
      className: 'warm',
      onClick: () => navigate('/pipeline')
    },
    { 
      icon: Bell, 
      label: 'Due Today', 
      value: overdueReminders.length + todayReminders.length, 
      className: 'reminder',
      onClick: () => navigate('/reminders')
    },
    { 
      icon: DollarSign, 
      label: 'Total Contacts', 
      value: contacts.length, 
      className: 'cold',
      onClick: () => navigate('/contacts')
    }
  ];

  const urgentReminders = [...overdueReminders, ...todayReminders].slice(0, 5);

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Good {getGreeting()}, Jane</h1>
            <p className="page-subtitle">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • {contacts.length} contacts in your pipeline
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setShowAddReminder(true)}>
              <Bell size={18} />
              Add Reminder
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddContact(true)}>
              <Plus size={18} />
              Add Contact
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="quick-stats">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className={`stat-card animate-slide-up stagger-${index + 1}`}
              onClick={stat.onClick}
              style={{ cursor: 'pointer' }}
            >
              <div className={`stat-icon ${stat.className}`}>
                <stat.icon size={22} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
          {/* Today's Priorities */}
          <section className="section animate-slide-up stagger-3">
            <div className="section-header">
              <h2 className="section-title">Today's Priorities</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reminders')}>
                View All <ArrowRight size={16} />
              </button>
            </div>
            
            {urgentReminders.length > 0 ? (
              <div className="reminder-list">
                {urgentReminders.map(reminder => {
                  const contact = getContactById(reminder.contactId);
                  const isOverdue = isPast(new Date(reminder.dueDate)) && !isToday(new Date(reminder.dueDate));
                  
                  return (
                    <div 
                      key={reminder.id} 
                      className={`reminder-card ${isOverdue ? 'overdue' : ''}`}
                    >
                      <div className={`priority-indicator ${reminder.priority}`} />
                      <button 
                        className="reminder-checkbox"
                        onClick={() => completeReminder(reminder.id)}
                      >
                        <Check size={14} style={{ opacity: 0 }} />
                      </button>
                      <div className="reminder-content">
                        <div className="reminder-title">{reminder.title}</div>
                        <div className="reminder-meta">
                          <span className={`reminder-time ${isOverdue ? 'overdue' : ''}`}>
                            <Clock size={14} />
                            {isOverdue ? 'Overdue' : format(new Date(reminder.dueDate), 'h:mm a')}
                          </span>
                          {contact && (
                            <span 
                              className="reminder-contact"
                              onClick={() => navigate(`/contacts/${contact.id}`)}
                            >
                              {contact.firstName} {contact.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                <div className="empty-state-icon">
                  <Bell size={28} />
                </div>
                <div className="empty-state-title">All caught up!</div>
                <p className="text-muted">No urgent reminders for today</p>
              </div>
            )}
          </section>

          {/* Hot Leads */}
          <section className="section animate-slide-up stagger-4">
            <div className="section-header">
              <h2 className="section-title">
                <Flame size={20} style={{ color: 'var(--amber-500)', marginRight: '8px' }} />
                Hot Leads
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contacts?filter=hot')}>
                View All <ArrowRight size={16} />
              </button>
            </div>
            
            {hotLeads.length > 0 ? (
              <div className="contact-list">
                {hotLeads.slice(0, 4).map(contact => (
                  <div 
                    key={contact.id} 
                    className="contact-card"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <div className="avatar">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">
                        {contact.firstName} {contact.lastName}
                        <span className="badge badge-hot">Hot</span>
                      </div>
                      <div className="contact-details">
                        {contact.propertyInterest} • {contact.budget}
                      </div>
                    </div>
                    <div className="contact-meta">
                      <span title="Last contact">
                        {formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="contact-actions">
                      <button className="btn btn-icon btn-ghost" title="Call">
                        <Phone size={16} />
                      </button>
                      <button className="btn btn-icon btn-ghost" title="Email">
                        <Mail size={16} />
                      </button>
                      <button className="btn btn-icon btn-ghost" title="Schedule">
                        <Calendar size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                <div className="empty-state-icon">
                  <Flame size={28} />
                </div>
                <div className="empty-state-title">No hot leads yet</div>
                <p className="text-muted">Mark contacts as hot to see them here</p>
              </div>
            )}
          </section>
        </div>

        {/* Lead Sources & Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)' }}>
          {/* Lead Sources */}
          <section className="section animate-slide-up stagger-5">
            <div className="section-header">
              <h2 className="section-title">Lead Sources</h2>
            </div>
            <div className="card">
              {leadsBySource.length > 0 ? (
                <div className="lead-sources-list">
                  {leadsBySource.sort((a, b) => b.count - a.count).slice(0, 6).map(source => (
                    <div key={source.value} className="lead-source-item">
                      <div className="lead-source-info">
                        <span 
                          className="lead-source-dot" 
                          style={{ background: source.color }}
                        />
                        <span className="lead-source-name">{source.label}</span>
                      </div>
                      <div className="lead-source-stats">
                        <span className="lead-source-count">{source.count}</span>
                        {source.hotCount > 0 && (
                          <span className="lead-source-hot">
                            <Flame size={12} /> {source.hotCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                  Add lead sources to see analytics
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="section animate-slide-up stagger-5">
            <div className="section-header">
              <h2 className="section-title">Recent Activity</h2>
            </div>
            
            <div className="card">
              <div className="activity-timeline">
                {contacts
                  .flatMap(c => (c.activities || []).map(a => ({ ...a, contact: c })))
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 5)
                  .map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-icon ${activity.type}`}>
                        {activity.type === 'call' && <Phone size={14} />}
                        {activity.type === 'email' && <Mail size={14} />}
                        {activity.type === 'meeting' && <Calendar size={14} />}
                        {activity.type === 'showing' && <Calendar size={14} />}
                      </div>
                      <div className="activity-content">
                        <div className="activity-type">{activity.type}</div>
                        <div className="activity-note">{activity.note}</div>
                        <div className="activity-date">
                          <span 
                            className="reminder-contact"
                            onClick={() => navigate(`/contacts/${activity.contact.id}`)}
                            style={{ marginRight: '8px' }}
                          >
                            {activity.contact.firstName} {activity.contact.lastName}
                          </span>
                          • {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>

        {/* Team Activity Feed */}
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <TeamActivityFeed limit={10} />
        </div>
      </div>

      {showAddContact && (
        <AddContactModal onClose={() => setShowAddContact(false)} />
      )}
      
      {showAddReminder && (
        <AddReminderModal onClose={() => setShowAddReminder(false)} />
      )}
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

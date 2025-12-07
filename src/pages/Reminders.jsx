import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Clock,
  Check,
  Bell,
  Calendar,
  Trash2
} from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { format, isToday, isPast, isTomorrow, isThisWeek, addDays } from 'date-fns';
import AddReminderModal from '../components/AddReminderModal';

export default function Reminders() {
  const navigate = useNavigate();
  const { 
    upcomingReminders, 
    reminders,
    getContactById, 
    completeReminder,
    deleteReminder
  } = useCRM();
  
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  // Group reminders
  const overdueReminders = upcomingReminders.filter(r => 
    isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate))
  );
  
  const todayReminders = upcomingReminders.filter(r => 
    isToday(new Date(r.dueDate))
  );
  
  const tomorrowReminders = upcomingReminders.filter(r => 
    isTomorrow(new Date(r.dueDate))
  );
  
  const thisWeekReminders = upcomingReminders.filter(r => {
    const date = new Date(r.dueDate);
    return isThisWeek(date) && !isToday(date) && !isTomorrow(date) && !isPast(date);
  });
  
  const laterReminders = upcomingReminders.filter(r => {
    const date = new Date(r.dueDate);
    return date > addDays(new Date(), 7);
  });

  const completedReminders = reminders.filter(r => r.completed);

  const displayedReminders = filter === 'upcoming' 
    ? upcomingReminders 
    : completedReminders;

  const handleComplete = (id) => {
    completeReminder(id);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this reminder?')) {
      deleteReminder(id);
    }
  };

  const ReminderGroup = ({ title, reminders, showOverdue = false }) => {
    if (reminders.length === 0) return null;
    
    return (
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ 
          fontSize: '0.875rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          color: showOverdue ? 'var(--rose-400)' : 'var(--text-muted)',
          marginBottom: 'var(--spacing-md)'
        }}>
          {title} ({reminders.length})
        </h3>
        <div className="reminder-list">
          {reminders.map(reminder => {
            const contact = getContactById(reminder.contactId);
            const isOverdue = isPast(new Date(reminder.dueDate)) && !isToday(new Date(reminder.dueDate));
            
            return (
              <div 
                key={reminder.id} 
                className={`reminder-card ${isOverdue ? 'overdue' : ''}`}
              >
                <div className={`priority-indicator ${reminder.priority}`} />
                <button 
                  className={`reminder-checkbox ${reminder.completed ? 'checked' : ''}`}
                  onClick={() => handleComplete(reminder.id)}
                >
                  <Check size={14} style={{ opacity: reminder.completed ? 1 : 0 }} />
                </button>
                <div className="reminder-content" style={{ flex: 1 }}>
                  <div className="reminder-title" style={{ 
                    textDecoration: reminder.completed ? 'line-through' : 'none',
                    opacity: reminder.completed ? 0.6 : 1
                  }}>
                    {reminder.title}
                  </div>
                  {reminder.description && (
                    <div className="reminder-description">{reminder.description}</div>
                  )}
                  <div className="reminder-meta">
                    <span className={`reminder-time ${isOverdue ? 'overdue' : ''}`}>
                      <Clock size={14} />
                      {isOverdue 
                        ? `Overdue by ${format(new Date(reminder.dueDate), 'MMM d')}`
                        : format(new Date(reminder.dueDate), 'MMM d, h:mm a')
                      }
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
                <button 
                  className="btn btn-icon btn-ghost"
                  onClick={() => handleDelete(reminder.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Reminders</h1>
            <p className="page-subtitle">
              {upcomingReminders.length} upcoming • {completedReminders.length} completed
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddReminder(true)}>
            <Plus size={18} />
            Add Reminder
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="search-filters animate-slide-up" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              <Bell size={16} />
              <span style={{ marginLeft: '4px' }}>Upcoming</span>
            </button>
            <button
              className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              <Check size={16} />
              <span style={{ marginLeft: '4px' }}>Completed</span>
            </button>
          </div>
        </div>

        {filter === 'upcoming' ? (
          <div className="animate-slide-up stagger-1">
            {upcomingReminders.length > 0 ? (
              <>
                <ReminderGroup title="Overdue" reminders={overdueReminders} showOverdue />
                <ReminderGroup title="Today" reminders={todayReminders} />
                <ReminderGroup title="Tomorrow" reminders={tomorrowReminders} />
                <ReminderGroup title="This Week" reminders={thisWeekReminders} />
                <ReminderGroup title="Later" reminders={laterReminders} />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Calendar size={28} />
                </div>
                <div className="empty-state-title">No upcoming reminders</div>
                <p className="text-muted">Create a reminder to stay on top of your follow-ups</p>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: 'var(--spacing-md)' }}
                  onClick={() => setShowAddReminder(true)}
                >
                  <Plus size={18} />
                  Add Reminder
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-slide-up stagger-1">
            {completedReminders.length > 0 ? (
              <ReminderGroup title="Completed" reminders={completedReminders} />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Check size={28} />
                </div>
                <div className="empty-state-title">No completed reminders</div>
                <p className="text-muted">Completed reminders will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddReminder && (
        <AddReminderModal onClose={() => setShowAddReminder(false)} />
      )}
    </>
  );
}


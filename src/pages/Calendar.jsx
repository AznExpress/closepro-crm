import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  User,
  ExternalLink,
  RefreshCw,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useCRM } from '../store/CRMContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import CreateEventModal from '../components/CreateEventModal';

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts, reminders } = useCRM();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month'); // month, week, day

  useEffect(() => {
    loadEvents();
  }, [currentDate, user]);

  const loadEvents = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          contact:contacts(id, firstName, lastName, email),
          reminder:reminders(id, title)
        `)
        .gte('start_time', monthStart.toISOString())
        .lte('end_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, date);
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowCreateEvent(true);
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">
              {format(currentDate, 'MMMM yyyy')} • {events.length} events
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-secondary" onClick={() => loadEvents()}>
              <RefreshCw size={18} />
              Refresh
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/calendar-settings')}>
              <Settings size={18} />
              Settings
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateEvent(true)}>
              <Plus size={18} />
              New Event
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        {/* Calendar Navigation */}
        <div className="calendar-controls animate-slide-up">
          <div className="calendar-nav">
            <button className="btn btn-icon btn-ghost" onClick={handlePreviousMonth}>
              <ChevronLeft size={20} />
            </button>
            <button className="btn btn-secondary" onClick={handleToday}>
              Today
            </button>
            <button className="btn btn-icon btn-ghost" onClick={handleNextMonth}>
              <ChevronRight size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          
          <div className="calendar-view-tabs">
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                className={`filter-tab ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-xl)' }}>
          {/* Month View */}
          {view === 'month' && (
            <div className="calendar-month-view animate-slide-up stagger-1">
            {/* Day headers */}
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="calendar-grid">
              {days.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="calendar-day-number">
                      {format(day, 'd')}
                    </div>
                    <div className="calendar-day-events">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`calendar-event ${event.event_type || 'other'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open event details
                          }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="calendar-event-more">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}

          {/* Upcoming Events Sidebar */}
          <div className="calendar-sidebar animate-slide-up stagger-2">
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Upcoming Events</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <RefreshCw size={24} className="loading-spinner" />
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
              <CalendarIcon size={28} style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                No events scheduled
              </p>
            </div>
          ) : (
            <div className="upcoming-events-list">
              {events
                .filter(e => new Date(e.start_time) >= new Date())
                .slice(0, 10)
                .map(event => (
                  <div key={event.id} className="upcoming-event-card">
                    <div className="event-time">
                      {format(new Date(event.start_time), 'MMM d')}
                      <br />
                      {format(new Date(event.start_time), 'h:mm a')}
                    </div>
                    <div className="event-content">
                      <div className="event-title">{event.title}</div>
                      {event.location && (
                        <div className="event-meta">
                          <MapPin size={12} />
                          {event.location}
                        </div>
                      )}
                      {event.contact && (
                        <div className="event-meta">
                          <User size={12} />
                          {event.contact.firstName} {event.contact.lastName}
                        </div>
                      )}
                    </div>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-icon btn-ghost"
                        title="Open in calendar"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => {
            setShowCreateEvent(false);
            setSelectedDate(null);
          }}
          defaultDate={selectedDate}
          onEventCreated={() => {
            loadEvents();
            setShowCreateEvent(false);
          }}
        />
      )}
    </>
  );
}


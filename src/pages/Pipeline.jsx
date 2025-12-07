import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  ChevronRight,
  GripVertical,
  Flame,
  ThermometerSun,
  Snowflake,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { useCRM, DEAL_STAGES } from '../store/CRMContext';
import { format, formatDistanceToNow } from 'date-fns';
import AddContactModal from '../components/AddContactModal';

export default function Pipeline() {
  const navigate = useNavigate();
  const { 
    contacts,
    dealsByStage, 
    pipelineValue, 
    closedValue,
    updateDealStage 
  } = useCRM();
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [draggedContact, setDraggedContact] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const formatCurrency = (value) => {
    if (!value) return '$0';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const handleDragStart = (e, contact) => {
    setDraggedContact(contact);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    if (draggedContact && draggedContact.dealStage !== stageId) {
      updateDealStage(draggedContact.id, stageId);
    }
    setDraggedContact(null);
    setDragOverStage(null);
  };

  const temperatureIcons = {
    hot: <Flame size={12} />,
    warm: <ThermometerSun size={12} />,
    cold: <Snowflake size={12} />
  };

  const activeStages = DEAL_STAGES.filter(s => s.id !== 'lost');
  const activeDeals = contacts.filter(c => c.dealStage && c.dealStage !== 'lost');
  const dealsThisMonth = activeDeals.filter(c => {
    if (!c.expectedCloseDate) return false;
    const closeDate = new Date(c.expectedCloseDate);
    const now = new Date();
    return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
  });

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Deal Pipeline</h1>
            <p className="page-subtitle">
              {activeDeals.length} active deals • {dealsThisMonth.length} closing this month
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddContact(true)}>
            <Plus size={18} />
            Add Deal
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Pipeline Stats */}
        <div className="pipeline-stats animate-slide-up">
          <div className="pipeline-stat">
            <div className="pipeline-stat-icon">
              <TrendingUp size={20} />
            </div>
            <div className="pipeline-stat-content">
              <div className="pipeline-stat-value">{formatCurrency(pipelineValue)}</div>
              <div className="pipeline-stat-label">Pipeline Value</div>
            </div>
          </div>
          <div className="pipeline-stat">
            <div className="pipeline-stat-icon closed">
              <DollarSign size={20} />
            </div>
            <div className="pipeline-stat-content">
              <div className="pipeline-stat-value">{formatCurrency(closedValue)}</div>
              <div className="pipeline-stat-label">Closed Won</div>
            </div>
          </div>
          <div className="pipeline-stat">
            <div className="pipeline-stat-icon calendar">
              <Calendar size={20} />
            </div>
            <div className="pipeline-stat-content">
              <div className="pipeline-stat-value">{dealsThisMonth.length}</div>
              <div className="pipeline-stat-label">Closing This Month</div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="pipeline-board animate-slide-up stagger-1">
          {activeStages.map((stage, index) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageValue = stageDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);
            const isDragOver = dragOverStage === stage.id;
            
            return (
              <div 
                key={stage.id}
                className={`pipeline-column ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="pipeline-column-header">
                  <div className="pipeline-column-title">
                    <span 
                      className="pipeline-stage-dot" 
                      style={{ background: stage.color }}
                    />
                    {stage.label}
                    <span className="pipeline-column-count">{stageDeals.length}</span>
                  </div>
                  <div className="pipeline-column-value">
                    {formatCurrency(stageValue)}
                  </div>
                </div>
                
                <div className="pipeline-column-cards">
                  {stageDeals.length > 0 ? (
                    stageDeals.map(contact => (
                      <div
                        key={contact.id}
                        className={`pipeline-card ${draggedContact?.id === contact.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contact)}
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <div className="pipeline-card-drag">
                          <GripVertical size={14} />
                        </div>
                        <div className="pipeline-card-content">
                          <div className="pipeline-card-header">
                            <span className="pipeline-card-name">
                              {contact.firstName} {contact.lastName}
                            </span>
                            <span className={`badge badge-${contact.temperature}`} style={{ fontSize: '0.625rem', padding: '0 4px' }}>
                              {temperatureIcons[contact.temperature]}
                            </span>
                          </div>
                          {contact.dealValue && (
                            <div className="pipeline-card-value">
                              {formatCurrency(contact.dealValue)}
                            </div>
                          )}
                          <div className="pipeline-card-meta">
                            {contact.propertyInterest}
                            {contact.expectedCloseDate && (
                              <>
                                <span className="pipeline-card-separator">•</span>
                                <span className="pipeline-card-date">
                                  <Calendar size={10} />
                                  {format(new Date(contact.expectedCloseDate), 'MMM d')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="pipeline-card-arrow" />
                      </div>
                    ))
                  ) : (
                    <div className="pipeline-column-empty">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lost deals summary */}
        {dealsByStage['lost']?.length > 0 && (
          <div className="lost-deals-summary animate-slide-up stagger-2">
            <div className="lost-deals-header">
              <span>Lost Deals</span>
              <span className="lost-deals-count">{dealsByStage['lost'].length}</span>
            </div>
            <div className="lost-deals-list">
              {dealsByStage['lost'].slice(0, 3).map(contact => (
                <span 
                  key={contact.id} 
                  className="lost-deal-chip"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  {contact.firstName} {contact.lastName}
                </span>
              ))}
              {dealsByStage['lost'].length > 3 && (
                <span className="lost-deal-more">
                  +{dealsByStage['lost'].length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddContact && (
        <AddContactModal 
          onClose={() => setShowAddContact(false)} 
          defaultDealStage="prospect"
        />
      )}
    </>
  );
}


import { useState } from 'react';
import { 
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  FileText,
  Search
} from 'lucide-react';
import { useCRM } from '../store/CRMContext';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: FileText },
  { id: 'follow_up', label: 'Follow-Ups', icon: Send },
  { id: 'listing', label: 'Listings', icon: MessageSquare },
  { id: 'relationship', label: 'Relationship', icon: Heart },
  { id: 'nurture', label: 'Nurture', icon: MessageSquare }
];

export default function Templates() {
  const { templates, contacts, addTemplate, updateTemplate, deleteTemplate, fillTemplate } = useCRM();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'follow_up',
    content: ''
  });

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(query) || t.content.toLowerCase().includes(query);
    }
    return true;
  });

  const selectedContactObj = contacts.find(c => c.id === selectedContact);

  const handleCopy = async (template) => {
    const content = fillTemplate(template, selectedContactObj);
    await navigator.clipboard.writeText(content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNew = () => {
    if (!newTemplate.name || !newTemplate.content) return;
    addTemplate(newTemplate);
    setNewTemplate({ name: '', category: 'follow_up', content: '' });
    setShowNewTemplate(false);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate.name || !editingTemplate.content) return;
    updateTemplate(editingTemplate);
    setEditingTemplate(null);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(id);
    }
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Quick Templates</h1>
            <p className="page-subtitle">
              {templates.length} templates • Copy and personalize in seconds
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewTemplate(true)}>
            <Plus size={18} />
            New Template
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="templates-layout animate-slide-up">
          {/* Sidebar */}
          <div className="templates-sidebar">
            <div className="templates-contact-select">
              <label>Personalize for:</label>
              <select 
                value={selectedContact} 
                onChange={(e) => setSelectedContact(e.target.value)}
              >
                <option value="">Select a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="templates-categories">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`templates-category ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <cat.icon size={16} />
                  {cat.label}
                  <span className="templates-category-count">
                    {cat.id === 'all' 
                      ? templates.length 
                      : templates.filter(t => t.category === cat.id).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="templates-main">
            <div className="templates-search">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="templates-grid">
              {filteredTemplates.map((template, index) => (
                <div 
                  key={template.id} 
                  className="template-card animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="template-card-header">
                    <h3 className="template-card-name">{template.name}</h3>
                    <div className="template-card-actions">
                      <button 
                        className="btn btn-icon btn-ghost"
                        onClick={() => setEditingTemplate({ ...template })}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-icon btn-ghost"
                        onClick={() => handleDelete(template.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="template-card-preview">
                    {fillTemplate(template, selectedContactObj).slice(0, 150)}
                    {template.content.length > 150 && '...'}
                  </div>
                  <div className="template-card-footer">
                    <span className="template-card-category">
                      {CATEGORIES.find(c => c.id === template.category)?.label || template.category}
                    </span>
                    <button 
                      className={`btn btn-sm ${copiedId === template.id ? 'btn-success' : 'btn-primary'}`}
                      onClick={() => handleCopy(template)}
                    >
                      {copiedId === template.id ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state-icon">
                    <FileText size={28} />
                  </div>
                  <div className="empty-state-title">No templates found</div>
                  <p className="text-muted">
                    {searchQuery ? 'Try a different search' : 'Create your first template'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplate && (
        <div className="modal-overlay" onClick={() => setShowNewTemplate(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Template</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowNewTemplate(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Weekly Check-In"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Message Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Type your message here...

Use these variables:
{firstName} - Contact's first name
{lastName} - Contact's last name
{agentName} - Your name
{propertyAddress} - Property address"
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>
              <div className="template-variables-hint">
                <strong>Available variables:</strong> {'{firstName}'}, {'{lastName}'}, {'{agentName}'}, {'{propertyAddress}'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewTemplate(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveNew}>
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Template</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditingTemplate(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Message Content</label>
                <textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingTemplate(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


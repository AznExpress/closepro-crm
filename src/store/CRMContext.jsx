import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addDays, isSameDay } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useTeam } from './TeamContext';

const CRMContext = createContext(null);

// Lead source options
export const LEAD_SOURCES = [
  { value: 'referral', label: 'Referral', color: '#10b981' },
  { value: 'zillow', label: 'Zillow', color: '#3b82f6' },
  { value: 'realtor', label: 'Realtor.com', color: '#ef4444' },
  { value: 'open_house', label: 'Open House', color: '#f59e0b' },
  { value: 'social_media', label: 'Social Media', color: '#8b5cf6' },
  { value: 'website', label: 'Website', color: '#06b6d4' },
  { value: 'cold_call', label: 'Cold Call', color: '#64748b' },
  { value: 'sign_call', label: 'Sign Call', color: '#ec4899' },
  { value: 'past_client', label: 'Past Client', color: '#14b8a6' },
  { value: 'other', label: 'Other', color: '#94a3b8' }
];

// Deal stages
export const DEAL_STAGES = [
  { id: 'prospect', label: 'Prospect', color: '#64748b' },
  { id: 'showing', label: 'Showing', color: '#3b82f6' },
  { id: 'offer', label: 'Offer', color: '#f59e0b' },
  { id: 'under_contract', label: 'Under Contract', color: '#8b5cf6' },
  { id: 'closing', label: 'Closing', color: '#06b6d4' },
  { id: 'closed', label: 'Closed Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#ef4444' }
];

// Default templates
export const DEFAULT_TEMPLATES = [
  {
    id: 'follow_up',
    name: 'Quick Follow-Up',
    category: 'follow_up',
    content: `Hi {firstName},

Just wanted to check in and see how your home search is going. Have you had any thoughts on the properties we discussed?

Let me know if you'd like to schedule another showing or if your criteria have changed at all.

Best,
{agentName}`
  },
  {
    id: 'new_listing',
    name: 'New Listing Alert',
    category: 'listing',
    content: `Hi {firstName},

I just came across a property that made me think of you! It's at {propertyAddress} and has many of the features you mentioned:

• [Feature 1]
• [Feature 2]
• [Feature 3]

Would you like to schedule a showing? I have availability this week.

{agentName}`
  },
  {
    id: 'home_anniversary',
    name: 'Home Anniversary',
    category: 'relationship',
    content: `Hi {firstName},

Happy Home Anniversary! 🏠 

It's been a year since you closed on your home, and I hope you've been enjoying every moment in it.

If you ever need anything—recommendations for contractors, questions about the market, or just want to chat—I'm always here for you.

Warmly,
{agentName}`
  },
  {
    id: 'birthday',
    name: 'Birthday Wishes',
    category: 'relationship',
    content: `Happy Birthday, {firstName}! 🎂

Wishing you a wonderful day filled with joy and celebration.

Best wishes,
{agentName}`
  },
  {
    id: 'showing_followup',
    name: 'Post-Showing Follow-Up',
    category: 'follow_up',
    content: `Hi {firstName},

Thank you for taking the time to view {propertyAddress} today! I'd love to hear your thoughts.

What did you think of the property? Is there anything you'd like to see more of in our next showing?

Looking forward to hearing from you.

{agentName}`
  },
  {
    id: 'market_update',
    name: 'Market Update',
    category: 'nurture',
    content: `Hi {firstName},

I wanted to share a quick market update for your area:

• Average home prices: [Up/Down X%]
• Days on market: [X days]
• New listings this month: [X]

If you're curious about your home's current value or have any questions about the market, I'm happy to chat.

{agentName}`
  }
];

const initialState = {
  contacts: [],
  reminders: [],
  templates: DEFAULT_TEMPLATES,
  searchQuery: '',
  filterTemperature: 'all',
  isLoaded: false,
  isLoading: false
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'LOAD_DATA':
      return {
        ...state,
        contacts: action.payload.contacts,
        reminders: action.payload.reminders,
        templates: action.payload.templates || DEFAULT_TEMPLATES,
        isLoaded: true,
        isLoading: false
      };
    
    case 'SET_CONTACTS':
      return { ...state, contacts: action.payload };
    
    case 'ADD_CONTACT':
      return { ...state, contacts: [action.payload, ...state.contacts] };
    
    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map(c => 
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        )
      };
    
    case 'DELETE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.filter(c => c.id !== action.payload),
        reminders: state.reminders.filter(r => r.contactId !== action.payload)
      };
    
    case 'SET_REMINDERS':
      return { ...state, reminders: action.payload };
    
    case 'ADD_REMINDER':
      return { ...state, reminders: [action.payload, ...state.reminders] };
    
    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r => 
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        )
      };
    
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter(r => r.id !== action.payload) };
    
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] };
    
    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map(t => 
          t.id === action.payload.id ? action.payload : t
        )
      };
    
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };
    
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_FILTER':
      return { ...state, filterTemperature: action.payload };
    
    default:
      return state;
  }
}

// Transform database row to app format
function dbToContact(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    temperature: row.temperature,
    propertyInterest: row.property_interest,
    budget: row.budget,
    leadSource: row.lead_source,
    notes: row.notes,
    dealStage: row.deal_stage,
    dealValue: row.deal_value ? parseFloat(row.deal_value) : null,
    expectedCloseDate: row.expected_close_date,
    birthday: row.birthday,
    homeAnniversary: row.home_anniversary,
    commissionNotes: row.commission_notes,
    lastContact: row.last_contact,
    createdAt: row.created_at,
    activities: row.activities || [],
    showings: row.showings || []
  };
}

// Transform app format to database row
function contactToDb(contact, userId) {
  return {
    user_id: userId,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone || null,
    company: contact.company || null,
    temperature: contact.temperature || 'warm',
    property_interest: contact.propertyInterest || null,
    budget: contact.budget || null,
    lead_source: contact.leadSource || null,
    notes: contact.notes || null,
    deal_stage: contact.dealStage || null,
    deal_value: contact.dealValue || null,
    expected_close_date: contact.expectedCloseDate || null,
    birthday: contact.birthday || null,
    home_anniversary: contact.homeAnniversary || null,
    commission_notes: contact.commissionNotes || null
  };
}

function dbToReminder(row) {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    completed: row.completed,
    autoGenerated: row.auto_generated
  };
}

function reminderToDb(reminder, userId) {
  return {
    user_id: userId,
    contact_id: reminder.contactId || null,
    title: reminder.title,
    description: reminder.description || null,
    due_date: reminder.dueDate,
    priority: reminder.priority || 'medium',
    completed: reminder.completed || false,
    auto_generated: reminder.autoGenerated || false
  };
}

export function CRMProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { team, teamMembers, showTeamDeals } = useTeam();

  // Load data from Supabase or localStorage
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    if (isSupabaseConfigured()) {
      try {
        // Build user IDs list (own + team members if opted in)
        let userIds = [user.id];
        if (team && showTeamDeals && teamMembers.length > 0) {
          const teamUserIds = teamMembers.map(m => m.user_id);
          userIds = [...new Set([user.id, ...teamUserIds])];
        }

        // Fetch contacts - RLS will handle filtering, but we'll also filter client-side
        let contactsQuery = supabase
          .from('contacts')
          .select('*')
          .order('last_contact', { ascending: false });

        // If team deals enabled, we need to get team contacts
        // Note: RLS policies need to allow this, otherwise we'll need separate queries
        const { data: contactsData, error: contactsError } = await contactsQuery;

        if (contactsError) throw contactsError;

        // Filter contacts to only include user's contacts + team contacts if opted in
        const filteredContactsData = (contactsData || []).filter(c => {
          if (c.user_id === user.id) return true;
          if (team && showTeamDeals) {
            return teamMembers.some(m => m.user_id === c.user_id);
          }
          return false;
        });

        // Fetch activities for all contacts
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch showings for all contacts
        const { data: showingsData } = await supabase
          .from('showings')
          .select('*')
          .order('showing_date', { ascending: false });

        // Fetch reminders
        const { data: remindersData, error: remindersError } = await supabase
          .from('reminders')
          .select('*')
          .order('due_date', { ascending: true });

        if (remindersError) throw remindersError;

        // Fetch templates (own + team shared if in team)
        let templatesQuery = supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: true });

        // If in team, also get team shared templates
        if (team) {
          templatesQuery = supabase
            .from('templates')
            .select('*')
            .or(`user_id.eq.${user.id},and(is_team_shared.eq.true,team_id.eq.${team.id})`)
            .order('created_at', { ascending: true });
        }

        const { data: templatesData } = await templatesQuery;

        // Group activities and showings by contact
        const activitiesByContact = (activitiesData || []).reduce((acc, a) => {
          if (!acc[a.contact_id]) acc[a.contact_id] = [];
          acc[a.contact_id].push({
            id: a.id,
            type: a.type,
            note: a.note,
            date: a.created_at
          });
          return acc;
        }, {});

        const showingsByContact = (showingsData || []).reduce((acc, s) => {
          if (!acc[s.contact_id]) acc[s.contact_id] = [];
          acc[s.contact_id].push({
            id: s.id,
            address: s.address,
            reaction: s.reaction,
            notes: s.notes,
            date: s.showing_date
          });
          return acc;
        }, {});

        // Transform contacts and mark team deals
        const contacts = filteredContactsData.map(c => ({
          ...dbToContact(c),
          activities: activitiesByContact[c.id] || [],
          showings: showingsByContact[c.id] || [],
          isTeamDeal: c.user_id !== user.id && team && showTeamDeals
        }));

        const reminders = (remindersData || []).map(dbToReminder);
        
        const templates = templatesData?.length > 0 
          ? templatesData.map(t => ({
              id: t.id,
              name: t.name,
              category: t.category,
              content: t.content,
              isDefault: t.is_default,
              isTeamShared: t.is_team_shared || false,
              teamId: t.team_id
            }))
          : DEFAULT_TEMPLATES;

        dispatch({
          type: 'LOAD_DATA',
          payload: { contacts, reminders, templates }
        });

      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        // Fall back to localStorage
        loadFromLocalStorage();
      }
    } else {
      loadFromLocalStorage();
    }
  }, [isAuthenticated, user]);

  const loadFromLocalStorage = () => {
    const savedContacts = localStorage.getItem('crm_contacts_v2');
    const savedReminders = localStorage.getItem('crm_reminders_v2');
    const savedTemplates = localStorage.getItem('crm_templates');

    dispatch({
      type: 'LOAD_DATA',
      payload: {
        contacts: savedContacts ? JSON.parse(savedContacts) : getSampleData().contacts,
        reminders: savedReminders ? JSON.parse(savedReminders) : getSampleData().reminders,
        templates: savedTemplates ? JSON.parse(savedTemplates) : DEFAULT_TEMPLATES
      }
    });
  };

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Persist to localStorage when not using Supabase
  useEffect(() => {
    if (state.isLoaded && !isSupabaseConfigured()) {
      localStorage.setItem('crm_contacts_v2', JSON.stringify(state.contacts));
      localStorage.setItem('crm_reminders_v2', JSON.stringify(state.reminders));
      localStorage.setItem('crm_templates', JSON.stringify(state.templates));
    }
  }, [state.contacts, state.reminders, state.templates, state.isLoaded]);

  // Actions
  const addContact = async (contact) => {
    const newContact = {
      ...contact,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      activities: [],
      showings: []
    };

    if (isSupabaseConfigured() && user) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert(contactToDb(contact, user.id))
          .select()
          .single();

        if (error) throw error;
        
        const dbContact = dbToContact(data);
        dbContact.activities = [];
        dbContact.showings = [];
        dispatch({ type: 'ADD_CONTACT', payload: dbContact });
        return dbContact;
      } catch (error) {
        console.error('Error adding contact:', error);
      }
    } else {
      dispatch({ type: 'ADD_CONTACT', payload: newContact });
      return newContact;
    }
  };

  const updateContact = async (contact) => {
    if (isSupabaseConfigured() && user) {
      try {
        const { error } = await supabase
          .from('contacts')
          .update(contactToDb(contact, user.id))
          .eq('id', contact.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating contact:', error);
      }
    }
    dispatch({ type: 'UPDATE_CONTACT', payload: contact });
  };

  const deleteContact = async (contactId) => {
    if (isSupabaseConfigured() && user) {
      try {
        const { error } = await supabase
          .from('contacts')
          .delete()
          .eq('id', contactId);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
    dispatch({ type: 'DELETE_CONTACT', payload: contactId });
  };

  const addActivity = async (contactId, activity) => {
    const newActivity = {
      ...activity,
      id: uuidv4(),
      date: new Date().toISOString()
    };

    if (isSupabaseConfigured() && user) {
      try {
        const { error } = await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            contact_id: contactId,
            type: activity.type,
            note: activity.note
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error adding activity:', error);
      }
    }

    // Update local state
    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          ...contact,
          activities: [newActivity, ...(contact.activities || [])],
          lastContact: newActivity.date
        }
      });
    }
  };

  const addShowing = async (contactId, showing) => {
    const newShowing = {
      ...showing,
      id: uuidv4(),
      date: showing.date || new Date().toISOString()
    };

    if (isSupabaseConfigured() && user) {
      try {
        await supabase.from('showings').insert({
          user_id: user.id,
          contact_id: contactId,
          address: showing.address,
          reaction: showing.reaction,
          notes: showing.notes,
          showing_date: newShowing.date
        });

        // Also add as activity
        await supabase.from('activities').insert({
          user_id: user.id,
          contact_id: contactId,
          type: 'showing',
          note: `Showed ${showing.address}${showing.notes ? ` - ${showing.notes}` : ''}`
        });
      } catch (error) {
        console.error('Error adding showing:', error);
      }
    }

    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
      const newActivity = {
        id: uuidv4(),
        type: 'showing',
        note: `Showed ${showing.address}${showing.notes ? ` - ${showing.notes}` : ''}`,
        date: newShowing.date
      };

      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          ...contact,
          showings: [newShowing, ...(contact.showings || [])],
          activities: [newActivity, ...(contact.activities || [])],
          lastContact: newShowing.date
        }
      });
    }
  };

  const deleteShowing = async (contactId, showingId) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase.from('showings').delete().eq('id', showingId);
      } catch (error) {
        console.error('Error deleting showing:', error);
      }
    }

    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: {
          ...contact,
          showings: contact.showings.filter(s => s.id !== showingId)
        }
      });
    }
  };

  const updateDealStage = async (contactId, stage) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase
          .from('contacts')
          .update({ deal_stage: stage })
          .eq('id', contactId);
      } catch (error) {
        console.error('Error updating deal stage:', error);
      }
    }

    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
      dispatch({
        type: 'UPDATE_CONTACT',
        payload: { ...contact, dealStage: stage }
      });
    }
  };

  const addReminder = async (reminder) => {
    const newReminder = {
      ...reminder,
      id: uuidv4(),
      completed: false
    };

    if (isSupabaseConfigured() && user) {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .insert(reminderToDb(reminder, user.id))
          .select()
          .single();

        if (error) throw error;
        
        const dbReminder = dbToReminder(data);
        dispatch({ type: 'ADD_REMINDER', payload: dbReminder });
        return dbReminder;
      } catch (error) {
        console.error('Error adding reminder:', error);
      }
    } else {
      dispatch({ type: 'ADD_REMINDER', payload: newReminder });
      return newReminder;
    }
  };

  const updateReminder = async (reminder) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase
          .from('reminders')
          .update(reminderToDb(reminder, user.id))
          .eq('id', reminder.id);
      } catch (error) {
        console.error('Error updating reminder:', error);
      }
    }
    dispatch({ type: 'UPDATE_REMINDER', payload: reminder });
  };

  const completeReminder = async (reminderId) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase
          .from('reminders')
          .update({ completed: true })
          .eq('id', reminderId);
      } catch (error) {
        console.error('Error completing reminder:', error);
      }
    }
    dispatch({ type: 'UPDATE_REMINDER', payload: { id: reminderId, completed: true } });
  };

  const deleteReminder = async (reminderId) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase.from('reminders').delete().eq('id', reminderId);
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
    dispatch({ type: 'DELETE_REMINDER', payload: reminderId });
  };

  const addTemplate = async (template) => {
    const newTemplate = { ...template, id: uuidv4() };

    if (isSupabaseConfigured() && user) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .insert({
            user_id: user.id,
            name: template.name,
            category: template.category,
            content: template.content,
            is_team_shared: template.isTeamShared || false,
            team_id: template.isTeamShared && team ? team.id : null
          })
          .select()
          .single();

        if (error) throw error;
        
        dispatch({ type: 'ADD_TEMPLATE', payload: {
          id: data.id,
          name: data.name,
          category: data.category,
          content: data.content
        }});
        return data;
      } catch (error) {
        console.error('Error adding template:', error);
      }
    } else {
      dispatch({ type: 'ADD_TEMPLATE', payload: newTemplate });
      return newTemplate;
    }
  };

  const updateTemplate = async (template) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase
          .from('templates')
          .update({
            name: template.name,
            category: template.category,
            content: template.content,
            is_team_shared: template.isTeamShared || false,
            team_id: template.isTeamShared && team ? team.id : null
          })
          .eq('id', template.id);
      } catch (error) {
        console.error('Error updating template:', error);
      }
    }
    dispatch({ type: 'UPDATE_TEMPLATE', payload: template });
  };

  const deleteTemplate = async (templateId) => {
    if (isSupabaseConfigured() && user) {
      try {
        await supabase.from('templates').delete().eq('id', templateId);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
    dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
  };

  const setSearch = (query) => dispatch({ type: 'SET_SEARCH', payload: query });
  const setFilter = (filter) => dispatch({ type: 'SET_FILTER', payload: filter });

  const getContactById = (id) => state.contacts.find(c => c.id === id);
  
  const getRemindersForContact = (contactId) => 
    state.reminders.filter(r => r.contactId === contactId && !r.completed);

  const fillTemplate = (template, contact) => {
    let content = template.content;
    if (contact) {
      content = content.replace(/{firstName}/g, contact.firstName || '');
      content = content.replace(/{lastName}/g, contact.lastName || '');
      content = content.replace(/{email}/g, contact.email || '');
    }
    content = content.replace(/{agentName}/g, user?.user_metadata?.full_name?.split(' ')[0] || 'Agent');
    content = content.replace(/{propertyAddress}/g, '[Property Address]');
    return content;
  };

  // Computed values
  const hotLeads = state.contacts.filter(c => c.temperature === 'hot');
  const warmLeads = state.contacts.filter(c => c.temperature === 'warm');
  const coldLeads = state.contacts.filter(c => c.temperature === 'cold');

  const upcomingReminders = state.reminders
    .filter(r => !r.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const overdueReminders = upcomingReminders.filter(r => {
    const due = new Date(r.dueDate);
    const today = new Date();
    return due < today && !isSameDay(due, today);
  });

  const todayReminders = upcomingReminders.filter(r => {
    const due = new Date(r.dueDate);
    const today = new Date();
    return isSameDay(due, today);
  });

  const filteredContacts = state.contacts
    .filter(c => {
      if (state.filterTemperature !== 'all' && c.temperature !== state.filterTemperature) {
        return false;
      }
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        return (
          c.firstName?.toLowerCase().includes(query) ||
          c.lastName?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.company?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const tempOrder = { hot: 0, warm: 1, cold: 2 };
      if (tempOrder[a.temperature] !== tempOrder[b.temperature]) {
        return tempOrder[a.temperature] - tempOrder[b.temperature];
      }
      return new Date(b.lastContact) - new Date(a.lastContact);
    });

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage.id] = state.contacts.filter(c => c.dealStage === stage.id);
    return acc;
  }, {});

  const pipelineValue = state.contacts
    .filter(c => c.dealStage && c.dealStage !== 'lost' && c.dealStage !== 'closed')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const closedValue = state.contacts
    .filter(c => c.dealStage === 'closed')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const leadsBySource = LEAD_SOURCES.map(source => ({
    ...source,
    count: state.contacts.filter(c => c.leadSource === source.value).length,
    hotCount: state.contacts.filter(c => c.leadSource === source.value && c.temperature === 'hot').length
  })).filter(s => s.count > 0);

  return (
    <CRMContext.Provider value={{
      ...state,
      addContact,
      updateContact,
      deleteContact,
      addActivity,
      addShowing,
      deleteShowing,
      updateDealStage,
      addReminder,
      updateReminder,
      completeReminder,
      deleteReminder,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      setSearch,
      setFilter,
      getContactById,
      getRemindersForContact,
      fillTemplate,
      hotLeads,
      warmLeads,
      coldLeads,
      upcomingReminders,
      overdueReminders,
      todayReminders,
      filteredContacts,
      dealsByStage,
      pipelineValue,
      closedValue,
      leadsBySource
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}

// Sample data for demo mode
function getSampleData() {
  const sampleContacts = [
    {
      id: uuidv4(),
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'sarah.mitchell@email.com',
      phone: '(555) 234-5678',
      company: 'Mitchell Family Trust',
      temperature: 'hot',
      propertyInterest: 'Buying',
      budget: '$850,000 - $1,200,000',
      leadSource: 'referral',
      birthday: '1985-06-15',
      homeAnniversary: null,
      notes: 'Looking for 4BR in Maple Grove area. Pre-approved with First National.',
      lastContact: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      dealStage: 'showing',
      dealValue: 950000,
      expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(),
      showings: [],
      activities: [
        { id: uuidv4(), type: 'call', note: 'Discussed requirements', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }
      ]
    },
    {
      id: uuidv4(),
      firstName: 'James',
      lastName: 'Chen',
      email: 'jchen@techstartup.io',
      phone: '(555) 876-5432',
      company: 'TechStartup Inc',
      temperature: 'hot',
      propertyInterest: 'Buying',
      budget: '$1,500,000+',
      leadSource: 'zillow',
      birthday: '1990-03-22',
      homeAnniversary: null,
      notes: 'Looking for luxury condo downtown. Cash buyer.',
      lastContact: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      dealStage: 'offer',
      dealValue: 1650000,
      expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      showings: [],
      activities: []
    }
  ];

  const sampleReminders = [
    {
      id: uuidv4(),
      contactId: sampleContacts[0].id,
      title: 'Follow up on showing',
      description: 'Call Sarah to discuss properties',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      completed: false,
      priority: 'high'
    }
  ];

  return { contacts: sampleContacts, reminders: sampleReminders };
}


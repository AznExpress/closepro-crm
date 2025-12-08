import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Assign a lead to a teammate (one-way assignment)
 */
export async function assignLead(contactId, toUserId, note = '') {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('lead_handoffs')
    .insert({
      contact_id: contactId,
      from_user_id: user.id,
      to_user_id: toUserId,
      handoff_type: 'assigned',
      status: 'pending',
      note
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Request a lead from a teammate (two-way with accept)
 */
export async function requestLead(contactId, fromUserId, note = '') {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('lead_handoffs')
    .insert({
      contact_id: contactId,
      from_user_id: fromUserId,
      to_user_id: user.id,
      handoff_type: 'requested',
      status: 'pending',
      note
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Accept or decline a lead handoff
 */
export async function respondToHandoff(handoffId, accept) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const status = accept ? 'accepted' : 'declined';
  
  // If accepted, transfer the contact ownership
  if (accept) {
    const { data: handoff } = await supabase
      .from('lead_handoffs')
      .select('contact_id')
      .eq('id', handoffId)
      .single();

    if (handoff) {
      await supabase
        .from('contacts')
        .update({ user_id: user.id })
        .eq('id', handoff.contact_id);
    }
  }

  const { data, error } = await supabase
    .from('lead_handoffs')
    .update({
      status,
      responded_at: new Date().toISOString()
    })
    .eq('id', handoffId)
    .eq('to_user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pending handoffs for current user
 */
export async function getPendingHandoffs() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('lead_handoffs')
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone)
    `)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching handoffs:', error);
    return [];
  }

  // Fetch user info for from_user_id using RPC
  if (data && data.length > 0) {
    const userIds = [...new Set(data.map(h => h.from_user_id).filter(Boolean))];
    const userInfoMap = {};
    
    for (const userId of userIds) {
      const { data: userInfo, error: userError } = await supabase.rpc('get_user_info', {
        p_user_id: userId
      });
      if (!userError && userInfo && userInfo.length > 0) {
        userInfoMap[userId] = userInfo[0];
      }
    }
    
    // Attach user info to handoffs and transform contact to camelCase
    return data.map(handoff => ({
      ...handoff,
      contact: handoff.contact ? {
        id: handoff.contact.id,
        firstName: handoff.contact.first_name,
        lastName: handoff.contact.last_name,
        email: handoff.contact.email,
        phone: handoff.contact.phone
      } : null,
      from_user: handoff.from_user_id ? userInfoMap[handoff.from_user_id] || { id: handoff.from_user_id } : null
    }));
  }

  return data || [];
}

/**
 * Get team activity feed
 */
export async function getTeamActivity(teamId, limit = 50) {
  if (!isSupabaseConfigured() || !teamId) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get team member user IDs
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (!members || members.length === 0) return [];

  const userIds = members.map(m => m.user_id);

  // Get recent activities from team members
  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      *,
      contact:contacts(id, first_name, last_name)
    `)
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching team activity:', error);
    return [];
  }

  // Get recent handoffs
  const { data: handoffs } = await supabase
    .from('lead_handoffs')
    .select(`
      *,
      contact:contacts(id, first_name, last_name)
    `)
    .in('from_user_id', userIds)
    .or(`to_user_id.in.(${userIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20);

  // Combine and sort by date, transforming contact data to camelCase
  const allActivity = [
    ...(activities || []).map(a => ({
      type: 'activity',
      ...a,
      contact: a.contact ? {
        id: a.contact.id,
        firstName: a.contact.first_name,
        lastName: a.contact.last_name
      } : null,
      timestamp: a.created_at
    })),
    ...(handoffs || []).map(h => ({
      type: 'handoff',
      ...h,
      contact: h.contact ? {
        id: h.contact.id,
        firstName: h.contact.first_name,
        lastName: h.contact.last_name
      } : null,
      timestamp: h.created_at
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
   .slice(0, limit);

  return allActivity;
}

/**
 * Add a team note to a contact
 */
export async function addTeamNote(contactId, teamId, note, isInternal = true) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_notes')
    .insert({
      contact_id: contactId,
      team_id: teamId,
      user_id: user.id,
      note,
      is_internal: isInternal
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get team notes for a contact
 */
export async function getTeamNotes(contactId, teamId) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('team_notes')
    .select(`
      *,
      user_id
    `)
    .eq('contact_id', contactId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team notes:', error);
    return [];
  }

  return data || [];
}

/**
 * Get individual agent stats
 */
export async function getAgentStats(userId, teamId = null) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const targetUserId = userId || user.id;

  // Get contacts count
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  // Get hotlist count
  const { count: hotlistCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('isHot', true);

  // Get deals in pipeline
  const { data: pipelineDeals } = await supabase
    .from('contacts')
    .select('dealValue')
    .eq('user_id', targetUserId)
    .not('dealStage', 'is', null);

  const pipelineValue = pipelineDeals?.reduce((sum, deal) => sum + (deal.dealValue || 0), 0) || 0;
  const pipelineCount = pipelineDeals?.length || 0;

  // Get closed deals this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: closedDeals } = await supabase
    .from('contacts')
    .select('dealValue')
    .eq('user_id', targetUserId)
    .eq('dealStage', 'closed')
    .gte('updated_at', monthStart.toISOString());

  const closedValue = closedDeals?.reduce((sum, deal) => sum + (deal.dealValue || 0), 0) || 0;
  const closedCount = closedDeals?.length || 0;

  // Get activities this month
  const { count: activitiesCount } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .gte('created_at', monthStart.toISOString());

  // Get showings this month
  const { count: showingsCount } = await supabase
    .from('showings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .gte('showingDate', monthStart.toISOString());

  // Get lead sources breakdown
  const { data: leadSources } = await supabase
    .from('contacts')
    .select('leadSource')
    .eq('user_id', targetUserId)
    .not('leadSource', 'is', null);

  const sourceBreakdown = {};
  leadSources?.forEach(contact => {
    const source = contact.leadSource || 'Unknown';
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
  });

  return {
    totalContacts: totalContacts || 0,
    hotlistCount: hotlistCount || 0,
    pipelineValue,
    pipelineCount,
    closedValue,
    closedCount,
    activitiesCount: activitiesCount || 0,
    showingsCount: showingsCount || 0,
    leadSourceBreakdown: sourceBreakdown
  };
}


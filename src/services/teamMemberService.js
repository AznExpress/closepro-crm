import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Get team member details including email
 * Note: This requires a database function or RPC call since we can't directly query auth.users
 */
export async function getTeamMemberDetails(teamId) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Try to call a database function that returns team members with emails
    // If the function doesn't exist, we'll fall back to just team_members
    const { data, error } = await supabase
      .rpc('get_team_members_with_emails', { team_id: teamId });

    if (error) {
      // Fallback: just return team members without emails
      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);
      
      return members || [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching team member details:', err);
    // Fallback
    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    
    return members || [];
  }
}

/**
 * Get current user's email (this works since it's the current user)
 */
export async function getCurrentUserEmail() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || null;
  } catch (err) {
    return null;
  }
}


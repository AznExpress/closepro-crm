import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTeamDeals, setShowTeamDeals] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadTeamData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadTeamData = async () => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setTeam(membership.team);
        setShowTeamDeals(membership.show_team_deals);

        // Load team members with emails using RPC function
        try {
          const { data: membersWithEmails, error: rpcError } = await supabase
            .rpc('get_team_members_with_emails', { team_id: membership.team_id });

          if (!rpcError && membersWithEmails) {
            setTeamMembers(membersWithEmails || []);
          } else {
            // Fallback: just get team members without emails
            const { data: membersData } = await supabase
              .from('team_members')
              .select('*')
              .eq('team_id', membership.team_id);
            setTeamMembers(membersData || []);
          }
        } catch (err) {
          // Fallback: just get team members without emails
          const { data: membersData } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', membership.team_id);
          setTeamMembers(membersData || []);
        }
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (teamName) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Not authenticated');
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        owner_id: user.id
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Add creator as team member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: user.id,
        show_team_deals: false
      });

    if (memberError) throw memberError;

    await loadTeamData();
    return teamData;
  };

  const joinTeam = async (teamId) => {
    if (!isSupabaseConfigured() || !user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: user.id,
        show_team_deals: false
      });

    if (error) throw error;
    await loadTeamData();
  };

  const leaveTeam = async () => {
    if (!isSupabaseConfigured() || !user || !team) {
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', team.id)
      .eq('user_id', user.id);

    if (error) throw error;
    setTeam(null);
    setTeamMembers([]);
    setShowTeamDeals(false);
  };

  const toggleTeamDeals = async (enabled) => {
    if (!isSupabaseConfigured() || !user || !team) {
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .update({ show_team_deals: enabled })
      .eq('team_id', team.id)
      .eq('user_id', user.id);

    if (error) throw error;
    setShowTeamDeals(enabled);
  };

  const addTeamMember = async (email) => {
    if (!isSupabaseConfigured() || !team) {
      throw new Error('Team not found');
    }

    // In a real app, you'd look up the user by email
    // For now, we'll need to handle invitations differently
    // This is a placeholder - you'd typically send an invitation
    throw new Error('Member invitation not yet implemented');
  };

  const value = {
    team,
    teamMembers,
    showTeamDeals,
    loading,
    isInTeam: !!team,
    isTeamOwner: team?.owner_id === user?.id,
    createTeam,
    joinTeam,
    leaveTeam,
    toggleTeamDeals,
    addTeamMember,
    refresh: loadTeamData
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    // Return default values if not in provider
    return {
      team: null,
      teamMembers: [],
      showTeamDeals: false,
      loading: false,
      isInTeam: false,
      isTeamOwner: false,
      createTeam: async () => {},
      joinTeam: async () => {},
      leaveTeam: async () => {},
      toggleTeamDeals: async () => {},
      addTeamMember: async () => {},
      refresh: () => {}
    };
  }
  return context;
}


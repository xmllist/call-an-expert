'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, type ExpertProfile, type SkillCategory } from '~/lib/supabase';

interface UseExpertReturn {
  experts: ExpertProfile[];
  skills: SkillCategory[];
  loading: boolean;
  error: string | null;
  fetchExperts: (filters?: ExpertFilters) => Promise<void>;
  fetchExpert: (expertId: string) => Promise<ExpertProfile | null>;
  fetchSkills: () => Promise<void>;
  updateAvailability: (expertId: string, isAvailable: boolean) => Promise<void>;
}

interface ExpertFilters {
  skills?: string[];
  maxRate?: number;
  minRating?: number;
  availableOnly?: boolean;
}

export function useExpert(): UseExpertReturn {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [skills, setSkills] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExperts = useCallback(async (filters?: ExpertFilters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('expert_profiles')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url, email),
          skills:expert_skills(*, skill_category:skill_categories(*))
        `)
        .order('rating', { ascending: false });

      if (filters?.availableOnly) {
        query = query.eq('is_available', true);
      }

      if (filters?.maxRate) {
        query = query.lte('hourly_rate_cents', filters.maxRate * 100);
      }

      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Filter by skills if provided
      let filteredExperts = data || [];
      if (filters?.skills && filters.skills.length > 0) {
        filteredExperts = filteredExperts.filter((expert: ExpertProfile) => {
          const expertSkillIds = expert.skills?.map(
            (s: any) => s.skill_category?.id || s.skill_category_id
          ) || [];
          return filters.skills!.some(skill => expertSkillIds.includes(skill));
        });
      }

      setExperts(filteredExperts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch experts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpert = useCallback(async (expertId: string): Promise<ExpertProfile | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('expert_profiles')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url, email),
          skills:expert_skills(*, skill_category:skill_categories(*))
        `)
        .eq('id', expertId)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expert');
      return null;
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('skill_categories')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setSkills(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    }
  }, []);

  const updateAvailability = useCallback(async (expertId: string, isAvailable: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('expert_profiles')
        .update({ is_available: isAvailable })
        .eq('id', expertId);

      if (updateError) throw updateError;

      setExperts(prev =>
        prev.map(e => (e.id === expertId ? { ...e, is_available: isAvailable } : e))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    }
  }, []);

  useEffect(() => {
    fetchSkills();
    fetchExperts();
  }, [fetchSkills, fetchExperts]);

  return {
    experts,
    skills,
    loading,
    error,
    fetchExperts,
    fetchExpert,
    fetchSkills,
    updateAvailability,
  };
}

-- ============================================
-- Edge Function: find_matching_experts
-- Finds and ranks experts based on skill match and availability
-- ============================================

-- Create the function in Supabase Edge Functions
-- Language: typescript (or plpgsql for database function)

-- For Supabase Edge Functions (TypeScript):
/*
import { createClient } from '@supabase/supabase-js';

interface MatchRequest {
  skill_category_ids: string[];
  max_rate_cents?: number;
  preferred_duration_minutes?: number;
}

interface ExpertMatch {
  expert_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  hourly_rate_cents: number;
  years_experience: number;
  rating: number;
  total_sessions: number;
  match_score: number;
  skill_match_count: number;
  is_available: boolean;
}

export default async function findMatchingExperts(
  req: Request,
  env: Env
): Promise<Response> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { skill_category_ids, max_rate_cents, preferred_duration_minutes } = await req.json();

  // Build query to find experts with matching skills
  let query = supabase
    .from('expert_profiles')
    .select(`
      id,
      user_id,
      bio,
      hourly_rate_cents,
      years_experience,
      rating,
      total_sessions,
      is_available,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      expert_skills (
        skill_category_id,
        proficiency_level
      )
    `)
    .eq('is_available', true);

  // Filter by max rate if specified
  if (max_rate_cents) {
    query = query.lte('hourly_rate_cents', max_rate_cents);
  }

  const { data: experts, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Calculate match scores
  const matches: ExpertMatch[] = experts
    .map((expert: any) => {
      const skills = expert.expert_skills || [];
      const matchingSkills = skills.filter(
        (s: any) => skill_category_ids.includes(s.skill_category_id)
      );
      const matchScore = skill_category_ids.length > 0
        ? (matchingSkills.length / skill_category_ids.length) * 100
        : 0;

      return {
        expert_id: expert.id,
        user_id: expert.user_id,
        full_name: expert.profiles?.full_name || 'Anonymous',
        avatar_url: expert.profiles?.avatar_url,
        bio: expert.bio || '',
        hourly_rate_cents: expert.hourly_rate_cents,
        years_experience: expert.years_experience || 0,
        rating: expert.rating || 0,
        total_sessions: expert.total_sessions || 0,
        match_score: Math.round(matchScore),
        skill_match_count: matchingSkills.length,
        is_available: expert.is_available,
      };
    })
    .filter((m: ExpertMatch) => m.skill_match_count > 0)
    .sort((a: ExpertMatch, b: ExpertMatch) => b.match_score - a.match_score);

  return new Response(JSON.stringify({ matches }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
*/

-- Database function version (alternative):
CREATE OR REPLACE FUNCTION find_matching_experts(
  p_skill_category_ids UUID[],
  p_max_rate_cents INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  expert_id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  hourly_rate_cents INTEGER,
  years_experience INTEGER,
  rating DECIMAL(3, 2),
  total_sessions INTEGER,
  match_score DECIMAL(5, 2),
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH expert_matches AS (
    SELECT
      ep.id AS expert_id,
      ep.user_id,
      p.full_name,
      p.avatar_url,
      ep.bio,
      ep.hourly_rate_cents,
      ep.years_experience,
      ep.rating,
      ep.total_sessions,
      ep.is_available,
      COUNT(es.id)::DECIMAL(5, 2) AS skill_match_count,
      COUNT(es.id)::DECIMAL(5, 2) / NULLIF(ARRAY_LENGTH(p_skill_category_ids, 1), 0) * 100 AS match_score_pct
    FROM expert_profiles ep
    JOIN profiles p ON p.id = ep.user_id
    LEFT JOIN expert_skills es ON es.expert_id = ep.id
      AND es.skill_category_id = ANY(p_skill_category_ids)
    WHERE ep.is_available = true
      AND (p_max_rate_cents IS NULL OR ep.hourly_rate_cents <= p_max_rate_cents)
    GROUP BY ep.id, p.id, ep.user_id
    HAVING COUNT(es.id) > 0
    ORDER BY match_score_pct DESC, ep.rating DESC
    LIMIT p_limit
  )
  SELECT
    em.expert_id,
    em.user_id,
    em.full_name,
    em.avatar_url,
    em.bio,
    em.hourly_rate_cents,
    em.years_experience,
    em.rating,
    em.total_sessions,
    em.match_score_pct AS match_score,
    em.is_available
  FROM expert_matches em;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

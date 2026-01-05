/**
 * Expert Matching Algorithm Tests
 *
 * Tests the expert matching functionality based on:
 * - Expertise tags matching
 * - Availability filtering
 * - Rating-based sorting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock types matching the algorithm
interface Expert {
  id: string
  bio: string
  expertise_tags: string[]
  session_rate: number
  available: boolean
  rating: number
  total_sessions: number
  approved: boolean
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

interface HelpRequest {
  id: string
  title: string
  description: string
  context?: Record<string, unknown>
}

interface MatchedExpert extends Expert {
  matchScore: number
  matchingTags: string[]
}

// Simplified matching algorithm for testing
function extractTagsFromRequest(request: HelpRequest): string[] {
  const text = `${request.title} ${request.description}`.toLowerCase()
  const keywords: Record<string, string[]> = {
    react: ['react', 'next.js', 'nextjs', 'jsx', 'component'],
    typescript: ['typescript', 'ts', 'type'],
    javascript: ['javascript', 'js', 'node'],
    python: ['python', 'django', 'flask'],
    css: ['css', 'tailwind', 'styling', 'style'],
    database: ['database', 'sql', 'postgres', 'supabase', 'mongodb'],
    api: ['api', 'rest', 'graphql', 'endpoint'],
    auth: ['auth', 'authentication', 'login', 'oauth'],
  }

  const tags: string[] = []
  for (const [tag, patterns] of Object.entries(keywords)) {
    if (patterns.some((pattern) => text.includes(pattern))) {
      tags.push(tag)
    }
  }
  return tags
}

function matchExperts(
  request: HelpRequest,
  experts: Expert[],
  options: {
    minScore?: number
    tagWeight?: number
    ratingWeight?: number
  } = {}
): MatchedExpert[] {
  const { minScore = 0, tagWeight = 0.7, ratingWeight = 0.3 } = options

  // Extract tags from the request
  const requestTags = extractTagsFromRequest(request)

  if (requestTags.length === 0) {
    // If no tags extracted, return all available experts sorted by rating
    return experts
      .filter((e) => e.available && e.approved)
      .map((e) => ({
        ...e,
        matchScore: e.rating / 5,
        matchingTags: [],
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  return experts
    .filter((e) => e.available && e.approved)
    .map((expert) => {
      // Calculate tag match score
      const matchingTags = expert.expertise_tags.filter((tag) =>
        requestTags.some(
          (rt) => tag.toLowerCase().includes(rt) || rt.includes(tag.toLowerCase())
        )
      )
      const tagScore =
        requestTags.length > 0 ? matchingTags.length / requestTags.length : 0

      // Combine scores
      const matchScore = tagScore * tagWeight + (expert.rating / 5) * ratingWeight

      return {
        ...expert,
        matchScore,
        matchingTags,
      }
    })
    .filter((e) => e.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
}

describe('Expert Matching Algorithm', () => {
  const mockExperts: Expert[] = [
    {
      id: 'expert-1',
      bio: 'React and TypeScript expert',
      expertise_tags: ['react', 'typescript', 'next.js'],
      session_rate: 3500,
      available: true,
      rating: 4.8,
      total_sessions: 50,
      approved: true,
      profiles: {
        id: 'expert-1',
        full_name: 'Alice Developer',
        avatar_url: null,
      },
    },
    {
      id: 'expert-2',
      bio: 'Python and Django specialist',
      expertise_tags: ['python', 'django', 'api'],
      session_rate: 4000,
      available: true,
      rating: 4.5,
      total_sessions: 30,
      approved: true,
      profiles: {
        id: 'expert-2',
        full_name: 'Bob Python',
        avatar_url: null,
      },
    },
    {
      id: 'expert-3',
      bio: 'Full-stack developer',
      expertise_tags: ['react', 'python', 'database', 'api'],
      session_rate: 5000,
      available: true,
      rating: 4.9,
      total_sessions: 100,
      approved: true,
      profiles: {
        id: 'expert-3',
        full_name: 'Carol Fullstack',
        avatar_url: null,
      },
    },
    {
      id: 'expert-4',
      bio: 'CSS and design expert',
      expertise_tags: ['css', 'tailwind', 'design'],
      session_rate: 2500,
      available: false, // Not available
      rating: 4.6,
      total_sessions: 20,
      approved: true,
      profiles: {
        id: 'expert-4',
        full_name: 'Dave Designer',
        avatar_url: null,
      },
    },
    {
      id: 'expert-5',
      bio: 'New developer',
      expertise_tags: ['javascript', 'react'],
      session_rate: 1500,
      available: true,
      rating: 3.0,
      total_sessions: 5,
      approved: false, // Not approved
      profiles: {
        id: 'expert-5',
        full_name: 'Eve Newbie',
        avatar_url: null,
      },
    },
  ]

  describe('extractTagsFromRequest', () => {
    it('should extract React tags from request', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'Need help with React component',
        description: 'My component is not rendering properly',
      }

      const tags = extractTagsFromRequest(request)
      expect(tags).toContain('react')
    })

    it('should extract multiple tags from request', () => {
      const request: HelpRequest = {
        id: '2',
        title: 'TypeScript API issues',
        description: 'Having trouble with REST endpoint types',
      }

      const tags = extractTagsFromRequest(request)
      expect(tags).toContain('typescript')
      expect(tags).toContain('api')
    })

    it('should return empty array for unrelated request', () => {
      const request: HelpRequest = {
        id: '3',
        title: 'Random question',
        description: 'Something unrelated to known tags',
      }

      const tags = extractTagsFromRequest(request)
      expect(tags).toHaveLength(0)
    })

    it('should be case-insensitive', () => {
      const request: HelpRequest = {
        id: '4',
        title: 'REACT and TYPESCRIPT',
        description: 'NEXT.JS problem',
      }

      const tags = extractTagsFromRequest(request)
      expect(tags).toContain('react')
      expect(tags).toContain('typescript')
    })
  })

  describe('matchExperts', () => {
    it('should return experts sorted by match score', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'React component help',
        description: 'Need help with TypeScript types in React',
      }

      const matches = matchExperts(request, mockExperts)

      expect(matches.length).toBeGreaterThan(0)
      // First result should have highest score
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore)
      }
    })

    it('should filter out unavailable experts', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'CSS styling help',
        description: 'Need Tailwind CSS help',
      }

      const matches = matchExperts(request, mockExperts)

      // Dave (expert-4) is unavailable and should not appear
      const unavailableMatch = matches.find((m) => m.id === 'expert-4')
      expect(unavailableMatch).toBeUndefined()
    })

    it('should filter out unapproved experts', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'React help',
        description: 'Need JavaScript help',
      }

      const matches = matchExperts(request, mockExperts)

      // Eve (expert-5) is unapproved and should not appear
      const unapprovedMatch = matches.find((m) => m.id === 'expert-5')
      expect(unapprovedMatch).toBeUndefined()
    })

    it('should return matching tags for each expert', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'React TypeScript help',
        description: 'Working on a Next.js project',
      }

      const matches = matchExperts(request, mockExperts)

      // Find expert with React tag
      const reactExpert = matches.find((m) => m.id === 'expert-1')
      expect(reactExpert).toBeDefined()
      expect(reactExpert!.matchingTags.length).toBeGreaterThan(0)
    })

    it('should respect minimum score filter', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'Python Django API',
        description: 'Building a REST API',
      }

      const matches = matchExperts(request, mockExperts, { minScore: 0.5 })

      // All matches should have score >= 0.5
      for (const match of matches) {
        expect(match.matchScore).toBeGreaterThanOrEqual(0.5)
      }
    })

    it('should handle requests with no matching tags', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'Random stuff',
        description: 'Nothing related to tech',
      }

      const matches = matchExperts(request, mockExperts)

      // Should still return available experts, sorted by rating
      expect(matches.length).toBeGreaterThan(0)
      // All should be available and approved
      for (const match of matches) {
        expect(match.available).toBe(true)
        expect(match.approved).toBe(true)
      }
    })

    it('should prioritize experts with more matching tags', () => {
      const request: HelpRequest = {
        id: '1',
        title: 'React API database help',
        description: 'Full stack problem with React frontend and API',
      }

      const matches = matchExperts(request, mockExperts)

      // Carol (expert-3) has more matching tags: react, api, database
      expect(matches[0].id).toBe('expert-3')
    })
  })
})

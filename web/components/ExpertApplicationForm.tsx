'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Common expertise areas for quick selection
 */
const EXPERTISE_SUGGESTIONS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'AI/ML',
  'LangChain',
  'OpenAI',
  'Claude',
  'Cursor',
  'Replit',
  'v0',
  'Tailwind CSS',
  'CSS',
  'HTML',
  'PostgreSQL',
  'Supabase',
  'Firebase',
  'MongoDB',
  'REST APIs',
  'GraphQL',
  'Docker',
  'AWS',
  'Vercel',
  'Git',
  'Testing',
  'Debugging',
]

interface ExpertApplicationFormProps {
  userId: string
  initialName?: string
}

/**
 * Expert application form for users who want to become experts.
 * Collects bio, expertise tags, and session rate.
 * Submits to experts table with approved=false for admin review.
 */
export default function ExpertApplicationForm({
  userId,
  initialName = '',
}: ExpertApplicationFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [bio, setBio] = useState('')
  const [expertiseTags, setExpertiseTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [sessionRate, setSessionRate] = useState('25') // Default $25 per session
  const [yearsExperience, setYearsExperience] = useState('')
  const [portfolio, setPortfolio] = useState('')

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /**
   * Add an expertise tag
   */
  const addTag = (tag: string) => {
    const normalizedTag = tag.trim()
    if (normalizedTag && !expertiseTags.includes(normalizedTag)) {
      if (expertiseTags.length >= 10) {
        setError('Maximum 10 expertise areas allowed')
        return
      }
      setExpertiseTags([...expertiseTags, normalizedTag])
    }
  }

  /**
   * Remove an expertise tag
   */
  const removeTag = (tag: string) => {
    setExpertiseTags(expertiseTags.filter((t) => t !== tag))
  }

  /**
   * Handle custom tag input
   */
  const handleCustomTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (customTag.trim()) {
        addTag(customTag)
        setCustomTag('')
      }
    }
  }

  /**
   * Submit the application
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validation
    if (!bio.trim()) {
      setError('Please write a bio about yourself')
      setLoading(false)
      return
    }

    if (bio.trim().length < 50) {
      setError('Bio must be at least 50 characters')
      setLoading(false)
      return
    }

    if (expertiseTags.length < 2) {
      setError('Please select at least 2 areas of expertise')
      setLoading(false)
      return
    }

    const rate = parseInt(sessionRate, 10)
    if (isNaN(rate) || rate < 15 || rate > 100) {
      setError('Session rate must be between $15 and $100')
      setLoading(false)
      return
    }

    try {
      // First update the profile to mark as expert (pending approval)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_expert: true })
        .eq('id', userId)

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      // Create the expert profile
      const { error: expertError } = await supabase.from('experts').insert({
        id: userId,
        bio: bio.trim(),
        expertise_tags: expertiseTags,
        session_rate: rate * 100, // Convert to cents
        hourly_rate: rate * 4 * 100, // Estimate hourly rate (4 x 15min sessions) in cents
        available: false, // Not available until approved
        approved: false, // Requires admin approval
        years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        portfolio_url: portfolio.trim() || null,
      })

      if (expertError) {
        // Handle duplicate key error
        if (expertError.code === '23505') {
          setError('You have already submitted an application')
        } else {
          setError(expertError.message)
        }
        setLoading(false)
        return
      }

      // Success!
      setSuccess(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          Application Submitted!
        </h3>
        <p className="text-green-700 mb-6">
          Thank you for applying to become an expert. We&apos;ll review your
          application and get back to you within 2-3 business days.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Bio */}
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-secondary-700 mb-1"
        >
          About You <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          className="block w-full rounded-lg border border-secondary-300 px-4 py-3 text-secondary-900 placeholder-secondary-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          placeholder="Tell us about your background, experience, and what makes you a great expert. What problems do you love solving? (minimum 50 characters)"
        />
        <p className="mt-1 text-xs text-secondary-500">
          {bio.length}/50 characters minimum
        </p>
      </div>

      {/* Expertise Tags */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Areas of Expertise <span className="text-red-500">*</span>
        </label>

        {/* Selected tags */}
        {expertiseTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {expertiseTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 h-4 w-4 rounded-full hover:bg-primary-200 flex items-center justify-center"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Custom tag input */}
        <div className="mb-3">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleCustomTagKeyDown}
            disabled={loading || expertiseTags.length >= 10}
            className="block w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-secondary-900 placeholder-secondary-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Type a skill and press Enter"
          />
        </div>

        {/* Suggested tags */}
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_SUGGESTIONS.filter((tag) => !expertiseTags.includes(tag))
            .slice(0, 12)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                disabled={loading || expertiseTags.length >= 10}
                className="inline-flex items-center rounded-md border border-secondary-200 bg-secondary-50 px-2.5 py-1.5 text-xs font-medium text-secondary-600 hover:bg-secondary-100 hover:border-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + {tag}
              </button>
            ))}
        </div>
        <p className="mt-2 text-xs text-secondary-500">
          Select at least 2 areas ({expertiseTags.length}/10)
        </p>
      </div>

      {/* Session Rate */}
      <div>
        <label
          htmlFor="rate"
          className="block text-sm font-medium text-secondary-700 mb-1"
        >
          Session Rate (per 15 minutes) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">
            $
          </span>
          <input
            id="rate"
            type="number"
            min="15"
            max="100"
            value={sessionRate}
            onChange={(e) => setSessionRate(e.target.value)}
            disabled={loading}
            className="block w-full rounded-lg border border-secondary-300 pl-8 pr-4 py-3 text-secondary-900 placeholder-secondary-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1 text-xs text-secondary-500">
          Experts typically charge $15-50 per 15-minute session. Platform takes
          10%.
        </p>
      </div>

      {/* Years of Experience (optional) */}
      <div>
        <label
          htmlFor="experience"
          className="block text-sm font-medium text-secondary-700 mb-1"
        >
          Years of Experience
        </label>
        <select
          id="experience"
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          disabled={loading}
          className="block w-full rounded-lg border border-secondary-300 px-4 py-3 text-secondary-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        >
          <option value="">Select...</option>
          <option value="1">Less than 1 year</option>
          <option value="2">1-2 years</option>
          <option value="4">3-5 years</option>
          <option value="7">5-10 years</option>
          <option value="10">10+ years</option>
        </select>
      </div>

      {/* Portfolio/LinkedIn (optional) */}
      <div>
        <label
          htmlFor="portfolio"
          className="block text-sm font-medium text-secondary-700 mb-1"
        >
          Portfolio or LinkedIn URL
        </label>
        <input
          id="portfolio"
          type="url"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          disabled={loading}
          className="block w-full rounded-lg border border-secondary-300 px-4 py-3 text-secondary-900 placeholder-secondary-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="https://linkedin.com/in/yourprofile"
        />
        <p className="mt-1 text-xs text-secondary-500">
          Optional, but helps us verify your expertise
        </p>
      </div>

      {/* Platform Info */}
      <div className="rounded-lg bg-secondary-50 border border-secondary-200 p-4">
        <h4 className="font-medium text-secondary-900 mb-2">
          How it works for experts:
        </h4>
        <ul className="space-y-2 text-sm text-secondary-600">
          <li className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-primary-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Set your own availability and rates
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-primary-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Get matched with users who need your specific skills
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-primary-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Help through 15-minute screen sharing sessions
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-primary-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Keep 90% of your earnings (paid via Stripe)
          </li>
        </ul>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting Application...' : 'Submit Application'}
      </button>

      <p className="text-center text-xs text-secondary-500">
        By submitting, you agree to our{' '}
        <a href="/terms" className="text-primary-600 hover:underline">
          Expert Terms of Service
        </a>{' '}
        and confirm that your information is accurate.
      </p>
    </form>
  )
}

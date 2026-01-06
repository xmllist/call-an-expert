'use client'

import { useState } from 'react'

/**
 * StarRating Component
 *
 * A reusable interactive star rating component.
 * Supports hover effects, selection, and read-only display mode.
 */

interface StarRatingProps {
  /** Current rating value (1-5) */
  value: number
  /** Callback when rating changes */
  onChange?: (value: number) => void
  /** Maximum number of stars (default 5) */
  maxStars?: number
  /** Size of stars: 'sm' | 'md' | 'lg' | 'xl' */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Whether the rating is read-only */
  readOnly?: boolean
  /** Whether to show the rating value as text */
  showValue?: boolean
  /** Additional class names */
  className?: string
  /** Color when star is filled */
  activeColor?: string
  /** Color when star is empty */
  inactiveColor?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

const gapClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1',
  xl: 'gap-1.5',
}

/**
 * Star SVG component
 */
function StarIcon({
  filled,
  half,
  size,
  activeColor,
  inactiveColor,
}: {
  filled: boolean
  half?: boolean
  size: 'sm' | 'md' | 'lg' | 'xl'
  activeColor: string
  inactiveColor: string
}) {
  if (half) {
    return (
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 20 20"
        fill="none"
      >
        {/* Half filled star */}
        <defs>
          <linearGradient id="half-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          fill="url(#half-fill)"
          className={activeColor}
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
        <path
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          className={inactiveColor}
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    )
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${filled ? activeColor : inactiveColor}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 1.5}
      viewBox="0 0 20 20"
    >
      <path
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  )
}

export default function StarRating({
  value,
  onChange,
  maxStars = 5,
  size = 'md',
  readOnly = false,
  showValue = false,
  className = '',
  activeColor = 'text-yellow-400',
  inactiveColor = 'text-secondary-300',
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue !== null ? hoverValue : value

  const handleClick = (starIndex: number) => {
    if (readOnly || !onChange) return
    onChange(starIndex)
  }

  const handleMouseEnter = (starIndex: number) => {
    if (readOnly) return
    setHoverValue(starIndex)
  }

  const handleMouseLeave = () => {
    if (readOnly) return
    setHoverValue(null)
  }

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1
        const isFilled = starIndex <= displayValue

        return (
          <button
            key={starIndex}
            type="button"
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={`
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 rounded
              transition-transform
              ${!readOnly && 'hover:scale-110 active:scale-95'}
            `}
            aria-label={`Rate ${starIndex} out of ${maxStars} stars`}
          >
            <StarIcon
              filled={isFilled}
              size={size}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
          </button>
        )
      })}
      {showValue && (
        <span className="ml-2 text-sm font-medium text-secondary-600">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}

/**
 * Display-only star rating (optimized for static display)
 */
interface StarRatingDisplayProps {
  /** Rating value (can be decimal for partial stars) */
  rating: number
  /** Maximum stars */
  maxStars?: number
  /** Size of stars */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Whether to show the rating value */
  showValue?: boolean
  /** Number of reviews/ratings (optional) */
  reviewCount?: number
  /** Additional class names */
  className?: string
}

export function StarRatingDisplay({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = true,
  reviewCount,
  className = '',
}: StarRatingDisplayProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1
        const isFilled = starIndex <= fullStars
        const isHalf = starIndex === fullStars + 1 && hasHalfStar

        return (
          <StarIcon
            key={starIndex}
            filled={isFilled}
            half={isHalf}
            size={size}
            activeColor="text-yellow-400"
            inactiveColor="text-secondary-300"
          />
        )
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-secondary-700">
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="ml-1 text-sm text-secondary-500">
          ({reviewCount})
        </span>
      )}
    </div>
  )
}

/**
 * Rating labels for each star value
 */
export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

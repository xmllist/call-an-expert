'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Slider } from '~/components/ui/slider';
import { Search, Filter, X } from 'lucide-react';

interface ExpertFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  skills?: { id: string; name: string }[];
}

interface FilterState {
  search: string;
  maxRate: number | null;
  minRating: number | null;
  availableOnly: boolean;
  skills: string[];
}

const ratingOptions = [
  { value: '0', label: 'Any Rating' },
  { value: '4.5', label: '4.5+' },
  { value: '4.0', label: '4.0+' },
  { value: '3.5', label: '3.5+' },
];

const rateOptions = [
  { value: '0', label: 'Any Price' },
  { value: '100', label: 'Under $100/hr' },
  { value: '150', label: 'Under $150/hr' },
  { value: '200', label: 'Under $200/hr' },
  { value: '300', label: 'Under $300/hr' },
];

export function ExpertFilters({ onFilterChange, skills = [] }: ExpertFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    maxRate: null,
    minRating: null,
    availableOnly: true,
    skills: [],
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      maxRate: null,
      minRating: null,
      availableOnly: true,
      skills: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.search ||
    filters.maxRate !== null ||
    filters.minRating !== null ||
    filters.skills.length > 0;

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or skill..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="p-4 rounded-lg border bg-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Max Rate */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Hourly Rate</label>
              <Select
                value={filters.maxRate?.toString() || '0'}
                onValueChange={(v) => updateFilter('maxRate', v === '0' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any price" />
                </SelectTrigger>
                <SelectContent>
                  {rateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Rating</label>
              <Select
                value={filters.minRating?.toString() || '0'}
                onValueChange={(v) => updateFilter('minRating', v === '0' ? null : parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Availability</label>
              <Select
                value={filters.availableOnly.toString()}
                onValueChange={(v) => updateFilter('availableOnly', v === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Available Now</SelectItem>
                  <SelectItem value="false">All Experts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Button
                    key={skill.id}
                    variant={filters.skills.includes(skill.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newSkills = filters.skills.includes(skill.id)
                        ? filters.skills.filter((s) => s !== skill.id)
                        : [...filters.skills, skill.id];
                      updateFilter('skills', newSkills);
                    }}
                  >
                    {skill.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

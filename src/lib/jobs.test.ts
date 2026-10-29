import { describe, it, expect } from 'vitest';
import {
    sortByNewest,
    formatPostedDate,
    getDepartments,
    getLocations,
    filterJobs,
    matchesFilters,
} from './jobs';
import type { Job } from '../types/job';

function makeJob(slug: string, postedDate: string): Job {
    return {
        slug,
        title: `Role ${slug}`,
        department: 'Technology',
        location: 'Remote',
        type: 'Full-time',
        remote: true,
        postedDate,
        summary: 'A role.',
    };
}

describe('sortByNewest', () => {
    it('orders jobs by posted date, newest first', () => {
        const jobs = [
            makeJob('a', '2027-01-01'),
            makeJob('b', '2027-03-15'),
            makeJob('c', '2027-02-10'),
        ];
        expect(sortByNewest(jobs).map((j) => j.slug)).toEqual(['b', 'c', 'a']);
    });

    it('does not mutate the input array', () => {
        const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-03-15')];
        const original = jobs.map((j) => j.slug);
        sortByNewest(jobs);
        expect(jobs.map((j) => j.slug)).toEqual(original);
    });
});

describe('formatPostedDate', () => {
    it('formats an ISO date as a readable string', () => {
        expect(formatPostedDate('2027-01-05')).toBe('January 5, 2027');
    });

    it('returns the raw value when the date is unparseable', () => {
        expect(formatPostedDate('not-a-date')).toBe('not-a-date');
    });
});

function makeRole(slug: string, department: string, location: string): Job {
    return { ...makeJob(slug, '2027-01-01'), department, location };
}

const roles: Job[] = [
    makeRole('a', 'Technology', 'London, United Kingdom'),
    makeRole('b', 'Technology', 'Dallas, TX, USA'),
    makeRole('c', 'Finance', 'London, United Kingdom'),
    makeRole('d', 'Finance', 'Dallas, TX, USA'),
    makeRole('e', 'Security', 'Dallas, TX, USA'),
];

describe('getDepartments / getLocations', () => {
    it('returns unique values sorted alphabetically', () => {
        expect(getDepartments(roles)).toEqual(['Finance', 'Security', 'Technology']);
        expect(getLocations(roles)).toEqual(['Dallas, TX, USA', 'London, United Kingdom']);
    });

    it('returns an empty array for no jobs', () => {
        expect(getDepartments([])).toEqual([]);
        expect(getLocations([])).toEqual([]);
    });
});

describe('filterJobs', () => {
    const slugs = (jobs: Job[]): string[] => jobs.map((job) => job.slug);

    it('filters by department only', () => {
        expect(slugs(filterJobs(roles, { department: 'Finance' }))).toEqual(['c', 'd']);
    });

    it('filters by location only', () => {
        expect(slugs(filterJobs(roles, { location: 'London, United Kingdom' }))).toEqual(['a', 'c']);
    });

    it('combines department and location with AND', () => {
        expect(
            slugs(filterJobs(roles, { department: 'Finance', location: 'Dallas, TX, USA' })),
        ).toEqual(['d']);
    });

    it('treats empty or missing filters as a reset', () => {
        expect(filterJobs(roles, {})).toEqual(roles);
        expect(filterJobs(roles, { department: '', location: '' })).toEqual(roles);
    });

    it('returns an empty array for unknown values or non-overlapping combinations', () => {
        expect(filterJobs(roles, { department: 'Legal' })).toEqual([]);
        expect(filterJobs(roles, { department: 'Security', location: 'London, United Kingdom' })).toEqual([]);
        expect(filterJobs([], { department: 'Finance' })).toEqual([]);
    });

    it('does not mutate the input array', () => {
        const copy = [...roles];
        filterJobs(roles, { department: 'Finance' });
        expect(roles).toEqual(copy);
    });
});

describe('matchesFilters', () => {
    it('matches only when every provided filter matches', () => {
        const role = { department: 'Finance', location: 'Dallas, TX, USA' };
        expect(matchesFilters(role, { department: 'Finance' })).toBe(true);
        expect(matchesFilters(role, { department: 'Finance', location: 'London, United Kingdom' })).toBe(false);
    });
});

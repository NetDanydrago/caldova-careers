/**
 * Pure, side-effect-free helpers for working with job postings.
 *
 * These operate on plain `Job[]` arrays (already loaded from the content
 * collection by the calling page) so they can be unit tested without the Astro
 * content runtime or a database.
 */
import type { Job, JobFilters } from '../types/job';

/** Return jobs sorted by posted date, newest first (does not mutate input). */
export function sortByNewest(jobs: Job[]): Job[] {
    return [...jobs].sort(
        (a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime(),
    );
}

/**
 * Format an ISO-8601 date as a human-readable posted date,
 * e.g. "January 5, 2027". Falls back to the raw value if unparseable.
 */
export function formatPostedDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/** Return the unique, alphabetically sorted values of a string field. */
function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/** Unique department names across the given jobs, sorted alphabetically. */
export function getDepartments(jobs: Job[]): string[] {
    return uniqueSorted(jobs.map((job) => job.department));
}

/** Unique locations across the given jobs, sorted alphabetically. */
export function getLocations(jobs: Job[]): string[] {
    return uniqueSorted(jobs.map((job) => job.location));
}

/** True when a department/location pair satisfies every non-empty filter (AND). */
export function matchesFilters(
    role: Pick<Job, 'department' | 'location'>,
    filters: JobFilters,
): boolean {
    const departmentMatches = !filters.department || role.department === filters.department;
    const locationMatches = !filters.location || role.location === filters.location;
    return departmentMatches && locationMatches;
}

/** Filter jobs by department and/or location (does not mutate input). */
export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
    return jobs.filter((job) => matchesFilters(job, filters));
}

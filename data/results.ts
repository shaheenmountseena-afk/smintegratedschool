/**
 * Admin-managed: year-wise toppers.
 * TODO: replace dummy entries with real results (or an API call).
 * Leave the array empty to show the "Results will be updated soon" state.
 */

export type ResultItem = {
  id: string
  year: number
  name: string
  score: string
  exam: string
  /** Optional photo; initials are shown when empty. */
  photo?: string
}

export const results: ResultItem[] = [

]

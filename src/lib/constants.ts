/**
 * Shared constants used across the frontend.
 *
 * Put values here when they need to stay consistent across multiple pages
 * or components (e.g. portal counts, dataset counts shown in landing +
 * chat welcome).
 *
 * For constants that change often or should come from the backend,
 * consider fetching them from `/api/stats` instead.
 */

/** Number of data portals integrated. Used in landing hero + chat welcome. */
export const PORTAL_COUNT = 30;

/** Approximate dataset count shown in landing stats. Updated manually. */
export const DATASET_COUNT_APPROX = 17000;

/**
 * URL of a file in this frontend's public/ folder.
 *
 * In production the storefront is served by Laravel under /storefront/ (vite `base`),
 * so static paths must not be hard-coded as "/images/...".
 */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

/**
 * Preserve hash navigation on GitHub Pages while accepting direct local routes.
 * @param {string} pathname
 * @param {string} search
 * @param {string} base
 * @returns {string | null}
 */
export function legacyRouteTarget(pathname, search = '', base = '/') {
  const prefix = base.replace(/\/+$/, '');
  const relative = pathname.startsWith(prefix + '/')
    ? pathname.slice(prefix.length)
    : null;
  const match = relative?.match(/^\/(admin|agendar)\/?$/);
  if (!match) return null;
  return `${prefix}/#/${match[1]}${search}`;
}

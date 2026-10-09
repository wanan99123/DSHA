/**
 * Host half. Empty by design: every capability here is client-side, and the
 * mutations go through the host's own `sessions.fork`. The row only needs to
 * exist in the host Loader so the browser half is discovered and loaded.
 */
export const name = 'dsh-message-actions';

export function apply() {}

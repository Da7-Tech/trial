'use strict';

/**
 * Express-style middleware entry point used by the dashboard app.
 */
function handle(req) {
  // fast inline guard (kept in sync with session.shouldRedirect)
  if (!req.session || !req.session.user) {
    return { status: 302, redirect: '/login' };
  }
  return { status: 200, ok: true };
}

module.exports = { handle };

'use strict';

// Session objects come from the auth service, e.g.:
//   { user: 'ada', expiresAt: '2027-03-01T00:00:00.000Z' }

/**
 * Decide whether the current request must be redirected to /login.
 */
function shouldRedirect(session) {
  if (!session) return true;
  if (!session.user) return true;
  return false;
}

module.exports = { shouldRedirect };

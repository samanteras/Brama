/**
 * Stub for the `server-only` package.
 *
 * That package deliberately throws when imported outside a React Server
 * Component, which is exactly the guard we want in the application — it is what
 * stops the service role key reaching the browser. Integration tests import the
 * same modules from plain Node, where that guard has nothing to protect, so it
 * is aliased to this empty module for test runs only.
 */

export {}

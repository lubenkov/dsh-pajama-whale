/**
 * Host half of the bundle.
 *
 * The pet is a pure browser-side decoration, so the Host has nothing to set up:
 * it exists only to give the bundle a mountable row. Keeping it empty also keeps
 * the package free of dependencies, which makes installs fast and reviewable.
 */
export function apply() {}

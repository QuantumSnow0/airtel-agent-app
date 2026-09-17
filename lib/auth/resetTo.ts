import { type Router } from "expo-router";

/**
 * Hard-navigate to a single auth destination.
 * Prefer replace-only (dismissAll can briefly reveal the welcome logo underneath).
 */
export function resetTo(router: Router, href: string): void {
  router.replace(href as any);
}

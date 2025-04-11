// Type safety for our routes
export const TABS = {
  DASHBOARD: "dashboard",
  GROUPS: "groups",
  FRIENDS: "friends",
} as const;

export type TabType = typeof TABS[keyof typeof TABS];

// Get active tab from hash
export const getActiveTabFromHash = (): TabType => {
  if (typeof window === 'undefined') return TABS.DASHBOARD;
  
  const hash = window.location.hash.replace('#', '');
  if (hash === TABS.GROUPS) return TABS.GROUPS;
  if (hash === TABS.FRIENDS) return TABS.FRIENDS;
  return TABS.DASHBOARD;
}; 
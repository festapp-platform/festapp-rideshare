/**
 * Shared pastel design system for Festapp Rideshare.
 *
 * Defines the friendly pastel color palette (PLAT-01) and tab navigation
 * definitions (NAV-01) used by both web and mobile apps.
 */

export const colors = {
  light: {
    background: '#FAF7FF',
    surface: '#FFFFFF',
    primary: '#7C6FA0',
    primaryLight: '#B8ACE0',
    secondary: '#6BA3A0',
    accent: '#E8A87C',
    text: '#2D2B3D',
    textSecondary: '#8E8BA3',
    border: '#E8E4F0',
    success: '#7BC67E',
    warning: '#F0C674',
    error: '#E07070',
    tabBarActive: '#7C6FA0',
    tabBarInactive: '#B8B5C8',
  },
  dark: {
    background: '#1A1825',
    surface: '#252336',
    primary: '#B8ACE0',
    primaryLight: '#7C6FA0',
    secondary: '#7BBFBC',
    accent: '#F0BC94',
    text: '#EEEAF5',
    textSecondary: '#9E9BB3',
    border: '#3D3A52',
    success: '#8BD88E',
    warning: '#F5D68A',
    error: '#F08080',
    tabBarActive: '#B8ACE0',
    tabBarInactive: '#6E6B82',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorTokens = {
  [K in keyof typeof colors.light]: string;
};

/**
 * Tab navigation definitions shared between web and mobile (NAV-01).
 * Icons reference FontAwesome names for mobile; web can map to equivalent SVGs.
 */
export const tabs = [
  { name: 'search', title: 'Search', icon: 'search' },
  { name: 'my-rides', title: 'My Rides', icon: 'car' },
  { name: 'messages', title: 'Messages', icon: 'comments' },
  { name: 'profile', title: 'Profile', icon: 'user' },
] as const;

export type TabName = (typeof tabs)[number]['name'];

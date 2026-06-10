export const Colors = {
  // Primary palette
  navy: '#0f2744',
  blue: '#185FA5',
  blueMid: '#378ADD',
  blueLight: '#E6F1FB',

  teal: '#1D9E75',
  tealDark: '#0F6E56',
  tealLight: '#E1F5EE',

  amber: '#EF9F27',
  amberDark: '#854F0B',
  amberLight: '#FAEEDA',

  red: '#E24B4A',
  redDark: '#A32D2D',
  redLight: '#FCEBEB',

  green: '#639922',
  greenDark: '#3B6D11',
  greenLight: '#EAF3DE',

  purple: '#7F77DD',
  purpleDark: '#3C3489',
  purpleLight: '#EEEDFE',

  // Neutrals
  white: '#FFFFFF',
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F7F7F5',
  bgTertiary: '#EFEDE8',

  textPrimary: '#1A1A18',
  textSecondary: '#6B6B67',
  textHint: '#9E9E9A',

  border: '#E5E3DC',
  borderMid: '#C8C5BC',

  // Semantic
  success: '#1D9E75',
  warning: '#EF9F27',
  danger: '#E24B4A',
  info: '#185FA5',
};

export const DOMAIN_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Access Management': { bg: Colors.blueLight, text: Colors.blue, icon: 'shield-lock-outline' },
  'Change Management': { bg: Colors.amberLight, text: Colors.amberDark, icon: 'source-branch' },
  'IT Operations': { bg: Colors.tealLight, text: Colors.tealDark, icon: 'server-outline' },
  'SDLC': { bg: Colors.purpleLight, text: Colors.purpleDark, icon: 'code-tags' },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Kickoff': { bg: Colors.blueLight, text: Colors.blue },
  'In Progress': { bg: Colors.amberLight, text: Colors.amberDark },
  'At Risk': { bg: Colors.redLight, text: Colors.redDark },
  'On Track': { bg: Colors.tealLight, text: Colors.tealDark },
  'Complete': { bg: Colors.greenLight, text: Colors.greenDark },

  'Not Started': { bg: Colors.bgTertiary, text: Colors.textSecondary },
  'Tested': { bg: Colors.tealLight, text: Colors.tealDark },
  'Exception': { bg: Colors.redLight, text: Colors.redDark },

  'Outstanding': { bg: Colors.redLight, text: Colors.redDark },
  'Requested': { bg: Colors.amberLight, text: Colors.amberDark },
  'Received': { bg: Colors.blueLight, text: Colors.blue },
  'Reviewed': { bg: Colors.tealLight, text: Colors.tealDark },

  'Open': { bg: Colors.redLight, text: Colors.redDark },
  'In Remediation': { bg: Colors.amberLight, text: Colors.amberDark },
  'Closed': { bg: Colors.tealLight, text: Colors.tealDark },

  'High': { bg: Colors.redLight, text: Colors.redDark },
  'Medium': { bg: Colors.amberLight, text: Colors.amberDark },
  'Low': { bg: Colors.blueLight, text: Colors.blue },
  'Informational': { bg: Colors.bgTertiary, text: Colors.textSecondary },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

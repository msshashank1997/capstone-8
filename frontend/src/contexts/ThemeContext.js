import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme context
const ThemeContext = createContext();

// Theme actions
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_SYSTEM_THEME: 'SET_SYSTEM_THEME',
};

// Available themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Theme reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
        effectiveTheme: action.payload === THEMES.SYSTEM ? state.systemTheme : action.payload,
      };
    case THEME_ACTIONS.TOGGLE_THEME:
      const newTheme = state.effectiveTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      return {
        ...state,
        theme: newTheme,
        effectiveTheme: newTheme,
      };
    case THEME_ACTIONS.SET_SYSTEM_THEME:
      return {
        ...state,
        systemTheme: action.payload,
        effectiveTheme: state.theme === THEMES.SYSTEM ? action.payload : state.effectiveTheme,
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  theme: THEMES.SYSTEM,
  systemTheme: THEMES.LIGHT,
  effectiveTheme: THEMES.LIGHT,
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Get system theme preference
  const getSystemTheme = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? THEMES.DARK 
        : THEMES.LIGHT;
    }
    return THEMES.LIGHT;
  };

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || THEMES.SYSTEM;
    const systemTheme = getSystemTheme();
    
    dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: systemTheme });
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: savedTheme });
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const systemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
      dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: systemTheme });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    body.classList.remove('light-theme', 'dark-theme');
    
    // Add current theme classes
    root.classList.add(state.effectiveTheme);
    body.classList.add(`${state.effectiveTheme}-theme`);
    
    // Set data attribute for CSS
    root.setAttribute('data-theme', state.effectiveTheme);
    
    // Set color scheme for better browser defaults
    root.style.colorScheme = state.effectiveTheme;
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = state.effectiveTheme === THEMES.DARK ? '#0f172a' : '#ffffff';
    }
  }, [state.effectiveTheme]);

  // Set theme function
  const setTheme = (newTheme) => {
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: newTheme });
    localStorage.setItem('theme', newTheme);
  };

  // Toggle theme function
  const toggleTheme = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_THEME });
    const newTheme = state.effectiveTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    localStorage.setItem('theme', newTheme);
  };

  // Get theme colors for the current theme
  const getThemeColors = () => {
    const isDark = state.effectiveTheme === THEMES.DARK;
    
    return {
      primary: {
        50: isDark ? '#1e3a8a' : '#eff6ff',
        100: isDark ? '#1d4ed8' : '#dbeafe',
        200: isDark ? '#2563eb' : '#bfdbfe',
        300: isDark ? '#3b82f6' : '#93c5fd',
        400: isDark ? '#60a5fa' : '#60a5fa',
        500: isDark ? '#93c5fd' : '#3b82f6',
        600: isDark ? '#bfdbfe' : '#2563eb',
        700: isDark ? '#dbeafe' : '#1d4ed8',
        800: isDark ? '#eff6ff' : '#1e40af',
        900: isDark ? '#f8fafc' : '#1e3a8a',
      },
      background: {
        primary: isDark ? '#0f172a' : '#ffffff',
        secondary: isDark ? '#1e293b' : '#f8fafc',
        tertiary: isDark ? '#334155' : '#f1f5f9',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#cbd5e1' : '#475569',
        tertiary: isDark ? '#94a3b8' : '#64748b',
      },
      border: isDark ? '#475569' : '#e2e8f0',
    };
  };

  // Get CSS custom properties for the current theme
  const getThemeVariables = () => {
    const colors = getThemeColors();
    
    return {
      '--color-primary-50': colors.primary[50],
      '--color-primary-100': colors.primary[100],
      '--color-primary-200': colors.primary[200],
      '--color-primary-300': colors.primary[300],
      '--color-primary-400': colors.primary[400],
      '--color-primary-500': colors.primary[500],
      '--color-primary-600': colors.primary[600],
      '--color-primary-700': colors.primary[700],
      '--color-primary-800': colors.primary[800],
      '--color-primary-900': colors.primary[900],
      '--color-bg-primary': colors.background.primary,
      '--color-bg-secondary': colors.background.secondary,
      '--color-bg-tertiary': colors.background.tertiary,
      '--color-text-primary': colors.text.primary,
      '--color-text-secondary': colors.text.secondary,
      '--color-text-tertiary': colors.text.tertiary,
      '--color-border': colors.border,
    };
  };

  // Check if dark mode is active
  const isDarkMode = state.effectiveTheme === THEMES.DARK;

  // Check if system preference is being used
  const isSystemTheme = state.theme === THEMES.SYSTEM;

  const value = {
    theme: state.theme,
    effectiveTheme: state.effectiveTheme,
    systemTheme: state.systemTheme,
    isDarkMode,
    isSystemTheme,
    setTheme,
    toggleTheme,
    getThemeColors,
    getThemeVariables,
    THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// HOC for theme-aware components
export const withTheme = (Component) => {
  return (props) => {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};

export default ThemeContext;

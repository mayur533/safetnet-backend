import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setThemeMode, ThemeMode } from '../store/slices/settingsSlice';
import { lightTheme, darkTheme, ThemeColors } from '../utils/themes';

interface ThemeContextType {
  colors: ThemeColors;
  currentTheme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isSystemDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.settings.themeMode);
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine current theme based on themeMode
  const getCurrentTheme = (): 'light' | 'dark' => {
    switch (themeMode) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      case 'system':
      default:
        return systemTheme === 'dark' ? 'dark' : 'light';
    }
  };

  const currentTheme = getCurrentTheme();
  const colors = currentTheme === 'dark' ? darkTheme : lightTheme;
  const isSystemDark = systemTheme === 'dark';

  const handleSetThemeMode = (mode: ThemeMode) => {
    dispatch(setThemeMode(mode));
  };

  const value: ThemeContextType = {
    colors,
    currentTheme,
    themeMode,
    setThemeMode: handleSetThemeMode,
    isSystemDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '../context/ThemeContext';

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

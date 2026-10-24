import React from 'react';
import { Sun, Moon } from 'lucide-react';
export default function ThemeButton({ theme, onToggle }) {
  const Icon = theme === 'dark' ? Sun : Moon;
  return <button className="theme-toggle" onClick={onToggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}><Icon size={16}/><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>;
}

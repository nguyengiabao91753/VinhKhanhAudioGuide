'use client';

import { useState } from 'react';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (langCode: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

/**
 * Language Selector Component
 * Allows users to switch between available languages
 */
export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label="Language selector"
        aria-expanded={isOpen}
      >
        <span className={styles.flag}>{currentLang.flag}</span>
        <span className={styles.label}>{currentLang.label}</span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.rotated : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`${styles.option} ${currentLanguage === lang.code ? styles.selected : ''}`}
              onClick={() => {
                onLanguageChange(lang.code);
                setIsOpen(false);
              }}
              type="button"
            >
              <span className={styles.flag}>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

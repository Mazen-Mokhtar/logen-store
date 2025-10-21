import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLocale } from '../hooks/useLocale';

export function LanguageSwitcher() {
  const { locales, currentLocale, loading, switchLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false);
    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router.events]);

  if (loading || !currentLocale) {
    return (
      <div className="language-switcher loading">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  const enabledLocales = locales.filter(locale => locale.enabled);

  if (enabledLocales.length <= 1) {
    return null; // Don't show switcher if only one locale is available
  }

  const handleLocaleSwitch = (localeCode: string) => {
    switchLocale(localeCode);
    setIsOpen(false);
  };

  const getLocaleFlag = (localeCode: string) => {
    const flags: Record<string, string> = {
      en: '🇺🇸',
      es: '🇪🇸',
      fr: '🇫🇷',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
      ja: '🇯🇵',
      ko: '🇰🇷',
      zh: '🇨🇳',
    };
    return flags[localeCode] || '🌐';
  };

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        className="current-locale"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${currentLocale.nativeName}. Click to change language.`}
      >
        <span className="locale-flag" role="img" aria-hidden="true">
          {getLocaleFlag(currentLocale.code)}
        </span>
        <span className="locale-name">{currentLocale.nativeName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`} aria-hidden="true">
          ▼
        </span>
      </button>
      
      {isOpen && (
        <ul className="locale-dropdown" role="listbox" aria-label="Available languages">
          {enabledLocales.map((locale) => (
            <li key={locale.code} role="option" aria-selected={locale.code === currentLocale.code}>
              <button
                className={`locale-option ${locale.code === currentLocale.code ? 'active' : ''}`}
                onClick={() => handleLocaleSwitch(locale.code)}
                aria-label={`Switch to ${locale.name}`}
              >
                <span className="locale-flag" role="img" aria-hidden="true">
                  {getLocaleFlag(locale.code)}
                </span>
                <div className="locale-info">
                  <span className="locale-native">{locale.nativeName}</span>
                  <span className="locale-english">({locale.name})</span>
                </div>
                {locale.code === currentLocale.code && (
                  <span className="current-indicator" aria-hidden="true">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .language-switcher {
          position: relative;
          display: inline-block;
        }

        .language-switcher.loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          color: #666;
          font-size: 14px;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #0070f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .current-locale {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .current-locale:hover {
          background: #f8f9fa;
          border-color: #0070f3;
        }

        .current-locale:focus {
          outline: none;
          border-color: #0070f3;
          box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.1);
        }

        .locale-flag {
          font-size: 16px;
          line-height: 1;
        }

        .locale-name {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }

        .dropdown-arrow {
          font-size: 10px;
          transition: transform 0.2s ease;
          color: #666;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .locale-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          margin: 4px 0 0 0;
          padding: 4px 0;
          list-style: none;
          max-height: 200px;
          overflow-y: auto;
        }

        .locale-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          transition: background-color 0.2s ease;
        }

        .locale-option:hover {
          background: #f8f9fa;
        }

        .locale-option:focus {
          outline: none;
          background: #e3f2fd;
        }

        .locale-option.active {
          background: #e3f2fd;
          font-weight: 500;
        }

        .locale-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .locale-native {
          font-weight: 500;
          color: #333;
        }

        .locale-english {
          font-size: 12px;
          color: #666;
        }

        .current-indicator {
          color: #0070f3;
          font-weight: bold;
          font-size: 12px;
        }

        /* RTL support */
        .language-switcher[dir="rtl"] .current-locale,
        .language-switcher[dir="rtl"] .locale-option {
          text-align: right;
        }

        .language-switcher[dir="rtl"] .locale-dropdown {
          left: auto;
          right: 0;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .current-locale {
            min-width: 100px;
            padding: 6px 10px;
            font-size: 13px;
          }

          .locale-dropdown {
            min-width: 150px;
          }

          .locale-option {
            padding: 10px 12px;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .current-locale {
            border-width: 2px;
          }

          .locale-dropdown {
            border-width: 2px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .dropdown-arrow,
          .current-locale,
          .locale-option {
            transition: none;
          }

          .loading-spinner {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
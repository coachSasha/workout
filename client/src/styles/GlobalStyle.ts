import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fontFamily};
    background: ${({ theme }) => theme.colors.bg};
    background-image: ${({ theme }) => theme.colors.bgGradient};
    color: ${({ theme }) => theme.colors.text};
    min-height: 100vh;
    line-height: 1.5;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    font-weight: 500;
  }
  a:hover { color: ${({ theme }) => theme.colors.primaryHover}; }

  /* react-big-calendar */
  .rbc-calendar {
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }

  .rbc-header,
  .rbc-time-header-content,
  .rbc-time-content,
  .rbc-day-bg + .rbc-day-bg,
  .rbc-month-row + .rbc-month-row {
    border-color: ${({ theme }) => theme.colors.border} !important;
  }

  .rbc-day-slot .rbc-time-slot,
  .rbc-timeslot-group {
    border-color: ${({ theme }) => theme.colors.borderLight} !important;
  }

  .rbc-time-view,
  .rbc-month-view,
  .rbc-agenda-view {
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.colors.surface};
    overflow: hidden;
    box-shadow: ${({ theme }) => theme.shadow};
    max-width: 100%;
  }

  .rbc-time-view .rbc-time-gutter,
  .rbc-time-view .rbc-time-header-gutter {
    flex-shrink: 0;
  }

  .rbc-toolbar {
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }

  .rbc-toolbar button {
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius};
    padding: 0.4rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: ${({ theme }) => theme.colors.surface};
    transition: background 0.15s, border-color 0.15s;
  }

  .rbc-toolbar button:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  .rbc-toolbar button.rbc-active {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    color: #fff;
  }

  .rbc-toolbar-label {
    font-weight: 600;
    font-size: 1rem;
  }

  .rbc-off-range-bg {
    background: ${({ theme }) => theme.colors.borderLight};
  }

  .rbc-today {
    background: rgba(79, 70, 229, 0.08);
  }

  .rbc-event {
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 0.8rem;
    font-weight: 500;
    border: none !important;
  }

  .rbc-event.rbc-selected {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }

  .rbc-slot-selection {
    background: rgba(79, 70, 229, 0.15);
  }

  .rbc-allday-cell {
    border-color: ${({ theme }) => theme.colors.border} !important;
    max-height: 42px !important;
    overflow: hidden !important;
  }

  .rbc-time-header-content > .rbc-row.rbc-row-gutter {
    max-height: 42px;
    overflow: hidden;
  }

  .rbc-time-gutter .rbc-timeslot-group {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

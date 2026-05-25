import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    min-height: 100vh;
  }
  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .rbc-calendar {
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }
  .rbc-header, .rbc-time-header-content, .rbc-time-content {
    border-color: ${({ theme }) => theme.colors.border} !important;
  }
  .rbc-day-slot .rbc-time-slot { border-color: ${({ theme }) => theme.colors.border} !important; }
  .rbc-timeslot-group { border-color: ${({ theme }) => theme.colors.border} !important; }
  .rbc-time-view, .rbc-month-view, .rbc-agenda-view {
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.colors.surface};
  }
  .rbc-toolbar button {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
  }
  .rbc-toolbar button.rbc-active,
  .rbc-toolbar button:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  .rbc-off-range-bg { background: ${({ theme }) => theme.colors.bg}; }
  .rbc-today { background: rgba(59, 130, 246, 0.12); }
  .rbc-event { border-radius: 4px; padding: 2px 4px; }
  .rbc-slot-selection { background: rgba(59, 130, 246, 0.25); }
`;

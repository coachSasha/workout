import styled from 'styled-components';

export const Page = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2rem;
  overflow-x: hidden;
  width: 100%;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem 1.5rem;
  }
`;

export const Card = styled.div<{ $overflowHidden?: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radiusLg};
  padding: 1.25rem;
  box-shadow: ${({ theme }) => theme.shadow};
  max-width: 100%;
  overflow: ${({ $overflowHidden }) => ($overflowHidden ? 'hidden' : 'visible')};

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: ${({ theme }) => theme.radius};
  }
`;

export const Button = styled.button<{
  $variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'secondary';
  $block?: boolean;
}>`
  padding: 0.65rem 1.1rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  transition: transform 0.1s, box-shadow 0.15s, opacity 0.15s;

  background: ${({ theme, $variant }) => {
    if ($variant === 'danger') return theme.colors.danger;
    if ($variant === 'success') return theme.colors.success;
    if ($variant === 'ghost') return 'transparent';
    if ($variant === 'secondary') return theme.colors.surfaceHover;
    return theme.colors.primaryGradient;
  }};
  color: ${({ theme, $variant }) => {
    if ($variant === 'ghost' || $variant === 'secondary') return theme.colors.text;
    return '#fff';
  }};
  border-color: ${({ theme, $variant }) =>
    $variant === 'ghost' || $variant === 'secondary' ? theme.colors.border : 'transparent'};
  box-shadow: ${({ $variant }) =>
    $variant === 'primary' || !$variant ? '0 2px 8px rgba(79, 70, 229, 0.35)' : 'none'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.95;
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.85rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.65rem 0.85rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  appearance: auto;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
`;

export const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

export const Field = styled.div`
  margin-bottom: 1rem;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  min-width: 480px;
  background: ${({ theme }) => theme.colors.surface};

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
  }
  th {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  tbody tr:hover td {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0;

  @media (min-width: 769px) {
    align-items: center;
    padding: 1rem;
  }
`;

export const ModalBox = styled(Card)`
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radiusLg} ${({ theme }) => theme.radiusLg} 0 0;
  box-shadow: ${({ theme }) => theme.shadowLg};

  @media (min-width: 769px) {
    border-radius: ${({ theme }) => theme.radiusLg};
  }
`;

export const ModalTitle = styled.h2`
  margin: 0 0 1rem;
  font-size: 1.2rem;
  font-weight: 700;
`;

export const ModalActions = styled.div<{ $stacked?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;

  ${({ $stacked }) =>
    !$stacked &&
    `
    @media (min-width: 769px) {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      & > button {
        width: auto;
      }
    }
  `}
`;

export const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
`;

export const HeaderBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.headerBlur};
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (min-width: 769px) {
    padding: 0.85rem 1.5rem;
  }
`;

export const Logo = styled.span`
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text};

  @media (min-width: 769px) {
    font-size: 1.1rem;
  }
`;

export const NavActions = styled.div`
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-shrink: 0;
`;

export const InlineInput = styled.input`
  width: 3.5rem;
  min-height: 36px;
  padding: 0.35rem 0.4rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  font-size: 16px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const MobileCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius};
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow};
`;

export const MobileCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const PageTitle = styled.h1`
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

export const ToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: center;
`;

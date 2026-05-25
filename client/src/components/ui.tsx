import styled from 'styled-components';

export const Page = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius};
  padding: 1.25rem;
  box-shadow: ${({ theme }) => theme.shadow};

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' | 'success'; $block?: boolean }>`
  padding: 0.6rem 1rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'ghost' ? theme.colors.border : 'transparent'};
  cursor: pointer;
  font-size: 0.95rem;
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  background: ${({ theme, $variant }) => {
    if ($variant === 'danger') return theme.colors.danger;
    if ($variant === 'success') return theme.colors.success;
    if ($variant === 'ghost') return 'transparent';
    return theme.colors.primary;
  }};
  color: ${({ theme, $variant }) =>
    $variant === 'ghost' ? theme.colors.text : '#fff'};

  &:hover:not(:disabled) {
    opacity: 0.9;
    filter: brightness(1.05);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.65rem 0.75rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.65rem 0.75rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
`;

export const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 0.35rem;
`;

export const Field = styled.div`
  margin-bottom: 1rem;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  min-width: 480px;

  th,
  td {
    padding: 0.65rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  th {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 600;
  }
  tr:hover td {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
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
  border-radius: ${({ theme }) => theme.radius} ${({ theme }) => theme.radius} 0 0;

  @media (min-width: 769px) {
    border-radius: ${({ theme }) => theme.radius};
  }
`;

export const ModalTitle = styled.h2`
  margin: 0 0 1rem;
  font-size: 1.15rem;
`;

export const ModalActions = styled.div`
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  margin-top: 1.25rem;

  @media (min-width: 769px) {
    flex-direction: row;
    justify-content: flex-end;
  }
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
  background: ${({ theme }) => theme.colors.surface};

  @media (min-width: 769px) {
    padding: 1rem 1.5rem;
  }
`;

export const Logo = styled.span`
  font-weight: 700;
  font-size: 1rem;

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
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  font-size: 16px;
`;

export const MobileCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius};
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: ${({ theme }) => theme.colors.bg};
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
  font-size: 1.35rem;

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

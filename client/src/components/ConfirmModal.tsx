import {
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalActions,
  Button,
  ErrorText,
} from './ui';

interface Props {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <ModalOverlay onClick={onCancel}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{title}</ModalTitle>
        <div style={{ margin: 0, color: 'inherit', lineHeight: 1.5 }}>{children}</div>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions $stacked>
          <Button
            $variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
            $block
          >
            {confirmLabel}
          </Button>
          <Button $variant="ghost" onClick={onCancel} disabled={loading} $block>
            {cancelLabel}
          </Button>
        </ModalActions>
      </ModalBox>
    </ModalOverlay>
  );
}

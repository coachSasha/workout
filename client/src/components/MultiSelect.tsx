import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Wrap = styled.div`
  position: relative;
  width: 100%;
`;

const Trigger = styled.button<{ $open: boolean; $disabled?: boolean }>`
  width: 100%;
  padding: 0.65rem 2.25rem 0.65rem 0.85rem;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid
    ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  box-shadow: ${({ $open }) => ($open ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none')};
  position: relative;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
`;

const TriggerText = styled.span<{ $muted?: boolean }>`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme, $muted }) => ($muted ? theme.colors.textMuted : theme.colors.text)};
`;

const Chevron = styled.span<{ $open: boolean }>`
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%) rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform 0.15s;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textMuted};
  pointer-events: none;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 10000;
  max-height: min(220px, 40vh);
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadowLg};
  -webkit-overflow-scrolling: touch;
`;

const OptionBtn = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 44px;
  padding: 0.55rem 0.85rem;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};
  background: ${({ theme, $selected }) =>
    $selected ? 'rgba(79, 70, 229, 0.08)' : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const Check = styled.span<{ $selected: boolean }>`
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 4px;
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.primary : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1;
`;

function formatTriggerLabel(
  value: string[],
  options: MultiSelectOption[],
  placeholder: string,
): string {
  if (value.length === 0) return placeholder;
  const labels = value
    .map((id) => options.find((o) => o.value === id)?.label)
    .filter(Boolean) as string[];
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
}

export function MultiSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '— выберите —',
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const updateMenuPosition = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuRect(r);
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const label = formatTriggerLabel(value, options, placeholder);

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        $open={open}
        $disabled={disabled}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <TriggerText $muted={value.length === 0}>{label}</TriggerText>
        <Chevron $open={open}>▼</Chevron>
      </Trigger>
      {open &&
        !disabled &&
        menuRect &&
        createPortal(
          <Dropdown
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-multiselectable
            style={{
              top: menuRect.bottom + 4,
              left: menuRect.left,
              width: menuRect.width,
            }}
          >
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <OptionBtn
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  $selected={selected}
                  onClick={() => toggle(opt.value)}
                >
                  <Check $selected={selected}>{selected ? '✓' : ''}</Check>
                  {opt.label}
                </OptionBtn>
              );
            })}
          </Dropdown>,
          document.body,
        )}
    </Wrap>
  );
}

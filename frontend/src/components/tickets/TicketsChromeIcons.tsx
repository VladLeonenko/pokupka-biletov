import type { ReactNode, SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

function Glyph({ children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconSearch(props: Props) {
  return (
    <Glyph {...props}>
      <circle cx="11" cy="11" r="6.15" />
      <path d="M15.9 15.9 20 20" />
    </Glyph>
  );
}

export function IconHeart(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M12 19.35s-6.55-4-6.55-8.25a3.55 3.55 0 0 1 6.55-1.9 3.55 3.55 0 0 1 6.55 1.9c0 4.25-6.55 8.25-6.55 8.25z" />
    </Glyph>
  );
}

/** Корзина витрины — билет с перфорацией, не магазинная тележка. */
export function IconTicket(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M6.4 7.4h10.6a1.6 1.6 0 0 1 1.6 1.6v1.15a2 2 0 0 0 0 4v1.45a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6v-1.45a2 2 0 0 0 0-4V9a1.6 1.6 0 0 1 1.6-1.6z" />
      <path d="M8.7 7.4v9.7" strokeDasharray="1.15 1.7" />
    </Glyph>
  );
}

export function IconUser(props: Props) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="8.15" r="3" />
      <path d="M5.7 19.35c.75-3.1 3.2-4.65 6.3-4.65s5.55 1.55 6.3 4.65" />
    </Glyph>
  );
}

export function IconPin(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M12 20.7s5.7-4.9 5.7-8.85a5.7 5.7 0 1 0-11.4 0c0 3.95 5.7 8.85 5.7 8.85z" />
      <circle cx="12" cy="11.7" r="1.7" />
    </Glyph>
  );
}

export function IconReturn(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M8.2 8.4H5.4V5.6" />
      <path d="M5.7 8.4a6.5 6.5 0 1 1-.55 4.15" />
    </Glyph>
  );
}

export function IconHelp(props: Props) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M9.65 9.7a2.4 2.4 0 1 1 3.45 2.15c-.7.4-1.1.95-1.1 1.7" />
      <path d="M12 16.55h.01" />
    </Glyph>
  );
}

export function IconChat(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M6.4 16.6 5 19.15l3.05-1.15A6.7 6.7 0 1 0 6.4 16.6z" />
    </Glyph>
  );
}

export function IconChevronLeft(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M14.5 6.5 9 12l5.5 5.5" />
    </Glyph>
  );
}

export function IconChevronRight(props: Props) {
  return (
    <Glyph {...props}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" />
    </Glyph>
  );
}

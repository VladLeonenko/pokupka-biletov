import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { HallSelectedSeat } from '@/components/tickets/TicketHallInteractiveBlock';
import { isFanIdRequiredForRepertoire } from '@/utils/fanIdRequiredEvents';

const STORAGE_KEY = 'ticket-cart-v1';

export type TicketCartSnapshot = {
  repertoireId: string;
  offerId: string;
  seats: string[];
  mapSelectedSeats: HallSelectedSeat[];
  eventTitle: string;
  baseTotalRub: number;
  sessionLabel: string | null;
  seatLabels?: string[];
  mapOfferSelections?: Array<{ offerId: string; seats: string[] }>;
  descriptionLead?: string | null;
  ticketHref: string;
  requiresFanId?: boolean;
};

type TicketCartContextValue = {
  cart: TicketCartSnapshot | null;
  purchaseOpen: boolean;
  setPurchaseOpen: (open: boolean) => void;
  setCart: (next: TicketCartSnapshot | null) => void;
  clearCart: () => void;
};

const TicketCartContext = createContext<TicketCartContextValue | null>(null);

function readStoredCart(): TicketCartSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketCartSnapshot;
    if (!parsed?.repertoireId || !parsed.offerId || !Array.isArray(parsed.seats) || parsed.seats.length === 0) {
      return null;
    }
    if (!parsed.requiresFanId && isFanIdRequiredForRepertoire(parsed.repertoireId)) {
      parsed.requiresFanId = true;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredCart(cart: TicketCartSnapshot | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!cart) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* ignore quota */
  }
}

export function TicketCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartState] = useState<TicketCartSnapshot | null>(() => readStoredCart());
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  useEffect(() => {
    writeStoredCart(cart);
    document.body.classList.toggle('ticket-cart-bar-visible', Boolean(cart?.seats?.length));
    return () => {
      document.body.classList.remove('ticket-cart-bar-visible');
    };
  }, [cart]);

  const setCart = useCallback((next: TicketCartSnapshot | null) => {
    setCartState(next);
  }, []);

  const clearCart = useCallback(() => {
    setCartState(null);
    setPurchaseOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      purchaseOpen,
      setPurchaseOpen,
      setCart,
      clearCart,
    }),
    [cart, purchaseOpen, setCart, clearCart],
  );

  return <TicketCartContext.Provider value={value}>{children}</TicketCartContext.Provider>;
}

export function useTicketCart(): TicketCartContextValue {
  const ctx = useContext(TicketCartContext);
  if (!ctx) throw new Error('useTicketCart must be used within TicketCartProvider');
  return ctx;
}

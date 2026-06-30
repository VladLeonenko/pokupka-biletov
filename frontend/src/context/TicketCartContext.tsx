import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { HallSelectedSeat } from '@/components/tickets/TicketHallInteractiveBlock';
import { cancelTicketSeatHold, reserveTicketSeats } from '@/services/biletPublicApi';
import { isFanIdRequiredForRepertoire } from '@/utils/fanIdRequiredEvents';
import {
  buildTicketSelectionKey,
  isTicketHoldActive,
  type TicketSeatHoldState,
} from '@/utils/ticketSeatHold';

const STORAGE_KEY = 'ticket-cart-v1';
const HOLD_STORAGE_KEY = 'ticket-cart-hold-v1';

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
  hold: TicketSeatHoldState | null;
  reservePending: boolean;
  reserveError: string | null;
  purchaseOpen: boolean;
  setPurchaseOpen: (open: boolean) => void;
  setCart: (next: TicketCartSnapshot | null) => void;
  clearCart: () => void;
  ensureSeatHold: (cart: TicketCartSnapshot) => Promise<boolean>;
  releaseSeatHold: () => Promise<void>;
  clearHoldState: () => void;
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

function readStoredHold(): TicketSeatHoldState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HOLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketSeatHoldState;
    if (!parsed?.expiresAt || !parsed.selectionKey) return null;
    if (!isTicketHoldActive(parsed)) return null;
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

function writeStoredHold(hold: TicketSeatHoldState | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!hold) sessionStorage.removeItem(HOLD_STORAGE_KEY);
    else sessionStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(hold));
  } catch {
    /* ignore quota */
  }
}

export function TicketCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartState] = useState<TicketCartSnapshot | null>(() => readStoredCart());
  const [hold, setHoldState] = useState<TicketSeatHoldState | null>(() => readStoredHold());
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [reservePending, setReservePending] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const holdRef = useRef(hold);
  holdRef.current = hold;

  useEffect(() => {
    writeStoredCart(cart);
    document.body.classList.toggle('ticket-cart-bar-visible', Boolean(cart?.seats?.length));
    return () => {
      document.body.classList.remove('ticket-cart-bar-visible');
    };
  }, [cart]);

  useEffect(() => {
    writeStoredHold(hold);
  }, [hold]);

  const clearHoldState = useCallback(() => {
    setHoldState(null);
    writeStoredHold(null);
  }, []);

  const releaseSeatHold = useCallback(async () => {
    const current = holdRef.current;
    if (current?.getbiletOrderIds?.length) {
      await cancelTicketSeatHold(current.getbiletOrderIds);
    }
    clearHoldState();
  }, [clearHoldState]);

  const setCart = useCallback((next: TicketCartSnapshot | null) => {
    setCartState(next);
  }, []);

  const clearCart = useCallback(() => {
    void releaseSeatHold();
    setCartState(null);
    setPurchaseOpen(false);
    setReserveError(null);
  }, [releaseSeatHold]);

  const ensureSeatHold = useCallback(
    async (snapshot: TicketCartSnapshot): Promise<boolean> => {
      setReserveError(null);
      const selectionKey = buildTicketSelectionKey({
        offerId: snapshot.offerId,
        seats: snapshot.seats,
        offerSelections: snapshot.mapOfferSelections,
      });

      const current = holdRef.current;
      if (
        current &&
        current.selectionKey === selectionKey &&
        current.repertoireId === snapshot.repertoireId &&
        isTicketHoldActive(current)
      ) {
        return true;
      }

      if (current) {
        await releaseSeatHold();
      }

      setReservePending(true);
      try {
        const data = await reserveTicketSeats({
          repertoireId: snapshot.repertoireId,
          offerId: snapshot.offerId,
          seats: snapshot.seats,
          offerSelections: snapshot.mapOfferSelections,
        });
        const nextHold: TicketSeatHoldState = {
          expiresAt: data.expiresAt,
          holdSeconds: data.holdSeconds,
          selectionKey: data.selectionKey || selectionKey,
          repertoireId: data.repertoireId,
          getbiletOrderIds: data.getbiletOrderIds ?? [],
          makeData: data.makeData,
          baseRub: data.baseRub,
        };
        setHoldState(nextHold);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось забронировать места';
        setReserveError(msg);
        return false;
      } finally {
        setReservePending(false);
      }
    },
    [releaseSeatHold],
  );

  useEffect(() => {
    if (!cart || !hold) return;
    const selectionKey = buildTicketSelectionKey({
      offerId: cart.offerId,
      seats: cart.seats,
      offerSelections: cart.mapOfferSelections,
    });
    if (selectionKey !== hold.selectionKey || cart.repertoireId !== hold.repertoireId) {
      void releaseSeatHold();
    }
  }, [cart, hold, releaseSeatHold]);

  useEffect(() => {
    if (!hold) return;
    const ms = new Date(hold.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void releaseSeatHold();
      setPurchaseOpen(false);
      return;
    }
    const id = window.setTimeout(() => {
      void releaseSeatHold();
      setPurchaseOpen(false);
      setReserveError('Время брони истекло — выберите места снова');
    }, ms + 50);
    return () => clearTimeout(id);
  }, [hold, releaseSeatHold]);

  const value = useMemo(
    () => ({
      cart,
      hold,
      reservePending,
      reserveError,
      purchaseOpen,
      setPurchaseOpen,
      setCart,
      clearCart,
      ensureSeatHold,
      releaseSeatHold,
      clearHoldState,
    }),
    [
      cart,
      hold,
      reservePending,
      reserveError,
      purchaseOpen,
      setCart,
      clearCart,
      ensureSeatHold,
      releaseSeatHold,
      clearHoldState,
    ],
  );

  return <TicketCartContext.Provider value={value}>{children}</TicketCartContext.Provider>;
}

export function useTicketCart(): TicketCartContextValue {
  const ctx = useContext(TicketCartContext);
  if (!ctx) throw new Error('useTicketCart must be used within TicketCartProvider');
  return ctx;
}

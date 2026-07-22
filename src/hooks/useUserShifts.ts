import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ShiftPoint {
  name?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupTime?: string;
  dropTime?: string;
  seatType?: string;
  visitLocation?: string;
  visitStartTime?: string;
  visitEndTime?: string;
  gender?: string;
  dob?: string;
  parentName?: string;
  parentPhone?: string;
}

export interface Shift {
  docId: string;
  id?: string;
  userId?: string;
  userName?: string;
  clientName?: string;
  clientId?: string;
  startTime?: string;
  endTime?: string;
  dateKey_iso?: string;   // "2025-01-04"
  dateKey?: string;       // "25-01-2025" or "2025-01-25"
  startDate?: unknown;    // Timestamp or string
  typeName?: string;
  categoryName?: string;
  description?: string;
  address?: string;
  status?: string;
  shiftConfirmed?: boolean;
  clockIn?: string;
  clockOut?: string;
  isCancelled?: boolean;
  isDeleted?: boolean;
  vehicleType?: string;
  shiftPoints?: ShiftPoint[];
  agencyName?: string;
  clientDetails?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

/** Returns true for any non-empty clock value (string, Firestore Timestamp, or Date). */
function hasClock(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  return true; // Timestamp object or anything else truthy
}

/** Derive a 4-state UI status from raw Firestore fields.
 *  Checks both current field names (clockIn/clockOut) AND legacy names
 *  (clockInDate/clockOutDate) so old shifts still resolve correctly. */
export function getShiftUIStatus(
  shift: Shift
): 'assigned' | 'confirmed' | 'in-progress' | 'completed' {
  // Support legacy clockInDate / clockOutDate written by old mobile app versions
  const hasOut = hasClock(shift.clockOut)     || hasClock((shift as Record<string, unknown>).clockOutDate);
  const hasIn  = hasClock(shift.clockIn)      || hasClock((shift as Record<string, unknown>).clockInDate);

  if (hasOut) return 'completed';
  if (hasIn)  return 'in-progress';
  if (shift.shiftConfirmed === true) return 'confirmed';
  return 'assigned';
}

/** Extract a human-readable time string from a clockIn/clockOut field.
 *  Handles: Firestore Timestamp, "HH:MM" 24-hr string, "h:mm AM/PM" string. */
export function clockTimeDisplay(val: unknown): string {
  if (!val) return '';
  // Firestore Timestamp ({ seconds, nanoseconds })
  if (typeof val === 'object' && val !== null && 'seconds' in (val as object)) {
    const d = new Date((val as { seconds: number }).seconds * 1000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const s = String(val).trim();
  if (!s) return '';
  // Already "9:32 AM" style
  if (/^\d+:\d+\s*(AM|PM)$/i.test(s)) return s;
  // "HH:MM" 24-hour
  if (/^\d{1,2}:\d{2}$/.test(s)) return formatTime(s);
  return s;
}

/** Compute elapsed display string "4h 06m" between two clock values.
 *  Works with Firestore Timestamps, ISO strings, or "HH:MM" / "h:mm AM/PM" strings. */
export function clockElapsed(from: unknown, to: unknown): string {
  if (!from || !to) return '';
  const toMs = (v: unknown): number => {
    if (typeof v === 'object' && v !== null && 'seconds' in (v as object)) {
      return (v as { seconds: number }).seconds * 1000;
    }
    const s = String(v).trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) {      // "HH:MM"
      const [h, m] = s.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.getTime();
    }
    if (/^\d+:\d+\s*(AM|PM)$/i.test(s)) { // "9:32 AM"
      return new Date(`${new Date().toDateString()} ${s}`).getTime();
    }
    return new Date(s).getTime();
  };
  const fromMs = toMs(from);
  const toMsVal = toMs(to);
  if (isNaN(fromMs) || isNaN(toMsVal)) return '';
  const mins = Math.round((toMsVal - fromMs) / 60000);
  if (mins < 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Today in "YYYY-MM-DD" */
export function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Check whether a shift belongs to a given ISO date ("YYYY-MM-DD").
 *  Handles every format the admin app can store. */
export function shiftMatchesDate(shift: Shift, isoDate: string): boolean {
  // 1. dateKey_iso is the cleanest field: "2025-05-25"
  if (shift.dateKey_iso && String(shift.dateKey_iso) === isoDate) return true;

  // 2. dateKey may be "25-05-2025" (dd-mm-yyyy) or occasionally "2025-05-25"
  if (shift.dateKey) {
    const dk = String(shift.dateKey);
    if (dk === isoDate) return true;                        // already ISO
    const parts = dk.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      // dd-mm-yyyy → rebuild as yyyy-mm-dd
      if (`${parts[2]}-${parts[1]}-${parts[0]}` === isoDate) return true;
    }
  }

  // 3. Firestore Timestamp stored in startDate
  const sd = shift.startDate;
  if (sd && typeof sd === 'object' && 'seconds' in (sd as object)) {
    const d = new Date((sd as { seconds: number }).seconds * 1000);
    const rebuilt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (rebuilt === isoDate) return true;
  }

  return false;
}

/** "09:00" → "9:00 AM" */
export function formatTime(t: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const m = (mStr || '00').slice(0, 2);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** "2025-01-04" → "January 4, 2025" */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ─── Single-field query (no composite index needed) ─────────────── *
 * We query ONLY by userId — no dateKey_iso filter in Firestore.      *
 * Compound Firestore queries need a Composite Index to be created     *
 * in the Firebase Console; querying by one field never does.          *
 * The date filtering happens in JavaScript after the snapshot lands.  */

/* ─── Today's shifts — real-time ──────────────────────────────────── */
export function useTodayShifts(userId: string | undefined) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const today = todayISO();

    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', userId)   // single field — no index required
    );

    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => {
        const docs: Shift[] = snap.docs
          .map((d) => ({ docId: d.id, ...d.data() } as Shift))
          .filter((s) => !s.isCancelled && !s.isDeleted && shiftMatchesDate(s, today));

        docs.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        setShifts(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useTodayShifts] Firestore error:', err.code, err.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { shifts, loading, error };
}

/* ─── All shifts — real-time ─────────────────────────────────────── */
export function useUserShifts(userId: string | undefined) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', userId)
    );

    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => {
        const docs: Shift[] = snap.docs
          .map((d) => ({ docId: d.id, ...d.data() } as Shift))
          .filter((s) => !s.isCancelled && !s.isDeleted);
        setShifts(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[useUserShifts] Firestore error:', err.code, err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { shifts, loading };
}

/* ─── Single shift — real-time ───────────────────────────────────── */
export function useSingleShift(shiftDocId: string | undefined) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shiftDocId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'shifts', shiftDocId),
      (snap) => {
        if (snap.exists()) {
          setShift({ docId: snap.id, ...snap.data() } as Shift);
        } else {
          setShift(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useSingleShift] Firestore error:', err.code, err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [shiftDocId]);

  return { shift, loading };
}

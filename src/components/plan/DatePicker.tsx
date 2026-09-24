/* A date picker in the site's own style, replacing the browser's native
 * date input on the intake (Alex, 24 September 2026: "the calendar that's a
 * drop down menu should be in our style of the website").
 *
 * WHAT IT IS
 * A field that shows the chosen date in words ("Thursday, 3 December 2026")
 * and opens a month grid underneath it. Under 640px the grid rises from the
 * bottom of the screen as a sheet instead, so it is thumb-sized on a phone.
 *
 * WHAT IT KEEPS
 * The value in and out is exactly what the native input produced: a plain
 * yyyy-mm-dd string, or '' for no date. Nothing that saves a date changes.
 *
 * KEYBOARD AND SCREEN READERS
 * The standard date-grid pattern: the field is a button that says what it
 * opens; the grid is a table with one focusable day at a time; arrows move a
 * day or a week, Home and End go to the start and end of the week, Page Up
 * and Page Down move a month (Shift for a year), Enter or Space chooses,
 * Escape closes and hands focus back to the field. Days outside [min, max]
 * are shown but cannot be chosen or focused. The arithmetic behind all of
 * this is in ./calendar.ts, tested without a browser.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '../../lib/i18n/react';
import {
  CALENDAR_KEYS,
  clampIso,
  daysFromTo,
  formatLongDate,
  hasSelectableAfter,
  hasSelectableBefore,
  isIsoDate,
  monthGrid,
  monthTitle,
  moveFocus,
  partsOf,
  weekdayNames,
  type CalendarKey,
} from './calendar';
import '../../styles/date-picker.css';

export interface DatePickerProps {
  id: string;
  /** yyyy-mm-dd, or '' for no date. */
  value: string;
  onChange: (iso: string) => void;
  /** The student's own today, yyyy-mm-dd. Marked on the grid. */
  today: string;
  /** Earliest day that can be chosen. */
  min?: string;
  /** Latest day that can be chosen. */
  max?: string;
  /** Shown in the field while no date is chosen. */
  placeholder: string;
  /** Names the field for assistive technology: the question it answers. */
  labelledBy?: string;
  disabled?: boolean;
  /** Say how far away the chosen date is ("in 70 days"). Only makes sense
      for a date in the future, such as an exam. */
  showCountdown?: boolean;
}

export default function DatePicker({
  id,
  value,
  onChange,
  today,
  min,
  max,
  placeholder,
  labelledBy,
  disabled = false,
  showCountdown = false,
}: DatePickerProps) {
  const { t, tn, locale } = useT();
  const calLocale = locale === 'ru' ? 'ru' : 'en';
  const dialogId = useId();
  const titleId = `${dialogId}-title`;

  const [open, setOpen] = useState(false);
  const [focusIso, setFocusIso] = useState(() => clampIso(isIsoDate(value) ? value : today, min, max));
  const [view, setView] = useState(() => {
    const p = partsOf(clampIso(isIsoDate(value) ? value : today, min, max));
    return { year: p.year, monthIndex: p.monthIndex };
  });
  /* Which way the month grid slides when paging, for the small motion. */
  const [slide, setSlide] = useState<'none' | 'next' | 'prev'>('none');

  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  /* Focus goes into the grid only after the student opened it or moved
     inside it, never on a plain re-render. */
  const focusGridNext = useRef(false);

  const hasValue = isIsoDate(value);

  function showMonthOf(iso: string) {
    const p = partsOf(iso);
    if (p.year === view.year && p.monthIndex === view.monthIndex) return;
    const forward = p.year * 12 + p.monthIndex > view.year * 12 + view.monthIndex;
    setSlide(forward ? 'next' : 'prev');
    setView({ year: p.year, monthIndex: p.monthIndex });
  }

  function openPicker() {
    if (disabled) return;
    const start = clampIso(hasValue ? value : today, min, max);
    setFocusIso(start);
    const p = partsOf(start);
    setView({ year: p.year, monthIndex: p.monthIndex });
    setSlide('none');
    focusGridNext.current = true;
    setOpen(true);
  }

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) fieldRef.current?.focus();
  }, []);

  function choose(iso: string) {
    onChange(iso);
    close(true);
  }

  /* Move the real keyboard focus to the focusable day once it is rendered. */
  useLayoutEffect(() => {
    if (!open || !focusGridNext.current) return;
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`button[data-iso="${focusIso}"]`);
    if (button) {
      button.focus({ preventScroll: true });
      focusGridNext.current = false;
    }
  }, [open, focusIso, view]);

  /* Click or tap anywhere outside closes it, without stealing focus back. */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) close(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  function onGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    if (!(CALENDAR_KEYS as readonly string[]).includes(event.key)) return;
    event.preventDefault();
    const next = moveFocus(focusIso, event.key as CalendarKey, { shift: event.shiftKey, min, max });
    focusGridNext.current = true;
    setFocusIso(next);
    showMonthOf(next);
  }

  function onPopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  function page(delta: number) {
    const target = new Date(Date.UTC(view.year, view.monthIndex + delta, 1));
    const y = target.getUTCFullYear();
    const m = target.getUTCMonth();
    setSlide(delta > 0 ? 'next' : 'prev');
    setView({ year: y, monthIndex: m });
    /* Keep the roving focus inside the month on screen, on the same day
       number where possible, so Tab into the grid lands somewhere sensible. */
    const day = Math.min(partsOf(focusIso).day, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
    const iso = clampIso(new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10), min, max);
    setFocusIso(iso);
  }

  const weeks = useMemo(() => monthGrid(view.year, view.monthIndex), [view]);
  const shortNames = useMemo(() => weekdayNames(calLocale, 'short'), [calLocale]);
  const longNames = useMemo(() => weekdayNames(calLocale, 'long'), [calLocale]);
  const canPrev = hasSelectableBefore(view.year, view.monthIndex, min);
  const canNext = hasSelectableAfter(view.year, view.monthIndex, max);

  const countdown = hasValue && showCountdown ? daysFromTo(today, value) : null;

  return (
    <div className={`dp${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        ref={fieldRef}
        className={`dp-field${hasValue ? ' has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <span className="dp-field-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
            <rect x="3" y="4.5" width="14" height="12.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="dp-field-text">
          <span className="dp-field-value">{hasValue ? formatLongDate(value, calLocale) : placeholder}</span>
          {countdown !== null && countdown >= 0 && (
            <span className="dp-field-sub">
              {countdown === 0
                ? t('Today')
                : tn(countdown, { one: 'In {n} day', other: 'In {n} days' })}
            </span>
          )}
        </span>
        <span className="dp-field-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <>
          <div className="dp-backdrop" aria-hidden="true" onClick={() => close(true)} />
          <div
            className="dp-popover"
            id={dialogId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            onKeyDown={onPopoverKeyDown}
          >
            <div className="dp-sheet-handle" aria-hidden="true" />
            <div className="dp-head">
              <button
                type="button"
                className="dp-nav"
                onClick={() => page(-1)}
                disabled={!canPrev}
                aria-label={t('Previous month')}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" focusable="false" aria-hidden="true">
                  <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="dp-title" id={titleId} aria-live="polite">
                {monthTitle(view.year, view.monthIndex, calLocale)}
              </p>
              <button
                type="button"
                className="dp-nav"
                onClick={() => page(1)}
                disabled={!canNext}
                aria-label={t('Next month')}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" focusable="false" aria-hidden="true">
                  <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <table
              className={`dp-grid is-slide-${slide}`}
              role="grid"
              aria-labelledby={titleId}
              ref={gridRef}
              onKeyDown={onGridKeyDown}
              key={`${view.year}-${view.monthIndex}`}
            >
              <thead>
                <tr>
                  {shortNames.map((name, index) => (
                    <th key={name} scope="col" abbr={longNames[index]}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, row) => (
                  <tr key={row}>
                    {week.map((iso, col) => {
                      if (!iso) return <td key={col} className="dp-empty" role="gridcell" />;
                      const outOfRange = Boolean((min && iso < min) || (max && iso > max));
                      const selected = hasValue && iso === value;
                      const isToday = iso === today;
                      const classes = [
                        'dp-day',
                        selected ? 'is-selected' : '',
                        isToday ? 'is-today' : '',
                        outOfRange ? 'is-disabled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <td key={col} role="gridcell" aria-selected={selected}>
                          <button
                            type="button"
                            className={classes}
                            data-iso={iso}
                            tabIndex={iso === focusIso ? 0 : -1}
                            disabled={outOfRange}
                            aria-current={isToday ? 'date' : undefined}
                            aria-label={formatLongDate(iso, calLocale)}
                            onClick={() => choose(iso)}
                            onFocus={() => setFocusIso(iso)}
                          >
                            {partsOf(iso).day}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="dp-foot">
              <button
                type="button"
                className="dp-foot-button"
                disabled={Boolean((min && today < min) || (max && today > max))}
                onClick={() => {
                  focusGridNext.current = true;
                  setFocusIso(today);
                  showMonthOf(today);
                }}
              >
                {t('Go to today')}
              </button>
              <button type="button" className="dp-foot-button" onClick={() => close(true)}>
                {t('Close')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

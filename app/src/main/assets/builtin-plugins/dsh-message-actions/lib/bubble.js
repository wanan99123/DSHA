/**
 * Long-press actions on a user message bubble: copy, roll back to this
 * message, and edit-and-resend.
 *
 * The host exposes no message-level slot (its SlotMap stops at the composer
 * and the header), so the gesture layer is DOM-level. The MUTATIONS are not:
 * both rollback and edit-resend are built on the host's own
 * `sessions.fork({ sessionId, atSeq })`, which cuts an exact inclusive prefix
 * boundary and balances a mid-turn cut Host-side with synthetic closers.
 * Nothing here writes the session log directly.
 *
 * The source session is NEVER deleted, so a rollback can always be undone by
 * switching back to it in the drawer.
 */

/** Arm the whole effect only on touch-primary devices. */
export const TOUCH_QUERY = '(pointer: coarse)';
/** Long enough to read as deliberate, short enough to feel like a menu. */
export const LONG_PRESS_MS = 500;
/** Finger travel that cancels a long press. */
export const LONG_PRESS_MOVE_PX = 10;
/** The press's own synthesized click is swallowed in this window, so the lift
 *  neither selects text nor scrolls the transcript. */
export const LONG_PRESS_CLICK_SWALLOW_MS = 800;
/** A held menu closes itself this long after the finger lift. */
export const MENU_AUTO_CLOSE_MS = 8000;
/** The user-message stack: the host renders user turns into `_userStack`. */
export const USER_STACK_SELECTOR = '[data-phase] [class*="_userStack"]';
/** The bubble inside that stack; long press targets the text, not the row. */
export const USER_BUBBLE_SELECTOR = USER_STACK_SELECTOR + ' [class*="_bubble"]';
/** Marker attribute: the effect owns every node carrying it, so a reload can
 *  sweep them without touching host markup. */
export const MENU_MARKER = 'data-dsh-msg-actions';

/** Escape text destined for markup. Every string that can carry user content
 *  (a message body) goes through this. */
export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Plain text of a bubble, with the host's own hidden-affordance nodes removed so
 *  a copy never captures an action label or a visuallyHidden span. */
export function bubbleTextOf(bubble) {
    const clone = bubble.cloneNode(true);
    const noise = clone.querySelectorAll(
        '[aria-hidden="true"], [class*="_visuallyHidden"], button, [role="button"]',
    );
    for (const node of noise) node.remove();
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Resolve the user-message bubble under a point, or null. Walks up from the
 *  event target so a press on a nested <p>/<code> still finds it. */
export function bubbleAt(target) {
    if (target === null || typeof target !== 'object') return null;
    if (typeof target.closest !== 'function') return null;
    return target.closest(USER_BUBBLE_SELECTOR);
}

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

/**
 * jsdom implements no pointer-capture API at all (`hasPointerCapture`/
 * `setPointerCapture`/`releasePointerCapture` are simply undefined on
 * every Element). Radix's dismissable-layer/focus-scope machinery
 * (Dialog, Sheet, AlertDialog, DropdownMenu — everything with an
 * overlay) calls into these during pointer interaction handling and
 * effect cleanup. Calling `undefined()` throws, and a throw inside an
 * unmount effect's cleanup can abort the rest of that cleanup function —
 * which is exactly how one test's overlay can leave a stale
 * document-level listener behind and silently break the *next* test's
 * otherwise-unrelated Radix component from opening at all. Polyfilling
 * these as no-ops (the standard fix for Radix + jsdom test suites) is
 * what actually closes the gap; the body-style reset below is cheap
 * insurance for the same family of issue, not the real fix on its own.
 */
/**
 * jsdom implements no ResizeObserver at all. Radix's Checkbox (used from
 * Phase 7 onward, for the expense-split participant rows) reads the
 * indicator's size via `@radix-ui/react-use-size`, which calls
 * `new ResizeObserver(...)` unconditionally in a layout effect — with no
 * polyfill, mounting any Checkbox throws `ResizeObserver is not
 * defined` before the component ever renders. A minimal no-op stub is
 * the standard fix; nothing in this suite asserts on actual resize
 * notifications.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}

/**
 * Radix primitives (Dialog/Sheet/AlertDialog/DropdownMenu) apply a
 * body-level scroll lock (`style="pointer-events: none"`,
 * `data-scroll-locked`) while any overlay is open. If a test finishes
 * with an overlay still open, RTL's automatic per-test unmount doesn't
 * always revert that lock in time for the next test's render — the next
 * test's real button clicks then silently fail testing-library's
 * pointer-events reachability check against a body still marked
 * unclickable from the *previous* test. Reset it explicitly so every
 * test starts from a genuinely clean <body>, regardless of whether the
 * previous test closed its own dialogs.
 */
afterEach(() => {
  document.body.removeAttribute('style')
  document.body.removeAttribute('data-scroll-locked')
})

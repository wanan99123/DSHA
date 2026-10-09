/**
 * Resolve action-menu text.
 *
 * The host registers dictionaries through `ctx.locale.register(ns, ...)`, but
 * the accessor shape is version dependent, so every candidate is probed and a
 * miss falls back to our own table. A missing key is a normal boot-order
 * condition, never an error.
 */
import { zh, en, NS } from './i18n.js';

const TABLES = { zh, en };

/** Best-effort language choice, defaulting to Chinese. Guards on document so
 *  the module stays importable outside a browser (unit tests, SSR probes). */
function documentLanguage() {
    const doc = typeof document === 'undefined' ? undefined : document;
    const tag = String(doc?.documentElement?.lang ?? '').toLowerCase();
    return tag.startsWith('en') || tag.startsWith('zh-hant') ? 'en' : 'zh';
}

export function makeTranslator(locale) {
    const lang = documentLanguage();
    return function t(key, vars) {
        // Probe the host dictionary in both plausible shapes: a callable
        // getter (newer dsh-client-locale) and a plain object. Neither assumed.
        let out;
        const dict = locale?.get?.(NS) ?? locale?.[NS];
        if (typeof dict === 'function') {
            try {
                out = dict(key, vars);
            } catch {
                out = undefined;
            }
        } else if (dict !== null && typeof dict === 'object') {
            out = dict[key] ?? dict[lang]?.[key];
        }
        if (typeof out !== 'string' || out === '')
            out = TABLES[lang]?.[key] ?? TABLES.zh[key] ?? key;
        return String(out).replace(/\{(\w+)\}/g, (m, name) => String(vars?.[name] ?? m));
    };
}

export { NS };

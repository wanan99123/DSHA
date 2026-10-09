/**
 * Browser half: arm the long-press gesture on touch devices.
 *
 * Registered as the package `client` entry, so the loader hands us the client
 * root context with every declared inject service bound.
 */
import { TOUCH_QUERY } from './bubble.js';
import { CSS } from './styles.js';
import { installMessageActions } from './actions.js';
import { makeTranslator } from './translator.js';
import { zh, en, NS } from './i18n.js';

/** Required client services. `uiConversation` reads the assembled message
 *  nodes (the seq boundary); `sessions` forks; `conversation` re-sends;
 *  `locale` translates. */
export const inject = ['sessions', 'uiConversation', 'conversation', 'locale'];

export function apply(ctx) {
    ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-message-actions: dictionaries',
    );

    ctx.effect(() => {
        // Sweep a previous hot-reload's nodes before re-arming, mirroring the
        // mobile plugin's own style-tag hygiene.
        for (const stale of document.querySelectorAll('[data-dsh-msg-actions]'))
            stale.remove();

        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-message-actions';
        tag.dataset.pluginCss = 'dsh-message-actions/menu.css';
        tag.textContent = CSS;
        document.head.appendChild(tag);
        setTimeout(() => {
            if (tag.isConnected) document.head.appendChild(tag);
        }, 0);
        return () => tag.remove();
    }, 'dsh-message-actions: styles');

    ctx.effect(() => {
        const mq = window.matchMedia(TOUCH_QUERY);
        let cleanup;
        const arm = () => {
            cleanup?.();
            cleanup = mq.matches ? installMessageActions(ctx, makeTranslator(ctx.locale)) : undefined;
        };
        arm();
        mq.addEventListener('change', arm);
        return () => {
            mq.removeEventListener('change', arm);
            cleanup?.();
        };
    }, 'dsh-message-actions: long-press gesture');
}

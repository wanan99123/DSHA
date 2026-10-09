/**
 * The gesture, the action menu, and the two fork-backed mutations.
 *
 * Design notes that matter:
 *  - Capture-phase listeners, because the host (and the third-party mobile
 *    shim) attaches its own pointer handlers that would otherwise win.
 *  - One armed press at a time; the timer is cleared on move, up, and cancel.
 *  - The rollback boundary is the LAST event seq strictly before the pressed
 *    message. fork() treats atSeq as an inclusive prefix cut, so passing the
 *    message's own seq would KEEP the message instead of dropping it.
 */
import {
    LONG_PRESS_MS,
    LONG_PRESS_MOVE_PX,
    LONG_PRESS_CLICK_SWALLOW_MS,
    MENU_AUTO_CLOSE_MS,
    USER_BUBBLE_SELECTOR,
    MENU_MARKER,
    bubbleAt,
    bubbleTextOf,
    escapeHtml,
} from './bubble.js';

/** Best-effort current-session read across host shapes (rc.2 `current`, later a
 *  retained selection). Returns undefined rather than guessing. */
export function currentSessionId(ctx) {
    const list = ctx.sessions?.list?.getSnapshot?.();
    if (list === undefined || list === null) return undefined;
    if (typeof list.current === 'string' && list.current !== '')
        return list.current;
    const arr = Array.isArray(list) ? list : Array.isArray(list.items) ? list.items : undefined;
    if (arr === undefined) return undefined;
    const picked = arr.find((s) => s?.current === true || s?.selected === true);
    return picked?.sessionId;
}

/** Finalized user-message nodes of the scoped session, newest-last. */
function userNodes(ctx) {
    const id = currentSessionId(ctx);
    if (id === undefined) return undefined;
    const binding = ctx.uiConversation?.binding?.(id);
    if (binding === undefined) return undefined;
    // The target name is NOT a documented constant: the host ships
    // ConversationViewSnapshotMap as an empty merge-extensible interface and
    // each UI package registers its own target. Discover it from the registry
    // instead of hardcoding a guess, and try every registered target until one
    // yields user nodes. Snapshots are read through the public
    // ConversationViewSnapshotStore.get().
    const targets = ctx.uiConversation?.views?.entries?.() ?? [];
    for (const definition of targets) {
        const name = definition?.key ?? definition?.name ?? definition?.target;
        if (typeof name !== 'string') continue;
        const view = binding.snapshot?.getSnapshot?.()?.views?.get?.(name);
        const nodes = Array.isArray(view) ? view : view?.nodes;
        if (!Array.isArray(nodes)) continue;
        const users = nodes.filter((n) => n?.kind === 'user');
        if (users.length > 0) return users;
    }
    return undefined;
}

/**
 * The seq boundary for rolling back to `bubble`, or undefined when it cannot
 * be resolved with confidence.
 *
 * The host does not stamp the seq onto the DOM, so it is read from the
 * assembly: the nth user message node, matched against the bubble's position
 * among the rendered user stacks. A count mismatch (virtualized transcript)
 * refuses rather than cutting at a wrong boundary.
 *
 * The boundary is the last seq STRICTLY BEFORE the pressed message: fork
 * treats atSeq as an INCLUSIVE cut (the host rejects any boundary whose
 * event seq does not equal the boundary), so passing the pressed message's
 * own seq would keep it. A first-message
 * rollback has no such boundary and is refused rather than guessed.
 */
export function rollbackSeqOf(ctx, bubble) {
    const stacks = [...document.querySelectorAll(USER_BUBBLE_SELECTOR)];
    const index = stacks.indexOf(bubble);
    if (index < 0) return undefined;
    const nodes = userNodes(ctx);
    if (nodes === undefined || nodes.length === 0 || index >= nodes.length) return undefined;
    const seq = nodes[index]?.seq;
    if (typeof seq !== 'number' || seq <= 0) return undefined;
    return seq - 1;
}

export function installMessageActions(ctx, t) {
    let press = null;
    let menu = null;
    let dialog = null;
    let closeTimer = 0;
    let swallowUntil = 0;

    const clearPress = () => {
        if (press !== null) {
            clearTimeout(press.timer);
            press = null;
        }
    };
    const closeMenu = () => {
        clearTimeout(closeTimer);
        menu?.remove();
        menu = null;
    };
    const closeDialog = () => {
        if (dialog !== null) {
            document.removeEventListener('keydown', dialog.onKey, true);
            dialog.backdrop.remove();
            dialog = null;
        }
    };
    /** Backdrop tap closes; a card tap must not (the async fork confirm lands
     *  inside the card and the same bubbling click would dismiss it). */
    const onBackdropClick = (event) => {
        if (event.target === event.currentTarget) closeDialog();
    };
    const openDialog = (build) => {
        closeDialog();
        const backdrop = document.createElement('div');
        backdrop.dataset.dshMsgActions = 'backdrop';
        const card = document.createElement('div');
        card.dataset.dshMsgActions = 'card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.appendChild(build(closeDialog));
        backdrop.appendChild(card);
        backdrop.addEventListener('click', onBackdropClick);
        const onKey = (event) => {
            if (event.key === 'Escape') closeDialog();
        };
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(backdrop);
        dialog = { backdrop, onKey };
    };

    const runFork = async (bubble, mode, editedText) => {
        const sessionId = currentSessionId(ctx);
        if (sessionId === undefined) throw new Error('no current session');
        const atSeq = rollbackSeqOf(ctx, bubble);
        if (atSeq === undefined) throw new Error('cannot resolve rollback boundary');
        const childId = await ctx.sessions.fork({ sessionId, atSeq, increaseTitle: true });
        // Open the child BEFORE sending: conversation.send is scope-addressed
        // through the retained binding, and a fresh fork is not the selection yet.
        ctx.sessions.open(childId);
        if (mode === 'edit') await ctx.conversation.send(editedText);
    };

    const confirmFork = (bubble, mode, editedText) => {
        const isEdit = mode === 'edit';
        openDialog((close) => {
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.gap = '12px';
            const title = document.createElement('div');
            title.dataset.dshMsgActions = 'title';
            title.textContent = isEdit ? t('confirmEdit') : t('confirmRollback');
            const desc = document.createElement('div');
            desc.dataset.dshMsgActions = 'desc';
            desc.textContent = isEdit ? t('confirmEditDesc') : t('confirmRollbackDesc');
            const error = document.createElement('div');
            error.dataset.dshMsgActions = 'error';
            error.setAttribute('role', 'alert');
            error.hidden = true;
            wrap.append(title, desc, error);
            let box = null;
            if (isEdit) {
                box = document.createElement('textarea');
                box.dataset.dshMsgActions = 'edit';
                box.value = editedText ?? '';
                wrap.appendChild(box);
            }
            const actions = document.createElement('div');
            actions.dataset.dshMsgActions = 'actions';
            const no = document.createElement('button');
            no.type = 'button';
            no.dataset.dshMsgActions = 'btn';
            no.textContent = t('cancel');
            const yes = document.createElement('button');
            yes.type = 'button';
            yes.dataset.dshMsgActions = 'btn btn-primary';
            yes.textContent = isEdit ? t('send') : t('confirm');
            no.addEventListener('click', close);
            yes.addEventListener('click', () => {
                const text = isEdit ? box.value.trim() : undefined;
                if (isEdit && text === '') return;
                yes.disabled = true;
                no.disabled = true;
                error.hidden = false;
                error.textContent = t('working');
                const live = dialog;
                runFork(bubble, mode, text).then(
                    () => {
                        if (dialog === live) closeDialog();
                        closeMenu();
                    },
                    (err) => {
                        yes.disabled = false;
                        no.disabled = false;
                        error.textContent = t('failed') + ': ' + String(err?.message ?? err);
                    },
                );
            });
            actions.append(no, yes);
            wrap.appendChild(actions);
            return wrap;
        });
    };

    const openMenu = (bubble, x, y) => {
        closeMenu();
        const body = bubbleTextOf(bubble) || t('emptyMessage');
        const node = document.createElement('div');
        node.dataset.dshMsgActions = 'menu';
        node.setAttribute('role', 'menu');
        const item = (label, hint, danger, onPick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.dshMsgActions = 'item';
            btn.setAttribute('role', 'menuitem');
            const head = document.createElement('span');
            head.dataset.dshMsgActions = 'label';
            head.textContent = label;
            btn.appendChild(head);
            if (hint !== undefined) {
                const small = document.createElement('span');
                small.dataset.dshMsgActions = 'hint';
                small.textContent = hint;
                btn.appendChild(small);
            }
            if (danger === true) btn.classList.add('danger');
            btn.addEventListener('click', () => {
                closeMenu();
                onPick();
            });
            return btn;
        };
        node.append(
            item(t('copy'), undefined, false, () => {
                void navigator.clipboard?.writeText(body);
            }),
            item(t('rollback'), t('rollbackHint'), true, () => {
                confirmFork(bubble, 'rollback', undefined);
            }),
            item(t('editResend'), t('editHint'), false, () => {
                confirmFork(bubble, 'edit', body);
            }),
        );
        document.body.appendChild(node);
        // Clamp inside the viewport after measuring: the press point can sit
        // under the system navigation bar.
        const rect = node.getBoundingClientRect();
        node.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + 'px';
        node.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + 'px';
        menu = node;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closeMenu, MENU_AUTO_CLOSE_MS);
    };

    const onDown = (event) => {
        if (event.pointerType === 'mouse') return;
        const bubble = bubbleAt(event.target);
        if (bubble === null) {
            clearPress();
            return;
        }
        clearPress();
        press = {
            bubble,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            timer: setTimeout(() => {
                const armed = press;
                press = null;
                if (armed === null) return;
                swallowUntil = Date.now() + LONG_PRESS_CLICK_SWALLOW_MS;
                openMenu(armed.bubble, armed.x, armed.y);
            }, LONG_PRESS_MS),
        };
    };

    const onMove = (event) => {
        if (press === null || event.pointerId !== press.pointerId) return;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_MOVE_PX)
            clearPress();
    };
    const onUp = () => clearPress();
    const onCancel = () => clearPress();

    /** Swallow the synthesized click right after a fired long press, so the
     *  lift does not also start a text selection. */
    const onClick = (event) => {
        if (Date.now() < swallowUntil && bubbleAt(event.target) !== null) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    const listeners = [
        ['pointerdown', onDown],
        ['pointermove', onMove],
        ['pointerup', onUp],
        ['pointercancel', onCancel],
        ['click', onClick],
    ];
    for (const [type, fn] of listeners) document.addEventListener(type, fn, true);

    return () => {
        clearPress();
        clearTimeout(closeTimer);
        closeMenu();
        closeDialog();
        for (const [type, fn] of listeners) document.removeEventListener(type, fn, true);
        for (const stale of document.querySelectorAll('[' + MENU_MARKER + ']')) stale.remove();
    };
}

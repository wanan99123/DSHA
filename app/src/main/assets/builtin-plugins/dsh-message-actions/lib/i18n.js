/** Message-action dictionaries. Registered under their own namespace so they
 *  never collide with the mobile plugin table. */
export const NS = 'messageActions';

export const zh = {
    menuTitle: '消息操作',
    copy: '复制',
    copyDone: '已复制',
    rollback: '回滚到此',
    rollbackHint: '将截断这条消息之后的内容，并在新会话中继续',
    editResend: '编辑并重发',
    editHint: '保留之前的对话，在新会话中重新发送这条消息',
    confirmRollback: '回滚到这条消息？',
    confirmRollbackDesc: '将在这条消息之前创建一个新会话，保留之前的全部内容。原会话不会被删除。',
    confirmEdit: '编辑并重发？',
    confirmEditDesc: '将在这条消息之前创建一个新会话，然后发送你编辑后的内容。原会话不会被删除。',
    cancel: '取消',
    confirm: '确定',
    working: '处理中…',
    failed: '操作失败',
    emptyMessage: '（空消息）',
    editTitle: '编辑消息',
    send: '发送',
};

export const en = {
    menuTitle: 'Message actions',
    copy: 'Copy',
    copyDone: 'Copied',
    rollback: 'Roll back to here',
    rollbackHint: 'Cut everything after this message and continue in a new session',
    editResend: 'Edit and resend',
    editHint: 'Keep the earlier conversation in a new session, then send your edited text',
    confirmRollback: 'Roll back to this message?',
    confirmRollbackDesc: 'A new session is created before this message, keeping everything before it. The original session is not deleted.',
    confirmEdit: 'Edit and resend?',
    confirmEditDesc: 'A new session is created before this message, then your edited text is sent. The original session is not deleted.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    working: 'Working…',
    failed: 'Action failed',
    emptyMessage: '(empty message)',
    editTitle: 'Edit message',
    send: 'Send',
};

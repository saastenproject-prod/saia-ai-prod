(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    widgetKey: 'customer-support-bot_1778926840052_widget',
    title: 'Sadayana Support',
    subtitle: 'Online',
    greetingMessage: 'Hi! Welcome to support. How can we help?',
    primaryColor: '#2563eb',
    customerName: 'Website Visitor',
    customerEmail: 'visitor@example.com',
  };

  const SUPABASE_FUNCTION_BASE_URL =
    'https://eqxbozcazttqhnzhkqow.supabase.co/functions/v1';

  const WIDGET_CONFIG_URL = `${SUPABASE_FUNCTION_BASE_URL}/widget-config`;
  const WIDGET_MESSAGE_URL = `${SUPABASE_FUNCTION_BASE_URL}/widget-message`;
  const WIDGET_FETCH_MESSAGES_URL = `${SUPABASE_FUNCTION_BASE_URL}/widget-fetch-messages`;

  const scriptTag =
    document.currentScript ||
    document.querySelector('script[data-nexora-widget-key]') ||
    document.querySelector("script[src*='widget.js']");

  const scriptConfig = {
    widgetKey:
      scriptTag?.getAttribute('data-widget-key') ||
      scriptTag?.getAttribute('data-nexora-widget-key') ||
      window.NEXORA_WIDGET_KEY ||
      DEFAULT_CONFIG.widgetKey,
    customerName:
      scriptTag?.getAttribute('data-customer-name') ||
      window.NEXORA_CUSTOMER_NAME ||
      DEFAULT_CONFIG.customerName,
    customerEmail:
      scriptTag?.getAttribute('data-customer-email') ||
      window.NEXORA_CUSTOMER_EMAIL ||
      DEFAULT_CONFIG.customerEmail,
  };

  const STORAGE_PREFIX = `nexora_widget_${scriptConfig.widgetKey}`;
  const CONVERSATION_STORAGE_KEY = `${STORAGE_PREFIX}_conversation_id`;
  const OPEN_STORAGE_KEY = `${STORAGE_PREFIX}_is_open`;

  const state = {
    config: {
      ...DEFAULT_CONFIG,
      ...scriptConfig,
    },
    conversationId: localStorage.getItem(CONVERSATION_STORAGE_KEY) || '',
    isOpen: localStorage.getItem(OPEN_STORAGE_KEY) === 'true',
    isSending: false,
    isPolling: false,
    unreadCount: 0,
    lastRenderedMessageIds: new Set(),
    renderedMessageSignatures: [],
    pollingTimer: null,
  };

  let root = null;
  let panel = null;
  let bubble = null;
  let badge = null;
  let header = null;
  let messagesContainer = null;
  let input = null;
  let sendButton = null;
  let resetButton = null;
  let typingMessageEl = null;

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const normalizeMessageContent = (value) => {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  };

  const getMessageTimestampMs = (message) => {
    const timestamp =
      message?.sent_at ||
      message?.created_at ||
      message?.timestamp ||
      message?.updated_at;

    if (!timestamp) return 0;

    const parsed = new Date(timestamp).getTime();

    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getNormalizedSender = (message) => {
    const senderType =
      message?.sender_type || message?.senderType || message?.role || 'bot';

    if (senderType === 'customer' || senderType === 'user') return 'customer';
    if (senderType === 'agent') return 'agent';
    if (senderType === 'system') return 'system';

    return 'bot';
  };

  const isDuplicateMessage = (message) => {
    const normalizedSender = getNormalizedSender(message);

    const content = normalizeMessageContent(
      message?.content || message?.message || message?.text || '',
    );

    if (!content) return false;

    const currentTime = getMessageTimestampMs(message);

    for (const existing of state.renderedMessageSignatures) {
      if (existing.sender !== normalizedSender) continue;
      if (existing.content !== content) continue;

      if (!currentTime || !existing.time) {
        return true;
      }

      const diffMs = Math.abs(currentTime - existing.time);

      if (diffMs <= 15000) {
        return true;
      }
    }

    return false;
  };

  const rememberMessageSignature = (message) => {
    const normalizedSender = getNormalizedSender(message);

    const content = normalizeMessageContent(
      message?.content || message?.message || message?.text || '',
    );

    if (!content) return;

    state.renderedMessageSignatures.push({
      sender: normalizedSender,
      content,
      time: getMessageTimestampMs(message) || Date.now(),
    });

    if (state.renderedMessageSignatures.length > 80) {
      state.renderedMessageSignatures =
        state.renderedMessageSignatures.slice(-80);
    }
  };

  const normalizeColor = (value) => {
    const color = String(value || '').trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) return color;

    return DEFAULT_CONFIG.primaryColor;
  };

  const getContrastTextColor = (hexColor) => {
    const clean = normalizeColor(hexColor).replace('#', '');

    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((char) => char + char)
            .join('')
        : clean;

    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.65 ? '#0f172a' : '#ffffff';
  };

  const getPrimaryColor = () => {
    return normalizeColor(state.config.primaryColor);
  };

  const getPrimaryTextColor = () => {
    return getContrastTextColor(getPrimaryColor());
  };

  const scrollToBottom = () => {
    if (!messagesContainer) return;

    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  };

  const injectStyles = () => {
    if (document.getElementById('nexora-widget-style')) return;

    const style = document.createElement('style');
    style.id = 'nexora-widget-style';

    style.textContent = `
      #nexora-widget-root {
        position: fixed;
        right: 28px;
        bottom: 28px;
        z-index: 2147483647;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .nexora-widget-panel {
        width: 390px;
        height: 620px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 110px);
        background: #ffffff;
        border-radius: 26px;
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
        overflow: hidden;
        display: none;
        flex-direction: column;
        border: 1px solid rgba(226, 232, 240, 0.9);
        margin-bottom: 18px;
        transform-origin: bottom right;
      }

      .nexora-widget-panel.nexora-open {
        display: flex;
        animation: nexoraPanelIn 0.18s ease-out;
      }

      @keyframes nexoraPanelIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .nexora-widget-header {
        min-height: 78px;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 13px;
        color: var(--nexora-header-text, #ffffff);
        background: var(--nexora-primary, #2563eb);
      }

      .nexora-widget-avatar {
        width: 44px;
        height: 44px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.18);
        color: var(--nexora-header-text, #ffffff);
        font-size: 18px;
        font-weight: 900;
        flex: 0 0 auto;
      }

      .nexora-widget-title-wrap {
        min-width: 0;
        flex: 1;
      }

      .nexora-widget-title {
        font-size: 15px;
        font-weight: 900;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .nexora-widget-subtitle {
        margin-top: 3px;
        font-size: 12px;
        font-weight: 700;
        opacity: 0.92;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .nexora-widget-reset {
        border: 0;
        outline: 0;
        cursor: pointer;
        color: var(--nexora-header-text, #ffffff);
        background: rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        padding: 9px 13px;
        font-weight: 900;
        font-size: 12px;
        white-space: nowrap;
      }

      .nexora-widget-reset:hover {
        background: rgba(255, 255, 255, 0.26);
      }

      .nexora-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px 16px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .nexora-widget-messages::-webkit-scrollbar {
        width: 8px;
      }

      .nexora-widget-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 999px;
      }

      .nexora-message-row {
        display: flex;
        width: 100%;
      }

      .nexora-message-row.nexora-message-customer {
        justify-content: flex-end;
      }

      .nexora-message-row.nexora-message-bot,
      .nexora-message-row.nexora-message-agent,
      .nexora-message-row.nexora-message-system {
        justify-content: flex-start;
      }

      .nexora-message-bubble {
        max-width: 82%;
        border-radius: 20px;
        padding: 12px 14px;
        font-size: 14px;
        line-height: 1.55;
        word-break: break-word;
        white-space: pre-wrap;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      }

      .nexora-message-customer .nexora-message-bubble {
        background: var(--nexora-primary, #2563eb);
        color: var(--nexora-header-text, #ffffff);
        border-bottom-right-radius: 8px;
      }

      .nexora-message-bot .nexora-message-bubble,
      .nexora-message-agent .nexora-message-bubble,
      .nexora-message-system .nexora-message-bubble {
        background: #eef2f7;
        color: #334155;
        border-bottom-left-radius: 8px;
      }

      .nexora-message-meta {
        margin-top: 6px;
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
        opacity: 0.58;
      }

      .nexora-widget-footer {
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        padding: 14px 13px;
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .nexora-widget-input {
        flex: 1;
        min-width: 0;
        height: 44px;
        border-radius: 16px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        outline: none;
        padding: 0 14px;
        font-size: 14px;
      }

      .nexora-widget-input:focus {
        border-color: var(--nexora-primary, #2563eb);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }

      .nexora-widget-input:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        background: #f8fafc;
      }

      .nexora-widget-send {
        height: 44px;
        min-width: 72px;
        border: 0;
        outline: 0;
        border-radius: 16px;
        background: var(--nexora-primary, #2563eb);
        color: var(--nexora-header-text, #ffffff);
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }

      .nexora-widget-send:hover {
        filter: brightness(0.96);
      }

      .nexora-widget-send:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .nexora-widget-bubble {
        position: relative;
        margin-left: auto;
        width: 66px;
        height: 66px;
        border: 0;
        outline: 0;
        border-radius: 24px;
        background: var(--nexora-primary, #2563eb);
        color: var(--nexora-header-text, #ffffff);
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
        cursor: pointer;
        display: grid;
        place-items: center;
      }

      .nexora-widget-bubble:hover {
        filter: brightness(0.96);
        transform: translateY(-1px);
      }

      .nexora-widget-bubble svg {
        width: 30px;
        height: 30px;
      }

      .nexora-widget-badge {
        position: absolute;
        top: -7px;
        right: -7px;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: #ef4444;
        color: white;
        font-size: 12px;
        line-height: 22px;
        text-align: center;
        font-weight: 900;
        border: 2px solid #ffffff;
        display: none;
      }

      .nexora-widget-badge.nexora-show {
        display: block;
      }

      .nexora-typing-bubble {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-width: 52px;
        padding: 12px 14px;
      }

      .nexora-typing-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #94a3b8;
        display: inline-block;
        animation: nexoraTypingBlink 1.2s infinite ease-in-out;
      }

      .nexora-typing-dot:nth-child(2) {
        animation-delay: 0.15s;
      }

      .nexora-typing-dot:nth-child(3) {
        animation-delay: 0.3s;
      }

      @keyframes nexoraTypingBlink {
        0%, 80%, 100% {
          opacity: 0.35;
          transform: translateY(0);
        }

        40% {
          opacity: 1;
          transform: translateY(-3px);
        }
      }

      .nexora-widget-loading {
        padding: 13px 14px;
        border-radius: 18px;
        background: #eef2f7;
        color: #475569;
        font-size: 13px;
        line-height: 1.5;
        width: fit-content;
        max-width: 82%;
      }

      @media (max-width: 520px) {
        #nexora-widget-root {
          right: 16px;
          bottom: 16px;
        }

        .nexora-widget-panel {
          width: calc(100vw - 32px);
          height: calc(100vh - 104px);
          max-height: calc(100vh - 104px);
          border-radius: 24px;
        }

        .nexora-widget-bubble {
          width: 60px;
          height: 60px;
          border-radius: 22px;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const applyTheme = () => {
    const primary = getPrimaryColor();
    const textColor = getPrimaryTextColor();

    if (!root) return;

    root.style.setProperty('--nexora-primary', primary);
    root.style.setProperty('--nexora-header-text', textColor);
  };

  const updateHeader = () => {
    if (!header) return;

    const title = state.config.title || DEFAULT_CONFIG.title;
    const subtitle = state.config.subtitle || DEFAULT_CONFIG.subtitle;
    const avatarText = title.trim().charAt(0).toUpperCase() || 'N';

    header.innerHTML = `
      <div class="nexora-widget-avatar">${escapeHtml(avatarText)}</div>

      <div class="nexora-widget-title-wrap">
        <div class="nexora-widget-title">${escapeHtml(title)}</div>
        <div class="nexora-widget-subtitle">${escapeHtml(subtitle)}</div>
      </div>

      <button type="button" class="nexora-widget-reset">New Chat</button>
    `;

    resetButton = header.querySelector('.nexora-widget-reset');
    resetButton?.addEventListener('click', resetConversation);
  };

  const updateBadge = () => {
    if (!badge) return;

    if (state.unreadCount > 0 && !state.isOpen) {
      badge.textContent = String(
        state.unreadCount > 99 ? '99+' : state.unreadCount,
      );
      badge.classList.add('nexora-show');
    } else {
      badge.classList.remove('nexora-show');
    }
  };

  const showTypingIndicator = () => {
    if (!messagesContainer) return;

    removeTypingIndicator();

    typingMessageEl = document.createElement('div');
    typingMessageEl.className =
      'nexora-message-row nexora-message-bot nexora-typing-message';

    typingMessageEl.innerHTML = `
      <div class="nexora-message-bubble nexora-typing-bubble">
        <span class="nexora-typing-dot"></span>
        <span class="nexora-typing-dot"></span>
        <span class="nexora-typing-dot"></span>
      </div>
    `;

    messagesContainer.appendChild(typingMessageEl);
    scrollToBottom();
  };

  const removeTypingIndicator = () => {
    if (typingMessageEl && typingMessageEl.parentNode) {
      typingMessageEl.parentNode.removeChild(typingMessageEl);
    }

    typingMessageEl = null;
  };

  const renderMessage = (message) => {
    if (!messagesContainer || !message) return;

    const normalizedSender = getNormalizedSender(message);
    const content = message.content || message.message || message.text || '';

    if (!content) return;

    const id =
      message.id ||
      `${normalizedSender}_${normalizeMessageContent(content)}_${
        message.created_at || message.sent_at || Date.now()
      }`;

    if (state.lastRenderedMessageIds.has(id)) return;
    if (isDuplicateMessage(message)) return;

    state.lastRenderedMessageIds.add(id);
    rememberMessageSignature(message);

    const row = document.createElement('div');
    row.className = `nexora-message-row nexora-message-${normalizedSender}`;

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'nexora-message-bubble';
    bubbleEl.innerHTML = escapeHtml(content);

    const timestamp =
      message.sent_at || message.created_at || message.timestamp;
    const senderName = message.sender_name || message.senderName || '';

    if (timestamp || senderName) {
      const metaEl = document.createElement('div');
      metaEl.className = 'nexora-message-meta';

      const dateLabel = timestamp
        ? new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      metaEl.textContent = [senderName, dateLabel].filter(Boolean).join(' · ');
      bubbleEl.appendChild(metaEl);
    }

    row.appendChild(bubbleEl);
    messagesContainer.appendChild(row);
    scrollToBottom();
  };

  const renderMessages = (messages, { replace = false } = {}) => {
    if (!messagesContainer) return;

    removeTypingIndicator();

    if (replace) {
      messagesContainer.innerHTML = '';
      state.lastRenderedMessageIds.clear();
      state.renderedMessageSignatures = [];
    }

    const rows = Array.isArray(messages) ? messages : [];
    rows.forEach(renderMessage);

    scrollToBottom();
  };

  const renderLocalCustomerMessage = (content) => {
    renderMessage({
      id: `local_customer_${Date.now()}_${Math.random()}`,
      sender_type: 'customer',
      sender_name: state.config.customerName || 'Website Visitor',
      message_type: 'text',
      content,
      sent_at: new Date().toISOString(),
    });
  };

  const renderLocalErrorMessage = (content) => {
    renderMessage({
      id: `local_error_${Date.now()}_${Math.random()}`,
      sender_type: 'bot',
      sender_name: state.config.title || 'Nexora Support',
      message_type: 'text',
      content,
      sent_at: new Date().toISOString(),
    });
  };

  const setSendingState = (isSending) => {
    state.isSending = isSending;

    if (input) input.disabled = isSending;
    if (sendButton) sendButton.disabled = isSending;
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(WIDGET_CONFIG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetKey: state.config.widgetKey,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.warn('[Nexora Widget] Config load failed:', result);
        return;
      }

      const config =
        result.config ||
        result.widget ||
        result.widgetSetting ||
        result.data ||
        result;

      state.config = {
        ...state.config,
        title:
          config.title ||
          config.widget_title ||
          config.name ||
          state.config.title,
        subtitle:
          config.subtitle || config.widget_subtitle || state.config.subtitle,
        greetingMessage:
          config.greeting_message ||
          config.greetingMessage ||
          state.config.greetingMessage,
        primaryColor:
          config.primary_color ||
          config.primaryColor ||
          state.config.primaryColor,
      };

      applyTheme();
      updateHeader();
    } catch (error) {
      console.warn('[Nexora Widget] Config request failed:', error);
    }
  };

  const fetchMessages = async ({ silent = true } = {}) => {
    if (!state.conversationId || state.isPolling) return;

    state.isPolling = true;

    try {
      if (!silent && messagesContainer) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'nexora-widget-loading';
        loadingEl.textContent = 'Loading previous conversation...';
        messagesContainer.appendChild(loadingEl);
      }

      const response = await fetch(WIDGET_FETCH_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetKey: state.config.widgetKey,
          conversationId: state.conversationId,
        }),
      });

      const result = await response.json();

      const loadingEl = messagesContainer?.querySelector(
        '.nexora-widget-loading',
      );
      if (loadingEl) loadingEl.remove();

      if (!response.ok || result.error) {
        console.warn('[Nexora Widget] Fetch messages failed:', result);
        return;
      }

      const messages = result.messages || result.data?.messages || [];
      const beforeCount = state.lastRenderedMessageIds.size;

      renderMessages(messages);

      const afterCount = state.lastRenderedMessageIds.size;
      const newCount = Math.max(afterCount - beforeCount, 0);

      if (!state.isOpen && newCount > 0) {
        state.unreadCount += newCount;
        updateBadge();
      }
    } catch (error) {
      console.warn('[Nexora Widget] Fetch messages request failed:', error);
    } finally {
      state.isPolling = false;
    }
  };

  const startPollingMessages = () => {
    stopPollingMessages();

    state.pollingTimer = window.setInterval(() => {
      if (state.conversationId) {
        fetchMessages({ silent: true });
      }
    }, 2500);
  };

  const stopPollingMessages = () => {
    if (state.pollingTimer) {
      window.clearInterval(state.pollingTimer);
      state.pollingTimer = null;
    }
  };

  const sendMessage = async () => {
    if (!input || !sendButton) return;

    const text = input.value.trim();

    if (!text || state.isSending) return;

    input.value = '';
    setSendingState(true);

    renderLocalCustomerMessage(text);
    showTypingIndicator();

    try {
      const response = await fetch(WIDGET_MESSAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetKey: state.config.widgetKey,
          conversationId: state.conversationId || undefined,
          message: text,
          customerName: state.config.customerName || 'Website Visitor',
          customerEmail: state.config.customerEmail || 'visitor@example.com',
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error || result.success === false) {
        throw new Error(result.error || 'Failed to send message.');
      }

      if (result.conversationId) {
        state.conversationId = result.conversationId;
        localStorage.setItem(CONVERSATION_STORAGE_KEY, result.conversationId);
      }

      if (result.aiReplyResult?.answer) {
        renderMessage({
          id:
            result.aiReplyResult?.botMessage?.id ||
            `ai_reply_${Date.now()}_${Math.random()}`,
          sender_type: 'bot',
          sender_name:
            result.aiReplyResult?.botMessage?.sender_name ||
            state.config.title ||
            'Nexora Support',
          content: result.aiReplyResult.answer,
          sent_at:
            result.aiReplyResult?.botMessage?.sent_at ||
            result.aiReplyResult?.botMessage?.created_at ||
            new Date().toISOString(),
        });
      } else if (result.botReply) {
        renderMessage({
          id: `bot_reply_${Date.now()}_${Math.random()}`,
          sender_type: 'bot',
          sender_name: state.config.title || 'Nexora Support',
          content: result.botReply,
          sent_at: new Date().toISOString(),
        });
      } else {
        await fetchMessages({ silent: true });
      }

      startPollingMessages();
    } catch (error) {
      console.error('[Nexora Widget] Send message failed:', error);

      renderLocalErrorMessage(
        'Maaf, pesan Anda belum berhasil diproses. Silakan coba lagi sebentar lagi.',
      );
    } finally {
      removeTypingIndicator();
      setSendingState(false);
      input?.focus();
    }
  };

  const resetConversation = () => {
    state.conversationId = '';
    state.unreadCount = 0;
    state.lastRenderedMessageIds.clear();
    state.renderedMessageSignatures = [];

    localStorage.removeItem(CONVERSATION_STORAGE_KEY);

    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }

    removeTypingIndicator();
    updateBadge();

    const greeting = state.config.greetingMessage;

    if (greeting) {
      renderMessage({
        id: `local_greeting_${Date.now()}_${Math.random()}`,
        sender_type: 'bot',
        sender_name: state.config.title || 'Nexora Support',
        content: greeting,
        sent_at: new Date().toISOString(),
      });
    }

    input?.focus();
  };

  const togglePanel = async () => {
    state.isOpen = !state.isOpen;

    localStorage.setItem(OPEN_STORAGE_KEY, String(state.isOpen));

    if (state.isOpen) {
      panel?.classList.add('nexora-open');
      state.unreadCount = 0;
      updateBadge();

      if (state.conversationId) {
        await fetchMessages({ silent: false });
      } else if (
        messagesContainer &&
        state.lastRenderedMessageIds.size === 0 &&
        state.config.greetingMessage
      ) {
        renderMessage({
          id: `local_greeting_${Date.now()}_${Math.random()}`,
          sender_type: 'bot',
          sender_name: state.config.title || 'Nexora Support',
          content: state.config.greetingMessage,
          sent_at: new Date().toISOString(),
        });
      }

      startPollingMessages();
      input?.focus();
    } else {
      panel?.classList.remove('nexora-open');
      startPollingMessages();
    }
  };

  const createWidgetDom = () => {
    root = document.createElement('div');
    root.id = 'nexora-widget-root';

    root.innerHTML = `
      <div class="nexora-widget-panel">
        <div class="nexora-widget-header"></div>

        <div class="nexora-widget-messages"></div>

        <div class="nexora-widget-footer">
          <input
            class="nexora-widget-input"
            type="text"
            placeholder="Type your message..."
            autocomplete="off"
          />

          <button type="button" class="nexora-widget-send">
            Send
          </button>
        </div>
      </div>

      <button type="button" class="nexora-widget-bubble" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.5 18.2 4 20l.8-3.8A7.7 7.7 0 0 1 3 11.2C3 6.7 7 3 12 3s9 3.7 9 8.2-4 8.2-9 8.2c-1.6 0-3.1-.4-4.5-1.2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>

        <span class="nexora-widget-badge"></span>
      </button>
    `;

    document.body.appendChild(root);

    panel = root.querySelector('.nexora-widget-panel');
    header = root.querySelector('.nexora-widget-header');
    messagesContainer = root.querySelector('.nexora-widget-messages');
    input = root.querySelector('.nexora-widget-input');
    sendButton = root.querySelector('.nexora-widget-send');
    bubble = root.querySelector('.nexora-widget-bubble');
    badge = root.querySelector('.nexora-widget-badge');

    bubble?.addEventListener('click', togglePanel);
    sendButton?.addEventListener('click', sendMessage);

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });

    updateHeader();
    applyTheme();
    updateBadge();

    if (state.isOpen) {
      panel?.classList.add('nexora-open');
    }
  };

  const init = async () => {
    if (document.getElementById('nexora-widget-root')) return;

    injectStyles();
    createWidgetDom();

    await loadConfig();

    if (state.isOpen) {
      if (state.conversationId) {
        await fetchMessages({ silent: false });
      } else if (state.config.greetingMessage) {
        renderMessage({
          id: `local_greeting_${Date.now()}_${Math.random()}`,
          sender_type: 'bot',
          sender_name: state.config.title || 'Nexora Support',
          content: state.config.greetingMessage,
          sent_at: new Date().toISOString(),
        });
      }
    }

    startPollingMessages();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NexoraWidget = {
    open: () => {
      if (!state.isOpen) togglePanel();
    },
    close: () => {
      if (state.isOpen) togglePanel();
    },
    reset: resetConversation,
    refreshMessages: () => fetchMessages({ silent: false }),
    getState: () => ({
      ...state,
      lastRenderedMessageIds: Array.from(state.lastRenderedMessageIds),
    }),
  };
})();

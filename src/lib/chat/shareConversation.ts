import { ChatMessage } from '@/lib/types';

interface ShareTexts {
    shareTitle: string;
    shareUser: string;
    shareAssistant: string;
    shareFooter: string;
}

// Stylesheet is a static literal — interpolation here is impossible by
// construction, so it can stay as a string.
const SHARE_STYLES = `
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
    h1 { font-size: 1.4rem; border-bottom: 2px solid #74ACDF; padding-bottom: 0.5rem; }
    .msg { margin: 1rem 0; padding: 0.75rem; border-radius: 8px; }
    .user { background: #f0f4ff; }
    .assistant { background: #f8f9fa; border-left: 3px solid #74ACDF; }
    .role { font-weight: 700; font-size: 0.85rem; color: #555; margin-bottom: 0.25rem; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 0.5rem; }
`;

/**
 * Build the printable conversation document using DOM APIs instead of
 * `document.write` + string interpolation. Every user-controlled value
 * (LLM-emitted `m.content`, i18n strings in `texts`, the role label)
 * goes through `textContent`, so the browser parses it as text — no
 * HTML, no script tags, no markdown injection. Round v46 H9 fix.
 *
 * The previous implementation only escaped `<` and `>` and used
 * `document.write` to interpolate everything else verbatim, including
 * `texts.shareTitle` and `texts.shareUser/shareAssistant`. A prompt
 * injection into a scraped source description could end up persisted
 * in `m.content` and execute when the user hit Share.
 */
function buildShareDocument(
    doc: Document,
    messages: ChatMessage[],
    texts: ShareTexts,
): void {
    const html = doc.documentElement;
    html.innerHTML = '';

    const head = doc.createElement('head');
    const titleEl = doc.createElement('title');
    titleEl.textContent = texts.shareTitle;
    head.appendChild(titleEl);

    const styleEl = doc.createElement('style');
    styleEl.textContent = SHARE_STYLES;
    head.appendChild(styleEl);
    html.appendChild(head);

    const body = doc.createElement('body');
    const heading = doc.createElement('h1');
    heading.textContent = texts.shareTitle;
    body.appendChild(heading);

    for (const m of messages) {
        const wrapper = doc.createElement('div');
        wrapper.className = `msg ${m.role === 'user' ? 'user' : 'assistant'}`;

        const roleEl = doc.createElement('div');
        roleEl.className = 'role';
        roleEl.textContent =
            m.role === 'user' ? texts.shareUser : texts.shareAssistant;
        wrapper.appendChild(roleEl);

        const contentEl = doc.createElement('div');
        contentEl.className = 'content';
        contentEl.textContent = m.content;
        wrapper.appendChild(contentEl);

        body.appendChild(wrapper);
    }

    const footer = doc.createElement('div');
    footer.className = 'footer';
    footer.textContent = `${texts.shareFooter} — ${new Date().toLocaleDateString('es-AR')}`;
    body.appendChild(footer);

    html.appendChild(body);
}

export async function shareConversation(messages: ChatMessage[], texts: ShareTexts): Promise<void> {
    const text = messages
        .map((m) => `${m.role === 'user' ? texts.shareUser : texts.shareAssistant}: ${m.content}`)
        .join('\n\n');

    if (navigator.share) {
        try {
            await navigator.share({
                title: texts.shareTitle,
                text,
            });
            return;
        } catch {
            // User cancelled or share failed — fall back to print.
        }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    buildShareDocument(printWindow.document, messages, texts);
    printWindow.onload = () => {
        printWindow.print();
    };
}

// Exported for testing only — gives the H9 regression coverage in
// `tests/unit/shareConversation.test.ts` access to the DOM builder
// without requiring `window.open` in a jsdom environment.
export const __test = { buildShareDocument };

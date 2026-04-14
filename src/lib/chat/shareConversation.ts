import { ChatMessage } from '@/lib/types';

interface ShareTexts {
    shareTitle: string;
    shareUser: string;
    shareAssistant: string;
    shareFooter: string;
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

    printWindow.document.write(`<!DOCTYPE html><html><head>
        <title>${texts.shareTitle}</title>
        <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
            h1 { font-size: 1.4rem; border-bottom: 2px solid #74ACDF; padding-bottom: 0.5rem; }
            .msg { margin: 1rem 0; padding: 0.75rem; border-radius: 8px; }
            .user { background: #f0f4ff; }
            .assistant { background: #f8f9fa; border-left: 3px solid #74ACDF; }
            .role { font-weight: 700; font-size: 0.85rem; color: #555; margin-bottom: 0.25rem; }
            .content { white-space: pre-wrap; line-height: 1.6; }
            .footer { margin-top: 2rem; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 0.5rem; }
        </style>
    </head><body>
        <h1>${texts.shareTitle}</h1>
        ${messages.map((m) => `
            <div class="msg ${m.role}">
                <div class="role">${m.role === 'user' ? texts.shareUser : texts.shareAssistant}</div>
                <div class="content">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
        `).join('')}
        <div class="footer">${texts.shareFooter} — ${new Date().toLocaleDateString('es-AR')}</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
}

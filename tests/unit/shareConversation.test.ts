/**
 * H9 fix (round v46) — XSS regression coverage for shareConversation.
 *
 * Pre-fix `shareConversation` built the printable document by
 * interpolating message content and i18n strings into a template
 * passed to `document.write`, with only `<` and `>` escaped on the
 * message content. Quotes, ampersands, and the i18n strings landed
 * verbatim — letting a malicious LLM output (or a prompt-poisoned
 * source description) inject markup and scripts into a same-origin
 * window.
 *
 * The post-fix builder uses createElement + textContent. Any "<script>"
 * in `m.content` shows up as the literal characters in `.content` and
 * is NOT parsed as an HTML node.
 */

import { describe, expect, it } from 'vitest';

import { __test } from '@/lib/chat/shareConversation';
import type { ChatMessage } from '@/lib/types';

const { buildShareDocument } = __test;

const baseTexts = {
    shareTitle: 'Compartir',
    shareUser: 'Tú',
    shareAssistant: 'Asistente',
    shareFooter: 'OpenArg',
};

function makeDoc(): Document {
    const parser = new DOMParser();
    return parser.parseFromString('<!DOCTYPE html><html></html>', 'text/html');
}

describe('shareConversation buildShareDocument (H9 XSS regression)', () => {
    it('renders message content as text, NOT as HTML nodes', () => {
        const messages: ChatMessage[] = [
            {
                id: '1',
                role: 'assistant',
                content: '<script>window.__pwned=true</script>',
                timestamp: '2026-06-10T00:00:00Z',
            },
        ];
        const doc = makeDoc();
        buildShareDocument(doc, messages, baseTexts);

        // No <script> element should exist anywhere in the document —
        // the malicious content must be rendered as text only.
        expect(doc.querySelector('script')).toBeNull();

        // And the literal characters of the injection must be present
        // in the content cell.
        const contentEl = doc.querySelector('.content');
        expect(contentEl).not.toBeNull();
        expect(contentEl?.textContent).toBe(
            '<script>window.__pwned=true</script>',
        );
        // textContent returns text; innerHTML, by contrast, returns the
        // HTML-encoded form (`&lt;script&gt;...`) — proving the
        // characters round-tripped through the encoder.
        expect(contentEl?.innerHTML).toContain('&lt;script&gt;');
    });

    it('renders i18n strings as text, NOT as HTML nodes', () => {
        // texts.* used to be interpolated verbatim, which was just as
        // exploitable as m.content (locale files can be touched by
        // anyone with PR access to the frontend repo).
        const messages: ChatMessage[] = [
            {
                id: '1',
                role: 'user',
                content: 'hola',
                timestamp: '2026-06-10T00:00:00Z',
            },
        ];
        const doc = makeDoc();
        buildShareDocument(doc, messages, {
            ...baseTexts,
            shareTitle: '<img src=x onerror=alert(1)>',
            shareUser: '<b>Tú</b>',
        });

        expect(doc.querySelector('img')).toBeNull();
        expect(doc.querySelector('b')).toBeNull();
        expect(doc.title).toBe('<img src=x onerror=alert(1)>');
        expect(doc.querySelector('.role')?.textContent).toBe('<b>Tú</b>');
    });

    it('escapes &, ", \' as text — not just < and >', () => {
        const messages: ChatMessage[] = [
            {
                id: '1',
                role: 'assistant',
                content: `Quotes: "a" 'b' & ampersand`,
                timestamp: '2026-06-10T00:00:00Z',
            },
        ];
        const doc = makeDoc();
        buildShareDocument(doc, messages, baseTexts);

        const contentEl = doc.querySelector('.content');
        // Visible text round-trips intact.
        expect(contentEl?.textContent).toBe(`Quotes: "a" 'b' & ampersand`);
        // The HTML-encoded form proves the browser escaped the
        // ampersand into `&amp;` — the pre-fix regex (which only
        // touched `<` and `>`) would have left raw `&` in the DOM.
        expect(contentEl?.innerHTML).toContain('&amp;');
    });

    it('preserves whitespace via the .content CSS rule, not by escaping', () => {
        // Sanity: assistant answers commonly include newlines and
        // double spaces. The CSS sets `white-space: pre-wrap`, so the
        // raw text must survive unchanged through textContent.
        const messages: ChatMessage[] = [
            {
                id: '1',
                role: 'assistant',
                content: 'Line 1\n  indented line 2',
                timestamp: '2026-06-10T00:00:00Z',
            },
        ];
        const doc = makeDoc();
        buildShareDocument(doc, messages, baseTexts);

        expect(doc.querySelector('.content')?.textContent).toBe(
            'Line 1\n  indented line 2',
        );
    });

    it('renders user vs assistant role labels into the correct class', () => {
        const messages: ChatMessage[] = [
            {
                id: '1',
                role: 'user',
                content: 'q',
                timestamp: '2026-06-10T00:00:00Z',
            },
            {
                id: '2',
                role: 'assistant',
                content: 'a',
                timestamp: '2026-06-10T00:00:01Z',
            },
        ];
        const doc = makeDoc();
        buildShareDocument(doc, messages, baseTexts);

        const msgs = doc.querySelectorAll('.msg');
        expect(msgs.length).toBe(2);
        expect(msgs[0].className).toContain('user');
        expect(msgs[1].className).toContain('assistant');
        expect(msgs[0].querySelector('.role')?.textContent).toBe('Tú');
        expect(msgs[1].querySelector('.role')?.textContent).toBe('Asistente');
    });
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(adminEmails: string | undefined) {
    vi.resetModules();
    if (adminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = adminEmails;
    return (await import('@/lib/auth')).isAdminEmail;
}

describe('isAdminEmail', () => {
    afterEach(() => {
        delete process.env.ADMIN_EMAILS;
    });

    it('acepta los mails de la lista sin importar mayúsculas ni espacios', async () => {
        const isAdminEmail = await load(' Dante@Example.com , otra@example.com ');
        expect(isAdminEmail('dante@example.com')).toBe(true);
        expect(isAdminEmail('  OTRA@example.com ')).toBe(true);
    });

    it('rechaza a cualquier otro', async () => {
        const isAdminEmail = await load('dante@example.com');
        expect(isAdminEmail('alguien@example.com')).toBe(false);
        expect(isAdminEmail('')).toBe(false);
        expect(isAdminEmail(null)).toBe(false);
        expect(isAdminEmail(undefined)).toBe(false);
    });

    it('con la lista vacía nadie es admin', async () => {
        const isAdminEmail = await load(undefined);
        expect(isAdminEmail('dante@example.com')).toBe(false);
    });
});

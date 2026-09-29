import { describe, it, expect } from 'vitest';
import { safeCallback } from '@/lib/safeCallback';

describe('safeCallback', () => {
    it('sin callback va al chat', () => {
        expect(safeCallback(null)).toBe('/chat');
        expect(safeCallback('')).toBe('/chat');
    });

    it('una ruta relativa se respeta', () => {
        expect(safeCallback('/desarrolladores')).toBe('/desarrolladores');
        expect(safeCallback('/datasets?q=ipc')).toBe('/datasets?q=ipc');
    });

    it('la URL interna del contenedor se reduce a su ruta', () => {
        // Lo que manda el middleware detrás de Caddy (visto en staging, 29-sep).
        expect(safeCallback('https://1163b5d8a023:3000/desarrolladores')).toBe('/desarrolladores');
    });

    it('otro dominio nunca es destino: sólo queda la ruta', () => {
        expect(safeCallback('https://evil.example/desarrolladores')).toBe('/desarrolladores');
        expect(safeCallback('https://evil.example')).toBe('/');
    });

    it('rutas que el navegador toma como otro dominio no salen del sitio', () => {
        // `//host/x` se parsea como otro dominio: queda su ruta, en este sitio.
        expect(safeCallback('//evil.example/x')).toBe('/x');
        // Una ruta que empieza con `//` se rechaza entera.
        expect(safeCallback('https://openarg.org//evil.example')).toBe('/chat');
    });

    it('no vuelve al login ni a la API', () => {
        expect(safeCallback('/login?error=x')).toBe('/chat');
        expect(safeCallback('/api/developers/keys')).toBe('/chat');
    });
});

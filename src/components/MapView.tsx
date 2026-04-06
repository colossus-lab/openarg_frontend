'use client';

import { useRef, useEffect, useState, useMemo, memo } from 'react';
import type { MapData } from '@/lib/types';
import ChartErrorBoundary from './ChartErrorBoundary';
import type L from 'leaflet';

interface Props {
    mapData: MapData;
}

const COLORS = {
    celeste: '#74ACDF',
    sol: '#F6B40E',
    pointBorder: '#FFFFFF',
    polygonFill: 'rgba(116, 172, 223, 0.15)',
    polygonBorder: '#74ACDF',
    line: '#F6B40E',
};

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return '\u2014';
    if (typeof v === 'number') return escapeHtml(v.toLocaleString('es-AR', { maximumFractionDigits: 2 }));
    const s = String(v);
    return escapeHtml(s.length > 120 ? s.slice(0, 117) + '...' : s);
}

function humanizeKey(key: string): string {
    return key
        .replace(/^_+/, '')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
}

function buildPopupHtml(properties: Record<string, unknown>): string {
    const entries = Object.entries(properties).filter(
        ([k]) => !k.startsWith('_') && k !== 'geometry_type'
    );
    if (entries.length === 0) return '<em style="color:#6B7280">Sin propiedades</em>';

    const rows = entries
        .slice(0, 10)
        .map(([k, v]) => {
            const label = escapeHtml(humanizeKey(k));
            const val = formatValue(v);
            return `<tr><td style="padding:2px 8px 2px 0;font-weight:600;color:#74ACDF;white-space:nowrap;vertical-align:top;font-size:0.75rem">${label}</td><td style="padding:2px 0;color:#E5E7EB;font-size:0.8rem">${val}</td></tr>`;
        })
        .join('');

    const extra = entries.length > 10
        ? `<div style="margin-top:4px;color:#6B7280;font-size:0.7rem">+${entries.length - 10} campos m\u00e1s</div>`
        : '';

    return `<table style="border-collapse:collapse;line-height:1.5">${rows}</table>${extra}`;
}

function MapViewInner({ mapData }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const featureCount = mapData?.features?.length ?? 0;
    const popupHtmlByFeature = useMemo(
        () => {
            const map = new WeakMap<object, string>();
            for (const feature of mapData?.features ?? []) {
                if (feature.properties && Object.keys(feature.properties).length > 0) {
                    map.set(feature as object, buildPopupHtml(feature.properties as Record<string, unknown>));
                }
            }
            return map;
        },
        [mapData],
    );
    const geomTypes = useMemo(
        () => new Set(mapData?.features?.map((f) => f.geometry?.type).filter(Boolean) ?? []),
        [mapData],
    );
    const label = useMemo(() => (
        geomTypes.has('Point')
            ? (featureCount === 1 ? 'ubicación' : 'ubicaciones')
            : geomTypes.has('Polygon') || geomTypes.has('MultiPolygon')
                ? (featureCount === 1 ? 'zona' : 'zonas')
                : (featureCount === 1 ? 'elemento' : 'elementos')
    ), [featureCount, geomTypes]);

    useEffect(() => {
        if (!containerRef.current || featureCount === 0) return;

        setIsLoading(true);
        let cancelled = false;

        // Ensure Leaflet CSS is loaded before creating the map
        const ensureCss = (): Promise<void> => {
            return new Promise((resolve) => {
                if (document.querySelector('link[href*="leaflet.css"][data-loaded]')) {
                    resolve();
                    return;
                }
                const existing = document.querySelector('link[href*="leaflet.css"]') as HTMLLinkElement | null;
                if (existing) {
                    if (existing.sheet) { existing.setAttribute('data-loaded', ''); resolve(); return; }
                    existing.onload = () => { existing.setAttribute('data-loaded', ''); resolve(); };
                    existing.onerror = () => resolve(); // Degrade gracefully
                    return;
                }
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.crossOrigin = '';
                link.onload = () => { link.setAttribute('data-loaded', ''); resolve(); };
                link.onerror = () => resolve(); // Degrade gracefully — map renders unstyled
                document.head.appendChild(link);
            });
        };

        Promise.all([import('leaflet'), ensureCss()]).then(([LeafletModule]) => {
            if (cancelled || !containerRef.current) return;
            const Leaflet = LeafletModule.default || LeafletModule;

            // Fix default marker icon paths
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
            Leaflet.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Destroy previous map
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = Leaflet.map(containerRef.current!, {
                zoomControl: true,
                scrollWheelZoom: false,
                attributionControl: true,
            });

            mapInstanceRef.current = map;

            // CartoDB Dark Matter tiles
            Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }).addTo(map);

            // Style features by geometry type
            const geoJsonLayer = Leaflet.geoJSON(mapData as unknown as GeoJSON.FeatureCollection, {
                pointToLayer: (_feature, latlng) => {
                    return Leaflet.circleMarker(latlng, {
                        radius: 7,
                        fillColor: COLORS.celeste,
                        color: COLORS.pointBorder,
                        weight: 1.5,
                        opacity: 1,
                        fillOpacity: 0.85,
                    });
                },
                style: (feature) => {
                    const gType = feature?.geometry?.type;
                    if (gType === 'Polygon' || gType === 'MultiPolygon') {
                        return {
                            fillColor: COLORS.polygonFill,
                            color: COLORS.polygonBorder,
                            weight: 2,
                            opacity: 0.8,
                            fillOpacity: 0.3,
                        };
                    }
                    if (gType === 'LineString' || gType === 'MultiLineString') {
                        return {
                            color: COLORS.line,
                            weight: 3,
                            opacity: 0.8,
                        };
                    }
                    return {};
                },
                onEachFeature: (feature, layer) => {
                    const popupHtml = popupHtmlByFeature.get(feature as object);
                    if (popupHtml) {
                        layer.bindPopup(popupHtml, {
                            maxWidth: 320,
                            className: 'openarg-map-popup',
                        });
                    }
                },
            }).addTo(map);

            // Auto-fit bounds
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
            } else {
                map.setView([-38.4, -63.6], 4);
            }

            // Show the map, then fix tile dimensions
            setIsLoading(false);
            // Wait for React to commit the visibility change, then invalidate
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    map.invalidateSize();
                });
            });
        }).catch(() => {
            setIsLoading(false); // Don't get stuck on loading forever
        });

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [featureCount, mapData, popupHtmlByFeature]);

    if (!mapData || !mapData.features || featureCount === 0) return null;

    return (
        <div className="chart-container">
            <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Mapa</span>
                <span style={{
                    background: 'rgba(116, 172, 223, 0.1)',
                    color: '#74ACDF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    letterSpacing: '0.02em',
                }}>
                    {featureCount} {label}
                </span>
            </div>
            <ChartErrorBoundary title="Mapa">
                {isLoading && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 380,
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        gap: '0.5rem',
                    }}>
                        <span style={{
                            width: 16, height: 16,
                            border: '2px solid rgba(116,172,223,0.3)',
                            borderTopColor: '#74ACDF',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }} />
                        Cargando mapa...
                    </div>
                )}
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: 380,
                        borderRadius: '0 0 var(--radius-md, 8px) var(--radius-md, 8px)',
                        overflow: 'hidden',
                        visibility: isLoading ? 'hidden' : 'visible',
                        position: isLoading ? 'absolute' : 'relative',
                    }}
                />
            </ChartErrorBoundary>
        </div>
    );
}

export default memo(MapViewInner);

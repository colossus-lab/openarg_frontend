# Design System — OpenArg Editorial Modernista

> Tema visual del branch `feat/landing-editorial`. Documenta la paleta, tipografía,
> grilla, componentes, dinámicas y reglas responsive del rediseño de la landing
> en clave **Modernismo Argentino**.
>
> Filosofía: tipografía como peso, paleta cinematográfica (dark navy + celeste + sol),
> grilla visible como sensación de papel arquitectónico, data como decoración,
> movimiento mínimo. Anti AI-SaaS-default, editorial / journalistic.

---

## 1. Filosofía & referencias

**Inspiración directa:**
- Tomás Maldonado · escuela de Ulm vista desde Buenos Aires
- Carlos Méndez Mosquera · CIDI, diseño industrial argentino
- EUDEBA, CEAL · imprenta editorial argentina '60-'70
- Rogelio Polesello, Julio Le Parc · op-art rioplatense
- ProPublica, The Pudding, NYT Data Journalism · periodismo de datos

**Lo que NO es:**
- ❌ AI-SaaS dark default (Vercel/Cursor/Linear/v0/Stripe) con glow cyan + marquees + live-feed sidebars + monospace pills decorativos + particles + scanlines
- ❌ Crema/paper editorial puro (probado y descartado por el usuario; quería los colores cinematográficos)
- ❌ Carga visual constante de animaciones

**Lo que SÍ es:**
- ✅ Tipografía monumental y disciplinada (Familjen Grotesk Variable, Akzidenz-Grotesk-like, Ulm heritage)
- ✅ Paleta Argentina cinematográfica (dark navy + celeste + sol + cream)
- ✅ Grilla cuadriculada arquitectónica de fondo con efecto parallax
- ✅ Composiciones geométricas como información (no decoración)
- ✅ Movimiento sólo on-scroll con `FadeIn` suave
- ✅ Tono editorial / manifiesto, no marketing

---

## 2. Estructura de archivos

```
src/
├── app/
│   ├── globals.css                        # Tokens + reglas .ed-* (todo el sistema)
│   ├── layout.tsx                         # Import fontsource Familjen Grotesk
│   ├── page.tsx                           # Orquesta la landing editorial
│   ├── como-funciona/page.tsx             # Página /como-funciona
│   └── dashboards/page.tsx                # Página /dashboards
├── components/
│   └── landing-ed/                        # Componentes editoriales (namespace ed)
│       ├── TopbarEditorial.tsx            # Navegación superior
│       ├── HeroEditorial.tsx              # Hero centrado + foot block
│       ├── ScaleEditorial.tsx             # Tabla de stats + treemap wrapper
│       ├── GeoBlocksMap.tsx               # Treemap proporcional por región
│       ├── TranscriptDemo.tsx             # Demo de chat (loop entre 2 escenarios)
│       ├── PipelineEditorial.tsx          # 4 agentes con flechas
│       ├── EcosystemEditorial.tsx         # Grid de dashboards destacados
│       ├── EditorialGlyph.tsx             # SVG glyphs monocromáticos por dashboard
│       ├── AudiencesEditorial.tsx         # 4 audiencias manifesto
│       ├── ChatCTA.tsx                    # Card final "Iniciar chat"
│       ├── Colophon.tsx                   # Footer colofón
│       └── ManifestoCTA.tsx               # (legacy — ya no se usa en page.tsx)
└── lib/
    ├── products.ts                        # Registry de los 10 dashboards
    └── demo-script.ts                     # 2 escenarios + DEMO_PHASES + DEMO_TIMING
```

**Convención de nombres:**
- Clases CSS prefijo `.ed-*` (editorial). Aisladas del sistema de chat/datasets legacy.
- Componentes con sufijo `Editorial` o nombre directo del rol.
- Tokens CSS variables prefijo `--ed-*`.

---

## 3. Tokens — Colores

Tokens en `:root` (tipografía, theme-independent) y `.ed-page` (paleta + chart vars, **dark por default**). El scope `.ed-page` aísla el sistema editorial del toggle global `data-theme` legacy.

**Light mode** se activa via `[data-theme="light"] .ed-page { ... }` override. Cada token tiene un valor light correspondiente (acentos darkened para contraste AA sobre cream). El toggle vive en el topbar como botón sun/moon — ver Sección 16.

### 3.1 Paleta base (paper / ink)

| Token | Dark (default) | Light | Uso |
|---|---|---|---|
| `--ed-paper` | `#06090F` | `#F2EDE2` | Fondo principal |
| `--ed-paper-2` | `#0D1117` | `#E6DECC` | Superficie elevada sutil (treemap canvas bg, audiences hover) |
| `--ed-paper-3` | `#1A2030` | `#D8CFB8` | Superficie más elevada (transcript chart card, donut bg) |
| `--ed-ink` | `#E8ECF4` | `#11142E` | Texto primario |
| `--ed-ink-2` | `#8892A8` | `#4A5170` | Texto secundario (subtítulos, captions) |

### 3.2 Acentos

| Token | Dark (default) | Light | Uso |
|---|---|---|---|
| `--ed-cobalt` | `#74ACDF` | `#1F4E89` | **Celeste Argentina** · números monumentales, primer acento frío |
| `--ed-vermilion` | `#F6B40E` | `#C03A18` | **Sol Argentina** · `<em>` italic, arrows, highlights, hover states |
| `--ed-chrome` | `#FFD04A` | `#D9A20E` | **Sol bright** · tercer color (treemap Cuyo, scale nums) |
| `--ed-celeste` | `#93C5F8` | `#4A8ABF` | Celeste bright · uso ceremonial (CABA bloque del mapa, swatches) |

En light mode los acentos se oscurecen para mantener contraste WCAG AA sobre cream (#F2EDE2). La identidad Argentina (celeste + sol) se preserva pero darkened.

### 3.3 Hairlines / rules

| Token | Dark | Light | Uso |
|---|---|---|---|
| `--ed-rule` | `rgba(232, 236, 244, 0.16)` | `rgba(17, 20, 46, 0.18)` | Líneas finas hairline |
| `--ed-rule-strong` | `rgba(232, 236, 244, 0.42)` | `rgba(17, 20, 46, 0.42)` | Bordes más visibles |

### 3.4 Chart-specific (heredado por DataChart en el demo)

| Token | Dark | Light |
|---|---|---|
| `--chart-grid` | `rgba(116, 172, 223, 0.10)` | `rgba(17, 20, 46, 0.08)` |
| `--chart-axis` | `#6B7280` | `#4A5170` |
| `--chart-tooltip-bg` | `#1A1F35` | `#F2EDE2` |
| `--chart-tooltip-border` | `rgba(116, 172, 223, 0.2)` | `rgba(17, 20, 46, 0.20)` |
| `--chart-tooltip-text` | `#F0F4FC` | `#11142E` |

### 3.5 Bandera ceremonial

La franja vertical izquierda del hero (`.ed-flagstripe`) usa colores **hardcoded** (no tokens):
- Banda superior: `#74ACDF` (celeste)
- Banda media: `#FFFFFF` (blanco, no `--ed-paper`)
- Banda inferior: `#74ACDF` (celeste)

Hardcoded para mantener la bandera visualmente correcta independientemente del fondo.

---

## 4. Tokens — Tipografía

### 4.1 Familias

| Token | Familia | Uso | Variable |
|---|---|---|---|
| `--ed-display` | `Familjen Grotesk Variable` | Headlines, números monumentales, títulos | Sí, pesos 400-700 |
| `--ed-body` | `Inter` | Cuerpo de texto, párrafos | Pesos 300-900 instalados |
| `--ed-mono` | `JetBrains Mono` | Eyebrows mono, metadata técnica, IDs, fechas | Pesos 400-700 |

Stacks completos con fallbacks:
```css
--ed-display: 'Familjen Grotesk Variable', 'Space Grotesk Variable', 'Inter', system-ui, sans-serif;
--ed-body:    'Inter', system-ui, sans-serif;
--ed-mono:    'JetBrains Mono', ui-monospace, monospace;
```

Imports en `src/app/layout.tsx`:
```ts
import "@fontsource/inter/{300,400,500,600,700,800,900}.css";
import "@fontsource/jetbrains-mono/{400,500,600,700}.css";
import "@fontsource-variable/familjen-grotesk";
```

### 4.2 Roles tipográficos (clamp ranges actuales)

| Clase | Familia | Tamaño (min, fluido, max) | Peso | Letter-spacing |
|---|---|---|---|---|
| `.ed-display` | display | `clamp(2.4rem, 5vw, 4.5rem)` | 700 | `-0.04em` |
| `.ed-hero-title` | display | **`clamp(3rem, 7vw, 6.5rem)`** · mobile `clamp(2.6rem, 11vw, 4.2rem)` | 700 | `-0.045em` · `line-height 0.98` |
| `.ed-hero-subtitle` | display | `clamp(0.98rem, 1.4vw, 1.15rem)` | 500 | normal |
| `.ed-hero-num` / `.ed-num-display` | display | `clamp(3.5rem, 6vw, 5.5rem)` | 700 | `-0.04em` |
| `.ed-section-title` | display | `clamp(1.6rem, 2.8vw, 2.4rem)` | 700 | `-0.022em` |
| `.ed-scale-row-num` | display | `clamp(2.8rem, 5.5vw, 4.8rem)` | 700 | `-0.045em` |
| `.ed-scale-row-label` | display | `clamp(1.05rem, 1.7vw, 1.4rem)` | 700 | `-0.012em` |
| `.ed-pipeline-num` | display | `clamp(2.2rem, 3.5vw, 3rem)` | 700 | `-0.035em` |
| `.ed-pipeline-label` | display | `1.15rem` | 700 | `-0.012em` |
| `.ed-audience-title` | display | `clamp(1.2rem, 1.7vw, 1.5rem)` | 700 | `-0.018em` |
| `.ed-chatcta-title` | display | `clamp(1.5rem, 2.6vw, 2.1rem)` | 700 | `-0.022em` |
| `.ed-lead` | body | `clamp(0.95rem, 1.3vw, 1.08rem)` | 400 | normal |
| `.ed-eyebrow` | body | `0.74rem` | 600 | `0.16em`, uppercase |
| `.ed-eyebrow-num` | mono | `0.74rem` | 500 | `0.04em` |
| `.ed-meta` | body | `0.72rem` | 600 | `0.14em`, uppercase |
| `.ed-meta-mono` | mono | `0.72rem` | 500 | `0.04em` |

### 4.3 Convenciones tipográficas

- **`<em>` siempre va italic y vermilion** (`--ed-vermilion`) en headlines display
- **Números**: siempre `font-variant-numeric: tabular-nums` para evitar saltos en cifras animadas
- **Letter-spacing**: tighter en sizes grandes (-0.04 a -0.045em), normal en body, wider en eyebrows/labels (+0.1 a +0.16em)
- **Line-height**: 0.9-1 en display, 1.1-1.3 en section titles, 1.45-1.55 en body
- **`text-wrap: balance`** en títulos hero y section-titles para evitar viuda lines

---

## 5. Tokens — Espacio & Layout

### 5.1 Containers

| Clase | Max-width | Padding | Cuándo usar |
|---|---|---|---|
| `.ed-container` | `1140px` | `0 2.5rem` | Container principal de cualquier sección |
| `.ed-container-narrow` | `880px` | `0 2.5rem` | Bloques de lectura densos / formularios |

**Área de seguridad lateral**: 2.5rem (40px) en desktop, 1.25rem (20px) en mobile. **Nunca edge-to-edge**.

### 5.2 Sections

| Clase | Padding vertical | Border top |
|---|---|---|
| `.ed-section` | `4.5rem 0` | `1px solid var(--ed-rule)` |
| `.ed-hero` | `2.5rem 0 4rem` | none |
| `.ed-section:first-of-type` | unchanged | `none` (sin border arriba si es la primera) |

### 5.3 Gaps internos

Convenciones de `gap` por contexto:
- Hero centro (eyebrow → title → subtitle → CTAs): `1.1rem` (intimate)
- Hero foot (32+lead | TOC): `2.5rem` desktop, `1.25rem` mobile
- Section head (eyebrow → title → lead): `1.25rem` (default)
- Pipeline cards: no gap (`border-right` divider entre cells)
- Audiences cards: no gap (border-right divider)
- Charts/ChatCTA actions: `1rem 1.75rem`

### 5.4 Border radius

El sistema usa esquinas casi rectas (estética editorial / print, no SaaS rounded).
- `.ed-chatcta-card`: `4px`
- `.ed-page .ed-topbar-cta`: implícito 0 (rectangular)
- `.ed-page .ed-chatcta-cta`: `2px`
- Resto: `0` (sin border-radius)

Las únicas formas circulares aparecen en gráficos SVG (donuts, dots geomap).

---

## 6. Background system — Grid + Gradient + Vignette

Aplicado al wrapper `.ed-page`. Combina 3 capas para dar profundidad arquitectónica.

### 6.1 Base + gradients (`.ed-page` background)

```css
.ed-page {
  background-color: var(--ed-paper);  /* #06090F */
  background-image:
    /* Cool glow top-left */
    radial-gradient(ellipse 1400px 900px at 12% -10%, rgba(116, 172, 223, 0.12), transparent 55%),
    /* Warm glow bottom-right */
    radial-gradient(ellipse 1100px 800px at 100% 105%, rgba(246, 180, 14, 0.07), transparent 60%),
    /* Violet hint middle-right */
    radial-gradient(ellipse 800px 600px at 90% 30%, rgba(167, 139, 250, 0.04), transparent 65%),
    /* Top highlight */
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 40%);
  background-attachment: fixed;  /* CRÍTICO: queda anclado al viewport → parallax */
}
```

### 6.2 Grid arquitectónica (`.ed-page::before`)

```css
.ed-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    /* Major grid every 240px */
    linear-gradient(rgba(116, 172, 223, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(116, 172, 223, 0.06) 1px, transparent 1px),
    /* Minor grid every 80px */
    linear-gradient(rgba(232, 236, 244, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 236, 244, 0.035) 1px, transparent 1px);
  background-size: 240px 240px, 240px 240px, 80px 80px, 80px 80px;
  mask-image: radial-gradient(ellipse 90% 75% at 50% 40%, black 0%, rgba(0,0,0,0.6) 50%, transparent 90%);
}
```

La `mask-image` hace que el grid se difumine hacia los bordes — más visible en el centro.

### 6.3 Vignette (`.ed-page::after`)

```css
.ed-page::after {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%);
}
```

Oscurece los 4 corners para concentrar atención al centro.

### 6.4 Layering de contenido

```css
.ed-page > * {
  position: relative;
  z-index: 1;  /* Lift sobre grid (z-0) y vignette */
}
.ed-hero-inner {
  z-index: 2;  /* Extra lift sobre micro-decoraciones del hero */
}
```

**Resultado**: el contenido scrollea, el grid+gradient se quedan anclados al viewport → ilusión de "papel arquitectónico" estático bajo el cual fluye el texto.

---

## 7. Componentes (sección por sección)

### 7.1 Topbar — `TopbarEditorial.tsx`

```
[OpenArg POR COLOSSUS LAB] [Dashboards · Cómo funciona · Datasets] [☀/☾] [Abrir chat →]
```

- Brand izquierda (`.ed-topbar-mark`): título display 1.15rem + sub mono small caps
- Nav center (`.ed-topbar-nav`): mono 0.85rem, active = vermilion underline 2px
- **Right group** (`.ed-topbar-right`): inline-flex gap 0.75rem, contiene:
  - **ThemeToggle** (`.ed-theme-toggle`) — botón 32×32 con icono sun/moon. Click → flippea entre `data-theme="dark"` y `"light"`, guarda en `localStorage['openarg-theme']`. Ver `ThemeToggleEditorial.tsx` (Sección 16).
  - **CTA "Abrir chat →"** (`.ed-topbar-cta`): bg ink + color paper (cream sobre dark / dark sobre cream en light) · hover bg vermilion
- Border-bottom hairline

**Specificity fix**: `.ed-page .ed-topbar-cta, .ed-page a.ed-topbar-cta` necesita esa cascada para no perder el color contra `.ed-page a { color: inherit }`.

### 7.2 Hero — `HeroEditorial.tsx`

Layout vertical-stack centrado:
```
[franja-bandera vertical izquierda]

         ─── N.º 01 / MMXXVI · INTELIGENCIA SOBRE DATOS PÚBLICOS
                       Argentina,
                       en datos.
            OpenArg es un motor de análisis impulsado por IA
            para datos abiertos del gobierno argentino.
         → Ver una pregunta · → Ver dashboards · → Cómo funciona
─────────────────────────────────────────────────────────────────
32                                            │  I. Escala
PORTALES PÚBLICOS · ARGENTINA                 │  II. Una pregunta
16.000 datasets oficiales, 23 provincias       │  III. Cómo
y la Ciudad de Buenos Aires.                  │  ...
                                              │  Colossus Lab · BA · MMXXVI
                                              │  * Cifras ilustrativas
```

- `.ed-hero` padding: `2.5rem 0 4rem`
- `.ed-hero-inner`: flex column, gap 2.75rem, items-center
- `.ed-hero-center`: max-width 720px, gap 1.1rem, text-center
- `.ed-hero-foot`: grid 1.2fr/1fr, max-width 920px, border-top hairline

**Franja ceremonial** (`.ed-flagstripe`): 4px width, posición absolute left, gradient 33/33/33 celeste/blanco/celeste.

**CTAs responsive (Sección 17)**: a `>720px` se renderizan 3 text-links inline (`.ed-hero-actions-row`). A `≤720px` se colapsan en un único botón pill expandible (`.ed-hero-actions-toggle` + `.ed-hero-actions-menu`) controlado por `useState`. Click en cualquier opción auto-cierra el menú.

### 7.3 Scale section — `ScaleEditorial.tsx`

Tabla de stats monumental + treemap.

**Tabla** (`.ed-scale-row`):
- Grid 3 cols: `[num] [label] [detail]`
- Cada fila: padding 1.6rem 0, border-bottom hairline
- 4 filas: 32 (cobalt) · 16.000+ (vermilion) · 24 (chrome) · 5s (ink/cream)

**Treemap embebido** debajo (ver 7.4).

**Quote final** (`.ed-geomap-quote`): italic display, border-left 4px vermilion.

### 7.4 GeoBlocksMap (Treemap) — `GeoBlocksMap.tsx`

**No es un mapa geográfico** — es un treemap proporcional. Cada bloque rectangular tiene tamaño según `count` de datasets de esa región.

```
+----------------------------+--------+
|                            |  CABA  |
|                            | 2.341  |
|     NACIÓN                 +--------+
|     9.000  · 54%           | PAMPA  |
|                            | 1.820  |
|                            +--------+
|                            | CENTRO |
|                            | 1.400  |
+------+------+-------+------+--------+
| CUYO | NOA  |  NEA  | PATAGONIA      |
| 1200 | 800  |  500  | 400            |
+------+------+-------+----------------+
```

- `.ed-geomap`: flex column (canvas full-width + leyenda strip debajo)
- `.ed-geomap-canvas`: aspect-ratio `16/6`, max-height `460px`
- Cada `.ed-geomap-region`: position absolute con `left/top/width/height` en %
- Texto color por región: cream sobre dark (Patagonia), dark (`#06090F`) sobre todo el resto

**Leyenda** (`.ed-geomap-legend`): grid `repeat(auto-fit, minmax(140px, 1fr))`, ordenada de mayor a menor count.

### 7.5 TranscriptDemo — `TranscriptDemo.tsx`

Replica una transcripción editorial de un chat con IA. Loop entre 2 escenarios.

**Escenarios** (`DEMO_SCENARIOS` en `src/lib/demo-script.ts`):
1. **Patrimonio** — senadores con mayor riqueza 2019-2024 (línea 5 series)
2. **Macro** — emisión M2 BCRA + inflación + pobreza 2018-2024 (línea 3 series base 100)

**Estado** (`useReducer`): `stage`, `typed`, `paused`, `scenarioIdx`. Al `reset`, incrementa `scenarioIdx % length`.

**Stages**: `idle → typing-question → show-answer → show-chart → show-sources → hold → reset`.

**Layout**:
- Border-top 2px ink (separador enfático)
- Meta header: `TRANSCRIPCIÓN · fecha · 14:32 ART · 01 / 02` + controles (Pausar / Probar en vivo)
- Grid 0.55fr/1fr (≥980px): question column (con border-right) + answer column
- Question column: pregunta en italic display 2.6rem
- Answer column: párrafo + bullets con superscript `[1][2][3]` + figure embebida con DataChart + lista de fuentes (`<ol>` con números volados vermilion)

**Disclaimer al final**: `* Datos ilustrativos. La transcripción es una simulación con fines de demostración`.

### 7.6 PipelineEditorial — `PipelineEditorial.tsx`

4 columnas con flechas tipográficas entre cada una.

```
01 →  02 →  03 →  04
Plan  Reco  Anál  Sint
```

- `.ed-pipeline`: grid 4 cols, border-top 2px ink
- `.ed-pipeline-step`: padding 2rem 1.5rem 1.5rem, border-right hairline
- `.ed-pipeline-arrow`: `→` 1.5rem vermilion absolute en top-right de cada step (excepto último)
- Cada num color: cobalt / vermilion / chrome / ink

### 7.7 EcosystemEditorial — `EcosystemEditorial.tsx`

Grid 2×2 con dashboards featured. Cada card es link externo (target=`_blank`).

```
[glyph]  Nº · Región              | [glyph]  Nº · Región
         Título dashboard          |          Título dashboard
         tagline italic             |          tagline italic
         [tag] [tag] [tag]          |          [tag] [tag] [tag]
         ─────────────────          |          ─────────────────
         Stack            Abrir →   |          Stack            Abrir →
```

- `.ed-ecosystem`: grid `repeat(2, 1fr)`, border-top 2px ink
- `.ed-ecosystem-card`: grid 0.55fr/1fr (glyph izq + body der), min-height 160px
- Hover: bg paper-2 + glyph bg ink + glyph svg color paper (inversión)
- Glyphs via `EditorialGlyph.tsx`: 10 composiciones monocromáticas en `currentColor`

### 7.8 AudiencesEditorial — `AudiencesEditorial.tsx`

4 columnas manifesto. Cada una link a `/chat?q=...`.

```
01            02              03            04
Periodistas.  Investigadores. Funcionarios. Para vos.
[body]        [body]          [body]        [body]
"q en italic" "q"             "q"           "q"
```

- `.ed-audiences`: grid 4 cols, border-top 2px ink
- `.ed-audience`: padding 1.5rem 1.25rem 1.25rem, border-right hairline, min-height 180px
- `.ed-audience-q`: display italic, padding-top con border-top dashed, con `“ ... ” →` envuelve la pregunta

### 7.9 ChatCTA (card final) — `ChatCTA.tsx`

Card grande de "Iniciar chat" antes del footer. Reemplaza al `ManifestoCTA` legacy.

```
┌────────────────────────────────────────────┐
│ [🗨]   VI · EMPEZÁ TU ANÁLISIS              │
│                                            │
│       Hacé tu propia pregunta a los        │
│       datos del Estado.                    │
│                                            │
│       Cuatro agentes de IA cruzan...       │
│                                            │
│       ─── Ejemplos para empezar ───        │
│       » Compras públicas...   » Mortalidad │
│       » Subsidios al...       » Presupuesto│
│       ──────────────────────────────       │
│       [Iniciar chat →]     → O explorá...  │
└────────────────────────────────────────────┘
```

- `.ed-chatcta-card`: grid 64px/1fr (mark + body), max-width 920px, padding 2rem 2.25rem
- Background: gradient diagonal celeste 6% / sol 4%, + ::before con radial glows
- 4 ejemplos clickeables → cada uno linkea `/chat?q=<encodeURI>`
- CTA primario `.ed-chatcta-cta`: bg ink, color paper (cream/dark), 0.95rem 1.6rem, hover vermilion

### 7.10 Colophon — `Colophon.tsx`

Footer estilo colofón editorial.

- Grid 4 cols: brand · producto · colossus lab · legal
- Brand col: nombre display + sub mono + descripción 1 línea
- Bottom strip: año + "Compuesto en Familjen Grotesk e Inter. Datos públicos verificables"

---

## 8. Dinámicas / animaciones

**Filosofía**: movimiento mínimo. Sólo on-scroll fade. Nada de ambient animations constantes (no marquees, no particles, no scanlines, no glows pulsantes).

### 8.1 FadeIn — único componente de motion

`<FadeIn>` de `src/components/reactbits/FadeIn.tsx`. Usa `motion/react` con `useInView`.

**Parámetros por defecto editorial:**
```tsx
<FadeIn direction="up" distance={8} duration={0.5} delay={0.05} />
```

**Variantes:**
- Distancia: 6-10 (sutiles)
- Duración: 0.5-0.6s (calma)
- Delay stagger: 0.05s entre elementos de una lista, 0.1-0.15s entre bloques mayores
- `blur` flag: solo en hero principal (eyebrow + título)

### 8.2 TranscriptDemo loop

Máquina de estados con `useReducer` + `setTimeout`:

```
Timing constants (en TranscriptDemo.tsx):
- TYPING_MS       = 30ms/char + jitter random 0-20ms
- ANSWER_HOLD_MS  = 1800ms
- CHART_HOLD_MS   = 1600ms
- SOURCES_HOLD_MS = 1800ms
- LOOP_HOLD_MS    = 9000ms
```

Al terminar el ciclo, `reset` action incrementa `scenarioIdx` modulo `DEMO_SCENARIOS.length` → alterna escenarios.

Carrete visible en el meta header: `01 / 02` en vermilion.

Botón pausar disponible. Estado `paused` corta el `useEffect` que dispara los `setTimeout`.

### 8.3 Caret blink

Cursor que aparece durante typing-question:
```css
@keyframes ed-caret-blink { 50% { opacity: 0; } }
.ed-caret { animation: ed-caret-blink 1.05s steps(2, jump-none) infinite; }
```

### 8.4 Hover micro-states

- `.ed-textlink`: underline siempre presente; hover cambia color a vermilion
- `.ed-textlink-arrow`: hover `transform: translateX(3px)`
- `.ed-ecosystem-card`: hover bg paper-2 + glyph invierte color
- `.ed-audience`: hover bg paper-2
- `.ed-topbar-cta`: hover bg/border → vermilion
- `.ed-chatcta-cta`: hover bg vermilion + `translateY(-1px)`

### 8.5 prefers-reduced-motion

Override que desactiva el caret blink:
```css
@media (prefers-reduced-motion: reduce) {
  .ed-caret { animation: none !important; }
}
```

`FadeIn` ya respeta `useReducedMotion` internamente y renderiza el estado final sin animar.

---

## 9. Responsive system

**4 breakpoints activos:**

| Breakpoint | Width | Foco principal |
|---|---|---|
| Desktop wide | `> 1024px` | Full layout |
| Tablet/laptop | `≤ 1024px` | Pipeline 2 cols, Ecosystem 2 cols, Audiences 2 cols, Foot stacking |
| Mobile | `≤ 720px` | Todo 1 col, type scale -40%, container 1.25rem padding |
| Mobile small | `≤ 480px` | CTAs más compactos |

### 9.1 ≤1024px (tablet/laptop)

- `.ed-hero-inner` gap: 3rem
- `.ed-hero-foot`: 1 col stacking, text-align left, alignment left
- `.ed-pipeline`: 2 cols, arrow oculto, border-bottom adicional
- `.ed-audiences`: 2 cols, border-right alternado
- `.ed-cf-arch`: 1 col, arrow rotada 90°
- `.ed-chatcta-card`: 1 col (mark arriba, body abajo)
- `.ed-chatcta-examples ul`: 1 col

### 9.2 ≤720px (mobile)

Cambios principales:
- `.ed-container` padding: `0 1.25rem` (área de seguridad mobile)
- `.ed-section` padding: `3rem 0`
- Hero padding: `1.75rem 0 2.5rem`
- Type scale general baja:
  - `.ed-section-title`: clamp(1.4rem, 5.5vw, 1.9rem)
  - `.ed-display`: clamp(2rem, 8vw, 3rem)
  - `.ed-hero-title`: **clamp(2.6rem, 11vw, 4.2rem)** · line-height 1.02
  - `.ed-hero-num`: clamp(3rem, 10vw, 4.5rem)
- `.ed-hero-center` max-width 100%, gap 0.85rem
- **Hero CTAs**: `.ed-hero-actions-row` oculto, aparece `.ed-hero-actions-toggle-wrap` con botón pill expandible (ver Sección 17)
- `.ed-scale-row`: 1 col, padding 1.3rem 0
- `.ed-pipeline`: 1 col, padding 1.5rem 1rem por step
- `.ed-ecosystem`: 1 col
- `.ed-audiences`: 1 col
- `.ed-chatcta-card`: padding 1.5rem 1.25rem
- `.ed-colophon-grid`: 1 col
- `.ed-topbar-nav`: oculto
- `.ed-topbar-mark-sub`: oculto ("por Colossus Lab" se quita)
- CTA del topbar más compacto · ThemeToggle queda visible

**Treemap mobile:**
- Aspect-ratio cambia a `4/5` (más portrait para legibilidad)
- `max-height: none`
- Region padding: 0.55rem
- Region num: 1.15rem
- Region list: oculto
- Region share: 0.6rem

### 9.3 ≤480px (mobile small)

- CTA topbar padding: 0.4rem 0.7rem, font 0.78rem

---

## 10. Data — Sources of truth

### 10.1 `src/lib/products.ts`

Registry de los 10 dashboards. Tipos:

```ts
export type ProductStatus = 'live' | 'beta' | 'coming-soon';
export type ProductCategory = 'municipal' | 'provincial' | 'nacional' | 'sectorial' | 'demografico' | 'gobierno-abierto';
export type ProductRegion = 'CABA' | 'PBA' | 'Mendoza' | 'Santa Fe' | 'Argentina';

export interface Product {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  region: ProductRegion;
  tags: string[];
  url: string;            // External deploy URL
  thumbnail: string;      // SVG placeholder path
  status: ProductStatus;
  highlights?: string[];
  stack?: string[];
  featured?: boolean;     // True → aparece en EcosystemEditorial preview
}
```

10 productos featured-flag en `caba`, `crecimiento-demografico`, `educacion-caba` (no), `lujan-de-cuyo` (no), `mendoza-ciudad` (no), `mendoza` (sí), `mineria` (sí), `pba` (sí), `datos-abiertos` (no), `venado-tuerto` (no). Total 4 con `featured: true`.

URLs son placeholders `https://[REPLACE-WITH-DEPLOY-URL]-<slug>.vercel.app` — reemplazar cuando deploys reales.

### 10.2 `src/lib/demo-script.ts`

```ts
export interface DemoScenario {
  question: string;
  answer: string;        // Markdown con ** bold ** y - bullets
  chart: ChartData;      // De src/lib/types.ts
  sources: SourceAttribution[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  SCENARIO_PATRIMONIO,   // Senadores con mayor patrimonio 2019-2024
  SCENARIO_MACRO,        // Emisión BCRA + inflación + pobreza 2018-2024
];

export const DEMO_PHASES: DemoPhase[] = [
  { key: 'planning',        durationMs: 1400, ... },
  { key: 'data_collection', durationMs: 2400, ... },
  { key: 'analysis',        durationMs: 2000, ... },
  { key: 'synthesis',       durationMs: 1600, ... },
];

export const DEMO_TIMING = {
  initialDelayMs: 600,
  typingSpeedMs: 28,
  preThinkingPauseMs: 350,
  answerRevealSpeedMs: 14,
  preChartPauseMs: 450,
  preSourcesPauseMs: 800,
  loopHoldMs: 6000,
};
```

**Disclaimer obligatorio**: todos los charts del demo muestran `* Datos ilustrativos · No usar para análisis` para que no se confundan con datos reales.

---

## 11. Cómo extender

### 11.1 Agregar un nuevo dashboard al ecosistema

1. Edit `src/lib/products.ts` → agregar entrada al array `products`
2. Crear glyph SVG en `src/components/landing-ed/EditorialGlyph.tsx` (function `GlyphMi<NuevoSlug>` + agregar al `GLYPHS` map)
3. Si va destacado en el preview de `/`, marcar `featured: true`

### 11.2 Agregar un nuevo escenario al chat demo

1. Edit `src/lib/demo-script.ts` → crear `const SCENARIO_<NOMBRE>: DemoScenario = { ... }`
2. Agregarlo al array `DEMO_SCENARIOS`
3. El loop automáticamente lo incluye (módulo length)

### 11.3 Agregar una nueva sección

1. Crear `src/components/landing-ed/<Nombre>Editorial.tsx` con:
   ```tsx
   <section className="ed-section" id="<slug>">
     <div className="ed-container">
       <FadeIn direction="up" distance={8} duration={0.5}>
         <div className="ed-section-head">
           <p className="ed-eyebrow">
             <span className="ed-eyebrow-num">VI.</span>
             <span>Etiqueta de sección</span>
           </p>
           <h2 className="ed-section-title">Título con <em>énfasis.</em></h2>
           <p className="ed-lead">Lead opcional</p>
         </div>
       </FadeIn>
       {/* contenido específico */}
     </div>
   </section>
   ```
2. Import + agregar a `src/app/page.tsx` en el orden deseado
3. Si necesita estilos nuevos, agregarlos en `globals.css` con prefijo `.ed-<seccion>-*`

### 11.4 Cambiar un color global

Editar `.ed-page { --ed-XX: #YYYYYY; }` en `globals.css`. Toda la app se actualiza.

Para override por sección puntual: scope adicional, ej:
```css
.ed-special-section { --ed-vermilion: #FF6F1B; }
```

**Override sólo para light mode**: agregar en el bloque `[data-theme="light"] .ed-page { ... }`. Por ejemplo si quisieras un vermilion más cálido en light:
```css
[data-theme="light"] .ed-page {
  --ed-vermilion: #D74A1B;
}
```
Dark mode no se afecta.

### 11.5 Ajustar densidad / áreas de seguridad

- **Más respiración**: subir `padding` en `.ed-section` (actual 4.5rem) o `.ed-container` padding lateral (actual 2.5rem)
- **Más compacto**: bajar gaps (`.ed-hero-inner gap`, `.ed-hero-foot gap`, etc.) y/o el padding de las cards
- **Type un poco más grande/chico**: ajustar los `clamp()` ranges en `globals.css`. Las 3 partes del clamp: `clamp(min, fluid_preferred, max)`. Para reducir, baja `max`.

### 11.6 Tocar el background grid

En `.ed-page::before`:
- **Grid más visible**: subir alpha en los `linear-gradient` (actual `0.06` mayor / `0.035` menor)
- **Grid más sutil**: bajar a `0.04 / 0.02`
- **Otra cadencia**: cambiar `background-size: 240px 80px` por otros valores (ej `160px 40px` más denso, `320px 100px` más espaciado)
- **Sin vignette**: borrar regla `.ed-page::after`

---

## 12. Páginas que comparten el sistema

| Ruta | Componente | Comparte sistema |
|---|---|---|
| `/` | `src/app/page.tsx` | Sí — todas las secciones editoriales |
| `/dashboards` | `src/app/dashboards/page.tsx` | Sí — Topbar, Hero corto, ecosystem grid, Colophon |
| `/como-funciona` | `src/app/como-funciona/page.tsx` | Sí — Hero editorial + pipeline detallado + fuentes + arquitectura + principios + Colophon |
| `/chat` | (legacy) | **No** — mantiene dark cinematic con celeste, look "herramienta" |
| `/datasets` | (legacy) | **No** — mantiene utility look |
| `/login`, `/privacy` | (legacy) | No tocado |

**Por qué no extender editorial a `/chat` y `/datasets`**: son rutas de trabajo serio (terminal-like). El contraste entre editorial-modernista landing y utility tools refuerza ambos roles.

---

## 13. Comparativa de branches

| Branch | Look | Estado |
|---|---|---|
| `main` | OpenArg original (hero simple + chat/datasets) | Intacto |
| `feat/landing-cinematic` | AI-SaaS dark (particles, marquee, live-feed, scanlines, glow) | Conservado para referencia. **Considerado over-AI** por el usuario. |
| `feat/landing-editorial` | **Este sistema** — Modernismo Argentino + cinematic palette + grid arch + data-as-decoration | Branch activo de desarrollo |

Para alternar localmente:
```bash
git checkout feat/landing-cinematic   # ver la versión cinematic
git checkout feat/landing-editorial   # volver al editorial
```

---

## 14. Decisiones de diseño no obvias

**¿Por qué Familjen Grotesk?**
Equivalente open-source más cercano a Akzidenz-Grotesk (la sans-serif que Maldonado usaba en HfG Ulm). Variable, weights extremos disponibles (hasta 700+), legible en todos los tamaños, gratis vía `@fontsource-variable`.

**¿Por qué Familjen Grotesk + Inter + JetBrains Mono?**
- Familjen → titulares y display, da carácter
- Inter → body, neutralidad
- JetBrains Mono → solo para datos funcionales (IDs, fechas, eyebrows con números) — **nunca decorativo**

**¿Por qué cream como texto y no como fondo?**
Probamos fondo crema (editorial print tradicional) y el usuario lo rechazó por preferencia de la paleta cinematográfica. La combinación final invierte: tinta-cream sobre fondo dark, pero conserva la disciplina tipográfica modernista.

**¿Por qué el "32" no es animado (CountUp)?**
Los números editoriales son monolíticos. El CountUp animado lee como SaaS-marketing ("watch the number grow!"). El número fijo lee como dato editorial ("32, punto").

**¿Por qué el treemap reemplazó al mapa abstracto-de-Argentina?**
La versión anterior tenía rectángulos arbitrariamente colocados sugiriendo el contorno de AR. Lindo pero **mentía la jerarquía** (NOA y Centro se veían tan grandes como Nación). El treemap muestra la **verdad de los datos**: Nación concentra ~54% de los datasets, CABA + PBA otro ~25%. Honesto y editorial.

**¿Por qué eliminamos la sección de micro-charts (BarStack/Sparkline/Donut) del hero?**
Aunque eran "data-as-decoration", competían con el headline. El usuario los percibió como ruido. Quedan disponibles en el código si se quieren reusar en otras secciones (e.g. /como-funciona).

**¿Por qué `background-attachment: fixed`?**
Es lo que crea la sensación de profundidad: el contenido scrollea, el grid+gradient permanecen anclados al viewport. Sin fixed, el grid se movería con el contenido y se sentiría como decoración plana. Con fixed, el grid es "el papel" donde todo está impreso.

**¿Por qué agregamos light mode después de haber descartado el cream?**
Originalmente probamos fondo cream (editorial print) y se descartó por la paleta cinematográfica. Pero el usuario pidió luego un toggle para alternar — útil para lectura diurna y para ofrecer alternativa accesible (contraste alto sobre cream). La solución: **mantener dark como default identitario** (la versión "cinematográfica" que se eligió), y exponer light como toggle opcional. No es un "downgrade" al editorial print original — es un complemento.

**¿Por qué el toggle de tema queda en el topbar y no en un panel de settings?**
El toggle es un acto trivial y reversible. Esconderlo en un menú agrega fricción sin ningún beneficio. Topbar = visible, single-click, sun/moon icon universal.

**¿Por qué los CTAs mobile colapsan en un pill button en vez de quedarse stack vertical?**
Los 3 text-links stacked verticalmente ocupaban mucha altura en mobile (3 × ~50px = 150px) y peleaban con el headline grande. El pill expandible reduce a 1 button (~45px) y deja al título respirar. Click expande cuando el usuario quiere ver opciones — lectura intencional, no scrolling pasivo.

**¿Por qué el title hero se agrandó +40% si antes lo habíamos reducido?**
Hubo un over-correction. En la pasada de "tiene que tener áreas de seguridad" achicamos todo, incluido el title (de 7rem máx → 4.5rem máx). El usuario después pidió "darle mayor importancia" al title. Lo subimos de nuevo a 6.5rem máx, pero el resto se mantuvo compacto. Esto deja el title como el elemento dominante visual claro sin volver al estado previo donde todo era oversized.

---

## 15. Roadmap / open issues

**Completado en esta iteración:**
- [x] Light/dark mode toggle (botón sun/moon en topbar, persistido en localStorage) — Sección 16
- [x] Hero title más grande (clamp(3rem, 7vw, 6.5rem), +40% en desktop) — Sección 18
- [x] Mobile CTA toggle pill expandible (≤720px) — Sección 17
- [x] Áreas de seguridad consistentes (container max-width 1140px + padding 2.5rem)
- [x] Treemap proporcional con datos reales de cobertura
- [x] Demo loop entre 2 escenarios (DEMO_SCENARIOS)

**Para iterar:**
- [ ] Reemplazar URLs placeholder en `products.ts` por los deploys reales de cada dashboard
- [ ] Capturas reales (PNG) para los 10 dashboards en lugar de los SVG glyphs monocromáticos
- [ ] Validar el demo en navegador con el throttling real (los `setTimeout` se atrasan si la tab está en background)
- [ ] Posible: agregar más escenarios al `DEMO_SCENARIOS` para que el loop tenga más variedad
- [ ] Verificar accesibilidad: contraste AA en ambos themes, navegación con tab, screen reader narration
- [ ] Animar la apertura del menú mobile (actual: cambia `display`, sin transition)
- [ ] Considerar `prefers-color-scheme` como fallback antes de localStorage para respetar preferencia del sistema

**Para descartar (probado y no convenció):**
- ~~Light mode crema como default identitario~~ — ahora existe como toggle opcional (default sigue siendo dark)
- Micro-charts en el hero (probado, eliminados por ruido)
- Manifesto-style closing section (reemplazado por ChatCTA action-oriented)
- Live-feed sidebar AI-SaaS-style (rechazado por look genérico)

---

**Última actualización**: 2026-05-13
**Branch de referencia**: `feat/landing-editorial`
**Compuesto en**: Familjen Grotesk Variable, Inter, JetBrains Mono
**Hecho en**: Buenos Aires por Colossus Lab

---

## 16. Light/Dark mode toggle

El sistema editorial soporta ambos modos. Por defecto: **dark cinematic**. El toggle vive en el topbar (botón cuadrado con icono sun/moon).

> Las tablas de tokens light vs dark ya están en **Sección 3** (Colores). Esta sección documenta la **implementación** del toggle.

### 16.1 Componente — `ThemeToggleEditorial.tsx`

`src/components/landing-ed/ThemeToggleEditorial.tsx`

- Lee `localStorage['openarg-theme']` en mount (vía `useEffect`)
- Default si no hay storage: `'dark'`
- Click → toggle entre `'light'` / `'dark'` → escribe localStorage + actualiza `data-theme` en `<html>`
- Render placeholder vacío `<span>` mientras `!mounted` para evitar hydration mismatch
- Icono SVG inline (sun cuando el theme actual es dark, moon cuando es light) que indica el SIGUIENTE estado, no el actual

### 16.2 Background system en light

El bloque `[data-theme="light"] .ed-page` re-define el `background-image`:
- Glow celeste cobalt en top-left (alpha 0.10)
- Glow vermilion en bottom-right (alpha 0.06)
- Grid pseudo-element: líneas oscuras `rgba(31,78,137,0.07)` (mayor) + `rgba(17,20,46,0.04)` (menor)
- Vignette: `rgba(17,20,46,0.14)` en los bordes
- `linear-gradient(180deg, rgba(255,255,255,0.35), transparent 35%)` highlight superior

### 16.3 Componentes que reaccionan automáticamente

Todos los componentes editoriales heredan via `var(--ed-*)`. Cards, hairlines, type colors, gradients del ChatCTA, treemap regions, hover states — todo flippea con el toggle sin tocar markup.

Pocos casos requieren override extra:
- `.ed-page ::selection` (color de selección de texto)
- `.ed-chatcta-card` background gradient (recolorizado para light)
- `.ed-ecosystem-card:hover, .ed-audience:hover` background (paper-2 funciona bien en ambos)

### 16.4 Persistencia + hidratación

La preferencia se guarda en `localStorage['openarg-theme']`. El layout.tsx tiene un inline `<script>` que aplica `data-theme="light"` por default en primera carga si no hay preferencia (legacy del sistema anterior).

**En editorial pages el toggle override esto en `useEffect`** asegurando dark como default editorial cuando no hay preferencia salvada. Una vez que el usuario hace toggle, su elección se persiste y respeta entre sesiones y entre rutas (`/`, `/dashboards`, `/como-funciona`).

---

## 17. Mobile CTAs — Toggle pattern

En `≤720px` los 3 CTAs del hero (`Ver una pregunta`, `Ver dashboards`, `Cómo funciona`) se colapsan en un **único botón pill expandible** para reducir altura vertical.

### 17.1 Estructura

```jsx
<div className="ed-hero-actions">
  {/* Desktop: row de 3 text-links inline */}
  <div className="ed-hero-actions-row">
    <a>...</a><a>...</a><a>...</a>
  </div>

  {/* Mobile: toggle expandible */}
  <div className="ed-hero-actions-toggle-wrap">
    <button aria-expanded={menuOpen}>
      Explorar opciones ▾
    </button>
    <div className={`ed-hero-actions-menu${menuOpen ? ' is-open' : ''}`} role="menu">
      <Link>Ver una pregunta →</Link>
      <Link>Ver dashboards →</Link>
      <Link>Cómo funciona →</Link>
    </div>
  </div>
</div>
```

### 17.2 Reglas CSS

```css
/* default desktop */
.ed-hero-actions-row { display: inline-flex; gap: 1rem 1.75rem; }
.ed-hero-actions-toggle-wrap { display: none; }

/* ≤720px */
@media (max-width: 720px) {
  .ed-hero-actions-row { display: none; }
  .ed-hero-actions-toggle-wrap { display: block; max-width: 320px; }
}
```

### 17.3 Estado

`useState(false)` en `HeroEditorial`. Click en el toggle alterna. Click en cualquier opción del menú → `setMenuOpen(false)` (auto-close on navigation).

### 17.4 Hover / aria

- `aria-expanded` en el botón (true/false)
- `aria-controls` apuntando al id del menú
- `role="menu"` en el contenedor expandido + `role="menuitem"` en cada link
- Chevron `▾` rota 180° via `transform: rotate(180deg)` cuando `[aria-expanded='true']`

---

## 18. Hero title size — más presencia

A partir del 2026-05-13, el headline del hero se agrandó para reforzar peso visual:

| Breakpoint | Antes | Ahora |
|---|---|---|
| Desktop (mín → fluid → máx) | `clamp(2.4rem, 5vw, 4.5rem)` | `clamp(3rem, 7vw, 6.5rem)` |
| Mobile (≤720px) | `clamp(2.1rem, 9vw, 3.2rem)` | `clamp(2.6rem, 11vw, 4.2rem)` |
| Letter-spacing | `-0.04em` | `-0.045em` (más tight a tamaños grandes) |
| Line-height | `1.05` | `0.98` (desktop) / `1.02` (mobile) |

A 1280px viewport el title pasa de 64px → ~89.6px (+40%).
A 375px viewport pasa de ~34px → ~41px (+22%).

El `.ed-display` global mantuvo `clamp(2.4rem, 5vw, 4.5rem)` porque es de uso secundario (`<h1>` de páginas internas como `/como-funciona`).

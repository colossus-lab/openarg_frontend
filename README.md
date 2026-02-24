<p align="center">
  <img src="public/OpenArgLogo.ico" alt="OpenArg Logo" width="120" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Gemini_2.5-AI-blue?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel" />
</p>

<h1 align="center">🇦🇷 OpenArg</h1>

<p align="center">
  <b>Plataforma de Inteligencia sobre Datos Abiertos de Argentina</b><br/>
  Conectando los datos públicos de todo el país con IA multi-agente
</p>

<p align="center">
  <a href="#arquitectura">Arquitectura</a> •
  <a href="#características">Características</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#despliegue">Despliegue</a> •
  <a href="#fuentes-de-datos">Fuentes de Datos</a>
</p>

---

## ¿Qué es OpenArg?

OpenArg es una plataforma web que permite a cualquier persona hacer preguntas complejas sobre datos públicos argentinos en lenguaje natural y recibir análisis inteligentes con visualizaciones y fuentes verificables.

Bajo el capó, un sistema de **4 agentes de IA especializados** (inspirado en el framework de *Agentic Reasoning*) trabajan en conjunto para planificar, recolectar, analizar y sintetizar información de los portales de datos abiertos de Argentina.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO                              │
│              Pregunta en lenguaje natural                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│                 🎯 ORCHESTRATOR                           │
│            (API Route — SSE Streaming)                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│   FASE 1 → 🧠 Planner Agent                              │
│   Descompone la consulta en sub-tareas con JSON           │
│                                                           │
│   FASE 2 → 📡 Data Agent                                 │
│   Ejecuta recolección contra APIs argentinas              │
│   ┌──────────┐  ┌──────────────┐  ┌─────────┐           │
│   │   CKAN   │  │ Series de    │  │ Georef  │           │
│   │ 8 portals│  │ Tiempo API   │  │   API   │           │
│   └─────┬────┘  └──────────────┘  └─────────┘           │
│         │ Fallback: Datastore → CSV directo → metadata   │
│                                                           │
│   FASE 3 → 🔬 Analysis Agent (Gemini 2.5)                │
│   Analiza datos con Explicit Thinking + genera insights   │
│                                                           │
│   FASE 4 → ✨ Memory Agent (Mind-Map)                    │
│   Mantiene contexto, resume hallazgos, sugiere follow-ups │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Características

| Feature | Descripción |
|---------|-------------|
| 🧠 **IA Multi-Agente** | 4 agentes especializados con Dynamic Re-roling sobre Gemini 2.5 |
| 📡 **8 Portales CKAN** | datos.gob.ar, CABA, Buenos Aires, Córdoba, Santa Fe, Mendoza, Entre Ríos, Diputados |
| 📈 **Series de Tiempo** | Inflación, PBI, tipo de cambio, empleo y +1000 indicadores |
| 🗺️ **Georef** | Normalización de provincias, departamentos, municipios y localidades |
| 📥 **Análisis CSV Directo** | Descarga y parseo automático de archivos CSV cuando el Datastore no está habilitado |
| 💬 **Chat Streaming** | Respuestas en tiempo real con SSE y barra de actividad de agentes |
| 📊 **Visualizaciones** | Gráficos de línea, barras y torta con Recharts, generados automáticamente |
| 📎 **Fuentes Citadas** | Cada respuesta incluye links a los datasets originales |
| 🧩 **Memoria Conversacional** | El sistema recuerda contexto entre turnos y evita repeticiones |

---

## Instalación

### Prerrequisitos

- **Node.js** 18+
- **npm** 9+
- **API Key de Gemini** ([Google AI Studio](https://aistudio.google.com/))

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/dantedeagostino/OpenArg.git
cd OpenArg

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tu GEMINI_API_KEY

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Despliegue

### Vercel (Recomendado)

1. Push a GitHub
2. Conectar el repo en [vercel.com](https://vercel.com)
3. Agregar variable de entorno: `GEMINI_API_KEY`
4. Deploy automático ✅

El archivo `vercel.json` configura un timeout de 60s para el endpoint `/api/chat` (necesario para el pipeline multi-agente).

---

## Fuentes de Datos

| Portal | URL | Cobertura |
|--------|-----|-----------|
| **Nacional** | [datos.gob.ar](https://datos.gob.ar) | 1200+ datasets: economía, salud, energía, transporte |
| **CABA** | [data.buenosaires.gob.ar](https://data.buenosaires.gob.ar) | Movilidad, presupuesto, educación |
| **Buenos Aires** | [catalogo.datos.gba.gob.ar](https://catalogo.datos.gba.gob.ar) | Salud, género, estadísticas |
| **Córdoba** | [gobiernoabierto.cordoba.gob.ar](https://gobiernoabierto.cordoba.gob.ar) | Transparencia, catastro |
| **Santa Fe** | [datos.santafe.gob.ar](https://datos.santafe.gob.ar) | Compras, licitaciones |
| **Mendoza** | [datosabiertos.mendoza.gov.ar](https://datosabiertos.mendoza.gov.ar) | Presupuesto, subsidios |
| **Entre Ríos** | [datos.entrerios.gov.ar](https://datos.entrerios.gov.ar) | ODS, comunas |
| **Diputados** | [datos.hcdn.gob.ar](https://datos.hcdn.gob.ar) | Legisladores, proyectos, leyes, comisiones, presupuesto |
| **Series de Tiempo** | [apis.datos.gob.ar/series](https://apis.datos.gob.ar/series) | Indicadores económicos y sociales |
| **Georef** | [apis.datos.gob.ar/georef](https://apis.datos.gob.ar/georef) | Entidades geográficas |

---

## Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: CSS con glassmorphism + paleta Argentina
- **IA**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **Visualización**: Recharts
- **Markdown**: react-markdown + remark-gfm
- **Deploy**: Vercel (serverless)

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/chat/route.ts       # Orchestrator — pipeline de 4 fases
│   ├── chat/page.tsx           # Interfaz de chat
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Layout + SEO
│   └── globals.css             # Design system
├── components/
│   ├── AgentActivityBar.tsx    # Indicador de fases
│   ├── ChatMessage.tsx         # Renderizado de mensajes
│   ├── DataChart.tsx           # Gráficos interactivos
│   └── SourcePanel.tsx         # Panel de fuentes
└── lib/
    ├── agents/
    │   ├── gemini.ts           # Cliente Gemini compartido
    │   ├── planner.ts          # Agente Planificador
    │   ├── dataAgent.ts        # Agente de Datos
    │   ├── analysisAgent.ts    # Agente de Análisis
    │   ├── memoryAgent.ts      # Agente de Memoria
    │   └── types.ts            # Sistema de tipos
    └── connectors/
        ├── ckan.ts             # Conector CKAN (8 portales + CSV directo)
        ├── seriesTiempo.ts     # Conector Series de Tiempo
        ├── georef.ts           # Conector Georef
        └── types.ts            # Tipos de conectores
```

---

## Licencia

MIT

---

<p align="center">
  Creado con pasión por <b>Dante De Agostino</b><br/>
  Powered by <a href="https://colossuslab.tech"><b>Colossuslab.tech</b></a>
</p>

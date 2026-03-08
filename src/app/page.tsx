'use client';

import Image from "next/image";
import Link from "next/link";
import GradientText from "@/components/reactbits/GradientText";
import ShinyText from "@/components/reactbits/ShinyText";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import StarBorder from "@/components/reactbits/StarBorder";
import Noise from "@/components/reactbits/Noise";
import FadeIn from "@/components/reactbits/FadeIn";
import DecryptedText from "@/components/reactbits/DecryptedText";
import BlurText from "@/components/reactbits/BlurText";

export default function HomePage() {
  return (
    <main className="landing-container">
      {/* Background effects */}
      <div className="landing-bg-glow" aria-hidden="true" />
      <div className="landing-bg-grid" aria-hidden="true" />
      <Noise patternAlpha={8} patternRefreshInterval={3} />

      {/* Logo mark */}
      <div className="hero-logo" aria-hidden="true">
        <Image src="/flag-icon.svg" alt="" width={56} height={56} priority />
      </div>

      <FadeIn delay={0.1} direction="none" blur>
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          <ShinyText
            text="Plataforma de Inteligencia de Datos Abiertos"
            speed={3}
            color="var(--text-secondary)"
            shineColor="var(--celeste-bright)"
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.25} direction="up" distance={20} blur>
        <h1 className="hero-title">
          <GradientText colors={["#74ACDF", "#FFFFFF", "#F6B40E"]} animationSpeed={8}>
            OpenArg
          </GradientText>
        </h1>
      </FadeIn>

      <FadeIn delay={0.4} direction="up" distance={15}>
        <p className="hero-subtitle">
          Pregunt&aacute; lo que quieras sobre los datos p&uacute;blicos{" "}
          <span style={{ whiteSpace: "nowrap" }}>de Argentina.</span>
          <br />
          IA multi-agente busca, analiza y visualiza informaci&oacute;n de{" "}
          <strong>30 portales</strong> en tiempo real.
        </p>
      </FadeIn>

      <FadeIn delay={0.55} direction="up" distance={15}>
        <div className="hero-actions">
          <StarBorder as="div" color="rgba(116, 172, 223, 0.5)" speed="8s">
            <Link href="/chat" className="hero-cta">
              <span>Comenzar an&aacute;lisis</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </StarBorder>

          <Link href="/datasets" className="hero-cta-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Explorar Datasets</span>
          </Link>
        </div>
      </FadeIn>

      {/* Trust bar */}
      <FadeIn delay={0.7} direction="up" distance={10}>
        <div className="hero-trust">
          <div className="hero-trust-item">
            <span className="hero-trust-number">
              <CountUp to={30} duration={2} />
            </span>
            <span className="hero-trust-label">Portales</span>
          </div>
          <div className="hero-trust-divider" />
          <div className="hero-trust-item">
            <span className="hero-trust-number">
              <CountUp to={16000} duration={2.5} suffix="+" />
            </span>
            <span className="hero-trust-label">Datasets</span>
          </div>
          <div className="hero-trust-divider" />
          <div className="hero-trust-item">
            <span className="hero-trust-number">&lt;5s</span>
            <span className="hero-trust-label">Respuesta</span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.85} direction="up" distance={20}>
        <div className="features-grid">
          <SpotlightCard className="feature-card" spotlightColor="rgba(116, 172, 223, 0.12)">
            <div className="feature-card-header">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5" stroke="var(--celeste)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M2 10l8 5 8-5" stroke="var(--celeste)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
                </svg>
              </div>
              <DecryptedText text="Multi-Agente" animateOn="view" speed={40} sequential revealDirection="start" className="feature-title-char" encryptedClassName="feature-title-char encrypted" />
            </div>
            <div className="feature-desc">
              4 agentes IA especializados trabajan en equipo: planificaci&oacute;n,
              recolecci&oacute;n, an&aacute;lisis y s&iacute;ntesis.
            </div>
          </SpotlightCard>

          <SpotlightCard className="feature-card" spotlightColor="rgba(116, 172, 223, 0.12)">
            <div className="feature-card-header">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="8" width="3" height="10" rx="1" fill="var(--celeste)" opacity="0.4"/>
                  <rect x="7" y="5" width="3" height="13" rx="1" fill="var(--celeste)" opacity="0.6"/>
                  <rect x="12" y="2" width="3" height="16" rx="1" fill="var(--celeste)" opacity="0.8"/>
                  <rect x="17" y="6" width="1" height="12" rx="0.5" fill="var(--sol)" opacity="0.7"/>
                </svg>
              </div>
              <DecryptedText text="Datos Reales" animateOn="view" speed={40} sequential revealDirection="start" className="feature-title-char" encryptedClassName="feature-title-char encrypted" />
            </div>
            <div className="feature-desc">
              Series de tiempo, presupuesto, BCRA, INDEC, compras p&uacute;blicas,
              DDJJ patrimoniales y m&aacute;s.
            </div>
          </SpotlightCard>

          <SpotlightCard className="feature-card" spotlightColor="rgba(116, 172, 223, 0.12)">
            <div className="feature-card-header">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7" stroke="var(--celeste)" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M10 6v4l3 2" stroke="var(--sol)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <DecryptedText text="Tiempo Real" animateOn="view" speed={40} sequential revealDirection="start" className="feature-title-char" encryptedClassName="feature-title-char encrypted" />
            </div>
            <div className="feature-desc">
              Indicadores econ&oacute;micos, datos geogr&aacute;ficos y
              visualizaciones autom&aacute;ticas con gr&aacute;ficos interactivos.
            </div>
          </SpotlightCard>
        </div>
      </FadeIn>

      <footer className="landing-footer">
        <span className="landing-footer-line" />
        <span>Powered by{" "}
          <a href="https://colossuslab.tech" target="_blank" rel="noopener noreferrer" className="landing-footer-link">
            ColossusLab.tech
          </a>
        </span>
      </footer>
    </main>
  );
}

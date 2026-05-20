'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import FadeIn from '@/components/reactbits/FadeIn';
import RotatingText from '@/components/reactbits/RotatingText';

interface Props {
    suggestions: string[];
    portals: number;
    onSendSuggestion: (suggestion: string) => void;
    composer: ReactNode;
}

export default function ChatWelcome({ suggestions, onSendSuggestion, composer }: Props) {
    const t = useTranslations('chat');

    return (
        <div className="chat-hero">
            <FadeIn direction="up" distance={12} duration={0.5}>
                <h1 className="chat-hero-title">{t('heroTitle')}</h1>
            </FadeIn>

            <FadeIn delay={0.1} direction="up" distance={10} duration={0.5}>
                <RotatingText
                    texts={[
                        t('welcomeRotating1'),
                        t('welcomeRotating2'),
                        t('welcomeRotating3'),
                        t('welcomeRotating4'),
                        t('welcomeRotating5'),
                    ]}
                    rotationInterval={3000}
                    staggerDuration={0.03}
                    splitBy="characters"
                    mainClassName="chat-hero-rotating"
                    elementLevelClassName="welcome-rotating-char"
                />
            </FadeIn>

            <FadeIn delay={0.2} direction="up" distance={16} duration={0.55}>
                <div className="chat-hero-composer">
                    <div className="chat-hero-glow" aria-hidden="true" />
                    {composer}
                </div>
            </FadeIn>

            <div className="welcome-suggestions chat-hero-suggestions">
                {suggestions.map((suggestion, index) => (
                    <FadeIn
                        key={`${index}-${suggestion}`}
                        delay={0.35 + index * 0.08}
                        direction="up"
                        distance={12}
                    >
                        <button
                            className="suggestion-chip glass-light"
                            onClick={() => onSendSuggestion(suggestion)}
                        >
                            {suggestion}
                        </button>
                    </FadeIn>
                ))}
            </div>
        </div>
    );
}

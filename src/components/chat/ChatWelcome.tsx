'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import BlurText from '@/components/reactbits/BlurText';
import DecryptedText from '@/components/reactbits/DecryptedText';
import FadeIn from '@/components/reactbits/FadeIn';
import Magnet from '@/components/reactbits/Magnet';
import RotatingText from '@/components/reactbits/RotatingText';

interface Props {
    suggestions: string[];
    portals: number;
    onSendSuggestion: (suggestion: string) => void;
}

export default function ChatWelcome({ suggestions, portals, onSendSuggestion }: Props) {
    const t = useTranslations('chat');

    return (
        <div className="welcome-container">
            <Magnet padding={80} magnetStrength={3}>
                <Image
                    src="/flag-icon.svg"
                    alt="OpenArg"
                    width={88}
                    height={88}
                    className="welcome-icon"
                />
            </Magnet>
            <h2 className="welcome-title">
                <DecryptedText
                    text={t('welcomeTitle')}
                    animateOn="view"
                    speed={30}
                    sequential
                    revealDirection="center"
                    className="welcome-decrypted-char"
                    encryptedClassName="welcome-decrypted-char encrypted"
                />
            </h2>
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
                mainClassName="welcome-rotating"
                elementLevelClassName="welcome-rotating-char"
            />
            <BlurText
                text={t('welcomeSubtitle', { portals })}
                className="welcome-subtitle"
                delay={80}
                animateBy="words"
                direction="bottom"
                stepDuration={0.3}
            />
            <div className="welcome-suggestions">
                {suggestions.map((suggestion, index) => (
                    <FadeIn key={`${index}-${suggestion}`} delay={0.6 + index * 0.1} direction="up" distance={15}>
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


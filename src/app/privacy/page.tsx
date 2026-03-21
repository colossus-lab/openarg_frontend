'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PrivacyPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [needsAcceptance, setNeedsAcceptance] = useState(false);
    const [accepting, setAccepting] = useState(false);

    // Check if user is logged in but hasn't accepted privacy
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) return;
        fetch('/api/users/me')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data && !data.privacy_accepted_at) {
                    setNeedsAcceptance(true);
                }
            })
            .catch(() => {});
    }, [status, session]);

    const handleAccept = async () => {
        setAccepting(true);
        try {
            const res = await fetch('/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    privacy_accepted_at: new Date().toISOString(),
                }),
            });
            if (!res.ok) throw new Error('Failed to save');
            // Notify UserSyncProvider that privacy was accepted
            window.dispatchEvent(new Event('privacy-accepted'));
            router.replace('/chat');
        } catch {
            setAccepting(false);
            alert('Error al guardar. Intentá de nuevo.');
        }
    };

    const showBackLink = !needsAcceptance;

    return (
        <div className="privacy-container">
            <header className="privacy-header">
                <a href="/" className="privacy-header-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/flag-icon.svg" alt="OpenArg" width={28} height={28} />
                    OpenArg
                </a>
                <ThemeToggle />
            </header>
            <div className="privacy-card">
                {showBackLink && (
                    <button onClick={() => router.back()} className="privacy-back">
                        &larr; Volver
                    </button>
                )}

                <h1 className="privacy-title">Pol&iacute;tica de Privacidad</h1>
                <p className="privacy-updated">
                    &Uacute;ltima actualizaci&oacute;n: 21 de marzo de 2026
                </p>

                <p className="privacy-intro">
                    OpenArg es una plataforma desarrollada por{' '}
                    <a href="https://colossuslab.tech" target="_blank" rel="noopener noreferrer">
                        ColossusLab.tech
                    </a>{' '}
                    para el an&aacute;lisis de datos abiertos gubernamentales de Argentina.
                    Esta pol&iacute;tica describe c&oacute;mo tratamos tu informaci&oacute;n
                    personal en cumplimiento con la Ley 25.326 de Protecci&oacute;n de Datos
                    Personales de la Rep&uacute;blica Argentina.
                </p>

                <section className="privacy-section">
                    <h2>1. Qu&eacute; datos recopilamos</h2>
                    <p>
                        Cuando inici&aacute;s sesi&oacute;n con Google OAuth, recopilamos
                        &uacute;nicamente:
                    </p>
                    <ul>
                        <li>
                            <strong>Email:</strong> tu direcci&oacute;n de correo electr&oacute;nico
                            de Google.
                        </li>
                        <li>
                            <strong>Nombre:</strong> tu nombre de perfil de Google.
                        </li>
                        <li>
                            <strong>Foto de perfil:</strong> la imagen asociada a tu cuenta de
                            Google.
                        </li>
                        <li>
                            <strong>Historial de conversaciones:</strong> las consultas que
                            realiz&aacute;s y las respuestas generadas por la plataforma.
                        </li>
                    </ul>
                    <p>
                        No recopilamos datos sensibles, ni accedemos a tu cuenta de Google
                        m&aacute;s all&aacute; de la informaci&oacute;n b&aacute;sica de perfil.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>2. Para qu&eacute; usamos tus datos</h2>
                    <ul>
                        <li>
                            <strong>Autenticaci&oacute;n:</strong> verificar tu identidad e
                            identificar tu cuenta.
                        </li>
                        <li>
                            <strong>Personalizaci&oacute;n:</strong> mantener tu historial de
                            conversaciones y preferencias.
                        </li>
                        <li>
                            <strong>Mejora del servicio:</strong> entender c&oacute;mo se usa la
                            plataforma para mejorarla.
                        </li>
                    </ul>
                    <p>
                        No vendemos ni compartimos tus datos personales con terceros.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>3. C&oacute;mo protegemos tus datos</h2>
                    <ul>
                        <li>
                            <strong>HTTPS:</strong> toda la comunicaci&oacute;n entre tu navegador
                            y nuestros servidores est&aacute; cifrada con TLS.
                        </li>
                        <li>
                            <strong>Cookies HttpOnly:</strong> la cookie de sesi&oacute;n no es
                            accesible desde JavaScript, previniendo ataques XSS.
                        </li>
                        <li>
                            <strong>Base de datos:</strong> los datos se almacenan en servidores
                            con cifrado en tr&aacute;nsito y acceso restringido.
                        </li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2>4. Retenci&oacute;n de datos</h2>
                    <p>
                        Conservamos tus datos personales mientras tu cuenta est&eacute; activa.
                        Pod&eacute;s eliminar tu cuenta y todos los datos asociados en cualquier
                        momento desde el men&uacute; de usuario.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>5. Tus derechos (ARCO)</h2>
                    <p>
                        De acuerdo con la Ley 25.326, ten&eacute;s los siguientes derechos sobre
                        tus datos personales:
                    </p>
                    <ul>
                        <li>
                            <strong>Acceso:</strong> pod&eacute;s exportar todos tus datos en
                            formato JSON desde el men&uacute; de usuario
                            (&ldquo;Exportar mis datos&rdquo;).
                        </li>
                        <li>
                            <strong>Rectificaci&oacute;n:</strong> tus datos de perfil provienen
                            de Google; para modificarlos, actualiz&aacute; tu cuenta de Google.
                        </li>
                        <li>
                            <strong>Cancelaci&oacute;n (Supresi&oacute;n):</strong> pod&eacute;s
                            borrar tu cuenta y todos tus datos desde el men&uacute; de usuario
                            (&ldquo;Borrar mi cuenta&rdquo;). La eliminaci&oacute;n es permanente
                            e irreversible.
                        </li>
                        <li>
                            <strong>Oposici&oacute;n:</strong> pod&eacute;s dejar de usar la
                            plataforma y solicitar la eliminaci&oacute;n de tus datos en cualquier
                            momento.
                        </li>
                    </ul>
                    <p>
                        Para ejercer cualquiera de estos derechos, pod&eacute;s usar las
                        funciones del men&uacute; de usuario o contactarnos a{' '}
                        <a href="mailto:admin@colossuslab.org">admin@colossuslab.org</a>.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>6. Datos p&uacute;blicos gubernamentales</h2>
                    <p>
                        Los datos gubernamentales que muestra OpenArg (presupuesto, series
                        econ&oacute;micas, declaraciones juradas, etc.) son de acceso
                        p&uacute;blico, publicados por organismos del Estado argentino en sus
                        portales de datos abiertos. OpenArg no recopila ni almacena datos
                        personales de terceros a trav&eacute;s de estos portales.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>7. Cookies</h2>
                    <p>
                        OpenArg utiliza &uacute;nicamente una cookie de sesi&oacute;n
                        (HttpOnly, Secure) necesaria para mantener tu sesi&oacute;n activa.
                        No usamos cookies de seguimiento, anal&iacute;ticas ni publicitarias.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>8. Cambios a esta pol&iacute;tica</h2>
                    <p>
                        Si realizamos cambios sustanciales a esta pol&iacute;tica, te
                        notificaremos por email a la direcci&oacute;n asociada a tu cuenta.
                        Te recomendamos revisar esta p&aacute;gina peri&oacute;dicamente.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>9. Contacto</h2>
                    <p>
                        Si ten&eacute;s preguntas sobre esta pol&iacute;tica o sobre el
                        tratamiento de tus datos, escrib&iacute; a{' '}
                        <a href="mailto:admin@colossuslab.org">admin@colossuslab.org</a>.
                    </p>
                </section>

                {needsAcceptance && (
                    <div className="privacy-accept-bar">
                        <p>Para usar OpenArg necesit&aacute;s aceptar esta pol&iacute;tica de privacidad.</p>
                        <button
                            className="privacy-accept-btn"
                            onClick={handleAccept}
                            disabled={accepting}
                        >
                            {accepting ? 'Aceptando...' : 'Acepto la Pol\u00edtica de Privacidad'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PROTECTED_PATHS = ['/chat', '/datasets'];
const PRIVACY_CACHE_KEY = 'openarg-privacy-ok';

function getCachedPrivacy(): 'accepted' | null {
    try {
        return sessionStorage.getItem(PRIVACY_CACHE_KEY) ? 'accepted' : null;
    } catch {
        return null;
    }
}

function setCachedPrivacy() {
    try { sessionStorage.setItem(PRIVACY_CACHE_KEY, '1'); } catch {}
}

function clearCachedPrivacy() {
    try { sessionStorage.removeItem(PRIVACY_CACHE_KEY); } catch {}
}

export default function UserSyncProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const syncedEmailRef = useRef<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const [privacyStatus, setPrivacyStatus] = useState<'unknown' | 'accepted' | 'pending'>(
        () => getCachedPrivacy() || 'unknown',
    );

    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) {
            return;
        }

        // If already cached as accepted, skip the fetch
        if (privacyStatus === 'accepted') {
            // Still do the sync if not done yet (but don't block)
            if (syncedEmailRef.current !== session.user.email) {
                fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: session.user.email,
                        name: session.user.name || '',
                        image: session.user.image || '',
                    }),
                }).then(() => { syncedEmailRef.current = session.user!.email!; }).catch(() => {});
            }
            return;
        }

        const email = session.user.email;

        const doSync = async () => {
            try {
                const syncRes = await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        name: session.user.name || '',
                        image: session.user.image || '',
                    }),
                });
                if (syncRes.ok) {
                    syncedEmailRef.current = email;
                    const data = await syncRes.json();
                    if (data.privacy_accepted_at) {
                        setPrivacyStatus('accepted');
                        setCachedPrivacy();
                    } else {
                        setPrivacyStatus('pending');
                    }
                }
            } catch {
                setPrivacyStatus('accepted');
                setCachedPrivacy();
            }
        };

        doSync();
    }, [session, status, pathname, privacyStatus]);

    // Redirect to /privacy if pending and on a protected page
    useEffect(() => {
        if (privacyStatus === 'pending' && isProtected) {
            router.replace('/privacy');
        }
    }, [privacyStatus, isProtected, router]);

    // Listen for privacy acceptance from /privacy page
    useEffect(() => {
        const handler = () => {
            setPrivacyStatus('accepted');
            setCachedPrivacy();
        };
        window.addEventListener('privacy-accepted', handler);
        return () => window.removeEventListener('privacy-accepted', handler);
    }, []);

    // Reset on sign-out
    useEffect(() => {
        if (status === 'unauthenticated') {
            syncedEmailRef.current = null;
            setPrivacyStatus('unknown');
            clearCachedPrivacy();
        }
    }, [status]);

    return <>{children}</>;
}

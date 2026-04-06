'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PROTECTED_PATHS = ['/chat', '/datasets'];

export default function UserSyncProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const syncedEmailRef = useRef<string | null>(null);
    const privacyVerifiedRef = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const [privacyStatus, setPrivacyStatus] = useState<'unknown' | 'accepted' | 'pending'>('unknown');

    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    const effectivePrivacyStatus = status === 'unauthenticated' ? 'unknown' : privacyStatus;

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) {
            return;
        }

        const email = session.user.email;

        // If already synced and privacy verified, just check on route change
        if (syncedEmailRef.current === email && privacyVerifiedRef.current) {
            return;
        }

        const doSync = async () => {
            try {
                const syncRes = await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        name: session.user?.name || '',
                        image: session.user?.image || '',
                    }),
                });
                if (syncRes.ok) {
                    syncedEmailRef.current = email;
                    const data = await syncRes.json();
                    if (data.privacy_accepted_at) {
                        setPrivacyStatus('accepted');
                        privacyVerifiedRef.current = true;
                    } else {
                        setPrivacyStatus('pending');
                    }
                }
            } catch {
                // SECURITY: Don't assume acceptance on error
            }
        };

        doSync();
    }, [session, status, pathname]);

    // Redirect to /privacy if pending and on a protected page
    useEffect(() => {
        if (effectivePrivacyStatus === 'pending' && isProtected) {
            router.replace('/privacy');
        }
    }, [effectivePrivacyStatus, isProtected, router]);

    // Listen for privacy acceptance from /privacy page
    useEffect(() => {
        const handler = () => {
            setPrivacyStatus('accepted');
            privacyVerifiedRef.current = true;
        };
        window.addEventListener('privacy-accepted', handler);
        return () => window.removeEventListener('privacy-accepted', handler);
    }, []);

    // Reset on sign-out
    useEffect(() => {
        if (status === 'unauthenticated') {
            syncedEmailRef.current = null;
            privacyVerifiedRef.current = false;
        }
    }, [status]);

    return <>{children}</>;
}

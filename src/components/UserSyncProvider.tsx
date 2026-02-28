'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

export default function UserSyncProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const syncedEmailRef = useRef<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) {
            return;
        }

        // Skip if already synced this email (handles re-auth / account switch)
        if (syncedEmailRef.current === session.user.email) {
            return;
        }

        const email = session.user.email;

        fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: session.user.name || '',
                image: session.user.image || '',
            }),
        })
            .then((res) => {
                if (res.ok) {
                    syncedEmailRef.current = email;
                }
            })
            .catch(() => {
                // Non-critical — will retry next render cycle
            });
    }, [session, status]);

    // Reset on sign-out
    useEffect(() => {
        if (status === 'unauthenticated') {
            syncedEmailRef.current = null;
        }
    }, [status]);

    return <>{children}</>;
}

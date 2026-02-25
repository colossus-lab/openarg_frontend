'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function UserMenu() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <div className="user-menu-skeleton" />;
    }

    if (!session) {
        return (
            <button className="user-login-btn" onClick={() => signIn('google')}>
                Iniciar sesión
            </button>
        );
    }

    return (
        <div className="user-menu">
            {session.user?.image ? (
                <Image
                    src={session.user.image}
                    alt={session.user.name || 'Usuario'}
                    width={28}
                    height={28}
                    className="user-menu-avatar"
                />
            ) : (
                <div className="user-menu-avatar-placeholder">
                    {session.user?.name?.charAt(0) || '?'}
                </div>
            )}
            <span className="user-menu-name">{session.user?.name?.split(' ')[0]}</span>
            <button className="user-logout-btn" onClick={() => signOut()} title="Cerrar sesión">
                ✕
            </button>
        </div>
    );
}

'use client';

import { Home, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-pb">
            <div className="flex max-w-2xl mx-auto">
                <Link
                    href="/"
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${pathname === '/' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Home className="w-5 h-5" />
                    <span>ホーム</span>
                </Link>
                <Link
                    href="/history"
                    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${pathname === '/history' ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <BarChart2 className="w-5 h-5" />
                    <span>履歴</span>
                </Link>
            </div>
        </nav>
    );
}

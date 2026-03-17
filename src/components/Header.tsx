'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Header() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get date from URL or default to today
    const dateParam = searchParams.get('date');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const displayDateStr = dateParam || todayStr;
    const currentDate = parseISO(displayDateStr);

    // Format for display
    const isToday = displayDateStr === todayStr;
    const displayDate = isToday
        ? `今日（${format(currentDate, 'M/d', { locale: ja })}）`
        : format(currentDate, 'M月d日(E)', { locale: ja });

    const handlePrevDay = () => {
        const prev = subDays(currentDate, 1);
        router.push(`/?date=${format(prev, 'yyyy-MM-dd')}`);
    };

    const handleNextDay = () => {
        if (isToday) return; // Prevent navigating past today
        const next = addDays(currentDate, 1);
        router.push(`/?date=${format(next, 'yyyy-MM-dd')}`);
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-2xl mx-auto">
                <h1 className="text-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
                    CaloTrack AI
                </h1>
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 text-slate-700 font-medium min-w-[100px] justify-center text-sm sm:text-base">
                        <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                        <span>{displayDate}</span>
                    </div>

                    <button
                        onClick={handleNextDay}
                        disabled={isToday}
                        className={`p-2 rounded-full transition-colors ${isToday
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                            }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}

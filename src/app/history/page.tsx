'use client';

import { useState, useEffect } from 'react';
import { getMealsByDateRange, MealRecord } from '@/lib/db/meals';
import { format, subDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Flame, Beef, Droplet, Wheat } from 'lucide-react';

type DaySummary = {
    date: string;
    label: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    salt: number;
};

const GOAL_CALORIES = 2000;

export default function HistoryPage() {
    const [weekData, setWeekData] = useState<DaySummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWeekData = async () => {
            try {
                const today = format(new Date(), 'yyyy-MM-dd');
                const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
                const meals = await getMealsByDateRange(sevenDaysAgo, today);

                // Aggregate by date
                const byDate: Record<string, MealRecord[]> = {};
                for (let i = 6; i >= 0; i--) {
                    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
                    byDate[d] = [];
                }
                meals.forEach(meal => {
                    if (byDate[meal.date]) byDate[meal.date].push(meal);
                });

                const summaries: DaySummary[] = Object.entries(byDate).map(([date, dayMeals]) => {
                    const totals = dayMeals.reduce((acc, m) => ({
                        calories: acc.calories + (m.nutritionalData?.calories || 0),
                        protein: acc.protein + (m.nutritionalData?.protein || 0),
                        fat: acc.fat + (m.nutritionalData?.fat || 0),
                        carbs: acc.carbs + (m.nutritionalData?.carbs || 0),
                        salt: acc.salt + (m.nutritionalData?.salt || 0),
                    }), { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0 });

                    const isToday = date === today;
                    const label = isToday ? '今日' : format(parseISO(date), 'M/d(E)', { locale: ja });
                    return { date, label, ...totals };
                });

                setWeekData(summaries);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadWeekData();
    }, []);

    const maxCalories = Math.max(...weekData.map(d => d.calories), GOAL_CALORIES);
    const totalCalories = weekData.reduce((acc, d) => acc + d.calories, 0);
    const avgCalories = weekData.length > 0 ? Math.round(totalCalories / weekData.filter(d => d.calories > 0).length || 0) : 0;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="flex items-center gap-3 px-4 sm:px-6 h-16 max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="p-2 -ml-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">過去7日間の記録</h1>
                </div>
            </header>

            <main className="w-full max-w-2xl mx-auto px-3 py-5 sm:p-6 space-y-5">
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="w-8 h-8 border-2 border-teal-500 rounded-full animate-spin border-t-transparent" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <SummaryCard
                                icon={<Flame className="w-4 h-4 text-orange-500" />}
                                label="平均カロリー"
                                value={isNaN(avgCalories) ? '0' : avgCalories.toLocaleString()}
                                unit="kcal"
                            />
                            <SummaryCard
                                icon={<TrendingUp className="w-4 h-4 text-teal-500" />}
                                label="7日間合計"
                                value={Math.round(totalCalories).toLocaleString()}
                                unit="kcal"
                            />
                            <SummaryCard
                                icon={<Beef className="w-4 h-4 text-blue-500" />}
                                label="平均タンパク質"
                                value={Math.round(weekData.reduce((a, d) => a + d.protein, 0) / Math.max(weekData.filter(d => d.calories > 0).length, 1))}
                                unit="g"
                            />
                            <SummaryCard
                                icon={<Wheat className="w-4 h-4 text-green-500" />}
                                label="平均炭水化物"
                                value={Math.round(weekData.reduce((a, d) => a + d.carbs, 0) / Math.max(weekData.filter(d => d.calories > 0).length, 1))}
                                unit="g"
                            />
                        </div>

                        {/* Bar Chart */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-base font-semibold text-slate-700">カロリー推移</h2>
                                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">目標: {GOAL_CALORIES}kcal</span>
                            </div>

                            {/* Goal line + bars */}
                            <div className="relative">
                                {/* Goal dashed line */}
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-dashed border-teal-300/70 z-10"
                                    style={{ bottom: `${(GOAL_CALORIES / maxCalories) * 160}px` }}
                                >
                                    <span className="absolute -top-5 right-0 text-xs text-teal-500 font-medium">目標</span>
                                </div>

                                {/* Bars */}
                                <div className="flex items-end justify-between gap-1.5 h-40 pt-6">
                                    {weekData.map((day) => {
                                        const height = day.calories > 0
                                            ? Math.max((day.calories / maxCalories) * 160, 4)
                                            : 0;
                                        const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                                        const isOverGoal = day.calories > GOAL_CALORIES;
                                        return (
                                            <Link
                                                href={`/?date=${day.date}`}
                                                key={day.date}
                                                className="flex-1 flex flex-col items-center gap-1 group"
                                            >
                                                {day.calories > 0 && (
                                                    <span className="text-xs font-medium text-slate-500 group-hover:text-teal-600 transition-colors">
                                                        {Math.round(day.calories)}
                                                    </span>
                                                )}
                                                <div className="w-full flex items-end" style={{ height: '100px' }}>
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all duration-500 ease-out inline-block ${day.calories === 0
                                                                ? 'bg-slate-100'
                                                                : isOverGoal
                                                                    ? 'bg-orange-400 group-hover:bg-orange-500'
                                                                    : isToday
                                                                        ? 'bg-teal-500 group-hover:bg-teal-600'
                                                                        : 'bg-teal-300 group-hover:bg-teal-400'
                                                            }`}
                                                        style={{ height: day.calories === 0 ? '4px' : `${(height / 160) * 100}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-medium ${isToday ? 'text-teal-600' : 'text-slate-400'}`}>
                                                    {day.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* Day Cards */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <h2 className="text-base font-semibold text-slate-700 mb-4">日別詳細</h2>
                            <div className="divide-y divide-slate-50">
                                {[...weekData].reverse().map((day) => (
                                    <Link
                                        key={day.date}
                                        href={`/?date=${day.date}`}
                                        className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors group"
                                    >
                                        <div>
                                            <p className={`font-semibold text-sm ${day.date === format(new Date(), 'yyyy-MM-dd')
                                                    ? 'text-teal-600'
                                                    : 'text-slate-700'
                                                }`}>{day.label}</p>
                                            <p className="text-xs text-slate-400">{day.date}</p>
                                        </div>
                                        {day.calories > 0 ? (
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">{Math.round(day.calories)} <span className="text-xs font-normal text-slate-500">kcal</span></p>
                                                <p className="text-xs text-slate-400">
                                                    P:{Math.round(day.protein)}g F:{Math.round(day.fat)}g C:{Math.round(day.carbs)}g
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">記録なし</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

function SummaryCard({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string | number, unit: string }) {
    return (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{value} <span className="text-xs font-normal text-slate-500">{unit}</span></p>
        </div>
    );
}

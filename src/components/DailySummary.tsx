'use client';

import { useState, useEffect } from 'react';
import { getMealsByDate, MealRecord } from '@/lib/db/meals';

export default function DailySummary({ selectedDate }: { selectedDate: string }) {
    const [meals, setMeals] = useState<MealRecord[]>([]);

    useEffect(() => {
        const loadMeals = async () => {
            try {
                const allMeals = await getMealsByDate(selectedDate);
                setMeals(allMeals);
            } catch (e) {
                console.error(e);
            }
        };

        loadMeals();

        const handleUpdate = () => loadMeals();
        window.addEventListener('mealUpdated', handleUpdate);
        return () => window.removeEventListener('mealUpdated', handleUpdate);
    }, [selectedDate]);

    const totals = meals.reduce((acc, meal) => {
        if (!meal.nutritionalData) return acc;
        return {
            calories: acc.calories + (meal.nutritionalData.calories || 0),
            protein: acc.protein + (meal.nutritionalData.protein || 0),
            fat: acc.fat + (meal.nutritionalData.fat || 0),
            carbs: acc.carbs + (meal.nutritionalData.carbs || 0),
            salt: acc.salt + (meal.nutritionalData.salt || 0),
            fiber: acc.fiber + (meal.nutritionalData.fiber || 0),
        };
    }, { calories: 0, protein: 0, fat: 0, carbs: 0, salt: 0, fiber: 0 });

    return (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-800">今日のサマリー</h2>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-stretch">
                <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl w-full">
                    <span className="text-sm font-medium text-slate-500">摂取カロリー</span>
                    <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">{Math.round(totals.calories)}</span>
                        <span className="text-lg text-slate-500">/ 2000 kcal</span>
                    </div>
                </div>

                <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MacroCard label="タンパク質" value={Math.round(totals.protein * 10) / 10} max={100} color="bg-blue-500" />
                    <MacroCard label="脂質" value={Math.round(totals.fat * 10) / 10} max={60} color="bg-orange-500" />
                    <MacroCard label="炭水化物" value={Math.round(totals.carbs * 10) / 10} max={250} color="bg-green-500" />
                    <MacroCard label="塩分" value={Math.round(totals.salt * 10) / 10} max={8} color="bg-slate-400" unit="g" />
                </div>
            </div>
        </section>
    );
}

function MacroCard({ label, value, max, color, unit = "g" }: { label: string, value: number, max: number, color: string, unit?: string }) {
    const percentage = Math.min((value / max) * 100, 100);
    return (
        <div className="flex flex-col p-3 bg-slate-50 rounded-xl relative overflow-hidden group">
            <div className="flex flex-col mb-2 relative z-10">
                <span className="text-xs font-semibold text-slate-500 mb-0.5">{label}</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-slate-800">{value}{unit}</span>
                    <span className="text-xs text-slate-400 font-medium">/ {max}{unit}</span>
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden relative z-10">
                <div className={`h-1.5 rounded-full ${color} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }} />
            </div>
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-5 ${color} blur-2xl group-hover:opacity-10 transition-opacity`}></div>
        </div>
    );
}

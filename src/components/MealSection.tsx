'use client';

import { useState, useEffect } from 'react';
import MealUploadForm from './MealUploadForm';
import MealCard from './MealCard';
import { Plus } from 'lucide-react';
import { getMealsByDate, MealRecord } from '@/lib/db/meals';

type MealSectionProps = {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    title: string;
    selectedDate: string;
};

export default function MealSection({ mealType, title, selectedDate }: MealSectionProps) {
    const [meals, setMeals] = useState<MealRecord[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadMeals = async () => {
        setIsLoading(true);
        try {
            const allMeals = await getMealsByDate(selectedDate);
            setMeals(allMeals.filter(m => m.mealType === mealType));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerUpdate = () => {
        loadMeals();
        window.dispatchEvent(new Event('mealUpdated'));
    };

    useEffect(() => {
        loadMeals();
    }, [mealType, selectedDate]);

    const hasMeal = meals.length > 0;

    return (
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
                {!hasMeal && !isUploading && (
                    <button
                        onClick={() => setIsUploading(true)}
                        className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>記録を追加</span>
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-teal-500 rounded-full animate-spin border-t-transparent" /></div>
            ) : hasMeal ? (
                <div className="flex flex-col gap-4">
                    {meals.map(meal => (
                        <MealCard key={meal.id} mealType={mealType} meal={meal} onEdit={() => { }} onUpdate={triggerUpdate} />
                    ))}
                    {isUploading && (
                        <MealUploadForm
                            mealType={mealType}
                            selectedDate={selectedDate}
                            onCancel={() => setIsUploading(false)}
                            onSuccess={() => { setIsUploading(false); triggerUpdate(); }}
                        />
                    )}
                </div>
            ) : isUploading ? (
                <MealUploadForm
                    mealType={mealType}
                    selectedDate={selectedDate}
                    onCancel={() => setIsUploading(false)}
                    onSuccess={() => { setIsUploading(false); triggerUpdate(); }}
                />
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <p className="text-sm">まだ記録がありません</p>
                </div>
            )}
        </section>
    );
}

import { Edit2, Image as ImageIcon } from 'lucide-react';
import ClarificationChat from './ClarificationChat';
import { useState } from 'react';
import { MealRecord } from '@/lib/db/meals';

type Props = {
    mealType: string;
    meal: MealRecord;
    onEdit: () => void;
    onUpdate: () => void;
};

export default function MealCard({ mealType, meal, onEdit, onUpdate }: Props) {
    const showChat = meal.status === 'needs_clarification' && meal.questions;

    return (
        <div className="flex flex-col gap-4 mt-2">
            <div className="flex gap-4">
                {meal.imageUrl ? (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-slate-200">
                        <img src={meal.imageUrl} alt={meal.name} className="object-cover w-full h-full absolute inset-0" />
                    </div>
                ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-slate-200">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                )}

                <div className="flex flex-col flex-1 justify-between py-1">
                    <div>
                        <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-medium text-slate-700 line-clamp-2 leading-relaxed">{meal.name}</p>
                            <button
                                onClick={onEdit}
                                className="text-slate-400 hover:text-slate-600 p-1.5 -mt-1 -mr-1 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                        <div className="flex items-baseline text-slate-900">
                            <span className="text-3xl font-bold tracking-tight">{meal.nutritionalData.calories}</span>
                            <span className="text-sm font-semibold text-slate-500 ml-1">kcal</span>
                        </div>

                        <div className="flex gap-2 text-xs font-bold">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">P: {meal.nutritionalData.protein}g</span>
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md">F: {meal.nutritionalData.fat}g</span>
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md">C: {meal.nutritionalData.carbs}g</span>
                        </div>
                    </div>
                </div>
            </div>

            {showChat && meal.questions && (
                <div className="mt-3">
                    <ClarificationChat meal={meal} onComplete={onUpdate} />
                </div>
            )}
        </div>
    );
}

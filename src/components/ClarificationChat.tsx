import { Sparkles, Send } from 'lucide-react';
import { useState } from 'react';
import { MealRecord, updateMealRecord } from '@/lib/db/meals';

export default function ClarificationChat({ meal, onComplete }: { meal: MealRecord, onComplete: () => void }) {
    const [reply, setReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/clarify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    previousData: meal.nutritionalData,
                    previousQuestion: meal.questions,
                    userReply: reply
                })
            });

            if (!res.ok) throw new Error('Failed to clarify');

            const aiData = await res.json();

            // Update Firestore
            await updateMealRecord(meal.id, {
                nutritionalData: {
                    calories: aiData.calories ?? meal.nutritionalData.calories,
                    protein: aiData.protein ?? meal.nutritionalData.protein,
                    fat: aiData.fat ?? meal.nutritionalData.fat,
                    carbs: aiData.carbs ?? meal.nutritionalData.carbs,
                    salt: aiData.salt ?? meal.nutritionalData.salt,
                    fiber: aiData.fiber ?? meal.nutritionalData.fiber,
                },
                status: aiData.questions ? 'needs_clarification' : 'confirmed',
                questions: aiData.questions,
            });

            onComplete();
        } catch (error) {
            console.error(error);
            alert('通信エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex flex-col gap-3">
            <div className="flex gap-3 items-start text-amber-900">
                <Sparkles className="w-5 h-5 mt-0.5 text-amber-500 flex-shrink-0" />
                <p className="leading-relaxed font-medium">
                    {meal.questions}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="relative mt-2">
                <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="回答を入力..."
                    disabled={isSubmitting}
                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!reply.trim() || isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-amber-600 hover:bg-amber-100 disabled:opacity-50 disabled:hover:bg-transparent rounded-md transition-colors"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </form>
        </div>
    );
}

'use client';

import { Camera, Image as ImageIcon, Send, X, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { compressImage, uploadMealImage } from '@/lib/storage';
import { saveMealRecord, getMealsByDateRange, MealRecord } from '@/lib/db/meals';
import { format, subDays } from 'date-fns';

type Props = {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    selectedDate: string;
    onCancel: () => void;
    onSuccess: () => void;
};

type Tab = 'new' | 'history';

export default function MealUploadForm({ mealType, selectedDate, onCancel, onSuccess }: Props) {
    const [tab, setTab] = useState<Tab>('new');
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // History tab state
    const [pastMeals, setPastMeals] = useState<MealRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (tab === 'history') {
            setLoadingHistory(true);
            const end = format(subDays(new Date(), 0), 'yyyy-MM-dd');
            const start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
            getMealsByDateRange(start, end)
                .then(meals => {
                    // Deduplicate by name, keep latest
                    const seen = new Set<string>();
                    const unique = meals
                        .filter(m => m.status === 'confirmed' && m.name)
                        .reverse()
                        .filter(m => {
                            if (seen.has(m.name)) return false;
                            seen.add(m.name);
                            return true;
                        });
                    setPastMeals(unique.slice(0, 20));
                })
                .finally(() => setLoadingHistory(false));
        }
    }, [tab]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const clearImage = () => {
        setFile(null);
        setPreviewUrl(null);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    // Re-use a past meal directly (copy nutritional data, no re-analysis needed)
    const handleReuseMeal = async (past: MealRecord) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const mealId = `meal_${Date.now()}`;
            const newRecord: MealRecord = {
                ...past,
                id: mealId,
                date: selectedDate,
                mealType,
                imageUrl: past.imageUrl || '',
                createdAt: Date.now(),
                status: 'confirmed',
                questions: undefined,
                chatHistory: [],
            };
            await saveMealRecord(newRecord);
            onSuccess();
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file && !comment.trim()) {
            alert("画像かコメントのどちらかを入力してください");
            return;
        }

        setIsSubmitting(true);
        try {
            let imageBase64 = '';
            if (file) {
                imageBase64 = await compressImage(file);
            }

            // 1. Analyze with Gemini
            const analyzeResponse = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, comment }),
            });

            if (!analyzeResponse.ok) {
                throw new Error('AIの分析に失敗しました');
            }

            const aiData = await analyzeResponse.json();

            // 2. Upload image to Firebase Storage if exists
            const mealId = `meal_${Date.now()}`;
            let imageUrl = '';
            if (file) {
                imageUrl = await uploadMealImage(file, mealId);
            }

            // 3. Save to Firestore
            const newRecord: MealRecord = {
                id: mealId,
                date: selectedDate,
                mealType,
                imageUrl,
                comment,
                name: aiData.name || '不明な食事',
                nutritionalData: {
                    calories: aiData.calories || 0,
                    protein: aiData.protein || 0,
                    fat: aiData.fat || 0,
                    carbs: aiData.carbs || 0,
                    salt: aiData.salt || 0,
                    fiber: aiData.fiber || 0,
                },
                status: aiData.questions ? 'needs_clarification' : 'confirmed',
                questions: aiData.questions,
                chatHistory: aiData.questions ? [{ role: 'ai', text: aiData.questions }] : [],
                createdAt: Date.now(),
            };

            await saveMealRecord(newRecord);
            onSuccess();

        } catch (error) {
            console.error(error);
            alert('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 mt-2">
            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
                <button
                    type="button"
                    onClick={() => setTab('new')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Camera className="w-4 h-4" />
                    新規入力
                </button>
                <button
                    type="button"
                    onClick={() => setTab('history')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    過去から選ぶ
                </button>
            </div>

            {tab === 'new' ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Hidden inputs */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={galleryInputRef}
                        onChange={handleFileChange}
                    />

                    {!previewUrl ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-teal-400 hover:bg-teal-50/50 transition-colors group"
                            >
                                <Camera className="w-8 h-8 text-slate-400 group-hover:text-teal-500" />
                                <p className="text-sm font-medium text-slate-500 group-hover:text-teal-600">
                                    カメラで撮影
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-teal-400 hover:bg-teal-50/50 transition-colors group"
                            >
                                <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-teal-500" />
                                <p className="text-sm font-medium text-slate-500 group-hover:text-teal-600">
                                    ライブラリから選択
                                </p>
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={clearImage}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent py-2 px-3">
                                <p className="text-white text-xs">タップして写真を変更</p>
                            </div>
                        </div>
                    )}

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="食事の内容や量を補足入力できます（例：ご飯は半膳にしました）"
                        disabled={isSubmitting}
                        className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all resize-none h-24 disabled:opacity-50"
                    />

                    <div className="flex items-center justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!file && !comment.trim())}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-full transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            <span>{isSubmitting ? '分析中...' : '送信・分析する'}</span>
                        </button>
                    </div>
                </form>
            ) : (
                /* History Tab */
                <div className="flex flex-col gap-2">
                    {loadingHistory ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-teal-500 rounded-full animate-spin border-t-transparent" />
                        </div>
                    ) : pastMeals.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">過去30日間の記録がありません</p>
                    ) : (
                        <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
                            {pastMeals.map(past => (
                                <button
                                    key={past.id}
                                    onClick={() => handleReuseMeal(past)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:bg-teal-50/30 transition-colors text-left group disabled:opacity-50"
                                >
                                    {past.imageUrl ? (
                                        <img src={past.imageUrl} alt={past.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-5 h-5 text-slate-300" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-teal-700">{past.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {past.nutritionalData.calories}kcal · P{past.nutritionalData.protein}g · F{past.nutritionalData.fat}g · C{past.nutritionalData.carbs}g
                                        </p>
                                        <p className="text-xs text-slate-300">{past.date}</p>
                                    </div>
                                    <span className="text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">選ぶ</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-colors self-center"
                    >
                        キャンセル
                    </button>
                </div>
            )}
        </div>
    );
}

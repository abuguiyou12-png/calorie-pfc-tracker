import { Camera, Image as ImageIcon, Send, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { fileToBase64, uploadMealImage } from '@/lib/storage';
import { saveMealRecord, MealRecord } from '@/lib/db/meals';

type Props = {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    selectedDate: string;
    onCancel: () => void;
    onSuccess: () => void;
};

export default function MealUploadForm({ mealType, selectedDate, onCancel, onSuccess }: Props) {
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

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
                imageBase64 = await fileToBase64(file);
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
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
    );
}

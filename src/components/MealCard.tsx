'use client';

import { Edit2, Image as ImageIcon, Trash2, X, Check, Camera } from 'lucide-react';
import ClarificationChat from './ClarificationChat';
import { useState, useRef } from 'react';
import { MealRecord, updateMealRecord, deleteMealRecord } from '@/lib/db/meals';
import { uploadMealImage, fileToBase64 } from '@/lib/storage';

type Props = {
    mealType: string;
    meal: MealRecord;
    onEdit: () => void;
    onUpdate: () => void;
};

export default function MealCard({ mealType, meal, onEdit, onUpdate }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit state mirrors nutritional values
    const [editName, setEditName] = useState(meal.name);
    const [editCalories, setEditCalories] = useState(meal.nutritionalData.calories);
    const [editProtein, setEditProtein] = useState(meal.nutritionalData.protein);
    const [editFat, setEditFat] = useState(meal.nutritionalData.fat);
    const [editCarbs, setEditCarbs] = useState(meal.nutritionalData.carbs);
    const [editSalt, setEditSalt] = useState(meal.nutritionalData.salt);

    // Photo state for adding/changing photo in edit mode
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(meal.imageUrl || null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setNewPhoto(f);
            setNewPhotoPreview(URL.createObjectURL(f));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let imageUrl = meal.imageUrl || '';
            if (newPhoto) {
                imageUrl = await uploadMealImage(newPhoto, meal.id + '_edit');
            }
            await updateMealRecord(meal.id, {
                name: editName,
                imageUrl,
                nutritionalData: {
                    calories: Number(editCalories),
                    protein: Number(editProtein),
                    fat: Number(editFat),
                    carbs: Number(editCarbs),
                    salt: Number(editSalt),
                    fiber: meal.nutritionalData.fiber,
                },
                status: 'confirmed',
            });
            setIsEditing(false);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`「${meal.name}」を削除しますか？`)) return;
        setIsDeleting(true);
        try {
            await deleteMealRecord(meal.id);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('削除に失敗しました');
            setIsDeleting(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col gap-3 mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">食事を編集</h4>
                    <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Photo section */}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={photoInputRef}
                    onChange={handlePhotoChange}
                />
                <div
                    onClick={() => photoInputRef.current?.click()}
                    className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-white cursor-pointer hover:border-teal-400 transition-colors group"
                >
                    {newPhotoPreview ? (
                        <>
                            <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-slate-400 group-hover:text-teal-500">
                            <Camera className="w-6 h-6" />
                            <p className="text-xs font-medium">写真を追加</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-500">食事名</label>
                    <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full text-sm p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        { label: 'カロリー (kcal)', value: editCalories, set: setEditCalories },
                        { label: 'タンパク質 (g)', value: editProtein, set: setEditProtein },
                        { label: '脂質 (g)', value: editFat, set: setEditFat },
                        { label: '炭水化物 (g)', value: editCarbs, set: setEditCarbs },
                        { label: '塩分 (g)', value: editSalt, set: setEditSalt },
                    ].map(({ label, value, set }) => (
                        <div key={label} className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500">{label}</label>
                            <input
                                type="number"
                                value={value}
                                onChange={e => set(Number(e.target.value))}
                                min={0}
                                step={0.1}
                                className="w-full text-sm p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-1">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-full transition-colors disabled:opacity-50"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        );
    }

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
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-slate-400 hover:text-teal-600 p-1.5 -mt-1 rounded-md hover:bg-teal-50 transition-colors"
                                    title="編集"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="text-slate-400 hover:text-red-500 p-1.5 -mt-1 -mr-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                    title="削除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
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

            <div className="mt-1">
                <ClarificationChat meal={meal} onComplete={onUpdate} />
            </div>
        </div>
    );
}

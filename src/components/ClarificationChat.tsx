'use client';

import { Sparkles, Send, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { MealRecord, updateMealRecord } from '@/lib/db/meals';

type Message = { role: 'ai' | 'user'; text: string };

type Props = {
    meal: MealRecord;
    onComplete: () => void;
};

export default function ClarificationChat({ meal, onComplete }: Props) {
    // Initialize from persisted chatHistory in Firestore, fallback to questions
    const buildInitialMessages = (): Message[] => {
        if (meal.chatHistory && meal.chatHistory.length > 0) {
            return meal.chatHistory;
        }
        if (meal.questions) {
            return [{ role: 'ai', text: meal.questions }];
        }
        return [];
    };

    const [isOpen, setIsOpen] = useState(!!meal.questions && !meal.chatHistory?.length);
    const [messages, setMessages] = useState<Message[]>(buildInitialMessages);
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-open if there's an AI question pending
    useEffect(() => {
        if (meal.questions) setIsOpen(true);
    }, [meal.questions]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isSubmitting) return;

        const userMsg: Message = { role: 'user', text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/clarify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    previousData: meal.nutritionalData,
                    previousQuestion: meal.questions || '',
                    userReply: text,
                    mealName: meal.name,
                    chatHistory: newMessages,
                })
            });

            if (!res.ok) throw new Error('Failed to clarify');
            const aiData = await res.json();

            const aiMsg: Message = {
                role: 'ai',
                text: aiData.message || '承知しました。栄養データを更新しました。'
            };
            const finalMessages = [...newMessages, aiMsg];
            setMessages(finalMessages);

            // Save chat history and updated nutrition to Firestore
            await updateMealRecord(meal.id, {
                chatHistory: finalMessages,
                nutritionalData: {
                    calories: aiData.calories ?? meal.nutritionalData.calories,
                    protein: aiData.protein ?? meal.nutritionalData.protein,
                    fat: aiData.fat ?? meal.nutritionalData.fat,
                    carbs: aiData.carbs ?? meal.nutritionalData.carbs,
                    salt: aiData.salt ?? meal.nutritionalData.salt,
                    fiber: aiData.fiber ?? meal.nutritionalData.fiber,
                },
                status: aiData.questions ? 'needs_clarification' : 'confirmed',
                questions: aiData.questions ?? null,
            });

            // Only dispatch event to update summary (don't reload meals list = no remount)
            window.dispatchEvent(new Event('mealUpdated'));
            onComplete();

        } catch (error) {
            console.error(error);
            const errMsg: Message = { role: 'ai', text: 'エラーが発生しました。もう一度お試しください。' };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const hasMessages = messages.length > 0;
    const hasPendingQuestion = meal.questions && !meal.chatHistory?.some(m => m.role === 'user');

    return (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${hasPendingQuestion
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
            >
                <div className="flex items-center gap-2">
                    {hasPendingQuestion ? (
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    ) : (
                        <MessageCircle className="w-4 h-4 text-teal-500" />
                    )}
                    <span>
                        {hasPendingQuestion
                            ? 'AIから質問があります'
                            : hasMessages
                                ? `チャット履歴（${messages.length}件）`
                                : 'AIに質問する'}
                    </span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Chat Body */}
            {isOpen && (
                <div className="bg-white border-t border-slate-100">
                    {/* Messages */}
                    {messages.length > 0 && (
                        <div className="flex flex-col gap-2 p-3 max-h-64 overflow-y-auto">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-teal-600 text-white rounded-br-sm'
                                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                                        }`}>
                                        {msg.role === 'ai' && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <Sparkles className="w-3 h-3 text-teal-500" />
                                                <span className="text-xs font-semibold text-teal-600">AI</span>
                                            </div>
                                        )}
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isSubmitting && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                                        <div className="flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-slate-100">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="例：カロリーは合ってますか？ / 半分だけ食べました"
                            disabled={isSubmitting}
                            className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:bg-white disabled:opacity-50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isSubmitting}
                            className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

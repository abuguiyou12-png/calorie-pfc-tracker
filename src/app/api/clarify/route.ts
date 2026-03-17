import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
あなたは優秀な管理栄養士AIアシスタントです。
ユーザーから食事に関する質問や追加情報が提供されます。
以下の点を踏まえて、自然な会話形式で回答しつつ、栄養素データを再計算してください。

必須出力フォーマット（JSON）:
{
  "message": string, // ユーザーへの返答メッセージ（日本語・自然な会話形式）
  "calories": number, // kcal
  "protein": number,  // g
  "fat": number,      // g
  "carbs": number,    // g
  "salt": number,     // g
  "fiber": number,    // g
  "name": string,     // 食事の短い名前（変更がなければ元の名前）
  "questions": string | null // 追加の確認が必要な場合のみ質問文。不要な場合は null。
}

messageには必ず何か返答を入れてください。例：「修正しました！カロリーは約350kcalになります。」「おそらく妥当な数値だと思います。」
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { previousData, previousQuestion, userReply, mealName, chatHistory } = body;

        if (!previousData || !userReply) {
            return NextResponse.json(
                { error: '以前のデータまたは回答が不足しています。' },
                { status: 400 }
            );
        }

        // Build chat history context
        const historyText = chatHistory
            ? chatHistory.map((m: { role: string; text: string }) =>
                `${m.role === 'ai' ? 'AI' : 'ユーザー'}: ${m.text}`
            ).join('\n')
            : '';

        const prompt = `
【食事名】
${mealName || '不明'}

【現在の推定栄養素データ】
${JSON.stringify(previousData)}

${previousQuestion ? `【前回のAIの質問】\n${previousQuestion}\n` : ''}
${historyText ? `【会話履歴】\n${historyText}\n` : ''}
【最新のユーザーメッセージ】
${userReply}

上記を踏まえて回答し、栄養素データを更新してください。
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                temperature: 0.2,
            }
        });

        const textResult = response.text;

        if (!textResult) {
            throw new Error("No response from Gemini");
        }

        const data = JSON.parse(textResult);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error clarifying meal:', error);
        return NextResponse.json(
            { error: '再計算中にエラーが発生しました。', details: error.message },
            { status: 500 }
        );
    }
}

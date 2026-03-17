import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
あなたは優秀な管理栄養士AIです。
ユーザーから追加の情報（回答）が提供されました。
元の推定栄養素データと、ユーザーの回答を踏まえて、数値を再計算し、JSON形式で出力してください。

必須出力フォーマット（JSON）:
{
  "calories": number, // kcal
  "protein": number,  // g
  "fat": number,      // g
  "carbs": number,    // g
  "salt": number,     // g
  "fiber": number,    // g
  "name": string,     // 食事の短い名前
  "questions": string | null // 今回の回答で全てクリアになった場合は null。まだ計算に必要な情報が足りない場合のみ質問を記述。
}
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { previousData, previousQuestion, userReply } = body;

        if (!previousData || !userReply) {
            return NextResponse.json(
                { error: '以前のデータまたは回答が不足しています。' },
                { status: 400 }
            );
        }

        const prompt = `
【元の推定データ】
${JSON.stringify(previousData)}

【AIの質問】
${previousQuestion || '（質問なし）'}

【ユーザーの回答】
${userReply}

上記を踏まえて栄養素を再計算してください。
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                temperature: 0.1,
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

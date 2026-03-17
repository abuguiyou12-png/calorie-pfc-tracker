import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
あなたは優秀な管理栄養士AIです。
提供された食事の画像、またはテキスト（あるいは両方）から、以下の栄養素を推測・計算してJSON形式で出力してください。
わからない場合は一般的な一人前の量で推測してください。

必須出力フォーマット（JSON）:
{
  "calories": number, // kcal
  "protein": number,  // g
  "fat": number,      // g
  "carbs": number,    // g
  "salt": number,     // g
  "fiber": number,    // g
  "name": string,     // 推測した食事の短い名前（例: "鮭弁当", "トーストと目玉焼き"）
  "questions": string | null // 分量が不明瞭な場合や、より正確に計算するためにユーザーに確認したい質問があれば1文〜2文で記述。問題なければ null。
}

計算時の注意事項：
- ユーザーのコメントがある場合は、画像よりもそちらの指示（例：ご飯は半分残した等）を優先して計算してください。
- グラム単位の表記は小数点第1位までとしてください。
- 必ずJSONの構造のみを出力してください。Markdownのバッククォートなどは不要です。
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageBase64, comment } = body;

        if (!imageBase64 && !comment) {
            return NextResponse.json(
                { error: '画像またはテキストのいずれかが必要です。' },
                { status: 400 }
            );
        }

        const contents = [];

        if (imageBase64) {
            // Decode base64 to parts 
            contents.push({
                inlineData: {
                    data: imageBase64.split(',')[1] || imageBase64, // strip data:image/jpeg;base64, if present
                    mimeType: 'image/jpeg', // generic fallback, ideally passed from client
                },
            });
        }

        if (comment) {
            contents.push(comment);
        }

        console.log("Analyzing with Gemini, contents:", JSON.stringify(contents).substring(0, 100));

        // Call Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                temperature: 0.2, // Low temperature for more deterministic output
            }
        });

        console.log("Gemini response logic complete");

        const textResult = response.text;

        if (!textResult) {
            throw new Error("No response from Gemini");
        }

        // Parse the JSON response
        const data = JSON.parse(textResult);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error analyzing meal:', error);
        return NextResponse.json(
            { error: '食事の分析中にエラーが発生しました。', details: error.message },
            { status: 500 }
        );
    }
}

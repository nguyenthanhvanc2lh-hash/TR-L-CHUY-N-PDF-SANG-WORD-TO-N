import { GoogleGenAI, Type } from "@google/genai";
import type { ProblemSolutionResponse, GeneratedProblems } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const solutionSchema = {
    type: Type.OBJECT,
    properties: {
        problemText: {
            type: Type.STRING,
            description: "Chép lại chính xác đề bài từ hình ảnh. Các công thức toán học BẮT BUỘC phải viết bằng LaTeX bọc trong dấu $ (ví dụ $x^2$)."
        },
        problemCount: {
            type: Type.INTEGER,
            description: "Số lượng bài toán riêng biệt có trong đề bài (ví dụ: Bài 1, Bài 2 là 2 bài).",
        },
        solution: {
            type: Type.OBJECT,
            properties: {
                steps: {
                    type: Type.STRING,
                    description: "Trình bày lời giải chi tiết, từng bước một, dễ hiểu. Các công thức toán học BẮT BUỘC phải viết bằng LaTeX bọc trong dấu $ (ví dụ $x^2$)."
                },
                svg: {
                    type: Type.STRING,
                    description: "Mã nguồn SVG của hình vẽ minh họa nếu là bài toán hình học. Nếu không, trả về null.",
                    nullable: true
                }
            },
            required: ['steps', 'svg']
        }
    },
    required: ['problemText', 'problemCount', 'solution']
};

const similarProblemsSchema = {
    type: Type.OBJECT,
    properties: {
        problems: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: "Một đề bài toán tương tự. Công thức toán dùng LaTeX bọc trong dấu $."
            }
        }
    },
    required: ['problems']
};

const systemInstruction = "Bạn là một giáo viên dạy toán cấp 2 (THCS) xuất sắc tại Việt Nam. Nhiệm vụ của bạn là giải các bài toán một cách chi tiết, dễ hiểu. QUAN TRỌNG: Tất cả các công thức toán học, biểu thức, số mũ, phân số... BẮT BUỘC phải được viết dưới dạng mã LaTeX và bọc trong cặp dấu $ (ví dụ: $x^2 + 2x + 1 = 0$, $\\frac{1}{2}$).";

export const solveProblemFromFile = async (file: File): Promise<ProblemSolutionResponse> => {
    const imagePart = await fileToGenerativePart(file);
    const textPart = {
        text: "Hãy phân tích hình ảnh sau. Đầu tiên, chép lại chính xác đề bài (giữ nguyên định dạng xuống dòng). Hãy đếm xem có bao nhiêu bài toán riêng biệt. Sau đó, trình bày lời giải chi tiết từng bước. Nếu là bài toán hình học, BẮT BUỘC phải tạo một hình vẽ dạng SVG rõ ràng, có đầy đủ các ký hiệu để minh họa. Nhớ dùng LaTeX cho công thức toán ($...$)."
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: solutionSchema,
            temperature: 0.2
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ProblemSolutionResponse;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", response.text);
        throw new Error("Lỗi định dạng phản hồi từ AI.");
    }
};

export const solveProblemFromText = async (problemText: string): Promise<ProblemSolutionResponse> => {
    const prompt = `Đây là đề bài: "${problemText}". Hãy trình bày lời giải chi tiết từng bước. Nếu là bài toán hình học, BẮT BUỘC phải tạo một hình vẽ dạng SVG rõ ràng, có đầy đủ các ký hiệu để minh họa. Nhớ dùng LaTeX cho công thức toán ($...$).`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                ...solutionSchema,
                properties: {
                     ...solutionSchema.properties,
                     problemText: {
                        ...solutionSchema.properties.problemText,
                        description: "Chép lại đề bài đã cho.",
                     }
                }
            },
            temperature: 0.2
        },
    });
    
    try {
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText) as ProblemSolutionResponse;
        if (!parsedResponse.problemText) {
            parsedResponse.problemText = problemText;
        }
        return parsedResponse;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", response.text);
        throw new Error("Lỗi định dạng phản hồi từ AI.");
    }
}

export const generateSimilarProblems = async (problemText: string, count: number): Promise<GeneratedProblems> => {
    const prompt = `Dựa vào bài toán gốc sau: "${problemText}", hãy tạo ra đúng ${count} đề bài toán tương tự (giữ nguyên cấu trúc số lượng bài tập, chỉ thay số hoặc ngữ cảnh). Các đề bài mới cần kiểm tra cùng dạng kiến thức. Đảm bảo độ khó tương đương.
    
    Yêu cầu quan trọng về trình bày: 
    - Các đề bài phải được viết rõ ràng. 
    - Các ý nhỏ (như a, b, c... hoặc 1, 2, 3...) trong một bài toán BẮT BUỘC phải được xuống dòng riêng biệt. 
    - Sử dụng LaTeX cho công thức toán học ($...$).
    - Không viết liền thành một đoạn văn.

    Trả về kết quả dưới dạng một đối tượng JSON.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "Bạn là một giáo viên dạy toán cấp 2 (THCS) sáng tạo tại Việt Nam. Bạn luôn sử dụng LaTeX cho công thức toán ($...$).",
            responseMimeType: "application/json",
            responseSchema: similarProblemsSchema,
            temperature: 0.8
        },
    });
    
    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GeneratedProblems;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response for similar problems:", response.text);
        throw new Error("Lỗi định dạng phản hồi từ AI khi tạo đề.");
    }
};
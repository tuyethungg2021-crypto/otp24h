
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const getAiResponse = async (history: Message[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Bạn là chuyên gia hỗ trợ khách hàng của OTPSim - nền tảng cho thuê SIM nhận mã OTP.
    Nhiệm vụ của bạn:
    1. Tư vấn dịch vụ nào đang có tỷ lệ thành công cao (Telegram, Gmail, FB).
    2. Giải thích lý do tại sao OTP có thể bị chậm (do nhà mạng, do app dịch vụ, hoặc do IP người dùng).
    3. Hướng dẫn cách sử dụng số điện thoại ảo một cách an toàn.
    Hãy trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp và ngắn gọn.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Xin lỗi, tôi gặp chút trục trặc. Bạn có thể thử lại sau không?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Vui lòng kiểm tra kết nối mạng.";
  }
};

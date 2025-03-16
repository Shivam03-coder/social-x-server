import { GoogleGenerativeAI } from "@google/generative-ai";
import { appEnvConfigs } from "@src/configs";

const Ai = new GoogleGenerativeAI(appEnvConfigs.AI_PUBLISHABLE_KEY as string);

export const scanReceipt = async (
  file: Express.Multer.File
): Promise<{
  amount: number;
  date: Date;
  description: string;
  category: string;
  merchantName: string;
} | null> => {
  try {
    const model = Ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const arrayBuffer = file.buffer
    const base64String = arrayBuffer.toString("base64");

    const prompt = `
You are an intelligent receipt scanner. Analyze the uploaded receipt image and extract the following details in JSON format:

- amount (total paid, as a number)
- date (purchase date in ISO 8601 format, e.g. YYYY-MM-DD)
- description (brief summary of items purchased)
- merchantName (store or merchant name)
- category (choose one from: housing, transportation, groceries, utilities, entertainment, food, shopping, healthcare, education, personal, travel, insurance, gifts, bills, other-expense)

Respond ONLY with a valid JSON object in this exact format:
{
  "amount": number,
  "date": "YYYY-MM-DD",
  "description": "string",
  "merchantName": "string",
  "category": "string"
}

If the image is NOT a receipt or data extraction fails, respond with:
{}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.mimetype,
        },
      },
      prompt,
    ]);

    const resp = await result.response;
    const rawText = resp.text();

    const cleanedText = rawText
      .replace(/```(?:json)?\n?/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const data = JSON.parse(cleanedText);

      if (Object.keys(data).length === 0) {
        console.warn("No receipt data extracted.");
        return null;
      }

      return {
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description || "",
        category: data.category || "other-expense",
        merchantName: data.merchantName || "",
      };
    } catch (error) {
      console.error("Failed to parse JSON from Gemini AI response:", error);
      return null;
    }
  } catch (error) {
    console.error("Failed to scan receipt:", error);
    return null;
  }
};

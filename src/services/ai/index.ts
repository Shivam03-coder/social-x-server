import { GoogleGenerativeAI } from "@google/generative-ai";
import { appEnvConfigs } from "@src/configs";
import axios from "axios";

const Ai = new GoogleGenerativeAI(appEnvConfigs.AI_PUBLISHABLE_KEY as string);

type InstagramPost = {
  title: string;
  subtitle: string;
  description: string;
  hashtags: string;
  additional: string;
};

export const ScanImage = async (
  cloudinaryUrl: string,
  mimeType: string = "image/jpeg"
): Promise<InstagramPost | null> => {
  try {
    if (!cloudinaryUrl) {
      console.error("Cloudinary URL is missing.");
      return null;
    }

    const response = await axios.get(cloudinaryUrl, {
      responseType: "arraybuffer",
    });

    const fileBuffer = Buffer.from(response.data);

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error("Downloaded file buffer is empty.");
      return null;
    }

    const base64String = fileBuffer.toString("base64");

    const model = Ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are an intelligent Instagram post generator AI.

Your job is to analyze the uploaded user image and create a highly engaging Instagram post. Based on the visual content of the image, generate the following in JSON format:

- title: A catchy and relevant title for the post. (Keep it concise and impactful)
- subtitle: A short, engaging subtitle that supports the title.
- hashtags: Provide 5-8 relevant and trending hashtags, separated by commas (no hashtags in the string).
- description: Write a short paragraph (2-3 sentences) that elaborates on the content or theme of the image, in an informative and engaging style.
- additional: Add any additional engaging content, such as tips, facts, or a brief call to action related to the image theme.

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "string",
  "subtitle": "string",
  "hashtags": "string",
  "description": "string",
  "additional": "string"
}

If the image is not suitable for creating an Instagram post, or if content extraction fails, respond with:
{}

Important Notes:
- Maintain a positive and engaging tone.
- Keep the content concise, valuable, and relevant to the image.
- Assume the post is aimed at a tech-savvy and curious audience.
- The JSON response must be parsable and valid.
`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: mimeType, // e.g., image/jpeg or image/png
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

    let data: Partial<InstagramPost>;
    try {
      data = JSON.parse(cleanedText);
    } catch (error) {
      console.error("Failed to parse JSON from Gemini AI response:", error);
      console.error("Raw response text:", cleanedText);
      return null;
    }

    if (!data || Object.keys(data).length === 0) {
      console.warn("No post data extracted.");
      return null;
    }

    return {
      title: data.title ?? "",
      subtitle: data.subtitle ?? "",
      description: data.description ?? "",
      hashtags: data.hashtags ?? "",
      additional: data.additional ?? "",
    };
  } catch (error) {
    console.error("Failed to scan image:", error);
    return null;
  }
};

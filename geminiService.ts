
import { GoogleGenAI } from "@google/genai";

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using gemini-2.5-flash-image for high-quality image editing/style transfer simulation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: 'image/png',
          },
        },
        {
          text: "Re-render this photo exactly in the iconic oil painting style of Vincent van Gogh. Use thick, visible impasto brushstrokes, swirling patterns in the background, and a color palette inspired by 'The Starry Night' and 'Sunflowers' (deep blues, vibrant yellows, and warm oranges). Transform the subject's features into artistic oil paint textures while maintaining recognizable form.",
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate art piece");
};

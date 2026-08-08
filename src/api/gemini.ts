interface CallGeminiParams {
  system: string;
  message: string;
  useWebSearch?: boolean;
}

export async function callGemini({ system, message, useWebSearch = false }: CallGeminiParams): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in the environment.');
  }

  // Using gemini-1.5-pro as it provides the best reasoning for JSON extraction and analysis.
  // Note: if gemini-2.0 is preferred, change the model name below.
  const model = 'gemini-1.5-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = {
    systemInstruction: {
      parts: [{ text: system }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  };

  if (useWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract text from Gemini response structure
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidate returned from Gemini API');
    }

    const textPart = candidate.content?.parts?.find((p: any) => p.text);
    if (!textPart) {
      throw new Error('No text returned in the Gemini API response');
    }

    const rawText = textPart.text;
    
    // Strip possible markdown formatting in case the model ignores responseMimeType
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

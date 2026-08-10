interface CallGeminiParams {
  system: string;
  message: string;
  useWebSearch?: boolean;
}

export async function callGemini({ system, message, useWebSearch = false }: CallGeminiParams): Promise<any> {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    const configError = new Error('VITE_API_KEY environment variable is not configured. Please set VITE_API_KEY in your .env file.');
    console.error(configError.message);
    throw configError;
  }

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey.trim()
      },
      body: JSON.stringify({ system, message, useWebSearch })
    });

    if (!response.ok) {
      const errorData = await response.text();

      if (response.status === 401) {
        throw new Error(`Authentication failed (401). Please check your VITE_API_KEY configuration - ${errorData}`);
      }

      if (response.status === 429) {
        throw new Error(`Rate limit exceeded (429). Please wait a moment before trying again - ${errorData}`);
      }

      throw new Error(`Analysis API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling analysis API:', error);
    throw error;
  }
}

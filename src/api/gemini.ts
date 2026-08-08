interface CallGeminiParams {
  system: string;
  message: string;
  useWebSearch?: boolean;
}

export async function callGemini({ system, message, useWebSearch = false }: CallGeminiParams): Promise<any> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ system, message, useWebSearch })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Analysis API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling analysis API:', error);
    throw error;
  }
}

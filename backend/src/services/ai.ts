const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const AI_TIMEOUT = 30000; // 30 seconds

export interface AISuggestion {
  category: string;
  hashtags: string[];
}

interface OllamaResponse {
  response: string;
}

interface OllamaTagsResponse {
  models?: { name: string }[];
}

export async function suggestCategoryAndTags(content: string): Promise<AISuggestion> {
  const prompt = `You are a note categorization assistant. Analyze the following note and provide:

1. A category - choose a single descriptive word that best fits the note's purpose.
   Examples: "todo", "idea", "question", "meeting", "reminder", "research", "bug", "feature", "personal", "work", "shopping", "health", "finance", "travel", etc.
   Be creative and choose the most fitting category for the content.

2. Hashtags - provide 2-5 relevant hashtags (without the # symbol)

Note content:
"""
${content}
"""

Respond with ONLY valid JSON in this exact format:
{"category": "your-category", "hashtags": ["tag1", "tag2", "tag3"]}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3, // Lower temperature for more consistent results
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const result = JSON.parse(data.response) as AISuggestion;

    // Validate and clean category
    if (!result.category || typeof result.category !== 'string') {
      result.category = 'note'; // Default fallback
    }
    result.category = result.category.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);

    if (!Array.isArray(result.hashtags)) {
      result.hashtags = [];
    }

    // Clean hashtags
    result.hashtags = result.hashtags
      .map((tag: string) => tag.toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter((tag: string) => tag.length > 0)
      .slice(0, 5);

    return result;
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI service timeout');
    }

    throw error;
  }
}

// Health check for Ollama
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Check if model is available
export async function isModelAvailable(model: string = 'llama3.2'): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = (await response.json()) as OllamaTagsResponse;
    return data.models?.some((m) => m.name.startsWith(model)) ?? false;
  } catch {
    return false;
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";

interface URLProcessingResult {
  text: string;
  error?: string;
}

export class URLProcessor {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async processURLs(
    urls: string[],
    prompt: string
  ): Promise<URLProcessingResult> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'models/gemini-1.5-flash' 
      });

      // Fetch all URLs in parallel
      const responses = await Promise.all(
        urls.map(url => fetch(url).then(res => res.text()))
      );

      // Prepare content parts
      const contentParts = [
        ...responses.map(content => ({
          text: content,
          mimeType: "text/html"
        })),
        prompt
      ];

      // Generate content based on the URLs
      const result = await model.generateContent(contentParts);

      return {
        text: result.response.text()
      };

    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
} 
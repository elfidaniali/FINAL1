import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Domain } from '../models/domain.model';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private readonly apiKey = process.env.API_KEY;

  constructor() {
    if (!this.apiKey) {
      console.error('API_KEY environment variable not set.');
    } else {
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  async getTroubleshootingSuggestions(domainUrl: string, status: Domain['status']): Promise<string> {
    if (!this.genAI) {
      return Promise.reject(new Error('Gemini AI client is not initialized. Please check your API key.'));
    }

    if (status === 'healthy' || status === 'pending') {
      return Promise.resolve('No issues detected. Suggestions are not needed.');
    }

    const prompt = `
      The domain "${domainUrl}" has been flagged with a status of "${status}".
      Act as a senior DevOps engineer. Provide a concise, actionable troubleshooting checklist for a website administrator to diagnose and fix the potential issues.
      Use simple HTML for formatting (e.g., <ul>, <li>, <b>, <h4>). Include separate sections for "Initial Checks", "Deeper Investigation", and "Resolution Steps".
      The advice should be general and applicable to common web hosting environments.
      Do not include any introductory or concluding pleasantries. Go straight to the checklist.
    `;
    
    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Could not retrieve suggestions from AI. The API may be down or the request was blocked.');
    }
  }
}

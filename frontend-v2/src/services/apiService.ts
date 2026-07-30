import axios from 'axios';
import { getApiBase } from '../config/api';

export type AskResponse = {
  question: string;
  answer: string;
  from_cache: boolean;
  rewritten_query: string;
  confidence_score: number;
  decision_path: string;
  source_section: string;
};

export class ApiService {
  private readonly client = axios.create({
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async ask(question: string): Promise<AskResponse> {
    try {
      const response = await this.client.post<AskResponse>(`${getApiBase()}/ask`, {
        question,
      });

      const payload = response.data;
      if (!payload || typeof payload.answer !== 'string' || !payload.answer.trim()) {
        throw new Error('The backend returned an empty response.');
      }

      return payload;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('The request timed out. The first question can take longer while models load — please try again.');
        }

        if (error.response) {
          const detail = error.response.data?.detail || error.response.data?.message;
          throw new Error(typeof detail === 'string' ? detail : 'The backend returned an error.');
        }

        throw new Error('Unable to reach the backend. Please check that the FastAPI server is running.');
      }

      throw error;
    }
  }
}

export const apiService = new ApiService();
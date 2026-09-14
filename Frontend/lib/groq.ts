import Groq from 'groq-sdk';

export const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env.local or environment variables.');
  }
  return new Groq({ apiKey });
};

export const AVAILABLE_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Versatile)',
    description: 'Fastest security reasoning, tool-calling & exploit script generator',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B (Instant)',
    description: 'Ultra-low latency passive triage and rapid reconnaissance',
  },
];

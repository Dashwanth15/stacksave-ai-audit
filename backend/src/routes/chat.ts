// ============================================================
// Chat Route — /api/chat
// AI-powered chatbot for questions about AI SaaS pricing,
// tool comparisons, and cost optimization advice.
// Uses Groq API (OpenAI-compatible).
// ============================================================

import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || '',
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

const SYSTEM_PROMPT = `You are StackSave AI — a friendly, expert assistant specializing in AI SaaS pricing, cost optimization, and tool comparisons.

Your expertise covers:
- AI coding tools: Cursor, GitHub Copilot, Windsurf, and their plans
- AI chat tools: ChatGPT, Claude, Gemini, and their pricing tiers
- AI APIs: OpenAI API, Anthropic API, Google AI Studio pricing
- Cost optimization: identifying unused seats, cheaper alternatives, annual billing savings
- Team planning: when to upgrade to Team/Enterprise plans

Guidelines:
- Keep responses concise (2-4 paragraphs max)
- Use specific pricing numbers when relevant
- Recommend cost-saving strategies when appropriate
- Be honest when you don't know something or prices may have changed
- Format with bullet points and bold for readability
- If asked about non-AI-SaaS topics, politely redirect to your expertise area
- Use emojis sparingly for warmth 🎯`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Limit conversation length to avoid token limits
    const recentMessages = messages.slice(-10);

    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    return res.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({
      error: 'Failed to get AI response',
      reply: 'Sorry, I\'m having trouble connecting right now. Try again in a moment! 🔄',
    });
  }
});

export default router;

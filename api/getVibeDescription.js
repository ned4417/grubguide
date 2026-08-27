import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, address, rating, priceLevel, distance } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing restaurant name' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI not configured' });
  }

  const PRICE_MAP = { 1: 'budget-friendly', 2: 'moderately priced', 3: 'upscale', 4: 'fine dining' };
  const priceContext = priceLevel ? `It's ${PRICE_MAP[priceLevel] || 'moderately priced'}.` : '';
  const ratingContext = rating > 0 ? `It has a ${rating.toFixed(1)}-star rating.` : '';
  const distanceContext = distance && distance !== 'N/A' ? `It's ${distance} away.` : '';

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: `Write a 2-sentence vibe description for a restaurant recommendation app. Keep it casual, enticing, and specific to the restaurant's vibe — not generic. No marketing fluff.

Restaurant: ${name}
Location: ${address}
${ratingContext} ${priceContext} ${distanceContext}

2 sentences only. Start directly with the vibe.`,
        },
      ],
    });

    const description = message.content[0]?.text?.trim() || '';
    return res.status(200).json({ description });
  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ error: 'Failed to generate description' });
  }
}

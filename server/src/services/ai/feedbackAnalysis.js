/**
 * AI Customer Feedback Sentiment Analysis.
 *
 * Aspect-based keyword scoring with negation handling. Each review is analysed
 * across aspects: foodQuality, service, speed, price, menu. Returns an overall
 * sentiment label plus per-aspect scores, e.g.
 *
 *   "The food was excellent but it took too long."
 *   → foodQuality: positive, speed: negative, overall: mixed
 */

const ASPECTS = {
  foodQuality: {
    label: 'Food Quality',
    positive: ['delicious', 'tasty', 'yummy', 'flavourful', 'flavorful', 'fresh', 'amazing', 'excellent', 'perfect', 'great', 'good', 'awesome', 'juicy', 'crispy'],
    negative: ['cold', 'dry', 'bland', 'tasteless', 'burnt', 'salty', 'stale', 'greasy', 'soggy', 'raw', 'horrible', 'terrible', 'awful'],
  },
  service: {
    label: 'Service',
    positive: ['friendly', 'polite', 'helpful', 'courteous', 'attentive', 'kind', 'fast', 'quick', 'smiling', 'professional'],
    negative: ['rude', 'ignorant', 'inattentive', 'unfriendly', 'slow', 'ignored', 'arrogant', 'unprofessional'],
  },
  speed: {
    label: 'Delivery Speed',
    positive: ['fast', 'quick', 'rapid', 'prompt', 'on time', 'timely'],
    negative: ['slow', 'late', 'delay', 'delayed', 'wait', 'waited', 'long time', 'took too long', 'never arrived'],
  },
  price: {
    label: 'Price / Value',
    positive: ['cheap', 'affordable', 'worth', 'good value', 'reasonable', 'fair price'],
    negative: ['expensive', 'overpriced', 'pricey', 'rip off', 'costly', 'too much'],
  },
  menu: {
    label: 'Menu Quality',
    positive: ['variety', 'options', 'selection', 'creative', 'well presented', 'presented', 'beautiful'],
    negative: ['limited', 'no options', 'boring', 'same', 'unavailable'],
  },
};

const NEGATIONS = ['not', 'no', 'never', 'didn', "didn't", 'wasnt', "wasn't", 'isnt', "isn't"];

function analyzeAspect(text, words, { aspect, label, positive, negative }) {
  let posCount = 0;
  let negCount = 0;
  const hits = { positive: [], negative: [] };
  const matchedIndices = new Set();

  const multiPos = positive.filter((k) => k.includes(' '));
  const multiNeg = negative.filter((k) => k.includes(' '));
  const singlePos = positive.filter((k) => !k.includes(' '));
  const singleNeg = negative.filter((k) => !k.includes(' '));

  for (const phrase of multiPos) {
    let idx = text.indexOf(phrase);
    while (idx !== -1) {
      const before = text.slice(Math.max(0, idx - 15), idx).trim().split(/\s+/);
      const negated = before.some((w) => NEGATIONS.includes(w));
      if (!negated) { posCount += 1; hits.positive.push(phrase); }
      else { negCount += 1; hits.negative.push(phrase); }
      idx = text.indexOf(phrase, idx + phrase.length);
    }
  }

  for (const phrase of multiNeg) {
    let idx = text.indexOf(phrase);
    while (idx !== -1) {
      const before = text.slice(Math.max(0, idx - 15), idx).trim().split(/\s+/);
      const negated = before.some((w) => NEGATIONS.includes(w));
      if (!negated) { negCount += 1; hits.negative.push(phrase); }
      else { posCount += 1; hits.positive.push(phrase); }
      idx = text.indexOf(phrase, idx + phrase.length);
    }
  }

  words.forEach((word, idx) => {
    const isPos = singlePos.includes(word);
    const isNeg = singleNeg.includes(word);
    if (!isPos && !isNeg) return;
    if (matchedIndices.has(idx)) return;
    matchedIndices.add(idx);

    const context = words.slice(Math.max(0, idx - 5), idx);
    const negated = context.some((w) => NEGATIONS.includes(w));
    const polarity = isPos ? 1 : -1;
    const final = negated ? -polarity : polarity;

    if (final > 0) {
      posCount += 1;
      hits.positive.push(word);
    } else {
      negCount += 1;
      hits.negative.push(word);
    }
  });

  let score = 0;
  let sentiment = 'neutral';
  if (posCount + negCount > 0) {
    score = (posCount - negCount) / (posCount + negCount);
    sentiment = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';
  }

  return { aspect, label, sentiment, score: Math.round(score * 100), keywords: [...hits.positive, ...hits.negative].slice(0, 5) };
}

export function analyzeFeedback(comment) {
  const text = String(comment || '').toLowerCase();
  const words = text.split(/[^a-z0-9']+/).filter(Boolean);

  const aspects = Object.entries(ASPECTS).map(([key, def]) =>
    analyzeAspect(text, words, { aspect: key, ...def })
  );

  const nonNeutral = aspects.filter((a) => a.sentiment !== 'neutral');
  const avgScore = nonNeutral.length
    ? nonNeutral.reduce((s, a) => s + a.score, 0) / nonNeutral.length
    : 0;

  let overall = 'neutral';
  if (nonNeutral.length === 0) overall = 'neutral';
  else if (avgScore > 15) overall = 'positive';
  else if (avgScore < -15) overall = 'negative';
  else overall = 'mixed';

  const posAspects = nonNeutral.filter((a) => a.sentiment === 'positive').map((a) => a.label.toLowerCase());
  const negAspects = nonNeutral.filter((a) => a.sentiment === 'negative').map((a) => a.label.toLowerCase());

  let summary = 'No specific feedback provided.';
  if (nonNeutral.length) {
    const parts = [];
    if (posAspects.length) parts.push(`positive about ${posAspects.join(', ')}`);
    if (negAspects.length) parts.push(`negative about ${negAspects.join(', ')}`);
    summary = `Customer was ${parts.join(' but ')}.`;
  }

  return {
    overall,
    aspects,
    summary,
    raw: comment,
  };
}

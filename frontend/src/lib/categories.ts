// Picks an icon for an expense from words in its description; there's no category field in the backend.
export type Category = { icon: string; tile: string }

const categories: { words: RegExp; category: Category }[] = [
  { words: /\b(dinner|lunch|breakfast|brunch|food|meal|restaurant|cafe|coffee|pizza|biryani|snacks?|swiggy|zomato)\b/i, category: { icon: '🍽️', tile: 'bg-orange-100 dark:bg-orange-950/60' } },
  { words: /\b(drinks?|beer|bar|pub|wine|party|club)\b/i, category: { icon: '🍻', tile: 'bg-amber-100 dark:bg-amber-950/60' } },
  { words: /\b(grocer(y|ies)|supermarket|vegetables|milk|bigbasket|blinkit|zepto)\b/i, category: { icon: '🛒', tile: 'bg-lime-100 dark:bg-lime-950/60' } },
  { words: /\b(hotel|villa|stay|airbnb|hostel|resort|room|booking)\b/i, category: { icon: '🏨', tile: 'bg-sky-100 dark:bg-sky-950/60' } },
  { words: /\b(flight|airport|plane|airline|train|bus)\b/i, category: { icon: '✈️', tile: 'bg-indigo-100 dark:bg-indigo-950/60' } },
  { words: /\b(cab|taxi|uber|ola|auto|rickshaw|metro|parking|toll)\b/i, category: { icon: '🚕', tile: 'bg-yellow-100 dark:bg-yellow-950/60' } },
  { words: /\b(petrol|diesel|fuel|gas station)\b/i, category: { icon: '⛽', tile: 'bg-rose-100 dark:bg-rose-950/60' } },
  { words: /\b(rent|deposit|maintenance|society)\b/i, category: { icon: '🏠', tile: 'bg-teal-100 dark:bg-teal-950/60' } },
  { words: /\b(electricity|power|water|wifi|internet|broadband|gas|utilities|bill)\b/i, category: { icon: '💡', tile: 'bg-yellow-100 dark:bg-yellow-950/60' } },
  { words: /\b(movie|cinema|concert|show|game|netflix|spotify|tickets?)\b/i, category: { icon: '🎬', tile: 'bg-violet-100 dark:bg-violet-950/60' } },
  { words: /\b(scuba|diving|trek|hike|adventure|tour|activity|surf)\b/i, category: { icon: '🤿', tile: 'bg-cyan-100 dark:bg-cyan-950/60' } },
  { words: /\b(gift|birthday|present)\b/i, category: { icon: '🎁', tile: 'bg-pink-100 dark:bg-pink-950/60' } },
  { words: /\b(shopping|clothes|shoes|amazon|flipkart)\b/i, category: { icon: '🛍️', tile: 'bg-fuchsia-100 dark:bg-fuchsia-950/60' } },
  { words: /\b(medicine|doctor|hospital|pharmacy|medical)\b/i, category: { icon: '💊', tile: 'bg-red-100 dark:bg-red-950/60' } },
]

const fallback: Category = { icon: '🧾', tile: 'bg-slate-100 dark:bg-slate-800' }

export function categoryFor(description: string | null): Category {
  if (!description) return fallback
  return categories.find((c) => c.words.test(description))?.category ?? fallback
}

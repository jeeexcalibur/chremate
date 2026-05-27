import { ref } from 'vue'
import type { ParsedTransaction, TransactionCategory } from '@/types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export function useAI() {
  const parsing = ref(false)
  const parseError = ref<string | null>(null)

  async function parseTransactions(input: string): Promise<ParsedTransaction[]> {
    parsing.value = true
    parseError.value = null

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey || apiKey === 'your_gemini_api_key') {
        return localParseMultiple(input)
      }

      const prompt = `You are a financial transaction parser. Parse the following natural language input into structured transactions.

IMPORTANT: The input may contain MULTIPLE transactions. Split them into separate entries.

Rules:
- "k" means thousand (e.g., 25k = 25000, 1.5k = 1500)
- "jt" or "juta" means million (e.g., 10jt = 10000000)
- "ribu" or "rb" means thousand (e.g., 15 ribu = 15000, 15rb = 15000)
- Default currency is IDR (Indonesian Rupiah)
- IMPORTANT: In Indonesian currency format, dots are THOUSANDS separators, NOT decimals! Examples:
  - "Rp15.000" = 15000 (fifteen thousand)
  - "Rp1.500.000" = 1500000 (one million five hundred thousand)
  - "Rp150.000" = 150000 (one hundred fifty thousand)
  - "50.000" = 50000 (fifty thousand)
- If amount has no suffix and is a small number with no dots (e.g., 15), check context: "15 ribu" = 15000, but "15jt" = 15000000
- Determine if each is "income" or "expense" based on context
- Income keywords: received, got, earned, salary, paid (when receiving), transfer in, bonus, gaji, terima
- Expense keywords: spent, bought, paid (when paying), for, on, beli, naik, bayar, makan
- Categorize each into one of: food, transport, bills, entertainment, shopping, health, education, salary, freelance, investment, crypto, stocks, gift, other
- Look for conjunctions like "terus", "dan", "lalu", "kemudian", "also", "then", "and" as separators for multiple transactions

Input: "${input}"

Respond ONLY with a valid JSON array, no markdown:
[{"amount": <number as integer, e.g. 15000 not 15>, "category": "<category>", "description": "<brief description>", "type": "<income|expense>"}]

If only one transaction, still return an array with one item.`

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

      if (!text) {
        throw new Error('Empty AI response')
      }

      // Clean the response - remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleanedText)

      // Normalize: ensure it's always an array
      const results: ParsedTransaction[] = Array.isArray(parsed) ? parsed : [parsed]

      // Validate each
      return results.filter((p) => {
        return p.amount > 0 && ['income', 'expense'].includes(p.type)
      })
    } catch (e: any) {
      console.warn('AI parsing failed, using local parser:', e.message)
      return localParseMultiple(input)
    } finally {
      parsing.value = false
    }
  }

  function localParseMultiple(input: string): ParsedTransaction[] {
    // Split by common conjunctions/separators
    const separators = /\b(?:terus|lalu|kemudian|dan juga|then|also|and then|selain itu|plus)\b|[;]/gi
    const parts = input.split(separators).map((s) => s.trim()).filter((s) => s.length > 0)

    // If no split happened, try a different approach: look for multiple amount patterns
    if (parts.length <= 1) {
      const multiAmountParts = splitByAmounts(input)
      if (multiAmountParts.length > 1) {
        return multiAmountParts.map((part) => localParseSingle(part))
      }
    }

    const results = parts.map((part) => localParseSingle(part))
    return results.filter((r) => r.amount > 0)
  }

  function splitByAmounts(input: string): string[] {
    // Find all amount patterns and split the text around them
    const amountPattern = /(\d+[.,]?\d*)\s*(k|jt|juta|rb|ribu)/gi
    const matches: { index: number; length: number }[] = []
    let match

    while ((match = amountPattern.exec(input)) !== null) {
      matches.push({ index: match.index, length: match[0].length })
    }

    if (matches.length <= 1) return [input]

    // Split text into segments, each containing one amount
    const parts: string[] = []
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]!
      const amountEnd = currentMatch.index + currentMatch.length

      // Find the start of this segment
      let start: number
      if (i === 0) {
        start = 0
      } else {
        // Start from after the previous amount
        const prevMatch = matches[i - 1]!
        start = prevMatch.index + prevMatch.length
      }

      // Find the end of this segment
      let end: number
      if (i === matches.length - 1) {
        end = input.length
      } else {
        // Go up to where the text before the next amount starts
        // Look for a natural break point
        const nextMatch = matches[i + 1]!
        const textBetween = input.substring(amountEnd, nextMatch.index)
        // Find the position after the amount where new context begins
        const breakMatch = textBetween.match(/^[^a-zA-Z]*/)
        const breakPos = breakMatch ? amountEnd + breakMatch[0].length : amountEnd
        end = Math.max(breakPos, amountEnd)
      }

      // Include text before this amount + the amount itself
      const segment = input.substring(start, i === matches.length - 1 ? end : amountEnd).trim()
      if (segment) parts.push(segment)

      // If this is the last one, include trailing text
      if (i === matches.length - 1 && amountEnd < input.length) {
        // Already included above
      }
    }

    // If splitting didn't work well, try simpler approach
    if (parts.length <= 1) {
      // Split on amount boundaries: text before each amount belongs to that transaction
      const result: string[] = []
      let lastEnd = 0
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i]!
        const amountEnd = m.index + m.length
        const segment = input.substring(lastEnd, amountEnd).trim()
        if (segment) result.push(segment)
        lastEnd = amountEnd
      }
      // Append any trailing text to the last segment
      if (lastEnd < input.length && result.length > 0) {
        result[result.length - 1] += input.substring(lastEnd)
      }
      return result.length > 1 ? result : [input]
    }

    return parts
  }

  function localParseSingle(input: string): ParsedTransaction {
    const lower = input.toLowerCase().trim()

    // Determine type
    const incomeKeywords = ['received', 'got', 'earned', 'salary', 'gaji', 'bonus', 'income', 'transfer in', 'terima']
    const isIncome = incomeKeywords.some((k) => lower.includes(k))
    const type = isIncome ? 'income' : 'expense'

    // Extract amount — handle Indonesian currency formats
    let amount = 0

    // Priority 1: Match "Rp" prefixed amounts with dots as thousands separator (e.g., Rp15.000, Rp1.500.000)
    const rpDotPattern = /rp\.?\s*(\d{1,3}(?:\.\d{3})+)/gi
    let rpDotMatch: RegExpExecArray | null = null
    let lastRpDotMatch: RegExpExecArray | null = null
    while ((rpDotMatch = rpDotPattern.exec(lower)) !== null) {
      lastRpDotMatch = rpDotMatch
    }

    // Priority 2: Match standalone amounts with dots as thousands separator (e.g., 15.000, 150.000)
    const dotThousandPattern = /(?:^|\s)(\d{1,3}(?:\.\d{3})+)(?:\s|$|[^\d])/gi
    let dotMatch: RegExpExecArray | null = null
    let lastDotMatch: RegExpExecArray | null = null
    while ((dotMatch = dotThousandPattern.exec(lower)) !== null) {
      lastDotMatch = dotMatch
    }

    if (lastRpDotMatch) {
      // Rp15.000 → remove dots → 15000
      amount = parseInt(lastRpDotMatch[1]!.replace(/\./g, ''), 10)
    } else if (lastDotMatch) {
      // 15.000 → remove dots → 15000
      amount = parseInt(lastDotMatch[1]!.replace(/\./g, ''), 10)
    } else {
      // Priority 3: Match amounts with suffixes (k, jt, ribu, juta, rb) or plain numbers
      // Also handle "X ribu" where ribu is separated by space
      const amountWithWordSuffix = /(\d+[,.]?\d*)\s*(ribu|rb|k|jt|juta)/gi
      let lastWordMatch: RegExpExecArray | null = null
      let wm: RegExpExecArray | null
      while ((wm = amountWithWordSuffix.exec(lower)) !== null) {
        lastWordMatch = wm
      }

      if (lastWordMatch) {
        const numStr = lastWordMatch[1]!.replace(',', '.')
        const num = parseFloat(numStr)
        const suffix = lastWordMatch[2]?.toLowerCase()

        if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') {
          amount = num * 1000
        } else if (suffix === 'jt' || suffix === 'juta') {
          amount = num * 1000000
        }
      } else {
        // Priority 4: Match Rp followed by plain number (e.g., Rp15000)
        const rpPlainPattern = /rp\.?\s*(\d+)/gi
        let rpPlainMatch: RegExpExecArray | null = null
        let lastRpPlain: RegExpExecArray | null = null
        while ((rpPlainMatch = rpPlainPattern.exec(lower)) !== null) {
          lastRpPlain = rpPlainMatch
        }

        if (lastRpPlain) {
          amount = parseInt(lastRpPlain[1]!, 10)
        } else {
          // Priority 5: Fallback — take the last plain number
          const plainNumberRegex = /(\d+[,.]?\d*)/gi
          let lastPlain: RegExpExecArray | null = null
          let pm: RegExpExecArray | null
          while ((pm = plainNumberRegex.exec(lower)) !== null) {
            lastPlain = pm
          }
          if (lastPlain) {
            amount = parseFloat(lastPlain[1]!.replace(',', '.'))
          }
        }
      }
    }

    // Determine category
    const category = detectCategory(lower, type)

    // Build description - clean up the input for display
    const description = input.trim()

    return { amount, category, description, type }
  }

  function detectCategory(text: string, type: 'income' | 'expense'): TransactionCategory {
    if (type === 'income') {
      if (text.includes('salary') || text.includes('gaji')) return 'salary'
      if (text.includes('freelance') || text.includes('project')) return 'freelance'
      if (text.includes('crypto') || text.includes('bitcoin') || text.includes('eth') || text.includes('coin') || text.includes('kripto') || text.includes('doge') || text.includes('solana') || text.includes('usdt')) return 'crypto'
      if (text.includes('stock') || text.includes('saham') || text.includes('dividend') || text.includes('dividen') || text.includes('reksadana') || text.includes('mutual fund')) return 'stocks'
      if (text.includes('invest')) return 'investment'
      if (text.includes('gift') || text.includes('hadiah')) return 'gift'
      return 'salary'
    }

    // Expense categories
    const categoryMap: [string[], TransactionCategory][] = [
      [['food', 'eat', 'lunch', 'dinner', 'breakfast', 'makan', 'coffee', 'kopi', 'snack', 'rice', 'nasi', 'chicken', 'ayam', 'geprek', 'drink', 'minum', 'restaurant', 'cafe', 'warteg', 'warung'], 'food'],
      [['transport', 'taxi', 'grab', 'gojek', 'gas', 'fuel', 'bensin', 'bus', 'train', 'kereta', 'toll', 'tol', 'parking', 'parkir', 'ojol', 'ojek', 'naik', 'ride', 'uber', 'commute', 'kantor'], 'transport'],
      [['bill', 'electric', 'listrik', 'water', 'air', 'internet', 'wifi', 'phone', 'pulsa', 'rent', 'sewa', 'tagihan'], 'bills'],
      [['game', 'movie', 'film', 'netflix', 'spotify', 'subscribe', 'entertainment', 'hiburan', 'fun', 'play', 'nonton'], 'entertainment'],
      [['shop', 'buy', 'beli', 'cloth', 'baju', 'shoe', 'sepatu', 'gadget', 'elektronik', 'online', 'tokped', 'shopee'], 'shopping'],
      [['health', 'doctor', 'dokter', 'medicine', 'obat', 'hospital', 'gym', 'fitness', 'vitamin', 'sakit'], 'health'],
      [['school', 'course', 'kursus', 'book', 'buku', 'education', 'tuition', 'class', 'kelas', 'study', 'belajar'], 'education'],
      [['crypto', 'bitcoin', 'eth', 'coin', 'kripto', 'doge', 'solana', 'usdt'], 'crypto'],
      [['stock', 'saham', 'invest', 'reksadana', 'mutual fund'], 'stocks'],
    ]

    for (const [keywords, category] of categoryMap) {
      if (keywords.some((k) => text.includes(k))) return category
    }

    return 'other'
  }

  // Keep backward-compatible single parse
  async function parseTransaction(input: string): Promise<ParsedTransaction> {
    const results = await parseTransactions(input)
    return results[0] || { amount: 0, category: 'other', description: input, type: 'expense' }
  }

  return {
    parsing,
    parseError,
    parseTransaction,
    parseTransactions,
  }
}

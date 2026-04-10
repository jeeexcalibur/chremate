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
- Default currency is IDR (Indonesian Rupiah)
- Determine if each is "income" or "expense" based on context
- Income keywords: received, got, earned, salary, paid (when receiving), transfer in, bonus, gaji, terima
- Expense keywords: spent, bought, paid (when paying), for, on, beli, naik, bayar
- Categorize each into one of: food, transport, bills, entertainment, shopping, health, education, salary, freelance, investment, gift, other
- Look for conjunctions like "terus", "dan", "lalu", "kemudian", "also", "then", "and" as separators for multiple transactions

Input: "${input}"

Respond ONLY with a valid JSON array, no markdown:
[{"amount": <number>, "category": "<category>", "description": "<brief description>", "type": "<income|expense>"}]

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

    // Extract amount — take the LAST amount match in the segment (most likely the actual value)
    let amount = 0
    const amountRegex = /(\d+[.,]?\d*)\s*(k|jt|juta|rb|ribu)?/gi
    let lastMatch: RegExpExecArray | null = null
    let m: RegExpExecArray | null

    while ((m = amountRegex.exec(lower)) !== null) {
      lastMatch = m
    }

    if (lastMatch) {
      const numStr = lastMatch[1]!.replace(',', '.')
      const num = parseFloat(numStr)
      const suffix = lastMatch[2]?.toLowerCase()

      if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') {
        amount = num * 1000
      } else if (suffix === 'jt' || suffix === 'juta') {
        amount = num * 1000000
      } else {
        amount = num
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

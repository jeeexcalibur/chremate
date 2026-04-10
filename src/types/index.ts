export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  monthlyBudget: number
  currency: string
}

export interface Transaction {
  id: string
  userId: string
  amount: number
  category: TransactionCategory
  description: string
  timestamp: Date
  type: 'income' | 'expense'
}

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'bills'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'gift'
  | 'other'

export interface ParsedTransaction {
  amount: number
  category: TransactionCategory
  description: string
  type: 'income' | 'expense'
}

export interface CategoryConfig {
  label: string
  icon: string
  color: string
  bgColor: string
}

export const CATEGORIES: Record<TransactionCategory, CategoryConfig> = {
  food: { label: 'Food & Drinks', icon: '🍜', color: '#f97316', bgColor: '#fff7ed' },
  transport: { label: 'Transport', icon: '🚗', color: '#3b82f6', bgColor: '#eff6ff' },
  bills: { label: 'Bills & Utilities', icon: '📄', color: '#ef4444', bgColor: '#fef2f2' },
  entertainment: { label: 'Entertainment', icon: '🎮', color: '#a855f7', bgColor: '#faf5ff' },
  shopping: { label: 'Shopping', icon: '🛍️', color: '#ec4899', bgColor: '#fdf2f8' },
  health: { label: 'Health', icon: '💊', color: '#10b981', bgColor: '#ecfdf5' },
  education: { label: 'Education', icon: '📚', color: '#6366f1', bgColor: '#eef2ff' },
  salary: { label: 'Salary', icon: '💰', color: '#10b981', bgColor: '#ecfdf5' },
  freelance: { label: 'Freelance', icon: '💻', color: '#8b5cf6', bgColor: '#f5f3ff' },
  investment: { label: 'Investment', icon: '📈', color: '#14b8a6', bgColor: '#f0fdfa' },
  gift: { label: 'Gift', icon: '🎁', color: '#f43f5e', bgColor: '#fff1f2' },
  other: { label: 'Other', icon: '📦', color: '#64748b', bgColor: '#f8fafc' },
}

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'food', 'transport', 'bills', 'entertainment', 'shopping', 'health', 'education', 'other'
]

export const INCOME_CATEGORIES: TransactionCategory[] = [
  'salary', 'freelance', 'investment', 'gift', 'other'
]

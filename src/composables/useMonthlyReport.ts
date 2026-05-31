import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useBudgetPenalty } from '@/composables/useBudgetPenalty'
import { CATEGORIES, BUDGET_CATEGORIES, type TransactionCategory } from '@/types'
import { formatCurrency, getCurrentMonthKey, getMonthLabel } from '@/lib/utils'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export interface MonthlyReportData {
  monthKey: string
  monthLabel: string
  userName: string
  totalIncome: number
  totalExpenses: number
  netBalance: number
  savingsRate: number
  budgetLimit: number
  effectiveBudget: number
  budgetUsedPct: number
  hasPenalty: boolean
  penaltyAmount: number
  categoryBreakdown: { category: TransactionCategory; label: string; icon: string; amount: number; pct: number }[]
  topExpenses: { description: string; amount: number; category: string; date: string }[]
  dailyTrend: { date: string; total: number }[]
  transactionCount: number
}

export function useMonthlyReport() {
  const generating = ref(false)
  const reportError = ref<string | null>(null)

  function collectReportData(): MonthlyReportData {
    const authStore = useAuthStore()
    const transactionStore = useTransactionStore()
    const { effectiveBudget, hasPenalty: penaltyActive, penaltyAmount: pAmt } = useBudgetPenalty()

    const monthKey = getCurrentMonthKey()
    const monthLabel = getMonthLabel(monthKey)
    const userName = authStore.user?.displayName || authStore.user?.email || 'User'

    const totalIncome = transactionStore.monthlyIncome
    const totalExpenses = transactionStore.monthlyExpenses
    const netBalance = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    const budgetLimit = authStore.user?.monthlyBudget || 5000000
    const effBudget = effectiveBudget.value
    const budgetSpending = transactionStore.monthlyBudgetSpending
    const budgetUsedPct = effBudget > 0 ? Math.min((budgetSpending / effBudget) * 100, 150) : 0

    // Category breakdown
    const breakdown = transactionStore.categoryBreakdown
    const categoryBreakdown = Object.entries(breakdown)
      .map(([cat, amount]) => {
        const config = CATEGORIES[cat as TransactionCategory] || CATEGORIES.other
        return {
          category: cat as TransactionCategory,
          label: config.label,
          icon: config.icon,
          amount,
          pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)

    // Top 5 expenses
    const thisMonthTxns = transactionStore.transactions.filter((t) => {
      const now = new Date()
      return t.type === 'expense' && t.timestamp.getMonth() === now.getMonth() && t.timestamp.getFullYear() === now.getFullYear()
    })
    const topExpenses = [...thisMonthTxns]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        category: (CATEGORIES[t.category] || CATEGORIES.other).label,
        date: t.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))

    // Daily spending trend for the month
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = Math.min(now.getDate(), daysInMonth)
    const dailyTrend: { date: string; total: number }[] = []
    for (let d = 1; d <= currentDay; d++) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), d, 0, 0, 0)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), d, 23, 59, 59, 999)
      const total = thisMonthTxns
        .filter((t) => t.timestamp >= dayStart && t.timestamp <= dayEnd)
        .reduce((sum, t) => sum + t.amount, 0)
      dailyTrend.push({ date: `${d}`, total })
    }

    return {
      monthKey,
      monthLabel,
      userName,
      totalIncome,
      totalExpenses,
      netBalance,
      savingsRate,
      budgetLimit,
      effectiveBudget: effBudget,
      budgetUsedPct,
      hasPenalty: penaltyActive.value,
      penaltyAmount: pAmt.value,
      categoryBreakdown,
      topExpenses,
      dailyTrend,
      transactionCount: thisMonthTxns.length,
    }
  }

  async function getAIRecommendations(data: MonthlyReportData): Promise<string[]> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey || apiKey === 'your_gemini_api_key') {
        return getLocalRecommendations(data)
      }

      const catSummary = data.categoryBreakdown
        .slice(0, 6)
        .map((c) => `${c.label}: ${formatCurrency(c.amount)} (${c.pct.toFixed(1)}%)`)
        .join(', ')

      const prompt = `You are a personal finance consultant reviewing a monthly financial report. Provide exactly 5 specific, actionable recommendations based on this data.

Monthly Financial Summary:
- Income: ${formatCurrency(data.totalIncome)}
- Expenses: ${formatCurrency(data.totalExpenses)}
- Net Balance: ${formatCurrency(data.netBalance)}
- Savings Rate: ${data.savingsRate.toFixed(1)}%
- Budget: ${formatCurrency(data.effectiveBudget)} (${data.budgetUsedPct.toFixed(0)}% used)
- Category Breakdown: ${catSummary}
${data.hasPenalty ? `- Over-Budget Penalty: ${formatCurrency(data.penaltyAmount)} carried from last month` : ''}
- Transaction Count: ${data.transactionCount}

Rules:
- Be specific with numbers and percentages
- Reference actual categories from the data
- Give practical, non-generic advice
- If savings rate is negative, be concerned but supportive
- Currency is IDR (Indonesian Rupiah)
- Keep each recommendation under 2 sentences
- Do NOT use markdown formatting, asterisks, or bullet points in your response

Respond with ONLY a JSON array of 5 strings, no markdown:
["recommendation 1", "recommendation 2", ...]`

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!text) throw new Error('Empty response')

      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return Array.isArray(parsed) ? parsed.slice(0, 5) : getLocalRecommendations(data)
    } catch (e) {
      console.warn('AI recommendations failed, using local fallback:', e)
      return getLocalRecommendations(data)
    }
  }

  function getLocalRecommendations(data: MonthlyReportData): string[] {
    const recs: string[] = []

    if (data.savingsRate < 0) {
      recs.push(`Your expenses exceed income by ${formatCurrency(Math.abs(data.netBalance))}. Focus on reducing discretionary spending immediately to avoid debt accumulation.`)
    } else if (data.savingsRate < 20) {
      recs.push(`Your savings rate is ${data.savingsRate.toFixed(1)}%, below the recommended 20%. Consider automating savings by setting aside money at the start of each month.`)
    } else {
      recs.push(`Great job! Your savings rate of ${data.savingsRate.toFixed(1)}% is healthy. Consider investing the surplus into diversified instruments.`)
    }

    if (data.budgetUsedPct > 100) {
      recs.push(`You've exceeded your monthly budget by ${formatCurrency(data.totalExpenses - data.effectiveBudget)}. Review your top spending categories for areas to cut back.`)
    } else if (data.budgetUsedPct > 80) {
      recs.push(`You've used ${data.budgetUsedPct.toFixed(0)}% of your budget. Be cautious with remaining spending to stay within limits.`)
    }

    if (data.categoryBreakdown.length > 0) {
      const top = data.categoryBreakdown[0]!
      recs.push(`Your biggest expense category is ${top.label} at ${formatCurrency(top.amount)} (${top.pct.toFixed(1)}% of total). Look for ways to reduce this — small daily savings add up.`)
    }

    if (data.hasPenalty) {
      recs.push(`Your budget was reduced by ${formatCurrency(data.penaltyAmount)} due to last month's overspending. This month, try to stay well below the adjusted limit to build a buffer.`)
    }

    const foodSpending = data.categoryBreakdown.find((c) => c.category === 'food')
    if (foodSpending && foodSpending.pct > 30) {
      recs.push(`Food & Drinks account for ${foodSpending.pct.toFixed(1)}% of expenses. Consider meal prepping or cooking at home to cut this by 20-30%.`)
    }

    recs.push(`Track your daily spending patterns — your data shows ${data.transactionCount} transactions this month. Setting daily spending limits can help maintain discipline.`)

    return recs.slice(0, 5)
  }

  async function generateReport() {
    generating.value = true
    reportError.value = null

    try {
      const data = collectReportData()
      const recommendations = await getAIRecommendations(data)

      // Dynamic import of jspdf to keep bundle small
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 20
      const contentW = pageW - margin * 2

      // ==================== PAGE 1: Cover ====================
      // Background gradient effect
      pdf.setFillColor(15, 23, 42) // slate-900
      pdf.rect(0, 0, pageW, pageH, 'F')

      // Accent strip
      pdf.setFillColor(99, 102, 241) // indigo-500
      pdf.rect(0, 0, pageW, 4, 'F')

      // Title
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(32)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Monthly Financial', margin, 80)
      pdf.text('Report', margin, 95)

      // Decorative line
      pdf.setDrawColor(99, 102, 241)
      pdf.setLineWidth(1)
      pdf.line(margin, 105, margin + 60, 105)

      // Meta info
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(148, 163, 184) // slate-400
      pdf.text(data.monthLabel, margin, 120)
      pdf.text(`Prepared for ${data.userName}`, margin, 130)

      // Key figures on cover
      pdf.setFontSize(11)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Quick Summary', margin, 160)

      const summaryItems = [
        { label: 'Total Income', value: formatCurrency(data.totalIncome), color: [16, 185, 129] as [number, number, number] },
        { label: 'Total Expenses', value: formatCurrency(data.totalExpenses), color: [239, 68, 68] as [number, number, number] },
        { label: 'Net Balance', value: formatCurrency(data.netBalance), color: data.netBalance >= 0 ? [16, 185, 129] as [number, number, number] : [239, 68, 68] as [number, number, number] },
        { label: 'Savings Rate', value: `${data.savingsRate.toFixed(1)}%`, color: data.savingsRate >= 20 ? [16, 185, 129] as [number, number, number] : [245, 158, 11] as [number, number, number] },
      ]

      let coverY = 170
      for (const item of summaryItems) {
        pdf.setFillColor(30, 41, 59) // slate-800
        pdf.roundedRect(margin, coverY, contentW, 14, 3, 3, 'F')

        pdf.setFontSize(10)
        pdf.setTextColor(148, 163, 184)
        pdf.text(item.label, margin + 5, coverY + 9)

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(item.color[0], item.color[1], item.color[2])
        pdf.text(item.value, pageW - margin - 5, coverY + 9, { align: 'right' })
        pdf.setFont('helvetica', 'normal')

        coverY += 18
      }

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`Generated by Chremate • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, pageH - 15)

      // ==================== PAGE 2: Financial Summary ====================
      pdf.addPage()
      addPageHeader(pdf, 'Financial Summary', margin, pageW)

      let y = 45

      // Income vs Expenses comparison
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(51, 65, 85)
      pdf.text('Income vs Expenses', margin, y)
      y += 8

      // Income bar
      const barMaxW = contentW - 80
      const incomeBarW = data.totalIncome > 0 ? barMaxW : 0
      const expenseBarW = data.totalIncome > 0 ? Math.min((data.totalExpenses / data.totalIncome) * barMaxW, barMaxW) : barMaxW

      pdf.setFillColor(16, 185, 129)
      pdf.roundedRect(margin, y, incomeBarW, 8, 2, 2, 'F')
      pdf.setFontSize(9)
      pdf.setTextColor(51, 65, 85)
      pdf.text(`Income: ${formatCurrency(data.totalIncome)}`, margin + incomeBarW + 3, y + 6)
      y += 14

      pdf.setFillColor(239, 68, 68)
      pdf.roundedRect(margin, y, expenseBarW, 8, 2, 2, 'F')
      pdf.text(`Expenses: ${formatCurrency(data.totalExpenses)}`, margin + expenseBarW + 3, y + 6)
      y += 20

      // Budget utilization
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text('Budget Utilization', margin, y)
      y += 8

      // Budget progress bar
      pdf.setFillColor(226, 232, 240) // slate-200
      pdf.roundedRect(margin, y, contentW, 10, 3, 3, 'F')

      const budgetBarW = Math.min((data.budgetUsedPct / 100) * contentW, contentW)
      if (data.budgetUsedPct > 100) {
        pdf.setFillColor(239, 68, 68)
      } else if (data.budgetUsedPct > 80) {
        pdf.setFillColor(245, 158, 11)
      } else {
        pdf.setFillColor(16, 185, 129)
      }
      pdf.roundedRect(margin, y, budgetBarW, 10, 3, 3, 'F')
      y += 15

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 116, 139)
      pdf.text(`${data.budgetUsedPct.toFixed(1)}% used`, margin, y)
      pdf.text(`Budget: ${formatCurrency(data.effectiveBudget)}`, pageW - margin, y, { align: 'right' })

      if (data.hasPenalty) {
        y += 12
        pdf.setFillColor(255, 251, 235) // amber-50
        pdf.roundedRect(margin, y, contentW, 16, 3, 3, 'F')
        pdf.setDrawColor(245, 158, 11)
        pdf.setLineWidth(0.5)
        pdf.roundedRect(margin, y, contentW, 16, 3, 3, 'S')
        pdf.setFontSize(8)
        pdf.setTextColor(146, 64, 14)
        pdf.text(`[!] Over-Budget Penalty: Budget reduced by ${formatCurrency(data.penaltyAmount)} from last month's overspending`, margin + 5, y + 10)
      }

      y += 25

      // Key metrics cards
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(51, 65, 85)
      pdf.text('Key Metrics', margin, y)
      y += 8

      const metrics = [
        { label: 'Total Transactions', value: `${data.transactionCount}` },
        { label: 'Avg Daily Expense', value: formatCurrency(data.totalExpenses / Math.max(data.dailyTrend.length, 1)) },
        { label: 'Budget Remaining', value: formatCurrency(Math.max(data.effectiveBudget - data.totalExpenses, 0)) },
        { label: 'Income-to-Expense Ratio', value: data.totalExpenses > 0 ? `${(data.totalIncome / data.totalExpenses).toFixed(2)}x` : 'N/A' },
      ]

      const cardW = (contentW - 6) / 2
      const cardH = 22
      metrics.forEach((m, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cx = margin + col * (cardW + 6)
        const cy = y + row * (cardH + 6)

        pdf.setFillColor(248, 250, 252) // slate-50
        pdf.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F')
        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.3)
        pdf.roundedRect(cx, cy, cardW, cardH, 3, 3, 'S')

        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text(m.label, cx + 5, cy + 9)

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 41, 59)
        pdf.text(m.value, cx + 5, cy + 18)
      })

      // ==================== PAGE 3: Category Breakdown ====================
      pdf.addPage()
      addPageHeader(pdf, 'Category Breakdown', margin, pageW)

      if (data.categoryBreakdown.length > 0) {
        // Use autoTable for the category table
        // Note: jsPDF built-in fonts don't support emoji, so we use text-only labels
        const tableBody = data.categoryBreakdown.map((c) => [
          c.label,
          formatCurrency(c.amount),
          `${c.pct.toFixed(1)}%`,
          '', // bar column placeholder
        ])

        autoTable(pdf, {
          startY: 45,
          head: [['Category', 'Amount', 'Share', 'Distribution']],
          body: tableBody,
          margin: { left: margin, right: margin },
          headStyles: {
            fillColor: [99, 102, 241],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 4,
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [51, 65, 85],
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 'auto' },
          },
          didDrawCell: (hookData: any) => {
            // Draw mini bar in the distribution column
            if (hookData.section === 'body' && hookData.column.index === 3) {
              const cat = data.categoryBreakdown[hookData.row.index]
              if (cat) {
                const cellX = hookData.cell.x + 3
                const cellY = hookData.cell.y + hookData.cell.height / 2 - 2
                const maxBarW = hookData.cell.width - 6
                const barW = Math.max((cat.pct / 100) * maxBarW, 2)

                pdf.setFillColor(226, 232, 240)
                pdf.roundedRect(cellX, cellY, maxBarW, 4, 1, 1, 'F')
                pdf.setFillColor(99, 102, 241)
                pdf.roundedRect(cellX, cellY, barW, 4, 1, 1, 'F')
              }
            }
          },
        })
      }

      // Top Expenses below the table
      const afterTableY = (pdf as any).previousAutoTable?.finalY || 120
      let topY = afterTableY + 15

      if (topY > pageH - 60) {
        pdf.addPage()
        addPageHeader(pdf, 'Top Expenses', margin, pageW)
        topY = 45
      } else {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(51, 65, 85)
        pdf.text('Top 5 Expenses', margin, topY)
        topY += 8
      }

      if (data.topExpenses.length > 0) {
        autoTable(pdf, {
          startY: topY,
          head: [['#', 'Description', 'Category', 'Date', 'Amount']],
          body: data.topExpenses.map((e, i) => [
            `${i + 1}`,
            e.description.length > 30 ? e.description.substring(0, 30) + '...' : e.description,
            e.category,
            e.date,
            formatCurrency(e.amount),
          ]),
          margin: { left: margin, right: margin },
          headStyles: {
            fillColor: [239, 68, 68],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 4,
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [51, 65, 85],
          },
          alternateRowStyles: {
            fillColor: [254, 242, 242],
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            4: { halign: 'right', fontStyle: 'bold' },
          },
        })
      }

      // ==================== PAGE 4: Daily Spending Trend ====================
      pdf.addPage()
      addPageHeader(pdf, 'Daily Spending Trend', margin, pageW)

      // Draw a simple bar chart
      const chartY = 50
      const chartH = 80
      const chartW = contentW
      const maxDailySpend = Math.max(...data.dailyTrend.map((d) => d.total), 1)
      const barCount = data.dailyTrend.length
      const barGap = Math.max(1, Math.min(2, chartW / barCount / 4))
      const barWidth = Math.max(2, (chartW - barGap * barCount) / barCount)

      // Y-axis labels
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(148, 163, 184)

      // Chart background
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(margin, chartY, chartW, chartH, 3, 3, 'F')

      // Grid lines
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.2)
      for (let i = 0; i <= 4; i++) {
        const lineY = chartY + chartH - (i / 4) * chartH
        pdf.line(margin, lineY, margin + chartW, lineY)

        const labelVal = (maxDailySpend * i) / 4
        if (labelVal >= 1000000) {
          pdf.text(`${(labelVal / 1000000).toFixed(1)}M`, margin - 1, lineY - 1, { align: 'right' })
        } else if (labelVal >= 1000) {
          pdf.text(`${(labelVal / 1000).toFixed(0)}K`, margin - 1, lineY - 1, { align: 'right' })
        }
      }

      // Bars
      data.dailyTrend.forEach((d, i) => {
        const barH = maxDailySpend > 0 ? (d.total / maxDailySpend) * (chartH - 5) : 0
        const bx = margin + i * (barWidth + barGap) + barGap / 2
        const by = chartY + chartH - barH

        if (d.total > 0) {
          // Gradient effect: base color gets more intense for higher spending
          const intensity = d.total / maxDailySpend
          if (intensity > 0.8) {
            pdf.setFillColor(239, 68, 68) // red for high
          } else if (intensity > 0.5) {
            pdf.setFillColor(245, 158, 11) // amber for medium
          } else {
            pdf.setFillColor(99, 102, 241) // indigo for normal
          }
          pdf.roundedRect(bx, by, barWidth, barH, 1, 1, 'F')
        }

        // X-axis labels (every few days to avoid clutter)
        if (barCount <= 15 || i % Math.ceil(barCount / 15) === 0) {
          pdf.setFontSize(6)
          pdf.setTextColor(148, 163, 184)
          pdf.text(d.date, bx + barWidth / 2, chartY + chartH + 6, { align: 'center' })
        }
      })

      // Chart legend
      const legendY = chartY + chartH + 15
      pdf.setFontSize(7)
      pdf.setTextColor(100, 116, 139)

      pdf.setFillColor(99, 102, 241)
      pdf.rect(margin, legendY, 6, 3, 'F')
      pdf.text('Normal', margin + 8, legendY + 3)

      pdf.setFillColor(245, 158, 11)
      pdf.rect(margin + 30, legendY, 6, 3, 'F')
      pdf.text('Medium', margin + 38, legendY + 3)

      pdf.setFillColor(239, 68, 68)
      pdf.rect(margin + 60, legendY, 6, 3, 'F')
      pdf.text('High', margin + 68, legendY + 3)

      // Daily stats below chart
      const statsY = legendY + 15
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(51, 65, 85)
      pdf.text('Spending Statistics', margin, statsY)

      const nonZeroDays = data.dailyTrend.filter((d) => d.total > 0)
      const avgDaily = nonZeroDays.length > 0 ? nonZeroDays.reduce((s, d) => s + d.total, 0) / nonZeroDays.length : 0
      const peakDay = data.dailyTrend.reduce((max, d) => (d.total > max.total ? d : max), { date: '-', total: 0 })
      const quietDays = data.dailyTrend.filter((d) => d.total === 0).length

      const dailyStats = [
        { label: 'Average Daily Expense', value: formatCurrency(avgDaily) },
        { label: 'Peak Spending Day', value: `Day ${peakDay.date} (${formatCurrency(peakDay.total)})` },
        { label: 'Zero-Spend Days', value: `${quietDays} day${quietDays !== 1 ? 's' : ''}` },
        { label: 'Active Spending Days', value: `${nonZeroDays.length} day${nonZeroDays.length !== 1 ? 's' : ''}` },
      ]

      let dsY = statsY + 8
      dailyStats.forEach((s) => {
        pdf.setFillColor(248, 250, 252)
        pdf.roundedRect(margin, dsY, contentW, 12, 2, 2, 'F')
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 116, 139)
        pdf.text(s.label, margin + 5, dsY + 8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 41, 59)
        pdf.text(s.value, pageW - margin - 5, dsY + 8, { align: 'right' })
        dsY += 16
      })

      // ==================== PAGE 5: AI Recommendations ====================
      pdf.addPage()
      addPageHeader(pdf, 'Consultant Recommendations', margin, pageW)

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 116, 139)
      pdf.text('AI-powered insights based on your spending patterns this month', margin, 42)

      let recY = 52
      recommendations.forEach((rec, i) => {
        const recH = 28
        if (recY + recH > pageH - 30) {
          pdf.addPage()
          addPageHeader(pdf, 'Recommendations (cont.)', margin, pageW)
          recY = 45
        }

        // Card background
        pdf.setFillColor(248, 250, 252)
        pdf.roundedRect(margin, recY, contentW, recH, 3, 3, 'F')

        // Accent stripe
        const accentColors: [number, number, number][] = [
          [99, 102, 241],  // indigo
          [16, 185, 129],  // emerald
          [245, 158, 11],  // amber
          [239, 68, 68],   // red
          [139, 92, 246],  // violet
        ]
        const accent = accentColors[i % accentColors.length]!
        pdf.setFillColor(accent[0], accent[1], accent[2])
        pdf.roundedRect(margin, recY, 3, recH, 1.5, 1.5, 'F')

        // Number badge
        pdf.setFillColor(accent[0], accent[1], accent[2])
        pdf.circle(margin + 12, recY + 10, 5, 'F')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text(`${i + 1}`, margin + 12, recY + 11.5, { align: 'center' })

        // Recommendation text
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(51, 65, 85)
        const lines = pdf.splitTextToSize(rec, contentW - 30)
        pdf.text(lines, margin + 22, recY + 10)

        recY += recH + 5
      })

      // Disclaimer at bottom
      recY += 10
      pdf.setFontSize(7)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Disclaimer: These recommendations are generated by AI and are for informational purposes only.', margin, recY)
      pdf.text('Please consult a certified financial advisor for personalized financial planning.', margin, recY + 8)

      // Footer on all pages
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        if (i > 1) {
          pdf.setFontSize(7)
          pdf.setTextColor(148, 163, 184)
          pdf.text(`Chremate Monthly Report • ${data.monthLabel}`, margin, pageH - 10)
          pdf.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 10, { align: 'right' })
        }
      }

      // Save PDF
      const filename = `Chremate_Report_${data.monthKey}.pdf`
      pdf.save(filename)

      return filename
    } catch (e: any) {
      console.error('Report generation failed:', e)
      reportError.value = e.message || 'Failed to generate report'
      throw e
    } finally {
      generating.value = false
    }
  }

  function addPageHeader(pdf: any, title: string, margin: number, pageW: number) {
    // Top accent line
    pdf.setFillColor(99, 102, 241)
    pdf.rect(0, 0, pageW, 2, 'F')

    // Title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 41, 59)
    pdf.text(title, margin, 25)

    // Separator
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.5)
    pdf.line(margin, 30, pageW - margin, 30)
  }

  return {
    generating,
    reportError,
    generateReport,
    collectReportData,
  }
}

// Cálculos de Matched Betting

const COMMISSION = 0.05 // 5% comisión del exchange (Betfair)

// Calcular stake de lay para qualifying bet (retener dinero)
export function calculateLayStakeQualifying(backStake: number, backOdds: number, layOdds: number): number {
  return (backStake * backOdds) / (layOdds - COMMISSION)
}

// Calcular stake de lay para free bet (SNR - Stake Not Returned)
export function calculateLayStakeFreeBet(freeBetStake: number, backOdds: number, layOdds: number): number {
  return (freeBetStake * (backOdds - 1)) / (layOdds - COMMISSION)
}

// Calcular liability (lo que arriesgas en el exchange)
export function calculateLiability(layStake: number, layOdds: number): number {
  return layStake * (layOdds - 1)
}

// Calcular beneficio de qualifying bet
export function calculateQualifyingProfit(
  backStake: number,
  backOdds: number,
  layStake: number,
  layOdds: number,
  result: 'won' | 'lost'
): number {
  if (result === 'won') {
    // Ganó en la casa: cobras en casa, pierdes en exchange
    const backWinnings = backStake * (backOdds - 1)
    const layLoss = layStake * (layOdds - 1)
    return backWinnings - layLoss
  } else {
    // Perdió en la casa: pierdes stake en casa, ganas en exchange
    const backLoss = backStake
    const layWinnings = layStake * (1 - COMMISSION)
    return layWinnings - backLoss
  }
}

// Calcular beneficio de free bet
export function calculateFreeBetProfit(
  freeBetStake: number,
  backOdds: number,
  layStake: number,
  layOdds: number,
  result: 'won' | 'lost'
): number {
  if (result === 'won') {
    // Ganó en la casa: cobras (stake * (odds-1)), pierdes en exchange
    const backWinnings = freeBetStake * (backOdds - 1)
    const layLoss = layStake * (layOdds - 1)
    return backWinnings - layLoss
  } else {
    // Perdió en la casa: no pierdes nada (era gratis), ganas en exchange
    const layWinnings = layStake * (1 - COMMISSION)
    return layWinnings
  }
}

// Calcular beneficio esperado (antes de saber resultado)
export function calculateExpectedProfit(
  stake: number,
  backOdds: number,
  layOdds: number,
  betType: 'qualifying' | 'freebet'
): number {
  const layStake = betType === 'qualifying'
    ? calculateLayStakeQualifying(stake, backOdds, layOdds)
    : calculateLayStakeFreeBet(stake, backOdds, layOdds)

  const profitIfWon = betType === 'qualifying'
    ? calculateQualifyingProfit(stake, backOdds, layStake, layOdds, 'won')
    : calculateFreeBetProfit(stake, backOdds, layStake, layOdds, 'won')

  const profitIfLost = betType === 'qualifying'
    ? calculateQualifyingProfit(stake, backOdds, layStake, layOdds, 'lost')
    : calculateFreeBetProfit(stake, backOdds, layStake, layOdds, 'lost')

  // El beneficio esperado es aproximadamente el mismo gane o pierda (matched betting)
  // Retornamos el promedio (deberían ser casi iguales si las cuotas son cercanas)
  return (profitIfWon + profitIfLost) / 2
}

// Formatear dinero
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

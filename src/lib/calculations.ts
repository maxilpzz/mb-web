// Cálculos de Matched Betting

const COMMISSION = 0.02 // 2% comisión del exchange (Betfair)

// Calcular stake de lay para qualifying bet (retener dinero)
export function calculateLayStakeQualifying(backStake: number, backOdds: number, layOdds: number): number {
  return (backStake * backOdds) / (layOdds - COMMISSION)
}

// Calcular stake de lay para free bet (SNR - Stake Not Returned)
export function calculateLayStakeFreeBet(freeBetStake: number, backOdds: number, layOdds: number): number {
  return (freeBetStake * (backOdds - 1)) / (layOdds - COMMISSION)
}

// Calcular stake de lay para apuesta de reembolso (solo si pierdes recibes freebet)
// La retención es el % del valor del freebet que esperas extraer (típicamente 0.75)
export function calculateLayStakeRefund(
  backStake: number,
  backOdds: number,
  layOdds: number,
  retention: number = 0.75
): number {
  // Fórmula: layStake = backStake × (backOdds - retención) / (layOdds - comisión)
  // Esto equilibra: si ganas en casa = si pierdes en casa + valor esperado del freebet
  return (backStake * (backOdds - retention)) / (layOdds - COMMISSION)
}

// Calcular beneficio de apuesta de reembolso (qualifying en casas only_if_lost)
// NOTA: Si pierde, el profit NO incluye el valor del freebet - ese se calcula aparte cuando se usa
export function calculateRefundProfit(
  backStake: number,
  backOdds: number,
  layStake: number,
  layOdds: number,
  result: 'won' | 'lost'
): number {
  if (result === 'won') {
    // Ganó en la casa: NO recibes freebet, pero ganas mucho en la casa
    const backWinnings = backStake * (backOdds - 1)
    const layLoss = layStake * (layOdds - 1)
    return backWinnings - layLoss
  } else {
    // Perdió en la casa: pierdes stake, ganas en exchange
    // El freebet que recibes se contabiliza cuando lo uses (apuesta separada)
    const backLoss = backStake
    const layWinnings = layStake * (1 - COMMISSION)
    return layWinnings - backLoss
  }
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

// Calcular beneficio esperado para apuesta de reembolso (qualifying en casas only_if_lost)
// NOTA: No incluye el valor del freebet - los resultados NO están balanceados
// Si gana: profit alto (+110€), si pierde: profit negativo (-40€) pero recibes freebet
export function calculateExpectedProfitRefund(
  stake: number,
  backOdds: number,
  layOdds: number,
  retention: number = 0.75
): number {
  const layStake = calculateLayStakeRefund(stake, backOdds, layOdds, retention)

  // Si gana en casa: cobras en casa, pierdes liability, NO recibes freebet
  const profitIfWon = calculateRefundProfit(stake, backOdds, layStake, layOdds, 'won')

  // Si pierde en casa: pierdes stake, ganas en exchange (sin contar freebet)
  const profitIfLost = calculateRefundProfit(stake, backOdds, layStake, layOdds, 'lost')

  // Retornamos el profit si PIERDE (el escenario "malo" de la qualifying)
  // porque el freebet se contabilizará aparte
  // Esto muestra el "coste" de la qualifying si pierdes
  return profitIfLost
}

// Formatear dinero
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Calcular lo que te debe la persona basándose en los resultados de las apuestas
export interface BetForOwesCalculation {
  betType: 'qualifying' | 'freebet' | string
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  result: 'won' | 'lost' | null | string
  actualProfit?: number | null  // Para apuestas manuales
}

export interface OwesBreakdown {
  moneyInBookmaker: number      // Dinero físico en la casa (lo que te debe)
  liabilityLost: number         // Liability perdida (apuestas que ganaron en casa)
  exchangeWinnings: number      // Ganancias en exchange (apuestas que perdieron en casa)
  exchangeBalance: number       // Balance en exchange = ganancias - pérdidas
  totalOwes: number             // Lo que te debe = moneyInBookmaker (el dinero físico)
  pendingBets: number           // Apuestas sin resultado
  breakdown: {
    betType: string
    betNumber?: number
    result: string
    moneyInBookmaker: number
    liabilityLost: number
    exchangeWinnings: number
  }[]
}

export function calculateOwes(bets: BetForOwesCalculation[]): OwesBreakdown {
  let moneyInBookmaker = 0
  let liabilityLost = 0
  let exchangeWinnings = 0
  let pendingBets = 0
  const breakdown: OwesBreakdown['breakdown'] = []

  bets.forEach((bet) => {
    if (bet.result === null) {
      pendingBets++
      return
    }

    // Detectar si es una apuesta manual (sin igualar)
    const isManualBet = bet.oddsBack === 0 || bet.oddsLay === 0

    if (isManualBet) {
      // Apuesta manual: el actualProfit ES el dinero en la casa
      const betMoneyInBookmaker = Math.max(0, bet.actualProfit || 0)

      if (betMoneyInBookmaker > 0) {
        moneyInBookmaker += betMoneyInBookmaker
        breakdown.push({
          betType: bet.betType,
          result: 'won',
          moneyInBookmaker: betMoneyInBookmaker,
          liabilityLost: 0,
          exchangeWinnings: 0
        })
      } else {
        // No ganó nada, no hay dinero en la casa
        breakdown.push({
          betType: bet.betType,
          result: 'lost',
          moneyInBookmaker: 0,
          liabilityLost: 0,
          exchangeWinnings: 0
        })
      }
      return
    }

    // Apuesta con lay: calcular normalmente
    const layStake = bet.liability / (bet.oddsLay - 1)

    if (bet.result === 'won') {
      // Ganó en la casa: dinero quedó allí, perdimos liability en exchange
      let betMoneyInBookmaker: number

      if (bet.betType === 'freebet') {
        // En freebet, solo ganas (oddsBack - 1) * stake, no te devuelven el stake
        betMoneyInBookmaker = bet.stake * (bet.oddsBack - 1)
      } else {
        // En qualifying, ganas stake * oddsBack
        betMoneyInBookmaker = bet.stake * bet.oddsBack
      }

      const betLiabilityLost = bet.liability

      moneyInBookmaker += betMoneyInBookmaker
      liabilityLost += betLiabilityLost

      breakdown.push({
        betType: bet.betType,
        result: 'won',
        moneyInBookmaker: betMoneyInBookmaker,
        liabilityLost: betLiabilityLost,
        exchangeWinnings: 0
      })
    } else {
      // Perdió en la casa: dinero en exchange, nada en la casa
      const betExchangeWinnings = layStake * (1 - COMMISSION)

      exchangeWinnings += betExchangeWinnings

      breakdown.push({
        betType: bet.betType,
        result: 'lost',
        moneyInBookmaker: 0,
        liabilityLost: 0,
        exchangeWinnings: betExchangeWinnings
      })
    }
  })

  return {
    moneyInBookmaker,
    liabilityLost,
    exchangeWinnings,
    exchangeBalance: exchangeWinnings - liabilityLost, // Balance neto en exchange
    totalOwes: moneyInBookmaker, // Te debe = dinero físico en la casa
    pendingBets,
    breakdown
  }
}

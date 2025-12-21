import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const bookmakers = [
  {
    name: 'DAZN Bet',
    bonusType: 'always',
    minDeposit: 5,
    maxDeposit: 200,
    numDeposits: 1,
    numQualifying: 1,
    minOddsQualifying: 1.5,
    bonusPercentage: 100,
    maxBonus: 200,
    numFreebets: 1,
    freebetValue: null,
    minOddsFreebet: null,
    maxOddsFreebet: null,
    sameEvent: true,
    daysToDeposit: 30,
    daysToQualify: 30,
    daysFreebetValid: 7,
    promoCode: null,
    notes: 'Activar manualmente desde "Promociones" antes del 1er depósito. +10€ freebet si apuestas 10€+',
    isActive: true,
  },
  {
    name: 'William Hill',
    bonusType: 'always',
    minDeposit: 10,
    maxDeposit: 200,
    numDeposits: 1,
    numQualifying: 1,
    minOddsQualifying: 2.0,
    bonusPercentage: 100,
    maxBonus: 200,
    numFreebets: 5, // 5 freebets de 40€
    freebetValue: 40,
    minOddsFreebet: null,
    maxOddsFreebet: null,
    sameEvent: true, // Se pueden usar en el mismo evento
    daysToDeposit: null,
    daysToQualify: null,
    daysFreebetValid: 15,
    promoCode: 'BIENVENIDA200',
    notes: 'Opción A: Igualar 1 freebet de 200€ (todas al mismo partido). Opción B: 5 freebets de 40€ sin igualar.',
    isActive: true,
  },
  {
    name: 'Sportium',
    bonusType: 'always',
    minDeposit: 100,
    maxDeposit: 100,
    numDeposits: 2, // Dos depósitos de 100€
    numQualifying: 2, // Una apuesta por depósito
    minOddsQualifying: 1.5,
    bonusPercentage: 100,
    maxBonus: 200, // 100€ + 100€
    numFreebets: 2,
    freebetValue: 100,
    minOddsFreebet: null,
    maxOddsFreebet: null,
    sameEvent: false, // Partidos DISTINTOS
    daysToDeposit: 30,
    daysToQualify: 30,
    daysFreebetValid: 7,
    promoCode: 'JBVIP',
    notes: 'Dos depósitos separados de 100€. Freebets en partidos DISTINTOS.',
    isActive: true,
  },
  {
    name: 'Retabet',
    bonusType: 'always',
    minDeposit: 20,
    maxDeposit: 150,
    numDeposits: 1,
    numQualifying: 1,
    minOddsQualifying: 2.0,
    bonusPercentage: 100,
    maxBonus: 150,
    numFreebets: 6, // 6 freebets de 25€
    freebetValue: 25,
    minOddsFreebet: 2.0,
    maxOddsFreebet: 3.5,
    sameEvent: false, // Partidos DISTINTOS
    daysToDeposit: 15,
    daysToQualify: 7,
    daysFreebetValid: 7,
    promoCode: null,
    notes: 'Freebets se liberan cada 48h. Cuota freebet máx 3.50. Partidos DISTINTOS.',
    isActive: true,
  },
  {
    name: 'Winamax',
    bonusType: 'only_if_lost',
    minDeposit: 15,
    maxDeposit: 100,
    numDeposits: 1,
    numQualifying: 1, // Apuestas hasta el importe del depósito
    minOddsQualifying: 1.5,
    bonusPercentage: 150, // 150% de lo perdido
    maxBonus: 150,
    numFreebets: 1,
    freebetValue: null,
    minOddsFreebet: null,
    maxOddsFreebet: null,
    sameEvent: true,
    daysToDeposit: 30,
    daysToQualify: 30,
    daysFreebetValid: null,
    promoCode: 'GOAT',
    notes: '¡TODO desde MISMO DISPOSITIVO! (registro, depósito, apuestas). Bono = 150% de apuestas PERDIDAS.',
    isActive: true,
  },
  {
    name: 'Marca Apuestas',
    bonusType: 'only_if_lost',
    minDeposit: 10,
    maxDeposit: 200,
    numDeposits: 1,
    numQualifying: 1,
    minOddsQualifying: 1.5,
    bonusPercentage: 100,
    maxBonus: 200,
    numFreebets: 1,
    freebetValue: null,
    minOddsFreebet: null,
    maxOddsFreebet: 10.0,
    sameEvent: true,
    daysToDeposit: null,
    daysToQualify: 7,
    daysFreebetValid: 7,
    promoCode: 'BONO',
    notes: 'Activar dentro de 48h tras depósito. Bono SOLO SI PIERDES la 1ª apuesta.',
    isActive: true,
  },
]

async function main() {
  console.log('Seeding bookmakers...')

  for (const bookmaker of bookmakers) {
    await prisma.bookmaker.upsert({
      where: { name: bookmaker.name },
      update: bookmaker,
      create: bookmaker,
    })
    console.log(`✓ ${bookmaker.name}`)
  }

  console.log('\nSeeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

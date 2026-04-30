import { PrismaClient } from '@prisma/client'
import { PCT_ACCOUNTS } from './src/utils/tunisia'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // This seed file can be used to populate initial data
  // The PCT accounts are initialized via the API endpoint: POST /api/accounts/init-pct

  console.log('✅ Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

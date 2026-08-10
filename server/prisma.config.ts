import { defineConfig } from 'prisma/config'
import 'dotenv/config'

const url = process.env.DATABASE_URL
const shadowUrl = url?.replace(/\/[^/?]+(\?|$)/, '/passwork_shadow$1')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url,
    shadowDatabaseUrl: shadowUrl,
  },
})

import 'dotenv/config'
import { Context } from 'cordis'
import { MediaWikiService } from './services/MediaWikiService'
import KeepAlive from './tasks/keep-alive'

const app = new Context()
app.start()

// Primary services
app.plugin(MediaWikiService, {
  endpoint: process.env.MW_API_ENDPOINT!,
  username: process.env.MW_BOT_USERNAME!,
  password: process.env.MW_BOT_PASSWORD!,
})

// Run tasks
app.plugin(KeepAlive)

const path = require("path")
const envPath = path.resolve("tests", ".env.test")
require('dotenv').config({ path: envPath })

jest.mock('@discordjs/voice')
jest.mock('play-dl')
jest.useFakeTimers()

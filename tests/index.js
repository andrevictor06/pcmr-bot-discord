const path = require("path")
const envPath = path.resolve("tests", ".env-test")
require('dotenv').config({ path: envPath })

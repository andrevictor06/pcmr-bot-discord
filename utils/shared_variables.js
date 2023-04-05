const sharedVariables = new Map()
const AUDIO_QUEUE_NAME = "audio_queue"
const MUSIC_QUEUE_NAME = "music_queue"
const MUSIC_TIMEOUT_ID = "music_timeout_id"
const MUSIC_INTERVAL_ID = "music_interval_id"

function setSharedVariable(name, value) {
    sharedVariables.set(name, value)
}

function getSharedVariable(name) {
    return sharedVariables.get(name)
}

function sharedVariableExists(name) {
    return sharedVariables.has(name)
}

function deleteSharedVariable(name) {
    sharedVariables.delete(name)
}

function clearSharedVariables() {
    sharedVariables.clear()
}

module.exports = {
    setSharedVariable,
    getSharedVariable,
    sharedVariableExists,
    deleteSharedVariable,
    clearSharedVariables: process.env.ENVIRONMENT === "TEST" ? clearSharedVariables : undefined,
    AUDIO_QUEUE_NAME,
    MUSIC_QUEUE_NAME,
    MUSIC_TIMEOUT_ID,
    MUSIC_INTERVAL_ID
}
const utils = require("./Utils")

const sharedVariables = new Map()

function setSharedVariable(name, value, expiration) {
    if (expiration) {
        sharedVariables.set(name + "_expiration", expiration)
    }
    sharedVariables.set(name, value)
}

function getSharedVariable(name) {
    const expiration = sharedVariables.get(name + "_expiration")
    if (expiration && utils.nowInSeconds() > expiration) {
        sharedVariables.delete(name)
        sharedVariables.delete(name + "_expiration")
        return null
    }
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
    clearSharedVariables: process.env.ENVIRONMENT === "TEST" ? clearSharedVariables : undefined
}
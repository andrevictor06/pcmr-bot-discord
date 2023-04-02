const { LocalStorage } = require('node-localstorage')
const path = require('path')

const localStorage = new LocalStorage(path.resolve('.localstorage/'))

function setItem(key, value) {
    localStorage.setItem(key, value)
}

function getItem(key) {
    return localStorage.getItem(key)
}

function removeItem(key) {
    localStorage.removeItem(key)
}

module.exports = {
    setItem,
    getItem,
    removeItem
}
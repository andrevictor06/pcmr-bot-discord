class InMemoryStorage {
    map = new Map()

    getItem(key) {
        return this.map.get(key)
    }
    setItem(key, value) {
        this.map.set(key, value)
    }
    removeItem(key) {
        this.map.delete(key)
    }
}

module.exports = {
    InMemoryStorage
}
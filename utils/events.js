const { Subject, filter, map } = require('rxjs')

const subject = new Subject()

function emit(key, value) {
    subject.next({
        key,
        value
    })
}

function event(key) {
    return subject.pipe(
        filter(ev => ev.key === key),
        map(ev => ev.value)
    )
}

module.exports = {
    emit,
    event
}
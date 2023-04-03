const { Subject, filter, map, catchError } = require('rxjs')

const subject = new Subject()

function emit(key, value = null) {
    subject.next({
        key,
        value
    })
}

function event(key) {
    return subject.pipe(
        filter(ev => ev.key === key),
        map(ev => ev.value),
        catchError(error => utils.logError(bot, error, __filename))
    )
}

module.exports = {
    emit,
    event
}
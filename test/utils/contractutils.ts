export function findEvent(tx: any, eventName: string) {
    for (const log of tx.logs) {
        if (log.event === eventName) {
            return log;
        }
    }
    return undefined;
}

export function idFromEvent(tx: any) {
    for (const log of tx.logs) {
        if (log.args.id) {
            return log.args.id;
        }
    }
    return undefined;
}

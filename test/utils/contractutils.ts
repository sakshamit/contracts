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

export function is0x0Address(address: string) {
    return address === "0x0" || address === "0x0000000000000000000000000000000000000000";
}

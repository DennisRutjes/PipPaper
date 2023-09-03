import {Trade} from "../storage/entities/Trade.ts";

export function groupBy<Key extends string | number, Item extends Record<Key, any>>(items: Item[], key: Key): Record<string | number, Item[]> {
    return items.reduce(
        (result: Record<string | number, Item[]>, item: Item) => ({
            ...result,
            [item[key]]: [
                ...(result[item[key]] || []),
                item,
            ],
        }),
        {} as Record<string | number, Item[]>,
    );
}

export const getTradeStartDate = (trade: Trade): number => {
    return trade.EntryTimestamp < trade.ExitTimestamp ? trade.EntryTimestamp : trade.ExitTimestamp;
}

export const getTradeEndDate = (trade: Trade): number => {
    return trade.EntryTimestamp > trade.ExitTimestamp ? trade.EntryTimestamp : trade.ExitTimestamp;
}

export const dateInterval = (date1: Date, date2: Date): string => {
    let delta = Math.abs(date1.getTime() - date2.getTime()) * 1000;
    //console.log(delta)
    const units = [
        {name: 'y', duration: 1000 * 60 * 60 * 24 * 365},
        {name: 'm', duration: 1000 * 60 * 60 * 24 * 30},
        {name: 'w', duration: 1000 * 60 * 60 * 24 * 7},
        {name: 'd', duration: 1000 * 60 * 60 * 24},
        {name: 'h', duration: 1000 * 60 * 60},
        {name: 'm', duration: 1000 * 60},
        {name: 's', duration: 1000},
    ];

    const results = [];

    for (const unit of units) {
        const quotient = Math.floor(delta / unit.duration);

        if (quotient != 0) {
            results.push(`${quotient}${unit.name}${quotient === 1 ? '' : ''}`);
        }
        delta = delta % unit.duration;
    }

    return results.join(' ');
};
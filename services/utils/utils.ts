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
import {Importer} from "../Importer.ts";
import {readCSVObjects} from "https://deno.land/x/csv@v0.7.2/reader.ts";
import {asyncArrayFrom} from "https://deno.land/x/csv@v0.7.2/utils.ts";

import {readLines} from "https://deno.land/std@0.199.0/io/mod.ts";
import {Trade} from "../../storage/entities/Trade.ts";
import * as dt from "https://deno.land/std@0.200.0/datetime/mod.ts";

type AnyDict = {
    [key: string]: any
};

interface TradeData {
    symbol: string;
    _priceFormat: string;
    _priceFormatType: string;
    _tickSize: string;
    buyFillId: string;
    sellFillId: string;
    qty: string;
    buyPrice: string;
    sellPrice: string;
    pnl: string;
    boughtTimestamp: string;
    soldTimestamp: string;
    duration: string;
}


async function importCsvFile(file: string) {
    const f = await Deno.open(file);

    let header: string[] | undefined;
    let objects: object[] = [];
    for await (let line of readLines(f)) {
        const row = line.split(",")
        if (!header) {
            header = row;
            continue;
        }

        const obj: {
            [key: string]: string
        } = {};
        for (let i = 0; i < header.length; i++) {
            obj[header[i]] = row[i];
        }
        objects.push(obj)
    }

    f.close()

    return new Promise<object[]>((resolve, reject) => {
        resolve(objects);
    })
}

export class TradovateImporter implements Importer {

    importPath: string

    constructor(importPath: string) {
        this.importPath = importPath;
    }

    import(): void {
        throw new Error("Method not implemented.");
    }

    getBroker(): string {
        return "tradovate";
    }


    async importCSV(file: string): Promise<object[]> {
        return await importCsvFile(this.importPath + "/" + file)
    }

    async readTrades(file: string): Promise<Trade[]> {
        return (await importCsvFile(this.importPath + "/" + file))
            //.map(logAnyDict)
            .map((anyDict: AnyDict) => mapPerformance2Trade(this.getBroker(), anyDict))
    }

}

function logAnyDict(anyDict: AnyDict): AnyDict {
    console.log(anyDict)
    return anyDict
}

/*
  {
    symbol: "MESU3",
    _priceFormat: "-2",
    _priceFormatType: "0",
    _tickSize: "0.25",
    buyFillId: "14319319017",
    sellFillId: "14319319051",
    qty: "1",
    buyPrice: "4481.50",
    sellPrice: "4482.00",
    pnl: "$2.50",
    boughtTimestamp: "08/11/2023 10:59:12",
    soldTimestamp: "08/11/2023 11:03:07",
    duration: "3min 55sec"
  },

 */
function mapPerformance2Trade(broker: string, {
    symbol, buyFillId, sellFillId, qty, pnl,
    buyPrice, boughtTimestamp,
    sellPrice, soldTimestamp
}: AnyDict): Trade {

    const currencyValue: CurrencyValue = parseCurrencyValue(pnl);

    return <Trade>{
        Symbol: symbol,
        Broker: broker,
        BrokerTradeID: buyFillId + "_" + sellFillId, // create a new unique key
        Quantity: +qty,
        PnL: currencyValue.value,
        Currency: currencyValue.currency,
        EntryPrice: +buyPrice,
        EntryTimestamp: dt.parse(boughtTimestamp, "MM/dd/yyyy HH:mm:ss").getTime() / 1000,
        ExitPrice: +sellPrice,
        ExitTimestamp: dt.parse(soldTimestamp, "MM/dd/yyyy HH:mm:ss").getTime() / 1000,
    }
}

interface CurrencyValue {
    currency: string;
    value: number;
}

function parseCurrencyValue(str: string): CurrencyValue {
    const regex = /^(\$)(\()?(.+?)(\))?$/;
    const matches = str.match(regex);

    if (!matches) {
        return {currency: "?", value: 0.0};
    }

    const [, currency, , valueStr, hasBrackets] = matches;
    let value = parseFloat(valueStr);

    // If string was enclosed in brackets, value is negative
    if (hasBrackets === ')') {
        value *= -1;
    }

    return {currency, value};
}
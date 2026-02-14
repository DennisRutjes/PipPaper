import {Importer} from "../Importer.ts";
import {readCSVObjects} from "https://deno.land/x/csv@v0.7.2/reader.ts";
import {asyncArrayFrom} from "https://deno.land/x/csv@v0.7.2/utils.ts";

import {Buffer} from "https://deno.land/std@0.199.0/io/buffer.ts";
import {readLines} from "https://deno.land/std@0.199.0/io/mod.ts";
import {Trade} from "../../storage/entities/Trade.ts";
import * as dt from "https://deno.land/std@0.200.0/datetime/mod.ts";
import {Cost} from "../../storage/entities/Cost.ts";


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


const headerMapping: {[key: string]: string} = {
    "Symbol": "symbol",
    "Buy Fill Id": "buyFillId",
    "Sell Fill Id": "sellFillId",
    "Qty": "qty",
    "PnL": "pnl",
    "P&L": "pnl",
    "Buy Price": "buyPrice",
    "Bought Timestamp": "boughtTimestamp",
    "Sell Price": "sellPrice",
    "Sold Timestamp": "soldTimestamp"
};

async function importCsvFile(file: string): Promise<AnyDict[]> {
    const f = await Deno.open(file);

    const objects: AnyDict[] = [];
    for await (const csvObj of readCSVObjects(f)) {
        const obj: AnyDict = {};

        Object.keys(csvObj).forEach(key => {
            const normalizeKey = key.replaceAll(" ", "_").trim()
            obj[normalizeKey] = csvObj[key].trim()
        });

        objects.push(obj)
    }
    f.close();
    return objects;
}

async function parseCsvContent(content: string): Promise<AnyDict[]> {
    const buf = new Buffer(new TextEncoder().encode(content));

    const objects: object[] = [];
    for await (const csvObj of readCSVObjects(buf)) {
        const obj: {
            [key: string]: string
        } = {};

        Object.keys(csvObj).forEach(key => {
            const trimmedKey = key.trim();
            const mappedKey = headerMapping[trimmedKey] || trimmedKey.replaceAll(" ", "_");
            obj[mappedKey] = csvObj[key].trim()
        });

        objects.push(obj)
    }

    return objects;
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

    async readCosts(file: string): Promise<Cost[]> {
        return (await importCsvFile(this.importPath + "/" + file))
            //.map(logAnyDict)
            .map((anyDict: AnyDict) => mapCost(this.getBroker(), anyDict))
    }

    async readTrades(file: string): Promise<Trade[]> {
        return (await importCsvFile(this.importPath + "/" + file))
            //.map(logAnyDict)
            .map((anyDict: AnyDict) => mapPerformance2Trade(this.getBroker(), anyDict))
    }

    async parseTrades(content: string): Promise<Trade[]> {
        return (await parseCsvContent(content))
            //.map(logAnyDict)
            .map((anyDict: AnyDict) => mapPerformance2Trade(this.getBroker(), anyDict))
            .filter((t: Trade | null) => t !== null) as Trade[]
    }
}

function mapCost(broker: string, {Contract, Timestamp, Cash_Change_Type, Delta, Currency}: AnyDict): Cost {
    return <Cost>{
        Timestamp: dt.parse(Timestamp, "MM/dd/yyyy HH:mm:ss").getTime() / 1000,
        Contract: Contract,
        Currency: Currency,
        Type: Cash_Change_Type,
        Amount: +Delta
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
function mapPerformance2Trade(broker: string, dict: AnyDict): Trade | null {
    const {
        symbol, buyFillId, sellFillId, qty, pnl,
        buyPrice, boughtTimestamp,
        sellPrice, soldTimestamp
    } = dict;

    if (!boughtTimestamp || !soldTimestamp) {
        // console.warn("Missing timestamp for trade:", dict);
        return null;
    }

    const currencyValue: CurrencyValue = parseCurrencyValue(pnl);

    const trade = <Trade>{
        Symbol: symbol,
        Broker: broker,
        BrokerTradeID: buyFillId + "_" + sellFillId, // create a new unique key
        Quantity: +qty,
        PnL: currencyValue.value,
        Currency: currencyValue.currency,
    }

    const bTs: number = dt.parse(boughtTimestamp, "MM/dd/yyyy HH:mm:ss").getTime() / 1000
    const sTs: number = dt.parse(soldTimestamp, "MM/dd/yyyy HH:mm:ss").getTime() / 1000

    if (bTs < sTs) {
        trade.EntryTimestamp = bTs
        trade.EntryPrice = +buyPrice
        trade.ExitTimestamp = sTs
        trade.ExitPrice = +sellPrice
    } else {
        trade.EntryTimestamp = sTs
        trade.EntryPrice = +sellPrice
        trade.ExitTimestamp = bTs
        trade.ExitPrice = +buyPrice
    }

    return trade
}

interface CurrencyValue {
    currency: string;
    value: number;
}

function parseCurrencyValue(str: string): CurrencyValue {
    if (!str) return {currency: "?", value: 0.0};
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
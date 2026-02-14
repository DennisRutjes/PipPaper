import { storage } from "../storage/StorageKV.ts";

const DEFAULT_MULTIPLIERS: Record<string, number> = {
    "NQ": 20,
    "MNQ": 2,
    "ES": 50,
    "MES": 5,
    "YM": 5,
    "MYM": 0.5,
    "RTY": 50,
    "M2K": 5,
    "CL": 1000,
    "MCL": 100,
    "GC": 100,
    "MGC": 10,
    "SI": 5000,
    "HG": 25000,
    "NG": 2500,
    "ZB": 1000,
    "ZN": 1000,
    "ZF": 1000,
    "ZT": 2000,
    "6E": 125000,
    "6J": 12500000,
    "6B": 62500,
    "6A": 100000,
};

const DEFAULT_MAPPINGS: Record<string, string> = {
    "ES": "ES=F",
    "NQ": "NQ=F",
    "MES": "ES=F",
    "MNQ": "NQ=F",
    "MESU3": "ES=F",
    "MNQU3": "NQ=F",
    "YM": "YM=F",
    "RTY": "RTY=F",
    "CL": "CL=F",
    "GC": "GC=F",
    "SI": "SI=F",
    "ZB": "ZB=F",
    "6E": "EURUSD=X",
    "6J": "JPYUSD=X",
};

function getEnvConfig(): { mappings: Record<string, string>, multipliers: Record<string, number> } {
    try {
        const envStr = Deno.env.get("SYMBOL_CONFIG");
        if (envStr) {
            return JSON.parse(envStr);
        }
    } catch (e) {
        console.error("Failed to parse SYMBOL_CONFIG from .env", e);
    }
    return { mappings: {}, multipliers: {} };
}

export async function getSymbolMultiplier(symbol: string): Promise<number> {
    // 1. Check user storage override
    const userMultipliers = await storage.getSymbolMultipliers();
    if (userMultipliers[symbol]) return userMultipliers[symbol];

    // 2. Check .env config
    const envConfig = getEnvConfig();
    if (envConfig.multipliers && envConfig.multipliers[symbol]) return envConfig.multipliers[symbol];

    // 3. Check defaults (exact match)
    if (DEFAULT_MULTIPLIERS[symbol]) return DEFAULT_MULTIPLIERS[symbol];

    // 4. Strip futures codes
    const base = symbol.replace(/[FGHJKMNQUVXZ]\d{1,2}$/i, "");
    if (userMultipliers[base]) return userMultipliers[base];
    if (envConfig.multipliers && envConfig.multipliers[base]) return envConfig.multipliers[base];
    if (DEFAULT_MULTIPLIERS[base]) return DEFAULT_MULTIPLIERS[base];

    // 5. Default
    return 1;
}

export async function getSymbolMapping(symbol: string): Promise<string> {
    // 1. Storage
    const userMappings = await storage.getSymbolMappings();
    if (userMappings[symbol]) return userMappings[symbol];

    // 2. Env
    const envConfig = getEnvConfig();
    if (envConfig.mappings && envConfig.mappings[symbol]) return envConfig.mappings[symbol];

    // 3. Default
    if (DEFAULT_MAPPINGS[symbol]) return DEFAULT_MAPPINGS[symbol];

    // 4. Strip futures
    const base = symbol.replace(/[FGHJKMNQUVXZ]\d{1,2}$/i, "");
    if (userMappings[base]) return userMappings[base];
    if (envConfig.mappings && envConfig.mappings[base]) return envConfig.mappings[base];
    if (DEFAULT_MAPPINGS[base]) return DEFAULT_MAPPINGS[base];

    return symbol;
}

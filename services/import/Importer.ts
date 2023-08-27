import {Trade} from "../storage/entities/Trade.ts";


export interface Importer {
    getBroker(): string
    import(): void
}
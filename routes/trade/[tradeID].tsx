import {Handlers, PageProps, HandlerContext, Request} from "$fresh/server.ts";
import SideMenu from "../../islands/SideMenu.tsx";
import {store} from "../../services/storage/StorageService.ts";
import * as dt from "https://deno.land/std@0.200.0/datetime/mod.ts";
import {Trade} from "../../services/storage/entities/Trade.ts";
import {getTradeEndDate, getTradeStartDate, dateInterval} from "../../services/utils/utils.ts";


export const handler: Handlers = {
    async GET(req: Request, ctx: HandlerContext) {
        const trade: Trade = store.getTrade(+ctx.params.tradeID || 0);
        return await ctx.render({
            trade: trade
        });
    },
    async POST(req, ctx) {
        const form = await req.formData();
        const email = form.get("email")?.toString();

        // Add email to list.

        // Redirect user to thank you page.
        const headers = new Headers();
        headers.set("location", "/thanks-for-subscribing");
        return new Response(null, {
            status: 303, // See Other
            headers,
        });
    },
};
export default function TradeDetail(props: PageProps) {
    const trade: Trade = props.data.trade
    return <>
        <SideMenu active="Trade Log"/>
        <div className="px-10 py-4 sm:ml-64">
            <div className="grid grid-cols-3 gap-4 p-4" >
                <div className="">
                    <div className="px-4 sm:px-0">
                        <div className="font-medium text-gray-700 text-2xl">Tracking</div>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Add personal tracking
                            information</p>
                    </div>
                    <div className="px-4 sm:px-0">
                        <div className="font-medium text-gray-700 text-2xl">{trade.Symbol}</div>
                        <div className="font-medium text-gray-700 text-1xl">
                            Start: {new Date(getTradeStartDate(trade) * 1000).toDateString()},
                            Duration: {dateInterval(new Date(trade.ExitTimestamp), new Date(trade.EntryTimestamp))}
                        </div>
                    </div>
                </div>
                <div className="col-span-2">
                    <img alt="trading view" src="/tv_place_holder.png"/>
                </div>
            </div>

        </div>
    </>;
}

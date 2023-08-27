import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";

import {Importer} from "../services/import/ImporterService.ts";

import SideMenu, {menu_active} from "../islands/SideMenu.tsx";

interface ImportTrades {
}

export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {

        let response = await Importer.importTradovate("./import-data/tradovate")
            .then((r)=>{
               console.log("imported trades :", r)
        }).catch((err)=> console.log(err));
        return ctx.render({upload: {}});
    },
};

export default function ProjectPage(props: PageProps<ImportTrades>) {
    return (
        <>
            <SideMenu active={"Import Trades"}/>
            <div className="p-4 sm:ml-64">
                IMPORT TRADES
            </div>
        </>
    );
}

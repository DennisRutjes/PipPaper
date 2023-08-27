import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import SideMenu, {menu_active} from "../islands/SideMenu.tsx";

interface Upload {
}

export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {
        return ctx.render({upload: {}});
    },
};

export default function ProjectPage(props: PageProps<Upload>) {
    return (
        <>
            <SideMenu active={"Daily Stats"} />
            <div className="p-4 sm:ml-64">
                Daily Stats
            </div>
        </>
    );
}

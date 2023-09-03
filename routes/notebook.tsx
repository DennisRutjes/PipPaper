import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import SideMenu, {menu_active} from "../islands/SideMenu.tsx";
import Countdown from "../islands/Countdown.tsx";

interface Upload {
}

export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {
        return ctx.render({upload: {}});
    },
};

export default function ProjectPage(props: PageProps<Upload>) {
    const date = new Date();
    date.setHours(date.getHours() + 1);

    return (
        <>
            <SideMenu active={"Notebook"} />
            <div className="p-4 sm:ml-64">
                Notebook
                <p>
                    The big event is happening <Countdown target={date.toISOString()} />.
                </p>
            </div>
        </>
    );
}

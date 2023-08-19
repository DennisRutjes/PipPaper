import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import {Note} from "../storage/entities/Note.ts";
import {Store} from "../storage/StorageService.ts";

import { Signal } from "@preact/signals";

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
            <div className="p-4 sm:ml-64">
                UPLOAD

            </div>
        </>
    );
}

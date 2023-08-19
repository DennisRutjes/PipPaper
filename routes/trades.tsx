import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import {Note} from "../storage/entities/Note.ts";
import {Store} from "../storage/StorageService.ts";

interface Trades {
    notes: Note[];
}

export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {
        const notes: Note[] = Store.listNotes();
        // if (!project) {
        //     return new Response("Project not found", { status: 404 });
        // }
        return ctx.render({notes: notes});
    },
};

export default function ProjectPage(props: PageProps<Trades>) {
    //const { data } = props.data;
    const tradeNotes = props.data.notes;

    //console.log(tradeNotes);

    return (
        <>
            <div className="p-4 sm:ml-64">
                <ul>
                    {tradeNotes.map((note) => (
                        <li>{note.NoteID} {note.NoteDate} {note.Note}</li>
                    ))}
                </ul>
            </div>
        </>
    );
}

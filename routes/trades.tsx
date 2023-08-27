import { useSignal } from "@preact/signals";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { Note } from "../services/storage/entities/Note.ts";
import { store } from "../services/storage/StorageService.ts";
import SideMenu from "../islands/SideMenu.tsx";
import DateFormat from "../components/DateFormat.tsx";

interface Trades {
  notes: Note[];
}

export const handler: Handlers<Trades> = {
  async GET(_req, ctx) {
    const notes: Note[] = store.listNotes();
    // if (!project) {
    //     return new Response("Project not found", { status: 404 });
    // }
    return ctx.render({ notes: notes });
  },
};

export default function ProjectPage(props: PageProps<Trades>) {
  //const { data } = props.data;
  const tradeNotes = props.data.notes;

  const sliderSignal = useSignal("/trades");

  //console.log(tradeNotes);

  return (
    <>
      <SideMenu active={"Trades"} />
      <div className="p-4 sm:ml-64">
        <ul>
          {tradeNotes.map((note) => (
            <li>{note.NoteID} {note.NoteData} <DateFormat date_in_epoch_ms={note.createdAt*1000}/></li>
          ))}
        </ul>
      </div>
    </>
  );
}

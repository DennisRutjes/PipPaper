import type {Signal} from "@preact/signals";
import {Button} from "../components/Button.tsx";
import {IS_BROWSER} from "$fresh/runtime.ts";
interface CounterProps {
    count: Signal<number>;
}

export default function Counter(props: CounterProps) {
    console.log("IS_BROWSER: ", IS_BROWSER)
    return (
        <div class="flex gap-8 py-6">
            <Button onClick={() => props.count.value -= 1}>-1</Button>
            <p class="text-3xl">{props.count}</p>
            <Button onClick={() => props.count.value += 1}>+1</Button>
        </div>
    );
}

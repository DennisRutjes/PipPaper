import { Signal, useSignal } from "@preact/signals";

export type AppStateType = {
  currentActiveMenu: Signal<string>;
};
export default function createAppState(): AppStateType {
  const currentActiveMenu = useSignal("/");
  return { currentActiveMenu };
}

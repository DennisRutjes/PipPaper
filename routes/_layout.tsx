import { LayoutProps } from "$fresh/server.ts";

import SideMenu from "../islands/SideMenu.tsx";

export default function Layout({ Component, state }: LayoutProps) {
  return (
    <div className="layout">
      <Component />
    </div>
  );
}

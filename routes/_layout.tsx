import { LayoutProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";

export default function Layout({ Component, state }: LayoutProps) {
    // do something with state here
    return (
        <div className="layout">
            <SideMenu />
            <Component />
        </div>
    );
}
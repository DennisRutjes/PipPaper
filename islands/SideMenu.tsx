import {JSX} from "preact";
import {useEffect, useState} from "preact/hooks";
import {IS_BROWSER} from "$fresh/runtime.ts";

export interface MenuProps {
    active: string
}

export default function SideMenu({active}: MenuProps) {
    const menus = [
        { name: "Import Trades", href: "/import_trades"  },
        { name: "Dashboard", href: "/"  },
        { name: "Daily Stats", href: "/stats_daily" },
        { name: "Trade Log", href: "/trade_log" },
        { name: "Notebook", href: "/notebook" },
    ];

    return (
        <aside
            id="default-sidebar"
            className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0"
            aria-label="Sidebar"
        >
            <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <ul className="space-y-2 font-medium">
                    {menus.map((menu) => (
                        <li>
                            <a href={menu.href} onclick={() => setActiveMenu(menu.name)}
                                className={"flex items-center p-2 rounded-lg group " +
                                    (menu.name == active
                                        ? "text-white hover:bg-gray-500 "
                                        : "text-gray-500 hover:text-gray-200 hover:bg-gray-500"
                                    )}
                            >
                                <span className="ml-3"> {menu.name} </span>
                            </a>
                        </li>
                    ))}


                </ul>
            </div>
        </aside>
    );
}

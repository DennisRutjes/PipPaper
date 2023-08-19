import {JSX} from "preact";
import {IS_BROWSER} from "$fresh/runtime.ts";

export default function SideMenuCPY() {


    return (
        <aside
            id="default-sidebar"
            className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0"
            aria-label="Sidebar">
            <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <ul className="space-y-2 font-medium">
                    <li>
                        <a href="/trades"
                            className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                        >

                            <span className="ml-3">Trades</span>
                        </a>
                    </li>

                    <li>
                        <a href="/trades"
                           className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                        >

                            <span className="ml-3">Trades</span>
                        </a>
                    </li>


                </ul>
            </div>
        </aside>);

}







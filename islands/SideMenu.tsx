import { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

export default function SideMenuCPY() {
    const [activeMenu, setActiveMenu] = useState('/un');

    useEffect(() => {
        if (IS_BROWSER) {
            console.log(window.location.pathname)
            setActiveMenu(window.location.pathname)
        }
    }, [])

    return (
        <aside
            id="default-sidebar"
            className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0"
            aria-label="Sidebar">
            <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <ul className="space-y-2 font-medium">
                    <li>
                        <a href="/"
                           className={`flex items-center p-2 rounded-lg group ${
                               activeMenu === '/' ? 'text-white bg-blue-400' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                           }`}
                           onClick={() => setActiveMenu('/')}
                        >
                            <span className="ml-3">Start</span>
                        </a>
                    </li>

                    <li>
                        <a href="/trades"
                           className={`flex items-center p-2 rounded-lg group ${
                               activeMenu === '/trades' ? 'text-white bg-blue-400' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                           }`}
                           onClick={() => setActiveMenu('/trades')}
                        >
                            <span className="ml-3">Trades</span>
                        </a>
                    </li>

                    <li>
                        <a href="/upload"
                           className={`flex items-center p-2 rounded-lg group ${
                               activeMenu === '/upload' ? 'text-white bg-blue-400' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                           }`}
                           onClick={() => setActiveMenu('/upload')}
                        >
                            <span className="ml-3">Upload</span>
                        </a>
                    </li>
                </ul>
            </div>
        </aside>);
}
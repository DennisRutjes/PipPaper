import { useState, useEffect } from "preact/hooks";

export interface MenuProps {
    active: string;
}

function DashboardIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
    );
}

function ImportIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
    );
}

function StatsIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );
}

function TradeLogIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    );
}

function PlaybookIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    );
}

function NotebookIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    );
}

export default function SideMenu({ active }: MenuProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem("pp-theme");
        if (saved === "light") {
            setDarkMode(false);
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
        } else {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
        }
    }, []);

    const toggleTheme = () => {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem("pp-theme", next ? "dark" : "light");
        if (next) {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            document.body.style.background = "#0f1117";
            document.body.style.color = "#e2e8f0";
        } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
            document.body.style.background = "#f8fafc";
            document.body.style.color = "#1e293b";
        }
    };

    const menus = [
        { name: "Dashboard", href: "/", icon: DashboardIcon },
        { name: "Trade Log", href: "/trade_log", icon: TradeLogIcon },
        { name: "Daily Stats", href: "/stats_daily", icon: StatsIcon },
        { name: "Playbook", href: "/playbook", icon: PlaybookIcon },
        { name: "Notebook", href: "/notebook", icon: NotebookIcon },
        { name: "Import Trades", href: "/import_trades", icon: ImportIcon },
        { name: "Settings", href: "/settings", icon: SettingsIcon },
    ];

    // Theme-aware classes
    const sidebarBg = darkMode ? "bg-[#141622] border-[#1e2235]" : "bg-white border-gray-200";
    const headerBorder = darkMode ? "border-[#1e2235]" : "border-gray-200";
    const activeClass = darkMode
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    const inactiveClass = darkMode
        ? "text-gray-400 hover:text-gray-200 hover:bg-white/5 border-transparent"
        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-transparent";
    const toggleBg = darkMode ? "bg-[#1a1d2e] hover:bg-[#222640]" : "bg-gray-100 hover:bg-gray-200";
    const toggleText = darkMode ? "text-gray-400" : "text-gray-600";

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                class={`fixed top-4 left-4 z-50 sm:hidden p-2 rounded-lg ${darkMode ? "bg-[#1a1d2e] text-gray-400" : "bg-white text-gray-600 shadow"} hover:text-white`}
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    class="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                class={`fixed top-0 left-0 z-40 w-[240px] h-screen transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0`}
                aria-label="Sidebar"
            >
                <div class={`h-full flex flex-col ${sidebarBg} border-r`}>
                    {/* Logo area — larger */}
                    <div class={`flex items-center px-5 py-5 border-b ${headerBorder} flex-shrink-0`}>
                        <a href="/" class="flex items-center gap-3">
                            <img src="/logo_pip_paper.png" alt="PipPaper" class="w-10 h-10 rounded-xl" />
                            <div>
                                <span class="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                    PipPaper
                                </span>
                                <div class={`text-[10px] font-medium ${darkMode ? "text-gray-600" : "text-gray-400"} tracking-wider uppercase`}>
                                    Trading Journal
                                </div>
                            </div>
                        </a>
                    </div>

                    {/* Navigation */}
                    <nav class="flex-1 px-3 py-5 overflow-y-auto">
                        <div class={`text-[10px] font-semibold ${darkMode ? "text-gray-600" : "text-gray-400"} uppercase tracking-widest px-3 mb-3`}>
                            Menu
                        </div>
                        <ul class="space-y-1">
                            {menus.map((menu) => {
                                const isActive = menu.name === active;
                                const Icon = menu.icon;
                                return (
                                    <li key={menu.name}>
                                        <a
                                            href={menu.href}
                                            class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                                                isActive ? activeClass : inactiveClass
                                            }`}
                                        >
                                            <span class="flex-shrink-0">
                                                <Icon />
                                            </span>
                                            <span>{menu.name}</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Theme toggle + footer */}
                    <div class={`px-3 py-4 border-t ${headerBorder}`}>
                        <button
                            onClick={toggleTheme}
                            class={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg ${toggleBg} ${toggleText} transition-colors text-sm`}
                        >
                            <span class="flex items-center gap-2">
                                {darkMode ? <MoonIcon /> : <SunIcon />}
                                <span class="font-medium">{darkMode ? "Dark Mode" : "Light Mode"}</span>
                            </span>
                            <div class={`w-9 h-5 rounded-full relative transition-colors ${darkMode ? "bg-emerald-600" : "bg-gray-300"}`}>
                                <div class={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${darkMode ? "left-[18px]" : "left-0.5"}`} />
                            </div>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

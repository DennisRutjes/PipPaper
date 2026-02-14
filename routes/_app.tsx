import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
    return (
        <html class="dark">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>PipPaper — Trading Journal</title>
            <link rel="icon" type="image/png" href="/logo_pip_paper.png" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="/styles.css" />
        </head>
        <body class="bg-[#0f1117] min-h-screen">
            <Component />
        </body>
        </html>
    );
}

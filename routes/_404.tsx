import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found | PipPaper</title>
      </Head>
      <div class="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div class="text-center">
          <img
            class="mx-auto mb-6"
            src="/logo_pip_paper.png"
            width="80"
            height="80"
            alt="PipPaper logo"
          />
          <h1 class="text-6xl font-bold text-white mb-2">404</h1>
          <p class="text-lg text-gray-500 mb-6">
            This page doesn't exist.
          </p>
          <a
            href="/"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
        </div>
      </div>
    </>
  );
}

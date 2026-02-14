import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";

import {Importer} from "../services/import/ImporterService.ts";

import SideMenu from "../islands/SideMenu.tsx";

interface ImportData {
    count?: number;
    error?: string;
}

export const handler: Handlers<ImportData> = {
    async GET(_req, ctx) {
        return ctx.render({});
    },
    async POST(req, ctx) {
        try {
            const form = await req.formData();
            const file = form.get("file") as File;

            if (!file) {
                return ctx.render({ error: "No file uploaded" });
            }

            const content = await file.text();
            const count = await Importer.importTradovateTrades(content);

            return ctx.render({ count });
        } catch (e) {
            return ctx.render({ error: (e as Error).message });
        }
    }
};

export default function ImportPage(props: PageProps<ImportData>) {
    const { count, error } = props.data;

    return (
        <>
            <SideMenu active={"Import Trades"}/>
            <div className="p-4 sm:ml-64 bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto mt-10">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8">Import Trades</h1>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">Upload Tradovate CSV</h2>
                            <p className="text-gray-500">Select your 'Performance.csv' file exported from Tradovate.</p>
                        </div>

                        {count !== undefined && (
                            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                Successfully imported {count} trades!
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                {error}
                            </div>
                        )}

                        <form method="POST" encType="multipart/form-data" className="space-y-6">
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-10 h-10 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500">CSV files only</p>
                                    </div>
                                    <input id="dropzone-file" name="file" type="file" className="hidden" accept=".csv" required />
                                </label>
                            </div>
                            
                            <div className="flex justify-end">
                                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">
                                    Import Trades
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

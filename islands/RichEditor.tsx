import { useEffect, useRef, useState } from "preact/hooks";

interface RichEditorProps {
    initialContent?: string;
    placeholder?: string;
    onSave?: (html: string) => void;
}

declare const Quill: any;

export default function RichEditor({ initialContent, placeholder }: RichEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<any>(null);
    const hiddenRef = useRef<HTMLInputElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Load Quill CSS
        if (!document.querySelector('link[href*="quill.snow.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css";
            document.head.appendChild(link);

            // Dark theme overrides
            const style = document.createElement("style");
            style.textContent = `
                .ql-toolbar.ql-snow {
                    background: #1a1d2e !important;
                    border-color: #2d3348 !important;
                    border-radius: 8px 8px 0 0;
                }
                .ql-container.ql-snow {
                    background: #1a1d2e !important;
                    border-color: #2d3348 !important;
                    border-radius: 0 0 8px 8px;
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    color: #e2e8f0;
                    min-height: 200px;
                }
                .ql-editor {
                    min-height: 200px;
                    color: #e2e8f0 !important;
                }
                .ql-editor.ql-blank::before {
                    color: #4b5563 !important;
                    font-style: normal !important;
                }
                .ql-snow .ql-stroke {
                    stroke: #9ca3af !important;
                }
                .ql-snow .ql-fill {
                    fill: #9ca3af !important;
                }
                .ql-snow .ql-picker-label {
                    color: #9ca3af !important;
                }
                .ql-snow .ql-picker-options {
                    background: #1a1d2e !important;
                    border-color: #2d3348 !important;
                }
                .ql-snow .ql-picker-item {
                    color: #9ca3af !important;
                }
                .ql-snow .ql-picker-item:hover {
                    color: #e2e8f0 !important;
                }
                .ql-snow .ql-active .ql-stroke {
                    stroke: #10b981 !important;
                }
                .ql-snow .ql-active .ql-fill {
                    fill: #10b981 !important;
                }
                .ql-snow .ql-active {
                    color: #10b981 !important;
                }
                .ql-snow button:hover .ql-stroke {
                    stroke: #e2e8f0 !important;
                }
                .ql-snow button:hover .ql-fill {
                    fill: #e2e8f0 !important;
                }
                .ql-editor h1 { color: #f1f5f9; }
                .ql-editor h2 { color: #e2e8f0; }
                .ql-editor h3 { color: #cbd5e1; }
                .ql-editor a { color: #10b981; }
                .ql-editor blockquote {
                    border-left: 4px solid #10b981 !important;
                    color: #94a3b8;
                    padding-left: 16px;
                }
                .ql-editor pre {
                    background: #0f1117 !important;
                    color: #10b981 !important;
                    border-radius: 6px;
                    padding: 12px;
                }
                .ql-editor img {
                    max-width: 100%;
                    border-radius: 8px;
                    margin: 8px 0;
                }
                .ql-tooltip {
                    background: #1a1d2e !important;
                    border-color: #2d3348 !important;
                    color: #e2e8f0 !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                }
                .ql-tooltip input[type=text] {
                    background: #0f1117 !important;
                    border-color: #2d3348 !important;
                    color: #e2e8f0 !important;
                }
                .ql-tooltip a {
                    color: #10b981 !important;
                }

                /* Light mode overrides */
                html.light .ql-toolbar.ql-snow {
                    background: #f1f5f9 !important;
                    border-color: #cbd5e1 !important;
                }
                html.light .ql-container.ql-snow {
                    background: #f8fafc !important;
                    border-color: #cbd5e1 !important;
                    color: #1e293b;
                }
                html.light .ql-editor {
                    color: #1e293b !important;
                }
                html.light .ql-editor.ql-blank::before {
                    color: #94a3b8 !important;
                }
                html.light .ql-snow .ql-stroke {
                    stroke: #64748b !important;
                }
                html.light .ql-snow .ql-fill {
                    fill: #64748b !important;
                }
                html.light .ql-snow .ql-picker-label {
                    color: #64748b !important;
                }
                html.light .ql-snow .ql-picker-options {
                    background: #ffffff !important;
                    border-color: #e2e8f0 !important;
                }
                html.light .ql-tooltip {
                    background: #ffffff !important;
                    border-color: #e2e8f0 !important;
                    color: #1e293b !important;
                }
                html.light .ql-tooltip input[type=text] {
                    background: #f1f5f9 !important;
                    border-color: #e2e8f0 !important;
                    color: #1e293b !important;
                }
                html.light .ql-editor pre {
                    background: #f1f5f9 !important;
                    color: #059669 !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Load Quill JS
        if (typeof Quill === "undefined") {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js";
            script.onload = () => initQuill();
            document.head.appendChild(script);
        } else {
            initQuill();
        }
    }, []);

    function initQuill() {
        if (!editorRef.current || quillRef.current) return;

        const quill = new Quill(editorRef.current, {
            theme: "snow",
            placeholder: placeholder || "Write your journal entry... Use the toolbar for formatting, or paste images directly.",
            modules: {
                toolbar: {
                    container: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ color: [] }, { background: [] }],
                        ["blockquote", "code-block"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link", "image"],
                        ["clean"],
                    ],
                    handlers: {
                        image: function () {
                            const input = document.createElement("input");
                            input.setAttribute("type", "file");
                            input.setAttribute("accept", "image/*");
                            input.click();
                            input.onchange = async () => {
                                const file = input.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const range = quill.getSelection(true);
                                    quill.insertEmbed(range.index, "image", e.target?.result);
                                    quill.setSelection(range.index + 1);
                                };
                                reader.readAsDataURL(file);
                            };
                        },
                    },
                },
            },
        });

        // Set initial content
        if (initialContent) {
            quill.root.innerHTML = initialContent;
        }

        // Sync to hidden input on text change
        quill.on("text-change", () => {
            if (hiddenRef.current) {
                hiddenRef.current.value = quill.root.innerHTML;
            }
        });

        quillRef.current = quill;
        setReady(true);
    }

    return (
        <div>
            <div ref={editorRef} />
            <input type="hidden" name="note" ref={hiddenRef} value={initialContent || ""} />
        </div>
    );
}

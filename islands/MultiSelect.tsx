import { useState, useEffect, useRef } from "preact/hooks";

interface Option {
    value: string | number;
    label: string;
    color?: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: (string | number)[];
    name: string;
    placeholder?: string;
}

export default function MultiSelect({ options, selected, name, placeholder = "Select..." }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValues, setSelectedValues] = useState<(string | number)[]>(selected);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedValues(selected);
    }, [selected]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (value: string | number) => {
        setSelectedValues(prev => {
            if (prev.includes(value)) {
                return prev.filter(v => v !== value);
            } else {
                return [...prev, value];
            }
        });
    };

    const removeOption = (value: string | number, e: Event) => {
        e.stopPropagation(); // Prevent opening dropdown
        setSelectedValues(prev => prev.filter(v => v !== value));
    };

    const selectedOptions = options.filter(o => selectedValues.includes(o.value));

    return (
        <div class="relative" ref={containerRef}>
            {/* Hidden inputs for form submission */}
            {selectedValues.map(value => (
                <input key={value} type="hidden" name={name} value={value} />
            ))}

            {/* Trigger / Input Display */}
            <div 
                class={`w-full bg-[#1a1d2e] border border-[#2d3348] rounded-lg px-2 py-1.5 text-sm min-h-[42px] flex flex-wrap gap-2 items-center cursor-pointer transition-colors ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500' : 'hover:border-gray-600'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOptions.length > 0 ? (
                    selectedOptions.map(option => (
                        <span 
                            key={option.value}
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                            style={option.color ? `background: ${option.color}20; color: ${option.color}; border-color: ${option.color}40;` : 'background: #2d3348; color: #e2e8f0; border-color: #4b5563;'}
                        >
                            {option.label}
                            <button
                                type="button"
                                onClick={(e) => removeOption(option.value, e)}
                                class="ml-1.5 hover:opacity-75 focus:outline-none"
                            >
                                ×
                            </button>
                        </span>
                    ))
                ) : (
                    <span class="text-gray-500 px-1">{placeholder}</span>
                )}
                
                <div class="ml-auto flex items-center pr-1 pointer-events-none">
                    <svg class={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div class="absolute z-50 w-full mt-1 bg-[#1a1d2e] border border-[#2d3348] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {options.length > 0 ? (
                        options.map(option => {
                            const isSelected = selectedValues.includes(option.value);
                            return (
                                <div 
                                    key={option.value}
                                    class={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-[#2d3348] transition-colors ${isSelected ? 'bg-[#2d3348]/50' : ''}`}
                                    onClick={() => toggleOption(option.value)}
                                >
                                    <div class="flex items-center gap-2">
                                        <div 
                                            class="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: option.color || '#6b7280' }}
                                        />
                                        <span class={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                    {isSelected && (
                                        <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div class="px-3 py-2 text-sm text-gray-500 italic">
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

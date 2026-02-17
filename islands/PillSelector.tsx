import { useState } from "preact/hooks";

export interface PillItem {
    id: string | number;
    value: string | number;
    label: string;
    color: string;
}

interface PillSelectorProps {
    name: string;
    items: PillItem[];
    selectedValues: (string | number)[];
}

export default function PillSelector({ name, items, selectedValues }: PillSelectorProps) {
    const [selected, setSelected] = useState<Set<string | number>>(new Set(selectedValues));

    const toggle = (val: string | number) => {
        const newSelected = new Set(selected);
        if (newSelected.has(val)) {
            newSelected.delete(val);
        } else {
            newSelected.add(val);
        }
        setSelected(newSelected);
    };

    return (
        <div class="flex flex-wrap gap-2">
            {items.map((item) => {
                const isSelected = selected.has(item.value);
                const baseColor = item.color || "#9ca3af"; // Default gray-400

                return (
                    <div
                        key={item.id}
                        onClick={() => toggle(item.value)}
                        class={`cursor-pointer text-xs px-3 py-1.5 rounded-full font-medium border transition-all select-none
                            ${isSelected 
                                ? '' 
                                : 'bg-[#1a1d2e] border-[#2d3348] text-gray-400 hover:border-gray-600'
                            }`}
                        style={isSelected ? {
                            backgroundColor: `${baseColor}20`,
                            color: baseColor,
                            borderColor: `${baseColor}50`
                        } : {}}
                    >
                        {item.label}
                        {/* Hidden input to submit the value */}
                        {isSelected && <input type="hidden" name={name} value={item.value} />}
                    </div>
                );
            })}
        </div>
    );
}

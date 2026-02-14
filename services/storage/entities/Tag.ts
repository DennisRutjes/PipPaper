export type TagCategory = "mistake" | "setup" | "general";

export interface Tag {
    TagID?: number;
    Name: string;               // e.g. "FOMO", "Revenge Trade", "Oversize"
    Category: TagCategory;      // "mistake" | "setup" | "general"
    Color?: string;             // Optional hex color (e.g. "#ef4444")
    createdAt?: number;
    updatedAt?: number;
}

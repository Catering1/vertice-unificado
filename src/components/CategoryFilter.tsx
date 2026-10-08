import { Button } from "@/components/ui/button";

export default function CategoryFilter({ categories, value, onChange }: { categories: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por categoria">
    {["all", ...categories].map(category => <Button key={category} size="sm" className="shrink-0 whitespace-nowrap" variant={value === category ? "default" : "outline"} aria-pressed={value === category} onClick={() => onChange(category)}>{category === "all" ? "Todas as categorias" : category}</Button>)}
  </div>;
}

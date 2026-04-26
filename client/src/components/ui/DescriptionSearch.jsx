// DescriptionSearch — campo de descripción con autocompletar del catálogo
// Soporta múltiples selecciones: cada item del catálogo se agrega como línea nueva
import { useState, useEffect } from 'react';
import { catalogApi } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen } from 'lucide-react';

export function DescriptionSearch({ value, onChange, rows = 3, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await catalogApi.search(query);
        setSuggestions(data || []);
        setOpen((data || []).length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(item) {
    const current = value?.trim() || '';
    const next = current ? `${current}\n- ${item}` : `- ${item}`;
    onChange(next);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="space-y-2 mt-1">
      {/* Buscador del catálogo */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-slate-50 focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400">
          <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar en catálogo para agregar..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => query.length >= 2 && setSuggestions(s => s)}
          />
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {open && suggestions.length > 0 && (
          <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b last:border-0 truncate"
                onMouseDown={e => { e.preventDefault(); addItem(s); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Textarea de descripción libre */}
      <Textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Descripción del trabajo (podés escribir libremente o agregar desde el catálogo)...'}
      />
    </div>
  );
}

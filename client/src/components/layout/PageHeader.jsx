export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b bg-white shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export const AVATAR_COLORS = ["#6d4aff", "#ff6b4a", "#14915f", "#d6409f", "#0e7ad6", "#b7791f"];
const COLORS = AVATAR_COLORS;

export const colorFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

export function Avatar({ name, size = 28, ring = false, color }: { name: string; size?: number; ring?: boolean; color?: string }) {
  return (
    <span
      title={name}
      aria-label={name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${ring ? "ring-2 ring-surface" : ""}`}
      style={{ width: size, height: size, background: color ?? colorFor(name), fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names, size = 24 }: { names: string[]; size?: number }) {
  return (
    <span className="inline-flex -space-x-1.5" role="img" aria-label={`Fits ${names.join(", ")}`}>
      {names.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
    </span>
  );
}

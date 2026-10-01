export default function ShinyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-label="Pokémon shiny"
      className={className}
      viewBox="0 0 24 24"
      role="img"
    >
      <path
        fill="currentColor"
        d="M12 1.5c.7 6.1 1.8 7.2 7.9 7.9-6.1.7-7.2 1.8-7.9 7.9-.7-6.1-1.8-7.2-7.9-7.9 6.1-.7 7.2-1.8 7.9-7.9Z"
      />
      <path
        fill="currentColor"
        d="M19 14c.3 2.4.7 2.8 3 3-.3.2-.5.2-.8.3-1.5.3-1.9.8-2.2 2.7-.3-2.4-.7-2.8-3-3 2.3-.3 2.7-.7 3-3Z"
      />
    </svg>
  )
}

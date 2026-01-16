import type { Choice } from '../types/schema';

interface Props {
  choices: Choice[];
  onSelect: (gotoId: string) => void;
}

export function ChoiceButtons({ choices, onSelect }: Props) {
  return (
    <div className="mt-8 flex flex-wrap gap-4 justify-center">
      {choices.map((choice, index) => (
        <button
          key={index}
          onClick={() => onSelect(choice.goto)}
          className="group px-6 py-4 bg-gradient-to-r from-theme-primary to-theme-accent
                     text-white rounded-xl font-medium
                     hover:opacity-90
                     shadow-lg shadow-[rgba(var(--color-primary-rgb),0.25)]
                     hover:shadow-xl hover:shadow-[rgba(var(--color-primary-rgb),0.4)]
                     transition-all duration-300
                     border border-[rgba(var(--color-primary-rgb),0.3)]
                     flex flex-col items-center min-w-[180px]
                     transform hover:scale-105"
        >
          <span className="text-base font-semibold">{choice.label}</span>
          {choice.description && (
            <span className="text-xs text-white/70 mt-1 group-hover:text-white/90 transition-colors">
              {choice.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

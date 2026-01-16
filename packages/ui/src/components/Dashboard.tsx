import { useHealthCheck } from '../hooks/useHealthCheck';
import { ServiceHealth } from './ServiceHealth';
import { flattenSteps } from '../types/schema';
import { DataCards, DataLists } from './dashboard';
import type { DemoConfig } from '../types/schema';

interface DashboardProps {
  config: DemoConfig;
  onStart: () => void;
}

export function Dashboard({ config, onStart }: DashboardProps) {
  const settings = config.settings?.dashboard;
  const showStats = settings?.show_stats !== false;
  const showHealth = settings?.show_health !== false;
  const showDescription = settings?.show_description !== false;

  const healthChecks = config.settings?.health_checks;
  const { statuses, healthyCount, totalCount } = useHealthCheck(healthChecks, {
    enabled: showHealth && !!healthChecks?.length,
  });

  // Calculate stats
  const steps = flattenSteps(config.steps);
  const stepCount = steps.length;
  const restSteps = steps.filter(s => 'rest' in s || ('step' in s && (s as { step: string }).step === 'rest')).length;
  const shellSteps = steps.filter(s => 'shell' in s || ('step' in s && (s as { step: string }).step === 'shell')).length;

  // Estimate duration (rough: 30s per step)
  const estimatedMinutes = Math.ceil(stepCount * 0.5);
  const duration = config.metadata?.duration || `~${estimatedMinutes} min`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-2xl">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-[rgba(var(--color-primary-rgb),0.1)] p-8 border border-slate-200 dark:border-[rgba(var(--color-primary-rgb),0.2)]">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)]">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-2 text-slate-800 dark:text-white">
            {config.title}
          </h1>

          {/* Description */}
          {showDescription && config.description && (
            <p className="text-center text-slate-600 dark:text-slate-300 mb-6 max-w-lg mx-auto">
              {config.description}
            </p>
          )}

          {/* Stats */}
          {showStats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="Steps" value={stepCount} icon="steps" />
              <StatCard label="Duration" value={duration} icon="time" />
              <StatCard
                label="Difficulty"
                value={config.metadata?.difficulty || 'beginner'}
                icon="difficulty"
              />
            </div>
          )}

          {/* Step breakdown */}
          {showStats && (restSteps > 0 || shellSteps > 0) && (
            <div className="flex justify-center gap-4 mb-6 text-sm text-slate-500 dark:text-slate-400">
              {restSteps > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {restSteps} API calls
                </span>
              )}
              {shellSteps > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  {shellSteps} Commands
                </span>
              )}
            </div>
          )}

          {/* Health checks */}
          {showHealth && healthChecks && healthChecks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Service Status
              </h3>
              <ServiceHealth statuses={statuses} />
              {totalCount > 0 && healthyCount < totalCount && (
                <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  Some services are unavailable. The demo may not work correctly.
                </p>
              )}
            </div>
          )}

          {/* Data cards */}
          {settings?.data_cards && settings.data_cards.length > 0 && (
            <div className="mb-6">
              <DataCards
                cards={settings.data_cards}
                baseUrl={config.settings?.base_url}
                countersEnabled={config.settings?.effects?.counters !== false}
              />
            </div>
          )}

          {/* Data lists */}
          {settings?.data_lists && settings.data_lists.length > 0 && (
            <div className="mb-6 space-y-4">
              {settings.data_lists.map((list, i) => (
                <DataLists
                  key={i}
                  config={list}
                  baseUrl={config.settings?.base_url}
                />
              ))}
            </div>
          )}

          {/* Tags */}
          {config.tags && config.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {config.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-[rgba(var(--color-primary-rgb),0.1)] dark:bg-[rgba(var(--color-primary-rgb),0.2)] text-theme-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={onStart}
            className="w-full py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200
              bg-gradient-to-r from-theme-primary to-theme-accent
              hover:opacity-90
              text-white shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)]
              focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.5)] focus:ring-offset-2
              dark:focus:ring-offset-slate-800"
          >
            Start Demo
          </button>

          {/* Author */}
          {config.author && (
            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              By {config.author}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon: 'steps' | 'time' | 'difficulty';
}) {
  const icons = {
    steps: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    time: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    difficulty: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  };

  const difficultyColors: Record<string, string> = {
    beginner: 'text-green-600 dark:text-green-400',
    intermediate: 'text-yellow-600 dark:text-yellow-400',
    advanced: 'text-red-600 dark:text-red-400',
  };

  const valueColor = icon === 'difficulty'
    ? difficultyColors[String(value).toLowerCase()] || 'text-slate-800 dark:text-slate-200'
    : 'text-slate-800 dark:text-slate-200';

  return (
    <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
      <div className="flex justify-center text-slate-400 dark:text-slate-500 mb-1">
        {icons[icon]}
      </div>
      <div className={`font-bold capitalize ${valueColor}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

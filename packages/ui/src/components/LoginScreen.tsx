import { useState, FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function LoginScreen() {
  const { authenticate, authSettings, error: authError } = useAuth();
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await authenticate(password);
    setIsLoading(false);

    if (!success) {
      setError(authError || 'Incorrect password');
      setPassword('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const title = authSettings?.title || 'Protected Demo';
  const message = authSettings?.message || 'Enter the password to view this demo.';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-[rgba(var(--color-primary-rgb),0.05)] dark:to-slate-900">
      {/* Background effects for dark mode */}
      {theme === 'dark' && (
        <>
          <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(var(--color-primary-rgb), 0.3) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.3) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
              }}
            />
          </div>
          <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-[rgba(var(--color-primary-rgb),0.2)] rounded-full blur-3xl pointer-events-none z-0" />
          <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(var(--color-accent-rgb),0.2)] rounded-full blur-3xl pointer-events-none z-0" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-[rgba(var(--color-primary-rgb),0.1)] p-8 border border-slate-200 dark:border-[rgba(var(--color-primary-rgb),0.2)]">
          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-theme-primary to-theme-accent flex items-center justify-center shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)]">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-800 dark:text-white">
            {title}
          </h1>

          {/* Message */}
          <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
            {message}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
                disabled={isLoading}
                autoFocus
                className={`w-full px-4 py-3 rounded-lg border transition-all duration-200
                  bg-white dark:bg-slate-700/50
                  text-slate-800 dark:text-white
                  placeholder-slate-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-theme-primary
                  ${error
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-slate-300 dark:border-slate-600 hover:border-theme-primary'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                bg-gradient-to-r from-theme-primary to-theme-accent
                hover:opacity-90
                text-white shadow-lg shadow-[rgba(var(--color-primary-rgb),0.3)]
                focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2
                dark:focus:ring-offset-slate-800
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isLoading ? 'animate-pulse' : ''}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Enter Demo'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Contact the demo author if you don't have the password.
          </p>
        </div>
      </div>
    </div>
  );
}

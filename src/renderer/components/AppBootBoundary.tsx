import React, { Component, type ErrorInfo, type ReactNode } from 'react';

function toDisplayMessage(error: Error): string {
  if (error.stack) {
    return error.stack;
  }

  return error.message || 'Unknown renderer startup error';
}

export function AppBootFailure({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-900 to-slate-900 px-6 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/15 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
            Startup Error
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            The application could not finish loading.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            A fatal renderer error occurred during startup. Review the details
            below and the Electron main log, then rebuild and relaunch.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
            {toDisplayMessage(error)}
          </pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppBootBoundaryProps {
  children: ReactNode;
}

interface AppBootBoundaryState {
  error: Error | null;
}

export class AppBootBoundary extends Component<
  AppBootBoundaryProps,
  AppBootBoundaryState
> {
  state: AppBootBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppBootBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppBootBoundary] Renderer render failed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <AppBootFailure error={this.state.error} />;
    }

    return this.props.children;
  }
}

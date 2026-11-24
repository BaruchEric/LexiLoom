import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error.includes('Quota exceeded')
          ? 'Daily cloud database quota has been reached. Offline play remains available and quota resets tomorrow.'
          : `Sync paused: ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F7F5] dark:bg-[#0D131A] p-6">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#161F2A] border border-[#E2E6E1] dark:border-[#263342] p-8 space-y-5">
            <h1 className="text-2xl font-semibold text-[#131B23] dark:text-[#F1F5F9]">
              Something interrupted your session
            </h1>
            <p className="text-sm leading-relaxed text-[#52606D] dark:text-[#94A3B8]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-lg bg-[#176B52] hover:bg-[#125742] dark:bg-[#2EB88A] dark:hover:bg-[#3CD19F] text-white dark:text-[#0B1410] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Reload LexiLoom
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

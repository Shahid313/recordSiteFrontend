import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failed:', error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-error-shell">
        <div className="card app-error-card">
          <div className="card-inner">
            <div className="app-error-title">The frontend failed to render.</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Open the browser devtools console to see the exact client-side error.
            </div>
            <pre className="app-error-pre">{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      </div>
    );
  }
}
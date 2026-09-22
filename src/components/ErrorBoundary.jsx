import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info && info.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Navigating to a different page resets any error so the next page can
    // render cleanly instead of inheriting the previous page's crash.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="page container">
          <div className="load-error" role="alert">
            <p>Something went wrong on this page.</p>
            <p className="load-error-message">{this.state.error.message}</p>
            <div className="load-error-actions">
              <button type="button" className="btn" onClick={this.handleRetry}>
                Try again
              </button>
              <button type="button" className="btn ghost" onClick={() => window.location.reload()}>
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

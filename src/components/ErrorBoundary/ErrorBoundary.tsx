import { Component } from 'react';

import './ErrorBoundary.scss';

export class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err: any) {
    return { err };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('!!! ERROR BOUNDARY TRIGGERED:');
    console.error(error);
    console.error(errorInfo);
    console.log(JSON.stringify(error, null, 2));
    console.log(JSON.stringify(errorInfo, null, 2));
  }

  render() {
    const state = this.state as Record<string, any>;

    if (state && state.err) {
      return (
        <div className="ErrorBoundary">
          <h1>Something went wrong.</h1>
          <pre>{JSON.stringify(state.err, null, 2)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

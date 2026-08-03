import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true,
      error: error,
      errorInfo: error.toString() 
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          maxWidth: '600px',
          margin: '40px auto',
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          border: '1px solid #ffebee',
          textAlign: 'center'
        }}>
          <h2 style={{
            color: '#d32f2f',
            marginBottom: '16px',
            fontWeight: 500
          }}>
            Something went wrong
          </h2>
          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '4px',
            marginBottom: '16px',
            textAlign: 'left',
            fontSize: '14px',
            color: '#333',
            border: '1px solid #ffcdd2'
          }}>
            <p><strong>Error:</strong> {this.state.error?.message || 'An unknown error occurred'}</p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#1976d2' }}>View details</summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflowX: 'auto'
                }}>
                  {this.state.errorInfo}
                </pre>
              </details>
            )}
          </div>
          <button
            onClick={this.handleReload}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

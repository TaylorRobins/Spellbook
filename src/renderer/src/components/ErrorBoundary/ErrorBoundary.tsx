import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  componentName: string
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { componentName, onError } = this.props
    console.error(`[ErrorBoundary:${componentName}]`, error.message, info.componentStack)
    onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className={styles.damagedScroll}>
          <div className={styles.icon}>✦</div>
          <div className={styles.title}>This scroll appears to be damaged</div>
          <div className={styles.message}>A rift in the weave has disrupted this component.</div>
          {this.state.error && (
            <code className={styles.errorMsg}>{this.state.error.message}</code>
          )}
          <button className={styles.resetBtn} onClick={this.reset}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import React from 'react'

function BootError({ error }) {
  return (
    <div className="min-h-screen bg-[#0F1923] text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border border-red-700 bg-red-950/40 p-4">
        <h1 className="text-lg font-semibold text-white mb-2">TwinMind failed to start</h1>
        <p className="text-sm text-red-200 whitespace-pre-wrap">{error?.message || 'Unknown startup error'}</p>
      </div>
    </div>
  )
}

export default class BootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) return <BootError error={this.state.error} />
    return this.props.children
  }
}

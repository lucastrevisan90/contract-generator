import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary.tsx'

console.log('%c OitoH V11.0.0 (Core Engine Upgrade) ', 'background: #6366f1; color: #fff; border-radius: 4px; padding: 2px 4px; font-weight: bold;');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)

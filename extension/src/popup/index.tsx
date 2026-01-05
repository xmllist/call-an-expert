import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import Popup from './Popup'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <Popup />
    </StrictMode>
  )
}

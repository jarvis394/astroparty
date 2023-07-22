import ReactDOM from 'react-dom/client'
import App from 'src/components/App'
import { MatterEngine } from './components/MatterEngine'

import 'src/styles/index.css'
import ResizableStage from './components/ResizableStage'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <MatterEngine>
    <ResizableStage>
      <App />
    </ResizableStage>
  </MatterEngine>
)

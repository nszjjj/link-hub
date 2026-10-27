import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SolanaHubPage } from './pages/SolanaHubPage'
import { RoadmapPage } from './pages/RoadmapPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/topic/solana" element={<SolanaHubPage />} />
        <Route path="/topic/:topicId/roadmap/:roadmapId" element={<RoadmapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

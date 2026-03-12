import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import Dashboard from '../pages/Dashboard'
import Workflows from '../pages/Workflows'
import WorkflowEditor from '../pages/WorkflowEditor'
import RunHistory from '../pages/runHistory'

function ShellRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/jobs"      element={<RunHistory />} />
      </Routes>
    </DashboardLayout>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/workflow/:id" element={<WorkflowEditor />} />
        <Route path="/*"            element={<ShellRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
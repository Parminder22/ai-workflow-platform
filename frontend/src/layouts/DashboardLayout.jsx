import { useTheme } from '../theme'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ children, topbarTitle, topbarActions }) {
  const { colors } = useTheme()

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: colors.bg, transition: 'background 0.25s ease' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={topbarTitle} actions={topbarActions} />

        <main
          className="flex-1 overflow-auto"
          style={{ background: colors.bg, transition: 'background 0.25s ease' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
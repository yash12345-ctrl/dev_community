import { useEffect, useState } from 'react'
import Projects from '../projects/Projects'
import Import from '../import/Import'
import BuildLogs from '../build/BuildLogs'
import './DashboardLayout.css'

const BoltIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const OverviewIcon = () => (
  <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
)
const RepoIcon = () => (
  <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M6.5 2V5" /><path d="M20 2V5" /></svg>
)
const DeployIcon = () => (
  <svg {...iconProps}><path d="m12 2-7 4v6c0 5.5 3 10.7 7 12 4-1.3 7-6.5 7-12V6l-7-4Z" /><path d="m9 12 2 2 4-4" /></svg>
)
const DomainsIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
)
const SettingsIcon = () => (
  <svg {...iconProps}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
)
const BellIcon = () => (
  <svg {...iconProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
)

const AddIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

function DashboardLayout() {
  const [user, setUser] = useState<{name: string, login: string, avatar_url: string, email: string} | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [currentDeploymentId, setCurrentDeploymentId] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('github_token')
      if (!token) return
      
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error('Failed to fetch user:', err)
      }
    }
    fetchUser()
  }, [])
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <a href="/dashboard" className="sidebar-brand">
            <span className="sidebar-logo">
              <BoltIcon size={14} />
            </span>
            Dev Community
          </a>
        </div>

        <nav className="sidebar-nav">
          <a href="#overview" className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}>
            <OverviewIcon /> Overview
          </a>
          <a href="#import" className={`nav-item ${activeTab === 'import' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('import'); }}>
            <AddIcon /> Import
          </a>
          <a href="#projects" className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('projects'); }}>
            <RepoIcon /> Projects
          </a>
          <a href="#deployments" className="nav-item">
            <DeployIcon /> Deployments
          </a>
          
          <div className="nav-group-title">Settings</div>
          <a href="#domains" className="nav-item">
            <DomainsIcon /> Domains
          </a>
          <a href="#settings" className="nav-item">
            <SettingsIcon /> Settings
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <img src={user?.avatar_url || "https://avatars.githubusercontent.com/u/1?v=4"} alt="User avatar" />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || user?.login || 'Loading...'}</span>
              <span className="user-email">{user?.email || (user?.login ? `@${user.login}` : '...')}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="dashboard-topbar">
          <div className="topbar-breadcrumb">
            {user?.login || 'User'} <span className="slash">/</span> 
            <span className="current">
               {activeTab === 'overview' && <><OverviewIcon /> Overview</>}
               {activeTab === 'projects' && <><RepoIcon /> Projects</>}
               {activeTab === 'import' && <><AddIcon /> Import</>}
               {activeTab === 'building' && <><SettingsIcon /> Building</>}
            </span>
          </div>
          
          <div className="topbar-actions">
            <button className="action-btn" aria-label="Notifications">
              <BellIcon />
            </button>
            <button className="create-btn">
              <AddIcon />
              New Project
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="dashboard-content">
          <div className="content-header">
            <h1 className="content-title">
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'projects' && 'Projects'}
              {activeTab === 'import' && 'Import Project'}
              {activeTab === 'building' && 'Deployment Logs'}
            </h1>
            <p className="content-subtitle">
              {activeTab === 'overview' && 'Manage your deployed frontend applications.'}
              {activeTab === 'projects' && 'Select a GitHub repository to deploy.'}
              {activeTab === 'import' && 'Configure and deploy your application.'}
              {activeTab === 'building' && 'Watch real-time terminal logs of your build process.'}
            </p>
          </div>
          
          {activeTab === 'overview' && (
            <div className="dashboard-card empty-state">
               <div className="empty-icon">
                  <RepoIcon />
               </div>
               <h3 className="empty-title">No projects deployed yet</h3>
               <p className="empty-desc">Get started by importing a repository from GitHub to deploy your first frontend application.</p>
               <button className="create-btn" onClick={() => setActiveTab('import')}>
                  <AddIcon />
                  Import Project
               </button>
            </div>
          )}
          
          {activeTab === 'projects' && <Projects onImport={(repo) => { setSelectedRepo(repo); setActiveTab('import'); }} />}
          
          {activeTab === 'import' && <Import 
            repo={selectedRepo} 
            onCancel={() => setActiveTab('projects')} 
            onDeploy={(id) => { setCurrentDeploymentId(id); setActiveTab('building'); }} 
          />}

          {activeTab === 'building' && <BuildLogs 
            deploymentId={currentDeploymentId} 
            onBack={() => setActiveTab('overview')} 
          />}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout

import { useState, useEffect } from 'react';
import './Import.css';

interface ImportProps {
  repo?: any;
  onCancel?: () => void;
  onDeploy?: (deploymentId: string) => void;
}

const RepoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M6.5 2V5" />
    <path d="M20 2V5" />
  </svg>
)

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
)

export default function Import({ repo, onCancel, onDeploy }: ImportProps) {
  const [projectName, setProjectName] = useState(repo?.name || '');
  const [framework, setFramework] = useState('nextjs');
  const [rootDir, setRootDir] = useState('./');
  
  // Directory picker state
  const [isDirModalOpen, setIsDirModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [directories, setDirectories] = useState<any[]>([]);
  const [loadingDirs, setLoadingDirs] = useState(false);

  const fetchDirectories = async (path: string) => {
    if (!repo) return;
    setLoadingDirs(true);
    const token = localStorage.getItem('github_token');
    try {
      const url = path 
        ? `https://api.github.com/repos/${repo.full_name}/contents/${path}`
        : `https://api.github.com/repos/${repo.full_name}/contents`;
        
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDirectories(data.filter((item: any) => item.type === 'dir'));
      } else {
        setDirectories([]);
      }
    } catch (e) {
      console.error('Failed to fetch directories', e);
      setDirectories([]);
    } finally {
      setLoadingDirs(false);
    }
  };

  useEffect(() => {
    if (isDirModalOpen) {
      fetchDirectories(currentPath);
    }
  }, [isDirModalOpen, currentPath]);

  const handleSelectPath = () => {
    setRootDir(currentPath || './');
    setIsDirModalOpen(false);
  };

  useEffect(() => {
    const autoDetectFramework = async (path: string) => {
      if (!repo) return;
      const token = localStorage.getItem('github_token');
      try {
        const packagePath = path === './' || path === '' ? 'package.json' : `${path}/package.json`;
        const res = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/${packagePath}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            console.log('Found package.json, decoding...');
            // GitHub returns content in base64, which may contain newlines
            const cleanBase64 = data.content.replace(/\\n/g, '');
            const decoded = decodeURIComponent(escape(atob(cleanBase64)));
            const pkg = JSON.parse(decoded);
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            
            console.log('Dependencies found:', Object.keys(deps).join(', '));
            
            if (deps['next']) setFramework('nextjs');
            else if (deps['vite']) setFramework('vite');
            else if (deps['vue']) setFramework('vue');
            else if (deps['react-scripts']) setFramework('react');
            else setFramework('other');
          }
        } else {
          console.log(`Failed to fetch package.json: ${res.status}`);
          setFramework('other');
        }
      } catch (e) {
        console.error('Failed to auto-detect framework:', e);
        setFramework('other');
      }
    };

    autoDetectFramework(rootDir);
  }, [rootDir, repo]);

  if (!repo) {
    return (
      <div className="import-container">
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Please select a repository from the Projects tab first.
        </div>
      </div>
    );
  }

  const handleDeploy = async () => {
    try {
      const token = localStorage.getItem('github_token');
      const res = await fetch('http://localhost:5000/api/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectName, framework, rootDir, repo })
      });
      const data = await res.json();
      
      if (data.success) {
        if (onDeploy) onDeploy(data.deploymentId);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to trigger deployment:', error);
      alert('Failed to connect to backend server.');
    }
  };

  return (
    <div className="import-wrapper">
      <h2 className="import-main-title">You're almost done.</h2>
      <p className="import-main-subtitle">Please follow the steps to configure your Project and deploy it.</p>
      
      <div className="import-card">
        <div className="import-left">
          <div className="import-repo-summary">
            <div className="import-repo-icon">
              <RepoIcon />
            </div>
            <div className="import-repo-info">
              <h3>{repo.name}</h3>
              <span className={`repo-badge ${repo.private ? 'private' : 'public'}`}>
                {repo.private ? 'Private' : 'Public'}
              </span>
            </div>
          </div>
        </div>

        <div className="import-right">
          <div className="import-form-group">
            <label>Project Name</label>
            <input 
              type="text" 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)} 
            />
          </div>
          
          <div className="import-form-group">
            <label>Framework Preset</label>
            <select value={framework} onChange={(e) => setFramework(e.target.value)}>
              <option value="nextjs">Next.js</option>
              <option value="react">Create React App</option>
              <option value="vite">Vite</option>
              <option value="vue">Vue.js</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="import-form-group">
            <label>Root Directory</label>
            <div className="root-dir-input-wrapper">
              <input 
                type="text" 
                value={rootDir} 
                readOnly
                className="root-dir-input"
              />
              <button 
                className="edit-dir-btn"
                onClick={() => {
                  setCurrentPath(rootDir === './' ? '' : rootDir);
                  setIsDirModalOpen(true);
                }}
              >
                Edit
              </button>
            </div>
          </div>

          <div className="import-actions">
            <button className="import-cancel-btn" onClick={onCancel}>Cancel</button>
            <button className="import-deploy-btn" onClick={handleDeploy}>Deploy</button>
          </div>
        </div>
      </div>

      {isDirModalOpen && (
        <div className="modal-overlay">
          <div className="dir-modal">
            <div className="dir-modal-header">
              <h3>Select Root Directory</h3>
              <button className="close-modal-btn" onClick={() => setIsDirModalOpen(false)}>×</button>
            </div>
            
            <div className="dir-modal-path">
              {currentPath ? (
                <button 
                  className="back-dir-btn"
                  onClick={() => {
                    const parts = currentPath.split('/');
                    parts.pop();
                    setCurrentPath(parts.join('/'));
                  }}
                >
                  <BackIcon />
                  {currentPath}
                </button>
              ) : (
                <div className="root-path-label">/ (Repository Root)</div>
              )}
            </div>

            <div className="dir-modal-list">
              {loadingDirs ? (
                <div className="dir-loading">Loading folders...</div>
              ) : directories.length === 0 ? (
                <div className="dir-empty">No subdirectories found here.</div>
              ) : (
                directories.map(dir => (
                  <button 
                    key={dir.path} 
                    className="dir-item-btn"
                    onClick={() => setCurrentPath(dir.path)}
                  >
                    <FolderIcon />
                    {dir.name}
                  </button>
                ))
              )}
            </div>

            <div className="dir-modal-footer">
              <button className="import-cancel-btn" onClick={() => setIsDirModalOpen(false)}>Cancel</button>
              <button className="import-deploy-btn" onClick={handleSelectPath}>Select</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

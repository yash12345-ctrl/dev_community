import { useState, useEffect } from 'react';
import './Deployment.css';

export default function Deployment({ onViewLogs }: { onViewLogs?: (id: string) => void }) {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/import/deployments')
      .then(res => res.json())
      .then(data => {
        setDeployments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch deployments:', err);
        setLoading(false);
      });
  }, []);

  // Group deployments by project
  const projects = deployments.reduce((acc: any, curr: any) => {
    if (!acc[curr.project]) {
      acc[curr.project] = [];
    }
    acc[curr.project].push(curr);
    return acc;
  }, {});

  const projectList = Object.keys(projects).map(name => ({
    name,
    latestDeployment: projects[name][0], // Assuming backend returns them sorted by date
    totalDeployments: projects[name].length
  }));

  if (loading) {
    return (
      <div className="deployment-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  // If a project is selected, show its deployment history table
  if (selectedProject) {
    const projectDeployments = projects[selectedProject] || [];
    return (
      <div className="deployment-container">
        <button className="back-to-projects-btn" onClick={() => setSelectedProject(null)}>
          ← Back to Projects
        </button>
        <div className="deployment-card">
          <table className="deployment-table">
            <thead>
              <tr>
                <th>Deployment ID</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projectDeployments.map((d: any) => (
                <tr key={d.id}>
                  <td className="id-cell">{d.id}</td>
                  <td>
                    <span className={`status-badge ${d.status.toLowerCase()}`}>
                      {d.status === 'LIVE' ? '🟢' : '🔴'} {d.status}
                    </span>
                  </td>
                  <td className="branch-cell">
                    <span className="branch-icon">🔀</span> {d.branch}
                  </td>
                  <td className="date-cell">{new Date(d.date).toLocaleString()}</td>
                  <td>
                    <button className="view-logs-btn" onClick={() => onViewLogs && onViewLogs(d.id)}>View Logs</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Otherwise, show the grid of project cards
  return (
    <div className="deployment-container">
      <div className="projects-grid">
        {projectList.length === 0 ? (
          <div className="loading-state">
            <p>No deployments found yet.</p>
          </div>
        ) : (
          projectList.map(project => (
            <div key={project.name} className="project-box" onClick={() => setSelectedProject(project.name)}>
              <div className="project-box-header">
                <h3><span className="project-icon">📦</span> {project.name}</h3>
                <span className={`status-badge ${project.latestDeployment?.status.toLowerCase()}`}>
                  {project.latestDeployment?.status === 'LIVE' ? '🟢' : '🔴'} {project.latestDeployment?.status}
                </span>
              </div>
              <div className="project-box-body">
                <div className="domain-actions-wrapper">
                  <div 
                    className="domain-container" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`http://${project.name}.dev-21.duckdns.org:5000`);
                    }}
                    title="Copy to clipboard"
                  >
                    <span className="domain-text">{project.name}.dev-21.duckdns.org</span>
                    <button className="icon-action-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  <a 
                    href={`http://${project.name}.dev-21.duckdns.org:5000`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link-btn"
                    onClick={(e) => e.stopPropagation()}
                    title="Visit site"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
                <div className="project-stats">
                  <span><strong>Total Deployments:</strong> {project.totalDeployments}</span>
                  <span><strong>Last Updated:</strong> {new Date(project.latestDeployment?.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

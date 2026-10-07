import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Overview.css';

export default function Overview({ onImport, onViewLogs }: { onImport: () => void, onViewLogs: (id: string) => void }) {
  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const [deployments, setDeployments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({ totalRequests: 0, totalBandwidthBytes: 0, total4xx: 0, total5xx: 0, history: {} });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/import/deployments').then(res => res.json()),
      fetch('http://localhost:5000/api/analytics').then(res => res.json())
    ])
    .then(([depsData, analyticsData]) => {
      setDeployments(depsData);
      setAnalytics(analyticsData);
      
      // Build 24h chart data
      const data = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 13);
        let label = d.getHours() + ':00';
        data.push({
          time: label,
          Requests: analyticsData.history?.[key] || 0
        });
      }
      setChartData(data);
      
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch dashboard data:', err);
      setLoading(false);
    });
  }, []);

  const projects = deployments.reduce((acc: any, curr: any) => {
    if (!acc[curr.project]) acc[curr.project] = [];
    acc[curr.project].push(curr);
    return acc;
  }, {});

  const projectList = Object.keys(projects).map(name => ({
    name,
    latestDeployment: projects[name][0]
  }));

  if (loading) {
    return (
      <div className="overview-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (projectList.length === 0) {
    return (
      <div className="dashboard-card empty-state">
         <div className="empty-icon">📦</div>
         <h3 className="empty-title">No projects deployed yet</h3>
         <p className="empty-desc">Get started by importing a repository from GitHub to deploy your first frontend application.</p>
         <button className="create-btn" onClick={onImport}>
            <span style={{marginRight: '8px'}}>+</span>
            Import Project
         </button>
      </div>
    );
  }

  // Format bandwidth nicely (Bytes to KB, MB, GB)
  let bandwidthStr = "0 B";
  const bytes = analytics.totalBandwidthBytes;
  if (bytes > 1024 * 1024 * 1024) bandwidthStr = (bytes / (1024*1024*1024)).toFixed(2) + " GB";
  else if (bytes > 1024 * 1024) bandwidthStr = (bytes / (1024*1024)).toFixed(2) + " MB";
  else if (bytes > 1024) bandwidthStr = (bytes / 1024).toFixed(2) + " KB";
  else bandwidthStr = bytes + " B";
  
  // A fake capacity just for the visual progress bar (e.g., 100 MB free tier)
  const capacityBytes = 100 * 1024 * 1024;
  const progressPercent = Math.min((bytes / capacityBytes) * 100, 100);

  // Calculate Error Rate
  const totalErrors = (analytics.total4xx || 0) + (analytics.total5xx || 0);
  let errorRate = 0;
  if (analytics.totalRequests > 0) {
    errorRate = (totalErrors / analytics.totalRequests) * 100;
  }
  const errorRateStr = errorRate.toFixed(1) + "%";

  return (
    <div className="overview-container">
      {/* Analytics Banner */}
      <div className="analytics-banner">
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Requests</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="metric-value">
            {analytics.totalRequests.toLocaleString()} <span className="trend positive">Live</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span>Error Rate (4xx/5xx)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div className="metric-value" style={{color: errorRate > 5 ? '#e53e3e' : 'inherit'}}>
            {errorRateStr} <span className="metric-sub">{totalErrors} blocked</span>
          </div>
          <div className="progress-bar-bg" style={{background: '#ffe6e6'}}><div className="progress-bar-fill" style={{background: '#e53e3e', width: `${Math.min(errorRate, 100)}%`}}></div></div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span>Bandwidth Usage</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div className="metric-value">
            {bandwidthStr} <span className="metric-sub">/ 100 MB</span>
          </div>
          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width: `${progressPercent}%`}}></div></div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span>Active Projects</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
          </div>
          <div className="metric-value">
            {projectList.length} <span className="metric-sub">deployed</span>
          </div>
          <div className="pulse-dots">
             <div className="pulse-dot"></div>
             <div className="pulse-dot"></div>
             <div className="pulse-dot"></div>
          </div>
        </div>
      </div>
      
      {/* Requests Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>Requests <span>(last 24 hours)</span></h3>
        </div>
        <div className="chart-container" style={{ height: 250, width: '100%', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0070f3" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0070f3" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #eaeaea', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                itemStyle={{ color: '#0070f3', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="Requests" stroke="#0070f3" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overview-bottom-grid">
        <div className="overview-left-col">
          <div className="projects-list-header">
            <h2>Recent Projects</h2>
            <button className="import-small-btn" onClick={onImport}>Add New</button>
          </div>

          <div className="overview-projects-grid">
            {projectList.map(project => (
              <div key={project.name} className="overview-project-card">
                <div className="overview-project-header">
                  <div className="project-title-group">
                    <h3>{project.name}</h3>
                    <span className="repo-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                      {project.name}/main
                    </span>
                  </div>
                  <div className="project-actions">
                    <button onClick={() => onViewLogs(project.latestDeployment?.id)} className="view-logs-btn">View Logs</button>
                    <a href={`http://${project.name}.dev-21.duckdns.org:5000`} target="_blank" rel="noreferrer" className="visit-btn">Visit</a>
                  </div>
                </div>

                <div className="overview-project-link">
                  <a href={`http://${project.name}.dev-21.duckdns.org:5000`} target="_blank" rel="noreferrer">
                     {project.name}.dev-21.duckdns.org
                  </a>
                </div>

                <div className="overview-project-footer">
                  <div className="footer-left">
                    <span className={`status-dot ${project.latestDeployment?.status.toLowerCase()}`}></span>
                    <span className="time-ago">Deployed {timeAgo(project.latestDeployment?.date)}</span>
                  </div>
                  <div className="footer-right">
                    <span className="branch-label">Branch: main</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-right-col">
          <div className="projects-list-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-feed">
            {[...deployments].reverse().slice(0, 5).map(dep => (
              <div key={dep.id} className="activity-item">
                <div className="activity-avatar">
                  <img src="https://avatars.githubusercontent.com/u/1?v=4" alt="user" />
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    <b>You</b> deployed <b>{dep.project}</b>
                  </div>
                  <div className="activity-meta">
                    <span className="commit-hash">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="21" y2="12"></line></svg>
                      {dep.id.substring(4, 11)}
                    </span>
                    <span className="activity-branch">main</span>
                    <span className="activity-time">{timeAgo(dep.date)}</span>
                  </div>
                </div>
                <div className="activity-status">
                  <span className={`status-badge small ${dep.status.toLowerCase()}`}>{dep.status}</span>
                  <button onClick={() => onViewLogs(dep.id)} className="activity-log-link">Logs</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

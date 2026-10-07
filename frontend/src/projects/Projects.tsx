import { useEffect, useState } from 'react';
import './Projects.css';

interface Repo {
  id: number;
  name: string;
  description: string;
  private: boolean;
  language: string;
  updated_at: string;
  stargazers_count?: number;
}

const RepoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M6.5 2V5" />
    <path d="M20 2V5" />
  </svg>
)

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
)

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

// Helper to get language colors
const getLanguageColor = (lang: string) => {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    Dart: '#00B4AB',
    PHP: '#4F5D95',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584'
  };
  return colors[lang] || '#8b949e';
}

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

export default function Projects({ onImport }: { onImport?: (repo: Repo) => void }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      const token = localStorage.getItem('github_token');
      if (!token) return;

      try {
        const res = await fetch('http://localhost:5000/api/projects/github', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem('github_token');
          window.location.href = '/';
          return;
        }

        const data = await res.json();
        if (data.projects) {
          setRepos(data.projects);
        }
      } catch (error) {
        console.error('Failed to fetch projects', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const totalRepos = repos.length;
  const publicRepos = repos.filter(r => !r.private).length;
  const privateRepos = repos.filter(r => r.private).length;

  if (loading) {
    return (
      <div className="projects-container">
        <div className="projects-header">
          <div className="search-input-wrapper">
             <div className="skeleton pulse" style={{ width: '320px', height: '34px', borderRadius: '6px' }} />
          </div>
          <div className="skeleton pulse" style={{ width: '200px', height: '34px', borderRadius: '6px' }} />
        </div>
        <div className="projects-list">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="repo-card">
              <div className="repo-card-header">
                <div className="repo-icon skeleton pulse" style={{ background: '#eaeaea' }} />
                <div className="skeleton pulse skeleton-title" style={{ margin: 0 }} />
              </div>
              <div className="repo-desc">
                <div className="skeleton pulse" style={{ width: '100%', height: '14px', marginBottom: '6px' }} />
                <div className="skeleton pulse" style={{ width: '80%', height: '14px' }} />
              </div>
              <div className="repo-card-footer">
                <div className="skeleton pulse skeleton-meta" style={{ width: '120px' }} />
                <div className="skeleton pulse skeleton-btn" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div className="search-input-wrapper">
          <span className="search-icon"><SearchIcon /></span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search repositories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="projects-stats">
          <div className="stat-item">
            <span className="stat-value">{totalRepos}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-value">{publicRepos}</span>
            <span className="stat-label">Public</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-value">{privateRepos}</span>
            <span className="stat-label">Private</span>
          </div>
        </div>
      </div>

      <div className="projects-list">
        {filteredRepos.map(repo => (
          <div key={repo.id} className="repo-card">
            <div className="repo-card-header">
              <div className="repo-icon">
                <RepoIcon />
              </div>
              <div className="repo-name-col">
                <div className="repo-name-row">
                  <span className="repo-name" title={repo.name}>{repo.name}</span>
                  <span className={`repo-badge ${repo.private ? 'private' : 'public'}`}>
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="repo-desc">
              {repo.description || "No description provided."}
            </div>
            
            <div className="repo-card-footer">
              <div className="repo-meta">
                {repo.language && (
                  <span>
                    <span className="lang-dot" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                    {repo.language}
                  </span>
                )}
                {repo.stargazers_count ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <StarIcon /> {repo.stargazers_count}
                  </span>
                ) : null}
                <span>{timeAgo(repo.updated_at)}</span>
              </div>
              <button 
                className="repo-import-btn"
                onClick={() => onImport && onImport(repo)}
              >
                Import
              </button>
            </div>
          </div>
        ))}
        
        {filteredRepos.length === 0 && (
          <div className="empty-projects-state">
             No repositories match your search.
          </div>
        )}
      </div>
    </div>
  );
}

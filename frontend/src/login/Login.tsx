import './Login.css'

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
)

const BoltIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

const ArrowIcon = () => (
  <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const RepoIcon = () => (
  <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M6.5 2V5" /><path d="M20 2V5" /></svg>
)
const RefreshIcon = () => (
  <svg {...iconProps}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></svg>
)
const GlobeIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
)

function Login() {
  const handleGithubLogin = () => {
    window.location.href = 'http://localhost:5000/api/github/login'
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-grid" />
      </div>

      <header className="login-topbar">
        <div className="login-topbar-inner">
          <a href="/" className="login-brand" id="brand-link">
            <span className="login-brand-logo">
              <BoltIcon size={12} />
            </span>
            Dev Community
          </a>

          <nav className="login-nav" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#docs">Docs</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="login-topbar-actions">
            <a href="#login" className="login-topbar-link">Log in</a>
            <a href="#signup" className="login-topbar-cta">
              Sign Up
            </a>
          </div>
        </div>
      </header>

      <main className="login-main">
        <section className="login-hero" aria-label="Product overview">
          <div className="login-pill">
            <b>New</b> Zero-config frontend deployments
          </div>

          <h1 className="login-headline">
            Ship your frontend<br />
            <span className="login-gradient-text">at the speed of Git.</span>
          </h1>

          <p className="login-lead">
            Connect GitHub, import a repository and go live in seconds. Every push
            gets built, deployed and served from a global edge.
          </p>

          <div className="login-preview" aria-hidden="true">
            <div className="login-preview-bar">
              <span className="login-dot r" />
              <span className="login-dot y" />
              <span className="login-dot g" />
              <span className="login-preview-title">dev-community · production</span>
            </div>
            <div className="login-preview-body">
              <div className="login-log"><span className="hl">▸</span> Cloning github.com/acme/portfolio</div>
              <div className="login-log"><span className="ok">✓</span> Dependencies installed</div>
              <div className="login-log"><span className="ok">✓</span> Build completed in 12.4s</div>
              <div className="login-log"><span className="ok">✓</span> Deployed to edge network</div>
              <div className="login-log" style={{ marginTop: '8px' }}>
                <span className="hl">▸</span>
                <span className="url">portfolio.devcommunity.app</span>
                <span className="login-live">● Live</span>
              </div>
            </div>
          </div>
        </section>

        <div className="login-card-wrap">
          <section className="login-card" aria-labelledby="login-heading">
            <div className="login-avatar">
              <BoltIcon size={24} />
            </div>

            <h2 id="login-heading" className="login-title">Welcome back</h2>
            <p className="login-subtitle">
              Sign in to import repositories and deploy your frontend.
            </p>

            <button
              type="button"
              id="github-login-btn"
              className="login-github-btn"
              onClick={handleGithubLogin}
            >
              <GithubIcon />
              Continue with GitHub
              <ArrowIcon />
            </button>

            <div className="login-or">Features</div>

            <ul className="login-features">
              <li><span className="login-feature-icon"><RepoIcon /></span> Import any GitHub repository</li>
              <li><span className="login-feature-icon"><RefreshIcon /></span> Auto deploys on every push</li>
              <li><span className="login-feature-icon"><GlobeIcon /></span> Instant live URL for your site</li>
            </ul>

            <p className="login-terms">
              By continuing, you agree to our <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Login

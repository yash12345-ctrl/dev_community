import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import './Firewall.css';

const FirewallIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M12 8v4"/>
    <path d="M12 16h.01"/>
  </svg>
);

export default function Firewall() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [config, setConfig] = useState({ enabled: false, strictMode: false, rateLimit: false, botProtection: false, challengeMode: false, owaspRules: false, securityHeaders: false, forceHttps: false, customRules: [] as {path: string, limit: number}[], ipAccessList: [] as {ip: string, action: 'block' | 'allow'}[], geoAccessList: [] as {country: string, action: 'block' | 'allow'}[], advancedRules: [] as {field: string, operator: string, value: string, action: string}[], stats: { totalRequests: 0, threatsBlocked: 0, challenged: 0, attackTypes: {} as Record<string, number>, history: {} as Record<string, {allowed: number, blocked: number}>, events: [] as any[], blockedIps: {} as Record<string, number> } });
  const [newRulePath, setNewRulePath] = useState('/login');
  const [newRuleLimit, setNewRuleLimit] = useState(5);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpAction, setNewIpAction] = useState<'block' | 'allow'>('block');
  const [newCountry, setNewCountry] = useState('US');
  const [newCountryAction, setNewCountryAction] = useState<'block' | 'allow'>('block');
  const [advField, setAdvField] = useState('user-agent');
  const [advOp, setAdvOp] = useState('contains');
  const [advValue, setAdvValue] = useState('');
  const [advAction, setAdvAction] = useState('block');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/import/deployments')
      .then(res => res.json())
      .then(data => {
        const uniqueProjects = Array.from(new Set(data.map((d: any) => d.project)));
        setDeployments(uniqueProjects);
      });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    let initialLoad = true;
    const load = () => {
      fetch(`http://localhost:5000/api/firewall/${selectedProject}`)
        .then(res => res.json())
        .then(data => {
          if (initialLoad) {
            if (!data.customRules) data.customRules = [];
            if (!data.ipAccessList) data.ipAccessList = [];
            if (!data.geoAccessList) data.geoAccessList = [];
            if (!data.advancedRules) data.advancedRules = [];
            if (!data.stats) data.stats = { totalRequests: 0, threatsBlocked: 0, challenged: 0, attackTypes: {}, history: {}, events: [], blockedIps: {} };
            setConfig(data);
            initialLoad = false;
          } else {
            setConfig(prev => ({ ...prev, stats: data.stats || { totalRequests: 0, threatsBlocked: 0, challenged: 0, attackTypes: {}, history: {}, events: [], blockedIps: {} } }));
          }
        });
    };
    load();
    const intv = setInterval(load, 3000);
    return () => clearInterval(intv);
  }, [selectedProject]);

  const toggleSetting = async (key: keyof typeof config) => {
    if (!selectedProject) return;
    
    const newConfig = { ...config, [key]: !config[key] };
    // If strict mode is enabled, it automatically needs the firewall to be enabled
    if (key === 'strictMode' && newConfig.strictMode) {
      newConfig.enabled = true;
      newConfig.botProtection = true;
      newConfig.challengeMode = true;
    }
    if (key === 'rateLimit' && newConfig.rateLimit) newConfig.enabled = true;
    // If firewall is disabled, drop other settings
    if (key === 'enabled' && !newConfig.enabled) {
      newConfig.strictMode = false;
      newConfig.rateLimit = false;
      newConfig.botProtection = false;
      newConfig.challengeMode = false;
      newConfig.owaspRules = false;
      newConfig.securityHeaders = false;
      newConfig.forceHttps = false;
    }

    setConfig(newConfig);
    setSaving(true);
    
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const addCustomRule = async () => {
    if (!selectedProject || !newRulePath) return;
    const rules = [...(config.customRules || []), { path: newRulePath, limit: newRuleLimit }];
    const newConfig = { ...config, customRules: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setNewRulePath('');
      setNewRuleLimit(5);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const removeCustomRule = async (index: number) => {
    if (!selectedProject) return;
    const rules = [...(config.customRules || [])];
    rules.splice(index, 1);
    const newConfig = { ...config, customRules: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const addIpRule = async () => {
    if (!selectedProject || !newIpAddress) return;
    const rules = [...(config.ipAccessList || []), { ip: newIpAddress, action: newIpAction }];
    const newConfig = { ...config, ipAccessList: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setNewIpAddress('');
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const removeIpRule = async (index: number) => {
    if (!selectedProject) return;
    const rules = [...(config.ipAccessList || [])];
    rules.splice(index, 1);
    const newConfig = { ...config, ipAccessList: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const addGeoRule = async () => {
    if (!selectedProject || !newCountry) return;
    const rules = [...(config.geoAccessList || []), { country: newCountry.toUpperCase(), action: newCountryAction }];
    const newConfig = { ...config, geoAccessList: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setNewCountry('US');
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const removeGeoRule = async (index: number) => {
    if (!selectedProject) return;
    const rules = [...(config.geoAccessList || [])];
    rules.splice(index, 1);
    const newConfig = { ...config, geoAccessList: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const addAdvRule = async () => {
    if (!selectedProject || !advValue) return;
    const rules = [...(config.advancedRules || []), { field: advField, operator: advOp, value: advValue, action: advAction }];
    const newConfig = { ...config, advancedRules: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setAdvValue('');
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const removeAdvRule = async (index: number) => {
    if (!selectedProject) return;
    const rules = [...(config.advancedRules || [])];
    rules.splice(index, 1);
    const newConfig = { ...config, advancedRules: rules };
    setConfig(newConfig);
    setSaving(true);
    try {
      await fetch(`http://localhost:5000/api/firewall/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const editAdvRule = (index: number) => {
    const rule = config.advancedRules[index];
    setAdvField(rule.field);
    setAdvOp(rule.operator);
    setAdvValue(rule.value);
    setAdvAction(rule.action);
    removeAdvRule(index);
  };

  const historyData = config.stats?.history 
    ? Object.entries(config.stats.history).map(([key, value]: any) => ({
        time: key.split('T')[1] + ':00',
        allowed: value.allowed || 0,
        blocked: value.blocked || 0
      }))
    : [];

  const attackTypeData = config.stats?.attackTypes
    ? Object.entries(config.stats.attackTypes).map(([key, value]) => ({
        name: key,
        count: value
      })).sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="firewall-container">
      <div className="firewall-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="firewall-title-wrapper" style={{ margin: 0 }}>
            <FirewallIcon />
            <h2>Web Application Firewall (WAF)</h2>
          </div>
          
          <div className="firewall-project-selector" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ margin: 0, fontWeight: 500, color: '#374151' }}>Domain:</label>
            <select 
              value={selectedProject || ''} 
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', background: '#fff', minWidth: '220px' }}
            >
              <option value="" disabled>-- Choose a project --</option>
              {deployments.map((p: string) => (
                <option key={p} value={p}>{p}.dev-21.duckdns.org</option>
              ))}
            </select>
          </div>
        </div>

        {selectedProject && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: config.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '1rem 1.5rem', borderRadius: '12px', border: `1px solid ${config.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                padding: '0.4rem 0.8rem', 
                borderRadius: '999px', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                background: config.enabled ? '#10b981' : '#ef4444',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }}></div>
                {config.enabled ? 'PROTECTED' : 'OFF'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#111' }}>Master Firewall Switch</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>Toggle all Edge network protections for this domain.</span>
              </div>
            </div>
            
            <div className={`toggle-switch ${config.enabled ? 'active' : ''}`} onClick={() => toggleSetting('enabled')} style={{ transform: 'scale(1.2)' }}>
              <div className="toggle-knob"></div>
            </div>
          </div>
        )}
      </div>

      {selectedProject && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Total Requests (24h)</h4>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{config.stats?.totalRequests?.toLocaleString() || 0}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Threats Blocked</h4>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{config.stats?.threatsBlocked?.toLocaleString() || 0}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Challenged Requests</h4>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{config.stats?.challenged?.toLocaleString() || 0}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>Top Attack Type</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#374151', minHeight: '38px', display: 'flex', alignItems: 'center' }}>
              {config.stats?.attackTypes && Object.keys(config.stats.attackTypes).length > 0
                ? Object.entries(config.stats.attackTypes).sort((a, b) => b[1] - a[1])[0][0]
                : 'None'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.1rem' }}>Allowed vs Blocked Traffic (Last 24h)</h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer>
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Area type="monotone" dataKey="allowed" name="Allowed" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="blocked" name="Blocked" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.1rem' }}>Blocked Requests by Attack Type</h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer>
                    <BarChart data={attackTypeData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(0,0,0,0.05)'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="count" name="Threats Blocked" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexDirection: 'column' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.1rem' }}>Live Security Events</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>IP</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Country</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Path</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Rule Triggered</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.stats?.events && config.stats.events.length > 0 ? (
                        config.stats.events.map((evt, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{new Date(evt.time).toLocaleTimeString()}</td>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{evt.ip}</td>
                            <td style={{ padding: '0.75rem' }}>{evt.country}</td>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{evt.path}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ padding: '0.2rem 0.5rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.85rem' }}>{evt.rule}</span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ 
                                color: evt.action === 'block' ? '#ef4444' : '#f59e0b',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase'
                              }}>{evt.action}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No recent events recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.1rem' }}>Top Blocked IPs</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>IP Address</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Block Count</th>
                        <th style={{ padding: '0.75rem', color: '#6b7280', fontWeight: 600, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.stats?.blockedIps && Object.keys(config.stats.blockedIps).length > 0 ? (
                        Object.entries(config.stats.blockedIps)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([ip, count], idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{ip}</td>
                            <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{count}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              <button 
                                onClick={() => {
                                  if(!config.ipAccessList.find(x => x.ip === ip)) {
                                    setNewIpAddress(ip);
                                    setNewIpAction('block');
                                    // Normally we would just call addIpRule(), but we don't want to simulate the whole event.
                                    // Just scroll to it or let the user click add on the form!
                                    alert('IP ' + ip + ' copied to IP Blocklist form! Scroll down to save it.');
                                  } else {
                                    alert('IP ' + ip + ' is already permanently blocked.');
                                  }
                                }}
                                style={{
                                  background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                                }}>
                                Block Permanently
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No blocked IPs yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
      )}

      {selectedProject ? (
        <div className="firewall-settings-panel">

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>DDoS Rate Limiting</h3>
              <p>Limits traffic to 100 requests per minute per IP address. Prevents basic brute-force and scraping attacks.</p>
            </div>
            <div className={`toggle-switch ${config.rateLimit ? 'active' : ''}`} onClick={() => toggleSetting('rateLimit')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>Bot Protection (WAF)</h3>
              <p>Automatically block known scrapers, crawlers, and malicious CLI tools (cURL, Postman, wget) from accessing your Edge Node.</p>
            </div>
            <div className={`toggle-switch ${config.botProtection ? 'active' : ''}`} onClick={() => toggleSetting('botProtection')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>Challenge Mode (JS Check)</h3>
              <p>Forces every new visitor to pass an automated Javascript verification check before they are allowed to see your website.</p>
            </div>
            <div className={`toggle-switch ${config.challengeMode ? 'active' : ''}`} onClick={() => toggleSetting('challengeMode')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>OWASP Deep Packet Inspection</h3>
              <p>Actively scans incoming traffic payloads to instantly block SQL Injection (SQLi), XSS, Path Traversal, and Command Injection attacks.</p>
            </div>
            <div className={`toggle-switch ${config.owaspRules ? 'active' : ''}`} onClick={() => toggleSetting('owaspRules')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>Security Headers</h3>
              <p>Automatically inject HSTS, CSP, X-Frame-Options, and X-Content-Type-Options to protect against clickjacking and sniffing.</p>
            </div>
            <div className={`toggle-switch ${config.securityHeaders ? 'active' : ''}`} onClick={() => toggleSetting('securityHeaders')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>Force HTTPS</h3>
              <p>Always redirect insecure HTTP requests to secure HTTPS endpoints automatically.</p>
            </div>
            <div className={`toggle-switch ${config.forceHttps ? 'active' : ''}`} onClick={() => toggleSetting('forceHttps')}>
              <div className="toggle-knob"></div>
            </div>
          </div>

          <div className={`setting-card danger-zone ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info">
              <h3>Under Attack Mode (Strict Mode)</h3>
              <p className="danger-text">WARNING: Very Strict. Limits traffic to 20 requests per minute. May block legitimate users. Only use if under active attack.</p>
            </div>
            <div className={`toggle-switch danger-toggle ${config.strictMode ? 'active' : ''}`} onClick={() => toggleSetting('strictMode')}>
              <div className="toggle-knob"></div>
            </div>
          </div>
          
          <div className={`setting-card rules-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info" style={{ width: '100%' }}>
              <h3>Custom Path Rules</h3>
              <p>Override the global rate limit for specific API endpoints or routes (e.g. /api/login).</p>
              
              <div className="rules-list">
                {(config.customRules || []).map((rule, idx) => (
                  <div key={idx} className="rule-item">
                    <span className="rule-path">{rule.path}</span>
                    <span className="rule-limit">{rule.limit} req / min</span>
                    <button className="rule-remove" onClick={() => removeCustomRule(idx)}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="add-rule-form">
                <input 
                  type="text" 
                  placeholder="/api/auth" 
                  value={newRulePath} 
                  onChange={e => setNewRulePath(e.target.value)} 
                />
                <input 
                  type="number" 
                  min="1"
                  max="1000"
                  value={newRuleLimit} 
                  onChange={e => setNewRuleLimit(parseInt(e.target.value) || 1)} 
                />
                <button onClick={addCustomRule}>Add Rule</button>
              </div>
            </div>
          </div>

          <div className={`setting-card rules-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info" style={{ width: '100%' }}>
              <h3>IP Access Control</h3>
              <p>Block or allow specific IPs and CIDR ranges (e.g. 192.168.1.1 or 10.0.0.0/8).</p>
              
              <div className="rules-list">
                {(config.ipAccessList || []).map((rule, idx) => (
                  <div key={idx} className="rule-item">
                    <span className="rule-path">{rule.ip}</span>
                    <span className={`rule-limit ${rule.action === 'block' ? 'action-block' : 'action-allow'}`}>{rule.action.toUpperCase()}</span>
                    <button className="rule-remove" onClick={() => removeIpRule(idx)}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="add-rule-form">
                <input 
                  type="text" 
                  placeholder="e.g. 192.168.1.1 or 10.0.0.0/24" 
                  value={newIpAddress} 
                  onChange={e => setNewIpAddress(e.target.value)} 
                />
                <select value={newIpAction} onChange={(e) => setNewIpAction(e.target.value as 'block' | 'allow')} className="action-select">
                  <option value="block">BLOCK</option>
                  <option value="allow">ALLOW</option>
                </select>
                <button onClick={addIpRule}>Add IP Rule</button>
              </div>
            </div>
          </div>

          <div className={`setting-card rules-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info" style={{ width: '100%' }}>
              <h3>Country Blocking (Geo-Fencing)</h3>
              <p>Block or allow traffic originating from specific countries using ISO 3166-1 alpha-2 country codes (e.g. US, CN, RU, IN).</p>
              
              <div className="rules-list">
                {(config.geoAccessList || []).map((rule, idx) => (
                  <div key={idx} className="rule-item">
                    <span className="rule-path">{rule.country}</span>
                    <span className={`rule-limit ${rule.action === 'block' ? 'action-block' : 'action-allow'}`}>{rule.action.toUpperCase()}</span>
                    <button className="rule-remove" onClick={() => removeGeoRule(idx)}>Remove</button>
                  </div>
                ))}
              </div>

              <div className="add-rule-form">
                <input 
                  type="text" 
                  placeholder="e.g. US, IN, RU" 
                  maxLength={2}
                  value={newCountry} 
                  onChange={e => setNewCountry(e.target.value.toUpperCase())} 
                />
                <select value={newCountryAction} onChange={(e) => setNewCountryAction(e.target.value as 'block' | 'allow')} className="action-select">
                  <option value="block">BLOCK</option>
                  <option value="allow">ALLOW</option>
                </select>
                <button onClick={addGeoRule}>Add Country Rule</button>
              </div>
            </div>
          </div>

          <div className={`setting-card rules-card ${!config.enabled ? 'disabled' : ''}`}>
            <div className="setting-info" style={{ width: '100%' }}>
              <h3>Advanced Custom Rules Engine</h3>
              <p>Create complex security rules using Field, Operator, and Action combinations.</p>
              
              <div className="rules-list">
                {(config.advancedRules || []).map((rule, idx) => (
                  <div key={idx} className="rule-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="rule-path" style={{ background: '#f3f4f6' }}>{rule.field}</span>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>{rule.operator}</span>
                      <span className="rule-path">"{rule.value}"</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`rule-limit ${rule.action === 'block' ? 'action-block' : rule.action === 'challenge' ? 'action-challenge' : 'action-allow'}`}>{rule.action.toUpperCase()}</span>
                      <button className="rule-remove" style={{ background: '#3b82f6', color: '#fff' }} onClick={() => editAdvRule(idx)}>Edit</button>
                      <button className="rule-remove" onClick={() => removeAdvRule(idx)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-rule-form" style={{ flexWrap: 'wrap' }}>
                <select value={advField} onChange={(e) => setAdvField(e.target.value)} className="action-select" style={{ width: '140px' }}>
                  <option value="user-agent">User-Agent</option>
                  <option value="path">Path / URI</option>
                  <option value="ip">IP Address</option>
                  <option value="country">Country Code</option>
                </select>
                <select value={advOp} onChange={(e) => setAdvOp(e.target.value)} className="action-select" style={{ width: '120px' }}>
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                </select>
                <input 
                  type="text" 
                  placeholder="e.g. badbot, /wp-admin" 
                  value={advValue} 
                  onChange={e => setAdvValue(e.target.value)} 
                  style={{ minWidth: '150px' }}
                />
                <select value={advAction} onChange={(e) => setAdvAction(e.target.value)} className="action-select" style={{ width: '120px' }}>
                  <option value="block">BLOCK</option>
                  <option value="challenge">CHALLENGE</option>
                  <option value="log">LOG ONLY</option>
                </select>
                <button onClick={addAdvRule}>Add Custom Rule</button>
              </div>
            </div>
          </div>
          
          {saving && <span className="saving-indicator">Saving configuration to Edge network...</span>}
        </div>
      ) : (
        <div className="firewall-empty">
          <p>Please select a project above to configure its firewall rules.</p>
        </div>
      )}
    </div>
  );
}

const fs = require('fs');
const path = require('path');

const FIREWALL_FILE = path.join(__dirname, '..', '..', 'deployments', 'firewall.json');

const initFirewallDB = () => {
  if (!fs.existsSync(FIREWALL_FILE)) {
    fs.writeFileSync(FIREWALL_FILE, JSON.stringify({}));
  }
};

const getFirewallConfig = (req, res) => {
  initFirewallDB();
  const projectName = req.params.projectName;
  const WAF_STATS_FILE = path.join(__dirname, '..', '..', 'deployments', 'waf-stats.json');
  let stats = { totalRequests: 0, threatsBlocked: 0, challenged: 0, attackTypes: {} };
  try {
    const wafStats = JSON.parse(fs.readFileSync(WAF_STATS_FILE, 'utf8'));
    if (wafStats[projectName]) stats = wafStats[projectName];
  } catch(e) {}

  const config = JSON.parse(fs.readFileSync(FIREWALL_FILE, 'utf8'));
  
  if (config[projectName]) {
    res.json({ ...config[projectName], stats });
  } else {
    res.json({ enabled: false, strictMode: false, rateLimit: false, stats });
  }
};

const updateFirewallConfig = (req, res) => {
  initFirewallDB();
  const projectName = req.params.projectName;
  const config = JSON.parse(fs.readFileSync(FIREWALL_FILE, 'utf8'));
  config[projectName] = req.body;
  
  fs.writeFileSync(FIREWALL_FILE, JSON.stringify(config, null, 2));
  res.json(config[projectName]);
};

module.exports = {
  getFirewallConfig,
  updateFirewallConfig
};

const express = require('express');
const router = express.Router();
const { getFirewallConfig, updateFirewallConfig } = require('./firewall.controller');

router.get('/:projectName', getFirewallConfig);
router.post('/:projectName', updateFirewallConfig);

module.exports = router;

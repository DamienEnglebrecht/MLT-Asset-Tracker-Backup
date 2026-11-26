// =============================================
// CONFIG & STATE
// =============================================
console.log('MLT Asset Tracker loading...');

const validCodes = {
    'MICK-RRMB-AUD5-4HA7': { name: 'Damien', role: 'admin' },
    'MICK-Y2SK-48XE-PB66': { name: 'Debbie', role: 'operations' }
};

let currentUser = null;
let fleetData = [];
let poData = [];
let customData = { customers: [], sites: [], jobs: [] };
let movements = [];
let auditLog = [];

// Supabase client - disabled until valid key provided
const SUPABASE_URL = 'https://fntqwckvrdbemjadcpcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudHF3Y2t2cmRiZW1qYWRjcGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjQxOTEsImV4cCI6MjA5Nzc0MDE5MX0.RkrUugZ4Jain6O2Z8XziNjRzWfcKRQcdFSrVb8NnBl4';
const supabase = null; // Disabled - localStorage fallback active

let selectedCustomer = null;
let selectedSite = null;
let selectedJob = null;

// =============================================
// AUTH
// =============================================
function handleLogin() {
    const code = document.getElementById('loginCode').value.trim().toUpperCase();
    const user = validCodes[code];
    
    if (user) {
        currentUser = { ...user, code };
        localStorage.setItem('mlt_tracker_session', JSON.stringify({
            user: currentUser,
            expires: Date.now() + (8 * 60 * 60 * 1000)
        }));
        showApp();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function checkSession() {
    const session = localStorage.getItem('mlt_tracker_session');
    if (session) {
        const parsed = JSON.parse(session);
        if (parsed.expires > Date.now()) {
            currentUser = parsed.user;
            return true;
        }
        localStorage.removeItem('mlt_tracker_session');
    }
    return false;
}

function handleLogout() {
    localStorage.removeItem('mlt_tracker_session');
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loginCode').value = '';
    document.getElementById('loginError').style.display = 'none';
}

// =============================================
// APP INIT
// =============================================
async function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0);
    
    await loadData();
    
    renderCustomers();
    renderMovements();
    renderAuditLog();
    renderAdminData();
    renderDashboard();
    renderPOAlerts();
    
    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });
    
    // Tower lookup for reassign
    document.getElementById('reassignTowerId').addEventListener('blur', lookupTowerJob);
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('moveDate').value = today;
    document.getElementById('reassignDate').value = today;
    
    document.getElementById('loginCode').addEventListener('keyup', e => {
        if (e.key === 'Enter') handleLogin();
    });
}

async function loadData() {
    try {
        const [fleetRes, poRes] = await Promise.all([
            fetch('fleet-data.json'),
            fetch('po-data.json').catch(() => ({ ok: false }))
        ]);
        
        fleetData = await fleetRes.json();
        if (poRes.ok) poData = await poRes.json();
    } catch (err) {
        console.log('Data load error:', err);
        fleetData = [];
    }
    
    // Load custom data
    const saved = localStorage.getItem('mlt_custom_data');
    if (saved) customData = JSON.parse(saved);
    
    const savedMovements = localStorage.getItem('mlt_movements');
    if (savedMovements) movements = JSON.parse(savedMovements);
    
    const savedAudit = localStorage.getItem('mlt_audit');
    if (savedAudit) auditLog = JSON.parse(savedAudit);
}

function saveCustomData() {
    localStorage.setItem('mlt_custom_data', JSON.stringify(customData));
}

function saveMovements() {
    localStorage.setItem('mlt_movements', JSON.stringify(movements));
}

function saveAudit() {
    localStorage.setItem('mlt_audit', JSON.stringify(auditLog));
}

function addAuditEntry(action, detail) {
    auditLog.unshift({
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        action,
        detail
    });
    if (auditLog.length > 500) auditLog = auditLog.slice(0, 500);
    saveAudit();
}

// =============================================
// DATA HELPERS
// =============================================
function getCustomers() {
    const fromFleet = [...new Set(fleetData.map(t => t.customer).filter(Boolean))];
    const fromCustom = customData.customers.map(c => c.name);
    return [...new Set([...fromFleet, ...fromCustom])].sort();
}

function getSitesForCustomer(customer) {
    const fromFleet = [...new Set(
        fleetData
            .filter(t => t.customer === customer)
            .map(t => t.site)
            .filter(Boolean)
    )];
    const fromCustom = customData.sites
        .filter(s => s.customer === customer)
        .map(s => s.name);
    return [...new Set([...fromFleet, ...fromCustom])].sort();
}

function getJobsForSite(customer, site) {
    // Get jobs from fleet data (visionJob field)
    const towersAtSite = fleetData.filter(t => 
        t.customer === customer && 
        t.site === site && 
        (t.status || '').toUpperCase().includes('ON HIRE')
    );
    
    const jobsFromFleet = {};
    towersAtSite.forEach(t => {
        const job = t.visionJob || 'UNASSIGNED';
        if (!jobsFromFleet[job]) {
            jobsFromFleet[job] = {
                code: job,
                description: t.jobDescription || '',
                towerCount: 0,
                rate: t.rateDaily || t.daily_rate || 0
            };
        }
        jobsFromFleet[job].towerCount++;
    });
    
    // Get jobs from custom data
    const jobsFromCustom = customData.jobs
        .filter(j => j.customer === customer && j.site === site)
        .map(j => ({
            code: j.code,
            description: j.description,
            poNumber: j.poNumber,
            startDate: j.startDate,
            endDate: j.endDate,
            rate: j.rate,
            towerCount: towersAtSite.filter(t => t.visionJob === j.code).length,
            isCustom: true
        }));
    
    // Merge - custom jobs take precedence for metadata
    const result = [];
    const addedCodes = new Set();
    
    jobsFromCustom.forEach(j => {
        result.push(j);
        addedCodes.add(j.code);
    });
    
    Object.values(jobsFromFleet).forEach(j => {
        if (!addedCodes.has(j.code)) {
            // Try to find PO info
            const poMatch = poData.find(p => 
                p.poNumber === j.code || 
                (p.filename && p.filename.includes(j.code))
            );
            if (poMatch) {
                j.poNumber = poMatch.poNumber;
                j.startDate = poMatch.startDate;
                j.endDate = poMatch.endDate;
            }
            result.push(j);
        }
    });
    
    return result.sort((a, b) => (b.towerCount || 0) - (a.towerCount || 0));
}

function getTowersForJob(customer, site, jobCode) {
    return fleetData.filter(t => 
        t.customer === customer && 
        t.site === site && 
        (t.visionJob === jobCode || (!t.visionJob && jobCode === 'UNASSIGNED')) &&
        (t.status || '').toUpperCase().includes('ON HIRE')
    );
}

function getAllSites() {
    const fromFleet = [...new Set(fleetData.map(t => t.site).filter(Boolean))];
    const fromCustom = customData.sites.map(s => s.name);
    return [...new Set([...fromFleet, ...fromCustom])].sort();
}

// =============================================
// FINANCE VIEW
// =============================================
function renderCustomers() {
    const customers = getCustomers();
    document.getElementById('customerCount').textContent = customers.length;
    
    let html = '';
    customers.forEach(name => {
        const towerCount = fleetData.filter(t => 
            t.customer === name && 
            (t.status || '').toUpperCase().includes('ON HIRE')
        ).length;
        
        html += `
            <div class="column-item ${selectedCustomer === name ? 'active' : ''}" 
                 onclick="selectCustomer('${name.replace(/'/g, "\\'")}')">
                <div>
                    <div class="column-item-name">${name}</div>
                </div>
                <span class="column-item-count">${towerCount}</span>
            </div>
        `;
    });
    
    document.getElementById('customerList').innerHTML = html || '<div class="empty-state"><div class="empty-state-text">No customers</div></div>';
}

function selectCustomer(name) {
    selectedCustomer = name;
    selectedSite = null;
    selectedJob = null;
    
    renderCustomers();
    renderSites();
    
    document.getElementById('jobList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">&larr;</div><div class="empty-state-text">Select a site</div></div>';
    document.getElementById('jobCount').textContent = '0';
    
    document.getElementById('invoiceEmpty').classList.remove('hidden');
    document.getElementById('invoiceContent').classList.add('hidden');
}

function renderSites() {
    if (!selectedCustomer) return;
    
    const sites = getSitesForCustomer(selectedCustomer);
    document.getElementById('siteCount').textContent = sites.length;
    
    let html = '';
    sites.forEach(name => {
        const towerCount = fleetData.filter(t => 
            t.customer === selectedCustomer && 
            t.site === name && 
            (t.status || '').toUpperCase().includes('ON HIRE')
        ).length;
        
        html += `
            <div class="column-item ${selectedSite === name ? 'active' : ''}" 
                 onclick="selectSite('${name.replace(/'/g, "\\'")}')">
                <div>
                    <div class="column-item-name">${name}</div>
                </div>
                <span class="column-item-count">${towerCount}</span>
            </div>
        `;
    });
    
    document.getElementById('siteList').innerHTML = html || '<div class="empty-state"><div class="empty-state-text">No sites</div></div>';
}

function selectSite(name) {
    selectedSite = name;
    selectedJob = null;
    
    renderSites();
    renderJobs();
    
    document.getElementById('invoiceEmpty').classList.remove('hidden');
    document.getElementById('invoiceContent').classList.add('hidden');
}

function renderJobs() {
    if (!selectedCustomer || !selectedSite) return;
    
    const jobs = getJobsForSite(selectedCustomer, selectedSite);
    document.getElementById('jobCount').textContent = jobs.length;
    
    let html = '';
    jobs.forEach(job => {
        const weeklyTotal = job.towerCount * (job.rate || 50) * 7;
        
        html += `
            <div class="column-item ${selectedJob === job.code ? 'active' : ''}" 
                 onclick="selectJob('${job.code.replace(/'/g, "\\'")}')">
                <div>
                    <div class="column-item-name">${job.code}</div>
                    <div class="column-item-sub">${job.description || 'No description'} • ${job.towerCount} towers</div>
                </div>
                <span class="column-item-count money">$${weeklyTotal.toLocaleString()}</span>
            </div>
        `;
    });
    
    document.getElementById('jobList').innerHTML = html || '<div class="empty-state"><div class="empty-state-text">No jobs</div></div>';
}

function selectJob(code) {
    selectedJob = code;
    renderJobs();
    renderInvoice();
}

function renderInvoice() {
    if (!selectedCustomer || !selectedSite || !selectedJob) return;
    
    const jobs = getJobsForSite(selectedCustomer, selectedSite);
    const job = jobs.find(j => j.code === selectedJob);
    if (!job) return;
    
    const towers = getTowersForJob(selectedCustomer, selectedSite, selectedJob);
    const days = 7;
    const rate = job.rate || 50;
    const totalDays = towers.length * days;
    const total = towers.reduce((sum, t) => sum + (t.rateDaily || t.daily_rate || rate) * days, 0);
    
    document.getElementById('invoiceEmpty').classList.add('hidden');
    document.getElementById('invoiceContent').classList.remove('hidden');
    
    document.getElementById('invoiceTitle').textContent = `${selectedCustomer} - ${selectedSite}`;
    document.getElementById('invoiceSubtitle').textContent = `Job: ${job.code} - ${job.description || 'Tower Hire'}`;
    document.getElementById('invoicePO').textContent = job.poNumber ? `PO: ${job.poNumber}` : 'No PO on file';
    
    document.getElementById('statTowers').textContent = towers.length;
    document.getElementById('statDays').textContent = totalDays;
    document.getElementById('statRate').textContent = `$${rate.toFixed(2)}`;
    document.getElementById('statTotal').textContent = `$${total.toLocaleString()}`;
    
    let html = '';
    towers.forEach(tower => {
        const towerId = tower.id || tower.tower_id;
        const config = tower.config || 'Standard';
        const towerRate = tower.rateDaily || tower.daily_rate || rate;
        const lineTotal = towerRate * days;
        
        html += `
            <tr>
                <td class="tower-id">${towerId}</td>
                <td><span class="config-badge">${config}</span></td>
                <td>${tower.site}</td>
                <td>${days}</td>
                <td class="money">$${towerRate.toFixed(2)}</td>
                <td class="money">$${lineTotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
        <tr class="total-row">
            <td colspan="5">Total (${towers.length} towers × ${days} days)</td>
            <td class="money">$${total.toLocaleString()}.00</td>
        </tr>
    `;
    
    document.getElementById('invoiceTable').innerHTML = html;
}

// =============================================
// OPERATIONS VIEW
// =============================================
function showOpsTab(tab) {
    document.querySelectorAll('.ops-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('movementsTab').classList.toggle('hidden', tab !== 'movements');
    document.getElementById('auditTab').classList.toggle('hidden', tab !== 'audit');
}

function showMovementForm() {
    document.getElementById('movementForm').classList.remove('hidden');
    document.getElementById('jobReassignForm').classList.add('hidden');
    
    // Populate site dropdowns
    const sites = getAllSites();
    const options = '<option value="">Select site...</option>' + 
        sites.map(s => `<option value="${s}">${s}</option>`).join('');
    
    document.getElementById('moveFromSite').innerHTML = options;
    document.getElementById('moveToSite').innerHTML = options;
}

function hideMovementForm() {
    document.getElementById('movementForm').classList.add('hidden');
}

function submitMovement() {
    const towerId = document.getElementById('moveTowerId').value.trim().toUpperCase();
    const fromSite = document.getElementById('moveFromSite').value;
    const toSite = document.getElementById('moveToSite').value;
    const date = document.getElementById('moveDate').value;
    
    if (!towerId || !toSite || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    movements.unshift({
        id: Date.now(),
        towerId,
        fromSite,
        toSite,
        date,
        loggedBy: currentUser.name,
        loggedAt: new Date().toISOString()
    });
    
    saveMovements();
    addAuditEntry('MOVEMENT', `${towerId}: ${fromSite || 'Unknown'} → ${toSite}`);
    
    // Update fleet data in memory
    const tower = fleetData.find(t => 
        (t.id || t.tower_id || '').toUpperCase().replace('MLT', '') === towerId.replace('MLT', '')
    );
    if (tower) {
        tower.site = toSite;
    }
    
    hideMovementForm();
    renderMovements();
    renderAuditLog();
    showToast('Movement logged successfully');
    
    // Clear form
    document.getElementById('moveTowerId').value = '';
    document.getElementById('moveFromSite').value = '';
    document.getElementById('moveToSite').value = '';
}

function showJobReassignForm() {
    document.getElementById('jobReassignForm').classList.remove('hidden');
    document.getElementById('movementForm').classList.add('hidden');
}

function hideJobReassignForm() {
    document.getElementById('jobReassignForm').classList.add('hidden');
}

function lookupTowerJob() {
            const towerId = document.getElementById('reassignTowerId').value.trim().toUpperCase();
            if (!towerId) return;
    
            const tower = fleetData.find(t => 
                (t.id || t.tower_id || '').toUpperCase().replace('MLT', '') === towerId.replace('MLT', '')
            );
    
            if (tower) {
                document.getElementById('reassignCurrentJob').value = tower.visionJob || 'UNASSIGNED';
        
                // Populate ALL jobs across all customers
                const allJobs = getAllJobs();
                let options = '<option value="">Select job...</option>';
                options += '<option value="__NEW__">+ Add New Job/Location...</option>';
                options += allJobs.map(j => `<option value="${j.code}">${j.code} - ${j.customer} - ${j.site} - ${j.description || 'No desc'}</option>`).join('');
                document.getElementById('reassignNewJob').innerHTML = options;
            } else {
                document.getElementById('reassignCurrentJob').value = 'Tower not found';
                document.getElementById('reassignNewJob').innerHTML = '<option value="">Select job...</option>';
            }
        }

        function getAllJobs() {
            // Get all unique jobs from fleet data
            const jobsMap = {};
            fleetData.filter(t => (t.status || '').toUpperCase().includes('ON HIRE')).forEach(t => {
                const job = t.visionJob;
                if (job && !jobsMap[job]) {
                    jobsMap[job] = {
                        code: job,
                        customer: t.customer,
                        site: t.site,
                        description: t.jobDescription || ''
                    };
                }
            });
    
            // Add custom jobs
            customData.jobs.forEach(j => {
                if (!jobsMap[j.code]) {
                    jobsMap[j.code] = j;
                }
            });
    
            // Sort by customer then job code
            return Object.values(jobsMap).sort((a, b) => {
                if (a.customer !== b.customer) return a.customer.localeCompare(b.customer);
                return a.code.localeCompare(b.code);
            });
        }

        function onNewJobChange() {
            const select = document.getElementById('reassignNewJob');
            if (select.value === '__NEW__') {
                // Show custom job input
                document.getElementById('customJobSection').classList.remove('hidden');
                select.value = '';
            } else {
                document.getElementById('customJobSection').classList.add('hidden');
            }
        }

function submitJobReassign() {
    const towerId = document.getElementById('reassignTowerId').value.trim().toUpperCase();
    let newJob = document.getElementById('reassignNewJob').value;
    const date = document.getElementById('reassignDate').value;
    
    // Check if using custom job
    const customJobCode = document.getElementById('customJobCode').value.trim();
    const customJobCustomer = document.getElementById('customJobCustomer').value.trim();
    const customJobSite = document.getElementById('customJobSite').value.trim();
    const customJobDesc = document.getElementById('customJobDesc').value.trim();
    
    // If custom job section is visible and has data, use that
    if (!document.getElementById('customJobSection').classList.contains('hidden') && customJobCode) {
        newJob = customJobCode;
        
        // Save new job to customData
        customData.jobs.push({
            code: customJobCode,
            customer: customJobCustomer || 'Unknown',
            site: customJobSite || 'Unknown',
            description: customJobDesc || ''
        });
        saveCustomData();
    }
    
    if (!towerId || !newJob || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const tower = fleetData.find(t => 
        (t.id || t.tower_id || '').toUpperCase().replace('MLT', '') === towerId.replace('MLT', '')
    );
    
    if (!tower) {
        showToast('Tower not found', 'error');
        return;
    }
    
    const oldJob = tower.visionJob || 'UNASSIGNED';
    tower.visionJob = newJob;
    
    // If custom job, also update the tower's customer/site
    if (customJobCode && customJobCustomer) {
        tower.customer = customJobCustomer;
    }
    if (customJobCode && customJobSite) {
        tower.site = customJobSite;
    }
    
    addAuditEntry('JOB_REASSIGN', `${towerId}: ${oldJob} → ${newJob}`);
    
    hideJobReassignForm();
    renderAuditLog();
    renderDashboard();
    showToast('Tower reassigned successfully');
    
    // Refresh invoice if viewing
    if (selectedJob) renderInvoice();
    
    // Clear form
    document.getElementById('reassignTowerId').value = '';
    document.getElementById('reassignCurrentJob').value = '';
    document.getElementById('reassignNewJob').innerHTML = '<option value="">Select job...</option>';
    document.getElementById('customJobSection').classList.add('hidden');
    document.getElementById('customJobCode').value = '';
    document.getElementById('customJobCustomer').value = '';
    document.getElementById('customJobSite').value = '';
    document.getElementById('customJobDesc').value = '';
}

function renderMovements() {
    const recent = movements.slice(0, 50);
    
    if (!recent.length) {
        document.getElementById('movementsTable').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px">No movements recorded yet</td></tr>';
        return;
    }
    
    let html = '';
    recent.forEach(m => {
        html += `
            <tr>
                <td>${m.date}</td>
                <td class="tower-id">${m.towerId}</td>
                <td>${m.fromSite || '-'}</td>
                <td>${m.toSite}</td>
                <td>${m.loggedBy}</td>
            </tr>
        `;
    });
    
    document.getElementById('movementsTable').innerHTML = html;
}

function renderAuditLog() {
    const recent = auditLog.slice(0, 100);
    
    if (!recent.length) {
        document.getElementById('auditLog').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px">No audit entries yet</div>';
        return;
    }
    
    let html = '';
    recent.forEach(entry => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="audit-item">
                <span class="audit-time">${timeStr}</span>
                <span class="audit-user">${entry.user}</span>
                <span class="audit-action"> • ${entry.action}</span>
                <div class="audit-detail">${entry.detail}</div>
            </div>
        `;
    });
    
    document.getElementById('auditLog').innerHTML = html;
}

// =============================================
// DASHBOARD VIEW
// =============================================
function renderDashboard() {
    const onHireTowers = fleetData.filter(t => (t.status || '').toUpperCase().includes('ON HIRE'));
    const customers = getCustomers();
    
    // Calculate totals
    let totalRevenue = 0;
    let totalJobs = 0;
    const customerData = [];
    const allJobs = [];
    
    customers.forEach(custName => {
        let custRevenue = 0;
        let custTowers = 0;
        let custJobs = 0;
        
        const sites = getSitesForCustomer(custName);
        const custSites = sites.length;
        
        sites.forEach(siteName => {
            const jobs = getJobsForSite(custName, siteName);
            custJobs += jobs.length;
            
            jobs.forEach(job => {
                const towers = getTowersForJob(custName, siteName, job.code);
                const rate = job.rate || 50;
                const jobRevenue = towers.length * rate * 7;
                custRevenue += jobRevenue;
                custTowers += towers.length;
                
                if (towers.length > 0) {
                    allJobs.push({
                        code: job.code,
                        customer: custName,
                        site: siteName,
                        description: job.description,
                        towers: towers.length,
                        revenue: jobRevenue
                    });
                }
            });
        });
        
        totalJobs += custJobs;
        totalRevenue += custRevenue;
        
        if (custTowers > 0) {
            customerData.push({
                name: custName,
                sites: custSites,
                jobs: custJobs,
                towers: custTowers,
                revenue: custRevenue
            });
        }
    });
    
    // Sort customer data by revenue
    customerData.sort((a, b) => b.revenue - a.revenue);
    
    // Update stats
    document.getElementById('dashTotalTowers').textContent = onHireTowers.length.toLocaleString();
    document.getElementById('dashTotalCustomers').textContent = customerData.length;
    document.getElementById('dashTotalJobs').textContent = totalJobs;
    document.getElementById('dashTotalRevenue').textContent = '$' + totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
    
    // Render customer bars (top 10)
    const maxRevenue = customerData.length > 0 ? customerData[0].revenue : 1;
    let barsHtml = '';
    customerData.slice(0, 10).forEach(c => {
        const pct = (c.revenue / maxRevenue) * 100;
        barsHtml += `
            <div class="customer-bar">
                <div class="customer-bar-name" title="${c.name}">${c.name}</div>
                <div class="customer-bar-track">
                    <div class="customer-bar-fill" style="width: ${pct}%">${c.towers}</div>
                </div>
                <div class="customer-bar-value">$${c.revenue.toLocaleString()}</div>
            </div>
        `;
    });
    document.getElementById('customerBars').innerHTML = barsHtml || '<div class="empty-state">No data</div>';
    
    // Render top jobs
    allJobs.sort((a, b) => b.revenue - a.revenue);
    let jobsHtml = '';
    allJobs.slice(0, 10).forEach((j, i) => {
        jobsHtml += `
            <div class="top-job-item">
                <div class="top-job-rank">${i + 1}</div>
                <div class="top-job-info">
                    <div class="top-job-code">${j.code}</div>
                    <div class="top-job-customer">${j.customer} - ${j.site} (${j.towers} towers)</div>
                </div>
                <div class="top-job-value">$${j.revenue.toLocaleString()}</div>
            </div>
        `;
    });
    document.getElementById('topJobsList').innerHTML = jobsHtml || '<div class="empty-state">No data</div>';
    
    // Store for table
    window.dashboardCustomerData = customerData;
    renderDashboardTable();
}

function renderDashboardTable() {
    const search = (document.getElementById('dashboardSearch')?.value || '').toLowerCase();
    const data = (window.dashboardCustomerData || []).filter(c => 
        c.name.toLowerCase().includes(search)
    );
    
    let html = '';
    data.forEach(c => {
        html += `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.sites}</td>
                <td>${c.jobs}</td>
                <td>${c.towers}</td>
                <td class="money">$${c.revenue.toLocaleString()}</td>
                <td>
                    <button class="btn small" onclick="viewCustomerInvoices('${c.name}')">View</button>
                    <button class="btn small" onclick="exportCustomerCSV('${c.name}')">CSV</button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('dashboardTable').innerHTML = html || '<tr><td colspan="6" class="empty-state">No customers found</td></tr>';
}

function viewCustomerInvoices(customer) {
    selectedCustomer = customer;
    selectedSite = null;
    selectedJob = null;
    renderSites();
    document.getElementById('jobsColumn').innerHTML = '<div class="empty-state">Select a site</div>';
    document.getElementById('invoicePreview').innerHTML = '<div class="empty-state">Select a job to view invoice</div>';
    switchView('finance');
    showToast(`Viewing ${customer}`);
}

function exportCustomerCSV(customer) {
    const sites = getSitesForCustomer(customer);
    let csv = 'Customer,Site,Job,PO,Tower ID,Configuration,Days,Daily Rate,Line Total\n';
    let total = 0;
    let towerCount = 0;
    
    sites.forEach(site => {
        const jobs = getJobsForSite(customer, site.name);
        jobs.forEach(job => {
            const towers = getTowersForJob(customer, site.name, job.code);
            towers.forEach(tower => {
                const towerId = tower.id || tower.tower_id;
                const config = (tower.config || 'Standard').replace(/,/g, ' ');
                const rate = tower.rateDaily || tower.daily_rate || job.rate || 50;
                const lineTotal = rate * 7;
                total += lineTotal;
                towerCount++;
                csv += `"${customer}","${site.name}","${job.code}","${job.poNumber || ''}","${towerId}","${config}",7,${rate.toFixed(2)},${lineTotal.toFixed(2)}\n`;
            });
        });
    });
    
    csv += `\nTotal,,,,,${towerCount} towers,,,${total.toFixed(2)}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${customer}_ALL_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`CSV exported for ${customer}`);
}

function exportAllCSV() {
    const customers = getCustomers();
    let csv = 'Customer,Site,Job,PO,Tower ID,Configuration,Days,Daily Rate,Line Total\n';
    let total = 0;
    let towerCount = 0;
    
    customers.forEach(custName => {
        const sites = getSitesForCustomer(custName);
        sites.forEach(siteName => {
            const jobs = getJobsForSite(custName, siteName);
            jobs.forEach(job => {
                const towers = getTowersForJob(custName, siteName, job.code);
                towers.forEach(tower => {
                    const towerId = tower.id || tower.tower_id;
                    const config = (tower.config || 'Standard').replace(/,/g, ' ');
                    const rate = tower.rateDaily || tower.daily_rate || job.rate || 50;
                    const lineTotal = rate * 7;
                    total += lineTotal;
                    towerCount++;
                    csv += `"${custName}","${siteName}","${job.code}","${job.poNumber || ''}","${towerId}","${config}",7,${rate.toFixed(2)},${lineTotal.toFixed(2)}\n`;
                });
            });
        });
    });
    
    csv += `\nTotal,,,,,${towerCount} towers,,,${total.toFixed(2)}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_ALL_CUSTOMERS_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('All customers CSV exported');
}

function invoiceAll() {
    const data = window.dashboardCustomerData || [];
    const totalRevenue = data.reduce((sum, c) => sum + c.revenue, 0);
    const totalTowers = data.reduce((sum, c) => sum + c.towers, 0);
    
    if (confirm(`Generate invoices for ALL customers?\n\n${data.length} Customers\n${totalTowers} Towers\nTotal: $${totalRevenue.toLocaleString()}\n\nThis will export a master CSV with all billing data.`)) {
        exportAllCSV();
        
        // Log to audit
        addAuditEntry('BULK_INVOICE', `All customers - ${data.length} customers, ${totalTowers} towers, $${totalRevenue.toLocaleString()}`);
    }
}

// =============================================
// PO ALERTS VIEW
// =============================================
let currentPOFilter = 'all';

function renderPOAlerts() {
    let expired = 0, expiring7 = 0, expiring30 = 0, ok = 0;
    const poAlerts = [];
    
    poData.forEach(po => {
        const daysLeft = po.daysUntil !== undefined ? po.daysUntil : 999;
        
        let status, statusClass;
        if (daysLeft < 0) {
            status = 'EXPIRED';
            statusClass = 'expired';
            expired++;
        } else if (daysLeft <= 7) {
            status = 'CRITICAL';
            statusClass = 'critical';
            expiring7++;
        } else if (daysLeft <= 30) {
            status = 'WARNING';
            statusClass = 'warning';
            expiring30++;
        } else {
            status = 'OK';
            statusClass = 'ok';
            ok++;
        }
        
        // Get description from filename
        const desc = po.filename ? po.filename.split(' - ').slice(-1)[0].replace('.pdf','').replace('.PDF','') : '-';
        
        poAlerts.push({
            status,
            statusClass,
            customer: po.customer || 'Unknown',
            poNumber: po.poNumber || '-',
            description: desc,
            endDate: po.endDate || 'TBC',
            daysLeft
        });
    });
    
    // Update stats
    document.getElementById('poExpired').textContent = expired;
    document.getElementById('poExpiring7').textContent = expiring7;
    document.getElementById('poExpiring30').textContent = expiring30;
    document.getElementById('poOk').textContent = ok;
    
    // Sort by days left (most urgent first)
    poAlerts.sort((a, b) => a.daysLeft - b.daysLeft);
    
    // Store for filtering
    window.allPOAlerts = poAlerts;
    
    // Render table
    filterPOAlerts(currentPOFilter);
}

function filterPOAlerts(filter) {
    currentPOFilter = filter;
    const alerts = window.allPOAlerts || [];
    
    // Update active button
    document.querySelectorAll('.po-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter) || 
            (filter === 'all' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });
    
    // Filter alerts
    let filtered = alerts;
    if (filter === 'critical') {
        filtered = alerts.filter(a => a.statusClass === 'expired' || a.statusClass === 'critical');
    } else if (filter === 'warning') {
        filtered = alerts.filter(a => a.statusClass === 'warning');
    } else if (filter === 'ok') {
        filtered = alerts.filter(a => a.statusClass === 'ok');
    }
    
    // Render
    const tbody = document.getElementById('poAlertsTable');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No PO alerts in this category</td></tr>';
        return;
    }
    
    let html = '';
    filtered.forEach(po => {
        const daysText = po.daysLeft < 0 ? `${Math.abs(po.daysLeft)} days ago` : `${po.daysLeft} days`;
        html += `
            <tr>
                <td><span class="po-status-badge ${po.statusClass}">${po.status}</span></td>
                <td style="font-weight:600;color:var(--accent)">${po.poNumber}</td>
                <td>${po.customer}</td>
                <td>${po.description}</td>
                <td>${po.endDate}</td>
                <td style="color:${po.daysLeft < 0 ? '#ef4444' : po.daysLeft <= 7 ? '#f59e0b' : 'inherit'};font-weight:600">${daysText}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// =============================================
// ADMIN VIEW
// =============================================
function renderAdminData() {
    // Customer list
    const customers = getCustomers();
    let custHtml = '';
    customers.forEach(name => {
        custHtml += `
            <div class="admin-list-item">
                <span>${name}</span>
            </div>
        `;
    });
    document.getElementById('adminCustomerList').innerHTML = custHtml || '<div style="color:var(--text-muted);padding:12px">No customers</div>';
    
    // Populate customer dropdowns
    const custOptions = '<option value="">Select customer...</option>' + 
        customers.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('adminSiteCustomer').innerHTML = custOptions;
    document.getElementById('adminJobCustomer').innerHTML = custOptions;
    document.getElementById('newSiteCustomer').innerHTML = custOptions;
    document.getElementById('newJobCustomer').innerHTML = custOptions;
}

function renderAdminSites() {
    const customer = document.getElementById('adminSiteCustomer').value;
    if (!customer) {
        document.getElementById('adminSiteList').innerHTML = '<div style="color:var(--text-muted);padding:12px">Select a customer</div>';
        return;
    }
    
    const sites = getSitesForCustomer(customer);
    let html = '';
    sites.forEach(name => {
        html += `
            <div class="admin-list-item">
                <span>${name}</span>
            </div>
        `;
    });
    document.getElementById('adminSiteList').innerHTML = html || '<div style="color:var(--text-muted);padding:12px">No sites</div>';
}

function updateAdminJobSites() {
    const customer = document.getElementById('adminJobCustomer').value;
    const siteSelect = document.getElementById('adminJobSite');
    
    if (!customer) {
        siteSelect.innerHTML = '<option value="">Select site...</option>';
        document.getElementById('adminJobList').innerHTML = '<div style="color:var(--text-muted);padding:12px">Select a customer and site</div>';
        return;
    }
    
    const sites = getSitesForCustomer(customer);
    siteSelect.innerHTML = '<option value="">Select site...</option>' + 
        sites.map(s => `<option value="${s}">${s}</option>`).join('');
}

function renderAdminJobs() {
    const customer = document.getElementById('adminJobCustomer').value;
    const site = document.getElementById('adminJobSite').value;
    
    if (!customer || !site) {
        document.getElementById('adminJobList').innerHTML = '<div style="color:var(--text-muted);padding:12px">Select a customer and site</div>';
        return;
    }
    
    const jobs = getJobsForSite(customer, site);
    let html = '';
    jobs.forEach(job => {
        html += `
            <div class="admin-list-item">
                <div>
                    <div>${job.code}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${job.description || 'No description'}</div>
                </div>
                <span style="color:var(--text-muted)">${job.towerCount} towers</span>
            </div>
        `;
    });
    document.getElementById('adminJobList').innerHTML = html || '<div style="color:var(--text-muted);padding:12px">No jobs</div>';
}

function updateNewJobSites() {
    const customer = document.getElementById('newJobCustomer').value;
    const siteSelect = document.getElementById('newJobSite');
    
    if (!customer) {
        siteSelect.innerHTML = '<option value="">Select site...</option>';
        return;
    }
    
    const sites = getSitesForCustomer(customer);
    siteSelect.innerHTML = '<option value="">Select site...</option>' + 
        sites.map(s => `<option value="${s}">${s}</option>`).join('');
}

// =============================================
// MODALS
// =============================================
function showAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('hidden');
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerName').focus();
}

function showAddSiteModal() {
    document.getElementById('addSiteModal').classList.remove('hidden');
    document.getElementById('newSiteName').value = '';
    
    const customers = getCustomers();
    document.getElementById('newSiteCustomer').innerHTML = '<option value="">Select customer...</option>' + 
        customers.map(c => `<option value="${c}">${c}</option>`).join('');
}

function showAddJobModal() {
    document.getElementById('addJobModal').classList.remove('hidden');
    
    const customers = getCustomers();
    document.getElementById('newJobCustomer').innerHTML = '<option value="">Select customer...</option>' + 
        customers.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('newJobSite').innerHTML = '<option value="">Select site...</option>';
    
    // Clear form
    document.getElementById('newJobCode').value = '';
    document.getElementById('newJobPO').value = '';
    document.getElementById('newJobDesc').value = '';
    document.getElementById('newJobStart').value = '';
    document.getElementById('newJobEnd').value = '';
    document.getElementById('newJobRate').value = '';
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function addCustomer() {
    const name = document.getElementById('newCustomerName').value.trim();
    if (!name) {
        showToast('Please enter a customer name', 'error');
        return;
    }
    
    if (getCustomers().includes(name)) {
        showToast('Customer already exists', 'error');
        return;
    }
    
    customData.customers.push({ name, createdAt: new Date().toISOString() });
    saveCustomData();
    addAuditEntry('ADD_CUSTOMER', name);
    
    closeModal('addCustomerModal');
    renderCustomers();
    renderAdminData();
    showToast('Customer added successfully');
}

function addSite() {
    const customer = document.getElementById('newSiteCustomer').value;
    const name = document.getElementById('newSiteName').value.trim();
    
    if (!customer || !name) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (getSitesForCustomer(customer).includes(name)) {
        showToast('Site already exists for this customer', 'error');
        return;
    }
    
    customData.sites.push({ customer, name, createdAt: new Date().toISOString() });
    saveCustomData();
    addAuditEntry('ADD_SITE', `${name} (${customer})`);
    
    closeModal('addSiteModal');
    renderAdminData();
    if (selectedCustomer === customer) renderSites();
    showToast('Site added successfully');
}

function addJob() {
    const customer = document.getElementById('newJobCustomer').value;
    const site = document.getElementById('newJobSite').value;
    const code = document.getElementById('newJobCode').value.trim();
    const poNumber = document.getElementById('newJobPO').value.trim();
    const description = document.getElementById('newJobDesc').value.trim();
    const startDate = document.getElementById('newJobStart').value;
    const endDate = document.getElementById('newJobEnd').value;
    const rate = parseFloat(document.getElementById('newJobRate').value) || 0;
    
    if (!customer || !site || !code) {
        showToast('Please fill in customer, site, and job code', 'error');
        return;
    }
    
    customData.jobs.push({
        customer,
        site,
        code,
        poNumber,
        description,
        startDate,
        endDate,
        rate,
        createdAt: new Date().toISOString()
    });
    saveCustomData();
    addAuditEntry('ADD_JOB', `${code} - ${description} (${customer} / ${site})`);
    
    closeModal('addJobModal');
    renderAdminData();
    if (selectedCustomer === customer && selectedSite === site) renderJobs();
    showToast('Job added successfully');
}

// =============================================
// UTILITIES
// =============================================
function switchView(view) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.nav-tab[data-view="${view}"]`).classList.add('active');
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('active');
    
    // Load history when switching to history tab
    if (view === 'history') {
        renderHistory();
    }
    
    // Load audit logs when switching to admin tab
    if (view === 'admin') {
        loadAuditLogs();
    }
}

// =============================================
// EXPORT FUNCTIONS
// =============================================
function exportCSV() {
    if (!selectedCustomer || !selectedSite || !selectedJob) {
        showToast('Please select a job first', 'error');
        return;
    }
    
    const jobs = getJobsForSite(selectedCustomer, selectedSite);
    const job = jobs.find(j => j.code === selectedJob);
    const towers = getTowersForJob(selectedCustomer, selectedSite, selectedJob);
    const days = 7;
    const rate = job?.rate || 50;
    
    // Build CSV content
    let csv = 'Tower ID,Configuration,Site,Days,Daily Rate,Line Total\n';
    let total = 0;
    
    towers.forEach(tower => {
        const towerId = tower.id || tower.tower_id;
        const config = (tower.config || 'Standard').replace(/,/g, ' ');
        const site = (tower.site || '').replace(/,/g, ' ');
        const towerRate = tower.rateDaily || tower.daily_rate || rate;
        const lineTotal = towerRate * days;
        total += lineTotal;
        
        csv += `${towerId},${config},${site},${days},${towerRate.toFixed(2)},${lineTotal.toFixed(2)}\n`;
    });
    
    csv += `\nTotal,,,${towers.length * days},,${total.toFixed(2)}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${selectedCustomer}_${selectedJob}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('CSV exported successfully');
}

function previewPDF() {
    if (!selectedCustomer || !selectedSite || !selectedJob) {
        showToast('Please select a job first', 'error');
        return;
    }
    
    const jobs = getJobsForSite(selectedCustomer, selectedSite);
    const job = jobs.find(j => j.code === selectedJob);
    const towers = getTowersForJob(selectedCustomer, selectedSite, selectedJob);
    const days = 7;
    const rate = job?.rate || 50;
    
    // Calculate totals
    let total = 0;
    towers.forEach(tower => {
        const towerRate = tower.rateDaily || tower.daily_rate || rate;
        total += towerRate * days;
    });
    
    // Build printable HTML
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${selectedCustomer} - ${selectedJob}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
                .logo { font-size: 32px; font-weight: bold; color: #f97316; }
                .logo-sub { font-size: 12px; color: #666; }
                .invoice-title { text-align: right; }
                .invoice-title h1 { font-size: 24px; color: #333; }
                .invoice-title p { color: #666; font-size: 14px; }
                .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .details-box { background: #f5f5f5; padding: 16px; border-radius: 8px; min-width: 200px; }
                .details-box h3 { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
                .details-box p { font-size: 14px; margin: 4px 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background: #f5f5f5; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
                td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
                .tower-id { color: #f97316; font-weight: 600; }
                .money { text-align: right; }
                .total-row { background: #f5f5f5; font-weight: bold; }
                .total-row td { border-top: 2px solid #ddd; font-size: 14px; }
                .summary { display: flex; justify-content: flex-end; }
                .summary-box { background: #1a1a1a; color: white; padding: 20px 30px; border-radius: 8px; text-align: right; }
                .summary-box .label { font-size: 11px; color: #aaa; text-transform: uppercase; }
                .summary-box .value { font-size: 28px; font-weight: bold; color: #22c55e; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo">MLT</div>
                    <div class="logo-sub">Mickala Lighting Towers</div>
                </div>
                <div class="invoice-title">
                    <h1>INVOICE</h1>
                    <p>Date: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            
            <div class="details">
                <div class="details-box">
                    <h3>Customer</h3>
                    <p><strong>${selectedCustomer}</strong></p>
                    <p>${selectedSite}</p>
                </div>
                <div class="details-box">
                    <h3>Job Details</h3>
                    <p><strong>Job: ${selectedJob}</strong></p>
                    <p>PO: ${job?.poNumber || selectedJob}</p>
                    <p>${job?.description || 'Tower Hire'}</p>
                </div>
                <div class="details-box">
                    <h3>Billing Period</h3>
                    <p>7 Days</p>
                    <p>${towers.length} Towers</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Tower ID</th>
                        <th>Configuration</th>
                        <th>Site</th>
                        <th>Days</th>
                        <th class="money">Daily Rate</th>
                        <th class="money">Line Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${towers.map(tower => {
                        const towerId = tower.id || tower.tower_id;
                        const config = tower.config || 'Standard';
                        const towerRate = tower.rateDaily || tower.daily_rate || rate;
                        const lineTotal = towerRate * days;
                        return `
                            <tr>
                                <td class="tower-id">${towerId}</td>
                                <td>${config}</td>
                                <td>${tower.site}</td>
                                <td>${days}</td>
                                <td class="money">$${towerRate.toFixed(2)}</td>
                                <td class="money">$${lineTotal.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td colspan="5">Total (${towers.length} towers × ${days} days)</td>
                        <td class="money">$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-box">
                    <div class="label">Total Amount Due</div>
                    <div class="value">$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
            </div>
            
            <div class="footer">
                <p>Mickala Lighting Towers Pty Ltd | ABN: 60 828 345 | Generated: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    // Open in new window for print/PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Trigger print dialog after content loads
    printWindow.onload = () => {
        printWindow.print();
    };
    
    showToast('PDF preview opened - use Print to save as PDF');
}

function emailClient() {
    if (!selectedCustomer || !selectedSite || !selectedJob) {
        showToast('Please select a job first', 'error');
        return;
    }
    
    const jobs = getJobsForSite(selectedCustomer, selectedSite);
    const job = jobs.find(j => j.code === selectedJob);
    const towers = getTowersForJob(selectedCustomer, selectedSite, selectedJob);
    const days = 7;
    const rate = job?.rate || 50;
    
    let total = 0;
    towers.forEach(tower => {
        const towerRate = tower.rateDaily || tower.daily_rate || rate;
        total += towerRate * days;
    });
    
    const subject = encodeURIComponent(`Invoice - ${selectedCustomer} - ${selectedJob} - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(`Dear Customer,

Please find attached your weekly invoice for tower hire services.

Customer: ${selectedCustomer}
Site: ${selectedSite}
Job: ${selectedJob}
PO: ${job?.poNumber || selectedJob}

Towers on Hire: ${towers.length}
Billing Period: 7 days
Total Amount: $${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}

Please export the CSV or PDF invoice from the Asset Tracker and attach to this email.

Regards,
Mickala Lighting Towers`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    showToast('Email client opened');
}

function approveInvoice() {
            if (!selectedCustomer || !selectedSite || !selectedJob) {
                showToast('Please select a job first', 'error');
                return;
            }
    
            const jobs = getJobsForSite(selectedCustomer, selectedSite);
            const job = jobs.find(j => j.code === selectedJob);
            const towers = getTowersForJob(selectedCustomer, selectedSite, selectedJob);
            const days = 7;
            const rate = job?.rate || 50;
    
            let total = 0;
            const lineItems = [];
            towers.forEach(tower => {
                const towerRate = tower.rateDaily || tower.daily_rate || rate;
                const lineTotal = towerRate * days;
                total += lineTotal;
                lineItems.push({
                    tower_id: tower.id || tower.tower_id,
                    config: tower.config || 'Standard',
                    days: days,
                    daily_rate: towerRate,
                    line_total: lineTotal
                });
            });
    
            // Generate invoice number
            const invoiceNum = `INV-${selectedJob}-${Date.now().toString(36).toUpperCase()}`;
    
            // Save to Supabase (async) and localStorage (sync fallback)
            saveInvoiceToSupabase(invoiceNum, selectedJob, selectedCustomer, selectedSite, total, towers.length, lineItems);
    
            // Also save to localStorage as fallback
            const approvedInvoices = JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
            approvedInvoices.unshift({
                invoiceNumber: invoiceNum,
                customer: selectedCustomer,
                site: selectedSite,
                jobCode: selectedJob,
                poNumber: job?.poNumber || selectedJob,
                description: job?.description || 'Tower Hire',
                towerCount: towers.length,
                days: days,
                total: total,
                approvedBy: currentUser.name,
                approvedAt: new Date().toISOString()
            });
            localStorage.setItem('mlt_approved_invoices', JSON.stringify(approvedInvoices));
    
            // Add audit entry
            addAuditEntry('INVOICE_APPROVED', `${invoiceNum}: ${selectedCustomer} - ${selectedJob} - $${total.toLocaleString()}`);
    
            // Show confirmation and offer PDF
            if (confirm(`Invoice Approved!\n\nInvoice #: ${invoiceNum}\nCustomer: ${selectedCustomer}\nJob: ${selectedJob}\nTotal: $${total.toLocaleString()}\n\nWould you like to generate the PDF now?`)) {
                previewPDF();
            }
    
            showToast(`Invoice ${invoiceNum} approved`);
        }

        // Save invoice to Supabase
        async function saveInvoiceToSupabase(invoiceNumber, jobCode, customer, site, total, towerCount, lineItems) {
            if (!supabase) {
                console.warn('Supabase not available - invoice saved locally only');
                return;
            }
    
            try {
                // Insert main invoice record
                const { data: invoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_number: invoiceNumber,
                        job_code: jobCode,
                        customer: customer,
                        site: site,
                        total_amount: total,
                        tower_count: towerCount,
                        approved_by: currentUser.name
                    })
                    .select()
                    .single();
        
                if (invoiceError) {
                    console.error('Invoice save error:', invoiceError);
                    return;
                }
        
                // Insert line items
                const itemsWithInvoiceId = lineItems.map(item => ({
                    ...item,
                    invoice_id: invoice.id
                }));
        
                const { error: itemsError } = await supabase
                    .from('invoice_line_items')
                    .insert(itemsWithInvoiceId);
        
                if (itemsError) {
                    console.error('Line items save error:', itemsError);
                }
        
                console.log('Invoice saved to Supabase:', invoiceNumber);
            } catch (err) {
                console.error('Supabase error:', err);
            }
        }

        // Load invoice history from Supabase
        async function loadInvoiceHistory() {
            if (!supabase) {
                return JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
            }
    
            try {
                const { data, error } = await supabase
                    .from('invoices')
                    .select('*')
                    .order('approved_at', { ascending: false })
                    .limit(100);
        
                if (error) {
                    console.error('Load history error:', error);
                    return JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
                }
        
                return data || [];
            } catch (err) {
                console.error('Supabase error:', err);
                return JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
            }
        }

// Invoice history data cache
let invoiceHistoryCache = [];

// Render invoice history
async function renderHistory() {
    const table = document.getElementById('historyTable');
    const loading = document.getElementById('historyLoading');
    const empty = document.getElementById('historyEmpty');
    
    loading.style.display = 'block';
    table.innerHTML = '';
    empty.style.display = 'none';
    
    try {
        invoiceHistoryCache = await loadInvoiceHistory();
        loading.style.display = 'none';
        
        if (invoiceHistoryCache.length === 0) {
            empty.style.display = 'block';
            return;
        }
        
        displayHistoryRows(invoiceHistoryCache);
    } catch (err) {
        console.error('Error loading history:', err);
        loading.textContent = 'Error loading history. Using local data...';
        invoiceHistoryCache = JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
        setTimeout(() => {
            loading.style.display = 'none';
            if (invoiceHistoryCache.length === 0) {
                empty.style.display = 'block';
            } else {
                displayHistoryRows(invoiceHistoryCache);
            }
        }, 1000);
    }
}

function displayHistoryRows(invoices) {
    const table = document.getElementById('historyTable');
    table.innerHTML = invoices.map(inv => {
        // Handle both Supabase format and localStorage format
        const invoiceNum = inv.invoice_number || inv.invoiceNumber;
        const customer = inv.customer;
        const site = inv.site;
        const jobCode = inv.job_code || inv.jobCode;
        const towerCount = inv.tower_count || inv.towerCount || '-';
        const total = inv.total_amount || inv.total || 0;
        const approvedBy = inv.approved_by || inv.approvedBy;
        const approvedAt = inv.approved_at || inv.approvedAt;
        const dateStr = approvedAt ? new Date(approvedAt).toLocaleDateString('en-AU', { 
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        }) : '-';
        
        return `<tr>
            <td><code style="background:var(--bg-tertiary);padding:4px 8px;border-radius:4px;font-size:12px;">${invoiceNum}</code></td>
            <td>${customer}</td>
            <td>${site}</td>
            <td>${jobCode}</td>
            <td style="text-align:center">${towerCount}</td>
            <td style="font-weight:600;color:var(--success)">$${Number(total).toLocaleString()}</td>
            <td>${approvedBy}</td>
            <td style="color:var(--text-secondary);font-size:13px">${dateStr}</td>
        </tr>`;
    }).join('');
}

function filterHistory() {
    const search = document.getElementById('historySearch').value.toLowerCase().trim();
    if (!search) {
        displayHistoryRows(invoiceHistoryCache);
        return;
    }
    
    const filtered = invoiceHistoryCache.filter(inv => {
        const invoiceNum = (inv.invoice_number || inv.invoiceNumber || '').toLowerCase();
        const customer = (inv.customer || '').toLowerCase();
        const jobCode = (inv.job_code || inv.jobCode || '').toLowerCase();
        const site = (inv.site || '').toLowerCase();
        return invoiceNum.includes(search) || customer.includes(search) || jobCode.includes(search) || site.includes(search);
    });
    
    displayHistoryRows(filtered);
    
    const empty = document.getElementById('historyEmpty');
    if (filtered.length === 0) {
        empty.textContent = 'No invoices match your search.';
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
    }
}

function refreshHistory() {
    document.getElementById('historySearch').value = '';
    renderHistory();
    showToast('History refreshed');
}

// =============================================
// AUDIT LOGS (Admin Tab)
// =============================================
let auditLogsCache = [];
let auditLogsOffset = 0;
const AUDIT_PAGE_SIZE = 50;

async function loadAuditLogs(append = false) {
    if (!append) {
        auditLogsOffset = 0;
        auditLogsCache = [];
    }
    
    const table = document.getElementById('auditLogsTable');
    if (!append) {
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">Loading audit logs...</td></tr>';
    }
    
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/audit_log?order=created_at.desc&limit=${AUDIT_PAGE_SIZE}&offset=${auditLogsOffset}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) throw new Error('Failed to fetch audit logs');
        
        const logs = await response.json();
        auditLogsCache = append ? [...auditLogsCache, ...logs] : logs;
        auditLogsOffset += logs.length;
        
        displayAuditLogs(auditLogsCache);
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.style.display = logs.length === AUDIT_PAGE_SIZE ? 'block' : 'none';
        
    } catch (err) {
        console.error('Error loading audit logs:', err);
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--danger);">Error loading audit logs. Check Supabase connection.</td></tr>';
    }
}

function displayAuditLogs(logs) {
    const table = document.getElementById('auditLogsTable');
    const countEl = document.getElementById('auditLogCount');
    
    if (logs.length === 0) {
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">No audit logs found.</td></tr>';
        countEl.textContent = '0 entries';
        return;
    }
    
    table.innerHTML = logs.map(log => {
        const timestamp = new Date(log.created_at).toLocaleString('en-AU', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        // Format action with color coding
        let actionBadge = '';
        switch(log.action) {
            case 'LOGIN':
                actionBadge = '<span style="background:#22c55e22;color:#22c55e;padding:4px 8px;border-radius:4px;font-size:12px;">LOGIN</span>';
                break;
            case 'LOGOUT':
                actionBadge = '<span style="background:#3b82f622;color:#3b82f6;padding:4px 8px;border-radius:4px;font-size:12px;">LOGOUT</span>';
                break;
            case 'SESSION_RESUME':
                actionBadge = '<span style="background:#8b5cf622;color:#8b5cf6;padding:4px 8px;border-radius:4px;font-size:12px;">SESSION RESUME</span>';
                break;
            case 'VIEW_CHANGE':
                actionBadge = '<span style="background:#6b728022;color:#9ca3af;padding:4px 8px;border-radius:4px;font-size:12px;">VIEW CHANGE</span>';
                break;
            case 'INVOICE_APPROVED':
                actionBadge = '<span style="background:#f9731622;color:#f97316;padding:4px 8px;border-radius:4px;font-size:12px;">INVOICE APPROVED</span>';
                break;
            case 'LOGIN_FAILED':
                actionBadge = '<span style="background:#ef444422;color:#ef4444;padding:4px 8px;border-radius:4px;font-size:12px;">LOGIN FAILED</span>';
                break;
            default:
                actionBadge = `<span style="background:#6b728022;color:#9ca3af;padding:4px 8px;border-radius:4px;font-size:12px;">${log.action}</span>`;
        }
        
        // Format details
        let details = '';
        if (log.details) {
            if (log.details.view) {
                details = `Switched to <strong>${log.details.view}</strong>`;
            } else if (log.details.invoice_number) {
                details = `Invoice: <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;">${log.details.invoice_number}</code> | $${Number(log.details.total_amount || 0).toLocaleString()} | ${log.details.tower_count || 0} towers`;
            } else if (log.details.method) {
                details = `Method: ${log.details.method}`;
            } else if (log.details.attempted_code) {
                details = `Attempted code: <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;">${log.details.attempted_code}</code>`;
            } else {
                details = JSON.stringify(log.details);
            }
        }
        
        return `<tr>
            <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">${timestamp}</td>
            <td style="font-weight:600;color:var(--accent);">${log.user_name || '-'}</td>
            <td>${actionBadge}</td>
            <td style="font-size:13px;">${details}</td>
        </tr>`;
    }).join('');
    
    countEl.textContent = `${logs.length} entries`;
}

function filterAuditLogs() {
    const search = document.getElementById('auditSearch').value.toLowerCase().trim();
    const actionFilter = document.getElementById('auditActionFilter').value;
    
    let filtered = auditLogsCache;
    
    if (actionFilter) {
        filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    if (search) {
        filtered = filtered.filter(log => {
            const userName = (log.user_name || '').toLowerCase();
            const userCode = (log.user_code || '').toLowerCase();
            const action = (log.action || '').toLowerCase();
            const details = JSON.stringify(log.details || {}).toLowerCase();
            return userName.includes(search) || userCode.includes(search) || action.includes(search) || details.includes(search);
        });
    }
    
    displayAuditLogs(filtered);
}

function refreshAuditLogs() {
    document.getElementById('auditSearch').value = '';
    document.getElementById('auditActionFilter').value = '';
    loadAuditLogs();
    showToast('Audit logs refreshed');
}

function loadMoreAuditLogs() {
    loadAuditLogs(true);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast active' + (type === 'error' ? ' error' : '');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    if (checkSession()) {
        showApp();
    }
});

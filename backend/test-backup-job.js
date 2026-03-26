require('dotenv').config();
const dockerBackupService = require('./src/services/docker-backup.service');

async function testBackup() {
    const jobName = process.argv[2] || 'onlitec-email';
    console.log(`🧪 Testing backup job: ${jobName}`);
    
    try {
        const result = await dockerBackupService.runBackup(jobName);
        console.log('✅ Backup result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Backup test failed:', error.message);
    } finally {
        process.exit();
    }
}

testBackup();

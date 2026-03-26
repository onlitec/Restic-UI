require('dotenv').config();
const db = require('./src/config/database');
const dockerBackupService = require('./src/services/docker-backup.service');

async function backupAll() {
    console.log('🚀 Iniciando backup sequencial de todas as aplicações...');
    
    try {
        const result = await db.query('SELECT name FROM backup_jobs WHERE enabled = true');
        const jobs = result.rows;
        
        console.log(`📦 Encontrados ${jobs.length} jobs habilitados.`);
        
        for (const job of jobs) {
            console.log(`\n▶️ Processando: ${job.name}...`);
            try {
                const start = Date.now();
                const res = await dockerBackupService.runBackup(job.name);
                const duration = ((Date.now() - start) / 1000 / 60).toFixed(2);
                console.log(`✅ ${job.name} concluído com sucesso em ${duration} minutos.`);
            } catch (error) {
                console.error(`❌ Erro ao processar ${job.name}:`, error.message);
                // Continua para o próximo job mesmo se um falhar
            }
        }
        
        console.log('\n🏁 Todos os processos de backup foram finalizados.');
    } catch (error) {
        console.error('❌ Erro fatal no script de backup geral:', error.message);
    } finally {
        process.exit();
    }
}

backupAll();

require('dotenv').config();
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function test() {
    console.log('Testing Docker connection and restic container creation...');
    try {
        const info = await docker.info();
        console.log('Docker info obtained:', info.Name, info.ServerVersion);
        
        const images = await docker.listImages();
        const resticImage = images.find(img => img.RepoTags && img.RepoTags.includes('restic/restic:latest'));
        console.log('Restic image found in list:', resticImage ? 'YES' : 'NO');

        console.log('Attempting to create a test restic container...');
        const container = await docker.createContainer({
            Image: 'restic/restic:latest',
            Entrypoint: ['/bin/sh'],
            Cmd: ['-c', 'restic version'],
            name: `test-restic-${Date.now()}`,
            HostConfig: {
                AutoRemove: true
            }
        });

        console.log('Container created successfully!');
        await container.start();
        console.log('Container started successfully!');
        
        const logs = await container.logs({ stdout: true, stderr: true });
        console.log('Logs:', logs.toString());

    } catch (error) {
        console.error('❌ Docker test failed:', error);
    } finally {
        process.exit();
    }
}

test();

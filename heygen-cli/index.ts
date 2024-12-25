import { ChildProcess, spawn } from 'child_process';
import { exit } from 'process';
import kill from 'tree-kill';

// Globally define EventSource
import {EventSource} from 'eventsource';
global.EventSource = EventSource;

import { HeyGenAPI, HeyGenStatusListenerMode } from 'heygen-lib';

const START_HOOK = 'Nest application successfully started';
const BASE_URL = 'http://localhost:3000'

const shutdown = (server: ChildProcess | undefined) => {
    console.log(`[heygen-cli] TEST SHUTDOWN, SERVER PID : ${server?.pid}`);

    setTimeout(() => {
        if (server) kill(server.pid!, 'SIGKILL');
        setTimeout(() => exit(0), 1000);
    }, 1000);
}

const run_test = async (server: ChildProcess) => {
    try {
        const heygen = new HeyGenAPI({
            url: BASE_URL,
            logging: true,
            mode: HeyGenStatusListenerMode.AUTO
        });
    
        const job1 = await heygen.create();
    
        await heygen.waitForJob(job1);
        
        heygen.dispose();
    } catch (error) {
        console.error(error);
    } finally {
        shutdown(server);
    }
}

const server = spawn('node', ['../heygen-api/dist/main.js']);

server.stdout.on('data', data => {
    const log: string = data.toString();

    console.log(`[heygen-api] ${log}`);

    if (log.includes(START_HOOK)) {
        run_test(server);
    }
});

process.on('uncaughtException', function(err) {
    shutdown(server);
});
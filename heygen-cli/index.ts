import { ChildProcess, spawn } from 'child_process';
import { exit } from 'process';
import kill from 'tree-kill';

// Globally define EventSource
import {EventSource} from 'eventsource';
global.EventSource = EventSource;

import { HeyGenAPI, HeyGenStatusListenerMode } from 'heygen-lib';

const START_HOOK = 'Nest application successfully started';
const BASE_URL = 'http://localhost:3000'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const shutdown = (server: ChildProcess | undefined) => {
    console.log(`\x1b[33m[heygen-cli]\x1b[0m[${new Date(Date.now()).toLocaleString()}] TEST SHUTDOWN, SERVER PID : ${server?.pid}`);

    setTimeout(() => {
        if (server) kill(server.pid!, 'SIGKILL');
        setTimeout(() => exit(0), 1000);
    }, 1000);
}

const run_test = async (server: ChildProcess) => {
    console.log(`\x1b[33m[heygen-cli]\x1b[0m[${new Date(Date.now()).toLocaleString()}] TEST START, SERVER PID : ${server?.pid}`);

    try {
        const heygen = new HeyGenAPI({
            url: BASE_URL,
            logging: true,
            mode: HeyGenStatusListenerMode.AUTO
        });

        const jobs: Promise<void>[] = [];
    
        //JOB 1
        const job1 = await heygen.create();
        jobs.push(heygen.waitForJob(job1));

        await sleep(2000);

        // JOB 2
        const job2 = await heygen.create();
        jobs.push(heygen.waitForJob(job2));

        await sleep(2000);

        // JOB 3
        const job3 = await heygen.create();

        // Simulate fallback
        heygen.changeBackend(HeyGenStatusListenerMode.POLL);

        jobs.push(heygen.waitForJob(job3));

        await sleep(1000);

        // JOB 4
        const job4 = await heygen.create();
        jobs.push(heygen.waitForJob(job4));

        await sleep(1000);

        // JOB 5
        const job5 = await heygen.create();
        jobs.push(heygen.waitForJob(job5));

        await Promise.all(jobs);
        
        heygen.dispose();
    } catch (error) {
        console.error(error);
    } finally {
        shutdown(server);
    }
}

const main = () => {
    process.env.JOB_TIME = process.env.JOB_TIME ?? '3000';

    const server = spawn('node', ['../heygen-api/dist/main.js']);

    server.stdout.on('data', data => {
        const log: string = data.toString().trim();

        console.log(`\x1b[32m[heygen-api]\x1b[0m${log}`);

        if (log.includes(START_HOOK)) {
            run_test(server);
        }
    });

    process.on('uncaughtException', function(err) {
        console.error(err);
        shutdown(server);
    });
}

main();
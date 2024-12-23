import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { delay, map, Observable, Subject } from "rxjs";

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    private jobs: Map<number, number> = new Map();

    private idCount = 0;

    private sseStream = new Subject<number>();

    public get SseStream(): Observable<{id: number, message: string}> {
        return this.sseStream.asObservable().pipe(
            delay(this.getJobTime()),
            map(x => ({id: x, message: 'completed'})) // if the job failed pass a different message
        );
    }

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.logger.log(`Configured Job Time : ${this.getJobTime()}`)
    }

    private getJobTime(): number {
        return this.configService.get('JOB_TIME') ?? 2000;
    }

    public getStatus(id: number): {code: number, message: string} {
        if (!this.jobs.has(id)) {
            return {code: 404, message: 'error'};
        }

        if (Date.now() - this.jobs.get[id] >= this.getJobTime()) {
            return {code: 200, message: 'completed'};
        } else {
            return {code: 200, message: 'pending'}
        }
    }

    public createJob(): number {
        let id = this.idCount;

        this.idCount++;

        this.jobs.set(id, Date.now());

        this.sseStream.next(id);

        return id;
    }
}
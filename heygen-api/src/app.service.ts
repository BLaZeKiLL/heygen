import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { delay, filter, map, Observable, Subject } from "rxjs";

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    private jobs: Map<number, [number, string]> = new Map();

    private idCount = 0;

    private sseStream = new Subject<[number, string]>();

    public SseStream(uuid: string): Observable<{id: number, message: string}> {
        return this.sseStream.asObservable().pipe(
            delay(this.getJobTime()),
            filter(x => x[1] === uuid),
            map(x => ({id: x[0], message: 'completed'})) // if the job failed pass a different message
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

    public getStatus(id: number, uuid: string): {code: number, message: string} {
        if (!this.jobs.has(id)) {
            return {code: 404, message: 'error'};
        }

        if (this.jobs.get(id)[1] !== uuid) {
            return {code: 401, message: 'unauthorized'};
        }

        if (Date.now() - this.jobs.get[id][0] >= this.getJobTime()) {
            return {code: 200, message: 'completed'};
        } else {
            return {code: 200, message: 'pending'}
        }
    }

    public createJob(uuid: string): number {
        let id = this.idCount;

        this.idCount++;

        this.jobs.set(id, [Date.now(), uuid]);

        this.sseStream.next([id, uuid]);

        return id;
    }
}
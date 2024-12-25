import { Controller, Get, Param, Post, Query, Res, Sse } from '@nestjs/common';
import { Response } from 'express';

import { AppService } from './app.service';
import { map, Observable, tap } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/create')
  createJob(@Query('uuid') uuid: string): number {
    return this.appService.createJob(uuid);
  }

  @Get('/status/:id')
  getStatus(@Param('id') id: string, @Query('uuid') uuid: string, @Res({ passthrough: true }) res: Response): string {
    let status = this.appService.getStatus(Number(id), uuid);
    res.status(status.code);
    return status.message;
  }

  @Sse('/status')
  sseStatus(@Query('uuid') uuid: string): Observable<MessageEvent> {
    return this.appService.SseStream(uuid).pipe(map(data =>({
      type: `status_${data.id}`,
      data: data
    } as MessageEvent)));
  }
}

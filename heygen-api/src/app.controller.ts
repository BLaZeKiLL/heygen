import { Controller, Get, Param, Post, Res, Sse } from '@nestjs/common';
import { Response } from 'express';

import { AppService } from './app.service';
import { map, Observable } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/create')
  createJob(): number {
    return this.appService.createJob();
  }

  @Get('/status/:id')
  getStatus(@Param('id') id: number, @Res({ passthrough: true }) res: Response): string {
    let status = this.appService.getStatus(id);
    res.status(status.code);
    return status.message;
  }

  @Sse('/status')
  sseStatus(): Observable<MessageEvent> {
    return this.appService.SseStream.pipe(map(data =>({
      type: 'status',
      data: data
    } as MessageEvent)));
  }
}

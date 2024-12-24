import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Response } from 'express';

import { AppController } from './app.controller';
import { AppService } from './app.service';

const MOCK_RESPONSE = {status: (_) => {}} as Response;
const MOCK_UUID = '1234-1234-1234-1234';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('App', () => {
    it('should return pending', () => {
      expect(appController.createJob(MOCK_UUID)).toBe(0);
      expect(appController.getStatus(0, MOCK_UUID, MOCK_RESPONSE)).toBe('pending');
    });

    it('should return error', () => {
      expect(appController.getStatus(100, MOCK_UUID, MOCK_RESPONSE)).toBe('error');
    });
  });
});

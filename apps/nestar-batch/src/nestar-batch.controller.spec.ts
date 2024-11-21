import { Test, TestingModule } from '@nestjs/testing';
import { NestarBatchController } from './nestar-batch.controller';
import { NestarBatchService } from './nestar-batch.service';

describe('NestarBatchController', () => {
  let nestarBatchController: NestarBatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NestarBatchController],
      providers: [NestarBatchService],
    }).compile();

    nestarBatchController = app.get<NestarBatchController>(NestarBatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(nestarBatchController.getHello()).toBe('Hello World!');
    });
  });
});

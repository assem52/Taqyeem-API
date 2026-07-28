import { validate } from 'class-validator';
import { AdminFollowUpController } from './admin-follow-up.controller';
import { FollowUpListQueryDto } from './dto/follow-up-list.dto';

describe('AdminFollowUpController', () => {
  it('forwards the optional quizId filter to the service', async () => {
    const response = {
      generatedAt: '2026-07-27T10:00:00.000Z',
      summary: { total: 0, byReason: {} },
      groups: [],
    };
    const service = {
      getFollowUpList: jest.fn().mockResolvedValue(response),
    };
    const controller = new AdminFollowUpController(service as never);
    const quizId = '66666666-6666-6666-6666-666666666666';

    await expect(
      controller.getFollowUpList({ quizId }),
    ).resolves.toBe(response);
    expect(service.getFollowUpList).toHaveBeenCalledWith(quizId);
  });

  it('requests all follow-ups when quizId is omitted', async () => {
    const service = {
      getFollowUpList: jest.fn().mockResolvedValue({
        generatedAt: '2026-07-27T10:00:00.000Z',
        summary: { total: 0, byReason: {} },
        groups: [],
      }),
    };
    const controller = new AdminFollowUpController(service as never);

    await controller.getFollowUpList({});

    expect(service.getFollowUpList).toHaveBeenCalledWith(undefined);
  });

  it('accepts project seed UUIDs and rejects malformed quiz IDs', async () => {
    const validQuery = Object.assign(new FollowUpListQueryDto(), {
      quizId: '66666666-6666-6666-6666-666666666666',
    });
    const invalidQuery = Object.assign(new FollowUpListQueryDto(), {
      quizId: 'not-a-uuid',
    });

    await expect(validate(validQuery)).resolves.toHaveLength(0);
    await expect(validate(invalidQuery)).resolves.not.toHaveLength(0);
  });
});

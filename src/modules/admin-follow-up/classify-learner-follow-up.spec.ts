import { AttemptStatus } from '@prisma/client';
import { classifyLearnerFollowUp } from './classify-learner-follow-up';
import { FollowUpReason } from './classify-learner-follow-up.types';
import { describe, it, expect } from '@jest/globals';

const quizWithPass70 = { passScore: 70 };
const quizNoPass = { passScore: null };

describe('classifyLearnerFollowUp', () => {
  describe('FLAGGED_FOR_REVIEW', () => {
    it('returns flagged when integrity flag is active, even with no attempt', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: null,
          quiz: quizWithPass70,
          integrityFlag: { isActive: true },
        }),
      ).toBe(FollowUpReason.FLAGGED_FOR_REVIEW);
    });

    it('returns flagged over failed when both apply', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: {
            status: AttemptStatus.SUBMITTED,
            score: 30,
          },
          quiz: quizWithPass70,
          integrityFlag: { isActive: true, reviewNote: 'Tab switches' },
        }),
      ).toBe(FollowUpReason.FLAGGED_FOR_REVIEW);
    });

    it('returns flagged over in-progress', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.IN_PROGRESS, score: null },
          quiz: quizWithPass70,
          integrityFlag: { isActive: true },
        }),
      ).toBe(FollowUpReason.FLAGGED_FOR_REVIEW);
    });
  });

  describe('STARTED_NOT_SUBMITTED', () => {
    it('returns started not submitted for IN_PROGRESS attempt', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.IN_PROGRESS, score: null },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.STARTED_NOT_SUBMITTED);
    });

    it('returns started not submitted even when score is set on in-progress', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.IN_PROGRESS, score: 0 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.STARTED_NOT_SUBMITTED);
    });
  });

  describe('DID_NOT_START', () => {
    it('returns did not start when no attempt exists', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: null,
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.DID_NOT_START);
    });
  });

  describe('FAILED', () => {
    it('returns failed when submitted score is below passScore', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 40 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.FAILED);
    });

    it('returns failed for AUTO_SUBMITTED below passScore', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.AUTO_SUBMITTED, score: 55 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.FAILED);
    });

    it('returns failed for submitted zero score (learner sat the quiz)', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 0 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.FAILED);
    });

    it('does not return failed when passScore is null', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 30 },
          quiz: quizNoPass,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.LOW_SCORE);
    });
  });

  describe('LOW_SCORE', () => {
    it('returns low score when passed passScore but below coaching threshold', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 55 },
          quiz: { passScore: 50 },
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.LOW_SCORE);
    });

    it('returns low score when no passScore and score below 60', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 45 },
          quiz: quizNoPass,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.LOW_SCORE);
    });
  });

  describe('excluded (null)', () => {
    it('returns null for high passing score', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 85 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBeNull();
    });

    it('returns null when terminal attempt has no score yet', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: null },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBeNull();
    });

    it('returns null when integrity flag is inactive', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 30 },
          quiz: quizWithPass70,
          integrityFlag: { isActive: false },
        }),
      ).toBe(FollowUpReason.FAILED);
    });
  });

  describe('did not start vs zero score (success standard)', () => {
    it('never classifies no attempt as failed or low score', () => {
      const result = classifyLearnerFollowUp({
        attempt: null,
        quiz: quizWithPass70,
        integrityFlag: null,
      });
      expect(result).toBe(FollowUpReason.DID_NOT_START);
      expect(result).not.toBe(FollowUpReason.FAILED);
      expect(result).not.toBe(FollowUpReason.LOW_SCORE);
    });

    it('classifies submitted zero separately from did not start', () => {
      expect(
        classifyLearnerFollowUp({
          attempt: null,
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.DID_NOT_START);

      expect(
        classifyLearnerFollowUp({
          attempt: { status: AttemptStatus.SUBMITTED, score: 0 },
          quiz: quizWithPass70,
          integrityFlag: null,
        }),
      ).toBe(FollowUpReason.FAILED);
    });
  });
});

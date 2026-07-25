import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface ScorePublishedPayload {
  attemptId: string;
  studentId: string;
  quizId: string;
  score: unknown;
}
@Injectable()
export class ScoreEventsService extends EventEmitter {
  publish(event: string, payload: ScorePublishedPayload) {
    this.emit(event, payload);
  }
}

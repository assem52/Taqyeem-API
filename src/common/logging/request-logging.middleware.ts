import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || randomUUID().slice(0, 8);
    const started = Date.now();
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const ms = Date.now() - started;
      this.logger.log(
        `${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      );
    });

    next();
  }
}

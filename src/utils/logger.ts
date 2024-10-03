import winston from 'winston';
import { join } from 'path';

const logDir = 'logs';
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: join(logDir, '/error.log'),
      level: 'error',
    }),
    new winston.transports.File({ filename: join(logDir, '/combined.log') }),
  ],
});

export { logger };

import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import billRouter from './routes/bill';
import paymentRouter from './routes/payment';
import userRouter from './routes/user';
import { connectDB } from './config/db';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { socketInit } from './services/sockets';
import swaggerUI from 'swagger-ui-express';
import ExpressMongoSanitize from 'express-mongo-sanitize';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  },
  cors: {
    origin: '*',
  },
});

// Middleware
app.use(
  helmet({
    xFrameOptions: { action: 'sameorigin' },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
//app.use('/api/mitadmitad-docs', swaggerUI.serve);
app.use(cors());
app.use(ExpressMongoSanitize());

// Connect to DB
connectDB();

// Routes
app.use('/api/bills', billRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/user', userRouter);
//app.get('/api/mitadmitad-docs', swaggerUI.setup());

// Set up Socket.IO
socketInit(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

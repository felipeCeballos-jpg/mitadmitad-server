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

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: '*',
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
//app.use('/api/mitadmitad-docs', swaggerUI.serve);
app.use(cors());
app.use(helmet());

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

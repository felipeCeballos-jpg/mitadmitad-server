import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { logger } from './utils/logger';
import billRouter from './routes/bill';
import paymentRouter from './routes/payment';
import { connectDB } from './config/db';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(
  cors({
    origin: '*',
  })
);
app.use(helmet());

// Connect to DB
connectDB();

// Routes
app.use('/api/bills', billRouter);
app.use('/api/payments', paymentRouter);

// Set up Socket.IO

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

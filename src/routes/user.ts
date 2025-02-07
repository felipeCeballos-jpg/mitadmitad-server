import express from 'express';
import { checkUserBill, createUser } from '../controllers/user';

const userRouter = express.Router();

userRouter.post('/', createUser);
userRouter.get('/:userID/bill/:billID', checkUserBill);

export default userRouter;

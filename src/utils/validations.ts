import { z } from 'zod';
import mongoose from 'mongoose';

const product = z.object({
  name: z.string({
    invalid_type_error: 'Product name must be a string',
    required_error: 'Product name is required',
  }),
  pricePerUnit: z.number({
    invalid_type_error: 'Product price must be a number and positive',
    required_error: 'Product price is required',
  }),
  /* pricePerUnit: z
    .number({
      invalid_type_error:
        'Product price per unit must be a number and positive',
      required_error: 'Product price per unit is required',
    })
    .int()
    .positive(),
  quantity: z
    .number({
      invalid_type_error: 'Product quantity must be a number and positive',
      required_error: 'Product quantity is required',
    })
    .int()
    .positive()
    .min(1), */
});

//export const createProducts = z.object(product);

export function validateProduct(schema: z.infer<typeof product> | null) {
  return product.safeParse(schema);
}

export const getProduct = z.string().refine((val) => {
  return mongoose.Types.ObjectId.isValid(val);
});

export function ValidateGetProduct(schema: z.infer<typeof getProduct> | null) {
  return getProduct.safeParse(schema);
}

export const createBill = z.object({
  restaurantID: z.string({
    invalid_type_error: 'Restaurant ID must be a string',
    required_error: 'Restaurant ID is required',
  }),
  tableNumber: z.number().int().positive(),
  products: z.array(
    z.object({
      productID: z
        .string({
          invalid_type_error:
            'The product id provided is invalid, please insert a valid product id',
          required_error: 'Product ID is required',
        })
        .refine((val) => {
          return mongoose.Types.ObjectId.isValid(val);
        }),
      quantity: z
        .number({
          invalid_type_error: 'Product quantity must be a number and positive',
          required_error: 'Product quantity is required',
        })
        .int()
        .positive()
        .min(1),
    })
  ),
});

type createBillType = z.infer<typeof createBill>;

const getBillByID = z.string().refine((val) => {
  return mongoose.Types.ObjectId.isValid(val);
});

export function validateCreateBill(schema: createBillType | null) {
  return createBill.safeParse(schema);
}

export function validateGetBillByID(
  schema: z.infer<typeof getBillByID> | null
) {
  return getBillByID.safeParse(schema);
}

const productPayment = z.object({
  productID: z
    .string({
      invalid_type_error:
        'The product id provided is invalid, please insert a valid product id',
      required_error: 'Product ID is required',
    })
    .refine((val) => {
      return mongoose.Types.ObjectId.isValid(val);
    }),
  quantity: z.number().int().positive().min(0),
  position: z.number().int().positive().min(0),
});

const createPayment = z.object({
  billID: z
    .string({
      invalid_type_error:
        'The bill id provided is invalid, please insert a valid bill id',
      required_error: 'Bill ID is required',
    })
    .refine((val) => {
      return mongoose.Types.ObjectId.isValid(val);
    }),
  userID: z.string({
    invalid_type_error:
      'The user id provided is invalid, please insert a valid user id',
    required_error: 'User ID is required',
  }),
  subtotal: z.number().positive(),
  tip: z.number().positive().min(0),
  total: z.number().positive(),
  paymentType: z.enum(['setAmount', 'splitBill', 'payForItems']),
  products: z.array(productPayment).optional(),
  splitInfo: z
    .object({
      totalPeople: z.number().int().positive().min(1),
      peoplePaying: z.number().int().positive().min(1),
    })
    .optional(),
});

export function validateCreatePayment(
  schema: z.infer<typeof getBillByID> | null
) {
  return createPayment.safeParse(schema);
}

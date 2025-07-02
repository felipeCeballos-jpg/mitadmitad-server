import { Request, Response } from 'express';
import { validateProduct, ValidateGetProduct } from '../utils/validations';
import Product from '../models/Product';

export async function createProduct(req: Request, res: Response) {
  try {
    const { name, pricePerUnit } = req.body;

    const validate = validateProduct(req.body);

    if (!validate.success) {
      console.log(validate.error.message);
      res.status(400).json({
        success: false,
        error: JSON.stringify(validate.error.message),
      });
      return;
    }

    const product = await Product.create({ name, pricePerUnit });

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    console.log(error);
    res.status(400).json({ success: false, error: 'Something went wrong' });
  }
}

export async function getProduct(req: Request, res: Response) {
  try {
    const validate = ValidateGetProduct(req.params.id);

    if (!validate.success) {
      res.status(400).json({
        error:
          'The product id provided is invalid, please insert a valid product id',
      });
    }

    const product = await Product.findById(req.params.id);

    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    console.log(error);
    res
      .status(400)
      .json({ success: false, error: 'Something went wrong, try later' });
  }
}

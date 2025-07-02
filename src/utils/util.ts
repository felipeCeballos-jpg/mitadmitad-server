import { Schema } from 'mongoose';
import Product from '../models/Product';

type ProductQuery = {
  productID: Schema.Types.ObjectId | string;
  quantity: number;
};

export type ProductDB = {
  productID: Schema.Types.ObjectId;
  name: string;
  pricePerUnit: number;
};

export async function getProducts(
  products: ProductQuery[]
): Promise<ProductDB[] | null> {
  try {
    const productsID = products.map(
      (product: ProductQuery) => product.productID
    );
    /*
      PRAY TO GOD 
      
      This function needs to a error handle when the id isn't on the db 
      at the moment we believe that each id passed on this function exist

    */
    const _productsdb = await Product.find({ _id: { $in: productsID } });

    if (!_productsdb) return null;

    // Still create hash map with string keys for O(1) lookup
    const productMap = new Map();
    _productsdb.forEach((product) => {
      productMap.set(product._id.toString(), product);
    });

    return products.flatMap((queryItem) => {
      const product = productMap.get(queryItem.productID.toString());

      return product
        ? Array(queryItem.quantity)
            .fill(null)
            .map(() => ({
              productID: product._id,
              name: product.name,
              pricePerUnit: product.pricePerUnit,
            }))
        : [];
    });
  } catch (error) {
    console.log('something went wrong on GetProdcuts');
    return null;
  }
}

export function getProductsTotal(
  productsQuery: ProductQuery[],
  productsDB: ProductDB[]
) {}

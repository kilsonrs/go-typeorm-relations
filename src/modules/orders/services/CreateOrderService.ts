import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const findStockProducts = await this.productsRepository.findAllById(
      products,
    );

    const orderProducts = products;

    const checkOrderProductExists =
      orderProducts.length === findStockProducts.length;

    if (!checkOrderProductExists) {
      throw new AppError('One of the products not found');
    }

    const productsToOrder = findStockProducts.map(stockProduct => {
      const orderProductIndex = orderProducts.findIndex(
        orderProduct => orderProduct.id === stockProduct.id,
      );

      const orderProductQuantity = orderProducts[orderProductIndex].quantity;

      if (orderProductQuantity > stockProduct.quantity) {
        throw new AppError('Insufficient quantity in stock');
      }

      return {
        product_id: stockProduct.id,
        price: stockProduct.price,
        quantity: orderProducts[orderProductIndex].quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });
    await this.productsRepository.updateQuantity(orderProducts);
    return order;
  }
}

export default CreateOrderService;

import { Response } from 'node-fetch';
import { DummyError, Product } from './types';

export const sortProductsAscending = (a: Product, b: Product) =>
  a.title.localeCompare(b.title);

export const isSuccessful = <T>(
  response: Response,
  data: T | DummyError,
): data is T => response.ok;

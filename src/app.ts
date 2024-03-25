import json from 'body-parser';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { shoppingCart } from './shoppingCart';
import { DummyError, DummyProduct, DummyUser, Product, User } from './types';
import { isSuccessful, sortProductsAscending } from './utils';

const app = express();

app.use(json());

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const response = await fetch('https://dummyjson.com/auth/me', {
    method: 'GET',
    headers: {
      Authorization: token,
    },
  });

  if (response.ok) {
    const decoded = jwt.decode(token.slice(7));

    req.body.user = decoded;

    next();
  } else {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://dummyjson.com/products');
    const data = (await response.json()) as { products: DummyProduct[] };

    if (response.ok) {
      data.products.sort(sortProductsAscending);
      data.products.map(({ id, title, description, price, thumbnail }) => ({
        description,
        id,
        price,
        thumbnail,
        title,
      }));

      res.send(data.products);
    } else {
      throw new Error(JSON.stringify(data));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/products', async (req: Request, res: Response) => {
  res.send();
});

app.post('/login', async (req: Request, res: Response) => {
  try {
    const response = await fetch('https://dummyjson.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = (await response.json()) as DummyUser | DummyError;

    if (isSuccessful(response, data)) {
      res.send({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        avatar: data.image,
        token: data.token,
      } as User);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    res.status(403).send({ error: (error as Error).message });
  }
});

app.post('/cart', verifyToken, async (req: Request, res: Response) => {
  const userId = req.body.user.id;
  const productId = req.body.productId;
  const userCart = shoppingCart.get(userId) ?? new Set();

  if (!productId || typeof productId !== 'number') {
    return res.status(400).json({ error: 'Invalid format' });
  }

  if (userCart?.has(productId)) {
    return res
      .status(400)
      .json({ error: 'Product already exists in the cart' });
  }

  userCart.add(productId);

  shoppingCart.set(userId, userCart);

  res.status(200).json({ message: 'Product added to cart successfully' });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).send();
});

export default app;

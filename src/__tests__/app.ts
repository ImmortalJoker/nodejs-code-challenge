import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import supertest from 'supertest';
import app from '../app';
import { shoppingCart } from '../shoppingCart';
import productsStub from '../__stubs__/products.stubs';

const request = supertest(app);

jest.mock('node-fetch', () => jest.fn());

console.log('testing');

describe('GET /', () => {
  it('should return "Hello, World!"', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, World!');
  });
});

describe('GET /products', () => {
  it('should fetch products from external API and return sorted products', async () => {
    const mockProducts = productsStub;

    //@ts-ignore
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: mockProducts }),
    });

    const response = await request.get('/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockProducts);
  });

  it('should handle errors from external API', async () => {
    const errorMessage = 'Failed to fetch products';

    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error(errorMessage),
    );

    const response = await request.get('/products');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: errorMessage });
  });
});

describe('POST /login', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should successfully login and return user data with token', async () => {
    const mockRequestBody = { username: 'testuser', password: 'testpassword' };
    const mockResponseData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'testuser',
      image: 'avatar.jpg',
      token: 'mock-token',
    };

    //@ts-ignore
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });

    const response = await request.post('/login').send(mockRequestBody);

    expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockRequestBody),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      firstName: mockResponseData.firstName,
      lastName: mockResponseData.lastName,
      username: mockResponseData.username,
      avatar: mockResponseData.image,
      token: mockResponseData.token,
    });
  });

  it('should handle login failure and return error message', async () => {
    const mockRequestBody = { username: 'testuser', password: 'testpassword' };
    const errorMessage = 'Invalid credentials';

    //@ts-ignore
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMessage }),
    });

    const response = await request.post('/login').send(mockRequestBody);

    expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockRequestBody),
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: errorMessage });
  });
});

describe('POST /cart', () => {
  beforeEach(() => {
    const mockResponseData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'testuser',
      image: 'avatar.jpg',
      token: 'mock-token',
    };
    const mockUser = { id: 1, username: 'testuser' };
    const mockDecodedToken = { user: mockUser };

    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    //@ts-ignore
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });
  });

  it('should add a product to the cart for a valid user', async () => {
    const mockProductId = 123;
    const mockRequestBody = { productId: mockProductId };

    const response = await request
      .post('/cart')
      .set('Authorization', `Bearer valid-token`)
      .send(mockRequestBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Product added to cart successfully',
    });
  });

  it('should handle invalid product ID format', async () => {
    const mockRequestBody = { productId: 'invalid-id' };

    const response = await request
      .post('/cart')
      .set('Authorization', `Bearer valid-token`)
      .send(mockRequestBody);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid format' });
  });

  it('should handle product already in the cart', async () => {
    const mockUserId = 15;
    const mockProductId = 123;

    const userCart = new Set<number>();
    userCart.add(mockProductId);
    shoppingCart.set(mockUserId, userCart);

    const mockRequestBody = { productId: mockProductId };

    const response = await request
      .post('/cart')
      .set('Authorization', `Bearer valid-token`)
      .send(mockRequestBody);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Product already exists in the cart',
    });
  });
});

const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

describe('Warehouse Inventory API Tests', () => {
  
    let testProductId;
  // Setup: Create a test product before tests
  beforeAll(async () => {
    try {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product ',
          description: 'Test Description',
          stock_quantity: 50,
          low_stock_threshold: 10
        });
      testProductId = response.body.id;
      
    } catch (error) {
      console.error('Setup failed:', error);
    }
  });


  // Cleanup: Delete test product after tests
  afterAll(async () => {
    try {
      await db.query('DELETE FROM products WHERE id = ?',
           [testProductId]);
      await db.end();
    } 
    catch (error) {
      console.error('Cleanup failed:', error);
    }
  });


  //========== STOCK INCREASE TESTS ===========================


  describe('Stock Addition Logic', () => {
    
    it('should successfully increase stock quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/increase`)
        .send({ quantity: 20 });

      expect(response.status).toBe(200);
      expect(response.body.stock_quantity).toBe(70); // 50 + 20
    });


    it('should reject negative quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/increase`)
        .send({ quantity: -10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be');
    });


    it('should reject zero quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/increase`)
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
    });


    it('should reject missing quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/increase`)
        .send({});

      expect(response.status).toBe(400);
    });


    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .post('/api/products/99999/increase')
        .send({ quantity: 10 });

      expect([404, 500]).toContain(response.status);

    });
  });


  //========== STOCK DECREASE TESTS ===========================


  describe('Stock Removal Logic', () => {
    
    it('should successfully decrease stock quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.stock_quantity).toBe(60); // 70 - 10
    });


    // EDGE CASE: Insufficient stock
    it('should reject when trying to remove more stock than available', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: 10000 });

      expect(response.status).toBe(400);
      expect(response.body.error.toLowerCase()).toContain('insufficient');
    });


    // EDGE CASE: Exact stock amount
    it('should allow decreasing to exactly zero stock', async () => {
      const getResponse = await request(app)
        .get(`/api/products/${testProductId}`);
      
      const currentStock = getResponse.body.stock_quantity;

      // Decrease by exact amount
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: currentStock });

      expect(response.status).toBe(200);
      expect(response.body.stock_quantity).toBe(0);
    });


    // EDGE CASE: Trying to decrease when stock is already zero
    it('should reject decrease when stock is already zero', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error.toLowerCase()).toContain('insufficient');

    });


    it('should reject negative quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: -5 });

      expect(response.status).toBe(400);
    });
  

    it('should reject zero quantity', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/decrease`)
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
    });


    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .post('/api/products/99999/decrease')
        .send({ quantity: 5 });

      expect([404, 500]).toContain(response.status);
    });
  });


  //=========== LOW STOCK & STOCK HISTORY TESTS =========
  
   describe('Low Stock Products', () => {
    
    it('should return products below threshold', async () => {
      const response = await request(app)
        .get('/api/products/low-stock');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });


  describe('Stock History', () => {
    
    it('should track all stock changes', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}/history`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });


});
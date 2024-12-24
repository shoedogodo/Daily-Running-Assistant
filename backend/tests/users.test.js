// tests/user.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { User } = require('../models/user.model');
const userRoutes = require('../routes/user.route');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User API Tests', () => {
  let authToken;

  // Test user registration
  describe('POST /api/users', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('newUser');
      expect(res.body.newUser.username).toBe('testuser');
    });

    it('should not register a user with existing username', async () => {
      // First create a user
      await User.create({
        username: 'existinguser',
        password: 'password'
      });

      // Try to create another user with same username
      const res = await request(app)
        .post('/api/users')
        .send({
          username: 'existinguser',
          password: 'newpassword'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Username already exists');
    });
  });

  // Test user login
  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      // Create a test user before each test
      await User.create({
        username: 'logintest',
        password: 'testpass'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          username: 'logintest',
          password: 'testpass'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          username: 'logintest',
          password: 'wrongpass'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Invalid password');
    });
  });

  // Test nickname operations
  describe('Nickname Operations', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          username: 'nicktest',
          password: 'testpass'
        });
      authToken = loginRes.body.token;
    });

    it('should update nickname successfully', async () => {
      const res = await request(app)
        .put('/api/users/update/nickname')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'nicktest',
          nickname: 'New Nickname'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.nickname).toBe('New Nickname');
    });

    it('should get nickname successfully', async () => {
      const res = await request(app)
        .get('/api/users/nickname/nicktest')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('nickname');
    });
  });

  // Test run record operations
  describe('Run Record Operations', () => {
    beforeEach(async () => {
      // Setup test user and auth token
      const user = await User.create({
        username: 'runtest',
        password: 'testpass'
      });
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          username: 'runtest',
          password: 'testpass'
        });
      authToken = loginRes.body.token;
    });

    it('should save a run record successfully', async () => {
      const runData = {
        username: 'runtest',
        runRecord: {
          distance: 5.0,
          duration: 1800,
          pace: '5:30',
          date: new Date()
        }
      };

      const res = await request(app)
        .post('/api/users/run/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('record');
      expect(res.body.record).toHaveProperty('runId');
    });

    it('should get all run records', async () => {
      const res = await request(app)
        .get('/api/users/run/records/runtest')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
      expect(Array.isArray(res.body.records)).toBe(true);
    });
  });

  // Test token validation
  describe('Token Validation', () => {
    it('should validate a valid token', async () => {
      const res = await request(app)
        .post('/api/users/tokenCheck')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Token is valid');
    });

    it('should reject an invalid token', async () => {
      const res = await request(app)
        .post('/api/users/tokenCheck')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Token is invalid or has expired');
    });
  });
});
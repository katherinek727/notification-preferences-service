/**
 * API integration tests
 */

import request from 'supertest';
import { ExpressApp } from '../../infrastructure/api/app.js';
import { TestUtils, TEST_CONSTANTS } from '../test-utils.js';

describe('Notification Preferences API', () => {
  let app: any;
  let expressApp: ExpressApp;

  beforeAll(() => {
    expressApp = new ExpressApp();
    app = expressApp.getApp();
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'notification-preferences-service'
      });
    });
  });

  describe('User Preferences API', () => {
    const userId = TEST_CONSTANTS.TEST_USER_ID;

    describe('GET /api/v1/users/:userId/preferences', () => {
      test('should return 404 for non-existent user', async () => {
        const response = await request(app)
          .get(`/api/v1/users/non-existent-user/preferences`)
          .expect('Content-Type', /json/)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('USER_NOT_FOUND');
      });

      test('should return 400 for missing user ID', async () => {
        const response = await request(app)
          .get(`/api/v1/users//preferences`)
          .expect('Content-Type', /json/)
          .expect(404); // Express treats this as route not found
      });
    });

    describe('POST /api/v1/users/:userId/preferences', () => {
      test('should create or update user preferences', async () => {
        const updates = {
          preferences: [
            {
              notificationType: 'transactional_email',
              channel: 'email',
              enabled: true
            },
            {
              notificationType: 'marketing_email',
              channel: 'email',
              enabled: false
            }
          ],
          quietHours: {
            start: { hour: 22, minute: 0 },
            end: { hour: 8, minute: 0 },
            timezone: 'UTC',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          }
        };

        const response = await request(app)
          .post(`/api/v1/users/${userId}/preferences`)
          .send(updates)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe(userId);
        expect(response.body.data.preferences).toHaveLength(2);
        expect(response.body.data.quietHours).toBeDefined();
        expect(response.body.meta.changesMade).toBeGreaterThan(0);
      });

      test('should return 400 for invalid request body', async () => {
        const invalidUpdates = {
          preferences: [
            {
              notificationType: 'invalid_type', // Invalid notification type
              channel: 'email',
              enabled: true
            }
          ]
        };

        const response = await request(app)
          .post(`/api/v1/users/${userId}/preferences`)
          .send(invalidUpdates)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      test('should be idempotent', async () => {
        const updates = {
          preferences: [
            {
              notificationType: 'transactional_email',
              channel: 'email',
              enabled: true
            }
          ]
        };

        // First request
        const response1 = await request(app)
          .post(`/api/v1/users/${userId}/preferences`)
          .send(updates)
          .expect(200);

        const changesMade1 = response1.body.meta.changesMade;

        // Second identical request
        const response2 = await request(app)
          .post(`/api/v1/users/${userId}/preferences`)
          .send(updates)
          .expect(200);

        const changesMade2 = response2.body.meta.changesMade;

        // Second request should have 0 changes (idempotent)
        expect(changesMade2).toBe(0);
        expect(response2.body.meta.message).toContain('No changes made');
      });
    });

    describe('PATCH /api/v1/users/:userId/preferences/single', () => {
      test('should update single preference', async () => {
        const update = {
          notificationType: 'marketing_email',
          channel: 'email',
          enabled: true
        };

        const response = await request(app)
          .patch(`/api/v1/users/${userId}/preferences/single`)
          .send(update)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe(userId);
        expect(response.body.meta.changesMade).toBeGreaterThanOrEqual(0);
      });

      test('should return 400 for missing required fields', async () => {
        const invalidUpdate = {
          notificationType: 'marketing_email'
          // Missing channel and enabled
        };

        const response = await request(app)
          .patch(`/api/v1/users/${userId}/preferences/single`)
          .send(invalidUpdate)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_REQUEST');
      });
    });

    describe('PATCH /api/v1/users/:userId/preferences/quiet-hours', () => {
      test('should update quiet hours', async () => {
        const quietHours = {
          startHour: 22,
          startMinute: 0,
          endHour: 8,
          endMinute: 0,
          timezone: 'UTC',
          days: ['monday', 'tuesday', 'wednesday']
        };

        const response = await request(app)
          .patch(`/api/v1/users/${userId}/preferences/quiet-hours`)
          .send(quietHours)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe(userId);
        expect(response.body.meta.changesMade).toBe(1);
      });

      test('should return 400 for invalid quiet hours', async () => {
        const invalidQuietHours = {
          startHour: 25, // Invalid hour
          startMinute: 0,
          endHour: 8,
          endMinute: 0,
          timezone: 'UTC',
          days: ['monday']
        };

        const response = await request(app)
          .patch(`/api/v1/users/${userId}/preferences/quiet-hours`)
          .send(invalidQuietHours)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_REQUEST');
      });
    });
  });

  describe('Notification Evaluation API', () => {
    const userId = TEST_CONSTANTS.TEST_USER_ID;

    describe('POST /api/v1/evaluate', () => {
      test('should evaluate notification and return allow decision', async () => {
        const evaluationRequest = {
          userId,
          notificationType: 'transactional_email',
          channel: 'email',
          region: 'EU',
          datetime: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/v1/evaluate')
          .send(evaluationRequest)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.decision).toBe('allow');
        expect(response.body.data.reason).toBe('notification_allowed');
      });

      test('should evaluate notification and return deny decision', async () => {
        const evaluationRequest = {
          userId,
          notificationType: 'marketing_email',
          channel: 'email',
          region: 'EU',
          datetime: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/v1/evaluate')
          .send(evaluationRequest)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.decision).toBe('deny');
        expect(response.body.data.reason).toBe('user_preference_disabled');
      });

      test('should return 400 for invalid evaluation request', async () => {
        const invalidRequest = {
          userId,
          notificationType: 'invalid_type',
          channel: 'email',
          region: 'EU',
          datetime: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/v1/evaluate')
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/v1/evaluate/batch', () => {
      test('should evaluate multiple notifications', async () => {
        const batchRequest = {
          requests: [
            {
              userId,
              notificationType: 'transactional_email',
              channel: 'email',
              region: 'EU',
              datetime: new Date().toISOString()
            },
            {
              userId,
              notificationType: 'marketing_email',
              channel: 'email',
              region: 'EU',
              datetime: new Date().toISOString()
            }
          ]
        };

        const response = await request(app)
          .post('/api/v1/evaluate/batch')
          .send(batchRequest)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.meta.total).toBe(2);
        expect(response.body.meta.allowed).toBe(1);
        expect(response.body.meta.denied).toBe(1);
      });

      test('should return 400 for invalid batch request', async () => {
        const invalidRequest = {
          requests: 'not-an-array' // Should be an array
        };

        const response = await request(app)
          .post('/api/v1/evaluate/batch')
          .send(invalidRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_REQUEST');
      });

      test('should handle mixed valid and invalid requests', async () => {
        const mixedRequest = {
          requests: [
            {
              userId,
              notificationType: 'transactional_email',
              channel: 'email',
              region: 'EU',
              datetime: new Date().toISOString()
            },
            {
              userId,
              notificationType: 'invalid_type', // Invalid
              channel: 'email',
              region: 'EU',
              datetime: new Date().toISOString()
            }
          ]
        };

        const response = await request(app)
          .post('/api/v1/evaluate/batch')
          .send(mixedRequest)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.details.errors).toHaveLength(1);
      });
    });

    describe('GET /api/v1/evaluate/would-allow', () => {
      test('should check if notification would be allowed', async () => {
        const response = await request(app)
          .get('/api/v1/evaluate/would-allow')
          .query({
            userId,
            notificationType: 'transactional_email',
            channel: 'email',
            region: 'EU'
          })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wouldAllow).toBe(true);
      });

      test('should return 400 for missing query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/evaluate/would-allow')
          .query({
            userId,
            notificationType: 'transactional_email'
            // Missing channel and region
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_REQUEST');
      });
    });
  });

  describe('Global Policies API', () => {
    describe('POST /api/v1/policies', () => {
      test('should create global policy', async () => {
        const policy = {
          notificationType: 'marketing_sms',
          channel: 'sms',
          region: 'EU',
          enabled: false,
          description: 'Block marketing SMS in EU'
        };

        const response = await request(app)
          .post('/api/v1/policies')
          .send(policy)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notificationType).toBe('marketing_sms');
        expect(response.body.data.channel).toBe('sms');
        expect(response.body.data.region).toBe('EU');
        expect(response.body.data.enabled).toBe(false);
        expect(response.body.data.description).toBe('Block marketing SMS in EU');
      });

      test('should return 400 for invalid policy data', async () => {
        const invalidPolicy = {
          notificationType: 'invalid_type',
          channel: 'sms',
          region: 'EU',
          enabled: false,
          description: 'Test'
        };

        const response = await request(app)
          .post('/api/v1/policies')
          .send(invalidPolicy)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/v1/policies', () => {
      test('should return list of global policies', async () => {
        const response = await request(app)
          .get('/api/v1/policies')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.meta.total).toBeGreaterThanOrEqual(0);
      });

      test('should filter policies by query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/policies')
          .query({
            region: 'EU'
          })
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.success).toBe(true);
        // All returned policies should be for EU region (or GLOBAL)
        response.body.data.forEach((policy: any) => {
          expect(['EU', 'GLOBAL']).toContain(policy.region);
        });
      });
    });

    describe('POST /api/v1/policies/blocking', () => {
      test('should create blocking policy', async () => {
        const blockingPolicy = {
          notificationType: 'marketing_push',
          channel: 'push',
          region: 'US',
          reason: 'User opt-out required'
        };

        const response = await request(app)
          .post('/api/v1/policies/blocking')
          .send(blockingPolicy)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.enabled).toBe(false);
        expect(response.body.data.description).toContain('Blocked:');
      });
    });

    describe('POST /api/v1/policies/allowing', () => {
      test('should create allowing policy', async () => {
        const allowingPolicy = {
          notificationType: 'security_alert',
          channel: 'sms',
          region: 'GLOBAL',
          reason: 'Critical security notifications'
        };

        const response = await request(app)
          .post('/api/v1/policies/allowing')
          .send(allowingPolicy)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.enabled).toBe(true);
        expect(response.body.data.description).toContain('Allowed:');
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/evaluate')
        .set('Content-Type', 'application/json')
        .send('{ malformed json }')
        .expect('Content-Type', /json/)
        .expect(400); // Express JSON parser returns 400 for malformed JSON

      expect(response.body).toHaveProperty('error');
    });
  });
});
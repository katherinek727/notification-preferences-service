/**
 * Express application setup
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseConnection } from '../database/connection.js';
import { 
  UserPreferencesRepository,
  GlobalPoliciesRepository,
  DefaultPreferencesRepository
} from '../database/repositories/index.js';
import { 
  GetUserPreferencesUseCase,
  UpdateUserPreferencesUseCase,
  EvaluateNotificationUseCase,
  ManageGlobalPoliciesUseCase
} from '../../../application/use-cases/index.js';
import { NotificationPreferencesService } from '../../../application/services/NotificationPreferences.service.js';
import { UserPreferencesController } from './controllers/UserPreferences.controller.js';
import { GlobalPoliciesController } from './controllers/GlobalPolicies.controller.js';
import { APPLICATION_CONSTANTS } from '../../../application/index.js';

/**
 * Express application factory
 */
export class ExpressApp {
  private app: Application;
  private db: DatabaseConnection;
  
  // Repositories
  private userPreferencesRepository: UserPreferencesRepository;
  private globalPoliciesRepository: GlobalPoliciesRepository;
  private defaultPreferencesRepository: DefaultPreferencesRepository;
  
  // Use cases
  private getUserPreferencesUseCase: GetUserPreferencesUseCase;
  private updateUserPreferencesUseCase: UpdateUserPreferencesUseCase;
  private evaluateNotificationUseCase: EvaluateNotificationUseCase;
  private manageGlobalPoliciesUseCase: ManageGlobalPoliciesUseCase;
  
  // Services
  private notificationPreferencesService: NotificationPreferencesService;
  
  // Controllers
  private userPreferencesController: UserPreferencesController;
  private globalPoliciesController: GlobalPoliciesController;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupDatabase();
    this.setupRepositories();
    this.setupUseCases();
    this.setupServices();
    this.setupControllers();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }
    
    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      next();
    });
  }

  /**
   * Setup database connection
   */
  private setupDatabase(): void {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Setup repositories
   */
  private setupRepositories(): void {
    this.userPreferencesRepository = new UserPreferencesRepository(this.db);
    this.globalPoliciesRepository = new GlobalPoliciesRepository(this.db);
    this.defaultPreferencesRepository = new DefaultPreferencesRepository(this.db);
  }

  /**
   * Setup use cases
   */
  private setupUseCases(): void {
    this.getUserPreferencesUseCase = new GetUserPreferencesUseCase({
      getUserPreferences: (userId: string) => 
        this.userPreferencesRepository.getUserPreferences(userId)
    });

    this.updateUserPreferencesUseCase = new UpdateUserPreferencesUseCase({
      getUserPreferences: (userId: string) => 
        this.userPreferencesRepository.getUserPreferences(userId),
      saveUserPreferences: (preferences) => 
        this.userPreferencesRepository.saveUserPreferences(preferences),
      getDefaultPreferences: async () => {
        const defaults = await this.defaultPreferencesRepository.getDefaultPreferences();
        return defaults.map(d => ({
          notificationType: d.notificationType,
          channel: d.channel,
          enabled: d.enabled
        }));
      }
    });

    this.evaluateNotificationUseCase = new EvaluateNotificationUseCase({
      getUserPreferences: (userId: string) => 
        this.userPreferencesRepository.getUserPreferences(userId),
      getGlobalPolicies: () => 
        this.globalPoliciesRepository.getGlobalPolicies(),
      getGlobalPoliciesByRegion: (region) => 
        this.globalPoliciesRepository.getPoliciesByRegion(region)
    });

    this.manageGlobalPoliciesUseCase = new ManageGlobalPoliciesUseCase({
      getGlobalPolicy: (id: string) => 
        this.globalPoliciesRepository.getGlobalPolicy(id),
      getGlobalPolicies: () => 
        this.globalPoliciesRepository.getGlobalPolicies(),
      getGlobalPoliciesByFilter: (filter) => 
        this.globalPoliciesRepository.getGlobalPoliciesByFilter(filter),
      saveGlobalPolicy: (policy) => 
        this.globalPoliciesRepository.saveGlobalPolicy(policy),
      deleteGlobalPolicy: (id: string) => 
        this.globalPoliciesRepository.deleteGlobalPolicy(id)
    });
  }

  /**
   * Setup services
   */
  private setupServices(): void {
    this.notificationPreferencesService = new NotificationPreferencesService({
      getUserPreferencesUseCase: this.getUserPreferencesUseCase,
      updateUserPreferencesUseCase: this.updateUserPreferencesUseCase,
      evaluateNotificationUseCase: this.evaluateNotificationUseCase,
      manageGlobalPoliciesUseCase: this.manageGlobalPoliciesUseCase
    });
  }

  /**
   * Setup controllers
   */
  private setupControllers(): void {
    this.userPreferencesController = new UserPreferencesController(
      this.notificationPreferencesService
    );
    
    this.globalPoliciesController = new GlobalPoliciesController(
      this.notificationPreferencesService
    );
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    const apiPrefix = APPLICATION_CONSTANTS.API_PREFIX;
    
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'notification-preferences-service'
      });
    });
    
    // User preferences routes
    this.app.get(`${apiPrefix}/users/:userId/preferences`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.getUserPreferences(req, res).catch(next)
    );
    
    this.app.post(`${apiPrefix}/users/:userId/preferences`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.updateUserPreferences(req, res).catch(next)
    );
    
    this.app.patch(`${apiPrefix}/users/:userId/preferences/single`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.updateSinglePreference(req, res).catch(next)
    );
    
    this.app.patch(`${apiPrefix}/users/:userId/preferences/quiet-hours`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.updateQuietHours(req, res).catch(next)
    );
    
    // Notification evaluation routes
    this.app.post(`${apiPrefix}/evaluate`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.evaluateNotification(req, res).catch(next)
    );
    
    this.app.post(`${apiPrefix}/evaluate/batch`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.evaluateNotificationsBatch(req, res).catch(next)
    );
    
    this.app.get(`${apiPrefix}/evaluate/would-allow`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.wouldAllowNotification(req, res).catch(next)
    );
    
    // Global policies routes
    this.app.get(`${apiPrefix}/policies`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.getGlobalPolicies(req, res).catch(next)
    );
    
    this.app.get(`${apiPrefix}/policies/:id`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.getGlobalPolicy(req, res).catch(next)
    );
    
    this.app.post(`${apiPrefix}/policies`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.createGlobalPolicy(req, res).catch(next)
    );
    
    this.app.put(`${apiPrefix}/policies/:id`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.updateGlobalPolicy(req, res).catch(next)
    );
    
    this.app.delete(`${apiPrefix}/policies/:id`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.deleteGlobalPolicy(req, res).catch(next)
    );
    
    this.app.post(`${apiPrefix}/policies/blocking`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.createBlockingPolicy(req, res).catch(next)
    );
    
    this.app.post(`${apiPrefix}/policies/allowing`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.createAllowingPolicy(req, res).catch(next)
    );
    
    this.app.get(`${apiPrefix}/policies/would-block`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.globalPoliciesController.wouldBeBlockedByGlobalPolicy(req, res).catch(next)
    );
    
    // Stats routes
    this.app.get(`${apiPrefix}/users/:userId/stats`, 
      (req: Request, res: Response, next: NextFunction) => 
        this.userPreferencesController.getUserEvaluationStats(req, res).catch(next)
    );
    
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Error handling middleware
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    });
  }

  /**
   * Get Express application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Start the server
   */
  public async start(port: number = 3000): Promise<void> {
    try {
      // Check database connection
      const isConnected = await this.db.isConnected();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }
      
      // Initialize default preferences if needed
      await this.initializeDefaults();
      
      this.app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`API available at http://localhost:${port}${APPLICATION_CONSTANTS.API_PREFIX}`);
        console.log(`Health check: http://localhost:${port}/health`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize default data
   */
  private async initializeDefaults(): Promise<void> {
    try {
      const defaultCount = await this.defaultPreferencesRepository.getDefaultPreferences();
      if (defaultCount.length === 0) {
        console.log('Initializing default preferences...');
        await this.defaultPreferencesRepository.initializeWithCommonDefaults();
        console.log('Default preferences initialized');
      }
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      await this.db.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
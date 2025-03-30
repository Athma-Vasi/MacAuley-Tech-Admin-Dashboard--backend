import { Router } from 'express';
import { versionOneRouter } from '../versionOne';

const apiRouter = Router();

// route: /api/v1
apiRouter.use('/v1', versionOneRouter);

export { apiRouter };

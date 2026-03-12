import express from 'express'
import {
  createWorkflow,
  getWorkflows,
  deleteWorkflow,
  addStep,
  getWorkflowRuns,
  getAllRuns,
} from '../controllers/workflowController.js'

const router = express.Router()

router.post('/workflows',              createWorkflow)
router.get('/workflows',               getWorkflows)
router.delete('/workflows/:id',        deleteWorkflow)
router.post('/workflows/:id/steps',    addStep)
router.get('/workflows/:id/runs',      getWorkflowRuns)
router.get('/runs',                    getAllRuns)

export default router
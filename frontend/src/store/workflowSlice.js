import { createSlice } from "@reduxjs/toolkit"

const workflowSlice = createSlice({
  name: "workflows",
  initialState: {
    items: []
  },
  reducers: {

    addWorkflow: (state, action) => {
      state.items.push(action.payload)
    },

    addStep: (state, action) => {

      const { workflowId, step } = action.payload

      const workflow = state.items.find(
        (w) => w.id === workflowId
      )

      if (workflow) {
        workflow.steps.push(step)
      }

    }

  }
})

export const { addWorkflow, addStep } = workflowSlice.actions
export default workflowSlice.reducer
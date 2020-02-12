/**
 * Subscription Events
 */
const DRAFT_STATUS_CHANGED = 'draft_status_changed'
const NEW_USER_DRAFT_PICK = 'new_user_draft_pick'

export const Subscription = ({ pubsub }) => ({
  draftStatusChanged: {
    resolve: (payload: { draftStatusChanged: any }) => {
      console.log('Apollo Subscription: Draft Status Changed')
      return payload.draftStatusChanged
    },
    subscribe: () => pubsub.asyncIterator(DRAFT_STATUS_CHANGED),
  },
  newUserDraftPick: {
    resolve: (payload: { selectedPick: any }) => {
      console.log('Apollo Subscription: Draft Status Changed')
      return payload.selectedPick
    },
    subscribe: () => pubsub.asyncIterator(NEW_USER_DRAFT_PICK),
  },
})

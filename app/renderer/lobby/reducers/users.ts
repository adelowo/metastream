import { Reducer } from 'redux'
import { isType } from 'utils/redux'
import { addUser, removeUser, clearUsers } from '../middleware/users'
import { setUserRole } from '../actions/users'
import { clearPendingUser } from '../actions/user-init'
import { resetLobby } from '../actions/common'

/** User role in ascending power. */
export const enum UserRole {
  Default = 0,
  DJ = 1 << 0,
  Admin = 1 << 1
}

export interface IUser {
  id: string
  name: string
  avatar?: string
  color: string
  role: UserRole
  pending?: boolean
}

export interface IUsersState {
  host: string
  map: {
    [key: string]: IUser | undefined
  }
}

const initialState: IUsersState = {
  host: '',
  map: {}
}

const isValidUser = (state: IUsersState, id: string) => state.map.hasOwnProperty(id)

export const users: Reducer<IUsersState> = (state: IUsersState = initialState, action: any) => {
  if (isType(action, addUser)) {
    const conn = action.payload.conn
    const id = conn.id.toString()
    const userState = state.map[id]
    const name = action.payload.name || (userState && userState.name) || id
    const hostId = action.payload.host ? id : state.host
    const admin = id === hostId

    return {
      host: hostId,
      map: {
        ...state.map,
        [id]: {
          id,
          name,
          color: action.payload.color,
          role: admin ? UserRole.Admin : UserRole.Default,
          pending: action.payload.pending
        }
      }
    }
  } else if (isType(action, removeUser)) {
    const id = action.payload
    const { [id]: _, ...rest } = state.map
    return {
      ...state,
      map: rest
    }
  } else if (isType(action, resetLobby)) {
    return initialState
  } else if (isType(action, clearPendingUser)) {
    const id = action.payload
    return {
      ...state,
      map: {
        ...state.map,
        [id]: {
          ...state.map[id]!,
          pending: false
        }
      }
    }
  }

  if (isType(action, setUserRole)) {
    const { userId: id, enabled, role } = action.payload
    if (isValidUser(state, id)) {
      const user = state.map[id]!
      return mergeUserState(state, {
        id,
        role: enabled ? user.role | role : user.role & ~role
      })
    }
  }

  return state
}

const mergeUserState = (state: IUsersState, user: Partial<IUser> & { id: string }) => {
  const id = user.id
  const prevUser = state.map[id]!
  return {
    ...state,
    map: {
      ...state.map,
      [id]: {
        ...prevUser,
        ...user
      }
    }
  }
}

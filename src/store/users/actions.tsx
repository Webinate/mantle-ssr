import { ActionCreator } from '../actions-creator';
import { IUserEntry } from 'modepress';
import { users } from 'modepress/src/lib-frontend';
import { IRootState } from '../';

// Action Creators
export const ActionCreators = {
  SetUsersBusy: new ActionCreator<'SetUsersBusy', boolean>( 'SetUsersBusy' ),
  SetUsers: new ActionCreator<'SetUsers', IUserEntry[] | null>( 'SetUsers' )
};

// Action Types
export type Action = typeof ActionCreators[ keyof typeof ActionCreators ];

/**
 * Refreshes the user state
 */
export function getUsers() {
  return async function( dispatch: Function, getState: () => IRootState ) {
    dispatch( ActionCreators.SetUsersBusy.create( true ) );
    const resp = await users.getAll( {} );
    dispatch( ActionCreators.SetUsers.create( resp.data ) );
  }
}
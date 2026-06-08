import { Direction, Action } from '../types';

export interface IInputHandler {
  handleKey(data: string): Direction | Action | null;
}